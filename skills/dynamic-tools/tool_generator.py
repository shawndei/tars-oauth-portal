"""
Tool Generator - Create new tools on-demand
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime


class ToolGenerator:
    """
    Generates new tool/skill packages on-demand.
    
    Features:
    - Generate SKILL.md from requirements
    - Create implementation patterns
    - Generate test cases
    - Create metadata files
    - Set up directory structure
    """
    
    def __init__(self, skills_dir: str = "skills"):
        self.skills_dir = Path(skills_dir)
    
    def generate_skill_md(self, tool_name: str, requirements: dict, gap_info: dict) -> str:
        """
        Generate SKILL.md content.
        
        Args:
            tool_name: Name of the tool
            requirements: Requirements dictionary
            gap_info: Gap detection information
        
        Returns:
            SKILL.md content as string
        """
        # Extract info
        description = gap_info.get("missing_capability", f"{tool_name} skill")
        gap_type = gap_info.get("gap_type", "domain-gap")
        complexity = gap_info.get("complexity_score", 5.0)
        core_functions = requirements.get("core_functions", [])
        dependencies = requirements.get("dependencies", [])
        success_criteria = requirements.get("success_criteria", [])
        
        # Build SKILL.md
        skill_md = f"""---
name: {tool_name}
description: {description}
generated_at: {datetime.now().isoformat()}
capability_gap: {gap_type}
complexity: {complexity}
---

# {self._format_title(tool_name)}

## Overview

{self._generate_overview(tool_name, description, gap_info)}

## Core Capabilities

{self._generate_capabilities(core_functions, requirements)}

## Implementation Pattern

{self._generate_implementation_pattern(tool_name, core_functions, requirements)}

## Integration Points

{self._generate_integration_points(dependencies)}

## Usage Examples

{self._generate_usage_examples(tool_name, core_functions)}

## Testing

{self._generate_test_section(tool_name, core_functions)}

## Performance Notes

{self._generate_performance_notes(complexity)}

## Future Enhancements

{self._generate_future_enhancements(tool_name, requirements)}
"""
        
        return skill_md
    
    def _format_title(self, tool_name: str) -> str:
        """Format tool name as title."""
        return " ".join(word.capitalize() for word in tool_name.split("-"))
    
    def _generate_overview(self, tool_name: str, description: str, gap_info: dict) -> str:
        """Generate overview section."""
        overview = f"""This skill provides {description}.

**Why This Tool Was Created:**
- Capability Gap: {gap_info.get('gap_type', 'N/A')}
- Confidence: {gap_info.get('confidence', 0.0):.1%}
- Generated to fulfill unmet capability requirements

