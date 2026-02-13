/**
 * Constitutional AI Safety Checker
 * Evaluates actions against constitutional principles before execution
 */

import { ConstitutionalPrinciples, SafetyLevel, SafetyCheckResult, ActionContext } from './types';
import { AuditLogger } from '../audit/AuditLogger';
import { PrinciplesMatcher } from './PrinciplesMatcher';

export class SafetyChecker {
  private principles: ConstitutionalPrinciples;
  private safetyLevel: SafetyLevel;
  private auditLogger: AuditLogger;
  private matcher: PrinciplesMatcher;

  constructor(
    principles: ConstitutionalPrinciples,
    safetyLevel: SafetyLevel,
    auditLogger: AuditLogger
  ) {
    this.principles = principles;
    this.safetyLevel = safetyLevel;
    this.auditLogger = auditLogger;
    this.matcher = new PrinciplesMatcher(principles);
  }

  /**
   * Main safety check - evaluates action before execution
   */
  async checkAction(context: ActionContext): Promise<SafetyCheckResult> {
    const startTime = Date.now();

    try {
      // Step 1: Quick pattern-based checks
      const patternResult = this.checkPatterns(context);
      if (!patternResult.safe) {
        return this.buildResult(context, patternResult, startTime);
      }

      // Step 2: Constitutional principles evaluation
      const principlesResult = await this.evaluatePrinciples(context);
      if (!principlesResult.safe) {
        return this.buildResult(context, principlesResult, startTime);
      }

      // Step 3: Context-aware risk assessment
      const riskResult = this.assessRisk(context);
      if (!riskResult.safe) {
        return this.buildResult(context, riskResult, startTime);
      }

      // Step 4: Safety level thresholds
      const thresholdResult = this.checkSafetyThresholds(context, riskResult.riskScore);
      
      return this.buildResult(context, thresholdResult, startTime);

    } catch (error) {
      // Fail secure: if safety check errors, block by default
      const errorResult: SafetyCheckResult = {
        safe: false,
        allowed: false,
        riskLevel: 'critical',
        riskScore: 1.0,
        violations: [`Safety check error: ${error.message}`],
        principles: [],
        intervention: {
          type: 'block',
          reason: 'Safety system error - blocking as precaution',
          alternatives: []
        },
        requiresApproval: true,
        metadata: {
          durationMs: Date.now() - startTime,
          safetyLevel: this.safetyLevel.name,
          error: error.message
        }
      };

      await this.auditLogger.logSafetyDecision(context, errorResult);
      return errorResult;
    }
  }

  /**
   * Pattern-based checks for known harmful patterns
   */
  private checkPatterns(context: ActionContext): Partial<SafetyCheckResult> {
    const violations: string[] = [];
    const principles: string[] = [];

    // Check against prohibited patterns
    for (const prohibition of this.principles.prohibitions) {
      if (prohibition.enabled) {
        for (const pattern of prohibition.patterns) {
          const regex = new RegExp(pattern, 'i');
          
          if (regex.test(context.action) || 
              (context.input && regex.test(context.input)) ||
              (context.resource && regex.test(context.resource))) {
            violations.push(`Matches prohibited pattern: ${prohibition.name}`);
            principles.push(prohibition.principle);
          }
        }
      }
    }

    if (violations.length > 0) {
      return {
        safe: false,
        allowed: false,
        riskLevel: 'high',
        riskScore: 0.9,
        violations,
        principles,
        intervention: {
          type: 'block',
          reason: `Action violates constitutional principles: ${principles.join(', ')}`,
          alternatives: this.suggestAlternatives(context, violations)
        }
      };
    }

    return { safe: true, allowed: true, violations: [], principles: [] };
  }

