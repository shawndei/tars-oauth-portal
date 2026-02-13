#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dynamic Tools CLI - Command-line interface for dynamic tool management

Usage:
    python cli.py list                  # List available and loaded tools
    python cli.py load <tool-name>      # Load a tool
    python cli.py unload <tool-name>    # Unload a tool
    python cli.py reload <tool-name>    # Reload a tool
    python cli.py info <tool-name>      # Get tool information
    python cli.py detect <request>      # Detect capability gap
    python cli.py create <request>      # Create tool on-demand
    python cli.py validate <tool-name>  # Validate a tool
    python cli.py watch                 # Start hot-reload watcher
    python cli.py stats                 # Show statistics
"""

import sys
import json
from pathlib import Path
import io

# Fix Windows console encoding for emojis
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from tool_loader import get_loader
from tool_watcher import get_watcher
from capability_detector import detect_capability_gap
from orchestrator import get_orchestrator, create_tool_on_demand
from tool_validator import validate_tool


def cmd_list():
    """List available and loaded tools."""
    loader = get_loader()
    
    available = loader.list_available_tools()
    loaded = loader.list_loaded_tools()
    
    print("📦 Available Tools:")
    if available:
        for tool in available:
            status = "✅ loaded" if tool in loaded else "⭕ not loaded"
            print(f"  - {tool} ({status})")
    else:
        print("  (none)")
    
    print(f"\n📊 Summary: {len(available)} available, {len(loaded)} loaded")


def cmd_load(tool_name):
    """Load a tool."""
    loader = get_loader()
    
    print(f"⏳ Loading tool: {tool_name}")
    
    success = loader.load_tool(tool_name)
    
    if success:
        print(f"✅ Tool loaded successfully")
        info = loader.get_tool_info(tool_name)
        print(f"   Version: {info['version']}")
        print(f"   Status: {info['status']}")
    else:
        print(f"❌ Failed to load tool")
        return 1
    
    return 0


def cmd_unload(tool_name):
    """Unload a tool."""
    loader = get_loader()
    
    print(f"⏳ Unloading tool: {tool_name}")
    
    success = loader.unload_tool(tool_name)
    
    if success:
        print(f"✅ Tool unloaded successfully")
    else:
        print(f"❌ Failed to unload tool (not loaded?)")
        return 1
    
    return 0


def cmd_reload(tool_name):
    """Reload a tool."""
    loader = get_loader()
    
    print(f"⏳ Reloading tool: {tool_name}")
    
    success = loader.reload_tool(tool_name)
    
    if success:
        print(f"✅ Tool reloaded successfully")
    else:
        print(f"❌ Failed to reload tool")
        return 1
    
    return 0


def cmd_info(tool_name):
    """Get tool information."""
    loader = get_loader()
    
    info = loader.get_tool_info(tool_name)
    
    if info:
        print(f"ℹ️  Tool Information: {tool_name}")
        print(f"   Name: {info['name']}")
        print(f"   Version: {info['version']}")
        print(f"   Status: {info['status']}")
        print(f"   Loaded at: {info['loaded_at']}")
        print(f"   Path: {info['path']}")
        print(f"   Has implementation: {info['has_implementation']}")
        
        if info.get('error'):
            print(f"   Error: {info['error']}")
    else:
        print(f"❌ Tool not found or not loaded: {tool_name}")
        return 1
    
    return 0


def cmd_detect(request):
    """Detect capability gap."""
    loader = get_loader()
    available = loader.list_available_tools()
    
    print(f"🔍 Analyzing request: \"{request}\"")
    print(f"   Available tools: {len(available)}")
    
    gap = detect_capability_gap(request, available)
    
    if gap["gap_detected"]:
        print(f"\n⚠️  Capability gap detected!")
        print(f"   Type: {gap['gap_type']}")
        print(f"   Description: {gap['missing_capability']}")
        print(f"   Suggested tool: {gap['suggested_skill_name']}")
        print(f"   Complexity: {gap['complexity_score']}/10")
        print(f"   Confidence: {gap['confidence']:.1%}")
        
        print(f"\n💡 Suggested functions:")
        for func in gap['tool_requirements'].get('core_functions', [])[:5]:
            print(f"   - {func}")
    else:
        print(f"\n✅ No gap detected")
        print(f"   Reason: {gap.get('reason', 'Existing tools sufficient')}")
    
    return 0


def cmd_create(request):
    """Create tool on-demand."""
    print(f"🛠️  Creating tool for request: \"{request}\"")
    
    result = create_tool_on_demand(request, auto_approve=False)
    
    if result["success"]:
        print(f"\n✨ Tool created successfully!")
        print(f"   Tool ID: {result['tool_id']}")
        print(f"   Tool name: {result['tool_name']}")
        return 0
    else:
        print(f"\n❌ Tool creation failed")
        print(f"   Reason: {result.get('message', 'Unknown error')}")
        return 1


def cmd_validate(tool_name):
    """Validate a tool."""
    print(f"✔️  Validating tool: {tool_name}")
    
    results = validate_tool(tool_name)
    
    print(f"\n📋 Validation Results:")
    print(f"   Overall: {'✅ PASSED' if results['all_passed'] else '❌ FAILED'}")
    
    for check_name, check_result in results["validations"].items():
        status = "✅" if check_result["passed"] else "❌"
        print(f"   {status} {check_name}")
        
        # Show details for failed checks
        if not check_result["passed"]:
            details = check_result.get("details", {})
            if isinstance(details, dict):
                for key, value in details.items():
                    if not value:
                        print(f"      - {key}: {value}")
            elif details:
                print(f"      - {details}")
    
    return 0 if results["all_passed"] else 1


def cmd_watch():
    """Start hot-reload watcher."""
    print("👁️  Starting hot-reload watcher...")
    print("   Press Ctrl+C to stop")
    
    watcher = get_watcher()
    
    # Register callbacks
    def on_tool_added(tool_name, details):
        print(f"   🆕 Tool added: {tool_name}")
    
    def on_tool_updated(tool_name, details):
        print(f"   🔄 Tool updated: {tool_name} ({details.get('file', 'unknown')})")
    
    def on_tool_removed(tool_name, details):
        print(f"   🗑️  Tool removed: {tool_name}")
    
    watcher.on("tool_added", on_tool_added)
    watcher.on("tool_updated", on_tool_updated)
    watcher.on("tool_removed", on_tool_removed)
    
    print("   Watching for changes...")
    
    try:
        watcher.watch_loop(interval_seconds=1.0)
    except KeyboardInterrupt:
        print("\n\n👋 Watcher stopped")
        return 0


def cmd_stats():
    """Show statistics."""
    orchestrator = get_orchestrator()
    
    print("📊 Dynamic Tools Statistics")
    print("=" * 50)
    
    # State
    state = orchestrator.export_state()
    print(f"\n🔧 System State:")
    print(f"   Available tools: {len(state['available_tools'])}")
    print(f"   Loaded tools: {len(state['loaded_tools'])}")
    print(f"   Watched tools: {len(state['watched_tools'])}")
    
    # Statistics
    stats = orchestrator.get_statistics()
    print(f"\n📈 Creation Statistics:")
    print(f"   Average complexity: {stats.get('average_complexity', 0):.1f}/10")
    print(f"   Validation pass rate: {stats.get('validation_pass_rate', 0):.1%}")
    print(f"   Hot-reload success rate: {stats.get('hotreload_success_rate', 0):.1%}")
    
    gap_types = stats.get('by_gap_type', {})
    if gap_types:
        print(f"\n🔍 Gap Types:")
        for gap_type, count in gap_types.items():
            print(f"   - {gap_type}: {count}")
    
    # Recent tools
    tools = orchestrator.list_created_tools()
    if tools:
        print(f"\n🆕 Recent Tools (last 5):")
        for tool in tools[-5:]:
            print(f"   - {tool['name']} (v{tool.get('version', '?')})")
            print(f"     Created: {tool.get('created_at', 'unknown')[:19]}")
    
    return 0


def print_usage():
    """Print usage information."""
    print(__doc__)


def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        print_usage()
        return 1
    
    command = sys.argv[1].lower()
    
    try:
        if command == "list":
            return cmd_list()
        
        elif command == "load":
            if len(sys.argv) < 3:
                print("❌ Usage: cli.py load <tool-name>")
                return 1
            return cmd_load(sys.argv[2])
        
        elif command == "unload":
            if len(sys.argv) < 3:
                print("❌ Usage: cli.py unload <tool-name>")
                return 1
            return cmd_unload(sys.argv[2])
        
        elif command == "reload":
            if len(sys.argv) < 3:
                print("❌ Usage: cli.py reload <tool-name>")
                return 1
            return cmd_reload(sys.argv[2])
        
        elif command == "info":
            if len(sys.argv) < 3:
                print("❌ Usage: cli.py info <tool-name>")
                return 1
            return cmd_info(sys.argv[2])
        
        elif command == "detect":
            if len(sys.argv) < 3:
                print("❌ Usage: cli.py detect <request>")
                return 1
            request = " ".join(sys.argv[2:])
            return cmd_detect(request)
        
        elif command == "create":
            if len(sys.argv) < 3:
                print("❌ Usage: cli.py create <request>")
                return 1
            request = " ".join(sys.argv[2:])
            return cmd_create(request)
        
        elif command == "validate":
            if len(sys.argv) < 3:
                print("❌ Usage: cli.py validate <tool-name>")
                return 1
            return cmd_validate(sys.argv[2])
        
        elif command == "watch":
            return cmd_watch()
        
        elif command == "stats":
            return cmd_stats()
        
        else:
            print(f"❌ Unknown command: {command}")
            print_usage()
            return 1
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
