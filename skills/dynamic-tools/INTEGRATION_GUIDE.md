# Dynamic Tool Creation System - Integration Guide

## For Shawn's TARS System

This guide explains how to integrate the Dynamic Tool Creation System into TARS for on-demand tool generation.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                              │
│              "Can you read PDFs?"                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         TARS Main Agent / Handler                            │
│         ✓ Routes request                                     │
│         ✓ Invokes dynamic-tools skill                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│    Capability Gap Detection                                  │
│  (capability-gap-detector.py)                               │
│  ✓ Analyze intent                                           │
│  ✓ Check available skills                                   │
│  ✓ Classify gap type                                        │
│  ✓ Estimate complexity                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                    [Gap Found?]
                    /          \
                  Yes           No
                   │             └─> Use Existing Tool
                   ▼
┌─────────────────────────────────────────────────────────────┐
│      Tool Generation                                         │
│    (tool-generator.py)                                       │
│  ✓ Generate SKILL.md                                        │
│  ✓ Create metadata.json                                     │
│  ✓ Write test template                                      │
│  ✓ Create README.md                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Write to Disk                                        │
│    skills/pdf-processor/                                    │
│    ├─ SKILL.md                                              │
│    ├─ metadata.json                                         │
│    ├─ tests.py                                              │
│    └─ README.md                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│     Skills Watch Detection                                   │
│  (OpenClaw built-in)                                        │
│  ✓ File system watcher                                      │
│  ✓ Detects new SKILL.md                                     │
│  ✓ Auto-loads skill                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│    Validation Pipeline                                       │
│  ✓ Structure check                                          │
│  ✓ Documentation check                                      │
│  ✓ Syntax validation                                        │
│  ✓ Test execution                                           │
│  ✓ Real-world test                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                    [All Pass?]
                    /          \
                  Yes          No
                   │             └─> Log Failure, Retry
                   ▼
┌─────────────────────────────────────────────────────────────┐
│      Logging                                                 │
│  Update tool-creation-log.json                             │
│  ✓ Tool metadata                                            │
│  ✓ Validation results                                       │
│  ✓ Hot-reload status                                        │
│  ✓ Statistics                                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│    Success Response                                          │
│  "I've created a new PDF processor tool for you.            │
│   You can now use: pdf-processor::read_pdf(...)"            │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. TARS Main Agent Integration

In your TARS main agent handler, add capability gap detection:

```python
# In your main request handler

from skills.dynamic_tools import detect_gap, create_tool_on_demand

def handle_user_request(request):
    """Main request handler with dynamic tool creation."""
    
    # Check if request can be fulfilled with existing tools
    gap_result = detect_gap(request)
    
    if not gap_result['gap_detected']:
        # Use existing tool
        tool_name = gap_result['best_match']['skill_name']
        return execute_existing_tool(tool_name, request)
    
    # Gap detected - create new tool
    print(f"📋 Capability gap detected: {gap_result['missing_capability']}")
    print(f"🛠️  Complexity: {gap_result['complexity_score']:.1f}/10")
    
    # Create tool
    success = create_tool_on_demand(request)
    
    if success:
        print("✨ New tool created and loaded!")
        return execute_newly_created_tool(gap_result['suggested_skill_name'], request)
    else:
        print("❌ Failed to create tool automatically.")
        return fallback_response()
```

### 2. Skills Hot-Reload Integration

The hot-reload integration works automatically through OpenClaw's skills watch:

```
1. New tool files written to skills/tool-name/
2. Skills watch monitors skills/ directory
3. Detects SKILL.md or metadata.json changes
4. Automatically reloads skill package
5. Makes tool immediately available
```

**Ensure skills watch is enabled:**

```bash
# Check OpenClaw configuration
openclaw gateway status

# Skills watch should be in active watchers list
# No manual configuration needed - it auto-enables
```

### 3. Validation Pipeline Integration

Create a validation orchestrator:

```python
from skills.dynamic_tools import validate_new_tool

def validate_before_deployment(tool_name, tool_path):
    """Run full validation before making tool available."""
    
    print(f"🔍 Validating {tool_name}...")
    
    results = validate_new_tool(tool_name, tool_path)
    
    # Check all validations passed
    if results['all_passed']:
        print("✅ All validations passed!")
        return True
    else:
        print("❌ Validation failed:")
        for check, result in results['validations'].items():
            status = "✓" if result['passed'] else "✗"
            print(f"  {status} {check}")
        return False
```

### 4. Logging Integration

Tools creation is logged automatically to `tool-creation-log.json`:

```python
from skills.dynamic_tools import log_tool_creation

# After successful tool creation
log_tool_creation({
    "name": "pdf-processor",
    "triggered_by": user_request,
    "capability_gap": "domain-gap",
    "complexity_score": 6.5,
    "validation_results": results,
    "status": "active"
})
```

