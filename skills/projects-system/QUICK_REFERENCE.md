# Projects System - Quick Reference Card

**One-page cheat sheet for daily use**

---

## Core Commands

```powershell
# Create new project
projects create <name> --template <type>

# Switch to project
projects switch <name>

# List all projects
projects list

# Check status
projects status [name]

# Archive project
projects archive <name>

# Restore archived
projects restore <name>

# Help
projects help
```

---

## Templates

| Template | Use Case | Structure |
|----------|----------|-----------|
| `generic` | Any project | files/ |
| `web-dev` | Web development | html/, css/, js/, assets/ |
| `data-science` | Data/ML | data/, notebooks/, analysis/ |
| `writing` | Content | drafts/, research/, published/ |
| `research` | Research | sources/, notes/, findings/ |
| `code` | Software dev | src/, tests/, docs/ |

---

## Project Files

Every project has:

```
projects/<name>/
├── MEMORY.md       → Long-term project notes (isolated!)
├── CONTEXT.md      → Current state and focus
├── CONFIG.json     → Project settings
├── tasks.md        → Task list
├── README.md       → Project overview
└── files/          → Your project documents
```

---

## Quick Start

### 1. Create & Switch
```powershell
projects create ecommerce --template web-dev
projects switch ecommerce
```

### 2. Work in Project
- Edit `projects/ecommerce/MEMORY.md` with decisions
- Update `projects/ecommerce/tasks.md` with tasks
- Store files in `projects/ecommerce/files/`

### 3. Switch to Another
```powershell
projects switch analytics
# Context completely switches - no ecommerce contamination!
```

---

## Memory Isolation

**Key Concept:** Only the active project's MEMORY.md is loaded.

```
Session 1: projects/alpha/MEMORY.md (loaded)
Session 2: projects/beta/MEMORY.md (not loaded)

projects switch beta
→ alpha MEMORY.md unloaded
→ beta MEMORY.md loaded
```

**Result:** Zero cross-project contamination! ✅

---

## Common Workflows

### Start New Project
```powershell
projects create my-project --template generic
projects switch my-project
# Edit MEMORY.md with goals
# Add tasks to tasks.md
# Start working
```

### Switch Between Projects
```powershell
projects list                    # See all projects
projects switch project-a        # Work on A
# ... later ...
projects switch project-b        # Work on B (clean context!)
```

### Complete Project
```powershell
projects archive old-project     # Archive when done
projects list                    # Archived projects shown separately
```

### Check What's Active
```powershell
Get-Content projects/ACTIVE_PROJECT.txt
# Or
projects status
```

---

## File Paths

```powershell
# Global config
projects-config.json

# Project directory
projects/<name>/

# Active project marker
projects/ACTIVE_PROJECT.txt

# CLI script
scripts/projects-manager.ps1

# Test suite
tests/projects-system/
```

---

## Installation

### PowerShell Alias (Recommended)
```powershell
.\scripts\Install-ProjectsAlias.ps1
. $PROFILE  # Reload
```

### Manual Use
```powershell
& scripts/projects-manager.ps1 -Action list
```

---

## Verification

### Run Tests
```powershell
.\tests\projects-system\run-all-tests.ps1
# Should show: ALL TESTS PASSED
```

### Check Isolation
```powershell
# Verify no contamination
Select-String "React" projects/web-app-redesign/MEMORY.md   # ✓ Found
Select-String "React" projects/data-pipeline/MEMORY.md      # ✗ Not found
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't create project | Check template name, ensure not duplicate |
| Can't switch | Verify project exists: `Test-Path projects/<name>` |
| Tests fail | Clean test projects: `Get-ChildItem projects -Directory | Where {$_.Name -match "^test-"} | Remove-Item -Recurse -Force` |
| Config error | Validate JSON: `Get-Content projects-config.json | ConvertFrom-Json` |

---

## Tips

✅ **DO:**
- Update MEMORY.md regularly with key learnings
- Use descriptive project names
- Archive completed projects
- Switch projects freely

❌ **DON'T:**
- Mix multiple initiatives in one project
- Leave completed projects active
- Manually edit ACTIVE_PROJECT.txt (use `projects switch`)
- Store sensitive data without noting in CONFIG.json

---

## AGENTS.md Integration

Add to your session startup:
```markdown
## Project Context Loading

1. Check active project: `cat projects/ACTIVE_PROJECT.txt`
2. Load project memory: `projects/{activeProject}/MEMORY.md`
3. Load project context: `projects/{activeProject}/CONTEXT.md`
4. Work is sandboxed to: `projects/{activeProject}/files/`
```

---

## Performance

- Create: <2s
- Switch: <200ms
- Load: <100ms
- Storage: ~5-20 MB per project

---

## Support

- **Full Docs:** `skills/projects-system/SKILL.md`
- **Quick Start:** `skills/projects-system/README.md`
- **Tests:** `tests/projects-system/README.md`
- **This Card:** `skills/projects-system/QUICK_REFERENCE.md`

---

**Version:** 1.0.0 | **Date:** 2026-02-13 | **Status:** Production Ready ✅
