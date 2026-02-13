/**
 * Constitutional AI Safety Layer - Main Entry Point
 * Provides a unified interface for safety checks and interventions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SafetyChecker } from './SafetyChecker';
import { InterventionHandler, InterventionResult } from './InterventionHandler';
import { AuditLogger, SafetyReport } from '../audit/AuditLogger';
import {
  ConstitutionalPrinciples,
  SafetyLevel,
  ActionContext,
  SafetyCheckResult,
  SafetyAuditLog
} from './types';

export interface ConstitutionalAIConfig {
  principlesPath?: string;
  safetyLevelsPath?: string;
  auditLogPath?: string;
  defaultSafetyLevel?: string;
  retentionDays?: number;
}

export class ConstitutionalAI {
  private safetyChecker: SafetyChecker | null = null;
  private interventionHandler: InterventionHandler | null = null;
  private auditLogger: AuditLogger | null = null;
  private config: ConstitutionalAIConfig;
  private principles: ConstitutionalPrinciples | null = null;
  private safetyLevels: Map<string, SafetyLevel> = new Map();
  private currentSafetyLevel: SafetyLevel | null = null;

  constructor(config: ConstitutionalAIConfig = {}) {
    this.config = {
      principlesPath: config.principlesPath || path.join(__dirname, '../../config/constitutional-principles.json'),
      safetyLevelsPath: config.safetyLevelsPath || path.join(__dirname, '../../config/safety-levels.json'),
      auditLogPath: config.auditLogPath || path.join(__dirname, '../../logs/safety-audit'),
      defaultSafetyLevel: config.defaultSafetyLevel || 'balanced',
      retentionDays: config.retentionDays || 90
    };
  }

  /**
   * Initialize the Constitutional AI system
   */
  async initialize(): Promise<void> {
    try {
      // Load constitutional principles
      this.principles = await this.loadPrinciples();

      // Load safety levels
      await this.loadSafetyLevels();

      // Initialize audit logger
      this.auditLogger = new AuditLogger({
        logPath: this.config.auditLogPath!,
        retentionDays: this.config.retentionDays!,
        includeContent: true,
        level: 'standard'
      });

      // Set initial safety level
      const defaultLevel = this.safetyLevels.get(this.config.defaultSafetyLevel!);
      if (!defaultLevel) {
        throw new Error(`Default safety level "${this.config.defaultSafetyLevel}" not found`);
      }
      this.currentSafetyLevel = defaultLevel;

      // Initialize safety checker
      this.safetyChecker = new SafetyChecker(
        this.principles,
        this.currentSafetyLevel,
        this.auditLogger
      );

      // Initialize intervention handler
      this.interventionHandler = new InterventionHandler(this.auditLogger);

      console.log('✓ Constitutional AI Safety Layer initialized');
      console.log(`  Safety Level: ${this.currentSafetyLevel.name}`);
      console.log(`  Principles Version: ${this.principles.metadata.version}`);
    } catch (error) {
      console.error('Failed to initialize Constitutional AI:', error);
      throw error;
    }
  }

  /**
   * Check if an action is safe to execute
   */
  async checkAction(context: ActionContext): Promise<SafetyCheckResult> {
    this.ensureInitialized();
    return await this.safetyChecker!.checkAction(context);
  }

  /**
   * Check action and execute intervention if needed
   */
  async checkAndIntervene(context: ActionContext): Promise<InterventionResult> {
    this.ensureInitialized();

    const result = await this.safetyChecker!.checkAction(context);
    return await this.interventionHandler!.executeIntervention(context, result);
  }

  /**
   * Execute action with safety checks
   */
  async executeWithSafety<T>(
    context: ActionContext,
    action: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; intervention?: InterventionResult }> {
    const intervention = await this.checkAndIntervene(context);

    if (!intervention.proceed) {
      return {
        success: false,
        intervention
      };
    }

    try {
      const result = await action();
      return {
        success: true,
        result,
        intervention: intervention.warning ? intervention : undefined
      };
    } catch (error) {
      // Log execution error
      await this.auditLogger!.logIntervention(
        context,
        'execution_error',
        error.message,
        'blocked'
      );
      throw error;
    }
  }

  /**
   * Approve a pending action
   */
  async approveAction(
    requestId: string,
    approver: string
  ): Promise<{ success: boolean; message: string }> {
    this.ensureInitialized();
    return await this.interventionHandler!.approveRequest(requestId, approver);
  }

  /**
   * Deny a pending action
   */
  async denyAction(
    requestId: string,
    denier: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    this.ensureInitialized();
    return await this.interventionHandler!.denyRequest(requestId, denier, reason);
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals() {
    this.ensureInitialized();
    return this.interventionHandler!.getPendingApprovals();
  }

  /**
   * Change safety level
   */
  setSafetyLevel(levelName: string): void {
    this.ensureInitialized();

    const level = this.safetyLevels.get(levelName);
    if (!level) {
      throw new Error(`Safety level "${levelName}" not found`);
    }

    this.currentSafetyLevel = level;
    this.safetyChecker!.setSafetyLevel(level);

    // Update audit logger configuration
    this.auditLogger = new AuditLogger({
      logPath: this.config.auditLogPath!,
      retentionDays: this.config.retentionDays!,
      includeContent: level.logging.includeContent,
      level: level.logging.level
    });

    console.log(`Safety level changed to: ${levelName}`);
  }

  /**
   * Get current safety level
   */
  getSafetyLevel(): SafetyLevel | null {
    return this.currentSafetyLevel;
  }

  /**
   * Get available safety levels
   */
  getAvailableSafetyLevels(): string[] {
    return Array.from(this.safetyLevels.keys());
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    riskLevel?: string;
    decision?: string;
    limit?: number;
  }): Promise<SafetyAuditLog[]> {
    this.ensureInitialized();
    return await this.auditLogger!.queryLogs(filters);
  }

  /**
   * Generate safety report
   */
  async generateReport(period: 'daily' | 'weekly' | 'monthly'): Promise<SafetyReport> {
    this.ensureInitialized();
    return await this.auditLogger!.generateReport(period);
  }

  /**
   * Update constitutional principles
   */
  async updatePrinciples(principles: ConstitutionalPrinciples): Promise<void> {
    this.ensureInitialized();
    this.principles = principles;
    this.safetyChecker!.updatePrinciples(principles);

    // Optionally save to file
    await fs.writeFile(
      this.config.principlesPath!,
      JSON.stringify(principles, null, 2),
      'utf-8'
    );
  }

  /**
   * Reload principles from file
   */
  async reloadPrinciples(): Promise<void> {
    this.principles = await this.loadPrinciples();
    if (this.safetyChecker) {
      this.safetyChecker.updatePrinciples(this.principles);
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanup(): Promise<void> {
    this.ensureInitialized();
    await this.auditLogger!.cleanup();
  }

  /**
   * Shutdown and flush logs
   */
  async shutdown(): Promise<void> {
    if (this.auditLogger) {
      await this.auditLogger.shutdown();
    }
  }

  // Private helper methods

  private async loadPrinciples(): Promise<ConstitutionalPrinciples> {
    const content = await fs.readFile(this.config.principlesPath!, 'utf-8');
    return JSON.parse(content);
  }

  private async loadSafetyLevels(): Promise<void> {
    const content = await fs.readFile(this.config.safetyLevelsPath!, 'utf-8');
    const config = JSON.parse(content);

    for (const level of config.levels) {
      this.safetyLevels.set(level.name, level);
    }
  }

  private ensureInitialized(): void {
    if (!this.safetyChecker || !this.interventionHandler || !this.auditLogger) {
      throw new Error('Constitutional AI not initialized. Call initialize() first.');
    }
  }
}

// Export types
export * from './types';
export { InterventionResult } from './InterventionHandler';
export { SafetyReport } from '../audit/AuditLogger';