  /**
   * Evaluate against constitutional principles using deeper analysis
   */
  private async evaluatePrinciples(context: ActionContext): Promise<Partial<SafetyCheckResult>> {
    const violations: string[] = [];
    const matchedPrinciples: string[] = [];
    let maxRiskScore = 0;

    // Check each principle category
    for (const principle of this.principles.core) {
      if (!principle.enabled) continue;

      const evaluation = await this.matcher.evaluateAgainst(context, principle);
      
      if (evaluation.violates) {
        violations.push(evaluation.reason);
        matchedPrinciples.push(principle.name);
        maxRiskScore = Math.max(maxRiskScore, evaluation.severity);
      }
    }

    // Check harm prevention principles
    const harmCheck = this.checkHarmPrevention(context);
    if (harmCheck.violations.length > 0) {
      violations.push(...harmCheck.violations);
      matchedPrinciples.push('harm-prevention');
      maxRiskScore = Math.max(maxRiskScore, 0.85);
    }

    if (violations.length > 0) {
      return {
        safe: false,
        allowed: false,
        riskLevel: this.scoreToRiskLevel(maxRiskScore),
        riskScore: maxRiskScore,
        violations,
        principles: matchedPrinciples,
        intervention: {
          type: maxRiskScore >= 0.8 ? 'block' : 'warn',
          reason: `Constitutional principles violated: ${violations.join('; ')}`,
          alternatives: this.suggestAlternatives(context, violations)
        }
      };
    }

    return { safe: true, allowed: true, violations: [], principles: [] };
  }

  /**
   * Context-aware risk assessment
   */
  private assessRisk(context: ActionContext): Partial<SafetyCheckResult> {
    let riskScore = 0;
    const factors: string[] = [];

    // Factor 1: Action type risk
    const actionRisk = this.getActionTypeRisk(context.action);
    riskScore += actionRisk.score * 0.4;
    if (actionRisk.reason) factors.push(actionRisk.reason);

    // Factor 2: Resource sensitivity
    if (context.resource) {
      const resourceRisk = this.getResourceRisk(context.resource);
      riskScore += resourceRisk.score * 0.3;
      if (resourceRisk.reason) factors.push(resourceRisk.reason);
    }

    // Factor 3: User context
    const userRisk = this.getUserContextRisk(context);
    riskScore += userRisk.score * 0.2;
    if (userRisk.reason) factors.push(userRisk.reason);

    // Factor 4: Historical behavior
    const historyRisk = this.getHistoricalRisk(context);
    riskScore += historyRisk.score * 0.1;
    if (historyRisk.reason) factors.push(historyRisk.reason);

    return {
      safe: riskScore < 0.7,
      allowed: riskScore < 0.7,
      riskScore,
      riskLevel: this.scoreToRiskLevel(riskScore),
      violations: riskScore >= 0.7 ? factors : [],
      principles: []
    };
  }

  /**
   * Check against safety level thresholds
   */
  private checkSafetyThresholds(
    context: ActionContext,
    riskScore: number
  ): Partial<SafetyCheckResult> {
    const level = this.safetyLevel;

    // Check if action requires approval
    const requiresApproval = 
      riskScore >= level.thresholds.requiresApproval ||
      this.isHighSensitivityAction(context);

    // Check if action should be blocked
    const shouldBlock = riskScore >= level.thresholds.autoBlock;

    // Check if warning is needed
    const shouldWarn = 
      riskScore >= level.thresholds.warning &&
      riskScore < level.thresholds.autoBlock;

    let intervention = null;
    if (shouldBlock) {
      intervention = {
        type: 'block' as const,
        reason: `Risk score ${riskScore.toFixed(2)} exceeds safety level "${level.name}" auto-block threshold (${level.thresholds.autoBlock})`,
        alternatives: this.suggestAlternatives(context, ['High risk score'])
      };
    } else if (shouldWarn) {
      intervention = {
        type: 'warn' as const,
        reason: `Risk score ${riskScore.toFixed(2)} exceeds warning threshold (${level.thresholds.warning})`,
        alternatives: []
      };
    }

    return {
      safe: !shouldBlock,
      allowed: !shouldBlock,
      riskScore,
      riskLevel: this.scoreToRiskLevel(riskScore),
      requiresApproval,
      violations: shouldBlock ? ['Exceeds safety threshold'] : [],
      principles: [],
      intervention
    };
  }

