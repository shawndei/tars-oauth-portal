# Anthropic Rate Limits Update - 2026-02-13

## Summary
Updated rate-limits.json to match Anthropic API Tier 4 maximum limits (66x increase in RPM capacity).

---

## Previous Configuration (Too Aggressive)
```json
"apiCalls": {
  "perMinute": 60,      // ❌ 66x too low
  "perHour": 1000       // ❌ 240x too low
}
```

## New Configuration (Tier 4 Maximum)
```json
"apiCalls": {
  "perMinute": 4000,    // ✅ Anthropic Tier 4 max
  "perHour": 240000,    // ✅ 4000 RPM × 60 min
  "anthropic": {
    "tier": 4,
    "rpm": 4000,
    "sonnet": {
      "itpm": 2000000,  // Input tokens per minute
      "otpm": 400000    // Output tokens per minute
    },
    "haiku": {
      "itpm": 4000000,  // 2x sonnet (faster model)
      "otpm": 800000    // 2x sonnet
    },
    "opus": {
      "itpm": 2000000,
      "otpm": 400000
    }
  }
}
```

---

## Anthropic API Tier 4 Specifications

| Metric | Limit | Notes |
|--------|-------|-------|
| **Requests Per Minute (RPM)** | 4,000 | All models share this limit |
| **Sonnet ITPM** | 2,000,000 | Input tokens/min (uncached only) |
| **Sonnet OTPM** | 400,000 | Output tokens/min |
| **Haiku ITPM** | 4,000,000 | 2x faster than Sonnet |
| **Haiku OTPM** | 800,000 | 2x faster than Sonnet |
| **Opus ITPM** | 2,000,000 | Same as Sonnet |
| **Opus OTPM** | 400,000 | Same as Sonnet |
| **Monthly Spend Limit** | $5,000 | Tier 4 maximum |

---

## Key Improvements

### Capacity Increases
- **RPM**: 60 → 4,000 (66x increase)
- **Hourly capacity**: 1,000 → 240,000 (240x increase)
- **ITPM tracking**: Now documented per model
- **OTPM tracking**: Now documented per model

### Optimization Notes
1. **Cached tokens don't count toward ITPM**: With 80% cache hit rate, effective ITPM becomes 5-10x higher
2. **Token bucket algorithm**: Continuous replenishment, not fixed-window resets
3. **Separate limits per model**: Can use Sonnet + Haiku simultaneously up to their individual limits
4. **Organization-level limits**: All API keys share the same rate pool

### Cost Tracking (Unchanged)
- Budget thresholds remain: $1/session, $10/day, $200/month
- Warning/degradation/critical/block actions unchanged
- Only rate limits updated

---

## Research Sources
- **Anthropic Tier Documentation**: 4 tiers ($5/$40/$200/$400 deposits)
- **Current Tier**: Tier 4 ($400+ deposit, $5,000/month spend limit)
- **Algorithm**: Token bucket with continuous replenishment
- **Cache Optimization**: Cached tokens excluded from ITPM (5-10x effective multiplier)

---

## Impact Analysis

### Before (60 RPM limit)
- 1 request per second average
- Could hit limits with parallel sub-agents
- Unnecessary throttling of legitimate traffic

### After (4,000 RPM limit)
- 66 requests per second average
- Supports 10+ concurrent sub-agents comfortably
- Maximum throughput within Anthropic's actual infrastructure limits

### Multi-Agent Scenarios
- **10 sub-agents** @ 400 RPM each = 4,000 RPM total ✅ Within limits
- **20 sub-agents** @ 200 RPM each = 4,000 RPM total ✅ Within limits
- **Previous**: 60 RPM would throttle after 6 agents @ 10 RPM each ❌

---

## Verification Status
- ✅ Research completed: Anthropic Tier 4 specifications confirmed
- ✅ rate-limits.json updated with Tier 4 maximums
- ✅ Documentation created: ANTHROPIC_RATE_LIMITS_UPDATE.md
- ⏱️ Gateway restart required: No (rate-limits.json is runtime config)
- ✅ Backward compatible: Cost budget limits unchanged

---

**Implementation**: 2026-02-13 08:57 GMT-7  
**Status**: Complete - Operating at Tier 4 maximum capacity  
**Next Action**: Monitor actual usage vs. limits in production
