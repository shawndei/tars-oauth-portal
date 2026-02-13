# Customer Analytics Data Pipeline

> Project initialized on 2026-02-13

## Quick Overview
Building a scalable ETL data pipeline to process customer behavior data from multiple sources, transform it, and load into Redshift for analytics. Focus on real-time processing with Apache Airflow orchestration.

## Goals
- Process 10M+ events per day
- Real-time data ingestion from 5+ sources
- 99.9% pipeline uptime
- Sub-5-minute data freshness for dashboards
- Automated data quality validation

## Technology Stack
- **Orchestration:** Apache Airflow 2.5
- **Processing:** PySpark, pandas
- **Storage:** AWS S3 (data lake), Redshift (warehouse)
- **Streaming:** Apache Kafka
- **Quality:** Great Expectations
- **Infrastructure:** Docker, Kubernetes

## Getting Started
1. Read MEMORY.md for architecture decisions and ETL design
2. Check tasks.md for current development tasks
3. See CONTEXT.md for pipeline status and blockers

## File Organization
- **files/data/raw/** - Raw data samples and schemas
- **files/data/processed/** - Processed data examples
- **files/notebooks/** - Jupyter notebooks for analysis
- **files/analysis/** - Data quality reports and metrics
- **MEMORY.md** - Long-term project notes and learnings
- **CONTEXT.md** - Current pipeline state
- **tasks.md** - Development tasks and roadmap

## Team
- Tom Harrison - Analytics Lead
- Lisa Park - Product Manager
- David Chen - Data Engineer (Airflow)
- Sarah Johnson - DevOps Engineer

## Architecture
```
[Web/Mobile Apps] → [Kafka] → [S3 Staging] → [Spark ETL] → [Redshift]
                                    ↓
                              [Great Expectations]
                                    ↓
                              [Airflow DAGs]
```

## Data Sources
1. Web clickstream (Google Analytics)
2. Mobile app events (Firebase)
3. CRM data (Salesforce)
4. Transaction data (Postgres)
5. Support tickets (Zendesk)

## Links
- [Airflow UI](http://airflow.internal/dags)
- [Redshift Dashboard](http://analytics.internal/dashboard)
- [Data Quality Reports](./files/analysis/quality/)

## Current Status
- **Phase:** Infrastructure Setup
- **Progress:** 35% complete
- **Sprint:** 3-week sprint (Week 2)
- **Priority:** High - Q1 2026 Analytics Initiative

---
*For project commands: `projects switch data-pipeline`, `projects status`*
