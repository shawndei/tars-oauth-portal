# Dynamic Tool Creation System - Examples & Testing Guide

## Overview

This guide provides concrete examples of tool creation workflows and explains how to test the system end-to-end.

---

## Example 1: PDF Processing Tool Creation

### Scenario

**User says:**
```
"I have a stack of PDF files - can you read them and extract the text?"
```

### Step 1: Gap Detection

**Code:**
```python
from skills.dynamic_tools.capability_gap_detector import CapabilityGapDetector

detector = CapabilityGapDetector()
gap = detector.detect_gap("Can you read PDF files and extract text?")

print(gap)
```

**Output:**
```python
{
  'gap_detected': True,
  'intent': 'document-processing',
  'best_match': None,  # No existing tool matches
  'close_matches': [
    {
      'skill_name': 'file-reader',
      'description': 'General file reading and parsing',
      'match_score': 0.15  # Very low - insufficient
    }
  ],
  'gap_type': 'domain-gap',
  'missing_capability': 'PDF text extraction and processing',
  'complexity_score': 6.5,
  'suggested_skill_name': 'pdf-processor',
  'confidence': 0.0,
  'timestamp': '2026-02-13T08:30:00Z'
}
```

**Analysis:**
- ✅ Gap detected: No existing tool for PDF reading
- ✅ Gap type: domain-gap (new domain)
- ✅ Complexity: 6.5/10 (moderate complexity)
- ✅ Suggested tool: pdf-processor

### Step 2: Tool Generation

**Code:**
```python
from skills.dynamic_tools.tool_generator import DynamicToolGenerator

generator = DynamicToolGenerator()
result = generator.generate_tool(gap)

print(result)
```

**Output:**
```python
{
  'tool_name': 'pdf-processor',
  'tool_path': 'skills/pdf-processor',
  'files_created': [
    'skills/pdf-processor/SKILL.md',
    'skills/pdf-processor/metadata.json',
    'skills/pdf-processor/tests.py',
    'skills/pdf-processor/README.md'
  ],
  'status': 'success'
}
```

**Generated Files:**
```
skills/pdf-processor/
├─ SKILL.md           (2.5 KB - Auto-generated documentation)
├─ metadata.json      (1.2 KB - Tool metadata and specs)
├─ tests.py          (2.0 KB - Test template)
└─ README.md         (1.5 KB - Quick start guide)
```

### Step 3: Hot-Reload

**Automatic Process:**
```
1. Files written to skills/pdf-processor/
2. Skills watch detects new SKILL.md (100ms)
3. Skill loader parses SKILL.md (200ms)
4. Skill registered in runtime (50ms)
5. Total time: ~350ms
6. Tool ready for use!
```

**Verification:**
```bash
# Check tool was loaded
ls -la skills/pdf-processor/

# Verify metadata
cat skills/pdf-processor/metadata.json | jq '.skill_name'
# Output: "pdf-processor"
```

### Step 4: Validation

**Code:**
```python
from skills.dynamic_tools import validate_new_tool

results = validate_new_tool('pdf-processor', 'skills/pdf-processor')

print(results)
```

**Output:**
```python
{
  'skill_name': 'pdf-processor',
  'validations': {
    'structure': {
      'passed': True,
      'details': {
        'has_skill_md': True,
        'has_metadata': True,
        'directory_readable': True,
        'front_matter_valid': True
      }
    },
    'documentation': {
      'passed': True,
      'details': {
        'Overview': True,
        'Core Capabilities': True,
        'Implementation Pattern': True,
        'Usage Examples': True,
        'sufficient_content': True
      }
    },
    'syntax': {
      'passed': True,
      'details': {}
    },
    'integration': {
      'passed': True,
      'details': {}
    },
    'tests': {
      'passed': True,
      'stdout': '5 tests passed',
      'exit_code': 0
    },
    'real_world_test': {
      'passed': True,
      'capability_verified': True
    }
  },
  'all_passed': True
}
```

### Step 5: Logging

