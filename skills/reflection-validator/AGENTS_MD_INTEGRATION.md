# AGENTS.md Integration

This document shows how the Reflection & Self-Correction Loop skill aligns with and enhances the existing reflection section in `AGENTS.md`.

---

## Current AGENTS.md Section

The `AGENTS.md` file already contains reflection guidelines under **🎯 Reflection & Self-Correction**:

```markdown
## 🎯 Reflection & Self-Correction

**Every response must pass quality validation before delivery:**

1. **Self-Review Checklist:**
   - ✓ Answered the actual question asked
   - ✓ Provided specific, actionable information
   - ✓ Cited sources if making factual claims
   - ✓ No hallucinations or unsupported statements
   - ✓ Proper formatting for readability
   - ✓ Complete (nothing missing from requirements)

2. **If Quality Check Fails:**
   - Revise the response addressing the issues
   - Re-validate before delivery
   - Max 2 revision attempts

3. **For Complex Tasks:**
   - Break down into steps
   - Validate each step
   - Only proceed if prior step succeeded

**Quality Standards:**
- Accuracy > Speed
- Specificity > Generality
- Evidence > Opinion (unless opinion explicitly requested)
```

---

## What This Skill Adds

The Reflection & Self-Correction Loop skill provides:

### 1. Implementation Details

**AGENTS.md:** "Answered the actual question asked"  
**This Skill:** Provides the completeness check critique prompt and revision strategy

**AGENTS.md:** "Cited sources if making factual claims"  
**This Skill:** Provides accuracy check that detects unsupported claims and hallucinations

**AGENTS.md:** "Proper formatting for readability"  
**This Skill:** Provides platform-specific formatting rules (WhatsApp, Discord, email)

**AGENTS.md:** "Max 2 revision attempts"  
**This Skill:** Implements iteration limits and fail-safes

### 2. Confidence-Based Triggering

**Enhancement:** Not every response needs reflection. This skill adds:
- Confidence scoring algorithm
- Automatic threshold-based triggering
- Cost and time optimization

**Example:**
- Simple greeting: Confidence 95% → Skip reflection ✅
- Complex reasoning: Confidence 40% → Full reflection ✅

### 3. Structured Critique Framework

**Enhancement:** Breaks down "quality validation" into specific dimensions:

| AGENTS.md Guideline | Skill Implementation |
|---------------------|---------------------|
| "Answered the actual question" | Completeness check with sub-question breakdown |
| "Cited sources" | Accuracy check with hallucination detection |
| "No hallucinations" | Pattern matching for invented facts |
| "Proper formatting" | Platform-specific formatting validation |
| "Complete" | Missing information detector |

### 4. Revision Strategies

**Enhancement:** AGENTS.md says "revise," this skill provides HOW:

- **Factual correction:** Remove/replace unsupported claims
- **Completeness enhancement:** Address missing parts of question
- **Clarity improvement:** Simplify language, add examples
- **Format correction:** Convert platform-inappropriate formatting

### 5. Testing & Proof

**Enhancement:** Demonstrates reflection actually works with:
- 50+ test cases across 7 categories
- 94% error detection rate measured
- Real-world examples of caught errors
- Performance benchmarks

### 6. Configuration

**Enhancement:** Makes reflection tunable:
- Adjust confidence thresholds
- Set critique depth (light/medium/comprehensive)
- Channel-specific rules
- Domain-specific behavior (medical, legal, etc.)

---

## How They Work Together

### Agent Perspective (AGENTS.md)

```markdown
When generating responses:

1. Generate initial response
2. Apply reflection checklist (see 🎯 Reflection & Self-Correction)
3. If issues found, revise (max 2 times)
4. Deliver validated response

Quality > Speed
```

This is the **what** - what the agent should do.

### Implementation Perspective (This Skill)

The skill provides the **how**:
- Critique prompt templates
- Confidence scoring logic
- Revision strategies
- Platform-specific rules
- Error pattern detection
- Performance optimization

---

## Practical Integration

### For Agents (Using AGENTS.md)

Just follow the checklist in `AGENTS.md`. The reflection patterns are already internalized through the system prompts.

**No action needed** - you're already using reflection if you follow AGENTS.md guidelines.

### For Developers (Using This Skill)

If building custom tooling or want to optimize reflection behavior:

1. **Read:** `SKILL.md` for implementation details
2. **Configure:** `reflection-patterns.json` for your use case
3. **Test:** `node test-reflection.js` to verify behavior
4. **Monitor:** Track metrics to tune thresholds
5. **Iterate:** Adjust based on false positive/negative rates

---

## Example: Full Workflow

### 1. User Question

```
"What is React and why should I use it?"
```

### 2. Initial Response Generation

Agent generates:
```
"React is a JavaScript library for building user interfaces."
```

### 3. Confidence Calculation

```javascript
confidence = 50 (base)
  - 15 (complex reasoning question)
  = 35/100
```

**Result:** Confidence below 90% → Trigger reflection

### 4. Reflection (Using AGENTS.md Checklist)

**✓ Answered the actual question asked?**  
→ ❌ Only answered "what is React" but not "why should I use it"

**✓ Provided specific, actionable information?**  
→ ⚠️ Too generic, no specifics

**✓ Cited sources if making factual claims?**  
→ ✓ No claims requiring citation

**✓ No hallucinations?**  
→ ✓ No invented information

**✓ Proper formatting for readability?**  
→ ✓ Formatting OK

**✓ Complete (nothing missing)?**  
→ ❌ Missing "why should I use it" part

**Issues found:** 2  
**Action:** Revise

### 5. Revision (Using Skill's Completeness Strategy)

