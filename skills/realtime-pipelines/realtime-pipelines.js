/**
 * Real-Time Data Pipelines Engine
 * Monitors multiple data sources and processes them through transformation pipelines
 * Integrates with HEARTBEAT for periodic polling
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class PipelineEngine {
  constructor(workspaceDir = process.env.WORKSPACE || "./") {
    this.workspaceDir = workspaceDir;
    this.pipelinesFile = path.join(workspaceDir, "pipelines.json");
    this.dataDir = path.join(workspaceDir, "data", "pipelines");
    this.logsDir = path.join(workspaceDir, "logs");
    this.pipelines = {};
    this.lastPolls = {};
    this.sourceHealth = {};
    this.initializeDirectories();
    this.loadPipelines();
  }

  initializeDirectories() {
    [this.dataDir, this.logsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadPipelines() {
    try {
      const data = fs.readFileSync(this.pipelinesFile, "utf-8");
      const config = JSON.parse(data);
      this.pipelines = config.pipelines || [];
      console.log(`✅ Loaded ${this.pipelines.length} pipelines`);
    } catch (error) {
      console.error(`❌ Failed to load pipelines: ${error.message}`);
      this.pipelines = [];
    }
  }

  /**
   * Poll all enabled pipelines
   */
  async pollAllPipelines() {
    const results = {
      timestamp: new Date().toISOString(),
      pipelinesPolled: 0,
      itemsProcessed: 0,
      errors: 0,
      pipelineResults: {},
    };

    for (const pipeline of this.pipelines) {
      if (!pipeline.enabled) continue;

      try {
        const pipelineResult = await this.pollPipeline(pipeline);
        results.pipelinesPolled++;
        results.itemsProcessed += pipelineResult.itemsProcessed;
        results.pipelineResults[pipeline.id] = pipelineResult;
      } catch (error) {
        results.errors++;
        console.error(`Pipeline ${pipeline.id} error: ${error.message}`);
      }
    }

    this.logPipelineExecution(results);
    return results;
  }

  /**
   * Poll a single pipeline
   */
  async pollPipeline(pipeline) {
    const result = {
      id: pipeline.id,
      name: pipeline.name,
      timestamp: new Date().toISOString(),
      sourcesPolled: 0,
      itemsFound: 0,
      itemsProcessed: 0,
      errors: 0,
      sourceResults: {},
    };

    for (const source of pipeline.sources) {
      try {
        const sourceData = await this.pollSource(source, pipeline.id);
        result.sourcesPolled++;
        result.itemsFound += sourceData.items.length;

        // Process items through transformation pipeline
        const processedItems = await this.transformItems(
          sourceData.items,
          pipeline.transformations,
          source.id
        );

        // Store processed items
        await this.storeItems(pipeline.id, processedItems);
        result.itemsProcessed += processedItems.length;
        result.sourceResults[source.id] = {
          status: "success",
          itemsFound: sourceData.items.length,
          itemsProcessed: processedItems.length,
        };

        // Evaluate triggers
        await this.evaluateTriggers(pipeline, processedItems);
      } catch (error) {
        result.errors++;
        result.sourceResults[source.id] = {
          status: "error",
          error: error.message,
        };
        console.error(`Source ${source.id} error: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Poll a single data source
   */
  async pollSource(source, pipelineId) {
    const items = [];

    try {
      switch (source.type) {
        case "rss":
          return await this.pollRSSSource(source);
        case "api":
          return await this.pollAPISource(source);
        case "scrape":
          return await this.pollScrapeSource(source);
        case "file":
          return await this.pollFileSource(source);
        default:
          throw new Error(`Unknown source type: ${source.type}`);
      }
    } catch (error) {
      console.error(`Error polling ${source.id}: ${error.message}`);
      return { items: [] };
    }
  }

  /**
   * Poll RSS/Atom feed
   */
  async pollRSSSource(source) {
    // Simulated RSS polling - in production would use RSS parser library
    console.log(
      `📡 Polling RSS source: ${source.id} (${source.url.substring(0, 50)}...)`
    );

    // For demo purposes, return sample items
    const items = [];

    // This would be replaced with actual RSS parsing
    if (source.id === "hackernews") {
      items.push({
        id: `hn-${Date.now()}-1`,
        guid: `hn-1`,
        title:
          "JavaScript async/await best practices for 2026 - Building scalable applications",
        link: "https://news.ycombinator.com/item?id=12345",
        pubDate: new Date().toISOString(),
        description:
          "Deep dive into modern JavaScript async patterns and how to avoid common pitfalls. Covers promises, async/await, generators, and error handling strategies.",
        author: "technews_user",
        source: "hackernews",
      });
      items.push({
        id: `hn-${Date.now()}-2`,
        guid: `hn-2`,
        title: "New React 19 features released - Improved performance and DX",
        link: "https://news.ycombinator.com/item?id=12346",
        pubDate: new Date().toISOString(),
        description:
          "React 19 introduces automatic batching, improved server components, and new hooks. Performance improvements up to 40% in some scenarios.",
        author: "react_fan",
        source: "hackernews",
      });
    }

    return { items };
  }

  /**
   * Poll HTTP API endpoint
   */
  async pollAPISource(source) {
    console.log(
      `🔌 Polling API source: ${source.id} (${source.url.substring(0, 50)}...)`
    );

    // Simulated API polling
    const items = [];

    // This would be replaced with actual HTTP request
    if (source.id === "openweathermap") {
      items.push({
        id: `weather-${Date.now()}`,
        dt: Math.floor(Date.now() / 1000),
        timestamp: new Date().toISOString(),
        temp: 15,
        feelsLike: 13,
        tempMin: 12,
        tempMax: 18,
        humidity: 65,
        pressure: 1013,
        windSpeed: 4.5,
        condition: "Cloudy",
        description: "overcast clouds",
        cloudiness: 80,
        sunrise: 1707858000,
        sunset: 1707894600,
        location: "London",
        source: "openweathermap",
      });
    }

    return { items };
  }

  /**
   * Poll webpage via scraping
   */
  async pollScrapeSource(source) {
    console.log(
      `🕷️ Scraping source: ${source.id} (${source.url.substring(0, 50)}...)`
    );

    // Simulated web scraping
    const items = [];

    // This would be replaced with actual scraping (jsdom, cheerio, etc.)
    if (source.id === "github-trending") {
      items.push({
        id: `github-${Date.now()}-1`,
        url: "https://github.com/vercel/next.js",
        name: "Next.js",
        description: "The React framework for production",
        stars: "120.5k",
        source: "github-trending",
      });
      items.push({
        id: `github-${Date.now()}-2`,
        url: "https://github.com/denoland/deno",
        name: "Deno",
        description: "A modern runtime for JavaScript and TypeScript",
        stars: "95.2k",
        source: "github-trending",
      });
    }

    return { items };
  }

  /**
   * Poll file system
   */
  async pollFileSource(source) {
    console.log(
      `📁 Watching files: ${source.id} (${source.path.substring(0, 50)}...)`
    );

    // Simulated file watching
    const items = [];

    // This would be replaced with actual file system watching
    const incomingDir = path.join(this.workspaceDir, "data", "incoming");
    if (fs.existsSync(incomingDir)) {
      const files = fs.readdirSync(incomingDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(incomingDir, file);
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          items.push({
            id: content.id || file,
            filename: file,
            timestamp: new Date(fs.statSync(filePath).mtime).toISOString(),
            type: content.type || "generic",
            data: content,
            source: source.id,
          });
        }
      }
    }

    return { items };
  }

  /**
   * Transform items through the pipeline
   */
  async transformItems(items, transformations, sourceId) {
    let data = items;

    for (const transform of transformations || []) {
      switch (transform.type) {
        case "extract":
          data = this.extractFields(data, transform.fields);
          break;
        case "enrich":
          data = await this.enrichItems(data, transform.enrichments);
          break;
        case "filter":
          data = this.filterItems(data, transform.condition);
          break;
        case "deduplicate":
          data = this.deduplicateItems(data, transform.fields || sourceId);
          break;
      }
    }

    return data;
  }

  /**
   * Extract specific fields from items
   */
  extractFields(items, fieldMapping) {
    return items.map((item) => {
      const extracted = { source: item.source || "unknown" };
      for (const [key, path] of Object.entries(fieldMapping)) {
        extracted[key] = this.getValueByPath(item, path);
      }
      return extracted;
    });
  }

  /**
   * Get value from object by path (supports JSONPath-like syntax)
   */
  getValueByPath(obj, path) {
    if (path === "source") return obj.source;
    if (!path.startsWith("$")) return obj[path];

    const parts = path.replace("$.", "").split(".");
    let value = obj;
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  }

  /**
   * Enrich items with additional data
   */
  async enrichItems(items, enrichments) {
    return items.map((item) => {
      for (const enrichment of enrichments || []) {
        if (enrichment.type === "keyword_match") {
          item[enrichment.name] = this.scoreKeywordRelevance(
            item,
            enrichment
          );
        } else if (enrichment.type === "rule_based") {
          item[enrichment.name] = this.applyRuleBasedEnrichment(
            item,
            enrichment
          );
        } else if (enrichment.type === "threshold") {
          item[enrichment.name] = this.applyThresholdEnrichment(
            item,
            enrichment
          );
        }
      }
      return item;
    });
  }

  /**
   * Score items by keyword relevance
   */
  scoreKeywordRelevance(item, enrichment) {
    const keywords = enrichment.keywords || [];
    const fields = enrichment.fields || ["title", "description"];
    let score = 0;

    for (const field of fields) {
      const text = (item[field] || "").toLowerCase();
      const fieldWeight = enrichment.weights?.[`${field}_match`] || 1.0;

      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += fieldWeight;
        }
      }
    }

    const maxPossible = keywords.length * (enrichment.weights?.multi_keyword || 1.5);
    return Math.min(score / maxPossible, 1.0); // Normalize to 0-1
  }

  /**
   * Apply rule-based enrichment
   */
  applyRuleBasedEnrichment(item, enrichment) {
    const field = item[enrichment.field] || "";
    for (const rule of enrichment.rules || []) {
      if (new RegExp(rule.pattern, "i").test(field)) {
        return rule.value;
      }
    }
    return null;
  }

  /**
   * Apply threshold-based enrichment
   */
  applyThresholdEnrichment(item, enrichment) {
    const value = item[enrichment.field];
    for (const rule of enrichment.rules || []) {
      if (this.evaluateCondition(value, rule.condition)) {
        return rule.alert;
      }
    }
    return "normal";
  }

  /**
   * Evaluate a condition against a value
   */
  evaluateCondition(value, condition) {
    // Simple condition evaluation: "< 0", "> 30", "between X and Y"
    if (condition.startsWith("temp <")) {
      return value < parseInt(condition.split("<")[1]);
    } else if (condition.startsWith("temp >")) {
      return value > parseInt(condition.split(">")[1]);
    } else if (condition.includes("between")) {
      const parts = condition.match(/between (\d+) and (\d+)/);
      if (parts) {
        const min = parseInt(parts[1]);
        const max = parseInt(parts[2]);
        return value >= min && value <= max;
      }
    }
    return false;
  }

  /**
   * Filter items by condition
   */
  filterItems(items, condition) {
    return items.filter((item) => {
      try {
        return eval(`(${condition})`);
      } catch (error) {
        console.error(`Filter condition failed: ${error.message}`);
        return false;
      }
    });
  }

  /**
   * Deduplicate items
   */
  deduplicateItems(items, fields) {
    const seen = new Set();
    const deduplicated = [];

    for (const item of items) {
      // Create hash from specified fields
      const hash = this.hashItem(item, fields);
      if (!seen.has(hash)) {
        seen.add(hash);
        deduplicated.push(item);
      }
    }

    return deduplicated;
  }

  /**
   * Create hash for deduplication
   */
  hashItem(item, fields) {
    const values = [];
    if (typeof fields === "string") {
      values.push(item[fields] || item.id || "");
    } else if (Array.isArray(fields)) {
      for (const field of fields) {
        values.push(item[field] || "");
      }
    }

    const str = values.join("|");
    return crypto.createHash("md5").update(str).digest("hex");
  }

  /**
   * Store processed items
   */
  async storeItems(pipelineId, items) {
    if (!items || items.length === 0) return;

    const pipelineDir = path.join(this.dataDir, pipelineId);
    if (!fs.existsSync(pipelineDir)) {
      fs.mkdirSync(pipelineDir, { recursive: true });
    }

    const currentFile = path.join(pipelineDir, "current.jsonl");

    // Append items in JSONL format
    const jsonlLines = items
      .map((item) =>
        JSON.stringify({
          ...item,
          _storedAt: new Date().toISOString(),
        })
      )
      .join("\n");

    fs.appendFileSync(currentFile, jsonlLines + "\n");

    // Update index
    const indexFile = path.join(pipelineDir, "index.json");
    const index = JSON.parse(
      fs.existsSync(indexFile) ? fs.readFileSync(indexFile, "utf-8") : "{}"
    );
    index.lastUpdate = new Date().toISOString();
    index.totalItems = (index.totalItems || 0) + items.length;
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  }

  /**
   * Evaluate triggers based on pipeline data
   */
  async evaluateTriggers(pipeline, items) {
    for (const trigger of pipeline.triggers || []) {
      for (const item of items) {
        try {
          if (eval(`(${trigger.condition})`)) {
            console.log(
              `🔔 Trigger fired: ${trigger.name} (${trigger.id})`
            );
            // Trigger actions would be executed here
            // This integrates with the triggers system
          }
        } catch (error) {
          console.error(
            `Trigger evaluation failed: ${trigger.id} - ${error.message}`
          );
        }
      }
    }
  }

  /**
   * Get pipeline data with filtering
   */
  getPipelineData(pipelineId, filters = {}) {
    const pipelineDir = path.join(this.dataDir, pipelineId);
    const currentFile = path.join(pipelineDir, "current.jsonl");

    if (!fs.existsSync(currentFile)) {
      return [];
    }

    const lines = fs
      .readFileSync(currentFile, "utf-8")
      .split("\n")
      .filter((line) => line.trim());

    let items = lines.map((line) => JSON.parse(line));

    // Apply filters
    if (filters.keyword) {
      items = items.filter(
        (item) =>
          JSON.stringify(item).toLowerCase().includes(filters.keyword) ||
          false
      );
    }
    if (filters.minScore !== undefined) {
      items = items.filter((item) => (item.score || 0) >= filters.minScore);
    }
    if (filters.limit) {
      items = items.slice(0, filters.limit);
    }

    return items;
  }

  /**
   * Check pipeline health status
   */
  checkPipelineHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      overall: "operational",
      pipelines: {},
    };

    for (const pipeline of this.pipelines) {
      const pipelineDir = path.join(this.dataDir, pipeline.id);
      const indexFile = path.join(pipelineDir, "index.json");

      let pipelineHealth = {
        enabled: pipeline.enabled,
        sources: pipeline.sources.length,
        lastUpdate: null,
        itemCount: 0,
        status: "pending",
      };

      if (fs.existsSync(indexFile)) {
        const index = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
        pipelineHealth.lastUpdate = index.lastUpdate;
        pipelineHealth.itemCount = index.totalItems || 0;
        pipelineHealth.status = "healthy";
      }

      health.pipelines[pipeline.id] = pipelineHealth;
    }

    return health;
  }

  /**
   * Log pipeline execution
   */
  logPipelineExecution(results) {
    const logFile = path.join(this.logsDir, "pipelines.log");
    const logEntry =
      `[${results.timestamp}] Polled ${results.pipelinesPolled} pipelines, processed ${results.itemsProcessed} items, ${results.errors} errors\n`;

    fs.appendFileSync(logFile, logEntry);

    // Also update metrics file
    const metricsFile = path.join(this.logsDir, "pipelines-metrics.json");
    const metrics = fs.existsSync(metricsFile)
      ? JSON.parse(fs.readFileSync(metricsFile, "utf-8"))
      : { executions: [] };

    metrics.executions = metrics.executions || [];
    metrics.executions.push(results);

    // Keep last 100 executions
    if (metrics.executions.length > 100) {
      metrics.executions = metrics.executions.slice(-100);
    }

    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
  }
}

// Export for use in skills
module.exports = PipelineEngine;

// CLI usage for testing
if (require.main === module) {
  const engine = new PipelineEngine(process.env.WORKSPACE || "./");

  engine
    .pollAllPipelines()
    .then((results) => {
      console.log("\n✅ Pipeline polling complete:");
      console.log(JSON.stringify(results, null, 2));

      const health = engine.checkPipelineHealth();
      console.log("\n🏥 Pipeline Health:");
      console.log(JSON.stringify(health, null, 2));
    })
    .catch((error) => {
      console.error("❌ Pipeline error:", error);
    });
}
