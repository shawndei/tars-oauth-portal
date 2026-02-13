# Projects/Workspaces System - Quick Start Guide

## What Is This?

A complete project management system that creates **isolated project contexts** like Claude Projects. Each project has:

- 🧠 **MEMORY.md** - Project-specific memory (loaded ONLY when project is active)
- 📋 **CONTEXT.md** - Current project state and focus
- 📁 **files/** - Project documents and resources
- ✅ **tasks.md** - Project tasks and progress
- ⚙️ **CONFIG.json** - Project settings

**Key Feature:** Complete isolation - no cross-project memory pollution.

## Quick Start

### 1. Create a Project

```bash
# Generic project
projects create my-project

# Or with a template (web-dev, data-science, writing, research, code)
projects create ecommerce --template web-dev
projects create analytics --template data-science
```

### 2. Switch Between Projects

```bash
# Switch to a project
projects switch ecommerce

# Your MEMORY.md now loads from projects/ecommerce/MEMORY.md
# CONTEXT.md shows projects/ecommerce/CONTEXT.md
```

### 3. Work in Your Project

Each project directory has:

```
projects/my-project/
├── MEMORY.md          ← Long-term project notes (isolated)
├── CONTEXT.md         ← Current state and focus
├── CONFIG.json        ← Project settings
├── tasks.md           ← Task list
├── README.md          ← Project overview
└── files/             ← Your project documents
    ├── doc1.md
    └── subfolder/
```

### 4. List & Check Status

```bash
# List all projects
projects list

# Check status of current project
projects status

# Check specific project
projects status ecommerce
```

### 5. Archive Completed Projects

```bash
# Archive when done
projects archive old-project

# Restore if needed
projects restore old-project
```

## Project Templates

Choose a template when creating a project:

### generic
Basic structure for any project
```
files/
```

### web-dev
Web development (HTML, CSS, JS, assets)
```
files/
├── html/
├── css/
├── js/
└── assets/
```

### data-science
Data analysis and ML projects
```
files/
├── data/
│   ├── raw/
│   └── processed/
├── notebooks/
└── analysis/
```

### writing
Content and documentation
```
files/
├── drafts/
├── research/
└── published/
```

### research
Research and investigation
```
files/
├── sources/
├── notes/
├── findings/
└── references/
```

### code
Software development
```
files/
├── src/
├── tests/
├── docs/
└── config/
```

## Memory & Context Isolation

### How It Works

When you have multiple projects active:

```
Session 1: projects/alpha/MEMORY.md (loaded)
Session 2: projects/beta/MEMORY.md (not loaded)
Session 3: projects/gamma/MEMORY.md (not loaded)

When you switch:
projects switch beta
→ Unload alpha/MEMORY.md
→ Load beta/MEMORY.md
→ No cross-project contamination!
```

### MEMORY.md vs CONTEXT.md

**MEMORY.md** - Long-term project-specific insights
- Key decisions made
- Architecture notes
- Important findings
- Lessons learned
- ⚠️ **Loaded ONLY when project is active**

**CONTEXT.md** - Current state snapshot
- What you're currently working on
- Recent progress
- Next steps
- **Always accessible** for current project

## File Organization

### Good Practice
- **Keep files in `projects/{name}/files/`** - Sandboxed to your project
- **Update MEMORY.md regularly** - Capture learnings as you go
- **Use descriptive names** - `projects/ecommerce-redesign` not `proj123`
- **Archive when done** - Keeps active list clean

### Example: E-commerce Project

```
projects/ecommerce-redesign/
├── MEMORY.md
│   - Design decisions
│   - API architecture
│   - Performance insights
├── CONTEXT.md
│   - Current sprint: User auth module
│   - Blockers: Payment gateway integration
├── tasks.md
│   - [ ] Implement login flow
│   - [x] Design wireframes
│   - [ ] Set up database
├── files/
│   ├── wireframes.png
│   ├── design-doc.md
│   ├── api-spec.md
│   └── code/
│       ├── src/
│       └── tests/
└── CONFIG.json
```

## Commands Reference

| Command | What It Does | Example |
|---------|-------------|---------|
| `projects create` | Create new project | `projects create my-proj --template web-dev` |
| `projects list` | Show all projects | `projects list` |
| `projects switch` | Change active project | `projects switch my-proj` |
| `projects status` | View project details | `projects status` |
| `projects archive` | Archive a project | `projects archive old-proj` |
| `projects restore` | Restore archived project | `projects restore old-proj` |

## Integration with AGENTS.md

The projects system integrates seamlessly with `AGENTS.md`:

**Loading Order (Each Session):**
1. Read `SOUL.md` - Who you are
2. Read `USER.md` - Who you're helping
3. Read `memory/YYYY-MM-DD.md` - Today's notes
4. **Load active project MEMORY.md** ← New!
5. Read `MEMORY.md` - Main session memory

**Result:** Project context is always loaded when you switch projects, and never pollutes other projects.

## Real-World Example

### Scenario: Managing 3 Concurrent Projects

```bash
# Day 1: Start e-commerce work
projects create ecommerce-redesign --template web-dev
projects switch ecommerce-redesign
# Edit projects/ecommerce-redesign/MEMORY.md with design notes
# Work on ecommerce...

# Day 2: Switch to data analysis
projects create customer-analytics --template data-science
projects switch customer-analytics
# Now you see projects/customer-analytics/MEMORY.md
# ecommerce MEMORY.md is completely unloaded
# Work on analytics...

# Day 3: Back to ecommerce
projects switch ecommerce-redesign
# Your ecommerce MEMORY.md is fully loaded again
# No memory of analytics work here - perfect isolation!

# Month later: Archive completed projects
projects archive ecommerce-redesign
projects archive customer-analytics
projects list  # Shows only active projects
```

## Troubleshooting

**Q: How do I see which project is active?**
```bash
cat projects/ACTIVE_PROJECT.txt
```

**Q: Can I have multiple projects open at once?**
No - only one project is "active" at a time. But you can switch instantly with `projects switch`.

**Q: Will my memories from other projects bleed in?**
No - that's the whole point of this system. Only the active project's MEMORY.md is loaded.

**Q: How do I move files between projects?**
Just copy them from `projects/old/files/` to `projects/new/files/`

**Q: Can I delete a project permanently?**
Archive it first with `projects archive`, then manually delete the folder if needed.

## Best Practices

✅ **DO:**
- Create a new project per major work initiative
- Name projects clearly: `client-website`, `ml-experiment`, `book-draft`
- Update MEMORY.md weekly with key learnings
- Use tags in CONFIG.json: `["web", "urgent", "client"]`
- Archive projects when they're complete

❌ **DON'T:**
- Keep everything in `default` project
- Use vague project names
- Mix multiple work streams in one project
- Forget to update MEMORY.md
- Leave completed projects in active list

## For Shawn's TARS System

This system enables:

1. **Multi-Agent Isolation** - Each agent can have its own project context
2. **Context Switching** - Agents switch between projects without contamination
3. **Memory Persistence** - Project-specific learning survives across sessions
4. **Task Tracking** - Keep projects organized with dedicated task lists
5. **File Management** - Sandbox files per project for safety

Perfect for managing complex multi-project workflows in TARS!

---

**Need help?** See `SKILL.md` for detailed documentation.
