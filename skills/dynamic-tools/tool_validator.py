"""
Tool Validator - Validate newly created tools before deployment
"""

import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
import json


class ValidationResult:
    """Represents validation result."""
    
    def __init__(self, check_name: str, passed: bool, details: dict = None):
        self.check_name = check_name
        self.passed = passed
        self.details = details or {}
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "check": self.check_name,
            "passed": self.passed,
            "details": self.details
        }


class ToolValidator:
    """
    Validates newly created tools before they go live.
    
    Validation phases:
    1. Structure validation (required files exist)
    2. Documentation validation (SKILL.md has required sections)
    3. Metadata validation (metadata.json is valid)
    4. Syntax validation (Python files are valid syntax)
    5. Test execution (run test suite if exists)
    """
    
    # Required sections in SKILL.md
    REQUIRED_SECTIONS = [
        "Overview",
        "Core Capabilities",
        "Implementation Pattern",
        "Usage Examples"
    ]
    
    def __init__(self, skills_dir: str = "skills"):
        self.skills_dir = Path(skills_dir)
    
    def validate_tool(self, tool_name: str) -> Dict[str, Any]:
        """
        Run complete validation pipeline.
        
        Args:
            tool_name: Name of the tool to validate
        
        Returns:
            Validation results dictionary
        """
        tool_path = self.skills_dir / tool_name
        
        if not tool_path.exists():
            return {
                "tool_name": tool_name,
                "all_passed": False,
                "error": "Tool directory does not exist"
            }
        
        results = {
            "tool_name": tool_name,
            "tool_path": str(tool_path),
            "validations": {},
            "all_passed": True
        }
        
        # Phase 1: Structure validation
        structure_result = self.validate_structure(tool_path)
        results["validations"]["structure"] = structure_result.to_dict()
        
        # Phase 2: Documentation validation
        doc_result = self.validate_documentation(tool_path)
        results["validations"]["documentation"] = doc_result.to_dict()
        
        # Phase 3: Metadata validation
        metadata_result = self.validate_metadata(tool_path)
        results["validations"]["metadata"] = metadata_result.to_dict()
        
        # Phase 4: Syntax validation (if implementation exists)
        impl_path = tool_path / "implementation.py"
        if impl_path.exists():
            syntax_result = self.validate_syntax(impl_path)
            results["validations"]["syntax"] = syntax_result.to_dict()
        
        # Phase 5: Test execution (if tests exist)
        tests_path = tool_path / "tests.py"
        if tests_path.exists():
            test_result = self.run_tests(tests_path)
            results["validations"]["tests"] = test_result.to_dict()
        
        # Determine overall result
        results["all_passed"] = all(
            v["passed"] for v in results["validations"].values()
        )
        
        return results
    
    def validate_structure(self, tool_path: Path) -> ValidationResult:
        """
        Validate tool directory structure.
        
        Args:
            tool_path: Path to tool directory
        
        Returns:
            ValidationResult
        """
        checks = {}
        
        # Check for required files
        skill_md = tool_path / "SKILL.md"
        checks["has_skill_md"] = skill_md.exists()
        
        metadata_json = tool_path / "metadata.json"
        checks["has_metadata"] = metadata_json.exists()
        
        # Check directory is readable
        checks["directory_readable"] = os.access(tool_path, os.R_OK)
        
        # Check front matter in SKILL.md
        if checks["has_skill_md"]:
            try:
                with open(skill_md, 'r', encoding='utf-8') as f:
                    content = f.read()
                    checks["front_matter_valid"] = content.startswith("---") and content.count("---") >= 2
            except Exception:
                checks["front_matter_valid"] = False
        else:
            checks["front_matter_valid"] = False
        
        passed = all(checks.values())
        
        return ValidationResult("structure", passed, checks)
    
    def validate_documentation(self, tool_path: Path) -> ValidationResult:
        """
        Validate SKILL.md documentation.
        
        Args:
            tool_path: Path to tool directory
        
        Returns:
            ValidationResult
        """
        skill_md = tool_path / "SKILL.md"
        
        if not skill_md.exists():
            return ValidationResult("documentation", False, {"error": "SKILL.md not found"})
        
        try:
            with open(skill_md, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return ValidationResult("documentation", False, {"error": str(e)})
        
        checks = {}
        
        # Check for required sections
        for section in self.REQUIRED_SECTIONS:
            checks[f"has_{section.lower().replace(' ', '_')}"] = f"## {section}" in content
        
        # Check for sufficient content
        checks["sufficient_content"] = len(content) > 500
        
        # Check for code examples
        checks["has_code_examples"] = "```" in content
        
        passed = all(checks.values())
        
        return ValidationResult("documentation", passed, checks)
    
    def validate_metadata(self, tool_path: Path) -> ValidationResult:
        """
        Validate metadata.json.
        
        Args:
            tool_path: Path to tool directory
        
        Returns:
            ValidationResult
        """
        metadata_json = tool_path / "metadata.json"
        
        if not metadata_json.exists():
            return ValidationResult("metadata", False, {"error": "metadata.json not found"})
        
        try:
            with open(metadata_json, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
        except json.JSONDecodeError as e:
            return ValidationResult("metadata", False, {"error": f"Invalid JSON: {str(e)}"})
        except Exception as e:
            return ValidationResult("metadata", False, {"error": str(e)})
        
        checks = {}
        
        # Check for required fields
        required_fields = ["skill_name", "created_by", "created_at", "version", "status"]
        for field in required_fields:
            checks[f"has_{field}"] = field in metadata
        
        # Validate field types
        if "version" in metadata:
            checks["version_valid"] = isinstance(metadata["version"], str) and len(metadata["version"]) > 0
        
        if "status" in metadata:
            checks["status_valid"] = metadata["status"] in ["active", "inactive", "deprecated"]
        
        passed = all(checks.values())
        
        return ValidationResult("metadata", passed, checks)
    
    def validate_syntax(self, file_path: Path) -> ValidationResult:
        """
        Validate Python syntax.
        
        Args:
            file_path: Path to Python file
        
        Returns:
            ValidationResult
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            
            # Compile to check syntax
            compile(code, str(file_path), 'exec')
            
            return ValidationResult("syntax", True, {"message": "Valid Python syntax"})
            
        except SyntaxError as e:
            return ValidationResult("syntax", False, {
                "error": "Syntax error",
                "line": e.lineno,
                "message": str(e)
            })
        except Exception as e:
            return ValidationResult("syntax", False, {"error": str(e)})
    
    def run_tests(self, tests_path: Path, timeout: int = 30) -> ValidationResult:
        """
        Run test suite.
        
        Args:
            tests_path: Path to tests.py
            timeout: Timeout in seconds
        
        Returns:
            ValidationResult
        """
        try:
            result = subprocess.run(
                ["python", str(tests_path)],
                capture_output=True,
                timeout=timeout,
                text=True
            )
            
            passed = result.returncode == 0
            
            details = {
                "exit_code": result.returncode,
                "stdout": result.stdout[:500],  # Truncate for brevity
                "stderr": result.stderr[:500] if result.stderr else None
            }
            
            # Parse test results if possible
            if "OK" in result.stdout or "passed" in result.stdout.lower():
                details["tests_passed"] = True
            
            return ValidationResult("tests", passed, details)
            
        except subprocess.TimeoutExpired:
            return ValidationResult("tests", False, {"error": "Tests timed out"})
        except FileNotFoundError:
            return ValidationResult("tests", False, {"error": "Python interpreter not found"})
        except Exception as e:
            return ValidationResult("tests", False, {"error": str(e)})
    
    def validate_with_retry(self, tool_name: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Validate tool with retry logic.
        
        Args:
            tool_name: Name of the tool
            max_retries: Maximum retry attempts
        
        Returns:
            Validation results dictionary
        """
        for attempt in range(max_retries):
            results = self.validate_tool(tool_name)
            
            if results["all_passed"]:
                results["attempts"] = attempt + 1
                return results
            
            # Wait before retry (except on last attempt)
            if attempt < max_retries - 1:
                import time
                time.sleep(1)
        
        results["attempts"] = max_retries
        results["all_retries_failed"] = True
        return results


# Convenience function
def validate_tool(tool_name: str, skills_dir: str = "skills") -> Dict[str, Any]:
    """
    Validate a tool.
    
    Args:
        tool_name: Name of the tool
        skills_dir: Skills directory path
    
    Returns:
        Validation results dictionary
    """
    validator = ToolValidator(skills_dir)
    return validator.validate_tool(tool_name)
