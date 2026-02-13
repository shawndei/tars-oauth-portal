# Project-Aware Memory Search
# Searches across project memory files with context awareness

param(
    [Parameter(Mandatory=$true)]
    [string]$Query,
    
    [string]$Project = "",  # Empty = search all, or specify project name
    
    [switch]$MemoryOnly,    # Search only MEMORY.md files
    [switch]$ContextOnly,   # Search only CONTEXT.md files
    [switch]$TasksOnly,     # Search only tasks.md files
    
    [int]$ContextLines = 2  # Lines of context around matches
)

$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
$ProjectsDir = "$WorkspaceRoot\projects"
$ConfigFile = "$WorkspaceRoot\projects-config.json"

function Get-ProjectList {
    if (Test-Path $ConfigFile) {
        $config = Get-Content $ConfigFile | ConvertFrom-Json
        return $config.projects.PSObject.Properties | Where-Object { $_.Value.status -eq "active" } | Select-Object -ExpandProperty Name
    }
    return @()
}

function Search-ProjectFile {
    param(
        [string]$ProjectName,
        [string]$FilePath,
        [string]$SearchQuery,
        [int]$Context
    )
    
    if (!(Test-Path $FilePath)) {
        return @()
    }
    
    $results = @()
    $lines = Get-Content $FilePath
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $SearchQuery) {
            $startLine = [Math]::Max(0, $i - $Context)
            $endLine = [Math]::Min($lines.Count - 1, $i + $Context)
            
            $contextLines = @()
            for ($j = $startLine; $j -le $endLine; $j++) {
                $prefix = if ($j -eq $i) { ">>>" } else { "   " }
                $contextLines += "$prefix $($j + 1): $($lines[$j])"
            }
            
            $results += [PSCustomObject]@{
                Project = $ProjectName
                File = Split-Path $FilePath -Leaf
                LineNumber = $i + 1
                MatchedLine = $lines[$i]
                Context = $contextLines -join "`n"
            }
        }
    }
    
    return $results
}

function Search-Projects {
    param(
        [string[]]$ProjectNames,
        [string]$SearchQuery,
        [bool]$SearchMemory,
        [bool]$SearchContext,
        [bool]$SearchTasks,
        [int]$ContextLines
    )
    
    $allResults = @()
    
    foreach ($projName in $ProjectNames) {
        $projectPath = "$ProjectsDir\$projName"
        
        if (!(Test-Path $projectPath)) {
            continue
        }
        
        # Search MEMORY.md
        if ($SearchMemory) {
            $memoryFile = "$projectPath\MEMORY.md"
            $results = Search-ProjectFile $projName $memoryFile $SearchQuery $ContextLines
            $allResults += $results
        }
        
        # Search CONTEXT.md
        if ($SearchContext) {
            $contextFile = "$projectPath\CONTEXT.md"
            $results = Search-ProjectFile $projName $contextFile $SearchQuery $ContextLines
            $allResults += $results
        }
        
        # Search tasks.md
        if ($SearchTasks) {
            $tasksFile = "$projectPath\tasks.md"
            $results = Search-ProjectFile $projName $tasksFile $SearchQuery $ContextLines
            $allResults += $results
        }
    }
    
    return $allResults
}

# Main execution
$projectsToSearch = @()

if ($Project) {
    # Search specific project
    $projectsToSearch = @($Project)
} else {
    # Search all active projects
    $projectsToSearch = Get-ProjectList
}

# Determine which files to search
$searchMemory = !$ContextOnly -and !$TasksOnly
$searchContext = !$MemoryOnly -and !$TasksOnly
$searchTasks = !$MemoryOnly -and !$ContextOnly

if ($MemoryOnly) {
    $searchMemory = $true
    $searchContext = $false
    $searchTasks = $false
} elseif ($ContextOnly) {
    $searchMemory = $false
    $searchContext = $true
    $searchTasks = $false
} elseif ($TasksOnly) {
    $searchMemory = $false
    $searchContext = $false
    $searchTasks = $true
}

Write-Host ""
Write-Host "=== Project Memory Search ===" -ForegroundColor Cyan
Write-Host "Query: $Query" -ForegroundColor Yellow
Write-Host "Scope: $($projectsToSearch -join ', ')" -ForegroundColor Gray
Write-Host ""

$results = Search-Projects $projectsToSearch $Query $searchMemory $searchContext $searchTasks $ContextLines

if ($results.Count -eq 0) {
    Write-Host "No matches found." -ForegroundColor Yellow
} else {
    Write-Host "Found $($results.Count) match(es):" -ForegroundColor Green
    Write-Host ""
    
    $groupedResults = $results | Group-Object Project
    
    foreach ($group in $groupedResults) {
        Write-Host ">>> Project: $($group.Name)" -ForegroundColor Green -BackgroundColor DarkGray
        Write-Host ""
        
        foreach ($result in $group.Group) {
            Write-Host "  File: $($result.File) (Line $($result.LineNumber))" -ForegroundColor Cyan
            Write-Host ""
            Write-Host $result.Context
            Write-Host ""
            Write-Host "  " ("-" * 70) -ForegroundColor DarkGray
            Write-Host ""
        }
    }
}

Write-Host ""
Write-Host "Search complete. Found $($results.Count) match(es) across $($groupedResults.Count) project(s)." -ForegroundColor Gray
