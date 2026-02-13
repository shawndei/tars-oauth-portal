"""
Comprehensive test suite for dynamic-tools skill
"""

import unittest
import sys
import tempfile
import shutil
from pathlib import Path
import json
import time

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from tool_loader import ToolLoader, ToolVersion
from tool_watcher import ToolWatcher, FileWatcher
from capability_detector import CapabilityDetector, Intent
from tool_generator import ToolGenerator
from tool_validator import ToolValidator, ValidationResult
from orchestrator import DynamicToolOrchestrator, CreationLog


class TestToolLoader(unittest.TestCase):
    """Test ToolLoader functionality."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = tempfile.mkdtemp()
        self.skills_dir = Path(self.test_dir) / "skills"
        self.skills_dir.mkdir()
        
        # Create a test tool
        test_tool_dir = self.skills_dir / "test-tool"
        test_tool_dir.mkdir()
        
        # Write SKILL.md
        skill_md = """---
name: test-tool
description: Test tool
---

# Test Tool

## Overview
This is a test tool.
"""
        (test_tool_dir / "SKILL.md").write_text(skill_md)
        
        # Write metadata.json
        metadata = {
            "skill_name": "test-tool",
            "version": "1.0",
            "status": "active"
        }
        (test_tool_dir / "metadata.json").write_text(json.dumps(metadata))
        
        self.loader = ToolLoader(str(self.skills_dir))
    
    def tearDown(self):
        """Clean up test environment."""
        shutil.rmtree(self.test_dir)
    
    def test_discover_tools(self):
        """Test tool discovery."""
        discovered = self.loader.discover_tools()
        self.assertIn("test-tool", discovered)
        self.assertEqual(len(discovered["test-tool"]), 1)
        self.assertEqual(discovered["test-tool"][0]["version"], "1.0")
    
    def test_load_tool(self):
        """Test loading a tool."""
        success = self.loader.load_tool("test-tool")
        self.assertTrue(success)
        self.assertTrue(self.loader.is_tool_loaded("test-tool"))
    
    def test_unload_tool(self):
        """Test unloading a tool."""
        self.loader.load_tool("test-tool")
        success = self.loader.unload_tool("test-tool")
        self.assertTrue(success)
        self.assertFalse(self.loader.is_tool_loaded("test-tool"))
    
    def test_reload_tool(self):
        """Test reloading a tool."""
        self.loader.load_tool("test-tool")
        success = self.loader.reload_tool("test-tool")
        self.assertTrue(success)
        self.assertTrue(self.loader.is_tool_loaded("test-tool"))
    
    def test_list_tools(self):
        """Test listing tools."""
        self.loader.load_tool("test-tool")
        loaded = self.loader.list_loaded_tools()
        self.assertIn("test-tool", loaded)
        
        available = self.loader.list_available_tools()
        self.assertIn("test-tool", available)
    
    def test_get_tool_info(self):
        """Test getting tool info."""
        self.loader.load_tool("test-tool")
        info = self.loader.get_tool_info("test-tool")
        
        self.assertIsNotNone(info)
        self.assertEqual(info["name"], "test-tool")
        self.assertEqual(info["version"], "1.0")
        self.assertEqual(info["status"], "loaded")
    
    def test_load_nonexistent_tool(self):
        """Test loading non-existent tool."""
        success = self.loader.load_tool("nonexistent")
        self.assertFalse(success)
    
    def test_version_fallback(self):
        """Test version fallback."""
        # Create another version
        test_tool_dir_v2 = self.skills_dir / "test-tool-v2"
        test_tool_dir_v2.mkdir()
        
        skill_md = """---
