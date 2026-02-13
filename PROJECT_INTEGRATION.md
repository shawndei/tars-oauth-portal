# Project Context Integration Guide

**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-02-13

This guide shows how the project context system integrates with the main session workflow (AGENTS.md).

---

## Quick Start

### For Main Agent

When you start a main session:

**Step 1: Load Project Context (Automatic)**

```
1. Read ACTIVE_PROJECT.txt → Get project name
2. Load projects/{project}/CONTEXT.md
3. Load projects/{project}/MEMORY.md
4. Set episodic memory namespace = projects.{project}
```

**Step 2: Use Project Context**

The project context is automatically injected into your session so you:
- Understand the project goals and current state
- Know which items are active and blockers
- Make decisions aligned with project strategy
- Keep episodic memory isolated to the project

**Step 3: Update Context as You Work**

When finishing work in a project:
```
1. Update projects/{project}/CONTEXT.md with latest state
2. Log daily work to projects/{project}/memory/{YYYY-MM-DD}.md
3. Update projects/{project}/CONFIG.json metadata
4. Commit changes to git (optional)
```

---

## Session Workflow

### Before Anything Else (Main Session)

```
1. Read SOUL.md             ← Who you are
2. Read USER.md             ← Who you're helping
3. Read AGENTS.md           ← Your workspace conventions
4. Read ACTIVE_PROJECT.txt  ← Get active project
5. Load projects/{project}/CONTEXT.md  ← Load project context
6. Read MEMORY.md           ← Your long-term memory (ONLY in main session)
```

### Working in a Project

```
Conversation Loop:
├─ You have project context in mind
├─ User asks something related to project
├─ You reference project goals/state when relevant
├─ You make decisions aligned with project
└─ You update project memory when appropriate
```

### Ending a Session

```
1. Update projects/{project}/CONTEXT.md
   ├─ Current state
   ├─ Recent activity
   └─ Next steps
2. Log to projects/{project}/memory/{YYYY-MM-DD}.md
3. Update projects/{project}/CONFIG.json metadata
4. Optional: Commit to git
```

---

## Integration Points

### 1. Session Initialization

**In main session prompt setup:**

```markdown
## Active Project Context

[CONTENT OF projects/{project}/CONTEXT.md]

When working in this project:
- Keep these goals and current state in mind
- Reference active items and blockers when relevant
- Make decisions aligned with project strategy
- Update memory in the project namespace when significant work is done
```

### 2. Subagent Creation

**When creating a subagent for a project task:**

```
Main Agent → Subagent:
  
Briefing includes:
  - Task description
  - Active project (from ACTIVE_PROJECT.txt)
  - Relevant project context
  - Resources and constraints
  
Subagent:
  - Works in project namespace
  - Episodic memory tagged as projects.{project}
  - Reports completion back to main agent
```

### 3. Project Switching

**When user requests project switch:**

```
User: "Switch to the content-strategy project"

Main Agent:
  1. Validate project exists
  2. Update ACTIVE_PROJECT.txt
  3. Trigger context reload
  4. Load new project's CONTEXT.md
  5. Notify user: "Switched to content-strategy"
  6. Next response includes new project context
```

### 4. Memory Updates

**When significant work is completed:**

```
Main Agent:
  1. Log to projects/{project}/memory/{YYYY-MM-DD}.md
     ├─ What was done
     ├─ Decisions made
     └─ Learnings
  2. Update projects/{project}/CONTEXT.md
     ├─ Move items from "Active" to "Recent Activity"
     ├─ Update progress percentage
     └─ Update last modified timestamp
  3. Update projects/{project}/CONFIG.json
     ├─ tasksCount
     ├─ completedTasks
     └─ lastActivity
```

---

## Practical Examples

### Example 1: Writing a Blog Article (Content Strategy Project)

**Session Start:**

1. ACTIVE_PROJECT.txt = "content-strategy"
2. Load content-strategy/CONTEXT.md
3. See: "Focus: Writing first tutorial draft"
4. See: "Blocker: Need technical review"

