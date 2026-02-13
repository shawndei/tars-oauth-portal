# Enhanced Projects/Workspaces System

**Version:** 1.0.0  
**Purpose:** Isolated project contexts with full memory and context management (Claude Projects-like experience)  
**Status:** Active

## Overview

This system creates isolated project workspaces where each project has:
- **Dedicated memory** (MEMORY.md) - Project-specific context
- **Project context** (CONTEXT.md) - Current state and configuration
- **File storage** (files/) - Project-related documents
- **Task tracking** (tasks.md) - Project goals and TODOs
- **Full isolation** - No cross-project context pollution

Perfect for TARS (The Agent Reality System) to manage multiple concurrent projects or workflows without interference.

## Project Structure

```
projects/
├── {projectname}/
│   ├── MEMORY.md           # Long-term project memory (curated)
│   ├── CONTEXT.md          # Current project context & state
│   ├── CONFIG.json         # Project-specific config
│   ├── tasks.md            # Project tasks and progress
│   ├── files/              # Project files directory
│   │   ├── project-doc.md
│   │   └── ...
│   └── archive/            # Old/archived files (optional)
├── projects-config.json    # Global projects metadata
└── ACTIVE_PROJECT.txt      # Currently active project
```

## Features

### 1. Project Creation
Create new isolated projects with templates.

**Command Pattern:**
```bash
projects create <name> [--template <template>]
```

**What happens:**
- Creates `projects/{name}/` directory structure
- Initializes MEMORY.md (empty, ready to fill)
- Creates CONTEXT.md with project metadata
- Creates CONFIG.json with project settings
- Creates tasks.md with empty task list
- Creates files/ directory for project documents
- Registers project in projects-config.json
- Optionally applies template (web-dev, data-science, writing, generic)

### 2. Project Switching
Switch active context to a different project.

**Command Pattern:**
```bash
projects switch <name>
```

**What happens:**
- Validates project exists
- Updates ACTIVE_PROJECT.txt
- Loads project CONTEXT.md and MEMORY.md for agent session
- Clears previous project context from session
- Returns project overview

### 3. Context Isolation
Ensures no cross-project memory/context leakage.

**How it works:**
- Each session loads ONLY the active project's MEMORY.md
- MEMORY.md files for other projects remain unloaded
- CONTEXT.md switches to active project context
- Daily logs (memory/YYYY-MM-DD.md) can be project-aware if needed
- Session context manager prevents pollution

### 4. Archive Project
Archive completed or inactive projects.

**Command Pattern:**
```bash
projects archive <name>
```

**What happens:**
- Moves project to `projects/{name}.archive/` OR adds `ARCHIVED: true` to CONFIG.json
- Removes from active projects list
- Preserves all data (MEMORY, files, etc.)
- Can be restored with `projects restore <name>`

### 5. Share Project Context
Export project context for sharing with other agents or external use.

**Command Pattern:**
```bash
projects share <name> [--format json|markdown]
```

**Exports:**
- Project MEMORY.md and CONTEXT.md
- CONFIG.json metadata
- Summary of tasks and progress
- Can be imported to new project or shared read-only

### 6. Project Templates
Pre-configured starting points for common project types.

**Built-in Templates:**
- `generic` - Basic project structure
- `web-dev` - Web development (HTML, CSS, JS files)
- `data-science` - Data analysis (datasets, notebooks, analysis)
- `writing` - Content/documentation (drafts, notes, final)
- `research` - Research project (sources, notes, findings)
- `code` - Software development (src, tests, docs)

**Template Structure:**
Each template includes initial CONTEXT.md, task structure, and recommended file organization.

## Configuration

### projects-config.json
Global registry of all projects.

