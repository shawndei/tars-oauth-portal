# Data Analytics & Business Intelligence Skill

**Version:** 1.0.0  
**Status:** Active  
**Purpose:** Enable comprehensive data analysis, visualization, and business insight generation

## Overview

The Data Analytics skill provides tools and functions for:
- Parsing and aggregating CSV/JSON data
- Statistical analysis and trend detection
- Anomaly detection and alerting
- Text-based visualization (ASCII charts, formatted tables)
- Business metrics and cost analysis
- Performance analytics and usage tracking

## Capabilities

### 1. Data Operations

#### CSV/JSON Parsing
```
parse_csv(filepath, options)
parse_json(filepath, options)
```
- Load and validate data from files
- Handle missing values and type inference
- Support streaming for large files
- Options: {headers, delimiter, encoding, skipEmpty}

#### Data Aggregation
```
aggregate_data(data, groupBy, metrics)
```
- Group by time period (hourly, daily, weekly, monthly)
- Group by category/dimension
- Calculate aggregates: sum, avg, min, max, count
- Support multiple metrics in single operation

#### Statistical Analysis
```
calculate_statistics(dataset)
```
- Descriptive stats: mean, median, mode, std dev, variance
- Percentiles (25th, 50th, 75th, 90th, 95th, 99th)
- Distribution analysis
- Correlation matrices

#### Trend Detection
```
detect_trends(timeseries, window)
```
- Moving averages (simple, weighted, exponential)
- Trend direction (upward, downward, stable)
- Change point detection
- Seasonality detection
- Growth rate calculation

#### Anomaly Detection
```
detect_anomalies(dataset, method, threshold)
```
- Statistical methods: Z-score, IQR (Interquartile Range)
- Moving average deviation
- Threshold-based alerts
- Context-aware anomaly flagging

### 2. Text-Based Visualization

#### ASCII Charts
```
plot_chart(data, type, options)
```
- Line charts: `▁▂▃▄▅▆▇█` blocks
- Bar charts: horizontal/vertical
- Trend arrows: `↗ ↘ → ⟷`
- Spark lines: inline data visualization
- Options: {width, height, title, labels, colors}

#### Formatted Tables
```
format_table(data, columns, options)
```
- ASCII table formatting with borders
- Column alignment and width management
- Header highlighting
- Row coloring based on values (e.g., red for negative)
- Sortable columns
- Options: {format, borders, align, maxRows}

#### Trend Indicators
```
generate_trend_indicator(current, previous, metric)
```
- Percentage change: `+12.5%` / `-8.3%`
- Trend arrows: `📈 📉 ➡️`
- Status badges: `●` color-coded
- Sparklines for recent history
- Comparison to baseline/target

### 3. Business Metrics

#### Cost Analysis
```
analyze_costs(data, groupBy, compareWith)
```
- Daily/weekly/monthly cost breakdowns
- Cost per session, per model, per API call
- Budget tracking and alerts
- Cost trends and projections
- Cost optimization recommendations

**Metrics:**
- Total cost, average daily cost
- Cost per token, cost per API call
- Cost distribution by session/model
- Projected monthly cost
- Budget variance

#### Performance Metrics
```
analyze_performance(sessionData)
```
- Token efficiency (tokens per API call)
- Response time analytics
- Error rates and recovery patterns
- API call frequency and patterns
- Model performance comparison

#### Usage Analytics
```
analyze_usage(data, dimensions)
```
- Daily/hourly usage patterns
- Peak usage times
- Session duration distribution
- API call distribution by type
- User/agent activity patterns

### 4. Workflow Functions

#### Data Pipeline
```
run_data_pipeline(config)
```
1. Load data from source (file, API, database)
2. Validate and clean data
3. Apply transformations
4. Generate calculations
5. Create visualizations
6. Export results

#### Report Generation
```
generate_report(data, reportType, options)
```
- Summary reports
- Detailed analysis reports
- Cost reports
- Performance reports
- Custom reports with selected metrics