**During Work:**

```
User: "Help me outline the Kubernetes tutorial"

You: "Looking at your content-strategy context, I see you're 
working on 'Complete Guide to Kubernetes Deployment'. Let me 
help with the outline. Based on your audience (developers) and 
the SEO keywords from your research..."

[Work together on article]
```

**At End:**

```
Update content-strategy/CONTEXT.md:
├─ Move "Write first draft" from Active to Recent Activity
├─ Update "Currently working on" section
├─ Set Progress to 30%
└─ Update Last Updated timestamp

Log to content-strategy/memory/2026-02-13.md:
├─ Completed outline for Kubernetes tutorial
├─ Identified need for practical examples section
└─ Next: Write introduction and setup section
```

### Example 2: Switching Projects Mid-Session

**Current project:** content-strategy  
**User:** "Let's switch to the web redesign project"

```
Main Agent:
  1. Read ACTIVE_PROJECT.txt → "content-strategy"
  2. Save current project state → Update CONTEXT.md
  3. Update ACTIVE_PROJECT.txt → "web-app-redesign"
  4. Load web-app-redesign/CONTEXT.md
  5. Set episodic memory namespace → projects.web-app-redesign
  6. Respond: "Switched to web-app-redesign project"
  
Next response:
  - Uses web-app-redesign context
  - Aware of redesign goals and blockers
  - Episodic memories logged to web-app-redesign/
```

### Example 3: Delegating Work to Subagent

**Main session:** Working on data-pipeline project  
**User:** "Create a script to validate data quality"

```
Main Agent:
  1. Understand task from context:
     ├─ data-pipeline project
     ├─ Current focus: "Implement validation stage"
     └─ Blockers: "Need to handle edge cases"
  
  2. Create subagent with briefing:
     ├─ Task: "Write data quality validation script"
     ├─ Project: data-pipeline
     ├─ Context: "Part of validation stage, handle edge cases"
     └─ Constraints: "Must integrate with existing pipeline"
  
  3. Subagent works:
     ├─ Loads data-pipeline context
     ├─ Logs work to data-pipeline/memory/
     └─ Reports back when done
  
  4. Main agent:
     ├─ Reviews subagent output
     ├─ Integrates into workflow
     └─ Updates data-pipeline/CONTEXT.md with progress
```

---

## Memory Organization

### Project Memory Files

**Structure:**

```
projects/
├── content-strategy/
│   ├── MEMORY.md                    ← Long-term memory
│   ├── CONTEXT.md                   ← Current state
│   ├── CONFIG.json                  ← Settings
│   └── memory/
│       ├── 2026-02-13.md           ← Daily episodic log
│       ├── 2026-02-12.md
│       └── ...
│
├── web-app-redesign/
│   ├── MEMORY.md
│   ├── CONTEXT.md
│   ├── CONFIG.json
│   └── memory/
│       └── ...
│
└── default/
    ├── MEMORY.md
    ├── CONTEXT.md
    ├── CONFIG.json
    └── memory/
        └── ...
```

### What Goes Where

**CONTEXT.md** (Updated frequently)
- Current state and focus
- Active items and blockers
- Recent activity
- Next steps

**MEMORY.md** (Updated periodically)
- Important decisions made
- Strategic insights
- Lessons learned
- Long-term vision

**memory/{YYYY-MM-DD}.md** (Updated daily)
- Work log for the day
- Episodic events
- Discoveries and notes
- Raw daily context

### Episodic Memory Namespace

When storing episodic memories for a project:

```json
{
  "timestamp": "2026-02-13T14:30:00Z",
  "namespace": "projects.content-strategy",
  "tags": ["article-writing", "kubernetes", "completed"],
  "content": "Completed outline for Kubernetes tutorial...",
  "project": "content-strategy"
}
```

The namespace `projects.content-strategy` keeps memories isolated to that project.

---

## Best Practices

### ✅ Do

