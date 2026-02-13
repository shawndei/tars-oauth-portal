/**
 * Type definitions for Constitutional AI Safety Layer
 */

export interface ConstitutionalPrinciples {
  core: Principle[];
  prohibitions: Prohibition[];
  metadata: {
    version: string;
    lastUpdated: string;
  };
}

export interface Principle {
  name: string;
  description: string;
  category: 'harm-prevention' | 'privacy' | 'autonomy' | 'fairness' | 'transparency';
  enabled: boolean;
  severity: number; // 0-1, higher = more severe violation
  rules: string[];
  examples: {
    violates: string[];
    complies: string[];
  };
}

export interface Prohibition {
  name: string;
  principle: string;
  patterns: string[];
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SafetyLevel {
  name: string;
  description: string;
  thresholds: {
    warning: number;      // Warn user at this risk score
    requiresApproval: number;  // Require approval at this risk score
    autoBlock: number;    // Auto-block at this risk score
  };
  enabledChecks: {
    patternMatching: boolean;
    principlesEvaluation: boolean;
    riskAssessment: boolean;
    contextAware: boolean;
  };
  logging: {
    level: 'minimal' | 'standard' | 'detailed';
    includeContent: boolean;
  };
}

export interface ActionContext {
  action: string;
  input?: string;
  resource?: string;
  userId: string;
  sessionId: string;
  authenticated: boolean;
  mfaVerified: boolean;
  elevated: boolean;
  recentViolations?: number;
  metadata?: Record<string, any>;
}

export interface SafetyCheckResult {
  safe: boolean;
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-1
  violations: string[];
  principles: string[];
  intervention: InterventionAction | null;
  requiresApproval: boolean;
  metadata: {
    durationMs: number;
    safetyLevel: string;
    timestamp?: string;
    error?: string;
  };
}

export interface InterventionAction {
  type: 'block' | 'warn' | 'modify' | 'require_approval';
  reason: string;
  alternatives: string[];
  modifiedAction?: string;
}

export interface SafetyAuditLog {
  timestamp: string;
  context: ActionContext;
  result: SafetyCheckResult;
  decision: 'allowed' | 'blocked' | 'warned' | 'modified' | 'approval_required';
  approver?: string;
  overridden?: boolean;
  overrideReason?: string;
}

export interface PrincipleEvaluation {
  violates: boolean;
  reason: string;
  severity: number;
  confidence: number;
}