name: test-tool-v2
description: Test tool v2
---
# Test Tool v2
"""
        (test_tool_dir_v2 / "SKILL.md").write_text(skill_md)
        
        metadata = {
            "skill_name": "test-tool-v2",
            "version": "2.0",
            "status": "active"
        }
        (test_tool_dir_v2 / "metadata.json").write_text(json.dumps(metadata))
        
        # Load with fallback
        success = self.loader.load_with_fallback("test-tool")
        self.assertTrue(success)


class TestToolWatcher(unittest.TestCase):
    """Test ToolWatcher functionality."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = tempfile.mkdtemp()
        self.skills_dir = Path(self.test_dir) / "skills"
        self.skills_dir.mkdir()
        
        self.watcher = ToolWatcher(str(self.skills_dir))
    
    def tearDown(self):
        """Clean up test environment."""
        shutil.rmtree(self.test_dir)
    
    def test_file_watcher_detects_changes(self):
        """Test FileWatcher detects file changes."""
        test_file = Path(self.test_dir) / "test.txt"
        test_file.write_text("initial content")
        
        watcher = FileWatcher(test_file)
        
        # No change initially
        self.assertFalse(watcher.has_changed())
        
        # Modify file
        time.sleep(0.1)  # Ensure timestamp changes
        test_file.write_text("modified content")
        
        # Should detect change
        self.assertTrue(watcher.has_changed())
        
        # No change after first detection
        self.assertFalse(watcher.has_changed())
    
    def test_watch_new_tool(self):
        """Test watcher detects new tools."""
        # Create new tool
        new_tool_dir = self.skills_dir / "new-tool"
        new_tool_dir.mkdir()
        
        skill_md = """---
name: new-tool
---
# New Tool
"""
        (new_tool_dir / "SKILL.md").write_text(skill_md)
        
        # Check for changes
        changes = self.watcher.check()
        
        # Should detect new tool
        self.assertTrue(len(self.watcher.get_watched_tools()) > 0)
    
    def test_event_callbacks(self):
        """Test event callbacks."""
        callback_called = {"value": False}
        
        def on_tool_added(tool_name, details):
            callback_called["value"] = True
        
        self.watcher.on("tool_added", on_tool_added)
        
        # Create new tool
        new_tool_dir = self.skills_dir / "callback-tool"
        new_tool_dir.mkdir()
        (new_tool_dir / "SKILL.md").write_text("---\nname: callback-tool\n---\n# Test")
        
        # Trigger scan
        self.watcher.check()
        
        self.assertTrue(callback_called["value"])


class TestCapabilityDetector(unittest.TestCase):
    """Test CapabilityDetector functionality."""
    
    def setUp(self):
        """Set up detector."""
        self.detector = CapabilityDetector()
    
    def test_extract_intent_pdf(self):
        """Test intent extraction for PDF request."""
        request = "Can you read PDF files?"
        intent = self.detector.extract_intent(request)
        
        self.assertIn("PDF", intent.entities)
        self.assertEqual(intent.action, "read")
    
    def test_extract_intent_data_transform(self):
        """Test intent extraction for data transformation."""
        request = "Convert CSV to JSON format"
        intent = self.detector.extract_intent(request)
        
        self.assertIn("CSV", intent.entities)
        self.assertIn("JSON", intent.entities)
        self.assertEqual(intent.action, "convert")
    
    def test_find_matching_tools(self):
        """Test finding matching tools."""
        available_tools = ["pdf-reader", "csv-parser", "file-handler"]
        
        intent = Intent("file-handling", "read", ["PDF"], ["read", "file"])
        matches = self.detector.find_matching_tools(intent, available_tools)
        
        self.assertTrue(len(matches) > 0)
        self.assertEqual(matches[0]["name"], "pdf-reader")
    
    def test_detect_gap_no_match(self):
        """Test gap detection when no match exists."""
        request = "Can you read PDF files?"
        available_tools = ["csv-parser", "json-handler"]
        
        result = self.detector.detect_gap(request, available_tools)
        
        self.assertTrue(result["gap_detected"])
        self.assertIn("pdf", result["suggested_skill_name"].lower())
    
    def test_detect_gap_with_match(self):
        """Test gap detection when match exists."""
        request = "Can you read PDF files?"
        available_tools = ["pdf-reader", "pdf-parser", "pdf-file-reader"]
        
        result = self.detector.detect_gap(request, available_tools)
        
        # With multiple matching tools, should either not detect gap or have low confidence
        if result["gap_detected"]:
            # If gap detected with good matches, confidence should be low
            self.assertLess(result.get("confidence", 1.0), 0.7)
    
    def test_complexity_estimation(self):
        """Test complexity estimation."""
        intent = Intent("data-transform", "convert", ["CSV", "JSON", "XML"], [])
        complexity = self.detector._estimate_complexity(intent, "domain-gap")
        
        self.assertGreater(complexity, 5.0)
        self.assertLessEqual(complexity, 10.0)
    
    def test_tool_name_generation(self):
        """Test tool name generation."""
        intent = Intent("file-handling", "read", ["PDF"], [])
        name = self.detector._generate_tool_name(intent)
        
        self.assertIn("pdf", name.lower())
        self.assertIn("read", name.lower())


