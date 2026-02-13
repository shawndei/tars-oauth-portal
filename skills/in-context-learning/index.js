/**
 * In-Context Learning Skill
 * 
 * Main entry point for the in-context learning system.
 */

const { InContextAdapter } = require('./adapter');
const { ExampleLibrary } = require('./library');
const { SelectionStrategy } = require('./strategies');
const { PerformanceTracker } = require('./tracker');

module.exports = {
  InContextAdapter,
  ExampleLibrary,
  SelectionStrategy,
  PerformanceTracker
};
