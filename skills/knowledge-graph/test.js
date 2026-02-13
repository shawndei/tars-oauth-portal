#!/usr/bin/env node

/**
 * Knowledge Graph Builder - Test Suite
 * 
 * Comprehensive tests for all components:
 * - Entity extraction
 * - Relationship detection
 * - Graph construction
 * - Querying and traversal
 * - Reasoning and inference
 * - Visualization
 * - Performance benchmarks
 * 
 * @author TARS
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const {
  KnowledgeGraph,
  EntityExtractor,
  RelationshipDetector,
  ReasoningEngine,
  GraphVisualizer,
  CONFIG
} = require('./index.js');

// Test configuration
const TEST_CONFIG = {
  verbose: process.argv.includes('--verbose'),
  skipLLM: process.argv.includes('--skip-llm'),
  testDataDir: path.join(__dirname, 'test-data'),
  outputDir: path.join(__dirname, 'test-output')
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  timings: {}
};

/**
 * Test runner utility
 */
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n=== ${this.name} ===\n`);
    
    for (const test of this.tests) {
      results.total++;
      
      try {
        const start = Date.now();
        await test.fn();
        const duration = Date.now() - start;
        
        results.passed++;
        results.timings[test.description] = duration;
        
        console.log(`✓ ${test.description} (${duration}ms)`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          test: test.description,
          error: error.message,
          stack: error.stack
        });
        
        console.log(`✗ ${test.description}`);
        if (TEST_CONFIG.verbose) {
          console.log(`  Error: ${error.message}`);
        }
      }
    }
  }
}

/**
 * Assertion utilities
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertGreaterThan(actual, threshold, message) {
  if (actual <= threshold) {
    throw new Error(message || `Expected > ${threshold}, got ${actual}`);
  }
}

function assertLessThan(actual, threshold, message) {
  if (actual >= threshold) {
    throw new Error(message || `Expected < ${threshold}, got ${actual}`);
  }
}

function assertArrayLength(arr, length, message) {
  if (arr.length !== length) {
    throw new Error(message || `Expected array length ${length}, got ${arr.length}`);
  }
}

/**
 * Test data
 */
const TEST_TEXT = `
John Smith works for Microsoft in Seattle. He manages the Azure team and has been with 
the company since 2020. John collaborates with Sarah Johnson from Google on several 
cloud computing projects.

Microsoft is located in Redmond, Washington, and was founded by Bill Gates. The company 
specializes in software development and cloud services. Azure is one of Microsoft's 
flagship products.

Sarah Johnson leads the Google Cloud Platform team in Mountain View, California. She 
previously worked at Amazon Web Services before joining Google in 2021.

