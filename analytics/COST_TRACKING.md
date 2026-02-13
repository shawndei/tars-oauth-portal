# Cost Tracking & Budget Management

## Overview
Real-time tracking of API costs with automatic budget alerts.

---

## Budget Configuration

**Current Budgets:**
- Daily: $10
- Weekly: $50
- Monthly: $200

Update in `analytics/costs.json`

---

## Cost Calculation

**Model Pricing (per 1M tokens):**
- claude-sonnet-4-5: $15 input / $75 output
- claude-haiku-4-5: $1 input / $5 output
- claude-opus-4-5: $75 input / $375 output
- OpenAI embeddings: $0.13 input

**Formula:**
```
cost = (input_tokens / 1_000_000 * input_price) + 
       (output_tokens / 1_000_000 * output_price)
```

---

## Tracking Mechanism

**Data Source:** session_status tool provides token counts  
**Frequency:** After every session (via session-memory hook)  
**Storage:** `analytics/costs.json`

**Entry Format:**
```json
{
  "timestamp": "2026-02-12T21:58:00Z",
  "session_key": "agent:main:main",
  "model": "claude-sonnet-4-5",
  "input_tokens": 56,
  "output_tokens": 8900,
  "estimated_cost": 0.670,
  "task_type": "research"
}
```

---

## Budget Alerts

**Trigger Conditions:**
- 80% of daily budget reached → Warning
- 100% of daily budget reached → Alert
- 90% of weekly budget reached → Weekly report
- 100% of monthly budget reached → Critical alert

**Alert Actions:**
1. Log to `logs/budget_alerts.log`
2. Notify user immediately
3. Suggest cost-saving measures (use haiku, reduce verbosity)

---

## Cost Optimization Recommendations

**High Cost Detected:**
- Use haiku for sub-agents (93% savings)
- Enable context compression
- Reduce verbose logging
- Cache frequent queries

**Model Selection:**
- haiku: Fast tasks, research, simple queries
- sonnet: Complex reasoning, writing, analysis
- opus: Mission-critical, highest quality needed

---

## Reports

**Daily Summary:** Run at end of day (via HEARTBEAT)
**Weekly Summary:** Run Monday 9 AM
**Monthly Summary:** Run 1st of month

Generate reports in `analytics/reports/YYYY-MM-DD.md`
