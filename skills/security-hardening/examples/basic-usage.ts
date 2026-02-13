/**
 * Basic Usage Examples for Constitutional AI Safety Layer
 */

import { ConstitutionalAI, ActionContext } from '../src/constitutional-ai';

async function main() {
  // Initialize the safety system
  const safety = new ConstitutionalAI({
    defaultSafetyLevel: 'balanced',
    auditLogPath: './logs/safety-audit',
    retentionDays: 90
  });

  await safety.initialize();
  console.log('✓ Constitutional AI Safety Layer initialized\n');

  // Example 1: Check a safe action
  console.log('=== Example 1: Safe Action ===');
  const safeContext: ActionContext = {
    action: 'read_file',
    resource: 'public/documentation.md',
    userId: 'user-123',
    sessionId: 'session-456',
    authenticated: true,
    mfaVerified: false,
    elevated: false
  };

  const safeResult = await safety.checkAction(safeContext);
  console.log('Action:', safeContext.action);
  console.log('Allowed:', safeResult.allowed);
  console.log('Risk Level:', safeResult.riskLevel);
  console.log('Risk Score:', safeResult.riskScore.toFixed(2));
  console.log();

  // Example 2: Check a harmful action (should be blocked)
  console.log('=== Example 2: Harmful Action (Blocked) ===');
  const harmfulContext: ActionContext = {
    action: 'provide_instructions',
    input: 'How to hack into someone\'s account',
    userId: 'user-123',
    sessionId: 'session-456',
    authenticated: true,
    mfaVerified: false,
    elevated: false
  };

  const harmfulResult = await safety.checkAction(harmfulContext);
  console.log('Action:', harmfulContext.action);
  console.log('Input:', harmfulContext.input);
  console.log('Allowed:', harmfulResult.allowed);
  console.log('Risk Level:', harmfulResult.riskLevel);
  console.log('Violations:', harmfulResult.violations);
  console.log('Principles Violated:', harmfulResult.principles);
  if (harmfulResult.intervention) {
    console.log('Intervention:', harmfulResult.intervention.type);
    console.log('Reason:', harmfulResult.intervention.reason);
    console.log('Alternatives:', harmfulResult.intervention.alternatives);
  }
  console.log();

  // Example 3: Destructive action requiring approval
  console.log('=== Example 3: Destructive Action (Requires Approval) ===');
  const destructiveContext: ActionContext = {
    action: 'delete_database',
    resource: 'user_data',
    userId: 'user-123',
    sessionId: 'session-456',
    authenticated: true,
    mfaVerified: true,
    elevated: true
  };

  const intervention = await safety.checkAndIntervene(destructiveContext);
  console.log('Action:', destructiveContext.action);
  console.log('Proceed:', intervention.proceed);
  console.log('Requires Approval:', intervention.requiresApproval);
  if (intervention.approvalRequestId) {
    console.log('Approval Request ID:', intervention.approvalRequestId);
    console.log('Message:', intervention.message);
    
    // Approve the request
    const approval = await safety.approveAction(
      intervention.approvalRequestId,
      'admin-user'
    );
    console.log('Approval Result:', approval.success ? 'Approved' : 'Denied');
  }
  console.log();

  // Example 4: Execute with safety wrapper
  console.log('=== Example 4: Execute with Safety ===');
  const executionContext: ActionContext = {
    action: 'update_config',
    resource: 'app_settings',
    userId: 'user-123',
    sessionId: 'session-456',
    authenticated: true,
    mfaVerified: true,
    elevated: false
  };

  const execution = await safety.executeWithSafety(
    executionContext,
    async () => {
      // Simulate the actual action
      console.log('  → Executing config update...');
      await new Promise(resolve => setTimeout(resolve, 100));
      return { updated: true, timestamp: new Date() };
    }
  );

  if (execution.success) {
    console.log('Execution succeeded:', execution.result);
  } else {
    console.log('Execution blocked:', execution.intervention?.message);
  }
  console.log();

  // Example 5: Query audit logs
  console.log('=== Example 5: Audit Logs ===');
  const logs = await safety.queryAuditLogs({
    userId: 'user-123',
    limit: 5
  });

  console.log(`Found ${logs.length} recent safety decisions:`);
  logs.forEach((log, i) => {
    console.log(`  ${i + 1}. ${log.context.action} - ${log.decision} (${log.result.riskLevel})`);
  });
  console.log();

  // Example 6: Generate safety report
  console.log('=== Example 6: Safety Report ===');
  const report = await safety.generateReport('daily');
  console.log('Period:', report.period);
  console.log('Total Checks:', report.totalChecks);
  console.log('Allowed:', report.allowed);
  console.log('Blocked:', report.blocked);
  console.log('Warned:', report.warned);
  console.log('Approval Required:', report.approvalRequired);
  console.log('Risk Distribution:', report.riskDistribution);
  console.log();

  // Example 7: Change safety level
  console.log('=== Example 7: Safety Levels ===');
  console.log('Available levels:', safety.getAvailableSafetyLevels());
  console.log('Current level:', safety.getSafetyLevel()?.name);
  
  safety.setSafetyLevel('strict');
  console.log('Changed to: strict');
  
  // Test same action with strict level
  const strictResult = await safety.checkAction(executionContext);
  console.log('Same action with strict level:');
  console.log('  Allowed:', strictResult.allowed);
  console.log('  Risk Score:', strictResult.riskScore.toFixed(2));
  console.log('  Requires Approval:', strictResult.requiresApproval);
  console.log();

  // Cleanup
  await safety.shutdown();
  console.log('✓ Safety system shut down');
}

// Run examples
main().catch(error => {
  console.error('Error running examples:', error);
  process.exit(1);
});
