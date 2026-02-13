# Project Context Loader

**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-02-13

This document describes how project context switching works in your workspace.

---

## Overview

The project context system provides **isolated namespaces** for managing multiple projects, each with their own:

- **Project Context** (CONTEXT.md) - Current state, goals, active items
- **Project Memory** (memory/) - Long-term decisions and learnings
- **Project Configuration** (CONFIG.json) - Settings and metadata
- **Project Files** (files/) - Assets, drafts, research

When you switch projects, the system automatically loads:
1. Project-specific context into your session
2. Episodic memories associated with that project
3. Project configuration and settings
4. Task lists and active items

---

## File Structure

Each project follows this structure:

```
projects/{project-name}/
├── CONTEXT.md              # Current project state (loaded on switch)
├── MEMORY.md               # Long-term project memory
├── CONFIG.json             # Project metadata and settings
├── README.md               # Project overview
├── tasks.md                # Project task list
├── files/                  # Project-specific files
│   ├── drafts/
│   ├── research/
│   └── published/
└── memory/                 # Project episodic memory (daily logs)
    ├── 2026-02-13.md
    ├── 2026-02-12.md
    └── ...
```

### ACTIVE_PROJECT.txt

**Location:** `{workspace}/ACTIVE_PROJECT.txt`

Contains a single line with the active project name:

```
default
```

This file is read by the main session to determine which project context to load.

---

## How It Works

### 1. Project Switch (On Session Start)

When you start a new session or switch projects:

```
1. Read ACTIVE_PROJECT.txt → Get project name
2. Load projects/{project}/CONTEXT.md → Inject into session
3. Load projects/{project}/MEMORY.md → Access long-term memory
4. Load projects/{project}/CONFIG.json → Get settings
5. Set episodic memory namespace → projects.{project}
```

### 2. Context Injection

The active project's CONTEXT.md is automatically injected into your system prompt so you're aware of:
- Project goals and current state
- Active items and blockers
- Recent activity
- Team members and key technologies

### 3. Memory Isolation

Each project has isolated memory:

- **projects/{project}/MEMORY.md** - Long-term project decisions and insights
- **projects/{project}/memory/{YYYY-MM-DD}.md** - Daily episodic memory for that project
- **Episodic Memory Database** - Tagged with project namespace (projects.{project})

When you write to memory in a project, it's stored in that project's namespace.

### 4. Context Awareness

When working in a project, you:

- Understand the current state and goals
- Have access to project-specific memories
- See active tasks and blockers
- Can make decisions aligned with project strategy
- Are aware of team members and technologies

---

## Switching Projects

### From Main Agent

You don't manually edit ACTIVE_PROJECT.txt. Instead:

```
# Switch to a project:
/switch-project content-strategy

# Creates/updates ACTIVE_PROJECT.txt
# Loads project context automatically
# Injects into next session
```

### In a Subagent

If you're a subagent assigned to a project, the main agent ensures:
1. ACTIVE_PROJECT.txt is set correctly
2. Project context is loaded in your session
3. You work within that project's namespace

---

## Project Isolation

### Why Isolation?

- **Focus:** Each project has clear boundaries and context
- **Memory Separation:** Memories don't bleed between projects
- **Configuration:** Project-specific settings don't interfere
- **Scalability:** Can manage dozens of projects without confusion

### What's Isolated?

✅ **Isolated per-project:**
- MEMORY.md (long-term memory)
- memory/{YYYY-MM-DD}.md (daily episodic logs)
- Episodic memory database (namespace: projects.{project})
- CONFIG.json (settings)
- files/ (project assets)
- tasks.md (project tasks)