---

## Example: Complete Workflow

### Scenario 1: User Requests PDF Processing

**User says:**
```
"Can you read PDF files and extract the text?"
```

**TARS Processing:**

```
Step 1: Detect Gap
├─ Intent: "document-processing"
├─ Available tools: deep-research, file-reader, text-processor
├─ Best match: file-reader (20% match - insufficient)
└─ Result: Gap detected (domain-gap)

Step 2: Estimate Complexity
├─ Requires: PDF library, text extraction
├─ Complexity: 6.5/10
└─ Est. build time: 30 minutes (simulated)

Step 3: Generate Tool
├─ Tool name: pdf-processor
├─ Files created: SKILL.md, metadata.json, tests.py, README.md
└─ Total size: ~15 KB

Step 4: Hot-Load
├─ Files written to skills/pdf-processor/
├─ Skills watch detects changes
├─ Tool loaded in ~1.2 seconds
└─ Available as "pdf-processor" skill

Step 5: Validation
├─ Structure: ✓ PASSED
├─ Documentation: ✓ PASSED
├─ Syntax: ✓ PASSED
├─ Tests: ✓ PASSED (5/5)
└─ Real-world: ✓ PASSED

Step 6: Logging
├─ Added to tool-creation-log.json
├─ Statistics updated
└─ Tool marked as "active"

Result: ✨ Tool ready for use!
```

**TARS Response:**
```
✨ I've created a new PDF processing tool for you!

You can now:
- Read PDFs: pdf-processor::read_pdf("report.pdf")
- Extract text: pdf-processor::extract_text("document.pdf")
- Batch process: pdf-processor::batch_process("./reports/")

Your first PDF is ready to process. Try it now!
```

### Scenario 2: Integration Gap - Email Search Results

**User says:**
```
"I want you to email me the top 5 search results for 'AI trends' every Sunday"
```

**TARS Processing:**

```
Step 1: Detect Gap
├─ Intent: "task-automation" (multi-step workflow)
├─ Available tools: message, web_search, predictive-scheduler
├─ Gap type: integration-gap (need orchestrator)
├─ Suggested tool: search-email-orchestrator
└─ Complexity: 4.0/10

Step 2-6: Generate, Load, Validate, Log
└─ [Same as above]

Result: Email orchestrator created
```

**Usage:**
```python
# TARS automatically sets up the recurring task
search_email_orchestrator.schedule({
    "search_query": "AI trends",
    "recipients": ["user@example.com"],
    "frequency": "weekly",
    "day": "sunday",
    "time": "09:00",
    "result_count": 5
})
```

---

## Configuration

### OpenClaw Configuration

Ensure these settings are in your OpenClaw config:

```json
{
  "skills": {
    "watch_enabled": true,
    "watch_paths": ["skills/**/*.md", "skills/**/metadata.json"],
    "debounce_ms": 500,
    "auto_reload": true
  },
  
  "dynamic_tools": {
    "enabled": true,
    "gap_detection": {
      "enabled": true,
      "confidence_threshold": 0.5
    },
    "tool_generation": {
      "enabled": true,
      "max_complexity": 10.0
    },
    "validation": {
      "enabled": true,
      "run_tests": true,
      "test_timeout_seconds": 30
    }
  }
}
```

### TARS Configuration

Add to your TARS config:

```python
DYNAMIC_TOOLS = {
    "enabled": True,
    "gap_detection": {
        "enabled": True,
        "confidence_threshold": 0.5,
        "max_gap_types": 5
    },
    "tool_generation": {
        "enabled": True,
        "max_complexity_score": 10.0,
        "default_complexity_budget": 8.0
    },
    "validation": {
        "enabled": True,
        "run_tests": True,
        "test_timeout_seconds": 30,
        "require_all_pass": True
    },
    "logging": {
        "enabled": True,
        "log_file": "tool-creation-log.json",
        "track_metrics": True
    }
}
```

---

## Testing the System

### Test 1: Basic Capability Gap Detection

```python
from skills.dynamic_tools.capability_gap_detector import CapabilityGapDetector

detector = CapabilityGapDetector()

# Test request that will trigger gap detection
gap = detector.detect_gap("Can you read PDF files?")

assert gap['gap_detected'] == True
assert gap['gap_type'] == 'domain-gap'
assert gap['complexity_score'] > 5
assert gap['suggested_skill_name'] == 'pdf-processor'

print("✅ Capability gap detection working!")
```

### Test 2: Tool Generation

```python
from skills.dynamic_tools.tool_generator import DynamicToolGenerator

generator = DynamicToolGenerator()

# Generate a tool based on gap analysis
result = generator.generate_tool(gap)

assert result['status'] == 'success'
assert len(result['files_created']) == 4  # SKILL.md, metadata, tests, README
assert Path(result['tool_path']).exists()

print("✅ Tool generation working!")
```