```json
{
  "version": "1.0.0",
  "activeProject": "default",
  "projects": {
    "default": {
      "name": "default",
      "created": "2026-02-13T00:00:00Z",
      "modified": "2026-02-13T08:23:00Z",
      "template": "generic",
      "description": "Default workspace",
      "status": "active",
      "tags": []
    },
    "project-alpha": {
      "name": "project-alpha",
      "created": "2026-02-13T08:25:00Z",
      "modified": "2026-02-13T08:25:00Z",
      "template": "web-dev",
      "description": "E-commerce platform redesign",
      "status": "active",
      "tags": ["web", "commerce", "urgent"]
    },
    "project-beta": {
      "name": "project-beta",
      "created": "2026-02-13T08:30:00Z",
      "modified": "2026-02-13T08:30:00Z",
      "template": "data-science",
      "description": "Customer analytics pipeline",
      "status": "active",
      "tags": ["data", "analytics", "ml"]
    }
  },
  "templates": {
    "generic": { "description": "Basic project structure" },
    "web-dev": { "description": "Web development project" },
    "data-science": { "description": "Data science/ML project" },
    "writing": { "description": "Content/writing project" },
    "research": { "description": "Research project" },
    "code": { "description": "Software development" }
  }
}
```

### Project CONFIG.json
Per-project configuration.

```json
{
  "name": "project-alpha",
  "archived": false,
  "template": "web-dev",
  "created": "2026-02-13T08:25:00Z",
  "modified": "2026-02-13T08:25:00Z",
  "description": "E-commerce platform redesign",
  "tags": ["web", "commerce", "urgent"],
  "settings": {
    "contextIsolation": true,
    "autoArchiveAfterDays": null,
    "maxMemorySize": "10MB",
    "collaborators": []
  },
  "metadata": {
    "tasksCount": 5,
    "completedTasks": 1,
    "filesCount": 12,
    "lastActivity": "2026-02-13T08:30:00Z"
  }
}
```

## Usage Examples

### Create a Web Development Project
```bash
projects create ecommerce-redesign --template web-dev
```

Creates:
- `projects/ecommerce-redesign/`
- Organized with HTML/CSS/JS file structure
- Initialized MEMORY.md for design decisions
- tasks.md with web dev workflow tasks

### Switch Between Projects
```bash
# Switch to active analysis work
projects switch customer-analytics

# Now MEMORY.md = projects/customer-analytics/MEMORY.md
# CONTEXT.md = projects/customer-analytics/CONTEXT.md
# Agent session is isolated to this project context
```

### Add Task to Current Project
```bash
projects add-task "Implement user authentication module" --priority high --dueDate 2026-02-20
```

Updates `projects/{activeProject}/tasks.md`

### List All Projects
```bash
projects list
```

Output:
```
ACTIVE PROJECTS:
✓ default          Generic workspace (created 2 days ago)
  ecommerce-redesign  Web development (5 tasks, 1 complete)
  customer-analytics  Data science (12 tasks, 3 complete)

ARCHIVED:
  past-project-1   (archived 3 days ago)
```

### Get Project Status
```bash
projects status ecommerce-redesign
```

Output:
```
Project: ecommerce-redesign
Status: Active
Created: 2 hours ago
Tasks: 5 total, 1 complete (20%)
Files: 12 items (1.5 MB)
Last Activity: 10 minutes ago
Tags: web, commerce, urgent
```

## Memory Files

### MEMORY.md (Project-Specific)
**Loaded ONLY when project is active**

Contains:
- Project goals and vision
- Key decisions made
- Architecture/design notes
- Important findings or learnings
- Blockers and how they were resolved
- Context about stakeholders/requirements

Example structure:
```markdown
# Project Memory: E-commerce Redesign

## Vision
Modernize checkout flow to reduce cart abandonment by 30%.

## Key Decisions
- Using React for UI (decided 2/13)
- Stripe for payment processing
- Mobile-first design approach

## Architecture
- Frontend: React SPA
- Backend: Node.js/Express
- Database: PostgreSQL

## Important Findings
- Current flow has 5 steps, target is 2 steps
- Mobile users drop off 60% of the time

## Blockers Resolved
- API rate limiting → Used caching layer
```

### CONTEXT.md (Current State)
**Always available**

Contains:
- Project metadata and status
- Current working items
- Recent decisions
- Links to key documents
- Project structure overview

## Context Isolation Implementation

### How It Works