The tool is designed to be modular, extensible, and integrate seamlessly with existing OpenClaw skills."""
        
        return overview
    
    def _generate_capabilities(self, core_functions: List[str], requirements: dict) -> str:
        """Generate capabilities section."""
        capabilities = "This tool provides the following core capabilities:\n\n"
        
        for func in core_functions:
            # Generate human-readable description
            func_readable = func.replace("_", " ").title()
            capabilities += f"- **{func_readable}**: Handles {func.replace('_', ' ')} operations\n"
        
        # Add success criteria
        if requirements.get("success_criteria"):
            capabilities += "\n**Success Criteria:**\n\n"
            for criterion in requirements["success_criteria"]:
                capabilities += f"- {criterion}\n"
        
        return capabilities
    
    def _generate_implementation_pattern(self, tool_name: str, core_functions: List[str], requirements: dict) -> str:
        """Generate implementation pattern section."""
        pattern = "### Main Functions\n\n```python\n"
        
        for func in core_functions[:5]:  # Limit to 5 functions
            pattern += f'''
def {func}(input_data, options=None):
    """
    {func.replace("_", " ").title()} operation.
    
    Args:
        input_data: Input data to process
        options: Optional configuration dict
    
    Returns:
        dict: {{
            "success": bool,
            "data": Any,
            "metadata": dict
        }}
    """
    # Validate inputs
    if not input_data:
        return {{"success": False, "error": "Invalid input"}}
    
    # Process data
    try:
        result = _process_{func}(input_data, options)
        
        return {{
            "success": True,
            "data": result,
            "metadata": {{
                "timestamp": datetime.now().isoformat(),
                "function": "{func}"
            }}
        }}
    except Exception as e:
        return {{
            "success": False,
            "error": str(e)
        }}

'''
        
        pattern += "```\n"
        
        return pattern
    
    def _generate_integration_points(self, dependencies: List[str]) -> str:
        """Generate integration points section."""
        if not dependencies:
            return "This tool operates independently with no external dependencies.\n"
        
        integration = "This tool integrates with:\n\n"
        
        for dep in dependencies[:5]:  # Limit to 5
            integration += f"- **{dep}**: Used for {dep.lower()} operations\n"
        
        integration += "\n**Integration Pattern:**\n\n"
        integration += "```python\n"
        integration += "# Example integration\n"
        integration += f"from skills.{dependencies[0] if dependencies else 'other_tool'} import process\n\n"
        integration += "result = process(data)\n"
        integration += "# Use result in this tool\n"
        integration += "```\n"
        
        return integration
    
    def _generate_usage_examples(self, tool_name: str, core_functions: List[str]) -> str:
        """Generate usage examples section."""
        examples = "### Basic Usage\n\n```python\n"
        
        # Example 1: Basic usage
        if core_functions:
            func = core_functions[0]
            examples += f'''# Import the tool
from skills.{tool_name} import {func}

# Basic usage
result = {func}(input_data={{"example": "data"}})

if result["success"]:
    print("Result:", result["data"])
else:
    print("Error:", result["error"])
'''
        
        examples += "```\n\n"
        
        # Example 2: Advanced usage
        if len(core_functions) > 1:
            examples += "### Advanced Usage\n\n```python\n"
            examples += f'''# Chain multiple functions
from skills.{tool_name} import *

data = {{"input": "example"}}

# Step 1
result1 = {core_functions[0]}(data)

# Step 2
if result1["success"]:
    result2 = {core_functions[1]}(result1["data"])
    print("Final result:", result2)
'''
            examples += "```\n"
        
        return examples
    
    def _generate_test_section(self, tool_name: str, core_functions: List[str]) -> str:
        """Generate testing section."""
        tests = f"**Test Coverage:**\n\n"
        
        for func in core_functions[:5]:
            tests += f"- `test_{func}_basic`: Basic functionality test\n"
            tests += f"- `test_{func}_error_handling`: Error handling test\n"
        
        tests += f"\n**Run Tests:**\n\n"
        tests += "```bash\n"
        tests += f"python skills/{tool_name}/tests.py\n"
        tests += "```\n"
        
        return tests
    
    def _generate_performance_notes(self, complexity: float) -> str:
        """Generate performance notes section."""
        if complexity < 4:
            perf_level = "lightweight and fast"
            notes = "This tool has minimal overhead and performs efficiently."
        elif complexity < 7:
            perf_level = "moderate complexity"
            notes = "This tool performs well for typical use cases. Consider caching for repeated operations."
        else:
            perf_level = "complex"
            notes = "This tool handles complex operations. Performance may vary based on input size. Use async operations for large datasets."
        
        return f"**Complexity Level:** {perf_level} ({complexity}/10)\n\n{notes}\n"
    
    def _generate_future_enhancements(self, tool_name: str, requirements: dict) -> str:
        """Generate future enhancements section."""
        enhancements = """Planned improvements for v2.0:

