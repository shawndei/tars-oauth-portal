# Projects System - User Guide

**Quick Start Guide for OpenClaw's Projects/Context Workspaces System**

---

## What Is This?

The Projects System lets you create **isolated workspaces** for different projects, similar to Claude Projects. Each project has its own:

- 🧠 **Memory** - Project-specific notes and decisions
- 📋 **Context** - Current state and focus
- 📁 **Files** - Organized project documents
- ✅ **Tasks** - Project-specific task list

**Key Benefit:** Complete isolation - no cross-project memory contamination.

---

## Getting Started (5 Minutes)

### Step 1: Create Your First Project

```powershell
# Basic project
powershell -File scripts/projects-manager.ps1 -Action create -ProjectName my-project

# With a template (recommended)
powershell -File scripts/projects-manager.ps1 -Action create -ProjectName my-project -Template web-dev
```

**Available Templates:**
- `generic` - Basic project (default)
- `web-dev` - Web development (HTML/CSS/JS)
- `data-science` - Data analysis/ML
- `writing` - Content and documentation
- `research` - Research and investigation
- `code` - Software development

### Step 2: Switch to Your Project

```powershell
powershell -File scripts/projects-manager.ps1 -Action switch -ProjectName my-project
```

### Step 3: Start Working

Your project now has these files ready to use:
- `projects/my-project/MEMORY.md` - Add your project notes here
- `projects/my-project/CONTEXT.md` - Track current status
- `projects/my-project/tasks.md` - Manage your tasks
- `projects/my-project/files/` - Store your documents

---

## Common Commands

### List All Projects
```powershell
powershell -File scripts/projects-manager.ps1 -Action list
```

Shows all your projects with their descriptions.

### Check Project Status
```powershell
# Current project
powershell -File scripts/projects-manager.ps1 -Action status

# Specific project
powershell -File scripts/projects-manager.ps1 -Action status -ProjectName my-project
```

### Archive a Completed Project
```powershell
powershell -File scripts/projects-manager.ps1 -Action archive -ProjectName old-project
```

Marks the project as archived (still keeps all data).

### Restore an Archived Project
```powershell
powershell -File scripts/projects-manager.ps1 -Action restore -ProjectName old-project
```

Brings an archived project back to active status.

---

## Searching Your Projects

### Search Across All Projects
```powershell
powershell -File scripts/projects-search.ps1 -Query "keyword"
```

### Search a Specific Project
```powershell
powershell -File scripts/projects-search.ps1 -Query "keyword" -Project my-project
```

### Search Only Memory Files
```powershell
powershell -File scripts/projects-search.ps1 -Query "keyword" -MemoryOnly
```

### Search Only Tasks
```powershell
powershell -File scripts/projects-search.ps1 -Query "keyword" -TasksOnly
```

---

## Working with Projects

### Your Project Structure

```
projects/my-project/
├── MEMORY.md          ← Long-term project notes
├── CONTEXT.md         ← Current status and focus
├── CONFIG.json        ← Project settings (managed automatically)
├── tasks.md           ← Your task list
├── README.md          ← Project overview
└── files/             ← Your project documents
    └── (organized by template)
```

### What Goes in MEMORY.md?

Think of MEMORY.md as your project's long-term notebook:

- **Goals and vision** - What you're building and why
- **Key decisions** - Important choices you made
- **Architecture notes** - How things are structured
- **Lessons learned** - Insights and findings
- **Blockers resolved** - Problems you solved

**Example:**
```markdown
# my-project - Project Memory

## Goals
Build a customer dashboard with real-time analytics

## Key Decisions
- Frontend: React (team familiarity, component reusability)
- Backend: Node.js + Express (fast development)
- Database: PostgreSQL (relational data, ACID compliance)

## Important Findings
- React Context API sufficient for state management
- PostgreSQL jsonb columns great for flexible schema
- Websockets needed for real-time updates

## Current Status
- Backend API: 80% complete
- Frontend: 40% complete
- Database schema: Finalized
```

### What Goes in CONTEXT.md?

CONTEXT.md is your current snapshot:

- **What you're working on right now**
- **Recent progress**
- **Next steps**
- **Current blockers**

This file is automatically created and formatted for you. Just update the status sections as you work.

### Using tasks.md

Track your project tasks:

```markdown
# Tasks - my-project

## High Priority
- [ ] Complete user authentication
- [ ] Design dashboard wireframes
- [x] Set up database schema

## Medium Priority
- [ ] Write API documentation
- [ ] Add unit tests

## Low Priority
- [ ] Optimize query performance
```

---

## Real-World Workflow Examples

### Example 1: Starting a New Web Project

```powershell
# 1. Create the project
powershell -File scripts/projects-manager.ps1 -Action create -ProjectName client-website -Template web-dev -Description "Client portfolio website redesign"

# 2. Switch to it
powershell -File scripts/projects-manager.ps1 -Action switch -ProjectName client-website

# 3. Open MEMORY.md and add project details
notepad projects\client-website\MEMORY.md

# 4. Add your tasks
notepad projects\client-website\tasks.md

# 5. Start adding files to projects/client-website/files/
```

### Example 2: Managing Multiple Projects

