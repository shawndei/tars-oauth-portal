# UI/UX Enhancement Skill

## Overview

This skill provides comprehensive UI/UX enhancements for the TARS system, delivering rich formatting, progress indicators, status dashboards, and channel-specific optimizations. Designed for multi-platform messaging (Discord, WhatsApp, Telegram, Slack) with consistent visual feedback patterns.

## Core Features

### 1. Rich Message Formatting

#### Markdown Support
- **Tables**: Full markdown table syntax for data presentation
- **Lists**: Unordered and ordered lists with nesting
- **Code blocks**: Syntax-highlighted code with language specification
- **Emphasis**: Bold, italic, strikethrough, and inline code
- **Quotes**: Block quotes for emphasis and callouts
- **Links**: Hyperlinks with custom display text

#### Usage Examples

```markdown
# Header
**Bold text** | _Italic text_ | ~~Strikethrough~~

## Lists
- Item 1
- Item 2
  - Nested item
    
1. Ordered item 1
2. Ordered item 2

## Code
\`\`\`python
def hello():
    print("world")
\`\`\`

## Tables (Discord/Slack only)
| Column A | Column B |
|----------|----------|
| Value 1  | Value 2  |
```

### 2. Progress Indicators

#### Linear Progress
```
[████████░░░░░░░░░░] 45% (9/20 tasks)
```

#### Status Progress
- ⏳ In Progress
- ✅ Complete
- ⚠️ Warning
- ❌ Failed
- ⏸️ Paused

#### Custom Indicators
```
🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜ 50%
█▒▒▒▒ 20%
```

### 3. Status Dashboards

Organized status displays with:
- Summary statistics
- Component status indicators
- Health metrics
- Task breakdowns
- Resource usage

### 4. Visual Feedback Elements

#### Success Messages
```
✅ Operation completed successfully
└─ All tasks finished at 14:32 UTC
```

#### Error Messages
```
❌ Operation failed
├─ Reason: Connection timeout
└─ Retry in 30 seconds
```

#### Warnings
```
⚠️ Warning: High resource usage
├─ CPU: 85%
├─ Memory: 72%
└─ Recommendation: Optimize queries
```

#### Info Messages
```
ℹ️ Information update
├─ Status changed to: Ready
└─ Available at: https://example.com
```

### 5. Interactive Elements

#### Action Buttons (Platform-Specific)
- **Discord**: Button components
- **Telegram**: Inline keyboards
- **Slack**: Button blocks
- **WhatsApp**: Reply buttons (limited)

## Channel-Specific Optimizations

### Discord

**Advantages:**
- Full embed support with rich formatting
- Custom colors and thumbnails
- Multiple fields and sections
- Button components (interactive)
- Code block syntax highlighting

**Format Template:**
```json
{
  "embeds": [{
    "title": "Task Status",
    "description": "Current operation progress",
    "color": 3066993,
    "fields": [
      {"name": "Status", "value": "Running", "inline": true},
      {"name": "Progress", "value": "45%", "inline": true}
    ]
  }],
  "components": [{
    "type": 1,
    "components": [
      {
        "type": 2,
        "label": "View Details",
        "style": 1,
        "custom_id": "view_details"
      }
    ]
  }]
}
```

### WhatsApp

**Limitations:**
- No markdown support
- No HTML formatting
- Basic text only
- Limited button support

**Workarounds:**
- Use UPPERCASE for emphasis
- Use symbols: ✅ ❌ ⚠️ ℹ️
- Use ASCII art for simple diagrams
- Use bullet characters (•) for lists
- Use line breaks for spacing

**Format Template:**
```
✅ TASK COMPLETED

Status: Ready
Progress: ████████░░░░░░░░░░ 45%

• Task 1: Done
• Task 2: Done
• Task 3: In Progress

Use /menu for options
```

### Telegram

**Advantages:**
- Markdown V2 support (with escaping)
- Inline keyboards with custom buttons
- Code blocks with language specification
- Format callbacks with data

**Format Template:**
```json
{
  "text": "*Task Status*\n\nProgress: 45%\n`Running tasks...`",
  "parse_mode": "MarkdownV2",
  "reply_markup": {
    "inline_keyboard": [
      [
        {"text": "✅ Complete", "callback_data": "task_complete"},
        {"text": "⏸️ Pause", "callback_data": "task_pause"}
      ]
    ]
  }
}
```

### Slack

**Advantages:**
- Block kit with rich layout options
- Custom colors and thumbnails
- Interactive buttons and selects
- Modal support for forms

**Format Template:**
```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "Task Status"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Status:*\nRunning"},
        {"type": "mrkdwn", "text": "*Progress:*\n45%"}
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "View Details"},
          "value": "view_details"
        }
      ]
    }
  ]
}
```

## API Reference

### Core Functions

#### format_message(content, style, channel)
Formats a message with platform-specific styling.

**Parameters:**
- `content` (str): Message content
- `style` (str): 'success', 'error', 'warning', 'info', 'progress'
- `channel` (str): 'discord', 'whatsapp', 'telegram', 'slack'

**Returns:** Formatted message object

#### create_progress(completed, total, channel)
Creates a visual progress indicator.

