# Create New Project Utility
# Usage: .\create-project.ps1 -Name "project-name" -Description "Project description" -Template "writing"

param(
    [Parameter(Mandatory=$true, HelpMessage="Project name (will be slugified)")]
    [string]$Name,
    
    [Parameter(HelpMessage="Project description")]
    [string]$Description = "Project description TBD",
    
    [Parameter(HelpMessage="Project template type: writing, product, engineering, research, default")]
    [string]$Template = "default",
    
    [Parameter(HelpMessage="Workspace root directory")]
    [string]$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
)

# Slugify project name
$projectSlug = $Name.ToLower() -replace '[^a-z0-9]+', '-' -replace '^-|-$', ''

# Verify project doesn't exist
$projectPath = Join-Path $WorkspaceRoot "projects" $projectSlug
if (Test-Path $projectPath) {
    Write-Error "Project '$projectSlug' already exists at $projectPath"
    exit 1
}

# Create project directory structure
Write-Host "📁 Creating project structure..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $projectPath -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\files" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\files\drafts" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\files\research" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\files\published" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectPath\memory" -Force | Out-Null

# Create CONTEXT.md
$contextContent = @"
# $Name - Project Context

**Status:** Active  
**Created:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Template:** $Template  
**Progress:** 0% (Just started)

## Current State
- **Focus:** Project initialization
- **Phase:** Planning
- **Last Updated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Active Items
- [ ] Define project scope and goals
- [ ] Set up initial project structure
- [ ] Create task list

## Current Sprint
**Goal:** Get project off the ground

**Working On:**
- Project setup

**Blockers:**
- None yet

## Project Structure
``````
$projectSlug/
├── MEMORY.md           (long-term decisions, insights)
├── CONTEXT.md          (this file - current state)
├── CONFIG.json         (project settings)
├── tasks.md            (task list)
├── README.md           (project overview)
└── files/
    ├── drafts/
    ├── research/
    └── published/
``````

## Recent Activity
- $(Get-Date -Format 'yyyy-MM-dd'): Project created

## Key Technologies
- TBD

## Team Members
- You

## Next Steps
1. Define project goals
2. Create detailed task list
3. Set up team if needed
4. Begin work on Phase 1

---
*Updated automatically. Shows current project state and focus.*
"@

Set-Content -Path "$projectPath\CONTEXT.md" -Value $contextContent -Encoding UTF8

# Create CONFIG.json
$now = Get-Date -AsUTC -Format "yyyy-MM-ddTHH:mm:ssZ"
$configContent = @{
    name = $projectSlug
    archived = $false
    template = $Template
    created = $now
    modified = $now
    description = $Description
    tags = @()
    settings = @{
        contextIsolation = $true
        autoArchiveAfterDays = $null
        maxMemorySize = "50MB"
        collaborators = @("You")
    }
    metadata = @{
        tasksCount = 3
        completedTasks = 0
        filesCount = 0
        lastActivity = $now
    }
} | ConvertTo-Json

Set-Content -Path "$projectPath\CONFIG.json" -Value $configContent -Encoding UTF8

# Create MEMORY.md
$memoryContent = @"
# $Name - Project Memory

**Project Slug:** $projectSlug  
**Created:** $(Get-Date -Format 'yyyy-MM-dd')

This file stores long-term project decisions, insights, and learnings.

---

## Key Decisions

*(Document important decisions made about the project)*

## Learnings

*(Capture insights and learnings as the project progresses)*

## Strategic Notes

*(Long-term strategy and vision)*

---

*Update this regularly with important decisions and insights.*
"@

Set-Content -Path "$projectPath\MEMORY.md" -Value $memoryContent -Encoding UTF8

# Create README.md
$readmeContent = @"
# $Name

**Project Slug:** $projectSlug  
**Template:** $Template  
**Status:** Active

## Description

$Description

## Quick Links

- **Context:** See [CONTEXT.md](CONTEXT.md) for current state
- **Memory:** See [MEMORY.md](MEMORY.md) for decisions and learnings
- **Tasks:** See [tasks.md](tasks.md) for task list
- **Config:** See [CONFIG.json](CONFIG.json) for settings

## Getting Started

1. Review [CONTEXT.md](CONTEXT.md) for project goals and current state
2. Check [tasks.md](tasks.md) for immediate action items
3. Update this README with project-specific information

---

*Part of the OpenClaw project context system.*
"@

Set-Content -Path "$projectPath\README.md" -Value $readmeContent -Encoding UTF8

# Create tasks.md
$tasksContent = @"
# Tasks - $Name

## Planning
- [ ] Define project scope
- [ ] Set up team roles
- [ ] Create detailed roadmap

## Execution
*(Add execution phase tasks)*

## Completion
*(Add completion phase tasks)*

---

Format: `- [x] Completed task` or `- [ ] Pending task`

Update this regularly. Archive completed tasks to MEMORY.md.
"@

Set-Content -Path "$projectPath\tasks.md" -Value $tasksContent -Encoding UTF8

# Create initial memory log
$today = Get-Date -Format "yyyy-MM-dd"
$logContent = @"
# $today - Project Log

## Events
- Project created

## Notes
- Project initialized with standard structure

---
"@

Set-Content -Path "$projectPath\memory\$today.md" -Value $logContent -Encoding UTF8

Write-Host "✅ Project '$projectSlug' created successfully!" -ForegroundColor Green
Write-Host "`n📁 Location: $projectPath" -ForegroundColor Cyan
Write-Host "`n📋 Files created:" -ForegroundColor Cyan
Write-Host "  - CONTEXT.md (project context)"
Write-Host "  - CONFIG.json (project configuration)"
Write-Host "  - MEMORY.md (long-term memory)"
Write-Host "  - README.md (project overview)"
Write-Host "  - tasks.md (task list)"
Write-Host "  - files/ (project files directory)"
Write-Host "  - memory/ (episodic memory logs)"

Write-Host "`n🚀 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review and update CONTEXT.md with project details"
Write-Host "  2. Update tasks.md with your task list"
Write-Host "  3. Run: .\switch-project.ps1 -Project $projectSlug"
Write-Host "  4. Start working!"
