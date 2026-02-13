/**
 * Constitutional Principles Matcher
 * Evaluates actions against defined constitutional principles
 */

import { ConstitutionalPrinciples, Principle, ActionContext, PrincipleEvaluation } from './types';

export class PrinciplesMatcher {
  private principles: ConstitutionalPrinciples;

  constructor(principles: ConstitutionalPrinciples) {
    this.principles = principles;
  }

  /**
   * Evaluate action against a specific principle
   */
  async evaluateAgainst(
    context: ActionContext,
    principle: Principle
  ): Promise<PrincipleEvaluation> {
    const fullContext = this.buildContextString(context);

    // Check each rule in the principle
    for (const rule of principle.rules) {
      const evaluation = this.evaluateRule(fullContext, rule, principle);
      if (evaluation.violates) {
        return evaluation;
      }
    }

    // Check against example violations
    const exampleViolation = this.checkExampleViolations(fullContext, principle);
    if (exampleViolation.violates) {
      return exampleViolation;
    }

    return {
      violates: false,
      reason: '',
      severity: 0,
      confidence: 0.9
    };
  }

  /**
   * Evaluate a specific rule
   */
  private evaluateRule(
    context: string,
    rule: string,
    principle: Principle
  ): PrincipleEvaluation {
    const contextLower = context.toLowerCase();
    const ruleLower = rule.toLowerCase();

    // Simple keyword-based evaluation
    // In production, this could use NLP or ML models
    const keywords = this.extractKeywords(ruleLower);
    let matchCount = 0;

    for (const keyword of keywords) {
      if (contextLower.includes(keyword)) {
        matchCount++;
      }
    }

    const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0;
    const violates = matchRatio >= 0.5; // If 50%+ keywords match, consider it a violation

    if (violates) {
      return {
        violates: true,
        reason: `Violates principle "${principle.name}": ${rule}`,
        severity: principle.severity,
        confidence: matchRatio
      };
    }

    return {
      violates: false,
      reason: '',
      severity: 0,
      confidence: 1 - matchRatio
    };
  }

  /**
   * Check if context matches any example violations
   */
  private checkExampleViolations(
    context: string,
    principle: Principle
  ): PrincipleEvaluation {
    const contextLower = context.toLowerCase();

    for (const example of principle.examples.violates) {
      const similarity = this.calculateSimilarity(contextLower, example.toLowerCase());
      
      if (similarity >= 0.6) {
        return {
          violates: true,
          reason: `Similar to known violation: "${example}"`,
          severity: principle.severity,
          confidence: similarity
        };
      }
    }

    return {
      violates: false,
      reason: '',
      severity: 0,
      confidence: 0.5
    };
  }

  /**
   * Build full context string from ActionContext
   */
  private buildContextString(context: ActionContext): string {
    const parts = [context.action];
    
    if (context.input) parts.push(context.input);
    if (context.resource) parts.push(context.resource);
    
    return parts.join(' ');
  }

  /**
   * Extract keywords from rule text
   */
  private extractKeywords(rule: string): string[] {
    // Remove common words and extract significant keywords
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'not', 'must',
      'should', 'would', 'could', 'will', 'can', 'may'
    ]);

    return rule
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
  }

  /**
   * Calculate similarity between two strings
   * Simple implementation using word overlap
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }
}