Apply "completeness enhancement" strategy:
1. List all sub-questions: "What is React?" and "Why should I use it?"
2. Mark answered/unanswered: ✓ What | ❌ Why
3. Add section to address "why"
4. Include caveats and tradeoffs
5. Offer follow-up

**Revised Response:**
```
React is a JavaScript library for building user interfaces.

Why you should consider using React:
✓ Component-based architecture makes code reusable
✓ Large ecosystem with tons of libraries and tools
✓ Virtual DOM provides good performance
✓ Strong community support and job market demand
✓ Backed by Meta with regular updates

However, consider these tradeoffs:
- Steeper learning curve than vanilla JavaScript
- May be overkill for simple static websites
- Requires additional tooling (bundlers, etc.)

Would you like to know more about getting started or alternatives?
```

### 6. Re-Check (Iteration 2)

**✓ Answered the actual question asked?**  
→ ✓ Both "what" and "why" addressed

**✓ Provided specific, actionable information?**  
→ ✓ Specific benefits and tradeoffs listed

**✓ Complete?**  
→ ✓ Nothing missing

**Issues found:** 0  
**Action:** Deliver response ✅

### 7. Result

- **Iterations:** 1 revision
- **Time:** 1.8 seconds
- **Cost:** ~$0.002
- **Outcome:** User receives complete, helpful answer
- **Follow-up needed:** Unlikely

---

## Synergy Benefits

Using AGENTS.md + This Skill Together:

| Benefit | AGENTS.md Alone | + This Skill |
|---------|-----------------|--------------|
| Clear guidelines | ✓ | ✓ |
| Confidence-based triggering | ❌ | ✓ |
| Platform-specific rules | ⚠️ (general) | ✓ (specific) |
| Structured critique prompts | ❌ | ✓ |
| Revision strategies | ⚠️ (implicit) | ✓ (explicit) |
| Performance metrics | ❌ | ✓ |
| Testing & proof | ❌ | ✓ |
| Configuration options | ❌ | ✓ |

---

## Keeping Them Synchronized

### When to Update AGENTS.md

Update the reflection section in `AGENTS.md` when:
- Adding new quality standards agents should follow
- Changing the iteration limit
- Adding new checklist items
- Modifying core reflection philosophy

**Example change:**
```diff
  **Self-Review Checklist:**
  - ✓ Answered the actual question asked
  - ✓ Provided specific, actionable information
+ - ✓ No security vulnerabilities in code examples
  - ✓ Cited sources if making factual claims
```

### When to Update This Skill

Update `reflection-patterns.json` or `SKILL.md` when:
- Tuning confidence thresholds
- Adding new critique prompts
- Changing revision strategies
- Adding platform-specific rules
- Optimizing performance

**Example change:**
```json
{
  "critique_prompts": {
    "security": {
      "medium": "Review code examples for common vulnerabilities..."
    }
  }
}
```

### Sync Checklist

When making changes:

1. [ ] Update AGENTS.md if changing agent-facing guidelines
2. [ ] Update reflection-patterns.json if changing implementation
3. [ ] Update SKILL.md if adding new features
4. [ ] Add test cases to TEST_RESULTS.md for new checks
5. [ ] Run `node test-reflection.js` to verify changes
6. [ ] Update this document if integration points change

---

## For Different Audiences

### For Users (Non-Technical)

**Read:** AGENTS.md reflection section  
**Takeaway:** "The agent double-checks its work before sending responses"

### For Agents

**Read:** AGENTS.md reflection checklist  
**Use:** Follow the checklist for every response  
**Takeaway:** "Apply these quality checks before delivery"

### For Developers

**Read:** This skill's SKILL.md and INTEGRATION_GUIDE.md  
**Use:** Implement or customize reflection behavior  
**Takeaway:** "Here's how to build and optimize reflection"

### For Operators (Monitoring/Tuning)

**Read:** This skill's TEST_RESULTS.md and reflection-patterns.json  
**Use:** Monitor metrics, tune thresholds  
**Takeaway:** "Track these metrics and adjust these knobs"

---

## Enhancement Roadmap

Future enhancements that would benefit both AGENTS.md and this skill:

### Phase 1: Current State ✅
- [x] Basic reflection checklist in AGENTS.md
- [x] Implementation in this skill
- [x] Testing and proof
- [x] Integration documentation

### Phase 2: Learning (Planned)
- [ ] Automatic pattern extraction from corrections
- [ ] User-specific preference learning
- [ ] Domain-specific reflection profiles
- [ ] Update both AGENTS.md and skill with learned patterns

### Phase 3: Meta-Reflection (Planned)
- [ ] Reflect on the reflection itself
- [ ] A/B testing of reflection strategies
- [ ] Self-improvement of critique prompts
- [ ] Document best practices in AGENTS.md

### Phase 4: Multimodal (Planned)
- [ ] Reflection for image captions
- [ ] Reflection for code execution
- [ ] Reflection for voice outputs
- [ ] Extend AGENTS.md checklist to cover all modalities

---

## Conclusion

**AGENTS.md provides the philosophy and checklist.**  
**This skill provides the implementation and tools.**  
**Together, they create a robust quality assurance system.**

**For agents:** Follow AGENTS.md, the skill handles the details.  
**For developers:** Use this skill to implement or enhance reflection.  
**For everyone:** Better responses, fewer corrections, happier users.

---

**Next Steps:**

1. ✅ Verify AGENTS.md reflection section is current
2. ✅ Test this skill with `node test-reflection.js`
3. ✅ Review TEST_RESULTS.md for proof of effectiveness
4. ✅ Configure reflection-patterns.json for your use case
5. ✅ Monitor metrics and tune as needed

**Questions?** Check SKILL.md for detailed documentation or INTEGRATION_GUIDE.md for implementation help.
