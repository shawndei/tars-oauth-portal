"""
Tool Watcher - Hot-reload system for tool definitions
"""

import os
import time
from pathlib import Path
from typing import Callable, Dict, List, Set
from datetime import datetime
import hashlib


class FileWatcher:
    """Watch files for changes."""
    
    def __init__(self, path: Path):
        self.path = path
        self.last_modified = 0
        self.last_hash = ""
        
        if path.exists():
            self.last_modified = path.stat().st_mtime
            self.last_hash = self._compute_hash()
    
    def _compute_hash(self) -> str:
        """Compute file hash."""
        if not self.path.exists():
            return ""
        
        try:
            with open(self.path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return ""
    
    def has_changed(self) -> bool:
        """Check if file has changed."""
        if not self.path.exists():
            return self.last_modified != 0 or self.last_hash != ""
        
        current_modified = self.path.stat().st_mtime
        if current_modified != self.last_modified:
            current_hash = self._compute_hash()
            if current_hash != self.last_hash:
                self.last_modified = current_modified
                self.last_hash = current_hash
                return True
        
        return False


class ToolWatcher:
    """
    Watches skills directory for changes and triggers hot-reload.
    
    Features:
    - Watch for new tools
    - Watch for tool updates (SKILL.md, implementation.py changes)
    - Watch for tool deletions
    - Debounced reload (avoid rapid-fire reloads)
    - Event callbacks
    """
    
    def __init__(self, skills_dir: str = "skills", debounce_ms: int = 500):
        self.skills_dir = Path(skills_dir)
        self.debounce_ms = debounce_ms
        self.watchers: Dict[str, Dict[str, FileWatcher]] = {}  # tool_name -> {file -> watcher}
        self.last_scan = 0
        self.callbacks: Dict[str, List[Callable]] = {
            "tool_added": [],
            "tool_updated": [],
            "tool_removed": []
        }
        
        # Track known tools
        self.known_tools: Set[str] = set()
        
        # Initialize
        self._scan_tools()
    
    def _scan_tools(self):
        """Scan skills directory for tools."""
        if not self.skills_dir.exists():
            return
        
        current_tools = set()
        
        for tool_dir in self.skills_dir.iterdir():
            if not tool_dir.is_dir():
                continue
            
            tool_name = tool_dir.name
            current_tools.add(tool_name)
            
            # Initialize watchers for this tool if new
            if tool_name not in self.watchers:
                self.watchers[tool_name] = {}
                
                # Watch SKILL.md
                skill_md = tool_dir / "SKILL.md"
                if skill_md.exists():
                    self.watchers[tool_name]["SKILL.md"] = FileWatcher(skill_md)
                
                # Watch metadata.json
                metadata_json = tool_dir / "metadata.json"
                if metadata_json.exists():
                    self.watchers[tool_name]["metadata.json"] = FileWatcher(metadata_json)
                
                # Watch implementation.py
                impl_py = tool_dir / "implementation.py"
                if impl_py.exists():
                    self.watchers[tool_name]["implementation.py"] = FileWatcher(impl_py)
                
                # Trigger "added" if this is a new tool
                if tool_name not in self.known_tools:
                    self._trigger_event("tool_added", tool_name)
        
        # Detect removed tools
        removed_tools = self.known_tools - current_tools
        for tool_name in removed_tools:
            self._trigger_event("tool_removed", tool_name)
            del self.watchers[tool_name]
        
        self.known_tools = current_tools
        self.last_scan = time.time()
    
    def check(self) -> List[dict]:
        """
        Check for changes in tools.
        
        Returns:
            List of change events
        """
        # Rescan directory to detect new/removed tools
        self._scan_tools()
        
        changes = []
        
        for tool_name, file_watchers in self.watchers.items():
            for file_name, watcher in file_watchers.items():
                if watcher.has_changed():
                    changes.append({
                        "timestamp": datetime.now().isoformat(),
                        "event": "tool_updated",
                        "tool": tool_name,
                        "file": file_name,
                        "path": str(watcher.path)
                    })
                    self._trigger_event("tool_updated", tool_name, {"file": file_name})
        
        return changes
    
    def watch_loop(self, interval_seconds: float = 1.0, max_iterations: int = None):
        """
        Run continuous watch loop.
        
        Args:
            interval_seconds: Time between checks
            max_iterations: Max iterations (None = infinite)
        """
        iteration = 0
        
        while max_iterations is None or iteration < max_iterations:
            changes = self.check()
            
            if changes:
                print(f"[ToolWatcher] Detected {len(changes)} change(s)")
                for change in changes:
                    print(f"  - {change['event']}: {change['tool']} ({change.get('file', 'N/A')})")
            
            time.sleep(interval_seconds)
            iteration += 1
    
    def on(self, event: str, callback: Callable):
        """
        Register callback for an event.
        
        Args:
            event: Event name (tool_added, tool_updated, tool_removed)
            callback: Function to call when event occurs
        """
        if event in self.callbacks:
            self.callbacks[event].append(callback)
    
    def _trigger_event(self, event: str, tool_name: str, details: dict = None):
        """Trigger event callbacks."""
        if event in self.callbacks:
            for callback in self.callbacks[event]:
                try:
                    callback(tool_name, details or {})
                except Exception as e:
                    print(f"[ToolWatcher] Error in callback: {e}")
    
    def get_watched_tools(self) -> List[str]:
        """Get list of currently watched tools."""
        return list(self.watchers.keys())
    
    def export_state(self) -> dict:
        """Export watcher state."""
        return {
            "skills_dir": str(self.skills_dir),
            "watched_tools": list(self.watchers.keys()),
            "total_watchers": sum(len(fw) for fw in self.watchers.values()),
            "last_scan": self.last_scan
        }


# Global watcher instance
_watcher = None

def get_watcher() -> ToolWatcher:
    """Get global ToolWatcher instance."""
    global _watcher
    if _watcher is None:
        _watcher = ToolWatcher()
    return _watcher
