---
name: dynamic-tools
description: Autonomous tool/skill creation system with capability gap detection and hot-reload integration
---

# Dynamic Tool Creation System

## Overview

Enables TARS to **autonomously create new tools/skills on-demand** when user requests exceed current capabilities. Includes:

1. **Capability Gap Detection** - Identify when current tools can't fulfill requests
2. **Tool Generation** - Create SKILL.md, implementation patterns, and test cases
3. **Hot-Reload Integration** - Automatically load new tools via skills watch
4. **Tool Validation & Testing** - Verify new tools work before deployment
5. **Creation Logging** - Track all dynamically created tools with metadata

## Architecture

### System Flow

```
User Request
    ↓
Capability Gap Detection
    ├─ Check available tools/skills
    ├─ Analyze request complexity
    ├─ Identify missing capability
    └─ Generate requirements
    ↓
Tool Creation
    ├─ Design SKILL.md structure
    ├─ Generate implementation patterns
    ├─ Create example usage
    └─ Write test cases
    ↓
Tool Validation
    ├─ Syntax check
    ├─ Run basic tests
    ├─ Verify integration
    └─ Test with real request
    ↓
Hot-Reload
    ├─ Write to skills/ directory
    ├─ Trigger skills watch
    ├─ Confirm load in runtime
    └─ Update tool-creation-log.json
    ↓
Success
```

---

## 1. Capability Gap Detection

### Pattern Recognition

```python
def detect_capability_gap(user_request, available_tools):
    """
    Analyze user request against available tools.
    
    Returns:
    - gap_detected: bool
    - missing_capability: str (description of what's needed)
    - tool_requirements: list (what the new tool should do)
    - complexity_score: float (1-10, how complex to build)
    - suggested_skill_name: str (naming recommendation)
    """
    
    # Parse request for intent
    intent = extract_intent(user_request)
    
    # Check against available tools
    matching_tools = find_matching_tools(intent, available_tools)
    
    # If perfect match exists, no gap
    if matching_tools and matching_tools[0].match_score > 0.85:
        return {
            "gap_detected": False,
            "reason": f"Matching tool exists: {matching_tools[0].name}"
        }
    
    # Otherwise, characterize the gap
    gap = {
        "gap_detected": True,
        "intent": intent,
        "close_matches": matching_tools[:3],
        "missing_capability": synthesize_gap(intent, matching_tools),
        "tool_requirements": derive_requirements(intent),
        "complexity_score": estimate_complexity(intent),
        "suggested_skill_name": generate_skill_name(intent),
        "confidence": calculate_gap_confidence(matching_tools)
    }
    
    return gap


def extract_intent(request_text):
    """
    Extract core intent from user request.
    
    Examples:
    "Generate a table from CSV" → intent: "data-transform"
    "Monitor my API health" → intent: "monitoring"
    "Auto-reply to emails" → intent: "automation"
    """
    # Use LLM or pattern matching to extract intent
    return intent_analysis


def derive_requirements(intent):
    """
    Break down intent into specific tool capabilities.
    
    Returns list of:
    - Function signatures needed
    - Data structures
    - Integration points
    - Success criteria
    """
    requirements = {
        "core_functions": [],
        "input_format": None,
        "output_format": None,
        "dependencies": [],
        "success_criteria": []
    }
    
    # LLM-based requirements generation
    return refine_with_llm(requirements)
```

### Gap Types

```
TYPE 1: Domain Gap
- User requests capability in domain TARS never worked with
- Example: "Generate QR codes" when no image generation tool exists
- Solution: Create new tool from scratch

TYPE 2: Integration Gap
- User wants to integrate two existing tools in new way
- Example: "Email me X search results daily" (combo of email + search)
- Solution: Create orchestrator/wrapper skill

TYPE 3: Complexity Gap
- Existing tool exists but is too simplistic for request
- Example: User wants advanced CSV parsing with transformations
- Solution: Enhance existing skill or create advanced variant

TYPE 4: Format Gap
- User wants different input/output format for existing capability
- Example: "Give me results as JSON instead of markdown"
- Solution: Create adapter/formatter skill

TYPE 5: Workflow Gap
- User wants new workflow combining multiple existing capabilities
- Example: "Multi-step data pipeline"
- Solution: Create workflow orchestrator
```

