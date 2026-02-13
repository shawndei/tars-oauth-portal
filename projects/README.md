# Projects System

## Overview
Isolated project contexts (like Claude Projects) for organizing work.

Each project has:
- **CONTEXT.md** - Project-specific context and goals
- **MEMORY.md** - Project-specific learnings and history
- **files/** - Project files and artifacts

---

## Active Project

Current project: Read `ACTIVE_PROJECT.txt`

To switch projects:
```
Switch to project: [project-name]
```

---

## Available Projects

<!-- Auto-generated list -->

---

## Creating a New Project

1. Create directory: `projects/[project-name]/`
2. Add `CONTEXT.md` with project description
3. Add `MEMORY.md` for project-specific memory
4. Set as active: Write project name to `ACTIVE_PROJECT.txt`

---

## Project Structure

```
projects/
├── ACTIVE_PROJECT.txt          # Current active project
├── example-project/
│   ├── CONTEXT.md              # Project context
│   ├── MEMORY.md               # Project memory
│   ├── files/                  # Project files
│   └── research/               # Research notes
└── another-project/
    ├── CONTEXT.md
    ├── MEMORY.md
    └── files/
```