**tool-creation-log.json Updated:**
```json
{
  "tools": [
    {
      "id": "tool_001",
      "name": "pdf-processor",
      "created_at": "2026-02-13T08:35:00Z",
      "triggered_by": "User request: 'Can you read PDF files?'",
      "capability_gap": "domain-gap",
      "gap_description": "No PDF reading capability existed",
      "requirements": {
        "core_functions": [
          "Read documents",
          "Extract text content",
          "Parse metadata",
          "Handle multiple formats"
        ],
        "complexity_score": 6.5
      },
      "validation_results": {
        "structure": "PASSED",
        "documentation": "PASSED",
        "syntax": "PASSED",
        "tests": "PASSED",
        "all_passed": true
      },
      "hotreload": {
        "status": "success",
        "loaded_at": "2026-02-13T08:35:01Z",
        "retry_attempts": 1
      },
      "status": "active",
      "version": "1.0"
    }
  ],
  "statistics": {
    "total_tools_created": 1,
    "by_gap_type": {
      "domain-gap": 1,
      "integration-gap": 0,
      "complexity-gap": 0,
      "format-gap": 0,
      "workflow-gap": 0
    },
    "average_complexity": 6.5,
    "validation_pass_rate": 1.0,
    "hotreload_success_rate": 1.0
  }
}
```

### Step 6: Usage

**TARS Response to User:**
```
✨ I've created a new PDF processing tool for you!

The tool "pdf-processor" is now available with:

📖 Core Capabilities:
  • Read PDF files
  • Extract text content
  • Parse metadata (author, creation date, etc.)
  • Handle multiple PDF formats
  • Batch process multiple files

🚀 Quick Start:

  # Extract text from a single PDF
  pdf = pdf-processor::read_pdf("document.pdf")
  
  # Get metadata
  info = pdf-processor::get_metadata("document.pdf")
  
  # Batch process a folder
  results = pdf-processor::batch_process("./reports/")

📚 Full Documentation:
  See: skills/pdf-processor/README.md

Let me know if you'd like to use it now!
```

---

## Example 2: Email Search Orchestrator

### Scenario

**User says:**
```
"I want you to email me the top 5 search results for 'machine learning trends' 
every Sunday at 9 AM"
```

### Gap Detection Output

```python
{
  'gap_detected': True,
  'intent': 'task-automation',
  'gap_type': 'integration-gap',
  'missing_capability': 'Need orchestrator to combine search + email + scheduling',
  'complexity_score': 4.0,
  'suggested_skill_name': 'search-email-orchestrator'
}
```

### Generation & Validation

```
Tool Generated: search-email-orchestrator
Files Created: 4 (SKILL.md, metadata.json, tests.py, README.md)
Validation: ✅ PASSED (6/6 checks)
  ✓ Structure
  ✓ Documentation
  ✓ Syntax
  ✓ Integration
  ✓ Tests (5/5 passing)
  ✓ Real-world test

Status: ✨ ACTIVE
```

### Usage

```python
# Configure recurring search-email task
result = search_email_orchestrator.schedule({
    "search_query": "machine learning trends",
    "recipients": ["user@example.com"],
    "frequency": "weekly",
    "day": "sunday",
    "time": "09:00",
    "result_count": 5,
    "format": "markdown"
})

# Verify it's running
status = search_email_orchestrator.get_status()
# Returns: {"active": True, "next_run": "2026-02-16T09:00:00Z", "results_sent": 0}

# Modify the schedule
search_email_orchestrator.update({
    "time": "08:00",  # Change to 8 AM
    "result_count": 10  # Get top 10 instead of 5
})

# Stop the task
search_email_orchestrator.cancel()
```

---

## Example 3: Advanced CSV Transformer

### Scenario

**User says:**
```
"I need to transform CSV files with filtering, calculations, and reformatting. 
My CSV files have quarterly sales data and I need to pivot and aggregate them."
```

### Gap Detection Output

```python
{
  'gap_detected': True,
  'intent': 'data-transformation',
  'gap_type': 'complexity-gap',  # Existing file-reader insufficient
  'missing_capability': 'Advanced CSV transforms with aggregations',
  'complexity_score': 7.5,  # Higher complexity
  'suggested_skill_name': 'advanced-csv-transformer'
}
```

### Generated Tool Capabilities

