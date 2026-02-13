# Projects System Manager
# Provides project creation, switching, and management functions

param(
    [string]$Action = "help",
    [string]$ProjectName = "",
    [string]$Template = "generic",
    [string]$Description = "",
    [switch]$Force
)

$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
$ProjectsDir = "$WorkspaceRoot\projects"
$ConfigFile = "$WorkspaceRoot\projects-config.json"
$ActiveProjectFile = "$ProjectsDir\ACTIVE_PROJECT.txt"

function Load-Config {
    if (Test-Path $ConfigFile) {
        return Get-Content $ConfigFile | ConvertFrom-Json
    }
    return $null
}

function Save-Config {
    param([PSObject]$Config)
    $Config | ConvertTo-Json -Depth 10 | Set-Content $ConfigFile
}

function Load-ProjectConfig {
    param([string]$Name)
    $path = "$ProjectsDir\$Name\CONFIG.json"
    if (Test-Path $path) {
        return Get-Content $path | ConvertFrom-Json
    }
    return $null
}

function Save-ProjectConfig {
    param(
        [string]$Name,
        [PSObject]$Config
    )
    $path = "$ProjectsDir\$Name\CONFIG.json"
    $Config | ConvertTo-Json -Depth 10 | Set-Content $path
}

function Get-ActiveProject {
    if (Test-Path $ActiveProjectFile) {
        return (Get-Content $ActiveProjectFile).Trim()
    }
    return "default"
}

function Set-ActiveProject {
    param([string]$Name)
    Set-Content $ActiveProjectFile -Value $Name
}

