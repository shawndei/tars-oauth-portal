"""
Dynamic Tool Orchestrator - Main controller for on-demand tool creation
"""

import time
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import json

try:
    from .capability_detector import CapabilityDetector, detect_capability_gap
    from .tool_generator import ToolGenerator, create_tool_from_gap
    from .tool_validator import ToolValidator, validate_tool
    from .tool_loader import ToolLoader, get_loader
    from .tool_watcher import ToolWatcher, get_watcher
except ImportError:
    from capability_detector import CapabilityDetector, detect_capability_gap
    from tool_generator import ToolGenerator, create_tool_from_gap
    from tool_validator import ToolValidator, validate_tool
    from tool_loader import ToolLoader, get_loader
    from tool_watcher import ToolWatcher, get_watcher


class CreationLog:
    """Manages tool-creation-log.json."""
    
    def __init__(self, log_file: str = "tool-creation-log.json"):
        self.log_file = Path(log_file)
        self.log_data = self._load_log()
    
    def _load_log(self) -> dict:
        """Load existing log or create new one."""
        if self.log_file.exists():
            try:
                with open(self.log_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        
        # Default log structure
        return {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "total_tools_created": 0,
            "tools": [],
            "statistics": {
                "by_gap_type": {},
                "average_complexity": 0.0,
                "validation_pass_rate": 0.0,
                "hotreload_success_rate": 0.0
            }
        }
    
    def add_entry(self, tool_info: dict) -> str:
        """
        Add tool creation entry.
        
        Args:
            tool_info: Tool information dictionary
        
        Returns:
            Tool ID
        """
        tool_id = f"tool_{len(self.log_data['tools']) + 1:03d}"
        
        entry = {
            "id": tool_id,
            "created_at": datetime.now().isoformat(),
            **tool_info
        }
        
        self.log_data["tools"].append(entry)
        self.log_data["total_tools_created"] = len(self.log_data["tools"])
        
        # Update statistics
        self._update_statistics()
        
        # Save to file
        self._save_log()
        
        return tool_id
    
    def _update_statistics(self):
        """Update statistics from tools list."""
        tools = self.log_data["tools"]
        
        if not tools:
            return
        
        # Count by gap type
        gap_counts = {}
        for tool in tools:
            gap_type = tool.get("capability_gap_type", "unknown")
            gap_counts[gap_type] = gap_counts.get(gap_type, 0) + 1
        
        self.log_data["statistics"]["by_gap_type"] = gap_counts
        
        # Average complexity
        complexities = [t.get("complexity_score", 0) for t in tools]
        self.log_data["statistics"]["average_complexity"] = sum(complexities) / len(complexities) if complexities else 0.0
        
        # Validation pass rate
        validations = [t.get("validation_passed", False) for t in tools]
        self.log_data["statistics"]["validation_pass_rate"] = sum(validations) / len(validations) if validations else 0.0
        
        # Hotreload success rate
        hotreloads = [t.get("hotreload_success", False) for t in tools]
        self.log_data["statistics"]["hotreload_success_rate"] = sum(hotreloads) / len(hotreloads) if hotreloads else 0.0
    
    def _save_log(self):
        """Save log to file."""
        try:
            with open(self.log_file, 'w') as f:
                json.dump(self.log_data, f, indent=2)
        except Exception as e:
            print(f"Error saving log: {e}")
    
    def get_stats(self) -> dict:
        """Get statistics."""
        return self.log_data["statistics"]
    
    def get_tools(self) -> list:
        """Get all tool entries."""
        return self.log_data["tools"]


class DynamicToolOrchestrator:
    """
    Main orchestrator for dynamic tool creation.
    
    Coordinates:
    - Capability gap detection
    - Tool generation
    - Validation
    - Hot-reload
    - Logging
    """
    
    def __init__(self, skills_dir: str = "skills", log_file: str = "tool-creation-log.json"):
        self.skills_dir = Path(skills_dir)
        self.detector = CapabilityDetector()
        self.generator = ToolGenerator(str(skills_dir))
        self.validator = ToolValidator(str(skills_dir))
        self.loader = get_loader()
        self.watcher = get_watcher()
        self.log = CreationLog(log_file)
    
    def create_tool_on_demand(self, user_request: str, auto_approve: bool = False) -> Dict[str, Any]:
        """
        Complete workflow for on-demand tool creation.
        
        Args:
            user_request: User's request text
            auto_approve: If True, skip confirmation (for automation)
        
        Returns:
            Creation result dictionary
        """
        result = {
            "success": False,
            "request": user_request,
            "timestamp": datetime.now().isoformat(),
            "steps": {}
        }
        
        print(f"📋 Processing request: {user_request}")
        
        # Step 1: Detect capability gap
        print("🔍 Analyzing capability gap...")
        
        available_tools = self.loader.list_available_tools()
        gap = self.detector.detect_gap(user_request, available_tools)
        
        result["steps"]["gap_detection"] = gap
        
        if not gap.get("gap_detected"):
            print(f"✅ No gap detected. {gap.get('reason', '')}")
            result["success"] = True
            result["message"] = "No new tool needed"
            return result
        
        print(f"⚠️  Gap detected: {gap['missing_capability']}")
        print(f"   Type: {gap['gap_type']}")
        print(f"   Confidence: {gap['confidence']:.1%}")
        print(f"   Complexity: {gap['complexity_score']}/10")
        print(f"   Suggested tool: {gap['suggested_skill_name']}")
        
        # Step 2: Approval (if not auto)
        if not auto_approve:
            response = input("\n❓ Create this tool? (y/n): ")
            if response.lower() != 'y':
                print("❌ Tool creation cancelled by user")
                result["message"] = "Cancelled by user"
                return result
        
        # Step 3: Generate tool
        print(f"\n🛠️  Generating new tool: {gap['suggested_skill_name']}...")
        
        tool_created = self.generator.create_tool(
            gap['suggested_skill_name'],
            gap['tool_requirements'],
            gap
        )
        
        result["steps"]["generation"] = {"success": tool_created}
        
        if not tool_created:
            print("❌ Tool generation failed!")
            result["message"] = "Generation failed"
            return result
        
        print("✅ Tool generated successfully")
        
        # Step 4: Validate tool
        print("✔️  Validating new tool...")
        
        validation_results = self.validator.validate_tool(gap['suggested_skill_name'])
        result["steps"]["validation"] = validation_results
        
        if not validation_results["all_passed"]:
            print("⚠️  Some validation checks failed:")
            for check_name, check_result in validation_results["validations"].items():
                status = "✅" if check_result["passed"] else "❌"
                print(f"   {status} {check_name}")
            
            if not auto_approve:
                response = input("\n❓ Continue anyway? (y/n): ")
                if response.lower() != 'y':
                    print("❌ Tool creation aborted")
                    result["message"] = "Validation failed, aborted"
                    return result
        else:
            print("✅ All validations passed!")
        
        # Step 5: Hot-reload
        print("🔄 Loading tool...")
        
        # Wait for watcher to detect (or load manually)
        load_success = False
        for attempt in range(5):
            time.sleep(1)
            
            if self.loader.load_tool(gap['suggested_skill_name']):
                load_success = True
                break
        
        result["steps"]["hotreload"] = {"success": load_success}
        
        if not load_success:
            print("⚠️  Tool hot-reload failed (may require manual load)")
        else:
            print(f"✅ Tool loaded successfully!")
        
        # Step 6: Log creation
        print("📝 Logging tool creation...")
        
        tool_id = self.log.add_entry({
            "name": gap['suggested_skill_name'],
            "triggered_by": user_request,
            "capability_gap": gap['missing_capability'],
            "capability_gap_type": gap['gap_type'],
            "complexity_score": gap['complexity_score'],
            "validation_passed": validation_results["all_passed"],
            "hotreload_success": load_success,
            "status": "active",
            "version": "1.0"
        })
        
        result["tool_id"] = tool_id
        result["tool_name"] = gap['suggested_skill_name']
        result["success"] = True
        
        print(f"\n✨ Tool created successfully! ID: {tool_id}")
        print(f"   Tool name: {gap['suggested_skill_name']}")
        print(f"   Location: skills/{gap['suggested_skill_name']}/")
        
        return result
    
    def get_statistics(self) -> dict:
        """Get creation statistics."""
        return self.log.get_stats()
    
    def list_created_tools(self) -> list:
        """List all dynamically created tools."""
        return self.log.get_tools()
    
    def export_state(self) -> dict:
        """Export orchestrator state."""
        return {
            "skills_dir": str(self.skills_dir),
            "available_tools": self.loader.list_available_tools(),
            "loaded_tools": self.loader.list_loaded_tools(),
            "watched_tools": self.watcher.get_watched_tools(),
            "statistics": self.get_statistics()
        }


# Global orchestrator instance
_orchestrator = None

def get_orchestrator() -> DynamicToolOrchestrator:
    """Get global orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = DynamicToolOrchestrator()
    return _orchestrator


# Convenience function
def create_tool_on_demand(user_request: str, auto_approve: bool = False) -> Dict[str, Any]:
    """
    Create tool on-demand from user request.
    
    Args:
        user_request: User's request text
        auto_approve: Skip confirmation if True
    
    Returns:
        Creation result dictionary
    """
    orchestrator = get_orchestrator()
    return orchestrator.create_tool_on_demand(user_request, auto_approve)