  /**
   * Check harm prevention principles
   */
  private checkHarmPrevention(context: ActionContext): { violations: string[] } {
    const violations: string[] = [];
    const content = `${context.action} ${context.input || ''} ${context.resource || ''}`.toLowerCase();

    // Physical harm indicators
    if (/(kill|murder|harm|injure|hurt|attack|weapon|explosive|poison|suicide)/i.test(content)) {
      violations.push('Potential physical harm');
    }

    // Psychological harm indicators
    if (/(abuse|harass|bully|threaten|blackmail|extort|manipulate)/i.test(content)) {
      violations.push('Potential psychological harm');
    }

    // Privacy violations
    if (/(spy|track|stalk|dox|expose|leak.*personal|private.*data)/i.test(content)) {
      violations.push('Potential privacy violation');
    }

    // Financial harm
    if (/(steal|fraud|scam|embezzle|money.*launder)/i.test(content)) {
      violations.push('Potential financial harm');
    }

    // Illegal activities
    if (/(hack|crack|exploit|bypass.*security|unauthorized.*access)/i.test(content)) {
      violations.push('Potential illegal activity');
    }

    return { violations };
  }

  /**
   * Assess risk based on action type
   */
  private getActionTypeRisk(action: string): { score: number; reason?: string } {
    const actionLower = action.toLowerCase();

    // Critical actions
    if (/(delete|remove|destroy|wipe|format|drop.*database)/i.test(actionLower)) {
      return { score: 0.8, reason: 'Destructive action' };
    }

    // High-risk actions
    if (/(modify|update|change|alter).*(?:system|config|security|permission)/i.test(actionLower)) {
      return { score: 0.6, reason: 'System modification' };
    }

    // Moderate-risk actions
    if (/(execute|run|spawn|eval|compile)/i.test(actionLower)) {
      return { score: 0.4, reason: 'Code execution' };
    }

    // Low-risk actions
    if (/(read|view|list|search|query)/i.test(actionLower)) {
      return { score: 0.1, reason: 'Read-only operation' };
    }

    return { score: 0.2 };
  }

  /**
   * Assess risk based on resource sensitivity
   */
  private getResourceRisk(resource: string): { score: number; reason?: string } {
    const resourceLower = resource.toLowerCase();

    // Critical resources
    if (/(password|secret|key|token|credential|private.*key|certificate)/i.test(resourceLower)) {
      return { score: 0.9, reason: 'Sensitive credential access' };
    }

    // High-sensitivity resources
    if (/(user.*data|personal|private|confidential|financial|medical)/i.test(resourceLower)) {
      return { score: 0.7, reason: 'Sensitive data access' };
    }

    // System resources
    if (/(system|config|security|admin|root)/i.test(resourceLower)) {
      return { score: 0.6, reason: 'System resource access' };
    }

    return { score: 0.2 };
  }

  /**
   * Assess risk based on user context
   */
  private getUserContextRisk(context: ActionContext): { score: number; reason?: string } {
    let riskScore = 0;
    const reasons: string[] = [];

    // Unauthenticated users are higher risk
    if (!context.authenticated) {
      riskScore += 0.3;
      reasons.push('Unauthenticated user');
    }

    // Lack of MFA for sensitive operations
    if (!context.mfaVerified && this.isHighSensitivityAction(context)) {
      riskScore += 0.2;
      reasons.push('MFA not verified for sensitive operation');
    }

    // Elevated mode not enabled
    if (!context.elevated && this.requiresElevation(context)) {
      riskScore += 0.3;
      reasons.push('Elevated mode required');
    }

    return {
      score: Math.min(riskScore, 1.0),
      reason: reasons.length > 0 ? reasons.join('; ') : undefined
    };
  }