**Parameters:**
- `completed` (int): Tasks/items completed
- `total` (int): Total tasks/items
- `channel` (str): Target platform

**Returns:** Formatted progress string/embed

#### create_status_dashboard(metrics, channel)
Creates a status dashboard with multiple metrics.

**Parameters:**
- `metrics` (dict): Dictionary of metric_name: value
- `channel` (str): Target platform

**Returns:** Formatted dashboard message

#### create_action_buttons(actions, channel)
Creates interactive action buttons.

**Parameters:**
- `actions` (list): List of {label, action_id} objects
- `channel` (str): Target platform

**Returns:** Formatted buttons object

### Helper Functions

#### escape_markdown(text, dialect)
Escapes special characters for markdown variants.

**Parameters:**
- `text` (str): Text to escape
- `dialect` (str): 'standard', 'discord', 'telegram_v2'

#### build_embed(title, description, fields, color, channel)
Builds a rich embed message.

**Parameters:**
- `title` (str): Embed title
- `description` (str): Main content
- `fields` (list): Array of {name, value, inline} objects
- `color` (int): RGB color value
- `channel` (str): Target platform

## Configuration

See `ui-config.json` for:
- Color schemes per channel
- Progress bar styles
- Emoji selections
- Message templates
- Button configurations

## Usage Examples

### Discord Task Update

```python
from ui_enhancements import format_message

message = format_message(
    content="Database migration",
    style="progress",
    channel="discord"
)
# Returns Discord embed with progress bar
```

### WhatsApp Status Alert

```python
from ui_enhancements import format_message

message = format_message(
    content="Server maintenance complete",
    style="success",
    channel="whatsapp"
)
# Returns: ✅ SERVER MAINTENANCE COMPLETE\n\nReady for use
```

### Telegram Interactive Status

```python
from ui_enhancements import create_action_buttons

buttons = create_action_buttons(
    actions=[
        {"label": "✅ Approve", "action_id": "approve_001"},
        {"label": "❌ Reject", "action_id": "reject_001"}
    ],
    channel="telegram"
)
# Returns Telegram inline keyboard
```

## Best Practices

### For Long-Running Tasks
1. Send initial message with progress indicator
2. Update every 30-60 seconds with new progress
3. Include time estimate when available
4. Show current step/stage name
5. Send completion notification with summary

### For Error States
1. Use clear error emoji (❌)
2. Explain what went wrong
3. Suggest remediation steps
4. Provide support contact if needed
5. Include error code/ID for debugging

### For Multi-Step Operations
1. Create status dashboard at start
2. Update each step as complete
3. Use checkmarks for finished steps
4. Use arrows (→) for current step
5. Final summary with completion time

### For User Interactions
1. Always provide clear call-to-action
2. Disable/hide irrelevant buttons
3. Confirm button actions with feedback message
4. Handle errors gracefully
5. Provide timeout warnings for time-sensitive actions

## Platform-Specific Notes

### Discord Best Practices
- Keep embeds under 6000 characters
- Use color coding for different message types
- Utilize multiple embeds for complex data (up to 10 per message)
- Button custom_ids must be unique per message
- Use thread replies to organize conversations

### WhatsApp Best Practices
- Keep messages short and scannable
- Use emojis liberally for visual hierarchy
- Avoid special characters
- Use numbered lists for step-by-step guides
- Always provide text-based menu options

### Telegram Best Practices
- Escape special characters in MarkdownV2: `_*[]()~`
- Use code blocks for command output
- Inline buttons work best with 2-3 per row
- Callback data is limited to 64 bytes
- Use parse_mode consistently

### Slack Best Practices
- Limit blocks to 50 per message
- Use Block Kit visual elements efficiently
- Always provide text fallback for complex layouts
- Colors should follow brand guidelines
- Use secondary_confirm for dangerous actions

## Integration Points

### Message Service
Integrates with the message service for:
- Channel detection and validation
- Template rendering
- Multi-platform delivery
- Rate limiting compliance

### Logging
Automatically logs:
- Message formatting decisions
- Platform-specific adjustments
- Performance metrics
- User interaction events

### Analytics
Tracks:
- Message delivery rates
- Button click rates
- Engagement metrics
- Platform performance

## Troubleshooting

### Formatting Not Appearing
- Check platform support (some features Discord-only)
- Verify escape sequences are correct
- Ensure markdown syntax is valid
- Check message length limits

### Button Clicks Not Registering
- Verify callback_id/action_id is unique
- Check that button lifetime hasn't expired
- Ensure proper permissions on target action
- Review rate limiting and retry logic

### Progress Not Updating
- Confirm message edit permissions
- Check that message ID is valid
- Verify progress values are numeric
- Ensure update frequency is reasonable

## Future Enhancements

- [ ] Animated progress bars (animated GIFs)
- [ ] Rich media support (images, charts)
- [ ] Custom themes and branding
- [ ] Voice message support
- [ ] Accessibility improvements (alt text, descriptions)
- [ ] Real-time collaboration features
- [ ] Database for message history and analytics

## Version

**v1.0** - Initial release with core UI/UX enhancements
- Rich markdown formatting
- Multi-channel progress indicators
- Status dashboards
- Visual feedback system
- Channel-specific optimizations