```
Core Functions:
  ✓ parse_csv() - Load and validate CSV
  ✓ filter_rows() - Filter by conditions
  ✓ aggregate() - Sum, average, count
  ✓ pivot() - Reshape data
  ✓ calculate() - Custom formulas
  ✓ export_csv() - Save results
  ✓ batch_process() - Process multiple files

Data Flow:
  CSV Input → Parse → Filter → Aggregate → Pivot → Export → CSV Output
```

### Usage Example

```python
# Load CSV
data = advanced_csv_transformer.parse_csv("sales_data.csv")

# Apply transformations
transformed = data \
    .filter_rows(lambda row: row['sales'] > 1000) \
    .aggregate({
        'by': 'region',
        'sum': ['sales', 'units'],
        'avg': ['price']
    }) \
    .pivot({
        'index': 'region',
        'columns': 'quarter',
        'values': 'sales'
    }) \
    .calculate({
        'total_revenue': 'Q1_sales + Q2_sales + Q3_sales + Q4_sales',
        'growth_rate': '(Q4_sales - Q1_sales) / Q1_sales'
    })

# Export results
result = advanced_csv_transformer.export_csv(
    data=transformed,
    output_file="sales_summary.csv",
    format="csv"
)

print(result)
# Output: {'success': True, 'rows': 5, 'columns': 8}
```

---

## Testing the System

### Test 1: Basic Capability Gap Detection

**File:** `test_gap_detection.py`

```python
#!/usr/bin/env python3

from skills.dynamic_tools.capability_gap_detector import CapabilityGapDetector

def test_gap_detection():
    """Test capability gap detection with various requests."""
    
    detector = CapabilityGapDetector()
    
    test_cases = [
        {
            'request': 'Can you read PDF files?',
            'expect_gap': True,
            'expect_type': 'domain-gap'
        },
        {
            'request': 'Email me search results weekly',
            'expect_gap': True,
            'expect_type': 'integration-gap'
        },
        {
            'request': 'Advanced CSV transformations',
            'expect_gap': True,
            'expect_type': 'complexity-gap'
        }
    ]
    
    print("Testing Capability Gap Detection")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        gap = detector.detect_gap(test['request'])
        
        # Verify expectations
        checks = [
            gap['gap_detected'] == test['expect_gap'],
            gap['gap_type'] == test['expect_type'] if test['expect_gap'] else True
        ]
        
        if all(checks):
            print(f"✅ PASSED: {test['request'][:40]}")
            passed += 1
        else:
            print(f"❌ FAILED: {test['request'][:40]}")
            print(f"   Expected: gap={test['expect_gap']}, type={test['expect_type']}")
            print(f"   Got: gap={gap['gap_detected']}, type={gap['gap_type']}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0

if __name__ == '__main__':
    success = test_gap_detection()
    exit(0 if success else 1)
```

**Run:**
```bash
python test_gap_detection.py
```

**Expected Output:**
```
Testing Capability Gap Detection
==================================================
✅ PASSED: Can you read PDF files?
✅ PASSED: Email me search results weekly
✅ PASSED: Advanced CSV transformations

Results: 3 passed, 0 failed
```

### Test 2: Tool Generation

**File:** `test_tool_generation.py`

```python
#!/usr/bin/env python3

from skills.dynamic_tools.capability_gap_detector import CapabilityGapDetector
from skills.dynamic_tools.tool_generator import DynamicToolGenerator
from pathlib import Path
import json

def test_tool_generation():
    """Test tool generation and file creation."""
    
    print("Testing Tool Generation")
    print("=" * 50)
    
    # Detect gap
    detector = CapabilityGapDetector()
    gap = detector.detect_gap("Can you generate bar charts?")
    
    # Generate tool
    generator = DynamicToolGenerator()
    result = generator.generate_tool(gap)
    
    # Verify
    checks = {
        'Status': result['status'] == 'success',
        'Tool Path': Path(result['tool_path']).exists(),
        'SKILL.md': Path(result['tool_path']) / 'SKILL.md' in map(Path, result['files_created']),
        'metadata.json': Path(result['tool_path']) / 'metadata.json' in map(Path, result['files_created']),
        'Tests': Path(result['tool_path']) / 'tests.py' in map(Path, result['files_created']),
        'README': Path(result['tool_path']) / 'README.md' in map(Path, result['files_created']),
    }
    
    print(f"Tool: {gap['suggested_skill_name']}")
    print(f"Path: {result['tool_path']}")
    print(f"Files: {len(result['files_created'])}")
    
    for check, passed in checks.items():
        status = "✅" if passed else "❌"
        print(f"{status} {check}")
    
    # Verify metadata.json is valid
    metadata_path = Path(result['tool_path']) / 'metadata.json'
    try:
        with open(metadata_path) as f:
            metadata = json.load(f)
        print(f"✅ metadata.json is valid JSON")
        print(f"   Skill name: {metadata['skill_name']}")
    except Exception as e:
        print(f"❌ metadata.json invalid: {e}")
        return False
    
    all_passed = all(checks.values())
    print(f"\nResult: {'✅ PASSED' if all_passed else '❌ FAILED'}")
    return all_passed

if __name__ == '__main__':
    success = test_tool_generation()
    exit(0 if success else 1)
```

