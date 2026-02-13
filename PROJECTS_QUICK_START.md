# Projects Quick Start Guide

**TL;DR:** Project context system is ready. Here's how to use it.

---

## Right Now

The system is active and working:

```
✓ ACTIVE_PROJECT.txt = "default"
✓ projects/default/ has CONTEXT.md, MEMORY.md, CONFIG.json
✓ 3 other projects ready: content-strategy, web-app-redesign, data-pipeline
✓ Utilities ready: switch-project.ps1, create-project.ps1
```

---

## Basic Commands

### Switch Projects

```powershell
.\switch-project.ps1 -Project "content-strategy"
```

Result: Context loads, you're aware of that project's state.

### Create New Project

```powershell
.\create-project.ps1 -Name "My Project" -Description "What it's about" -Template "writing"
```

Result: New project with full structure, ready to use.

### See Current Project

```powershell
cat ACTIVE_PROJECT.txt
```

Result: Project name.

---

## Session Flow

**When you start:**

```
Automatic:
1. ACTIVE_PROJECT.txt read → "default" (or whichever)
2. projects/{project}/CONTEXT.md loaded
3. projects/{project}/MEMORY.md available
4. You're aware of project goals, blockers, active items
```

**When you work:**

```
Reference project context naturally:
- "I see the focus is on Kubernetes articles..."
- "Let me help with the blocker about technical review..."
- "Based on your team structure..."
```

**When you're done:**

```
Update before ending session:
1. Edit projects/{project}/CONTEXT.md
   - Update "Current State"
   - Add to "Recent Activity"
   - Update "Progress" %
2. Log to projects/{project}/memory/{YYYY-MM-DD}.md
   - What you did
   - Decisions made
3. Update projects/{project}/CONFIG.json metadata
```

---

## Project Structure

Each project has:

```
projects/{name}/
├── CONTEXT.md      ← Current state (you read this)
├── MEMORY.md       ← Long-term decisions (you read this)
├── CONFIG.json     ← Settings (for reference)
├── tasks.md        ← Task list (you manage this)
├── README.md       ← Overview
├── files/          ← Project assets
└── memory/         ← Daily logs (you update this)
```

---

## What Goes Where

**CONTEXT.md** (Update when state changes)
- What you're working on
- What's blocking you
- What's next
- Team and tech stack

**MEMORY.md** (Update with important learnings)
- Decisions you've made
- Strategic insights
- Lessons learned

**memory/{YYYY-MM-DD}.md** (Update daily)
- Work log
- What you accomplished
- Discoveries
- Raw notes

---

## Key Files to Know

| File | Purpose | Update Frequency |
|------|---------|------------------|
| ACTIVE_PROJECT.txt | Which project you're in | Manual (switch-project) |
| CONTEXT_LOADER.md | How the system works | Reference only |
| PROJECT_INTEGRATION.md | How it integrates | Reference only |
| PROJECTS_QUICK_START.md | This file | Reference only |

---

## Common Tasks

### Switch to a Project

```powershell
.\switch-project.ps1 -Project "content-strategy"
```

Your next action will be in that project context.

### Create a New Project

```powershell
.\create-project.ps1 -Name "Product Launch" -Template "product"
```

New project ready with full structure.

### Update Project After Work

```
1. Open projects/{project}/CONTEXT.md
2. Update:
   - "Focus" (what you're doing now)
   - "Active Items" (what's on the table)
   - "Progress" (what %)
   - "Recent Activity" (add timestamp + what you did)

3. Log to projects/{project}/memory/{YYYY-MM-DD}.md
   - Bullet list of what was accomplished
   - Any important decisions
   - Blockers or next steps

4. Optional: Update CONFIG.json metadata
   - completedTasks count
   - lastActivity timestamp
```

### Archive Old Projects

```
Manual process:
1. Edit projects/{project}/CONFIG.json
2. Set "archived": true
3. It stays but won't be active
```

---

## Memory System

**Three levels:**

```
1. Session (current conversation)
   ↓
2. Daily episodic (projects/{project}/memory/{YYYY-MM-DD}.md)
   ↓
3. Long-term (projects/{project}/MEMORY.md)
```

**What to put where:**

- **Daily:** Work logs, discoveries, raw notes
- **Long-term:** Decisions, insights, strategy

---

## Examples

### Content Strategy Project

```
Switch: .\switch-project.ps1 -Project "content-strategy"

Context loaded:
- Focus: Writing Kubernetes tutorial
- Blocker: Need technical review
- Team: Sarah (lead), James (writer), Alicia (SEO)
- Progress: 25%

You now reference this naturally in conversation.
```

### Create New Project

```
.\create-project.ps1 -Name "Q1 Marketing" -Template "marketing"

Result:
- projects/q1-marketing/ created
- CONTEXT.md with template structure
- MEMORY.md ready
- memory/ directory for daily logs
- tasks.md for your task list
- Switch to it and start work
```

---

## Troubleshooting

**"Can't switch to project"**

```
Check: .\switch-project.ps1 -Project "name"
Error means project doesn't exist
Solution: .\create-project.ps1 -Name "name"
```

**"CONTEXT.md is stale"**

```
Solution: Update it!
- Check CURRENT STATE section
- Add recent activities
- Update progress %
```

**"Switched but don't see context"**

```
Check: cat ACTIVE_PROJECT.txt
Should show the project you switched to
If not, switch again
```

**"Lost work/memory"**

```
Check: projects/{project}/memory/{YYYY-MM-DD}.md
Should have daily logs
Check: projects/{project}/MEMORY.md
Should have important decisions
```

---

## Tips

✅ **Do**
- Switch projects explicitly (keeps you focused)
- Update CONTEXT.md when state changes
- Log daily to memory/{YYYY-MM-DD}.md
- Reference project context in decisions

❌ **Don't**
- Leave CONTEXT.md stale (confuses next session)
- Mix project memories (keep them separated)
- Forget to update ACTIVE_PROJECT.txt when switching
- Store secrets in CONTEXT.md

---

## Next Steps

1. **Try switching projects**
   ```powershell
   .\switch-project.ps1 -Project "content-strategy"
   ```

2. **Review a project's context**
   - Read projects/content-strategy/CONTEXT.md
   - See what format looks like
   - Understand the structure

3. **Create a new project**
   ```powershell
   .\create-project.ps1 -Name "My Project"
   ```

4. **Start using it**
   - Work in a project
   - Update CONTEXT.md when done
   - Switch to another project
   - See context load automatically

---

## Need More Info?

- **CONTEXT_LOADER.md** - Complete system documentation
- **PROJECT_INTEGRATION.md** - How it integrates with your workflow
- **PROJECTS_IMPLEMENTATION_SUMMARY.md** - Technical implementation details

---

**System Status:** ✅ Ready to use

Switch projects, manage context, stay organized. Go!
