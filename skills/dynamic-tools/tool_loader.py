"""
Dynamic Tool Loader - Runtime loading and unloading of tools
"""

import os
import json
import importlib
import importlib.util
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import time


class ToolVersion:
    """Represents a versioned tool."""
    
    def __init__(self, name: str, version: str, path: Path, metadata: dict):
        self.name = name
        self.version = version
        self.path = path
        self.metadata = metadata
        self.loaded_at = None
        self.module = None
        self.status = "unloaded"  # unloaded, loaded, error
        self.error = None
    
    def __repr__(self):
        return f"ToolVersion({self.name} v{self.version}, status={self.status})"


class ToolLoader:
    """
    Manages runtime loading and unloading of tools/skills.
    
    Features:
    - Load tools dynamically from skills directory
    - Unload tools to free memory
    - Hot-reload when tool definitions change
    - Version management and fallbacks
    - Tool availability detection
    """
    
    def __init__(self, skills_dir: str = "skills"):
        self.skills_dir = Path(skills_dir)
        self.loaded_tools: Dict[str, ToolVersion] = {}
        self.tool_versions: Dict[str, List[ToolVersion]] = {}  # name -> [versions]
        self.load_log: List[dict] = []
        
    def discover_tools(self) -> Dict[str, List[dict]]:
        """
        Scan skills directory and discover all available tools.
        
        Returns:
            Dict mapping tool names to list of available versions
        """
        discovered = {}
        
        if not self.skills_dir.exists():
            return discovered
        
        for tool_dir in self.skills_dir.iterdir():
            if not tool_dir.is_dir():
                continue
            
            skill_md = tool_dir / "SKILL.md"
            metadata_json = tool_dir / "metadata.json"
            
            if not skill_md.exists():
                continue
            
            tool_name = tool_dir.name
            
            # Parse metadata if exists
            metadata = {}
            if metadata_json.exists():
                try:
                    with open(metadata_json) as f:
                        metadata = json.load(f)
                except Exception as e:
                    metadata = {"error": str(e)}
            
            # Extract version from metadata or default to 1.0
            version = metadata.get("version", "1.0")
            
            tool_info = {
                "name": tool_name,
                "version": version,
                "path": str(tool_dir),
                "has_skill_md": True,
                "has_metadata": metadata_json.exists(),
                "has_implementation": (tool_dir / "implementation.py").exists(),
                "has_tests": (tool_dir / "tests.py").exists(),
                "metadata": metadata,
                "discovered_at": datetime.now().isoformat()
            }
            
            if tool_name not in discovered:
                discovered[tool_name] = []
            discovered[tool_name].append(tool_info)
        
        return discovered
    
    def load_tool(self, tool_name: str, version: Optional[str] = None) -> bool:
        """
        Load a tool into runtime.
        
        Args:
            tool_name: Name of the tool to load
            version: Specific version to load (None = latest)
        
        Returns:
            True if loaded successfully, False otherwise
        """
        discovered = self.discover_tools()
        
        if tool_name not in discovered:
            self._log_event("load_failed", tool_name, {"reason": "tool_not_found"})
            return False
        
        tool_versions = discovered[tool_name]
        
        # Select version
        if version:
            tool_info = next((t for t in tool_versions if t["version"] == version), None)
            if not tool_info:
                self._log_event("load_failed", tool_name, {"reason": "version_not_found", "version": version})
                return False
        else:
            # Use latest version (sorted by version string)
            tool_info = sorted(tool_versions, key=lambda t: t["version"], reverse=True)[0]
        
        tool_path = Path(tool_info["path"])
        
        # Create ToolVersion object
        tool_version = ToolVersion(
            name=tool_name,
            version=tool_info["version"],
            path=tool_path,
            metadata=tool_info["metadata"]
        )
        
        # Load implementation if exists
        impl_path = tool_path / "implementation.py"
        if impl_path.exists():
            try:
                spec = importlib.util.spec_from_file_location(
                    f"skills.{tool_name}.implementation",
                    impl_path
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                tool_version.module = module
                tool_version.status = "loaded"
                tool_version.loaded_at = datetime.now().isoformat()
                
            except Exception as e:
                tool_version.status = "error"
                tool_version.error = str(e)
                self._log_event("load_failed", tool_name, {"reason": "import_error", "error": str(e)})
                return False
        else:
            # No implementation, just mark as loaded (documentation-only tool)
            tool_version.status = "loaded"
            tool_version.loaded_at = datetime.now().isoformat()
        
        # Store loaded tool
        self.loaded_tools[tool_name] = tool_version
        
        # Track versions
        if tool_name not in self.tool_versions:
            self.tool_versions[tool_name] = []
        if tool_version not in self.tool_versions[tool_name]:
            self.tool_versions[tool_name].append(tool_version)
        
        self._log_event("load_success", tool_name, {
            "version": tool_info["version"],
            "has_implementation": impl_path.exists()
        })
        
        return True
    
    def unload_tool(self, tool_name: str) -> bool:
        """
        Unload a tool from runtime.
        
        Args:
            tool_name: Name of the tool to unload
        
        Returns:
            True if unloaded successfully, False otherwise
        """
        if tool_name not in self.loaded_tools:
            return False
        
        tool = self.loaded_tools[tool_name]
        
        # Clear module reference
        if tool.module:
            tool.module = None
        
        tool.status = "unloaded"
        del self.loaded_tools[tool_name]
        
        self._log_event("unload_success", tool_name, {"version": tool.version})
        return True
    
    def reload_tool(self, tool_name: str) -> bool:
        """
        Reload a tool (unload and load again).
        
        Args:
            tool_name: Name of the tool to reload
        
        Returns:
            True if reloaded successfully, False otherwise
        """
        version = None
        if tool_name in self.loaded_tools:
            version = self.loaded_tools[tool_name].version
            self.unload_tool(tool_name)
        
        return self.load_tool(tool_name, version)
    
    def is_tool_loaded(self, tool_name: str) -> bool:
        """Check if a tool is currently loaded."""
        return tool_name in self.loaded_tools and self.loaded_tools[tool_name].status == "loaded"
    
    def get_tool_info(self, tool_name: str) -> Optional[dict]:
        """Get information about a loaded tool."""
        if tool_name not in self.loaded_tools:
            return None
        
        tool = self.loaded_tools[tool_name]
        return {
            "name": tool.name,
            "version": tool.version,
            "status": tool.status,
            "loaded_at": tool.loaded_at,
            "path": str(tool.path),
            "has_implementation": tool.module is not None,
            "metadata": tool.metadata,
            "error": tool.error
        }
    
    def list_loaded_tools(self) -> List[str]:
        """List all currently loaded tools."""
        return list(self.loaded_tools.keys())
    
    def list_available_tools(self) -> List[str]:
        """List all available tools (discovered in skills directory)."""
        discovered = self.discover_tools()
        return list(discovered.keys())
    
    def get_tool_versions(self, tool_name: str) -> List[str]:
        """Get all available versions of a tool."""
        discovered = self.discover_tools()
        if tool_name not in discovered:
            return []
        return [t["version"] for t in discovered[tool_name]]
    
    def load_with_fallback(self, tool_name: str, preferred_version: str = None) -> bool:
        """
        Load tool with fallback to older versions if preferred fails.
        
        Args:
            tool_name: Name of the tool
            preferred_version: Preferred version (None = latest)
        
        Returns:
            True if loaded (any version), False if all failed
        """
        versions = self.get_tool_versions(tool_name)
        if not versions:
            return False
        
        # Sort versions (latest first)
        versions_sorted = sorted(versions, reverse=True)
        
        # Try preferred version first
        if preferred_version and preferred_version in versions:
            if self.load_tool(tool_name, preferred_version):
                return True
            # Fallback to other versions
            versions_sorted = [v for v in versions_sorted if v != preferred_version]
        
        # Try each version until one succeeds
        for version in versions_sorted:
            if self.load_tool(tool_name, version):
                self._log_event("fallback_success", tool_name, {
                    "preferred_version": preferred_version,
                    "loaded_version": version
                })
                return True
        
        return False
    
    def _log_event(self, event_type: str, tool_name: str, details: dict):
        """Log a tool loading event."""
        self.load_log.append({
            "timestamp": datetime.now().isoformat(),
            "event": event_type,
            "tool": tool_name,
            "details": details
        })
    
    def get_load_log(self, limit: int = 100) -> List[dict]:
        """Get recent load events."""
        return self.load_log[-limit:]
    
    def export_state(self) -> dict:
        """Export current loader state."""
        return {
            "skills_dir": str(self.skills_dir),
            "loaded_tools": {
                name: {
                    "version": tool.version,
                    "status": tool.status,
                    "loaded_at": tool.loaded_at,
                    "error": tool.error
                }
                for name, tool in self.loaded_tools.items()
            },
            "available_tools": self.discover_tools(),
            "load_log_count": len(self.load_log)
        }


# Global loader instance
_loader = None

def get_loader() -> ToolLoader:
    """Get global ToolLoader instance."""
    global _loader
    if _loader is None:
        _loader = ToolLoader()
    return _loader