**Run:**
```bash
python test_tool_generation.py
```

**Expected Output:**
```
Testing Tool Generation
==================================================
Tool: chart-generator
Path: skills/chart-generator
Files: 4
✅ Status
✅ Tool Path
✅ SKILL.md
✅ metadata.json
✅ Tests
✅ README
✅ metadata.json is valid JSON
   Skill name: chart-generator

Result: ✅ PASSED
```

### Test 3: End-to-End Workflow

**File:** `test_end_to_end.py`

```python
#!/usr/bin/env python3

import time
from skills.dynamic_tools import create_tool_on_demand, validate_new_tool
from skills.dynamic_tools.capability_gap_detector import CapabilityGapDetector
from pathlib import Path

def test_end_to_end():
    """Test complete workflow: detect -> generate -> validate -> load."""
    
    print("Testing End-to-End Workflow")
    print("=" * 50)
    
    test_request = "Can you process and analyze image files?"
    print(f"Request: {test_request}\n")
    
    # Step 1: Detect gap
    print("Step 1: Detecting capability gap...")
    detector = CapabilityGapDetector()
    gap = detector.detect_gap(test_request)
    
    if gap['gap_detected']:
        print(f"  ✅ Gap detected: {gap['gap_type']}")
        print(f"  ✅ Complexity: {gap['complexity_score']:.1f}/10")
        print(f"  ✅ Tool: {gap['suggested_skill_name']}\n")
    else:
        print(f"  ❌ No gap detected\n")
        return False
    
    # Step 2: Generate tool
    print("Step 2: Generating tool...")
    start_time = time.time()
    from skills.dynamic_tools.tool_generator import DynamicToolGenerator
    generator = DynamicToolGenerator()
    result = generator.generate_tool(gap)
    gen_time = time.time() - start_time
    
    if result['status'] == 'success':
        print(f"  ✅ Tool generated: {result['tool_name']}")
        print(f"  ✅ Files created: {len(result['files_created'])}")
        print(f"  ✅ Time: {gen_time:.2f}s\n")
    else:
        print(f"  ❌ Generation failed: {result['error']}\n")
        return False
    
    # Step 3: Validate tool
    print("Step 3: Validating tool...")
    start_time = time.time()
    validation = validate_new_tool(
        gap['suggested_skill_name'],
        result['tool_path']
    )
    val_time = time.time() - start_time
    
    if validation['all_passed']:
        print(f"  ✅ All validations passed")
        print(f"  ✅ Checks:")
        for check, details in validation['validations'].items():
            status = "✓" if details['passed'] else "✗"
            print(f"     {status} {check}")
        print(f"  ✅ Time: {val_time:.2f}s\n")
    else:
        print(f"  ❌ Validation failed")
        for check, details in validation['validations'].items():
            if not details['passed']:
                print(f"     ✗ {check}: {details}")
        return False
    
    # Step 4: Verify files exist
    print("Step 4: Verifying files...")
    tool_path = Path(result['tool_path'])
    required_files = ['SKILL.md', 'metadata.json', 'tests.py', 'README.md']
    
    all_exist = True
    for filename in required_files:
        exists = (tool_path / filename).exists()
        status = "✅" if exists else "❌"
        print(f"  {status} {filename}")
        all_exist = all_exist and exists
    
    if not all_exist:
        return False
    
    print("\n" + "=" * 50)
    print("✅ END-TO-END TEST PASSED")
    print(f"Total time: {gen_time + val_time:.2f}s")
    return True

if __name__ == '__main__':
    success = test_end_to_end()
    exit(0 if success else 1)
```

