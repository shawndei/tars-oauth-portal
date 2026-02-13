# data-pipeline - Project Memory

## Project Overview
Customer analytics data pipeline - ETL system for processing customer behavior data.

## Vision
Build a scalable, automated data pipeline that ingests customer event data, processes it, and generates actionable analytics for marketing and product teams.

## Key Decisions
- **ETL Tool:** Apache Airflow
  - Rationale: Complex workflows, scheduling, monitoring, large community
  - Alternative considered: Prefect (good but less mature in our org)
  
- **Data Lake:** AWS S3
  - Staging data in S3, processing with Spark/Python
  - Cost-effective, scalable, integrates with other AWS services
  
- **Processing Engine:** PySpark
  - Distributed processing for large datasets (500GB+ daily)
  - Better than Pandas for this scale
  
- **Analytics Database:** Redshift
  - OLAP-optimized for analytics queries
  - SQL familiar to stakeholders
  - Alternative: Snowflake (rejected due to cost, Redshift negotiated pricing)
  
- **Orchestration:** Airflow DAGs
  - Scheduled daily runs
  - Dependency management
  - Error alerting

## Architecture Notes

### Data Flow
```
Event Sources (API, Client Events)
      ↓
   Kafka Queue (real-time ingestion)
      ↓
   AWS Lambda (event processing)
      ↓
   S3 (raw data staging)
      ↓
   Airflow Scheduler
      ↓
   PySpark (ETL transformations)
      ↓
   Data Cleaning + Enrichment
      ↓
   Redshift (analytical database)
      ↓
   BI Tools (Tableau, custom dashboards)
```

### Current Bottlenecks
- **Ingestion:** 100K events/sec, but bursts to 500K during peak
- **Processing:** Spark jobs taking 4+ hours (need optimization)
- **Query Performance:** Redshift queries slow on large time-window queries

### Optimization Opportunities
- Partition S3 data by date/hour (reduce scan time)
- Implement data deduplication earlier (reduce processing volume)
- Use Redshift materialized views for common queries
- Implement incremental loads (not full reload each day)

## Important Findings

### Data Quality Issues
- 15% of events are duplicates (Kafka at-least-once semantics)
- 3% have incomplete user_id fields
- Customer ID mapping inconsistent between systems
- Timestamps in different timezones (UTC vs local)

### Performance Insights
- Peak hours: 7-9 AM, 2-4 PM (plan resources)
- Average event size: 2KB (affects bandwidth planning)
- Query patterns: 80% time-series, 15% cohort analysis, 5% raw events
- Most queries on last 30 days of data (archive older data separately)

### User Expectations
- Marketing wants daily dashboards updated by 8 AM
- Product team wants real-time event inspection for debugging
- Finance wants historical data for 2 years (compliance)
- Data is sensitive (PII, financial) - compliance required

## Blockers & Resolutions

### 1. AWS Account Access
**Blocker:** Team didn't have S3/Redshift access permissions
**Resolution:** Filed with IT, got approved after 2-week review
**Status:** Resolved - full access now

### 2. Data Format Inconsistency
**Blocker:** Events from old system use different schema than new system
**Resolution:** Created schema migration layer in ETL
**Status:** In Progress - 70% of data mapped

### 3. Cost Control
**Blocker:** Early tests showed $50K/month AWS costs
**Resolution:** 
- Implement data retention policies (delete raw data after 30 days)
- Use S3 Intelligent-Tiering
- Negotiate Redshift pricing with AWS
**Status:** Resolved - reduced to $12K/month

## Stakeholders
- **Analytics Lead:** Tom Harrison (tom@company.com)
- **Data Engineer:** You (data@company.com)
- **Product Manager:** Lisa Park (lisa@company.com)
- **Finance:** Robert Grant (compliance@company.com)
- **IT Ops:** DevOps team (for infrastructure)

## Technical Debt
- Airflow DAGs not properly tested (need pytest)
- No data validation framework (need Great Expectations)
- Limited monitoring/alerting (basic CloudWatch only)
- Documentation incomplete (only README, no runbooks)

## Current Progress
- [x] Architecture design & approval (2026-01-15)
- [x] AWS infrastructure setup (2026-02-01)
- [x] Kafka ingestion layer (2026-02-08)
- [ ] S3 data staging (ETA: 2026-02-15)
- [ ] Airflow DAG development (ETA: 2026-02-22)
- [ ] PySpark ETL transforms (ETA: 2026-03-01)
- [ ] Redshift load & optimization (ETA: 2026-03-08)
- [ ] BI dashboard creation (ETA: 2026-03-15)
- [ ] Production launch (ETA: 2026-03-22)

## Dependencies
- Requires Kafka cluster (shared infrastructure)
- Depends on Event API schema stability (product team)
- Needs customer mapping database from operations
- Finance approval on data retention policies

---
*Project-specific long-term memory. Isolated to this project when active.*