---

## 2. Tool Generation System

### SKILL.md Template Generator

```python
def generate_skill_md(tool_name, requirements, intent):
    """
    Generate complete SKILL.md for new tool.
    
    Template sections:
    1. Header (name, description)
    2. Overview (what it does, why it matters)
    3. Core Capabilities (main functions)
    4. Implementation Patterns (code examples)
    5. Integration Points (how it connects)
    6. Testing & Validation (test cases)
    7. Usage Examples (real-world scenarios)
    8. Performance Notes (limitations, scaling)
    9. Future Enhancements (v2.0 ideas)
    """
    
    skill_md = f"""---
name: {tool_name}
description: {requirements.description}
generated_at: {timestamp}
capability_gap: {intent}
---

# {format_title(tool_name)}

## Overview

{generate_overview(requirements, intent)}

## Core Capabilities

{generate_capabilities(requirements)}

## Implementation Pattern

{generate_implementation_pattern(requirements)}

## Integration Points

{generate_integration_points(requirements)}

## Usage Examples

{generate_usage_examples(requirements)}

## Testing

{generate_test_cases(requirements)}

## Performance Notes

{generate_performance_notes(requirements)}

## Future Enhancements

{generate_future_plans(requirements)}
"""
    
    return skill_md


def generate_implementation_pattern(requirements):
    """
    Generate starter code/patterns based on requirements.
    
    Includes:
    - Function signatures
    - Error handling
    - Data validation
    - Return structures
    """
    
    pattern = """
### Main Functions

```python
"""
    
    for func in requirements.core_functions:
        pattern += f"""
def {func.name}({', '.join(func.params)}):
    \"\"\"
    {func.description}
    
    Args:
{generate_arg_docs(func.params)}
    
    Returns:
        {func.return_type}: {func.return_description}
    \"\"\"
    
    # Validate inputs
    validate_inputs({', '.join(func.params)})
    
    # Core logic here
    result = execute_logic({', '.join(func.params)})
    
    # Return structured result
    return {{
        "success": True,
        "data": result,
        "metadata": {{
            "timestamp": now(),
            "source": "{func.name}"
        }}
    }}
