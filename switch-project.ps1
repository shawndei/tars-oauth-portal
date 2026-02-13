# Project Context Switch Utility
# Usage: .\switch-project.ps1 -Project "project-name"

param(
    [Parameter(Mandatory=$true, HelpMessage="Project name to switch to")]
    [string]$Project,
    
    [Parameter(HelpMessage="Workspace root directory")]
    [string]$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
)

# Verify project exists
$projectPath = Join-Path $WorkspaceRoot "projects" $Project
if (-not (Test-Path $projectPath)) {
    Write-Error "Project '$Project' not found at $projectPath"
    exit 1
}

# Verify CONTEXT.md exists
$contextPath = Join-Path $projectPath "CONTEXT.md"
if (-not (Test-Path $contextPath)) {
    Write-Error "CONTEXT.md not found in project: $contextPath"
    exit 1
}

# Update ACTIVE_PROJECT.txt
$activeProjectPath = Join-Path $WorkspaceRoot "ACTIVE_PROJECT.txt"
$Project | Out-File -FilePath $activeProjectPath -NoNewline -Encoding UTF8

# Display project info
Write-Host "✅ Switched to project: $Project" -ForegroundColor Green

# Show context snippet
Write-Host "`n📋 Project Context Preview:" -ForegroundColor Cyan
$context = Get-Content $contextPath -Raw
$lines = $context.Split("`n") | Select-Object -First 15
foreach ($line in $lines) {
    Write-Host $line
}

# Check for latest memory
$memoryDir = Join-Path $projectPath "memory"
if (Test-Path $memoryDir) {
    $latestMemory = Get-ChildItem $memoryDir -Filter "*.md" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestMemory) {
        Write-Host "`n📝 Latest memory: $($latestMemory.Name)" -ForegroundColor Cyan
    }
}

# Show task count
$tasksFile = Join-Path $projectPath "tasks.md"
if (Test-Path $tasksFile) {
    $taskCount = @(Get-Content $tasksFile -Raw | Select-String "\- \[" -AllMatches).Matches.Count
    if ($taskCount -gt 0) {
        Write-Host "📌 Tasks in this project: $taskCount" -ForegroundColor Yellow
    }
}

Write-Host "`n✨ Ready to work on $Project" -ForegroundColor Green