#### Export Functions
```
export_data(data, format, filepath)
```
- CSV export
- JSON export
- Markdown tables
- Text summaries

## Configuration

See `analytics-config.json` for:
- Data source locations
- Analysis parameters
- Visualization settings
- Alert thresholds
- Report schedules

## Usage Examples

### Cost Analysis
```javascript
const costs = parseJSON('costs.json');
const dailyAnalysis = aggregateData(costs, 'date', ['cost', 'tokens', 'apiCalls']);
const trends = detectTrends(dailyAnalysis.cost, 7); // 7-day moving avg
const chart = plotChart(dailyAnalysis.cost, 'line', {width: 80, title: 'Daily Costs'});
const anomalies = detectAnomalies(dailyAnalysis.cost, 'zscore', 2.0);
```

### Performance Metrics
```javascript
const sessions = costs.sessions;
const perf = {
  tokenEfficiency: sessions.tokens / sessions.apiCalls,
  costPerToken: sessions.cost / sessions.tokens,
  avgSessionDuration: calculateStatistics(sessions.duration).mean
};
const report = generateReport(perf, 'performance');
```

### Visualization
```javascript
const hourlyData = costs.perHour;
const table = formatTable(hourlyData, ['hour', 'cost', 'tokens', 'apiCalls']);
const sparkline = plotChart(hourlyData, 'sparkline', {title: 'Hourly Trend'});
```

## Data Structures

### Cost Data Format
```json
{
  "YYYY-MM-DD": {
    "daily": {
      "cost": number,
      "tokens": number,
      "apiCalls": number,
      "timestamp": "ISO-8601"
    },
    "sessions": {
      "sessionId": {
        "cost": number,
        "tokens": number,
        "apiCalls": number,
        "model": string,
        "startTime": "ISO-8601",
        "endTime": "ISO-8601"
      }
    },
    "perHour": {
      "HH": {
        "cost": number,
        "tokens": number,
        "apiCalls": number
      }
    }
  },
  "summary": {
    "totalCost": number,
    "totalTokens": number,
    "totalApiCalls": number,
    "averageDailyCost": number,
    "projectedMonthlyAtCurrentRate": number,
    "monthlyBudget": number,
    "status": "string"
  }
}
```

## Alert Conditions

- **Cost Alert:** Daily cost exceeds budget threshold
- **Anomaly Alert:** Data point deviates >2σ from mean
- **Trend Alert:** Sustained trend change detected
- **Usage Alert:** Peak usage exceeds configured limits

## Integration Points

- **File System:** Read CSV/JSON from workspace
- **Messaging:** Send reports via message tool
- **Visualization:** Display in terminal/logs
- **Configuration:** Load from analytics-config.json

## Error Handling

- Invalid data format: Return error with data validation report
- Missing fields: Fill with defaults or skip row
- Division by zero: Handle gracefully with fallback values
- Time zone issues: Normalize to UTC for analysis

## Performance Constraints

- Process files up to 100MB efficiently
- Calculate statistics in <1s for typical datasets
- Generate visualizations in <500ms
- Batch anomaly detection for efficiency

## Testing

See `/tests/data-analytics/` for test suites:
- `test-parsing.js` - CSV/JSON parsing
- `test-aggregation.js` - Data aggregation
- `test-statistics.js` - Statistical calculations
- `test-visualization.js` - ASCII chart rendering
- `test-anomalies.js` - Anomaly detection
- `test-costs.js` - Cost analysis with real data

## Future Enhancements

- [ ] SQL database integration
- [ ] Machine learning for predictive analysis
- [ ] Real-time streaming analysis
- [ ] Advanced forecasting models
- [ ] Integration with visualization tools
- [ ] Custom alert rules engine
- [ ] Data export to BI tools (Power BI, Tableau)
- [ ] API endpoints for analytics queries