  /**
   * Assess risk based on historical behavior
   */
  private getHistoricalRisk(context: ActionContext): { score: number; reason?: string } {
    // Check recent violations
    if (context.recentViolations && context.recentViolations > 0) {
      return {
        score: Math.min(context.recentViolations * 0.15, 0.6),
        reason: `${context.recentViolations} recent violation(s)`
      };
    }

    return { score: 0 };
  }

  /**
   * Suggest safer alternatives for blocked actions
   */
  private suggestAlternatives(context: ActionContext, violations: string[]): string[] {
    const alternatives: string[] = [];

    // If it's a destructive action, suggest backup first
    if (/(delete|remove|destroy)/i.test(context.action)) {
      alternatives.push('Create a backup before proceeding');
      alternatives.push('Use a safer operation like archive or move');
    }

    // If it's a system modification, suggest review
    if (/(modify|change|alter).*system/i.test(context.action)) {
      alternatives.push('Request approval from system administrator');
      alternatives.push('Test in a sandbox environment first');
    }

    // If it's about credentials, suggest secure methods
    if (/(password|secret|key)/i.test(context.resource || '')) {
      alternatives.push('Use a secure credential manager');
      alternatives.push('Encrypt sensitive data before storage');
    }

    // Generic fallback
    if (alternatives.length === 0) {
      alternatives.push('Review action for safety concerns');
      alternatives.push('Request approval before proceeding');
    }

    return alternatives;
  }

  /**
   * Check if action is high sensitivity
   */
  private isHighSensitivityAction(context: ActionContext): boolean {
    const sensitivePatterns = [
      /delete.*user/i,
      /modify.*permission/i,
      /change.*security/i,
      /export.*data/i,
      /access.*credential/i,
      /modify.*audit/i
    ];

    const fullContext = `${context.action} ${context.resource || ''}`;
    return sensitivePatterns.some(pattern => pattern.test(fullContext));
  }

  /**
   * Check if action requires elevation
   */
  private requiresElevation(context: ActionContext): boolean {
    const elevationPatterns = [
      /sudo/i,
      /admin/i,
      /root/i,
      /system.*config/i,
      /security.*setting/i
    ];

    const fullContext = `${context.action} ${context.resource || ''}`;
    return elevationPatterns.some(pattern => pattern.test(fullContext));
  }

  /**
   * Convert risk score to risk level
   */
  private scoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Build final safety check result
   */
  private buildResult(
    context: ActionContext,
    partialResult: Partial<SafetyCheckResult>,
    startTime: number
  ): SafetyCheckResult {
    const result: SafetyCheckResult = {
      safe: partialResult.safe ?? true,
      allowed: partialResult.allowed ?? true,
      riskLevel: partialResult.riskLevel ?? 'low',
      riskScore: partialResult.riskScore ?? 0,
      violations: partialResult.violations ?? [],
      principles: partialResult.principles ?? [],
      intervention: partialResult.intervention ?? null,
      requiresApproval: partialResult.requiresApproval ?? false,
      metadata: {
        durationMs: Date.now() - startTime,
        safetyLevel: this.safetyLevel.name,
        timestamp: new Date().toISOString()
      }
    };

    // Log the decision
    this.auditLogger.logSafetyDecision(context, result).catch(err => {
      console.error('Failed to log safety decision:', err);
    });

    return result;
  }

  /**
   * Update safety level configuration
   */
  setSafetyLevel(level: SafetyLevel): void {
    this.safetyLevel = level;
  }

  /**
   * Update constitutional principles
   */
  updatePrinciples(principles: ConstitutionalPrinciples): void {
    this.principles = principles;
    this.matcher = new PrinciplesMatcher(principles);
  }
}