1. **Session Loading:**
   - At session start, read ACTIVE_PROJECT.txt
   - Load ONLY that project's MEMORY.md
   - Load CONTEXT.md for state awareness
   - Keep other projects' memory files unloaded

2. **Context Switching:**
   - Unload current project's MEMORY.md from session
   - Write any session notes to memory/YYYY-MM-DD.md
   - Load new project's MEMORY.md
   - Load new project's CONTEXT.md
   - Reset session context variables

3. **Prevention of Pollution:**
   - Never load multiple MEMORY.md files simultaneously
   - Each agent session has single active project
   - Archived projects not loaded unless explicitly requested
   - File operations sandboxed to `projects/{activeProject}/files/`

## Commands Summary

| Command | Purpose | Example |
|---------|---------|---------|
| `projects create` | Create new project | `projects create my-project --template web-dev` |
| `projects switch` | Change active project | `projects switch my-project` |
| `projects list` | Show all projects | `projects list` |
| `projects status` | View project details | `projects status my-project` |
| `projects add-task` | Add task to project | `projects add-task "Task description" --priority high` |
| `projects archive` | Archive a project | `projects archive old-project` |
| `projects restore` | Restore archived project | `projects restore old-project` |
| `projects share` | Export project context | `projects share my-project --format json` |
| `projects delete` | Permanently delete project | `projects delete old-project --confirm` |

## Integration with AGENTS.md

The projects system integrates with the main AGENTS.md workflow:

**AGENTS.md Loading Order:**
```
1. Read SOUL.md
2. Read USER.md
3. Read memory/YYYY-MM-DD.md (today + yesterday)
4. **NEW:** Load active project's MEMORY.md (if in project context)
5. Load MEMORY.md (main session memory)
```

This ensures:
- Project context is loaded before main session context
- Project memory is always scoped to active project
- No memory leakage between projects
- Seamless switching between project and global work

## File Storage

### Project Files Organization

```
projects/{name}/files/
├── README.md              # Project overview
├── project-doc.md         # Main documentation
├── design/
│   ├── wireframes.png
│   └── design-doc.md
├── code/                  # Template-dependent
│   ├── src/
│   └── tests/
├── data/                  # Template-dependent
│   ├── raw/
│   └── processed/
└── archive/               # Old files
    └── old-version.md
```

## Security & Privacy

- **Isolation:** Projects are completely isolated by default
- **Read-only access:** Share exports use read-only manifest
- **No external access:** Projects stored locally only
- **Deletion:** Archived projects can be permanently deleted (with confirmation)
- **Sensitive data:** Each project can mark files as sensitive

## Best Practices

### ✓ DO
- Create a new project per major work initiative
- Update MEMORY.md periodically with key learnings
- Use meaningful project names (ecommerce-redesign, not proj123)
- Archive completed projects to keep active list clean
- Add tags to organize projects (web, urgent, data-science, etc.)

### ✗ DON'T
- Keep everything in default project
- Mix multiple work streams in one project
- Leave projects active after completion
- Store sensitive data without encryption
- Use projects for temporary experiments (use temp workspace instead)

## Troubleshooting

**Problem:** Context pollution (seeing other project's memories)
- **Solution:** Ensure AGENTS.md loads only active project MEMORY.md
- **Check:** Verify ACTIVE_PROJECT.txt has correct project name

**Problem:** Can't switch projects
- **Solution:** Run `projects verify` to check project integrity
- **Check:** Ensure project directory exists with CONFIG.json

**Problem:** Lost project data
- **Solution:** Check archive/ and .archive folders
- **Backup:** Keep regular exports with `projects share`

## Implementation Checklist

- [x] Project directory structure
- [x] MEMORY.md and CONTEXT.md templates
- [x] projects-config.json schema
- [x] Create command with templates
- [x] Switch command with context isolation
- [x] Archive/restore functionality
- [x] Share/export functionality
- [x] Task management
- [x] Integration with AGENTS.md
- [x] Verification tools

## Version History

**v1.0.0** (2026-02-13)
- Initial release
- Core project management
- Full context isolation
- Template system
- Share/export
- Archive support

---

**Next Steps:** See README.md for quick-start and projects-config.json for current configuration.