```powershell
# Morning: Work on web project
powershell -File scripts/projects-manager.ps1 -Action switch -ProjectName web-app

# ... do your work ...

# Afternoon: Switch to data project
powershell -File scripts/projects-manager.ps1 -Action switch -ProjectName data-analysis

# ... work on data analysis ...

# Next day: Back to web project
powershell -File scripts/projects-manager.ps1 -Action switch -ProjectName web-app
# Your web-app context is exactly as you left it!
```

### Example 3: Finding Information Across Projects

```powershell
# Where did I use that API?
powershell -File scripts/projects-search.ps1 -Query "OpenAI API"

# What were my React decisions?
powershell -File scripts/projects-search.ps1 -Query "React" -MemoryOnly

# What tasks mention "deployment"?
powershell -File scripts/projects-search.ps1 -Query "deployment" -TasksOnly
```

---

## Tips & Best Practices

### ✅ DO

1. **Use descriptive project names**
   - Good: `ecommerce-redesign`, `customer-analytics`
   - Bad: `project1`, `temp`, `test`

2. **Update MEMORY.md regularly**
   - Add decisions as you make them
   - Document why you chose one approach over another
   - Capture lessons learned

3. **Choose the right template**
   - Match the template to your project type
   - Templates create helpful folder structures

4. **Archive completed projects**
   - Keeps your active project list clean
   - Archived projects keep all their data

5. **Use tags effectively**
   - Edit CONFIG.json to add tags
   - Tags help organize and filter projects

### ❌ DON'T

1. **Don't keep everything in one project**
   - Create separate projects for different initiatives
   - Isolation prevents confusion

2. **Don't forget to switch projects**
   - Always switch when starting work on a different project
   - Ensures you're loading the right context

3. **Don't mix unrelated work**
   - Keep project boundaries clear
   - If it's a different initiative, make a new project

4. **Don't delete projects directly**
   - Use archive instead
   - You can always restore if needed

---

## Keyboard-Friendly Shortcuts

Create PowerShell aliases for faster access:

```powershell
# Add to your PowerShell profile:
function proj-list { powershell -File C:\Users\DEI\.openclaw\workspace\scripts\projects-manager.ps1 -Action list }
function proj-switch { param($name) powershell -File C:\Users\DEI\.openclaw\workspace\scripts\projects-manager.ps1 -Action switch -ProjectName $name }
function proj-status { param($name) powershell -File C:\Users\DEI\.openclaw\workspace\scripts\projects-manager.ps1 -Action status -ProjectName $name }
function proj-search { param($query) powershell -File C:\Users\DEI\.openclaw\workspace\scripts\projects-search.ps1 -Query $query }

# Now you can use:
proj-list
proj-switch my-project
proj-search "React"
```

---

## Troubleshooting

### Problem: "Project not found"
**Solution:** Check your spelling. Run `proj-list` to see all projects.

### Problem: "Template not found"
**Solution:** Use one of the valid templates: generic, web-dev, data-science, writing, research, code.

### Problem: Can't see my project in the list
**Solution:** Check `projects-config.json` to ensure your project is registered.

### Problem: Search returns no results
**Solution:** 
- Check your spelling
- Make sure the term exists in your project files
- Try searching without filters first

### Problem: Lost track of which project is active
**Solution:** 
```powershell
Get-Content projects\ACTIVE_PROJECT.txt
```

---

## Integration with AGENTS.md

The projects system integrates with OpenClaw's agent system:

**When an agent session starts:**
1. Agent reads SOUL.md and USER.md
2. Agent checks ACTIVE_PROJECT.txt
3. Agent loads active project's MEMORY.md
4. Agent loads active project's CONTEXT.md
5. Agent begins work in that project context

**This means:**
- Agents automatically work within your active project
- Memory stays isolated per project
- No cross-project contamination

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Create project | `projects-manager.ps1 -Action create -ProjectName NAME -Template TYPE` |
| List projects | `projects-manager.ps1 -Action list` |
| Switch project | `projects-manager.ps1 -Action switch -ProjectName NAME` |
| Check status | `projects-manager.ps1 -Action status` |
| Archive project | `projects-manager.ps1 -Action archive -ProjectName NAME` |
| Restore project | `projects-manager.ps1 -Action restore -ProjectName NAME` |
| Search all | `projects-search.ps1 -Query "term"` |
| Search specific | `projects-search.ps1 -Query "term" -Project NAME` |

---

## Templates Reference

### generic
Basic structure for any project.
```
files/
```

### web-dev
Web development with HTML, CSS, JavaScript.
```
files/
├── html/
├── css/
├── js/
└── assets/
```

### data-science
Data analysis and machine learning.
```
files/
├── data/
│   ├── raw/
│   └── processed/
├── notebooks/
└── analysis/
```

### writing
Content creation and documentation.
```
files/
├── drafts/
├── research/
└── published/
```

### research
Research and investigation projects.
```
files/
├── sources/
├── notes/
├── findings/
└── references/
```

### code
Software development projects.
```
files/
├── src/
├── tests/
├── docs/
└── config/
```

---

## Need More Help?

- **Quick Start:** See README.md in skills/projects-system/
- **Full Documentation:** See SKILL.md in skills/projects-system/
- **Testing Guide:** See TESTING.md in skills/projects-system/
- **Integration Guide:** See INTEGRATION.md in skills/projects-system/
- **Test Results:** See TEST_RESULTS.md

---

**Happy project organizing! 🚀**
