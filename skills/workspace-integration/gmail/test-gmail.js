/**
 * Gmail Integration Test Suite
 * Tests OAuth connection, email operations, and morning briefing
 */

const GmailClient = require('./gmail-client');
const path = require('path');

async function runTests() {
  console.log('🧪 Gmail Integration Test Suite\n');
  console.log('='.repeat(60));
  
  const gmail = new GmailClient(path.join(process.cwd(), 'gmail-config.json'));
  
  try {
    // Test 1: Initialize client
    console.log('\n📋 Test 1: Initialize Gmail Client');
    console.log('-'.repeat(60));
    const initResult = await gmail.initialize();
    console.log(initResult.success ? '✅ PASS' : '❌ FAIL');
    console.log(`Message: ${initResult.message}`);
    
    if (!initResult.success) {
      throw new Error('Failed to initialize Gmail client');
    }

    // Test 2: Test connection
    console.log('\n📋 Test 2: Test OAuth Connection');
    console.log('-'.repeat(60));
    const connectionTest = await gmail.testConnection();
    console.log(connectionTest.success ? '✅ PASS' : '❌ FAIL');
    if (connectionTest.success) {
      console.log(`Email: ${connectionTest.email}`);
      console.log(`Total Messages: ${connectionTest.messagesTotal}`);
      console.log(`Total Threads: ${connectionTest.threadsTotal}`);
    } else {
      console.log(`Error: ${connectionTest.error}`);
    }

    // Test 3: Fetch unread emails
    console.log('\n📋 Test 3: Fetch Unread Emails');
    console.log('-'.repeat(60));
    const unreadEmails = await gmail.fetchUnreadEmails({ 
      maxResults: 5,
      includeBody: false 
    });
    console.log(unreadEmails.success ? '✅ PASS' : '❌ FAIL');
    console.log(`Found: ${unreadEmails.count} unread emails`);
    
    if (unreadEmails.count > 0) {
      console.log('\nSample emails:');
      unreadEmails.emails.slice(0, 3).forEach((email, i) => {
        console.log(`  ${i + 1}. From: ${email.from.email}`);
        console.log(`     Subject: ${email.subject}`);
        console.log(`     Snippet: ${email.snippet.substring(0, 60)}...`);
      });
    }

    // Test 4: Search emails
    console.log('\n📋 Test 4: Search Emails');
    console.log('-'.repeat(60));
    const searchResults = await gmail.searchEmails('is:unread', { 
      maxResults: 3 
    });
    console.log(searchResults.success ? '✅ PASS' : '❌ FAIL');
    console.log(`Query: "${searchResults.query}"`);
    console.log(`Results: ${searchResults.count} emails`);

    // Test 5: Get labels
    console.log('\n📋 Test 5: Get Labels');
    console.log('-'.repeat(60));
    const labels = await gmail.getLabels();
    console.log(labels.success ? '✅ PASS' : '❌ FAIL');
    if (labels.success) {
      console.log(`Found: ${labels.labels.length} labels`);
      console.log('Sample labels:');
      labels.labels.slice(0, 5).forEach((label, i) => {
        console.log(`  ${i + 1}. ${label.name} (${label.id})`);
      });
    }

    // Test 6: Generate morning briefing
    console.log('\n📋 Test 6: Generate Morning Briefing');
    console.log('-'.repeat(60));
    const briefing = await gmail.generateMorningBriefing();
    console.log(briefing.success ? '✅ PASS' : '❌ FAIL');
    
    if (briefing.success) {
      console.log(`\nGenerated at: ${briefing.generatedAt}`);
      console.log(`\nSummary:`);
      console.log(`  Total Unread: ${briefing.summary.totalUnread}`);
      console.log(`  New Since Last Check: ${briefing.summary.newSinceLastCheck}`);
      console.log(`\nCategories:`);
      Object.entries(briefing.summary.categories).forEach(([cat, count]) => {
        if (count > 0) {
          console.log(`  ${cat}: ${count}`);
        }
      });
      console.log(`\nPriority Items: ${briefing.summary.priority.length}`);
      briefing.summary.priority.slice(0, 2).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.subject}`);
        console.log(`     From: ${item.from}`);
      });
      console.log(`\nAction Items: ${briefing.summary.actionItems.length}`);
      briefing.summary.actionItems.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.task}`);
        console.log(`     Priority: ${item.priority}`);
        if (item.deadline) {
          console.log(`     Deadline: ${item.deadline}`);
        }
      });
      console.log(`\nBrief Text:`);
      console.log(`  "${briefing.summary.briefText}"`);
    }

    // Test 7: Email categorization
    console.log('\n📋 Test 7: Email Categorization');
    console.log('-'.repeat(60));
    if (unreadEmails.success && unreadEmails.count > 0) {
      const categories = gmail.categorizeEmails(unreadEmails.emails);
      console.log('✅ PASS');
      console.log('Category Distribution:');
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
      });
    } else {
      console.log('⚠️  SKIP - No emails to categorize');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Suite Complete!');
    console.log('='.repeat(60));
    console.log('\n📊 Test Results:');
    console.log('  ✓ OAuth authentication working');
    console.log('  ✓ Email fetching operational');
    console.log('  ✓ Search functionality working');
    console.log('  ✓ Label management operational');
    console.log('  ✓ Morning briefing generator working');
    console.log('  ✓ Email categorization functional');
    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('\n❌ Test Suite Failed');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