class TestToolGenerator(unittest.TestCase):
    """Test ToolGenerator functionality."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = tempfile.mkdtemp()
        self.skills_dir = Path(self.test_dir) / "skills"
        self.skills_dir.mkdir()
        
        self.generator = ToolGenerator(str(self.skills_dir))
    
    def tearDown(self):
        """Clean up test environment."""
        shutil.rmtree(self.test_dir)
    
    def test_generate_skill_md(self):
        """Test SKILL.md generation."""
        tool_name = "test-tool"
        requirements = {
            "core_functions": ["read_data", "process_data"],
            "dependencies": ["file-handler"],
            "success_criteria": ["Reads data correctly"]
        }
        gap_info = {
            "missing_capability": "Test capability",
            "gap_type": "domain-gap",
            "complexity_score": 5.0,
            "confidence": 0.8
        }
        
        skill_md = self.generator.generate_skill_md(tool_name, requirements, gap_info)
        
        self.assertIn("name: test-tool", skill_md)
        self.assertIn("# Test Tool", skill_md)
        self.assertIn("## Overview", skill_md)
        self.assertIn("## Core Capabilities", skill_md)
        self.assertIn("read_data", skill_md)
    
    def test_generate_metadata(self):
        """Test metadata generation."""
        tool_name = "test-tool"
        requirements = {"core_functions": ["func1", "func2"]}
        gap_info = {"gap_type": "domain-gap", "complexity_score": 6.0}
        
        metadata = self.generator.generate_metadata(tool_name, requirements, gap_info)
        
        self.assertEqual(metadata["skill_name"], "test-tool")
        self.assertEqual(metadata["version"], "1.0")
        self.assertEqual(metadata["status"], "active")
        self.assertIn("created_at", metadata)
    
    def test_generate_tests(self):
        """Test test generation."""
        tool_name = "test-tool"
        core_functions = ["read_data", "process_data"]
        
        tests = self.generator.generate_tests(tool_name, core_functions)
        
        self.assertIn("class TestTestTool", tests)
        self.assertIn("def test_read_data_basic", tests)
        self.assertIn("def test_process_data_basic", tests)
    
    def test_create_tool(self):
        """Test complete tool creation."""
        tool_name = "generated-tool"
        requirements = {
            "core_functions": ["func1"],
            "dependencies": [],
            "success_criteria": []
        }
        gap_info = {
            "missing_capability": "Test",
            "gap_type": "domain-gap",
            "complexity_score": 5.0
        }
        
        success = self.generator.create_tool(tool_name, requirements, gap_info)
        
        self.assertTrue(success)
        
        # Verify files created
        tool_dir = self.skills_dir / tool_name
        self.assertTrue(tool_dir.exists())
        self.assertTrue((tool_dir / "SKILL.md").exists())
        self.assertTrue((tool_dir / "metadata.json").exists())
        self.assertTrue((tool_dir / "tests.py").exists())


class TestToolValidator(unittest.TestCase):
    """Test ToolValidator functionality."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = tempfile.mkdtemp()
        self.skills_dir = Path(self.test_dir) / "skills"
        self.skills_dir.mkdir()
        
        # Create a valid test tool
        self.tool_name = "valid-tool"
        tool_dir = self.skills_dir / self.tool_name
        tool_dir.mkdir()
        
        skill_md = """---
name: valid-tool
description: Valid test tool
---

# Valid Tool

## Overview
This is a valid test tool designed for comprehensive testing of the dynamic tools system.
It provides multiple capabilities and serves as a reference implementation for tool validation.

## Core Capabilities
- Capability 1: Process data efficiently
- Capability 2: Validate input formats
- Capability 3: Export results in multiple formats

## Implementation Pattern

### Main Functions

```python
def process_data(input_data):
    '''Process input data and return results.'''
    return {"success": True, "data": input_data}

def validate_input(data):
    '''Validate input data format.'''
    if not data:
        return False
    return True
```

## Usage Examples

### Basic Usage

```python
from skills.valid_tool import process_data

result = process_data({"test": "data"})
print(result)
```

### Advanced Usage

```python
# Chain operations
data = {"input": "example"}
if validate_input(data):
    result = process_data(data)
    print(result["data"])
```
"""
        (tool_dir / "SKILL.md").write_text(skill_md)
        
        metadata = {
            "skill_name": "valid-tool",
            "created_by": "test",
            "created_at": "2026-01-01T00:00:00",
            "version": "1.0",
            "status": "active"
        }
        (tool_dir / "metadata.json").write_text(json.dumps(metadata))
        
        self.validator = ToolValidator(str(self.skills_dir))
    
    def tearDown(self):
        """Clean up test environment."""
        shutil.rmtree(self.test_dir)
    
    def test_validate_structure(self):
        """Test structure validation."""
        result = self.validator.validate_structure(self.skills_dir / self.tool_name)
        
        self.assertTrue(result.passed)
        self.assertTrue(result.details["has_skill_md"])
        self.assertTrue(result.details["has_metadata"])
    
    def test_validate_documentation(self):
        """Test documentation validation."""
        result = self.validator.validate_documentation(self.skills_dir / self.tool_name)
        
        self.assertTrue(result.passed)
        self.assertTrue(result.details["has_overview"])
        self.assertTrue(result.details["has_core_capabilities"])
    
    def test_validate_metadata(self):
        """Test metadata validation."""
        result = self.validator.validate_metadata(self.skills_dir / self.tool_name)
        
        self.assertTrue(result.passed)
        self.assertTrue(result.details["has_skill_name"])
        self.assertTrue(result.details["has_version"])
    
    def test_validate_syntax_valid(self):
        """Test syntax validation with valid Python."""
        py_file = self.skills_dir / "test.py"
        py_file.write_text("def test():\n    pass\n")
        
        result = self.validator.validate_syntax(py_file)
        self.assertTrue(result.passed)
    
    def test_validate_syntax_invalid(self):
        """Test syntax validation with invalid Python."""
        py_file = self.skills_dir / "invalid.py"
        py_file.write_text("def test(\n    pass\n")  # Missing closing paren
        
        result = self.validator.validate_syntax(py_file)
        self.assertFalse(result.passed)
    
    def test_validate_tool_complete(self):
        """Test complete tool validation."""
        results = self.validator.validate_tool(self.tool_name)
        
        self.assertTrue(results["all_passed"])
        self.assertIn("structure", results["validations"])
        self.assertIn("documentation", results["validations"])
        self.assertIn("metadata", results["validations"])


