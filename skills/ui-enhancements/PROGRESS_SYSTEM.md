# Progress Indicator System

## Overview

A comprehensive system for displaying progress indicators across all messaging platforms with multiple visual styles and automatic formatting.

## Visual Styles

### 1. Block Progress Bar
Most universal and clear visual representation.

```
████████░░░░░░░░░░  45%
████████░░░░░░░░░░  45% (9/20)
████████░░░░░░░░░░  45% - ETA: 2m 30s
```

**Usage:**
- Default style for all channels
- Works well with small to large progress ranges
- Easily scalable (10, 20, 50 characters wide)

### 2. Square Block Progress
Using Unicode square blocks.

```
🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜  50%
████████░░  80%
```

**Usage:**
- More compact than bar style
- Better for emoji-heavy messages
- Good for status dashboards

### 3. Circle/Dot Progress
Subtle visual progress.

```
●●●●○○○○○○  40%
●●●●●●●●●●  100%
```

**Usage:**
- Works well in tight spaces
- Less visual prominence
- Good for secondary progress indicators

### 4. Percentage-Only
Text-based with visual emphasis.

```
▓▓▓▓▓░░░░░░░░░░  35%
[████░░░░░░░░░░░░] 35%
████░░░░░░░░░░░░░░ 35%
```

### 5. Animated Progress (Discord/Telegram)
Using multiple symbols in sequence.

```
▁▂▃▄▅▆▇█ (cycles through)
⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ (braille spinner)
⠀⠁⠂⠃⠄⠅⠆⠇ (braille progression)
```

## Implementation Functions

### Basic Progress Bar
```python
def progress_bar(completed: int, total: int, width: int = 20) -> str:
    """
    Generate a simple progress bar.
    
    Args:
        completed: Number of items completed
        total: Total number of items
        width: Width of bar in characters
    
    Returns:
        Formatted progress bar string
    """
    percent = (completed / total) * 100
    filled = int((completed / total) * width)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {percent:.0f}% ({completed}/{total})"
```

**Example Output:**
```
[████████░░░░░░░░░░] 40% (8/20)
[██████████████░░░░░] 75% (15/20)
[████████████████████] 100% (20/20)
```

### Advanced Progress with ETA
```python
def progress_with_eta(
    completed: int,
    total: int,
    elapsed_seconds: float,
    width: int = 20
) -> str:
    """
    Generate progress bar with estimated time remaining.
    
    Args:
        completed: Items completed
        total: Total items
        elapsed_seconds: Elapsed time in seconds
        width: Bar width
    
    Returns:
        Progress bar with ETA
    """
    percent = (completed / total)
    if percent > 0:
        remaining_secs = (elapsed_seconds / percent) - elapsed_seconds
        eta_str = format_time(remaining_secs)
    else:
        eta_str = "calculating..."
    
    filled = int(percent * width)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {percent*100:.0f}% - ETA: {eta_str}"
```

**Example Output:**
```
[████████░░░░░░░░░░] 40% - ETA: 2m 15s
[██████████░░░░░░░░] 55% - ETA: 1m 45s
[██████████████░░░░] 70% - ETA: 1m 10s
```

### Multi-level Progress
For operations with substeps.

```python
def multi_step_progress(
    steps: List[dict],
    current_step: int,
    current_progress: float
) -> str:
    """
    Generate multi-step progress indicator.
    
    Steps format: [
        {"name": "Setup", "status": "complete"},
        {"name": "Validation", "status": "complete"},
        {"name": "Processing", "status": "in_progress"},
        {"name": "Cleanup", "status": "pending"}
    ]
    """
    lines = []
    for i, step in enumerate(steps):
        if step["status"] == "complete":
            lines.append(f"✅ {step['name']}")
        elif step["status"] == "in_progress":
            progress = int(current_progress * 10) if i == current_step else 0
            bar = "█" * progress + "░" * (10 - progress)
            lines.append(f"→ {step['name']} [{bar}]")
        else:
            lines.append(f"⏳ {step['name']}")
    return "\n".join(lines)
```

**Example Output:**
```
✅ Setup
✅ Validation
→ Processing [██████░░░░░░░░░░░░]
⏳ Cleanup
```

### Ring Progress (Circular)
For compact dashboards.

```python
def ring_progress(percent: float) -> str:
    """
    Generate a simple circular progress indicator.
    """
    segments = ["◐", "◓", "◑", "◒"]
    index = int((percent / 100) * len(segments))
    return segments[min(index, len(segments) - 1)]
```

**Example Output:**
```
◐ 25%
◓ 50%
◑ 75%
◒ 100%
```

## Channel-Specific Rendering

### Discord
```
⏳ *Task Progress*

[████████░░░░░░░░░░] 45% (9/20)

**Current Step:** Processing users
**Elapsed:** 2m 15s
**ETA:** ~3m 30s remaining
```

### WhatsApp
```
TASK PROGRESS

Progress:
[████████░░░░░░░░░░] 45%
(9 of 20 items)

Current: Processing users
Elapsed: 2m 15s
ETA: ~3m 30s

Reply /status for details
```

### Telegram
```
*Task Progress*

`[████████░░░░░░░░░░] 45%` (9/20)

*Current Step:* Processing users
*Elapsed:* 2m 15s
*ETA:* ~3m 30s
```

### Slack
```
⏳ Task Progress

`[████████░░░░░░░░░░] 45%` • 9 of 20 items

*Current:* Processing users
*Elapsed:* 2m 15s | *ETA:* ~3m 30s
```