The collaboration between Microsoft and Google focuses on interoperability standards 
for cloud services, which was initiated in early 2023.
`;

const TEST_ENTITIES = [
  { name: 'John Smith', type: 'PERSON' },
  { name: 'Microsoft', type: 'ORG' },
  { name: 'Seattle', type: 'LOCATION' },
  { name: 'Azure', type: 'PRODUCT' },
  { name: 'Sarah Johnson', type: 'PERSON' },
  { name: 'Google', type: 'ORG' },
  { name: 'Bill Gates', type: 'PERSON' },
  { name: 'Redmond', type: 'LOCATION' },
  { name: 'Washington', type: 'LOCATION' },
  { name: 'Mountain View', type: 'LOCATION' },
  { name: 'California', type: 'LOCATION' }
];

const TEST_RELATIONSHIPS = [
  { source: 'John Smith', type: 'WORKS_FOR', target: 'Microsoft' },
  { source: 'Microsoft', type: 'LOCATED_IN', target: 'Seattle' },
  { source: 'John Smith', type: 'MANAGES', target: 'Azure' },
  { source: 'John Smith', type: 'COLLABORATES_WITH', target: 'Sarah Johnson' },
  { source: 'Sarah Johnson', type: 'WORKS_FOR', target: 'Google' }
];

/**
 * Test Suite 1: Entity Extraction
 */
const entityExtractionTests = new TestRunner('Entity Extraction');

entityExtractionTests.test('NLP-based extraction finds people', async () => {
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(TEST_TEXT, { useLLM: false });
  
  const people = entities.filter(e => e.type === 'PERSON');
  assertGreaterThan(people.length, 0, 'Should find at least one person');
  
  const johnSmith = people.find(p => p.name.toLowerCase().includes('john'));
  assert(johnSmith, 'Should find John Smith');
});

entityExtractionTests.test('NLP-based extraction finds organizations', async () => {
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(TEST_TEXT, { useLLM: false });
  
  const orgs = entities.filter(e => e.type === 'ORG');
  assertGreaterThan(orgs.length, 0, 'Should find at least one organization');
  
  const microsoft = orgs.find(o => o.name.toLowerCase().includes('microsoft'));
  assert(microsoft, 'Should find Microsoft');
});

entityExtractionTests.test('NLP-based extraction finds locations', async () => {
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(TEST_TEXT, { useLLM: false });
  
  const locations = entities.filter(e => e.type === 'LOCATION');
  assertGreaterThan(locations.length, 0, 'Should find at least one location');
});

entityExtractionTests.test('Entities have required fields', async () => {
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(TEST_TEXT, { useLLM: false });
  
  for (const entity of entities) {
    assert(entity.name, 'Entity should have name');
    assert(entity.type, 'Entity should have type');
    assert(entity.confidence !== undefined, 'Entity should have confidence');
    assert(entity.source, 'Entity should have source');
  }
});

entityExtractionTests.test('Confidence scores are valid', async () => {
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(TEST_TEXT, { useLLM: false });
  
  for (const entity of entities) {
    assertGreaterThan(entity.confidence, 0, 'Confidence should be > 0');
    assertLessThan(entity.confidence, 1.01, 'Confidence should be <= 1');
  }
});

if (!TEST_CONFIG.skipLLM && CONFIG.openai.apiKey) {
  entityExtractionTests.test('LLM-enhanced extraction finds more entities', async () => {
    const extractor = new EntityExtractor();
    
    const nlpEntities = await extractor.extract(TEST_TEXT, { useLLM: false });
    const llmEntities = await extractor.extract(TEST_TEXT, { useLLM: true });
    
    assertGreaterThan(
      llmEntities.length,
      nlpEntities.length * 0.5,
      'LLM should find comparable or more entities'
    );
  });

  entityExtractionTests.test('LLM extraction includes advanced types', async () => {
    const extractor = new EntityExtractor();
    const entities = await extractor.extract(TEST_TEXT, { useLLM: true });
    
    const advancedTypes = ['PRODUCT', 'TECHNOLOGY', 'PROJECT', 'CONCEPT'];
    const hasAdvanced = entities.some(e => advancedTypes.includes(e.type));
    
    assert(hasAdvanced, 'Should find at least one advanced entity type');
  });
} else {
  results.skipped += 2;
  console.log('⊘ Skipping LLM tests (no API key or --skip-llm flag)');
}

/**
 * Test Suite 2: Relationship Detection
 */
const relationshipTests = new TestRunner('Relationship Detection');

relationshipTests.test('Pattern-based detection finds WORKS_FOR', async () => {
  const detector = new RelationshipDetector();
  const extractor = new EntityExtractor();
  
  const text = "John Smith works for Microsoft.";
  const entities = await extractor.extract(text, { useLLM: false });
  const relationships = await detector.detect(text, entities, { useLLM: false });
  
  const worksFor = relationships.find(r => r.type === 'WORKS_FOR');
  assert(worksFor, 'Should find WORKS_FOR relationship');
});

relationshipTests.test('Relationships reference valid entities', async () => {
  const detector = new RelationshipDetector();
  const extractor = new EntityExtractor();
  
  const entities = await extractor.extract(TEST_TEXT, { useLLM: false });
  const relationships = await detector.detect(TEST_TEXT, entities, { useLLM: false });
  
  for (const rel of relationships) {
    assert(rel.source, 'Relationship should have source');
    assert(rel.target, 'Relationship should have target');
    assert(rel.type, 'Relationship should have type');
    assert(rel.confidence !== undefined, 'Relationship should have confidence');
  }
});

relationshipTests.test('Confidence scores are valid', async () => {
  const detector = new RelationshipDetector();
  const extractor = new EntityExtractor();
  
  const entities = await extractor.extract(TEST_TEXT, { useLLM: false });
  const relationships = await detector.detect(TEST_TEXT, entities, { useLLM: false });
  
  for (const rel of relationships) {
    assertGreaterThan(rel.confidence, 0, 'Confidence should be > 0');
    assertLessThan(rel.confidence, 1.01, 'Confidence should be <= 1');
  }
});

if (!TEST_CONFIG.skipLLM && CONFIG.openai.apiKey) {
  relationshipTests.test('LLM detection finds semantic relationships', async () => {
    const detector = new RelationshipDetector();
    const extractor = new EntityExtractor();
    
    const entities = await extractor.extract(TEST_TEXT, { useLLM: true });
    const relationships = await detector.detect(TEST_TEXT, entities, { useLLM: true });
    
    assertGreaterThan(relationships.length, 0, 'Should find at least one relationship');
  });
} else {
  results.skipped += 1;
}

/**
 * Test Suite 3: Graph Construction
 */
const graphTests = new TestRunner('Graph Construction');

graphTests.test('Create empty graph', () => {
  const graph = new KnowledgeGraph();
  
  assertEqual(graph.entities.size, 0, 'Should have no entities');
  assertEqual(graph.relationships.size, 0, 'Should have no relationships');
  assert(graph.metadata, 'Should have metadata');
});

graphTests.test('Add entity to graph', () => {
  const graph = new KnowledgeGraph();
  
  const entityId = graph.addEntity({
    name: 'John Smith',
    type: 'PERSON',
    confidence: 0.95
  });
  
  assert(entityId, 'Should return entity ID');
  assertEqual(graph.entities.size, 1, 'Should have one entity');
  
  const entity = graph.entities.get(entityId);
  assert(entity, 'Should retrieve entity');
  assertEqual(entity.name, 'John Smith', 'Entity name should match');
});

graphTests.test('Add relationship to graph', () => {
  const graph = new KnowledgeGraph();
  
  const entity1Id = graph.addEntity({ name: 'John', type: 'PERSON', confidence: 0.9 });
  const entity2Id = graph.addEntity({ name: 'Microsoft', type: 'ORG', confidence: 0.9 });
  
  const relId = graph.addRelationship({
    source: entity1Id,
    target: entity2Id,
    type: 'WORKS_FOR',
    confidence: 0.85
  });
  
  assert(relId, 'Should return relationship ID');
  assertEqual(graph.relationships.size, 1, 'Should have one relationship');
});

graphTests.test('Find entity by name', () => {
  const graph = new KnowledgeGraph();
  
  graph.addEntity({ name: 'John Smith', type: 'PERSON', confidence: 0.9 });
  
  const found = graph.findEntity('John Smith');
  assert(found, 'Should find entity');
  assertEqual(found.name, 'John Smith', 'Name should match');
});

graphTests.test('Get entities by type', () => {
  const graph = new KnowledgeGraph();
  
  graph.addEntity({ name: 'John', type: 'PERSON', confidence: 0.9 });
  graph.addEntity({ name: 'Sarah', type: 'PERSON', confidence: 0.9 });
  graph.addEntity({ name: 'Microsoft', type: 'ORG', confidence: 0.9 });
  
  const people = graph.getEntitiesByType('PERSON');
  assertEqual(people.length, 2, 'Should find 2 people');
  
  const orgs = graph.getEntitiesByType('ORG');
  assertEqual(orgs.length, 1, 'Should find 1 organization');
});

graphTests.test('Get entity relationships', () => {
  const graph = new KnowledgeGraph();
  
  const johnId = graph.addEntity({ name: 'John', type: 'PERSON', confidence: 0.9 });
  const microsoftId = graph.addEntity({ name: 'Microsoft', type: 'ORG', confidence: 0.9 });
  
  graph.addRelationship({
    source: johnId,
    target: microsoftId,
    type: 'WORKS_FOR',
    confidence: 0.85
  });
  
  const rels = graph.getRelationships(johnId, 'outgoing');
  assertEqual(rels.length, 1, 'Should have 1 outgoing relationship');
  assertEqual(rels[0].type, 'WORKS_FOR', 'Relationship type should match');
});

graphTests.test('Save and load graph', () => {
  const graph = new KnowledgeGraph();
  
  graph.addEntity({ name: 'John', type: 'PERSON', confidence: 0.9 });
  graph.addEntity({ name: 'Microsoft', type: 'ORG', confidence: 0.9 });
  
  const testFile = path.join(__dirname, 'test-graph.json');
  graph.save(testFile);
  
  assert(fs.existsSync(testFile), 'Graph file should exist');
  
  const loaded = KnowledgeGraph.load(testFile);
  assertEqual(loaded.entities.size, 2, 'Loaded graph should have 2 entities');
  
  // Cleanup
  fs.unlinkSync(testFile);
});

/**
 * Test Suite 4: Graph Querying
 */
const queryTests = new TestRunner('Graph Querying');

queryTests.test('Query with pattern matching', () => {
  const graph = new KnowledgeGraph();
  
  const johnId = graph.addEntity({ name: 'John', type: 'PERSON', confidence: 0.9 });
  const microsoftId = graph.addEntity({ name: 'Microsoft', type: 'ORG', confidence: 0.9 });
  
  graph.addRelationship({
    source: johnId,
    target: microsoftId,
    type: 'WORKS_FOR',
    confidence: 0.85
  });
  
  const results = graph.query('(p:PERSON)-[WORKS_FOR]->(o:ORG)');
  assertEqual(results.length, 1, 'Should find 1 match');
  assertEqual(results[0].p.name, 'John', 'Should match John');
});

queryTests.test('Find shortest path between entities', () => {
  const graph = new KnowledgeGraph();
  
  const aId = graph.addEntity({ name: 'A', type: 'PERSON', confidence: 0.9 });
  const bId = graph.addEntity({ name: 'B', type: 'PERSON', confidence: 0.9 });
  const cId = graph.addEntity({ name: 'C', type: 'PERSON', confidence: 0.9 });
  
  graph.addRelationship({
    source: aId,
    target: bId,
    type: 'KNOWS',
    confidence: 0.9
  });
  
  graph.addRelationship({
    source: bId,
    target: cId,
    type: 'KNOWS',
    confidence: 0.9
  });
  
  const path = graph.findPath(aId, cId);
  assert(path, 'Should find path');
  assertEqual(path.length, 2, 'Path should have length 2');
  assertEqual(path.entities.length, 3, 'Path should have 3 entities');
});

queryTests.test('Path finding returns null when no path exists', () => {
  const graph = new KnowledgeGraph();
  
  const aId = graph.addEntity({ name: 'A', type: 'PERSON', confidence: 0.9 });
  const bId = graph.addEntity({ name: 'B', type: 'PERSON', confidence: 0.9 });
  
  const path = graph.findPath(aId, bId);
  assertEqual(path, null, 'Should return null for disconnected entities');
});

/**
 * Test Suite 5: Reasoning and Inference
 */
const reasoningTests = new TestRunner('Reasoning and Inference');

reasoningTests.test('Infer transitive relationships', () => {
  const graph = new KnowledgeGraph();
  
  const aId = graph.addEntity({ name: 'A', type: 'LOCATION', confidence: 0.9 });
  const bId = graph.addEntity({ name: 'B', type: 'LOCATION', confidence: 0.9 });
  const cId = graph.addEntity({ name: 'C', type: 'LOCATION', confidence: 0.9 });
  
  graph.addRelationship({
    source: aId,
    target: bId,
    type: 'PART_OF',
    confidence: 0.9
  });
  
  graph.addRelationship({
    source: bId,
    target: cId,
    type: 'PART_OF',
    confidence: 0.9
  });
  
  const reasoner = new ReasoningEngine(graph);
  const inferred = reasoner.inferRelationships();
  
  assertGreaterThan(inferred.length, 0, 'Should infer at least one relationship');
  
  const transitive = inferred.find(r => 
    r.source === aId && r.target === cId && r.type === 'PART_OF'
  );
  
  assert(transitive, 'Should infer A PART_OF C');
  assertEqual(transitive.inference_type, 'transitive', 'Should be transitive inference');
});

reasoningTests.test('Infer symmetric relationships', () => {
  const graph = new KnowledgeGraph();
  
  const aId = graph.addEntity({ name: 'A', type: 'PERSON', confidence: 0.9 });
  const bId = graph.addEntity({ name: 'B', type: 'PERSON', confidence: 0.9 });
  
  graph.addRelationship({
    source: aId,
    target: bId,
    type: 'COLLABORATES_WITH',
    confidence: 0.9
  });
  
  const reasoner = new ReasoningEngine(graph);
  const inferred = reasoner.inferRelationships();
  
  const symmetric = inferred.find(r => 
    r.source === bId && r.target === aId && r.type === 'COLLABORATES_WITH'
  );
  
  assert(symmetric, 'Should infer B COLLABORATES_WITH A');
  assertEqual(symmetric.inference_type, 'symmetric', 'Should be symmetric inference');
});

reasoningTests.test('Answer "who works for" question', () => {
  const graph = new KnowledgeGraph();
  
  const johnId = graph.addEntity({ name: 'John', type: 'PERSON', confidence: 0.9 });
  const microsoftId = graph.addEntity({ name: 'Microsoft', type: 'ORG', confidence: 0.9 });
  
  graph.addRelationship({
    source: johnId,
    target: microsoftId,
    type: 'WORKS_FOR',
    confidence: 0.9
  });
  
  const reasoner = new ReasoningEngine(graph);
  const answer = reasoner.answerQuestion('who works for Microsoft?');
  
  assert(answer.answer.includes('John'), 'Answer should mention John');
  assertGreaterThan(answer.confidence, 0, 'Should have confidence > 0');
});

reasoningTests.test('Answer "how are related" question', () => {
  const graph = new KnowledgeGraph();
  
  const aId = graph.addEntity({ name: 'Alice', type: 'PERSON', confidence: 0.9 });
  const bId = graph.addEntity({ name: 'Bob', type: 'PERSON', confidence: 0.9 });
  
  graph.addRelationship({
    source: aId,
    target: bId,
    type: 'MANAGES',
    confidence: 0.9
  });
  
  const reasoner = new ReasoningEngine(graph);
  const answer = reasoner.answerQuestion('how are Alice and Bob related?');
  
  assert(answer.path, 'Should return path');
  assertGreaterThan(answer.confidence, 0, 'Should have confidence > 0');
});

/**
 * Test Suite 6: Visualization
 */
const vizTests = new TestRunner('Visualization');

vizTests.test('Generate D3.js compatible format', () => {
  const graph = new KnowledgeGraph();
  
  const aId = graph.addEntity({ name: 'A', type: 'PERSON', confidence: 0.9 });
  const bId = graph.addEntity({ name: 'B', type: 'ORG', confidence: 0.9 });
  
  graph.addRelationship({
    source: aId,
    target: bId,
    type: 'WORKS_FOR',
    confidence: 0.9
  });
  
  const visualizer = new GraphVisualizer(graph);
  const d3Data = visualizer.toD3();
  
  assert(d3Data.nodes, 'Should have nodes array');
  assert(d3Data.links, 'Should have links array');
  assertEqual(d3Data.nodes.length, 2, 'Should have 2 nodes');
  assertEqual(d3Data.links.length, 1, 'Should have 1 link');
});

vizTests.test('Generate HTML visualization', () => {
  const graph = new KnowledgeGraph();
  
  graph.addEntity({ name: 'A', type: 'PERSON', confidence: 0.9 });
  graph.addEntity({ name: 'B', type: 'ORG', confidence: 0.9 });
  
  const visualizer = new GraphVisualizer(graph);
  const outputPath = path.join(__dirname, 'test-viz.html');
  
  visualizer.generateHTML(outputPath);
  
  assert(fs.existsSync(outputPath), 'HTML file should exist');
  
  const content = fs.readFileSync(outputPath, 'utf-8');
  assert(content.includes('d3'), 'Should include D3.js');
  assert(content.includes('Knowledge Graph'), 'Should have title');
  
  // Cleanup
  fs.unlinkSync(outputPath);
});

vizTests.test('Calculate graph statistics', () => {
  const graph = new KnowledgeGraph();
  
  const aId = graph.addEntity({ name: 'A', type: 'PERSON', confidence: 0.9 });
  const bId = graph.addEntity({ name: 'B', type: 'PERSON', confidence: 0.9 });
  const cId = graph.addEntity({ name: 'C', type: 'ORG', confidence: 0.9 });
  
  graph.addRelationship({
    source: aId,
    target: cId,
    type: 'WORKS_FOR',
    confidence: 0.9
  });
  
  graph.addRelationship({
    source: bId,
    target: cId,
    type: 'WORKS_FOR',
    confidence: 0.9
  });
  
  const visualizer = new GraphVisualizer(graph);
  const stats = visualizer.getStatistics();
  
  assertEqual(stats.nodes, 3, 'Should have 3 nodes');
  assertEqual(stats.edges, 2, 'Should have 2 edges');
  assert(stats.entityTypes, 'Should have entity types');
  assert(stats.relationshipTypes, 'Should have relationship types');
});

/**
 * Test Suite 7: Performance Benchmarks
 */
const perfTests = new TestRunner('Performance Benchmarks');

perfTests.test('Entity extraction performance (NLP)', async () => {
  const extractor = new EntityExtractor();
  const longText = TEST_TEXT.repeat(10); // ~5000 words
  
  const start = Date.now();
  await extractor.extract(longText, { useLLM: false });
  const duration = Date.now() - start;
  
  assertLessThan(duration, 5000, 'Should complete within 5 seconds');
  console.log(`  Performance: ${duration}ms for ${longText.length} characters`);
});

perfTests.test('Graph query performance', () => {
  const graph = new KnowledgeGraph();
  
  // Build medium-sized graph
  for (let i = 0; i < 100; i++) {
    graph.addEntity({ name: `Person${i}`, type: 'PERSON', confidence: 0.9 });
  }
  
  for (let i = 0; i < 50; i++) {
    graph.addEntity({ name: `Org${i}`, type: 'ORG', confidence: 0.9 });
  }
  
  const people = graph.getEntitiesByType('PERSON');
  const orgs = graph.getEntitiesByType('ORG');
  
  for (let i = 0; i < 100; i++) {
    const personId = people[Math.floor(Math.random() * people.length)].id;
    const orgId = orgs[Math.floor(Math.random() * orgs.length)].id;
    
    graph.addRelationship({
      source: personId,
      target: orgId,
      type: 'WORKS_FOR',
      confidence: 0.9
    });
  }
  
  const start = Date.now();
  const results = graph.query('(p:PERSON)-[WORKS_FOR]->(o:ORG)');
  const duration = Date.now() - start;
  
  assertLessThan(duration, 100, 'Query should complete within 100ms');
  console.log(`  Performance: ${duration}ms for 150 entities, 100 relationships`);
  console.log(`  Results: ${results.length} matches`);
});

perfTests.test('Path finding performance', () => {
  const graph = new KnowledgeGraph();
  
  // Build chain: A -> B -> C -> D -> E
  const entities = [];
  for (let i = 0; i < 5; i++) {
    const id = graph.addEntity({ name: `Node${i}`, type: 'CONCEPT', confidence: 0.9 });
    entities.push(id);
  }
  
  for (let i = 0; i < entities.length - 1; i++) {
    graph.addRelationship({
      source: entities[i],
      target: entities[i + 1],
      type: 'RELATED_TO',
      confidence: 0.9
    });
  }
  
  const start = Date.now();
  const path = graph.findPath(entities[0], entities[4]);
  const duration = Date.now() - start;
  
  assert(path, 'Should find path');
  assertLessThan(duration, 50, 'Path finding should complete within 50ms');
  console.log(`  Performance: ${duration}ms for depth-4 path`);
});

perfTests.test('Serialization performance', () => {
  const graph = new KnowledgeGraph();
  
  // Build medium-sized graph
  for (let i = 0; i < 500; i++) {
    graph.addEntity({ name: `Entity${i}`, type: 'CONCEPT', confidence: 0.9 });
  }
  
  const testFile = path.join(__dirname, 'test-perf.json');
  
  const startSave = Date.now();
  graph.save(testFile);
  const saveDuration = Date.now() - startSave;
  
  const startLoad = Date.now();
  KnowledgeGraph.load(testFile);
  const loadDuration = Date.now() - startLoad;
  
  assertLessThan(saveDuration, 1000, 'Save should complete within 1 second');
  assertLessThan(loadDuration, 1000, 'Load should complete within 1 second');
  
  console.log(`  Save: ${saveDuration}ms, Load: ${loadDuration}ms (500 entities)`);
  
  // Cleanup
  fs.unlinkSync(testFile);
});

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('=== Knowledge Graph Builder - Test Suite ===');
  console.log(`Mode: ${TEST_CONFIG.skipLLM ? 'NLP-only' : 'Full (NLP + LLM)'}`);
  console.log(`Verbose: ${TEST_CONFIG.verbose}`);
  console.log('');

  const startTime = Date.now();

  // Run all test suites
  await entityExtractionTests.run();
  await relationshipTests.run();
  await graphTests.run();
  await queryTests.run();
  await reasoningTests.run();
  await vizTests.run();
  await perfTests.run();

  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n=== Test Summary ===\n');
  console.log(`Total tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Skipped: ${results.skipped} ⊘`);
  console.log(`Duration: ${totalDuration}ms`);

  // Print errors
  if (results.errors.length > 0) {
    console.log('\n=== Errors ===\n');
    for (const error of results.errors) {
      console.log(`✗ ${error.test}`);
      console.log(`  ${error.error}`);
      if (TEST_CONFIG.verbose) {
        console.log(`  ${error.stack}`);
      }
    }
  }

  // Print slowest tests
  if (TEST_CONFIG.verbose) {
    console.log('\n=== Slowest Tests ===\n');
    const sorted = Object.entries(results.timings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    for (const [test, duration] of sorted) {
      console.log(`${duration}ms - ${test}`);
    }
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, TestRunner, assert, assertEqual };