✅ **Shared across projects:**
- AGENTS.md (identity - you're the same agent across projects)
- USER.md (user context - you work for the same person)
- SOUL.md (your values - consistent across projects)
- skills/ (tools and abilities - universal)
- TOOLS.md (device/service setup - universal)

---

## CONTEXT.md Structure

Every project should have a CONTEXT.md following this template:

```markdown
# {Project Name} - Project Context

**Status:** Active|Paused|Archived  
**Created:** YYYY-MM-DD HH:MM:SS  
**Template:** {template-type}  
**Progress:** X% ({description})

## Current State
- **Focus:** {What you're currently working on}
- **Phase:** {Project phase}
- **Last Updated:** YYYY-MM-DD HH:MM:SS

## Active Items
- [x] Completed task
- [ ] Current task
- [ ] Upcoming task

## Current Sprint (Week of X-Y)
**Goal:** {Sprint objective}

**Working On:**
- Item 1
- Item 2

**Blockers:**
- Blocker 1
- Blocker 2

## Project Structure
{Show the file organization}

## Recent Activity
{Bullet list of recent events}

## Key Technologies
{Tools, platforms, services used}

## Team Members
{People involved and roles}

## Next Steps
1. Step 1
2. Step 2
3. Step 3

---
*Updated automatically. Shows current project state and focus.*
```

---

## CONFIG.json Structure

Every project should have CONFIG.json with this structure:

```json
{
  "name": "{project-slug}",
  "archived": false,
  "template": "{template-type}",
  "created": "2026-02-13T09:31:00Z",
  "modified": "2026-02-13T09:31:00Z",
  "description": "{One-line description}",
  "tags": ["tag1", "tag2"],
  "settings": {
    "contextIsolation": true,
    "autoArchiveAfterDays": null,
    "maxMemorySize": "50MB",
    "collaborators": ["Name (Role)"]
  },
  "metadata": {
    "tasksCount": 0,
    "completedTasks": 0,
    "filesCount": 0,
    "lastActivity": "2026-02-13T09:31:00Z"
  }
}
```

---

## Creating a New Project

1. **Create project directory:**
   ```bash
   mkdir projects/my-project
   ```

2. **Create CONTEXT.md:**
   Copy template above, fill in project details

3. **Create CONFIG.json:**
   Copy structure above, customize settings

4. **Create MEMORY.md:**
   Start with empty "## Memory" section

5. **Create directory structure:**
   ```bash
   mkdir projects/my-project/files
   mkdir projects/my-project/files/{drafts,research,published}
   mkdir projects/my-project/memory
   ```

6. **Create README.md:**
   Brief project overview

7. **Create tasks.md:**
   Initial task list

---

## Session Prompt Injection

When in an active project, your system prompt includes:

```
## Active Project Context

[Content of projects/{project}/CONTEXT.md]

When responding:
- Keep project goals and current state in mind
- Reference active items and blockers when relevant
- Make decisions aligned with project strategy
- Update memory in the project's namespace when needed
```

This ensures you're always aware of project context and can make informed decisions.

---

## Episodic Memory Namespace

When logging episodic memories in a project, they're tagged:

```
Namespace: projects.{project-name}
Tags: [project-specific-tag, work-type, ...]
Date: YYYY-MM-DD
```

Example episodic memory entry:

```
{
  "timestamp": "2026-02-13T12:30:00Z",
  "project": "content-strategy",
  "namespace": "projects.content-strategy",
  "content": "Completed keyword research for first 4 articles...",
  "type": "task-completion",
  "tags": ["research", "seo", "completed"],
  "session": "main"
}
```

---

## Best Practices

### ✅ Do

- **Update CONTEXT.md regularly** - Keep it current for next session
- **Log project activities** in memory/{YYYY-MM-DD}.md - Daily context
- **Update CONFIG.json metadata** - tasksCount, completedTasks, lastActivity
- **Keep memory isolated** - Use project memory for project-specific learning
- **Document decisions** - Update MEMORY.md with important decisions

### ❌ Don't

- **Mix project memories** - Keep content-strategy memory in content-strategy/
- **Store secrets in CONTEXT.md** - Use environment variables instead
- **Ignore ACTIVE_PROJECT.txt** - It's the source of truth
- **Leave projects without CONTEXT.md** - New sessions need context
- **Accumulate outdated tasks** - Archive completed/cancelled tasks

---

## Integration Points

### Main Session (AGENTS.md)

When starting a main session, the prompt includes:

```
## Load Project Context

1. Read ACTIVE_PROJECT.txt
2. Load projects/{project}/CONTEXT.md
3. Inject as "## Active Project Context" in session
4. Set episodic memory namespace to "projects.{project}"
```

### Subagent Creation

When creating a subagent for a project:

```
1. Set ACTIVE_PROJECT.txt to project name
2. Pass project context in subagent briefing
3. Subagent's episodic memory is project-namespaced
4. Task completion logged to project memory
```

### Project Switching

```
User: /switch-project my-project

1. Validate project exists
2. Update ACTIVE_PROJECT.txt
3. Trigger context reload
4. Notify user of switch
```

---

## Troubleshooting

### "CONTEXT.md not found"

**Solution:** Create it using the template above in projects/{project}/CONTEXT.md

### "Can't find ACTIVE_PROJECT.txt"

**Solution:** Create it with the project name as single line:
```bash
echo "default" > ACTIVE_PROJECT.txt
```

### "Memory bleeding between projects"

**Solution:** Ensure episodic memory is namespaced to projects.{project-name}

### "CONTEXT.md is stale"

**Solution:** Update it regularly, especially CURRENT STATE and RECENT ACTIVITY sections

---

## Future Enhancements

Potential additions to consider:

- [ ] Project templates for common types (product, content, research, dev)
- [ ] Automatic context switching based on git branch
- [ ] Project dependencies and linking
- [ ] Shared memory for cross-project items
- [ ] Archive/restore functionality
- [ ] Project analytics dashboard
- [ ] Bulk operations across projects

---

## Examples

See existing projects for reference:

- **default** - General-purpose project
- **content-strategy** - Writing/content project
- **web-app-redesign** - Product/design project
- **data-pipeline** - Engineering project

---

*Project context system enables focus, isolation, and scalability. Keep it current, keep it organized.*