function Create-ProjectStructure {
    param(
        [string]$Name,
        [string]$TemplateType = "generic"
    )
    
    $config = Load-Config
    $template = $config.templates.PSObject.Properties | Where-Object { $_.Name -eq $TemplateType } | Select-Object -ExpandProperty Value
    if (!$template) {
        Write-Error "Template '$TemplateType' not found"
        return $false
    }
    
    $projectPath = "$ProjectsDir\$Name"
    
    # Create base directory
    if (!(Test-Path $projectPath)) {
        New-Item -ItemType Directory -Path $projectPath -Force | Out-Null
    }
    
    # Create folders from template
    foreach ($folder in $template.folders) {
        $folderPath = Join-Path $projectPath $folder
        if (!(Test-Path $folderPath)) {
            New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
        }
    }
    
    # Create MEMORY.md
    $memoryContent = @"
# $Name - Project Memory

## Project Overview
Project created on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Goals & Vision
- [Add project goals here]

## Key Decisions
- [Document key decisions as you make them]

## Architecture/Design Notes
- [Design decisions and technical choices]

## Important Findings
- [Key insights and learnings]

## Blockers & Resolutions
- [Issues encountered and how they were resolved]

## Stakeholders
- [Who is involved in this project]

## Current Status
- [Update as you progress]

---
*Project-specific long-term memory. Load only when this project is active.*
"@
    Set-Content "$projectPath\MEMORY.md" -Value $memoryContent
    
    # Create CONTEXT.md
    $contextContent = @"
# $Name - Project Context

**Status:** Active  
**Created:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Template:** $TemplateType  

## Current State
- **Focus:** 
- **Progress:** 0%
- **Last Updated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Active Items
- [ ] Task 1
- [ ] Task 2

## Project Structure
\`\`\`
$Name/
├── MEMORY.md       (long-term project memory)
├── CONTEXT.md      (this file - current state)
├── CONFIG.json     (project settings)
├── tasks.md        (task list)
├── README.md       (project overview)
└── files/          (project documents)
\`\`\`

## Recent Activity
- Project initialized

---
*Updated automatically. Shows current project state and focus.*
"@
    Set-Content "$projectPath\CONTEXT.md" -Value $contextContent
    
    # Create CONFIG.json
    $configData = @{
        name = $Name
        archived = $false
        template = $TemplateType
        created = (Get-Date -Format 'o')
        modified = (Get-Date -Format 'o')
        description = $Description
        tags = @()
        settings = @{
            contextIsolation = $true
            autoArchiveAfterDays = $null
            maxMemorySize = "50MB"
            collaborators = @()
        }
        metadata = @{
            tasksCount = 0
            completedTasks = 0
            filesCount = 0
            lastActivity = (Get-Date -Format 'o')
        }
    }
    Save-ProjectConfig $Name $configData
    
    # Create tasks.md
    $tasksContent = @"
# Tasks - $Name

## Status Overview
- **Total:** 0
- **Complete:** 0
- **In Progress:** 0
- **Blocked:** 0

## Tasks

### High Priority
- [ ] Task template (edit this)

### Medium Priority
- [ ] Task template (edit this)

### Low Priority
- [ ] Task template (edit this)

## Completed
(Tasks moved here when done)

---
*Update regularly as you progress*
"@
    Set-Content "$projectPath\tasks.md" -Value $tasksContent
    
    # Create README.md
    $readmeContent = @"
# $Name

> Project initialized on $(Get-Date -Format 'yyyy-MM-dd')

## Quick Overview
[Add brief description of what this project is about]

## Getting Started
1. Read MEMORY.md for full context
2. Check tasks.md for current tasks
3. See CONTEXT.md for current state

## File Organization
- **files/** - All project documents and resources
- **MEMORY.md** - Long-term project notes
- **CONTEXT.md** - Current state and focus
- **tasks.md** - Task tracking

## Links
- [Key Document 1]
- [Key Document 2]

---
*For project-specific commands, use: projects [switch/status/add-task]*
"@
    Set-Content "$projectPath\README.md" -Value $readmeContent
    
    return $true
}

function Register-Project {
    param(
        [string]$Name,
        [string]$TemplateType = "generic",
        [string]$Description = ""
    )
    
    $config = Load-Config
    
    $projectData = @{
        name = $Name
        created = (Get-Date -Format 'o')
        modified = (Get-Date -Format 'o')
        template = $TemplateType
        description = $Description
        status = "active"
        tags = @()
        settings = @{
            contextIsolation = $true
            autoArchiveAfterDays = $null
            maxMemorySize = "50MB"
        }
    }
    
    # Add the project to the projects object
    $config.projects | Add-Member -MemberType NoteProperty -Name $Name -Value $projectData -Force
    
    $config.lastModified = (Get-Date -Format 'o')
    Save-Config $config
}

# ====================
# PUBLIC COMMANDS
# ====================

function cmd-create {
    param([string]$Name, [string]$Template, [string]$Desc)
    
    if (!$Name) {
        Write-Error "Project name required"
        return
    }
    
    $projectPath = "$ProjectsDir\$Name"
    if (Test-Path $projectPath) {
        Write-Error "Project '$Name' already exists"
        return
    }
    
    Write-Host "Creating project: $Name..." -ForegroundColor Green
    
    if (Create-ProjectStructure $Name $Template) {
        Register-Project $Name $Template $Desc
        Write-Host "[OK] Project '$Name' created successfully" -ForegroundColor Green
        Write-Host "  Location: $projectPath"
        Write-Host "  Template: $Template"
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "  1. projects switch $Name     # Switch to this project"
        Write-Host "  2. Edit projects/$Name/MEMORY.md"
        Write-Host "  3. Add tasks to projects/$Name/tasks.md"
    }
}

function cmd-list {
    $config = Load-Config
    $active = Get-ActiveProject
    
    Write-Host ""
    Write-Host "=== ACTIVE PROJECTS ===" -ForegroundColor Cyan
    
    foreach ($proj in $config.projects.PSObject.Properties) {
        $projData = $proj.Value
        if ($projData.status -eq "active") {
            $marker = if ($projData.name -eq $active) { "[*]" } else { "[ ]" }
            $color = if ($projData.name -eq $active) { "Green" } else { "White" }
            Write-Host "$marker $($projData.name)" -ForegroundColor $color
            Write-Host "     $($projData.description)" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "=== ARCHIVED ===" -ForegroundColor Gray
    $hasArchived = $false
    foreach ($proj in $config.projects.PSObject.Properties) {
        $projData = $proj.Value
        if ($projData.status -eq "archived") {
            Write-Host "  $($projData.name)" -ForegroundColor DarkGray
            $hasArchived = $true
        }
    }
    if (!$hasArchived) {
        Write-Host "  (none)" -ForegroundColor DarkGray
    }
    Write-Host ""
}

function cmd-switch {
    param([string]$Name)
    
    if (!$Name) {
        Write-Error "Project name required"
        return
    }
    
    $projectPath = "$ProjectsDir\$Name"
    if (!(Test-Path $projectPath)) {
        Write-Error "Project '$Name' not found"
        return
    }
    
    Set-ActiveProject $Name
    Write-Host "[OK] Switched to project: $Name" -ForegroundColor Green
    
    # Show context
    if (Test-Path "$projectPath\CONTEXT.md") {
        Write-Host ""
        Write-Host "=== Project Context ===" -ForegroundColor Cyan
        Get-Content "$projectPath\CONTEXT.md" | Select-Object -First 10
    }
}

function cmd-status {
    param([string]$Name)
    
    if (!$Name) {
        $Name = Get-ActiveProject
    }
    
    $projectPath = "$ProjectsDir\$Name"
    if (!(Test-Path $projectPath)) {
        Write-Error "Project '$Name' not found"
        return
    }
    
    $config = Load-ProjectConfig $Name
    
    Write-Host ""
    Write-Host "=== Project: $Name ===" -ForegroundColor Green
    $status = if ($config.archived) { "Archived" } else { "Active" }
    $statusColor = if ($config.archived) { "Yellow" } else { "Green" }
    Write-Host "Status: $status" -ForegroundColor $statusColor
    Write-Host "Template: $($config.template)"
    Write-Host "Created: $($config.created)"
    Write-Host "Tasks: $($config.metadata.tasksCount) total, $($config.metadata.completedTasks) complete"
    Write-Host ""
}

function cmd-archive {
    param([string]$Name)
    
    if (!$Name) {
        Write-Error "Project name required"
        return
    }
    
    $projectPath = "$ProjectsDir\$Name"
    if (!(Test-Path $projectPath)) {
        Write-Error "Project '$Name' not found"
        return
    }
    
    $config = Load-ProjectConfig $Name
    $config.archived = $true
    $config.modified = (Get-Date -Format 'o')
    Save-ProjectConfig $Name $config
    
    # Update global config
    $globalConfig = Load-Config
    $globalConfig.projects.$Name.status = "archived"
    $globalConfig.lastModified = (Get-Date -Format 'o')
    Save-Config $globalConfig
    
    Write-Host "[OK] Project '$Name' archived" -ForegroundColor Green
}

function cmd-restore {
    param([string]$Name)
    
    if (!$Name) {
        Write-Error "Project name required"
        return
    }
    
    $projectPath = "$ProjectsDir\$Name"
    if (!(Test-Path $projectPath)) {
        Write-Error "Project '$Name' not found"
        return
    }
    
    $config = Load-ProjectConfig $Name
    $config.archived = $false
    $config.modified = (Get-Date -Format 'o')
    Save-ProjectConfig $Name $config
    
    # Update global config
    $globalConfig = Load-Config
    $globalConfig.projects.$Name.status = "active"
    $globalConfig.lastModified = (Get-Date -Format 'o')
    Save-Config $globalConfig
    
    Write-Host "[OK] Project '$Name' restored" -ForegroundColor Green
}

function cmd-help {
    Write-Host ""
    Write-Host "=== Projects Manager Commands ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "projects create <name> --template <type>"
    Write-Host "    Create new project with optional template"
    Write-Host "    Templates: generic, web-dev, data-science, writing, research, code"
    Write-Host ""
    Write-Host "projects list"
    Write-Host "    List all projects"
    Write-Host ""
    Write-Host "projects switch <name>"
    Write-Host "    Switch active project"
    Write-Host ""
    Write-Host "projects status [name]"
    Write-Host "    Show project status (current if not specified)"
    Write-Host ""
    Write-Host "projects archive <name>"
    Write-Host "    Archive a project"
    Write-Host ""
    Write-Host "projects restore <name>"
    Write-Host "    Restore archived project"
    Write-Host ""
}

# Main dispatch
switch ($Action.ToLower()) {
    "create" { cmd-create $ProjectName $Template $Description }
    "list" { cmd-list }
    "switch" { cmd-switch $ProjectName }
    "status" { cmd-status $ProjectName }
    "archive" { cmd-archive $ProjectName }
    "restore" { cmd-restore $ProjectName }
    default { cmd-help }
}