**At Session Start:**
- Check ACTIVE_PROJECT.txt to know which project you're in
- Read CONTEXT.md to understand current state
- Scan MEMORY.md for relevant decisions

**During Work:**
- Reference project goals when relevant
- Update memory with significant decisions
- Keep episodic logs current

**At Session End:**
- Update CONTEXT.md with new state
- Log work to memory/{YYYY-MM-DD}.md
- Update CONFIG.json metadata
- Commit to git if appropriate

**Cross-Project Work:**
- Use project switching to stay focused
- Keep memories isolated by project
- Document decisions in project MEMORY.md

### ❌ Don't

**Memory:**
- Mix project memories together
- Store secrets in CONTEXT.md
- Leave CONTEXT.md stale for sessions

**Context:**
- Ignore ACTIVE_PROJECT.txt state
- Make major decisions without project context
- Forget to update CONTEXT.md

**Workflow:**
- Work in multiple projects without clear switching
- Store shared memories in project-specific files
- Create subagents without setting up project context

---

## Automation Opportunities

These could be automated but currently are manual (by design):

✅ **Automated by System:**
- Loading CONTEXT.md on session start
- Setting episodic memory namespace
- Tracking ACTIVE_PROJECT.txt

🔄 **Manual (by Design):**
- Updating CONTEXT.md (you decide what's relevant)
- Logging episodic memories (you capture what matters)
- Updating CONFIG.json metadata (you track progress)
- Switching projects (explicit user action)

---

## File Checklist

Every project should have:

- [ ] **CONTEXT.md** - Current project state
- [ ] **CONFIG.json** - Project configuration
- [ ] **MEMORY.md** - Long-term decisions
- [ ] **README.md** - Project overview
- [ ] **tasks.md** - Task list
- [ ] **files/** - Project directory structure
- [ ] **memory/** - Daily episodic logs

**Status Check Command:**

```powershell
.\check-project.ps1 -Project "project-name"
```

---

## Integration with Existing Workflow

### AGENTS.md

Project context integrates seamlessly:

```
AGENTS.md Workflow:

1. Read SOUL.md (who you are)
2. Read USER.md (who you help)
3. Read AGENTS.md (workspace rules)
4. ← NEW: Read ACTIVE_PROJECT.txt + Load project CONTEXT.md
5. Read MEMORY.md (your long-term memory)
6. Start session
```

### HEARTBEAT.md

Heartbeat checks can include project-specific items:

```
Heartbeat Checks:

- Email and calendar
- ← NEW: Project status (active blockers?)
- ← NEW: Overdue tasks in current project
- Weather, notifications, etc.
```

### Memory Management

Project memories follow the same pattern as personal memories:

```
Daily episodic: projects/{project}/memory/{YYYY-MM-DD}.md
Long-term learning: projects/{project}/MEMORY.md
(Same pattern as MEMORY.md but project-scoped)
```

---

## Troubleshooting

### Project context not loading

**Check:**
1. ACTIVE_PROJECT.txt exists and contains valid project name
2. projects/{project}/CONTEXT.md exists
3. Project directory structure is correct

**Fix:**
```powershell
.\switch-project.ps1 -Project "valid-project-name"
```

### Memory bleeding between projects

**Check:**
- Episodic memory namespace includes project name
- Daily logs are in correct project/memory/ directory

**Fix:**
- Verify you're writing to projects/{project}/memory/
- Check namespace prefix in episodic memory

### Stale project context

**Check:**
- When was CONTEXT.md last updated?
- Are "Recent Activity" and "Current State" current?

**Fix:**
- Review and update CONTEXT.md
- Update CONFIG.json lastActivity timestamp

---

## Examples

See existing projects in `projects/`:

- **default/** - General-purpose project
- **content-strategy/** - Writing/content project
- **web-app-redesign/** - Product/design project
- **data-pipeline/** - Engineering project

---

*Project context system integrates deeply with the session workflow to provide focus, isolation, and awareness.*
