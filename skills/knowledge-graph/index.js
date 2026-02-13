#!/usr/bin/env node

/**
 * Knowledge Graph Builder
 * 
 * Advanced knowledge graph construction system with:
 * - Entity extraction (NER + LLM-enhanced)
 * - Relationship detection and typing
 * - Graph construction (in-memory + optional Neo4j)
 * - Graph querying and traversal
 * - Knowledge inference and reasoning
 * - Visualization integration
 * 
 * @author TARS
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const compromise = require('compromise');
const natural = require('natural');

// Configuration
const CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    embeddingModel: 'text-embedding-3-small'
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password'
  },
  storage: {
    graphFile: path.join(process.cwd(), '.knowledge-graph.json'),
    embeddingsFile: path.join(process.cwd(), '.kg-embeddings.json')
  },
  extraction: {
    minEntityConfidence: 0.6,
    minRelationshipConfidence: 0.5,
    maxContextWindow: 3, // sentences
    entityTypes: [
      'PERSON', 'ORG', 'LOCATION', 'DATE', 'EVENT',
      'CONCEPT', 'PRODUCT', 'TECHNOLOGY', 'SKILL', 'PROJECT'
    ],
    relationshipTypes: [
      'WORKS_FOR', 'LOCATED_IN', 'PART_OF', 'CREATED_BY',
      'OCCURRED_ON', 'RELATED_TO', 'DEPENDS_ON', 'CAUSES',
      'HAS_SKILL', 'MANAGES', 'COLLABORATES_WITH', 'INFLUENCES'
    ]
  },
  reasoning: {
    enableTransitivity: true,
    enableSymmetry: true,
    maxInferenceDepth: 3
  }
};

// Initialize OpenAI client
let openai = null;
if (CONFIG.openai.apiKey) {
  openai = new OpenAI({ apiKey: CONFIG.openai.apiKey });
}

/**
 * In-memory Knowledge Graph
 */
class KnowledgeGraph {
  constructor() {
    this.entities = new Map(); // id -> Entity
    this.relationships = new Map(); // id -> Relationship
    this.entityIndex = new Map(); // name -> entity ids
    this.typeIndex = new Map(); // type -> entity ids
    this.embeddings = new Map(); // entity id -> embedding vector
    this.metadata = {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
      totalEntities: 0,
      totalRelationships: 0
    };
  }

  /**
   * Add entity to graph
   */
  addEntity(entity) {
    const id = entity.id || this.generateEntityId(entity.name);
    entity.id = id;
    entity.created = entity.created || new Date().toISOString();
    
    this.entities.set(id, entity);
    
    // Update indices
    const normalizedName = this.normalize(entity.name);
    if (!this.entityIndex.has(normalizedName)) {
      this.entityIndex.set(normalizedName, new Set());
    }
    this.entityIndex.get(normalizedName).add(id);
    
    if (!this.typeIndex.has(entity.type)) {
      this.typeIndex.set(entity.type, new Set());
    }
    this.typeIndex.get(entity.type).add(id);
    
    this.metadata.totalEntities = this.entities.size;
    this.metadata.updated = new Date().toISOString();
    
    return id;
  }

  /**
   * Add relationship to graph
   */
  addRelationship(relationship) {
    const id = relationship.id || this.generateRelationshipId(
      relationship.source,
      relationship.type,
      relationship.target
    );
    relationship.id = id;
    relationship.created = relationship.created || new Date().toISOString();
    
    // Validate entities exist
    if (!this.entities.has(relationship.source)) {
      throw new Error(`Source entity not found: ${relationship.source}`);
    }
    if (!this.entities.has(relationship.target)) {
      throw new Error(`Target entity not found: ${relationship.target}`);
    }
    
    this.relationships.set(id, relationship);
    this.metadata.totalRelationships = this.relationships.size;
    this.metadata.updated = new Date().toISOString();
    
    return id;
  }

  /**
   * Find entity by name (fuzzy match)
   */
  findEntity(name, type = null) {
    const normalized = this.normalize(name);
    const candidates = this.entityIndex.get(normalized);
    
    if (!candidates || candidates.size === 0) {
      return null;
    }
    
    // Filter by type if provided
    if (type) {
      for (const id of candidates) {
        const entity = this.entities.get(id);
        if (entity.type === type) {
          return entity;
        }
      }
      return null;
    }
    
    // Return first match
    return this.entities.get(Array.from(candidates)[0]);
  }