## Status Indicators for Progress

### Step-by-Step Status
```
✅ Step 1: Data validation
✅ Step 2: Backup creation
→ Step 3: Database migration
⏳ Step 4: Index rebuild
⏳ Step 5: Verification
```

### Segment Progress
```
✅ 0-10%
✅ 10-20%
✅ 20-30%
→ 30-40%
░ 40-50%
░ 50-60%
```

### Timeline Progress
```
[========>        ] 40%

├─ 2026-02-13 10:00 ✅ Started
├─ 2026-02-13 10:15 ✅ Backup
├─ 2026-02-13 10:45 → Processing
└─ 2026-02-13 11:30 ⏳ Complete
```

## Performance Metrics Progress

### CPU/Memory/Disk
```
CPU:    [████████░░░░░░░░░░] 45%
Memory: [███████░░░░░░░░░░░] 42%
Disk:   [██████░░░░░░░░░░░░] 35%
```

### Parallel Tasks
```
Task 1: [████████████░░░░░░] 65%
Task 2: [██████████░░░░░░░░] 58%
Task 3: [██████░░░░░░░░░░░░] 35%
Task 4: [████░░░░░░░░░░░░░░] 22%

Overall: [████████░░░░░░░░░░] 45%
```

## Update Patterns

### Incremental Updates
```python
# Message sent with initial progress
initial = progress_bar(0, 100)
send_message(initial)

# Update every 2 seconds
for i in range(1, 101):
    if i % 10 == 0:  # Update every 10%
        updated = progress_bar(i, 100)
        edit_message(message_id, updated)
        sleep(2)
```

### Batch Updates
```
Initial: [░░░░░░░░░░░░░░░░░░░░] 0%

After 5s: [██░░░░░░░░░░░░░░░░░░] 10%
After 10s: [████░░░░░░░░░░░░░░░░] 20%
After 15s: [██████░░░░░░░░░░░░░░] 30%

Final: [████████████████████] 100%
```

### Real-Time Streaming
For long-running operations, update continuously:
- Every 30 seconds for operations >5 minutes
- Every 10 seconds for operations 1-5 minutes
- Every 2 seconds for operations <1 minute

## Advanced Patterns

### Nested Progress
```
Main Task: [████████░░░░░░░░░░] 45%
  ├─ Subtask A: [██████████░░░░░░░░] 60%
  ├─ Subtask B: [████░░░░░░░░░░░░░░] 25%
  └─ Subtask C: [░░░░░░░░░░░░░░░░░░] 0%
```

### Breakdown Progress
```
Completed: 45%
  ├─ On Time:  [██████░░░░] 60% → 27%
  └─ Delayed:  [███░░░░░░░] 40% → 18%

Pending: 55%
  ├─ Queued:   [███░░░░░░░] 30% → 16.5%
  └─ Blocked:  [████░░░░░░] 70% → 38.5%
```

### Comparison Progress
```
Baseline:  [████████████░░░░░░░░░░] 50%
Current:   [██████████████░░░░░░░░] 60%
Target:    [██████████████████░░░░] 75%
```

## Accessibility

Always include:
1. Percentage value (even if visual bar shown)
2. Completed/total numbers when applicable
3. Status text description
4. ETA when available
5. Current step/stage name

**Good:**
```
[████████░░░░░░░░░░] 45% (9/20) - Processing users - ETA: 3m 30s
```

**Better for accessibility:**
```
Progress: 45% complete (9 of 20 items)
Current step: Processing users
Estimated time remaining: 3 minutes 30 seconds
```

## Error States in Progress

When progress hits an error:
```
[████████░░░░░░░░░░] 45% ❌ Error at step 3

Error: Connection timeout
Retrying in 30 seconds...
```

When partial recovery:
```
[████████░░░░░░░░░░] 45% ⚠️ Resumed

Previous: Failed at item 9
Resuming: From item 9
Status: Running
```

## Testing Progress Indicators

### Unit Tests
```python
def test_progress_bar():
    assert progress_bar(10, 20) == "[██████████░░░░░░░░] 50% (10/20)"
    assert progress_bar(0, 100) == "[░░░░░░░░░░░░░░░░░░] 0% (0/100)"
    assert progress_bar(100, 100) == "[████████████████████] 100% (100/100)"

def test_progress_with_eta():
    result = progress_with_eta(10, 20, 10.0)  # 10% done in 10 seconds
    assert "2" in result and "m" in result  # Should show ~2m remaining

def test_multi_step_progress():
    steps = [
        {"name": "Setup", "status": "complete"},
        {"name": "Process", "status": "in_progress"},
        {"name": "Finish", "status": "pending"}
    ]
    result = multi_step_progress(steps, 1, 0.5)
    assert "✅" in result
    assert "→" in result
    assert "⏳" in result
```

### Integration Tests
1. Send progress message to Discord
2. Update message multiple times
3. Verify bar renders correctly
4. Verify percentage updates
5. Verify ETA changes appropriately

### Visual Tests
Test on actual channels:
- [ ] Discord: Bar renders with colors
- [ ] WhatsApp: Text-only bar displays
- [ ] Telegram: MarkdownV2 formatting works
- [ ] Slack: Block kit renders properly

## Customization

See `ui-config.json` for configurable options:
- `progress.styles` - Character symbols
- `progress.format` - Template strings
- `limits.progress` - Update frequency thresholds
- `performance.update_frequency` - Update intervals per channel

---

**Version:** 1.0
**Last Updated:** 2026-02-13