"""
    
    pattern += "\n```\n"
    return pattern
```

### Directory Structure

When a new skill is created:

```
skills/
├── new-tool-name/
│   ├── SKILL.md              (Generated documentation)
│   ├── implementation.py     (Optional: starter code)
│   ├── tests.py             (Optional: test cases)
│   ├── README.md            (Optional: quickstart)
│   └── metadata.json        (Tracking info)
```

### Metadata File (metadata.json)

```json
{
  "skill_name": "new-tool-name",
  "created_by": "dynamic-tools",
  "created_at": "2026-02-13T08:22:00Z",
  "capability_gap": "User requested ability to X",
  "intent": "domain-gap|integration-gap|complexity-gap|format-gap|workflow-gap",
  "requirements": {
    "core_functions": ["func1", "func2"],
    "dependencies": ["tool1", "tool2"],
    "complexity_score": 6.5,
    "estimated_build_time": "30 minutes"
  },
  "testing": {
    "unit_tests": 5,
    "integration_tests": 2,
    "pass_rate": 1.0
  },
  "status": "active",
  "version": "1.0",
  "hotreload_enabled": true,
  "last_tested": "2026-02-13T08:25:00Z"
}
```

---

## 3. Tool Validation & Testing

### Validation Workflow

```python
def validate_new_tool(skill_name, skill_path):
    """
    Complete validation pipeline for newly created tools.
    """
    
    results = {
        "skill_name": skill_name,
        "validations": {},
        "all_passed": True
    }
    
    # Phase 1: Structure Validation
    results["validations"]["structure"] = validate_structure(skill_path)
    
    # Phase 2: Documentation Validation
    results["validations"]["documentation"] = validate_documentation(skill_path)
    
    # Phase 3: Code Syntax Check (if applicable)
    results["validations"]["syntax"] = validate_syntax(skill_path)
    
    # Phase 4: Integration Check
    results["validations"]["integration"] = validate_integration(skill_path)
    
    # Phase 5: Test Execution
    results["validations"]["tests"] = run_test_suite(skill_path)
    
    # Phase 6: Real-World Test
    results["validations"]["real_world"] = test_with_original_request(skill_path)
    
    # Summary
    results["all_passed"] = all(v["passed"] for v in results["validations"].values())
    
    return results


def validate_structure(skill_path):
    """
    Verify directory structure is correct.
    """
    required_files = ["SKILL.md"]
    checks = {
        "has_skill_md": Path(f"{skill_path}/SKILL.md").exists(),
        "has_metadata": Path(f"{skill_path}/metadata.json").exists(),
        "directory_readable": os.access(skill_path, os.R_OK),
        "front_matter_valid": check_frontmatter(skill_path)
    }
    
    return {
        "passed": all(checks.values()),
        "details": checks
    }


def validate_documentation(skill_path):
    """
    Ensure SKILL.md has all required sections.
    """
    skill_md = read_file(f"{skill_path}/SKILL.md")
    
    required_sections = [
        "Overview",
        "Core Capabilities",
        "Implementation Pattern",
        "Usage Examples"
    ]
    
    checks = {
        section: f"## {section}" in skill_md
        for section in required_sections
    }
    
    # Check for minimal content length
    checks["sufficient_content"] = len(skill_md) > 500
    
    return {
        "passed": all(checks.values()),
        "details": checks
    }


def run_test_suite(skill_path):
    """
    Execute test cases if tests.py exists.
    """
    test_file = f"{skill_path}/tests.py"
    
    if not Path(test_file).exists():
        return {
            "passed": True,
            "skipped": True,
            "reason": "No tests.py found"
        }
    
    # Run tests
    try:
        result = subprocess.run(
            ["python", test_file],
            capture_output=True,
            timeout=30
        )
        
        return {
            "passed": result.returncode == 0,
            "stdout": result.stdout.decode(),
            "stderr": result.stderr.decode(),
            "exit_code": result.returncode
        }
    except Exception as e:
        return {
            "passed": False,
            "error": str(e)
        }


def test_with_original_request(skill_path, original_request):
    """
    Test new tool against the actual user request that triggered creation.
    """
    
    skill_name = Path(skill_path).name
    
    # Load the skill (simulated here, in reality skills watch handles this)
    skill = load_skill(skill_name)
    
    try:
        # Execute a simple test based on the original request
        test_result = execute_capability_test(skill, original_request)
        
        return {
            "passed": test_result.success,
            "capability_verified": True,
            "result": test_result
        }
    except Exception as e:
        return {
            "passed": False,
            "error": str(e),
            "capability_verified": False
        }
```

### Test Case Generation

```python
def generate_test_cases(requirements):
    """
    Auto-generate test cases based on requirements.
    """
    
    test_code = """
import unittest
from implementation import *

class TestNewTool(unittest.TestCase):
"""
    
    for func in requirements.core_functions:
        test_code += f"""
    def test_{func.name}_basic(self):
        \"\"\"Basic functionality test for {func.name}\"\"\"
        # Arrange
        test_input = {generate_test_input(func)}
        
        # Act
        result = {func.name}({', '.join(f"test_input['{p.name}']" for p in func.params)})
        
        # Assert
        self.assertIsNotNone(result)
        self.assertTrue(result.get("success"))
        
    def test_{func.name}_error_handling(self):
        \"\"\"Error handling test for {func.name}\"\"\"
        # Test with invalid inputs
        with self.assertRaises(Exception):
            {func.name}({generate_invalid_input(func)})
"""
    
    test_code += """

if __name__ == '__main__':
    unittest.main()