- Performance optimization and caching
- Extended error handling and validation
- Batch processing support
- Async/await pattern support
- Integration with additional tools
- Enhanced documentation and examples
"""
        
        return enhancements
    
    def generate_metadata(self, tool_name: str, requirements: dict, gap_info: dict) -> dict:
        """
        Generate metadata.json content.
        
        Args:
            tool_name: Name of the tool
            requirements: Requirements dictionary
            gap_info: Gap detection information
        
        Returns:
            Metadata dictionary
        """
        metadata = {
            "skill_name": tool_name,
            "created_by": "dynamic-tools",
            "created_at": datetime.now().isoformat(),
            "capability_gap": gap_info.get("missing_capability", ""),
            "gap_type": gap_info.get("gap_type", "domain-gap"),
            "requirements": {
                "core_functions": requirements.get("core_functions", []),
                "dependencies": requirements.get("dependencies", []),
                "complexity_score": gap_info.get("complexity_score", 5.0),
                "estimated_build_time": self._estimate_build_time(gap_info.get("complexity_score", 5.0))
            },
            "testing": {
                "unit_tests": len(requirements.get("core_functions", [])) * 2,
                "integration_tests": 0,
                "pass_rate": 0.0
            },
            "status": "active",
            "version": "1.0",
            "hotreload_enabled": True,
            "last_tested": None
        }
        
        return metadata
    
    def _estimate_build_time(self, complexity: float) -> str:
        """Estimate build time from complexity."""
        if complexity < 4:
            return "15-20 minutes"
        elif complexity < 7:
            return "30-45 minutes"
        else:
            return "1-2 hours"
    
    def generate_tests(self, tool_name: str, core_functions: List[str]) -> str:
        """
        Generate tests.py content.
        
        Args:
            tool_name: Name of the tool
            core_functions: List of core function names
        
        Returns:
            tests.py content as string
        """
        tests = f'''"""
Tests for {tool_name} skill
"""

import unittest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from implementation import *
except ImportError:
    print("Warning: implementation.py not found. Tests may fail.")


class Test{self._format_title(tool_name).replace(" ", "")}(unittest.TestCase):
    """Test cases for {tool_name} skill."""
    
'''
        
        # Generate test methods
        for func in core_functions[:5]:
            tests += f'''
    def test_{func}_basic(self):
        """Basic functionality test for {func}."""
        # Arrange
        test_input = {{"test": "data"}}
        
        # Act
        result = {func}(test_input)
        
        # Assert
        self.assertIsNotNone(result)
        self.assertIn("success", result)
    
    def test_{func}_error_handling(self):
        """Error handling test for {func}."""
        # Test with invalid input
        result = {func}(None)
        
        # Should return error
        self.assertFalse(result.get("success", True))
        self.assertIn("error", result)
'''
        
        tests += '''

if __name__ == '__main__':
    unittest.main()
'''
        
        return tests
    
    def create_tool(self, tool_name: str, requirements: dict, gap_info: dict) -> bool:
        """
        Create complete tool package.
        
        Args:
            tool_name: Name of the tool
            requirements: Requirements dictionary
            gap_info: Gap detection information
        
        Returns:
            True if created successfully
        """
        # Create tool directory
        tool_dir = self.skills_dir / tool_name
        tool_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Generate SKILL.md
            skill_md = self.generate_skill_md(tool_name, requirements, gap_info)
            skill_md_path = tool_dir / "SKILL.md"
            with open(skill_md_path, 'w', encoding='utf-8') as f:
                f.write(skill_md)
            
            # Generate metadata.json
            metadata = self.generate_metadata(tool_name, requirements, gap_info)
            metadata_path = tool_dir / "metadata.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            # Generate tests.py
            tests = self.generate_tests(tool_name, requirements.get("core_functions", []))
            tests_path = tool_dir / "tests.py"
            with open(tests_path, 'w', encoding='utf-8') as f:
                f.write(tests)
            
            # Create README.md
            readme = f"# {self._format_title(tool_name)}\n\nSee SKILL.md for full documentation.\n"
            readme_path = tool_dir / "README.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme)
            
            return True
            
        except Exception as e:
            print(f"Error creating tool: {e}")
            return False


# Convenience function
def create_tool_from_gap(gap_info: dict, skills_dir: str = "skills") -> bool:
    """
    Create tool from gap detection result.
    
    Args:
        gap_info: Gap detection result dictionary
        skills_dir: Skills directory path
    
    Returns:
        True if created successfully
    """
    generator = ToolGenerator(skills_dir)
    
    tool_name = gap_info.get("suggested_skill_name", "new-tool")
    requirements = gap_info.get("tool_requirements", {})
    
    return generator.create_tool(tool_name, requirements, gap_info)
