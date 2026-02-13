/**
 * Audit Logger for Safety Decisions
 * Logs all safety checks and interventions for compliance and analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ActionContext, SafetyCheckResult, SafetyAuditLog } from '../constitutional-ai/types';

export interface AuditLoggerConfig {
  logPath: string;
  retentionDays: number;
  includeContent: boolean;
  level: 'minimal' | 'standard' | 'detailed';
}

export class AuditLogger {
  private config: AuditLoggerConfig;
  private logBuffer: SafetyAuditLog[] = [];
  private bufferSize: number = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: AuditLoggerConfig) {
    this.config = config;
    this.ensureLogDirectory();
    this.startAutoFlush();
  }

  /**
   * Log a safety decision
   */
  async logSafetyDecision(
    context: ActionContext,
    result: SafetyCheckResult,
    options?: {
      approver?: string;
      overridden?: boolean;
      overrideReason?: string;
    }
  ): Promise<void> {
    const decision = this.determineDecision(result);
    
    const auditLog: SafetyAuditLog = {
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
      result: this.sanitizeResult(result),
      decision,
      approver: options?.approver,
      overridden: options?.overridden,
      overrideReason: options?.overrideReason
    };

    this.logBuffer.push(auditLog);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      await this.flush();
    }

    // For critical decisions, flush immediately
    if (result.riskLevel === 'critical' || !result.allowed) {
      await this.flush();
    }
  }

  /**
   * Log intervention action
   */
  async logIntervention(
    context: ActionContext,
    interventionType: string,
    reason: string,
    outcome: 'blocked' | 'modified' | 'warned'
  ): Promise<void> {
    const interventionLog = {
      timestamp: new Date().toISOString(),
      type: 'intervention',
      interventionType,
      reason,
      outcome,
      context: this.sanitizeContext(context)
    };

    await this.writeLog('interventions', interventionLog);
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    riskLevel?: string;
    decision?: string;
    limit?: number;
  }): Promise<SafetyAuditLog[]> {
    const logs = await this.readRecentLogs(filters.limit || 1000);
    
    return logs.filter(log => {
      if (filters.userId && log.context.userId !== filters.userId) return false;
      if (filters.riskLevel && log.result.riskLevel !== filters.riskLevel) return false;
      if (filters.decision && log.decision !== filters.decision) return false;
      
      const logDate = new Date(log.timestamp);
      if (filters.startDate && logDate < filters.startDate) return false;
      if (filters.endDate && logDate > filters.endDate) return false;
      
      return true;
    });
  }

  /**
   * Generate safety report
   */
  async generateReport(period: 'daily' | 'weekly' | 'monthly'): Promise<SafetyReport> {
    const now = new Date();
    const startDate = this.getStartDate(now, period);
    
    const logs = await this.queryLogs({ startDate, endDate: now });
    
    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalChecks: logs.length,
      blocked: logs.filter(l => l.decision === 'blocked').length,
      warned: logs.filter(l => l.decision === 'warned').length,
      allowed: logs.filter(l => l.decision === 'allowed').length,
      approvalRequired: logs.filter(l => l.decision === 'approval_required').length,
      riskDistribution: this.calculateRiskDistribution(logs),
      topViolations: this.getTopViolations(logs, 10),
      topUsers: this.getTopUsers(logs, 10),
      principlesViolated: this.getPrinciplesViolated(logs)
    };
  }

  /**
   * Flush buffered logs to disk
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const logFile = this.getLogFilePath('safety-decisions');
      const logLines = logsToWrite.map(log => JSON.stringify(log)).join('\n') + '\n';
      
      await fs.appendFile(logFile, logLines, 'utf-8');
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Put logs back in buffer
      this.logBuffer.unshift(...logsToWrite);
    }
  }

  /**
   * Cleanup old logs based on retention policy
   */
  async cleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const logDir = this.config.logPath;
    const files = await fs.readdir(logDir);

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;

      const filePath = path.join(logDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        console.log(`Deleted old audit log: ${file}`);
      }
    }
  }

  /**
   * Shutdown - flush remaining logs
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }

  // Private helper methods

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.logPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private startAutoFlush(): void {
    // Flush every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => console.error('Auto-flush failed:', err));
    }, 10000);
  }

  private determineDecision(result: SafetyCheckResult): 'allowed' | 'blocked' | 'warned' | 'modified' | 'approval_required' {
    if (!result.allowed) return 'blocked';
    if (result.requiresApproval) return 'approval_required';
    if (result.intervention?.type === 'warn') return 'warned';
    if (result.intervention?.type === 'modify') return 'modified';
    return 'allowed';
  }

  private sanitizeContext(context: ActionContext): ActionContext {
    if (this.config.level === 'minimal') {
      return {
        ...context,
        input: undefined,
        resource: context.resource ? '[REDACTED]' : undefined
      };
    }

    if (!this.config.includeContent) {
      return {
        ...context,
        input: context.input ? '[REDACTED]' : undefined
      };
    }

    return context;
  }

  private sanitizeResult(result: SafetyCheckResult): SafetyCheckResult {
    if (this.config.level === 'minimal') {
      return {
        ...result,
        violations: result.violations.map(() => '[REDACTED]')
      };
    }

    return result;
  }

  private getLogFilePath(type: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.config.logPath, `${type}-${date}.jsonl`);
  }

  private async writeLog(type: string, log: any): Promise<void> {
    const logFile = this.getLogFilePath(type);
    const logLine = JSON.stringify(log) + '\n';
    await fs.appendFile(logFile, logLine, 'utf-8');
  }

  private async readRecentLogs(limit: number): Promise<SafetyAuditLog[]> {
    const logs: SafetyAuditLog[] = [];
    const files = await fs.readdir(this.config.logPath);
    
    // Sort files by date (newest first)
    const logFiles = files
      .filter(f => f.startsWith('safety-decisions-') && f.endsWith('.jsonl'))
      .sort()
      .reverse();

    for (const file of logFiles) {
      if (logs.length >= limit) break;

      const filePath = path.join(this.config.logPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines.reverse()) {
        if (logs.length >= limit) break;
        try {
          logs.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
        }
      }
    }

    return logs;
  }

  private getStartDate(now: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const start = new Date(now);
    switch (period) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }
    return start;
  }

  private calculateRiskDistribution(logs: SafetyAuditLog[]): Record<string, number> {
    const dist: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    logs.forEach(log => {
      dist[log.result.riskLevel]++;
    });
    return dist;
  }

  private getTopViolations(logs: SafetyAuditLog[], limit: number): Array<{ violation: string; count: number }> {
    const counts = new Map<string, number>();
    
    logs.forEach(log => {
      log.result.violations.forEach(violation => {
        counts.set(violation, (counts.get(violation) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([violation, count]) => ({ violation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getTopUsers(logs: SafetyAuditLog[], limit: number): Array<{ userId: string; violations: number }> {
    const counts = new Map<string, number>();
    
    logs.forEach(log => {
      if (log.result.violations.length > 0) {
        counts.set(log.context.userId, (counts.get(log.context.userId) || 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .map(([userId, violations]) => ({ userId, violations }))
      .sort((a, b) => b.violations - a.violations)
      .slice(0, limit);
  }

  private getPrinciplesViolated(logs: SafetyAuditLog[]): Array<{ principle: string; count: number }> {
    const counts = new Map<string, number>();
    
    logs.forEach(log => {
      log.result.principles.forEach(principle => {
        counts.set(principle, (counts.get(principle) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([principle, count]) => ({ principle, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export interface SafetyReport {
  period: string;
  startDate: string;
  endDate: string;
  totalChecks: number;
  blocked: number;
  warned: number;
  allowed: number;
  approvalRequired: number;
  riskDistribution: Record<string, number>;
  topViolations: Array<{ violation: string; count: number }>;
  topUsers: Array<{ userId: string; violations: number }>;
  principlesViolated: Array<{ principle: string; count: number }>;
}
