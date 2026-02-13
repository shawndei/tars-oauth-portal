"""
Examples demonstrating dynamic-tools functionality

This file contains practical examples of using the dynamic-tools skill.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dynamic_tools import (
    get_loader,
    get_watcher,
    detect_capability_gap,
    create_tool_on_demand,
    validate_tool,
    get_orchestrator
)


def example_1_basic_tool_loading():
    """Example 1: Basic tool loading and management."""
    print("=" * 60)
    print("Example 1: Basic Tool Loading")
    print("=" * 60)
    
    loader = get_loader()
    
    # Discover available tools
    print("\n1. Discovering available tools...")
    available = loader.list_available_tools()
    print(f"   Found {len(available)} tools: {', '.join(available)}")
    
    # Load a tool
    if available:
        tool_name = available[0]
        print(f"\n2. Loading tool: {tool_name}")
        success = loader.load_tool(tool_name)
        print(f"   Load {'successful' if success else 'failed'}")
        
        # Get tool info
        if success:
            info = loader.get_tool_info(tool_name)
            print(f"\n3. Tool information:")
            print(f"   Name: {info['name']}")
            print(f"   Version: {info['version']}")
            print(f"   Status: {info['status']}")
            print(f"   Loaded at: {info['loaded_at']}")
        
        # Unload tool
        print(f"\n4. Unloading tool: {tool_name}")
        loader.unload_tool(tool_name)
        print(f"   Tool unloaded")


def example_2_hot_reload():
    """Example 2: Hot-reload monitoring."""
    print("\n" + "=" * 60)
    print("Example 2: Hot-Reload Monitoring")
    print("=" * 60)
    
    watcher = get_watcher()
    
    print("\n1. Setting up hot-reload watcher...")
    print(f"   Watching {len(watcher.get_watched_tools())} tools")
    
    # Register callbacks
    def on_tool_added(tool_name, details):
        print(f"   🆕 Tool added: {tool_name}")
    
    def on_tool_updated(tool_name, details):
        print(f"   🔄 Tool updated: {tool_name} ({details.get('file', 'unknown file')})")
    
    def on_tool_removed(tool_name, details):
        print(f"   🗑️  Tool removed: {tool_name}")
    
    watcher.on("tool_added", on_tool_added)
    watcher.on("tool_updated", on_tool_updated)
    watcher.on("tool_removed", on_tool_removed)
    
    print("\n2. Watching for changes (would run in loop)...")
    print("   Note: In production, use watcher.watch_loop(interval=1.0)")
    
    # Check once
    changes = watcher.check()
    if changes:
        print(f"   Detected {len(changes)} change(s)")
    else:
        print("   No changes detected")


def example_3_capability_detection():
    """Example 3: Capability gap detection."""
    print("\n" + "=" * 60)
    print("Example 3: Capability Gap Detection")
    print("=" * 60)
    
    # Example requests
    requests = [
        "Can you read PDF files?",
        "Convert CSV to JSON format",
        "Monitor my API health every 5 minutes",
        "Generate QR codes from text"
    ]
    
    loader = get_loader()
    available_tools = loader.list_available_tools()
    
    print(f"\n1. Available tools: {', '.join(available_tools) if available_tools else 'None'}")
    
    for i, request in enumerate(requests, 1):
        print(f"\n{i}. Analyzing request: \"{request}\"")
        
        gap = detect_capability_gap(request, available_tools)
        
        if gap["gap_detected"]:
            print(f"   ⚠️  Gap detected!")
            print(f"   Type: {gap['gap_type']}")
            print(f"   Suggested tool: {gap['suggested_skill_name']}")
            print(f"   Complexity: {gap['complexity_score']}/10")
            print(f"   Confidence: {gap['confidence']:.1%}")
        else:
            print(f"   ✅ No gap - can use: {gap.get('reason', 'existing tools')}")


def example_4_tool_validation():
    """Example 4: Tool validation."""
    print("\n" + "=" * 60)
    print("Example 4: Tool Validation")
    print("=" * 60)
    
    loader = get_loader()
    available = loader.list_available_tools()
    
    if not available:
        print("\n   No tools available to validate")
        return
    
    tool_name = available[0]
    print(f"\n1. Validating tool: {tool_name}")
    
    results = validate_tool(tool_name)
    
    print(f"\n2. Validation results:")
    print(f"   Overall: {'✅ PASSED' if results['all_passed'] else '❌ FAILED'}")
    
    for check_name, check_result in results["validations"].items():
        status = "✅" if check_result["passed"] else "❌"
        print(f"   {status} {check_name}")
        
        # Show details for failed checks
        if not check_result["passed"] and check_result.get("details"):
            for key, value in check_result["details"].items():
                if not value:
                    print(f"      - {key}: {value}")


def example_5_on_demand_creation():
    """Example 5: On-demand tool creation (non-interactive)."""
    print("\n" + "=" * 60)
    print("Example 5: On-Demand Tool Creation")
    print("=" * 60)
    
    # Note: This would normally be interactive
    # For demo purposes, we'll just show the detection phase
    
    request = "Can you parse XML files?"
    
    print(f"\n1. User request: \"{request}\"")
    
    loader = get_loader()
    available_tools = loader.list_available_tools()
    
    print(f"\n2. Detecting capability gap...")
    gap = detect_capability_gap(request, available_tools)
    
    if gap["gap_detected"]:
        print(f"   ⚠️  Gap detected: {gap['missing_capability']}")
        print(f"\n3. Would create tool:")
        print(f"   Name: {gap['suggested_skill_name']}")
        print(f"   Functions: {', '.join(gap['tool_requirements'].get('core_functions', []))}")
        print(f"   Complexity: {gap['complexity_score']}/10")
        print(f"\n   Note: Use create_tool_on_demand(request, auto_approve=True) to actually create")
    else:
        print(f"   ✅ No gap detected - can use existing tools")


def example_6_orchestrator_stats():
    """Example 6: Get orchestrator statistics."""
    print("\n" + "=" * 60)
    print("Example 6: Orchestrator Statistics")
    print("=" * 60)
    
    orchestrator = get_orchestrator()
    
    print("\n1. Getting statistics...")
    stats = orchestrator.get_statistics()
    
    print(f"\n2. Statistics:")
    print(f"   Gap types: {stats.get('by_gap_type', {})}")
    print(f"   Average complexity: {stats.get('average_complexity', 0):.1f}")
    print(f"   Validation pass rate: {stats.get('validation_pass_rate', 0):.1%}")
    print(f"   Hot-reload success rate: {stats.get('hotreload_success_rate', 0):.1%}")
    
    print("\n3. Created tools:")
    tools = orchestrator.list_created_tools()
    if tools:
        for tool in tools[-5:]:  # Show last 5
            print(f"   - {tool['name']} (v{tool.get('version', '?')})")
            print(f"     Created: {tool.get('created_at', 'unknown')}")
            print(f"     Gap type: {tool.get('capability_gap_type', 'unknown')}")
    else:
        print("   No tools created yet")


def example_7_version_management():
    """Example 7: Tool versioning and fallbacks."""
    print("\n" + "=" * 60)
    print("Example 7: Version Management")
    print("=" * 60)
    
    loader = get_loader()
    available = loader.list_available_tools()
    
    if not available:
        print("\n   No tools available")
        return
    
    tool_name = available[0]
    
    print(f"\n1. Tool: {tool_name}")
    
    # Get available versions
    versions = loader.get_tool_versions(tool_name)
    print(f"   Available versions: {', '.join(versions)}")
    
    # Load with fallback
    print(f"\n2. Loading with fallback (prefers latest)...")
    success = loader.load_with_fallback(tool_name)
    
    if success:
        info = loader.get_tool_info(tool_name)
        print(f"   ✅ Loaded version: {info['version']}")
    else:
        print(f"   ❌ Failed to load any version")


def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("DYNAMIC TOOLS - EXAMPLES")
    print("=" * 60)
    
    try:
        example_1_basic_tool_loading()
        example_2_hot_reload()
        example_3_capability_detection()
        example_4_tool_validation()
        example_5_on_demand_creation()
        example_6_orchestrator_stats()
        example_7_version_management()
        
        print("\n" + "=" * 60)
        print("All examples completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
