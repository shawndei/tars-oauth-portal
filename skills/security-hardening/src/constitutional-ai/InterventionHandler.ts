/**
 * Intervention Handler
 * Executes safety interventions (block, warn, modify, require approval)
 */

import { ActionContext, SafetyCheckResult, InterventionAction } from './types';
import { AuditLogger } from '../audit/AuditLogger';

export interface ApprovalRequest {
  id: string;
  context: ActionContext;
  result: SafetyCheckResult;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  approver?: string;
  approvedAt?: Date;
}

export class InterventionHandler {
  private auditLogger: AuditLogger;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalCallbacks: Map<string, (approved: boolean) => void> = new Map();

  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
    this.startApprovalCleanup();
  }

  /**
   * Execute intervention based on safety check result
   */
  async executeIntervention(
    context: ActionContext,
    result: SafetyCheckResult
  ): Promise<InterventionResult> {
    if (!result.intervention) {
      return {
        proceed: result.allowed,
        modified: false,
        message: null
      };
    }

    const intervention = result.intervention;

    switch (intervention.type) {
      case 'block':
        return await this.handleBlock(context, result, intervention);

      case 'warn':
        return await this.handleWarn(context, result, intervention);

      case 'modify':
        return await this.handleModify(context, result, intervention);

      case 'require_approval':
        return await this.handleRequireApproval(context, result, intervention);

      default:
        return {
          proceed: false,
          modified: false,
          message: 'Unknown intervention type'
        };
    }
  }

  /**
   * Handle block intervention
   */
  private async handleBlock(
    context: ActionContext,
    result: SafetyCheckResult,
    intervention: InterventionAction
  ): Promise<InterventionResult> {
    await this.auditLogger.logIntervention(
      context,
      'block',
      intervention.reason,
      'blocked'
    );

    const message = this.buildBlockMessage(result, intervention);

    return {
      proceed: false,
      modified: false,
      message,
      alternatives: intervention.alternatives
    };
  }

  /**
   * Handle warning intervention
   */
  private async handleWarn(
    context: ActionContext,
    result: SafetyCheckResult,
    intervention: InterventionAction
  ): Promise<InterventionResult> {
    await this.auditLogger.logIntervention(
      context,
      'warn',
      intervention.reason,
      'warned'
    );

    const message = this.buildWarningMessage(result, intervention);

    return {
      proceed: true,
      modified: false,
      message,
      warning: true
    };
  }

  /**
   * Handle modification intervention
   */
  private async handleModify(
    context: ActionContext,
    result: SafetyCheckResult,
    intervention: InterventionAction
  ): Promise<InterventionResult> {
    if (!intervention.modifiedAction) {
      return await this.handleBlock(context, result, intervention);
    }

    await this.auditLogger.logIntervention(
      context,
      'modify',
      intervention.reason,
      'modified'
    );

    const message = `Action modified for safety: ${intervention.reason}`;

    return {
      proceed: true,
      modified: true,
      modifiedAction: intervention.modifiedAction,
      message
    };
  }

  /**
   * Handle require approval intervention
   */
  private async handleRequireApproval(
    context: ActionContext,
    result: SafetyCheckResult,
    intervention: InterventionAction
  ): Promise<InterventionResult> {
    const requestId = this.generateRequestId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const approvalRequest: ApprovalRequest = {
      id: requestId,
      context,
      result,
      requestedAt: new Date(),
      expiresAt,
      status: 'pending'
    };

    this.pendingApprovals.set(requestId, approvalRequest);

    await this.auditLogger.logIntervention(
      context,
      'require_approval',
      intervention.reason,
      'blocked'
    );

    const message = this.buildApprovalMessage(result, intervention, requestId);

    return {
      proceed: false,
      modified: false,
      message,
      requiresApproval: true,
      approvalRequestId: requestId
    };
  }

  /**
   * Approve a pending request
   */
  async approveRequest(
    requestId: string,
    approver: string
  ): Promise<{ success: boolean; message: string }> {
    const request = this.pendingApprovals.get(requestId);

    if (!request) {
      return { success: false, message: 'Approval request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: `Request already ${request.status}` };
    }

    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      return { success: false, message: 'Approval request expired' };
    }

    request.status = 'approved';
    request.approver = approver;
    request.approvedAt = new Date();

    await this.auditLogger.logSafetyDecision(
      request.context,
      request.result,
      { approver, overridden: true, overrideReason: 'Manual approval' }
    );

    // Trigger callback if registered
    const callback = this.approvalCallbacks.get(requestId);
    if (callback) {
      callback(true);
      this.approvalCallbacks.delete(requestId);
    }

    return { success: true, message: 'Request approved' };
  }

  /**
   * Deny a pending request
   */
  async denyRequest(
    requestId: string,
    denier: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const request = this.pendingApprovals.get(requestId);

    if (!request) {
      return { success: false, message: 'Approval request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: `Request already ${request.status}` };
    }

    request.status = 'denied';
    request.approver = denier;
    request.approvedAt = new Date();

    await this.auditLogger.logIntervention(
      request.context,
      'deny_approval',
      reason || 'Manual denial',
      'blocked'
    );

    // Trigger callback if registered
    const callback = this.approvalCallbacks.get(requestId);
    if (callback) {
      callback(false);
      this.approvalCallbacks.delete(requestId);
    }

    return { success: true, message: 'Request denied' };
  }

  /**
   * Wait for approval (with timeout)
   */
  async waitForApproval(
    requestId: string,
    timeoutMs: number = 900000 // 15 minutes
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.approvalCallbacks.delete(requestId);
        const request = this.pendingApprovals.get(requestId);
        if (request && request.status === 'pending') {
          request.status = 'expired';
        }
        resolve(false);
      }, timeoutMs);

      this.approvalCallbacks.set(requestId, (approved) => {
        clearTimeout(timeout);
        resolve(approved);
      });
    });
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values())
      .filter(req => req.status === 'pending')
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  /**
   * Get approval request by ID
   */
  getApprovalRequest(requestId: string): ApprovalRequest | null {
    return this.pendingApprovals.get(requestId) || null;
  }

  // Private helper methods

  private buildBlockMessage(
    result: SafetyCheckResult,
    intervention: InterventionAction
  ): string {
    let message = `🛑 Action Blocked (Risk Level: ${result.riskLevel})\n\n`;
    message += `Reason: ${intervention.reason}\n\n`;

    if (result.violations.length > 0) {
      message += `Violations:\n`;
      result.violations.forEach(v => {
        message += `  • ${v}\n`;
      });
      message += '\n';
    }

    if (result.principles.length > 0) {
      message += `Constitutional Principles:\n`;
      result.principles.forEach(p => {
        message += `  • ${p}\n`;
      });
      message += '\n';
    }

    if (intervention.alternatives.length > 0) {
      message += `Suggested Alternatives:\n`;
      intervention.alternatives.forEach(alt => {
        message += `  • ${alt}\n`;
      });
    }

    return message;
  }

  private buildWarningMessage(
    result: SafetyCheckResult,
    intervention: InterventionAction
  ): string {
    let message = `⚠️ Safety Warning (Risk Level: ${result.riskLevel})\n\n`;
    message += `${intervention.reason}\n\n`;

    if (result.violations.length > 0) {
      message += `Concerns:\n`;
      result.violations.forEach(v => {
        message += `  • ${v}\n`;
      });
      message += '\n';
    }

    message += `Proceeding with caution. Review your action carefully.`;

    return message;
  }

  private buildApprovalMessage(
    result: SafetyCheckResult,
    intervention: InterventionAction,
    requestId: string
  ): string {
    let message = `🔐 Approval Required (Risk Level: ${result.riskLevel})\n\n`;
    message += `Reason: ${intervention.reason}\n\n`;
    message += `Request ID: ${requestId}\n`;
    message += `Awaiting approval from authorized personnel.\n\n`;

    if (result.violations.length > 0) {
      message += `Safety Concerns:\n`;
      result.violations.forEach(v => {
        message += `  • ${v}\n`;
      });
    }

    return message;
  }

  private generateRequestId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startApprovalCleanup(): void {
    // Clean up expired approvals every 5 minutes
    setInterval(() => {
      const now = new Date();
      for (const [id, request] of this.pendingApprovals.entries()) {
        if (request.status === 'pending' && now > request.expiresAt) {
          request.status = 'expired';
          const callback = this.approvalCallbacks.get(id);
          if (callback) {
            callback(false);
            this.approvalCallbacks.delete(id);
          }
        }

        // Remove old requests (>24 hours)
        const age = now.getTime() - request.requestedAt.getTime();
        if (age > 24 * 60 * 60 * 1000) {
          this.pendingApprovals.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }
}

export interface InterventionResult {
  proceed: boolean;
  modified: boolean;
  modifiedAction?: string;
  message: string | null;
  warning?: boolean;
  requiresApproval?: boolean;
  approvalRequestId?: string;
  alternatives?: string[];
}