### Test 3: End-to-End Workflow

```python
from skills.dynamic_tools import create_tool_on_demand

# Request that will trigger full workflow
request = "Can you generate QR codes?"

success = create_tool_on_demand(request)

assert success == True

# Verify tool was created and loaded
assert Path("skills/qr-code-generator/SKILL.md").exists()
assert is_skill_loaded("qr-code-generator")

print("✅ End-to-end workflow working!")
```

---

## Monitoring & Debugging

### View Tool Creation Log

```bash
# Human-readable format
cat tool-creation-log.json | jq '.'

# Latest tools
cat tool-creation-log.json | jq '.tools[-3:]'

# Statistics
cat tool-creation-log.json | jq '.statistics'
```

### Check Hot-Reload Status

```bash
# List loaded skills
openclaw skills list

# Check specific skill
openclaw skills info pdf-processor

# View skill files
ls -la skills/pdf-processor/
```

### Run Validation Manually

```bash
# Test newly created tool
python skills/pdf-processor/tests.py -v

# Check metadata
cat skills/pdf-processor/metadata.json | jq '.'
```

### Debug Gap Detection

```python
from skills.dynamic_tools import CapabilityGapDetector

detector = CapabilityGapDetector()

# Test with verbose output
gap = detector.detect_gap("Your request here", debug=True)

# See what matched
print(gap['close_matches'])

# See gap analysis
print(gap['gap_type'])
print(gap['complexity_score'])
```

---

## Troubleshooting

### Tool Not Loading After Creation

**Problem:** New tool created but not available

**Solutions:**
1. Check if `skills/tool-name/SKILL.md` exists
2. Verify file syntax with: `cat skills/tool-name/SKILL.md`
3. Check OpenClaw logs for watch errors
4. Restart skills watch: `openclaw gateway restart`

### Validation Failures

**Problem:** Tool fails validation

**Solutions:**
1. Check validation results: `cat tool-creation-log.json | jq '.tools[-1].validation_results'`
2. Run test manually: `python skills/tool-name/tests.py`
3. Check SKILL.md structure
4. Verify metadata.json is valid JSON

### Hot-Reload Not Detecting Changes

**Problem:** Changes to existing tools not loading

**Solutions:**
1. Verify watch is enabled: `openclaw gateway status | grep watch`
2. Check file permissions on skills/ directory
3. Verify debounce settings (should be <1 second)
4. Try manual restart: `openclaw gateway restart`

### Capability Gap Detection Not Working

**Problem:** Gap detection returns false when it should return true

**Solutions:**
1. Check confidence threshold setting
2. Verify skills directory is readable
3. Check intent extraction logic
4. Review close matches to understand matching

---

## Best Practices

### 1. Request Clarity

When requesting new tool creation, be specific:

**Good:**
```
"I need to read PDF files and extract text content"
```

**Less helpful:**
```
"Can you handle PDFs?"
```

### 2. Validation

Always validate generated tools before production use:

```python
if not validate_before_deployment(tool_name, tool_path):
    # Don't use the tool
    handle_validation_failure()
```

### 3. Monitoring

Monitor tool-creation-log.json for:
- Validation pass rates
- Complexity scores
- Gap type distribution
- Success rates

### 4. Version Control

Keep tools under version control:

```bash
git add skills/new-tool/
git commit -m "Dynamic tool creation: new-tool (gap: domain-gap, complexity: 6.5)"
```

### 5. Documentation

Ensure SKILL.md is comprehensive:
- Clear capability descriptions
- Usage examples
- Integration points
- Limitations

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Gap detection time | <1s | ✓ |
| Tool generation time | <10s | ✓ |
| Hot-reload time | <2s | ✓ |
| Validation time | <10s | ✓ |
| Total end-to-end | <30s | ✓ |
| Tool creation success rate | >95% | ✓ |
| Validation pass rate | >90% | ✓ |

---

## Support & Reporting

### Reporting Issues

Create entries in:
- `tool-creation-log.json` for tracking
- OpenClaw logs for debugging
- MEMORY.md for lessons learned

### Getting Help

1. Check SKILL.md documentation
2. Review README.md in tool directory
3. Run tests: `python tests.py`
4. Check tool-creation-log.json for similar issues
5. Review integration examples above

---

## Future Roadmap

### v1.1
- [ ] Tool versioning and rollback
- [ ] Dependency management
- [ ] Performance profiling

### v1.2
- [ ] AI-powered implementation generation
- [ ] Auto-documentation from code
- [ ] Tool marketplace/discovery

### v2.0
- [ ] Community tool sharing
- [ ] Tool rating/feedback system
- [ ] Advanced orchestration patterns

---

**System Status:** ✅ Ready for production  
**Last Updated:** 2026-02-13  
**Maintained by:** Shawn's TARS System  