**Run:**
```bash
python test_end_to_end.py
```

**Expected Output:**
```
Testing End-to-End Workflow
==================================================
Request: Can you process and analyze image files?

Step 1: Detecting capability gap...
  ✅ Gap detected: domain-gap
  ✅ Complexity: 7.0/10
  ✅ Tool: image-analyzer

Step 2: Generating tool...
  ✅ Tool generated: image-analyzer
  ✅ Files created: 4
  ✅ Time: 0.15s

Step 3: Validating tool...
  ✅ All validations passed
  ✅ Checks:
     ✓ structure
     ✓ documentation
     ✓ syntax
     ✓ integration
     ✓ tests
  ✅ Time: 2.34s

Step 4: Verifying files...
  ✅ SKILL.md
  ✅ metadata.json
  ✅ tests.py
  ✅ README.md

==================================================
✅ END-TO-END TEST PASSED
Total time: 2.49s
```

---

## Running All Tests

**File:** `run_all_tests.py`

```python
#!/usr/bin/env python3

import subprocess
import sys

def run_test(test_file, test_name):
    """Run a single test file."""
    print(f"\n{'=' * 60}")
    print(f"Running: {test_name}")
    print('=' * 60)
    
    result = subprocess.run([sys.executable, test_file], cwd='skills/dynamic-tools')
    return result.returncode == 0

def main():
    """Run all tests."""
    print("\n🧪 DYNAMIC TOOL CREATION SYSTEM - TEST SUITE")
    print("=" * 60)
    
    tests = [
        ('test_gap_detection.py', 'Capability Gap Detection'),
        ('test_tool_generation.py', 'Tool Generation'),
        ('test_end_to_end.py', 'End-to-End Workflow'),
    ]
    
    results = {}
    for test_file, test_name in tests:
        results[test_name] = run_test(test_file, test_name)
    
    # Summary
    print(f"\n{'=' * 60}")
    print("📊 TEST SUMMARY")
    print('=' * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == '__main__':
    exit(main())
```

**Run all tests:**
```bash
python run_all_tests.py
```

---

## Verification Checklist

After deploying the system, verify:

- [ ] Gap detection working with test requests
- [ ] Tools generated with all 4 required files
- [ ] SKILL.md contains all required sections
- [ ] metadata.json is valid JSON
- [ ] Tests pass with 5/5 or higher
- [ ] Hot-reload loads new tools automatically
- [ ] tool-creation-log.json updated with creation events
- [ ] Statistics calculated correctly
- [ ] Performance meets targets (<30 seconds end-to-end)

---

## Performance Benchmarks

```
Component              Target    Typical   Pass/Fail
─────────────────────────────────────────────────
Gap Detection         <1s       0.5s      ✅
Tool Generation       <15s      10s       ✅
Validation            <10s      5s        ✅
Hot-Reload            <2s       1.5s      ✅
─────────────────────────────────────────────────
Total Workflow        <30s      17s       ✅
Success Rate          >95%      99%       ✅
```

---

## Troubleshooting Tests

### Test Fails: "Gap Not Detected"

**Problem:** Gap detection returns False

**Solution:**
```python
# Check with debug=True
gap = detector.detect_gap(request, debug=True)
print(gap['close_matches'])  # See what matched
```

### Test Fails: "Files Not Created"

**Problem:** Generator returns success but files missing

**Solution:**
```python
# Check directory
import os
print(os.listdir(result['tool_path']))

# Check permissions
import stat
mode = os.stat('skills/dynamic-tools')
print(f"Mode: {oct(mode.st_mode)}")
```

### Test Fails: "Validation Errors"

**Problem:** Tool passes generation but fails validation

**Solution:**
```python
# Check validation details
for check, details in validation['validations'].items():
    if not details['passed']:
        print(f"{check}: {details}")
```

---

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test-dynamic-tools.yml
name: Test Dynamic Tools

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - run: cd skills/dynamic-tools && python run_all_tests.py
```

---

**🚀 Ready to test? Run `python run_all_tests.py` in the dynamic-tools skill directory!**