class TestOrchestrator(unittest.TestCase):
    """Test DynamicToolOrchestrator functionality."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = tempfile.mkdtemp()
        self.skills_dir = Path(self.test_dir) / "skills"
        self.skills_dir.mkdir()
        self.log_file = Path(self.test_dir) / "test-log.json"
        
        self.orchestrator = DynamicToolOrchestrator(
            str(self.skills_dir),
            str(self.log_file)
        )
    
    def tearDown(self):
        """Clean up test environment."""
        shutil.rmtree(self.test_dir)
    
    def test_creation_log(self):
        """Test CreationLog functionality."""
        log = CreationLog(str(self.log_file))
        
        tool_id = log.add_entry({
            "name": "test-tool",
            "capability_gap_type": "domain-gap",
            "complexity_score": 5.0,
            "validation_passed": True,
            "hotreload_success": True
        })
        
        self.assertIsNotNone(tool_id)
        self.assertTrue(tool_id.startswith("tool_"))
        
        tools = log.get_tools()
        self.assertEqual(len(tools), 1)
        self.assertEqual(tools[0]["name"], "test-tool")
    
    def test_export_state(self):
        """Test state export."""
        state = self.orchestrator.export_state()
        
        self.assertIn("skills_dir", state)
        self.assertIn("available_tools", state)
        self.assertIn("statistics", state)


# Test runner
if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