"""
    
    return test_code
```

---

## 4. Hot-Reload Integration

### Skills Watch Integration

The skills directory is monitored by OpenClaw's built-in `skills watch`. When new tools are created:

1. **File Created**: New directory + SKILL.md written to `skills/tool-name/`
2. **Watch Detects**: Skills watch daemon notices new files
3. **Auto-Load**: Skill is automatically parsed and loaded into runtime
4. **Registration**: Tool becomes available for immediate use
5. **Logging**: Creation event logged to `tool-creation-log.json`

### How It Works

```python
def create_and_hotload_skill(tool_name, skill_content, metadata):
    """
    Create skill and trigger hot-reload.
    """
    
    # Step 1: Create directory structure
    skill_dir = f"skills/{tool_name}"
    os.makedirs(skill_dir, exist_ok=True)
    
    # Step 2: Write SKILL.md
    write_file(f"{skill_dir}/SKILL.md", skill_content)
    
    # Step 3: Write metadata.json
    write_file(f"{skill_dir}/metadata.json", json.dumps(metadata, indent=2))
    
    # Step 4: Trigger watch (it monitors skills/ directory)
    # OpenClaw's skills watch automatically detects new files
    # No manual trigger needed
    
    # Step 5: Verify load (retry loop)
    for attempt in range(5):
        time.sleep(1)  # Give skills watch time to detect
        
        if is_skill_loaded(tool_name):
            log_success(f"Skill {tool_name} loaded successfully")
            return True
    
    log_error(f"Skill {tool_name} failed to load after 5 attempts")
    return False
```

### Watch Configuration

Ensure skills directory has proper watch configuration (usually auto-enabled):

```json
{
  "watchers": {
    "skills": {
      "enabled": true,
      "paths": ["skills/**/*.md", "skills/**/metadata.json"],
      "debounce_ms": 500,
      "events": ["add", "change"],
      "action": "reload_skills"
    }
  }
}
```

---

## 5. Tool Creation Logging

### tool-creation-log.json Structure

```json
{
  "version": "1.0",
  "created_at": "2026-02-13T08:22:00Z",
  "total_tools_created": 3,
  "tools": [
    {
      "id": "tool_001",
      "name": "pdf-processor",
      "created_at": "2026-02-13T08:25:00Z",
      "triggered_by": "User request: 'Can you read PDF files?'",
      "capability_gap": "domain-gap",
      "gap_description": "No PDF reading capability existed",
      "requirements": {
        "core_functions": ["read_pdf", "extract_text", "parse_tables"],
        "dependencies": ["PyPDF2", "file-reader"],
        "complexity_score": 5.5
      },
      "validation_results": {
        "structure": "PASSED",
        "documentation": "PASSED",
        "syntax": "PASSED",
        "tests": "PASSED (5/5)",
        "real_world_test": "PASSED",
        "all_passed": true
      },
      "hotreload": {
        "status": "success",
        "loaded_at": "2026-02-13T08:25:15Z",
        "retry_attempts": 1
      },
      "status": "active",
      "version": "1.0"
    },
    {
      "id": "tool_002",
      "name": "email-orchestrator",
      "created_at": "2026-02-13T08:45:00Z",
      "triggered_by": "User request: 'Email me X search results daily'",
      "capability_gap": "integration-gap",
      "gap_description": "Needed orchestrator to combine email + search + scheduling",
      "requirements": {
        "core_functions": ["schedule_task", "execute_search", "send_email"],
        "dependencies": ["message", "web_search", "predictive-scheduler"],
        "complexity_score": 4.0
      },
      "validation_results": {
        "all_passed": true
      },
      "status": "active"
    },
    {
      "id": "tool_003",
      "name": "csv-transformer",
      "created_at": "2026-02-13T09:10:00Z",
      "triggered_by": "User request: 'Transform CSV with custom formatting'",
      "capability_gap": "complexity-gap",
      "gap_description": "Existing file-reader insufficient; needed advanced transforms",
      "requirements": {
        "core_functions": ["parse_csv", "apply_transforms", "export_csv"],
        "dependencies": ["csv", "file-writer"],
        "complexity_score": 6.5
      },
      "validation_results": {
        "all_passed": true
      },
      "status": "active"
    }
  ],
  "statistics": {
    "by_gap_type": {
      "domain-gap": 1,
      "integration-gap": 1,
      "complexity-gap": 1,
      "format-gap": 0,
      "workflow-gap": 0
    },
    "average_complexity": 5.33,
    "validation_pass_rate": 1.0,
    "hotreload_success_rate": 1.0
  }
}
```

### Logging Helper

```python
def log_tool_creation(tool_info):
    """
    Add entry to tool-creation-log.json.
    """
    
    log_file = "tool-creation-log.json"
    
    # Load existing log
    if Path(log_file).exists():
        log_data = json.load(open(log_file))
    else:
        log_data = {
            "version": "1.0",
            "created_at": now(),
            "total_tools_created": 0,
            "tools": [],
            "statistics": {
                "by_gap_type": {},
                "average_complexity": 0,
                "validation_pass_rate": 0,
                "hotreload_success_rate": 0
            }
        }
    
    # Add new tool entry
    tool_id = f"tool_{len(log_data['tools']) + 1:03d}"
    tool_info["id"] = tool_id
    tool_info["created_at"] = now()
    
    log_data["tools"].append(tool_info)
    log_data["total_tools_created"] = len(log_data["tools"])
    
    # Update statistics
    log_data["statistics"] = calculate_statistics(log_data["tools"])
    
    # Write back
    with open(log_file, 'w') as f:
        json.dump(log_data, f, indent=2)
    
    return tool_id
```

---

## 6. Usage Workflow

### Step-by-Step: Creating a Tool On-Demand

```python
def create_tool_on_demand(user_request):
    """
    Complete workflow for on-demand tool creation.
    """
    
    print(f"📋 Processing request: {user_request}")
    
    # Step 1: Detect capability gap
    print("🔍 Analyzing capability gap...")
    gap = detect_capability_gap(user_request, get_available_tools())
    
    if not gap["gap_detected"]:
        print(f"✅ No gap detected. Using existing tool: {gap['reason']}")
        return
    
    print(f"⚠️  Gap detected: {gap['missing_capability']}")
    print(f"   Complexity: {gap['complexity_score']}/10")
    print(f"   Suggested tool: {gap['suggested_skill_name']}")
    
    # Step 2: Generate tool
    print(f"\n🛠️  Generating new tool: {gap['suggested_skill_name']}...")
    
    skill_md = generate_skill_md(
        gap['suggested_skill_name'],
        gap['tool_requirements'],
        gap['missing_capability']
    )
    
    metadata = {
        "capability_gap": gap['missing_capability'],
        "intent": "domain-gap",
        "complexity_score": gap['complexity_score'],
        "requirements": gap['tool_requirements']
    }
    
    # Step 3: Validate tool
    print("✔️  Validating new tool...")
    validation_results = validate_new_tool(
        gap['suggested_skill_name'],
        create_and_hotload_skill(gap['suggested_skill_name'], skill_md, metadata)
    )
    
    if not validation_results["all_passed"]:
        print("❌ Validation failed!")
        print(f"   Details: {validation_results}")
        return False
    
    print("✅ All validations passed!")
    
    # Step 4: Log creation
    print("📝 Logging tool creation...")
    tool_id = log_tool_creation({
        "name": gap['suggested_skill_name'],
        "triggered_by": user_request,
        "capability_gap": gap['missing_capability'],
        "requirements": gap['tool_requirements'],
        "validation_results": validation_results,
        "status": "active"
    })
    
    print(f"✨ Tool created successfully! ID: {tool_id}")
    print(f"   Tool is now available for use.")
    
    return True
```

---

## Example: On-Demand Tool Creation

### Scenario: User Requests PDF Processing

**User Request:**
```
"Can you read and extract text from PDF files? I need to process monthly reports."
```

**System Analysis:**
```
Gap Detection:
  - No PDF processing tool currently exists ✓
  - No PDF library integrated ✓
  - Capability gap type: domain-gap
  - Suggested tool name: pdf-processor
  - Complexity score: 6.5/10
```

**Generated SKILL.md:**
```markdown
---
name: pdf-processor
description: Read, parse, and extract text/tables from PDF files
---

# PDF Processor Skill

## Overview
Provides comprehensive PDF handling including text extraction, table parsing,
metadata reading, and batch processing capabilities.

## Core Capabilities

- Extract text from PDF pages
- Parse tables and structured data
- Extract metadata (author, creation date, etc.)
- Batch process multiple PDFs
- Handle encrypted PDFs (with password)

## Implementation Pattern

### Main Functions

```python
def read_pdf(file_path, pages=None):
    """
    Read PDF file and extract all text.
    
    Args:
        file_path (str): Path to PDF file
        pages (list): Specific pages to extract (None = all)
    
    Returns:
        dict: {
            "success": bool,
            "text": str,
            "page_count": int,
            "metadata": dict
        }
    """
    ...

def extract_tables(file_path):
    """Extract tables from PDF as structured data."""
    ...

def batch_process(directory_path):
    """Process all PDFs in a directory."""
    ...
```

## Usage Examples

```python
# Extract text from single PDF
result = read_pdf("monthly_report.pdf")
print(result["text"])

# Extract tables
tables = extract_tables("monthly_report.pdf")
for table in tables:
    print(table)

# Batch process reports directory
batch_result = batch_process("./reports/")
print(f"Processed {batch_result['total_files']} files")
```

## Testing

5 unit tests:
✅ test_read_pdf_basic
✅ test_read_pdf_specific_pages
✅ test_extract_tables
✅ test_batch_process
✅ test_error_handling
```

**Validation:**
```
✅ Structure validation: PASSED
✅ Documentation validation: PASSED
✅ Syntax check: PASSED
✅ Integration check: PASSED
✅ Unit tests (5/5): PASSED
✅ Real-world test: PASSED
  - Successfully read provided PDF
  - Extracted all text correctly
  - Parsed 3 tables successfully
```

**Hot-Load:**
```
⏳ Waiting for skills watch to detect new tool...
✅ Tool loaded successfully in 1.2 seconds
✅ Available as "pdf-processor" skill
```

**Log Entry:**
```json
{
  "id": "tool_001",
  "name": "pdf-processor",
  "triggered_by": "User request: 'Can you read and extract text from PDF files?'",
  "capability_gap": "domain-gap",
  "complexity_score": 6.5,
  "validation_results": {
    "all_passed": true
  },
  "status": "active"
}
```

**User Response:**
```
✨ Done! I've created a new PDF processing tool for you.

You can now:
- Extract text from PDFs: pdf-processor::read_pdf("file.pdf")
- Parse tables: pdf-processor::extract_tables("file.pdf")
- Batch process: pdf-processor::batch_process("./folder/")

Your monthly reports are ready to process! 📄
```

---

## Integration Points

### Capability Gap Detection

Detects when user requests exceed current tools:
- Scans available skills in `skills/` directory
- Analyzes intent of user request
- Checks for domain gaps, integration gaps, etc.
- Calculates complexity of creating solution

### Tool Generation

Creates complete skill package:
- Generates SKILL.md with full documentation
- Includes implementation patterns
- Creates test case templates
- Writes metadata.json

### Validation Pipeline

Comprehensive testing before deployment:
- Structure validation (file layout)
- Documentation validation (required sections)
- Syntax validation (if code present)
- Unit test execution
- Real-world test against original request

### Hot-Reload

Automatic skill loading via OpenClaw's skills watch:
- Skills directory monitored for changes
- New skills auto-loaded within 1-2 seconds
- No manual restart required
- Immediate availability

### Logging

Complete audit trail in `tool-creation-log.json`:
- What tools were created
- When and why
- Gap types and complexity
- Validation results
- Usage statistics

---

## Performance Notes

- **Tool Creation Time**: 10-30 seconds (depending on complexity)
- **Hot-Load Time**: 1-2 seconds
- **Validation Time**: 5-10 seconds
- **Success Rate Target**: 95%+ auto-recovery on failures

---

## Future Enhancements (v2.0)

- Tool versioning and rollback
- Community tool marketplace
- AI-powered code generation for implementation
- Performance profiling and optimization suggestions
- Dependency conflict detection
- Automated documentation generation from code
- Tool discoverability and search
- User feedback integration for tool improvements

