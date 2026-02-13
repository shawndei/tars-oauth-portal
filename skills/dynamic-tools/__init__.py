"""
Dynamic Tools - Runtime tool loading, hot-reload, and on-demand tool creation

This module provides comprehensive dynamic tool management including:
- Runtime tool loading and unloading
- Tool availability detection
- Hot-reload of tool definitions
- Tool versioning and fallbacks
- On-demand tool creation from user requests
- Capability gap detection
- Automatic validation and testing

Main Components:
- ToolLoader: Load/unload tools at runtime
- ToolWatcher: Hot-reload when tools change
- CapabilityDetector: Detect capability gaps
- ToolGenerator: Generate new tools on-demand
- ToolValidator: Validate tools before deployment
- DynamicToolOrchestrator: Main orchestrator

Quick Start:
    >>> from skills.dynamic_tools import create_tool_on_demand
    >>> 
    >>> # Detect gap and create tool automatically
    >>> result = create_tool_on_demand("Can you read PDF files?")
    >>> 
    >>> if result['success']:
    ...     print(f"Created tool: {result['tool_name']}")

API Reference:
    Tool Loading:
        - get_loader() -> ToolLoader
        - load_tool(name, version)
        - unload_tool(name)
        - reload_tool(name)
    
    Hot-Reload:
        - get_watcher() -> ToolWatcher
        - watch_loop(interval)
    
    Capability Detection:
        - detect_capability_gap(request, available_tools)
    
    Tool Creation:
        - create_tool_on_demand(request, auto_approve)
        - create_tool_from_gap(gap_info)
    
    Validation:
        - validate_tool(tool_name)
"""

__version__ = "1.0.0"
__author__ = "OpenClaw Dynamic Tools System"

# Import main components
from .tool_loader import (
    ToolLoader,
    ToolVersion,
    get_loader
)

from .tool_watcher import (
    ToolWatcher,
    FileWatcher,
    get_watcher
)

from .capability_detector import (
    CapabilityDetector,
    CapabilityGap,
    Intent,
    detect_capability_gap
)

from .tool_generator import (
    ToolGenerator,
    create_tool_from_gap
)

from .tool_validator import (
    ToolValidator,
    ValidationResult,
    validate_tool
)

from .orchestrator import (
    DynamicToolOrchestrator,
    CreationLog,
    get_orchestrator,
    create_tool_on_demand
)

# Public API
__all__ = [
    # Classes
    "ToolLoader",
    "ToolVersion",
    "ToolWatcher",
    "FileWatcher",
    "CapabilityDetector",
    "CapabilityGap",
    "Intent",
    "ToolGenerator",
    "ToolValidator",
    "ValidationResult",
    "DynamicToolOrchestrator",
    "CreationLog",
    
    # Functions
    "get_loader",
    "get_watcher",
    "get_orchestrator",
    "detect_capability_gap",
    "create_tool_from_gap",
    "validate_tool",
    "create_tool_on_demand",
]


# Convenience shortcuts
def load_tool(tool_name: str, version: str = None) -> bool:
    """Load a tool. Shortcut for get_loader().load_tool()."""
    return get_loader().load_tool(tool_name, version)


def unload_tool(tool_name: str) -> bool:
    """Unload a tool. Shortcut for get_loader().unload_tool()."""
    return get_loader().unload_tool(tool_name)


def reload_tool(tool_name: str) -> bool:
    """Reload a tool. Shortcut for get_loader().reload_tool()."""
    return get_loader().reload_tool(tool_name)


def list_available_tools() -> list:
    """List available tools. Shortcut for get_loader().list_available_tools()."""
    return get_loader().list_available_tools()


def list_loaded_tools() -> list:
    """List loaded tools. Shortcut for get_loader().list_loaded_tools()."""
    return get_loader().list_loaded_tools()


def is_tool_loaded(tool_name: str) -> bool:
    """Check if tool is loaded. Shortcut for get_loader().is_tool_loaded()."""
    return get_loader().is_tool_loaded(tool_name)


# Add shortcuts to __all__
__all__.extend([
    "load_tool",
    "unload_tool",
    "reload_tool",
    "list_available_tools",
    "list_loaded_tools",
    "is_tool_loaded",
])


# Module-level documentation
def get_info():
    """Get module information and usage guide."""
    return {
        "version": __version__,
        "components": [
            "ToolLoader - Runtime tool loading/unloading",
            "ToolWatcher - Hot-reload monitoring",
            "CapabilityDetector - Gap detection",
            "ToolGenerator - On-demand tool creation",
            "ToolValidator - Tool validation",
            "DynamicToolOrchestrator - Main controller"
        ],
        "quick_start": {
            "create_tool": "create_tool_on_demand('Can you read PDF files?')",
            "load_tool": "load_tool('pdf-reader')",
            "detect_gap": "detect_capability_gap('Parse XML files', available_tools)",
            "validate": "validate_tool('my-tool')"
        },
        "documentation": "See skills/dynamic-tools/SKILL.md for full documentation"
    }


if __name__ == "__main__":
    # Print module info when run directly
    import json
    print(json.dumps(get_info(), indent=2))