  /**
   * Get entities by type
   */
  getEntitiesByType(type) {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.entities.get(id));
  }

  /**
   * Get relationships for entity
   */
  getRelationships(entityId, direction = 'both') {
    const relationships = [];
    
    for (const rel of this.relationships.values()) {
      if (direction === 'outgoing' || direction === 'both') {
        if (rel.source === entityId) {
          relationships.push(rel);
        }
      }
      if (direction === 'incoming' || direction === 'both') {
        if (rel.target === entityId) {
          relationships.push(rel);
        }
      }
    }
    
    return relationships;
  }

  /**
   * Query graph using Cypher-like syntax
   */
  query(pattern) {
    // Simple pattern matching: (Entity1)-[RELATIONSHIP]->(Entity2)
    const regex = /\((\w+):(\w+)\)-\[(\w+)\]->\((\w+):(\w+)\)/;
    const match = pattern.match(regex);
    
    if (!match) {
      throw new Error('Invalid query pattern. Use: (var1:TYPE1)-[REL_TYPE]->(var2:TYPE2)');
    }
    
    const [, var1, type1, relType, var2, type2] = match;
    
    const results = [];
    const entities1 = this.getEntitiesByType(type1);
    
    for (const entity1 of entities1) {
      const rels = this.getRelationships(entity1.id, 'outgoing');
      
      for (const rel of rels) {
        if (rel.type === relType) {
          const entity2 = this.entities.get(rel.target);
          if (entity2 && entity2.type === type2) {
            results.push({
              [var1]: entity1,
              relationship: rel,
              [var2]: entity2
            });
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Find shortest path between two entities
   */
  findPath(sourceId, targetId, maxDepth = 5) {
    const visited = new Set();
    const queue = [[sourceId]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (current === targetId) {
        return this.constructPath(path);
      }
      
      if (path.length >= maxDepth) {
        continue;
      }
      
      if (visited.has(current)) {
        continue;
      }
      
      visited.add(current);
      
      const relationships = this.getRelationships(current, 'outgoing');
      for (const rel of relationships) {
        if (!visited.has(rel.target)) {
          queue.push([...path, rel.target]);
        }
      }
    }
    
    return null; // No path found
  }

  /**
   * Construct path with full entity and relationship details
   */
  constructPath(entityIds) {
    const path = {
      entities: [],
      relationships: [],
      length: entityIds.length - 1
    };
    
    for (let i = 0; i < entityIds.length; i++) {
      path.entities.push(this.entities.get(entityIds[i]));
      
      if (i < entityIds.length - 1) {
        const rels = this.getRelationships(entityIds[i], 'outgoing');
        const rel = rels.find(r => r.target === entityIds[i + 1]);
        if (rel) {
          path.relationships.push(rel);
        }
      }
    }
    
    return path;
  }

  /**
   * Generate entity ID
   */
  generateEntityId(name) {
    return `entity_${this.normalize(name)}_${Date.now()}`;
  }

  /**
   * Generate relationship ID
   */
  generateRelationshipId(source, type, target) {
    return `rel_${source}_${type}_${target}_${Date.now()}`;
  }

  /**
   * Normalize string for indexing
   */
  normalize(str) {
    return str.toLowerCase().trim().replace(/\s+/g, '_');
  }

  /**
   * Export graph to JSON
   */
  toJSON() {
    return {
      metadata: this.metadata,
      entities: Array.from(this.entities.values()),
      relationships: Array.from(this.relationships.values())
    };
  }

  /**
   * Import graph from JSON
   */
  fromJSON(data) {
    this.metadata = data.metadata;
    
    // Import entities
    for (const entity of data.entities) {
      this.addEntity(entity);
    }
    
    // Import relationships
    for (const rel of data.relationships) {
      this.addRelationship(rel);
    }
  }

  /**
   * Save graph to disk
   */
  save(filepath = CONFIG.storage.graphFile) {
    const data = this.toJSON();
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`✓ Graph saved: ${filepath}`);
    console.log(`  Entities: ${this.metadata.totalEntities}`);
    console.log(`  Relationships: ${this.metadata.totalRelationships}`);
  }

  /**
   * Load graph from disk
   */
  static load(filepath = CONFIG.storage.graphFile) {
    if (!fs.existsSync(filepath)) {
      return new KnowledgeGraph();
    }
    
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    const graph = new KnowledgeGraph();
    graph.fromJSON(data);
    
    console.log(`✓ Graph loaded: ${filepath}`);
    console.log(`  Entities: ${graph.metadata.totalEntities}`);
    console.log(`  Relationships: ${graph.metadata.totalRelationships}`);
    
    return graph;
  }
}

/**
 * Entity Extractor
 * Extracts entities from text using NLP + LLM enhancement
 */
class EntityExtractor {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
  }

  /**
   * Extract entities from text
   */
  async extract(text, options = {}) {
    const { useLLM = true, minConfidence = CONFIG.extraction.minEntityConfidence } = options;
    
    // Stage 1: NLP-based extraction (Compromise.js)
    const nlpEntities = this.extractWithNLP(text);
    
    // Stage 2: LLM-enhanced extraction (optional)
    let llmEntities = [];
    if (useLLM && openai) {
      llmEntities = await this.extractWithLLM(text);
    }
    
    // Merge and deduplicate
    const entities = this.mergeEntities(nlpEntities, llmEntities);
    
    // Filter by confidence
    return entities.filter(e => e.confidence >= minConfidence);
  }

  /**
   * Extract entities using NLP (Compromise.js)
   */
  extractWithNLP(text) {
    const doc = compromise(text);
    const entities = [];
    
    // Extract people
    doc.people().forEach(person => {
      entities.push({
        name: person.text(),
        type: 'PERSON',
        confidence: 0.8,
        source: 'nlp',
        context: this.getContext(text, person.text())
      });
    });
    
    // Extract places
    doc.places().forEach(place => {
      entities.push({
        name: place.text(),
        type: 'LOCATION',
        confidence: 0.75,
        source: 'nlp',
        context: this.getContext(text, place.text())
      });
    });
    
    // Extract organizations
    doc.organizations().forEach(org => {
      entities.push({
        name: org.text(),
        type: 'ORG',
        confidence: 0.7,
        source: 'nlp',
        context: this.getContext(text, org.text())
      });
    });
    
    // Extract dates (if available in this version of compromise)
    try {
      if (doc.dates) {
        doc.dates().forEach(date => {
          entities.push({
            name: date.text(),
            type: 'DATE',
            confidence: 0.9,
            source: 'nlp',
            context: this.getContext(text, date.text())
          });
        });
      }
    } catch (e) {
      // dates() not available in this version
    }
    
    return entities;
  }

  /**
   * Extract entities using LLM
   */
  async extractWithLLM(text) {
    try {
      const prompt = `Extract entities from the following text. Return a JSON array of entities with the following structure:
[
  {
    "name": "entity name",
    "type": "PERSON|ORG|LOCATION|DATE|EVENT|CONCEPT|PRODUCT|TECHNOLOGY|SKILL|PROJECT",
    "confidence": 0.0-1.0,
    "attributes": {}
  }
]

Text: ${text}

Return only the JSON array, no explanation.`;

      const response = await openai.chat.completions.create({
        model: CONFIG.openai.model,
        messages: [
          { role: 'system', content: 'You are an expert entity extraction system. Extract entities precisely and return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content.trim();
      
      // Parse JSON (handle code blocks)
      let jsonStr = content;
      if (content.startsWith('```')) {
        jsonStr = content.replace(/```json?\n?/g, '').replace(/```\s*$/, '').trim();
      }
      
      const entities = JSON.parse(jsonStr);
      
      // Add source and context
      return entities.map(e => ({
        ...e,
        source: 'llm',
        context: this.getContext(text, e.name)
      }));
    } catch (error) {
      console.error('LLM extraction error:', error.message);
      return [];
    }
  }

  /**
   * Get context around entity mention
   */
  getContext(text, entityText, windowSize = 50) {
    const index = text.indexOf(entityText);
    if (index === -1) return '';
    
    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + entityText.length + windowSize);
    
    return text.slice(start, end);
  }

  /**
   * Merge entities from different sources
   */
  mergeEntities(nlpEntities, llmEntities) {
    const merged = new Map();
    
    // Add NLP entities
    for (const entity of nlpEntities) {
      const key = entity.name.toLowerCase();
      merged.set(key, entity);
    }
    
    // Merge LLM entities (higher confidence wins)
    for (const entity of llmEntities) {
      const key = entity.name.toLowerCase();
      const existing = merged.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        merged.set(key, entity);
      }
    }
    
    return Array.from(merged.values());
  }
}

/**
 * Relationship Detector
 * Detects relationships between entities
 */
class RelationshipDetector {
  constructor() {
    this.patterns = this.loadPatterns();
  }

  /**
   * Load relationship patterns
   */
  loadPatterns() {
    return {
      'WORKS_FOR': [
        /(\w+)\s+(?:works for|employed by|employee of)\s+(\w+)/gi,
        /(\w+)\s+(?:at|@)\s+(\w+)/gi
      ],
      'LOCATED_IN': [
        /(\w+)\s+(?:in|located in|based in)\s+(\w+)/gi
      ],
      'CREATED_BY': [
        /(\w+)\s+(?:created by|developed by|built by)\s+(\w+)/gi,
        /(\w+)\s+(?:created|developed|built)\s+(\w+)/gi
      ],
      'MANAGES': [
        /(\w+)\s+(?:manages|leads|heads)\s+(\w+)/gi
      ],
      'COLLABORATES_WITH': [
        /(\w+)\s+(?:collaborates with|works with|partners with)\s+(\w+)/gi
      ]
    };
  }

  /**
   * Detect relationships from text with extracted entities
   */
  async detect(text, entities, options = {}) {
    const { useLLM = true, minConfidence = CONFIG.extraction.minRelationshipConfidence } = options;
    
    // Stage 1: Pattern-based detection
    const patternRels = this.detectWithPatterns(text, entities);
    
    // Stage 2: LLM-based detection
    let llmRels = [];
    if (useLLM && openai) {
      llmRels = await this.detectWithLLM(text, entities);
    }
    
    // Merge and deduplicate
    const relationships = this.mergeRelationships(patternRels, llmRels);
    
    // Filter by confidence
    return relationships.filter(r => r.confidence >= minConfidence);
  }

  /**
   * Detect relationships using patterns
   */
  detectWithPatterns(text, entities) {
    const relationships = [];
    
    // Try to match entities in text directly
    for (let i = 0; i < entities.length; i++) {
      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue;
        
        const source = entities[i];
        const target = entities[j];
        
        // Check for common relationship patterns between these entities
        for (const [relType, patterns] of Object.entries(this.patterns)) {
          for (const pattern of patterns) {
            // Create a regex that looks for the specific entity names
            const contextRegex = new RegExp(
              `${this.escapeRegex(source.name)}[^.]*?(works for|employed by|at|in|located in|manages|leads|collaborates with|works with|partners with)[^.]*?${this.escapeRegex(target.name)}`,
              'gi'
            );
            
            const match = text.match(contextRegex);
            
            if (match) {
              relationships.push({
                source: source.name,
                type: relType,
                target: target.name,
                confidence: 0.7,
                source_method: 'pattern',
                evidence: match[0]
              });
              break; // Found a match for this entity pair
            }
          }
        }
      }
    }
    
    return relationships;
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Detect relationships using LLM
   */
  async detectWithLLM(text, entities) {
    try {
      const entityNames = entities.map(e => e.name).join(', ');
      
      const prompt = `Analyze the relationships between these entities in the text:

Entities: ${entityNames}

Text: ${text}

Return a JSON array of relationships:
[
  {
    "source": "entity1 name",
    "type": "RELATIONSHIP_TYPE",
    "target": "entity2 name",
    "confidence": 0.0-1.0,
    "evidence": "supporting text"
  }
]

Valid relationship types: ${CONFIG.extraction.relationshipTypes.join(', ')}

Return only the JSON array.`;

      const response = await openai.chat.completions.create({
        model: CONFIG.openai.model,
        messages: [
          { role: 'system', content: 'You are an expert relationship extraction system. Identify semantic relationships between entities.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content.trim();
      
      let jsonStr = content;
      if (content.startsWith('```')) {
        jsonStr = content.replace(/```json?\n?/g, '').replace(/```\s*$/, '').trim();
      }
      
      const relationships = JSON.parse(jsonStr);
      
      return relationships.map(r => ({
        ...r,
        source_method: 'llm'
      }));
    } catch (error) {
      console.error('LLM relationship detection error:', error.message);
      return [];
    }
  }

  /**
   * Merge relationships from different sources
   */
  mergeRelationships(patternRels, llmRels) {
    const merged = new Map();
    
    // Add pattern relationships
    for (const rel of patternRels) {
      const key = `${rel.source}_${rel.type}_${rel.target}`.toLowerCase();
      merged.set(key, rel);
    }
    
    // Merge LLM relationships
    for (const rel of llmRels) {
      const key = `${rel.source}_${rel.type}_${rel.target}`.toLowerCase();
      const existing = merged.get(key);
      
      if (!existing || rel.confidence > existing.confidence) {
        merged.set(key, rel);
      }
    }
    
    return Array.from(merged.values());
  }
}

/**
 * Reasoning Engine
 * Performs inference and reasoning over the knowledge graph
 */
class ReasoningEngine {
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Infer new relationships using logical rules
   */
  inferRelationships() {
    const inferred = [];
    
    if (CONFIG.reasoning.enableTransitivity) {
      inferred.push(...this.inferTransitive());
    }
    
    if (CONFIG.reasoning.enableSymmetry) {
      inferred.push(...this.inferSymmetric());
    }
    
    return inferred;
  }

  /**
   * Infer transitive relationships
   * If A -> B and B -> C, then A -> C
   */
  inferTransitive() {
    const inferred = [];
    const transitiveTypes = ['PART_OF', 'LOCATED_IN', 'DEPENDS_ON'];
    
    for (const relType of transitiveTypes) {
      const relationships = Array.from(this.graph.relationships.values())
        .filter(r => r.type === relType);
      
      for (const rel1 of relationships) {
        for (const rel2 of relationships) {
          // Check if rel1.target === rel2.source
          if (rel1.target === rel2.source) {
            // Check if direct relationship doesn't already exist
            const exists = Array.from(this.graph.relationships.values())
              .some(r => r.source === rel1.source && 
                        r.target === rel2.target && 
                        r.type === relType);
            
            if (!exists) {
              inferred.push({
                source: rel1.source,
                type: relType,
                target: rel2.target,
                confidence: Math.min(rel1.confidence || 0.8, rel2.confidence || 0.8) * 0.8,
                inferred: true,
                inference_type: 'transitive',
                evidence: [rel1.id, rel2.id]
              });
            }
          }
        }
      }
    }
    
    return inferred;
  }

  /**
   * Infer symmetric relationships
   * If A -> B, then B -> A (for certain relationship types)
   */
  inferSymmetric() {
    const inferred = [];
    const symmetricTypes = ['COLLABORATES_WITH', 'RELATED_TO'];
    
    for (const relType of symmetricTypes) {
      const relationships = Array.from(this.graph.relationships.values())
        .filter(r => r.type === relType);
      
      for (const rel of relationships) {
        // Check if reverse relationship exists
        const exists = Array.from(this.graph.relationships.values())
          .some(r => r.source === rel.target && 
                    r.target === rel.source && 
                    r.type === relType);
        
        if (!exists) {
          inferred.push({
            source: rel.target,
            type: relType,
            target: rel.source,
            confidence: (rel.confidence || 0.8) * 0.9,
            inferred: true,
            inference_type: 'symmetric',
            evidence: [rel.id]
          });
        }
      }
    }
    
    return inferred;
  }

  /**
   * Answer questions using graph reasoning
   */
  answerQuestion(question) {
    // Simple question answering patterns
    const patterns = {
      'who works for': this.findWorksFor.bind(this),
      'where is': this.findLocation.bind(this),
      'what did': this.findActions.bind(this),
      'how are.*related': this.findRelationship.bind(this)
    };
    
    for (const [pattern, handler] of Object.entries(patterns)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(question)) {
        return handler(question);
      }
    }
    
    return { answer: 'Question pattern not recognized', confidence: 0 };
  }

  /**
   * Find employment relationships
   */
  findWorksFor(question) {
    const match = question.match(/who works for\s+(\w+)/i);
    if (!match) return { answer: 'Could not parse question', confidence: 0 };
    
    const orgName = match[1];
    const org = this.graph.findEntity(orgName, 'ORG');
    
    if (!org) {
      return { answer: `Organization "${orgName}" not found`, confidence: 0 };
    }
    
    const employees = [];
    const relationships = this.graph.getRelationships(org.id, 'incoming');
    
    for (const rel of relationships) {
      if (rel.type === 'WORKS_FOR') {
        const person = this.graph.entities.get(rel.source);
        if (person) {
          employees.push(person.name);
        }
      }
    }
    
    if (employees.length === 0) {
      return { answer: `No employees found for ${orgName}`, confidence: 0 };
    }
    
    return {
      answer: `${employees.join(', ')} work(s) for ${orgName}`,
      confidence: 0.9,
      entities: employees
    };
  }

  /**
   * Find location relationships
   */
  findLocation(question) {
    const match = question.match(/where is\s+(\w+)/i);
    if (!match) return { answer: 'Could not parse question', confidence: 0 };
    
    const entityName = match[1];
    const entity = this.graph.findEntity(entityName);
    
    if (!entity) {
      return { answer: `Entity "${entityName}" not found`, confidence: 0 };
    }
    
    const relationships = this.graph.getRelationships(entity.id, 'outgoing');
    const locationRel = relationships.find(r => r.type === 'LOCATED_IN');
    
    if (!locationRel) {
      return { answer: `Location not found for ${entityName}`, confidence: 0 };
    }
    
    const location = this.graph.entities.get(locationRel.target);
    
    return {
      answer: `${entityName} is located in ${location.name}`,
      confidence: locationRel.confidence || 0.8,
      location: location.name
    };
  }

  /**
   * Find actions/events
   */
  findActions(question) {
    return { answer: 'Action queries not yet implemented', confidence: 0 };
  }

  /**
   * Find relationship between entities
   */
  findRelationship(question) {
    const match = question.match(/how are\s+(\w+)\s+and\s+(\w+)\s+related/i);
    if (!match) return { answer: 'Could not parse question', confidence: 0 };
    
    const [, name1, name2] = match;
    const entity1 = this.graph.findEntity(name1);
    const entity2 = this.graph.findEntity(name2);
    
    if (!entity1 || !entity2) {
      return { answer: 'One or both entities not found', confidence: 0 };
    }
    
    const path = this.graph.findPath(entity1.id, entity2.id);
    
    if (!path) {
      return { answer: `No relationship found between ${name1} and ${name2}`, confidence: 0 };
    }
    
    const pathDesc = this.describePath(path);
    
    return {
      answer: `${name1} and ${name2} are related: ${pathDesc}`,
      confidence: 0.8,
      path: path
    };
  }

  /**
   * Describe a path in natural language
   */
  describePath(path) {
    const parts = [];
    
    for (let i = 0; i < path.relationships.length; i++) {
      const rel = path.relationships[i];
      const source = path.entities[i];
      const target = path.entities[i + 1];
      
      parts.push(`${source.name} ${rel.type.replace(/_/g, ' ').toLowerCase()} ${target.name}`);
    }
    
    return parts.join(', ');
  }
}

/**
 * Graph Visualizer
 * Generate visualization data for knowledge graphs
 */
class GraphVisualizer {
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Generate D3.js compatible JSON
   */
  toD3() {
    const nodes = Array.from(this.graph.entities.values()).map(entity => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      confidence: entity.confidence || 1.0,
      group: this.getTypeGroup(entity.type)
    }));

    const links = Array.from(this.graph.relationships.values()).map(rel => ({
      source: rel.source,
      target: rel.target,
      type: rel.type,
      confidence: rel.confidence || 1.0,
      inferred: rel.inferred || false
    }));

    return { nodes, links };
  }

  /**
   * Get numeric group for entity type (for coloring)
   */
  getTypeGroup(type) {
    const groups = {
      'PERSON': 1,
      'ORG': 2,
      'LOCATION': 3,
      'DATE': 4,
      'EVENT': 5,
      'CONCEPT': 6,
      'PRODUCT': 7,
      'TECHNOLOGY': 8,
      'SKILL': 9,
      'PROJECT': 10
    };
    return groups[type] || 0;
  }

  /**
   * Generate HTML visualization
   */
  generateHTML(outputPath = 'knowledge-graph.html') {
    const d3Data = this.toD3();
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Knowledge Graph Visualization</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; }
    #graph { width: 100vw; height: 100vh; }
    .node { cursor: pointer; }
    .node text { font-size: 10px; pointer-events: none; }
    .link { stroke: #999; stroke-opacity: 0.6; }
    .link.inferred { stroke-dasharray: 5,5; }
    #info {
      position: absolute;
      top: 10px;
      right: 10px;
      background: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 300px;
    }
    .legend {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin: 5px 0;
    }
    .legend-color {
      width: 20px;
      height: 20px;
      margin-right: 10px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div id="graph"></div>
  <div id="info">
    <h3>Knowledge Graph</h3>
    <p>Nodes: ${d3Data.nodes.length}</p>
    <p>Relationships: ${d3Data.links.length}</p>
    <p>Click nodes to see details</p>
  </div>
  <div class="legend">
    <h4>Entity Types</h4>
    ${this.generateLegend()}
  </div>
  
  <script>
    const data = ${JSON.stringify(d3Data, null, 2)};
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    const svg = d3.select("#graph")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("class", d => d.inferred ? "link inferred" : "link")
      .attr("stroke-width", d => Math.sqrt(d.confidence * 3));
    
    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    node.append("circle")
      .attr("r", 8)
      .attr("fill", d => color(d.group))
      .attr("opacity", d => d.confidence);
    
    node.append("text")
      .text(d => d.name)
      .attr("x", 12)
      .attr("y", 3);
    
    node.on("click", (event, d) => {
      document.getElementById("info").innerHTML = \`
        <h3>\${d.name}</h3>
        <p><strong>Type:</strong> \${d.type}</p>
        <p><strong>Confidence:</strong> \${(d.confidence * 100).toFixed(1)}%</p>
        <p><strong>ID:</strong> \${d.id}</p>
      \`;
    });
    
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => \`translate(\${d.x},\${d.y})\`);
    });
    
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  </script>
</body>
</html>`;

    fs.writeFileSync(outputPath, html);
    console.log(`✓ Visualization saved: ${outputPath}`);
    console.log(`  Open in browser to view`);
    
    return outputPath;
  }

  /**
   * Generate legend HTML
   */
  generateLegend() {
    const types = [
      { name: 'Person', color: '#1f77b4', group: 1 },
      { name: 'Organization', color: '#ff7f0e', group: 2 },
      { name: 'Location', color: '#2ca02c', group: 3 },
      { name: 'Date', color: '#d62728', group: 4 },
      { name: 'Event', color: '#9467bd', group: 5 },
      { name: 'Concept', color: '#8c564b', group: 6 },
      { name: 'Product', color: '#e377c2', group: 7 },
      { name: 'Technology', color: '#7f7f7f', group: 8 },
      { name: 'Skill', color: '#bcbd22', group: 9 },
      { name: 'Project', color: '#17becf', group: 10 }
    ];
    
    return types.map(t => `
      <div class="legend-item">
        <div class="legend-color" style="background-color: ${t.color}"></div>
        <span>${t.name}</span>
      </div>
    `).join('');
  }

  /**
   * Generate graph statistics
   */
  getStatistics() {
    const stats = {
      nodes: this.graph.metadata.totalEntities,
      edges: this.graph.metadata.totalRelationships,
      entityTypes: {},
      relationshipTypes: {},
      avgDegree: 0,
      density: 0
    };

    // Count entity types
    for (const entity of this.graph.entities.values()) {
      stats.entityTypes[entity.type] = (stats.entityTypes[entity.type] || 0) + 1;
    }

    // Count relationship types
    for (const rel of this.graph.relationships.values()) {
      stats.relationshipTypes[rel.type] = (stats.relationshipTypes[rel.type] || 0) + 1;
    }

    // Calculate average degree
    const degrees = new Map();
    for (const rel of this.graph.relationships.values()) {
      degrees.set(rel.source, (degrees.get(rel.source) || 0) + 1);
      degrees.set(rel.target, (degrees.get(rel.target) || 0) + 1);
    }
    stats.avgDegree = Array.from(degrees.values()).reduce((a, b) => a + b, 0) / 
                      Math.max(degrees.size, 1);

    // Calculate density
    const n = stats.nodes;
    const maxEdges = n * (n - 1);
    stats.density = maxEdges > 0 ? stats.edges / maxEdges : 0;

    return stats;
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('=== Knowledge Graph Builder ===\n');

  switch (command) {
    case 'build':
      await buildGraph(args.slice(1));
      break;
    
    case 'query':
      await queryGraph(args.slice(1));
      break;
    
    case 'infer':
      await inferKnowledge();
      break;
    
    case 'visualize':
      await visualizeGraph(args.slice(1));
      break;
    
    case 'stats':
      await showStats();
      break;
    
    case 'ask':
      await askQuestion(args.slice(1));
      break;
    
    default:
      showUsage();
  }
}

/**
 * Build knowledge graph from text
 */
async function buildGraph(args) {
  const textFile = args[0];
  const useLLM = !args.includes('--no-llm');
  
  if (!textFile) {
    console.error('Error: Text file required');
    console.log('Usage: node index.js build <text-file> [--no-llm]');
    process.exit(1);
  }

  if (!fs.existsSync(textFile)) {
    console.error(`Error: File not found: ${textFile}`);
    process.exit(1);
  }

  console.log(`Reading: ${textFile}`);
  const text = fs.readFileSync(textFile, 'utf-8');
  console.log(`Text length: ${text.length} characters\n`);

  // Load or create graph
  const graph = KnowledgeGraph.load();

  // Extract entities
  console.log('Extracting entities...');
  const extractor = new EntityExtractor();
  const entities = await extractor.extract(text, { useLLM });
  console.log(`✓ Found ${entities.length} entities\n`);

  // Add entities to graph
  for (const entity of entities) {
    try {
      graph.addEntity(entity);
    } catch (error) {
      console.error(`Error adding entity: ${entity.name}`, error.message);
    }
  }

  // Detect relationships
  console.log('Detecting relationships...');
  const detector = new RelationshipDetector();
  const relationships = await detector.detect(text, entities, { useLLM });
  console.log(`✓ Found ${relationships.length} relationships\n`);

  // Add relationships to graph
  for (const rel of relationships) {
    try {
      // Find or add entities
      let source = graph.findEntity(rel.source);
      if (!source) {
        const sourceId = graph.addEntity({ name: rel.source, type: 'CONCEPT', confidence: 0.5 });
        source = graph.entities.get(sourceId);
      }

      let target = graph.findEntity(rel.target);
      if (!target) {
        const targetId = graph.addEntity({ name: rel.target, type: 'CONCEPT', confidence: 0.5 });
        target = graph.entities.get(targetId);
      }

      graph.addRelationship({
        ...rel,
        source: source.id,
        target: target.id
      });
    } catch (error) {
      console.error(`Error adding relationship: ${rel.source} -> ${rel.target}`, error.message);
    }
  }

  // Save graph
  graph.save();
  
  console.log('\n✓ Graph built successfully!');
  console.log(`  Total entities: ${graph.metadata.totalEntities}`);
  console.log(`  Total relationships: ${graph.metadata.totalRelationships}`);
}

/**
 * Query knowledge graph
 */
async function queryGraph(args) {
  const pattern = args.join(' ');
  
  if (!pattern) {
    console.error('Error: Query pattern required');
    console.log('Usage: node index.js query "(e1:TYPE1)-[REL_TYPE]->(e2:TYPE2)"');
    process.exit(1);
  }

  const graph = KnowledgeGraph.load();
  
  try {
    console.log(`Querying: ${pattern}\n`);
    const results = graph.query(pattern);
    
    console.log(`✓ Found ${results.length} results:\n`);
    
    for (let i = 0; i < Math.min(results.length, 10); i++) {
      const result = results[i];
      const vars = Object.keys(result).filter(k => k !== 'relationship');
      
      console.log(`${i + 1}. ${result[vars[0]].name} --[${result.relationship.type}]--> ${result[vars[1]].name}`);
      console.log(`   Confidence: ${(result.relationship.confidence * 100).toFixed(1)}%`);
      if (result.relationship.evidence) {
        console.log(`   Evidence: ${result.relationship.evidence}`);
      }
      console.log();
    }
    
    if (results.length > 10) {
      console.log(`... and ${results.length - 10} more results`);
    }
  } catch (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }
}

/**
 * Infer new knowledge
 */
async function inferKnowledge() {
  const graph = KnowledgeGraph.load();
  const reasoner = new ReasoningEngine(graph);
  
  console.log('Inferring new relationships...\n');
  
  const inferred = reasoner.inferRelationships();
  
  console.log(`✓ Inferred ${inferred.length} new relationships:\n`);
  
  for (let i = 0; i < Math.min(inferred.length, 10); i++) {
    const rel = inferred[i];
    const source = graph.entities.get(rel.source);
    const target = graph.entities.get(rel.target);
    
    console.log(`${i + 1}. ${source.name} --[${rel.type}]--> ${target.name}`);
    console.log(`   Inference: ${rel.inference_type}`);
    console.log(`   Confidence: ${(rel.confidence * 100).toFixed(1)}%`);
    console.log();
  }
  
  // Add inferred relationships to graph
  if (inferred.length > 0) {
    const add = process.argv.includes('--add');
    
    if (add) {
      for (const rel of inferred) {
        try {
          graph.addRelationship(rel);
        } catch (error) {
          console.error('Error adding inferred relationship:', error.message);
        }
      }
      
      graph.save();
      console.log('\n✓ Inferred relationships added to graph');
    } else {
      console.log('\nTo add these to the graph, run: node index.js infer --add');
    }
  }
}

/**
 * Visualize graph
 */
async function visualizeGraph(args) {
  const outputFile = args[0] || 'knowledge-graph.html';
  
  const graph = KnowledgeGraph.load();
  const visualizer = new GraphVisualizer(graph);
  
  console.log('Generating visualization...\n');
  
  const htmlPath = visualizer.generateHTML(outputFile);
  
  console.log('\n✓ Visualization complete!');
  console.log(`  Open: ${htmlPath}`);
}

/**
 * Show graph statistics
 */
async function showStats() {
  const graph = KnowledgeGraph.load();
  const visualizer = new GraphVisualizer(graph);
  
  const stats = visualizer.getStatistics();
  
  console.log('Graph Statistics:\n');
  console.log(`Total Nodes: ${stats.nodes}`);
  console.log(`Total Edges: ${stats.edges}`);
  console.log(`Average Degree: ${stats.avgDegree.toFixed(2)}`);
  console.log(`Density: ${(stats.density * 100).toFixed(4)}%`);
  
  console.log('\nEntity Types:');
  for (const [type, count] of Object.entries(stats.entityTypes)) {
    console.log(`  ${type}: ${count}`);
  }
  
  console.log('\nRelationship Types:');
  for (const [type, count] of Object.entries(stats.relationshipTypes)) {
    console.log(`  ${type}: ${count}`);
  }
}

/**
 * Ask a question
 */
async function askQuestion(args) {
  const question = args.join(' ');
  
  if (!question) {
    console.error('Error: Question required');
    console.log('Usage: node index.js ask "your question here"');
    process.exit(1);
  }

  const graph = KnowledgeGraph.load();
  const reasoner = new ReasoningEngine(graph);
  
  console.log(`Question: ${question}\n`);
  
  const result = reasoner.answerQuestion(question);
  
  console.log(`Answer: ${result.answer}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  
  if (result.entities) {
    console.log(`\nEntities: ${result.entities.join(', ')}`);
  }
  
  if (result.path) {
    console.log('\nPath:');
    for (let i = 0; i < result.path.entities.length; i++) {
      console.log(`  ${i + 1}. ${result.path.entities[i].name}`);
      if (i < result.path.relationships.length) {
        console.log(`     --[${result.path.relationships[i].type}]-->`);
      }
    }
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`Usage: node index.js <command> [options]

Commands:
  build <file>           Build knowledge graph from text file
    --no-llm             Use only NLP extraction (no LLM)
  
  query "<pattern>"      Query graph with pattern
    Example: "(p:PERSON)-[WORKS_FOR]->(o:ORG)"
  
  infer                  Infer new relationships
    --add                Add inferred relationships to graph
  
  visualize [file]       Generate HTML visualization
    Default: knowledge-graph.html
  
  stats                  Show graph statistics
  
  ask "question"         Ask a question about the graph
    Examples:
      "who works for Microsoft?"
      "where is John located?"
      "how are Alice and Bob related?"

Examples:
  node index.js build input.txt
  node index.js query "(p:PERSON)-[WORKS_FOR]->(o:ORG)"
  node index.js infer --add
  node index.js visualize graph.html
  node index.js stats
  node index.js ask "who works for Google?"

Environment Variables:
  OPENAI_API_KEY         OpenAI API key (required for LLM features)
  NEO4J_URI              Neo4j database URI (optional)
  NEO4J_USER             Neo4j username (optional)
  NEO4J_PASSWORD         Neo4j password (optional)
`);
}

// Export modules for programmatic use
module.exports = {
  KnowledgeGraph,
  EntityExtractor,
  RelationshipDetector,
  ReasoningEngine,
  GraphVisualizer,
  CONFIG
};

// Run CLI if invoked directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
