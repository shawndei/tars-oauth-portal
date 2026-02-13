# Resume Implementation Script
# Picks up where autonomous implementation left off

param(
    [switch]$ShowStatus
)

$checkpointFile = "C:\Users\DEI\.openclaw\workspace\implementation-checkpoint.json"

if (-not (Test-Path $checkpointFile)) {
    Write-Host "❌ No checkpoint file found at: $checkpointFile"
    exit 1
}

$checkpoint = Get-Content $checkpointFile | ConvertFrom-Json

if ($ShowStatus) {
    Write-Host "`n=== Implementation Status ===" -ForegroundColor Cyan
    Write-Host "Session: $($checkpoint.session)"
    Write-Host "Started: $($checkpoint.started)"
    Write-Host "Goal: $($checkpoint.goal)"
    Write-Host "Status: $($checkpoint.status)"
    Write-Host "Current Phase: $($checkpoint.currentPhase)`n"
    
    foreach ($phase in $checkpoint.phases) {
        $statusColor = switch ($phase.status) {
            "completed" { "Green" }
            "in_progress" { "Yellow" }
            "pending" { "Gray" }
            default { "White" }
        }
        
        Write-Host "Phase $($phase.id): $($phase.name)" -ForegroundColor $statusColor
        Write-Host "  Status: $($phase.status)"
        
        if ($phase.estimatedTime) {
            Write-Host "  Estimated: $($phase.estimatedTime)"
        }
        
        if ($phase.tasks -is [array]) {
            foreach ($task in $phase.tasks) {
                if ($task.status) {
                    $taskStatus = $task.status
                    $taskColor = switch ($taskStatus) {
                        "completed" { "Green" }
                        "in_progress" { "Yellow" }
                        "pending" { "Gray" }
                        default { "White" }
                    }
                    Write-Host "    - $($task.task): $taskStatus" -ForegroundColor $taskColor
                } else {
                    Write-Host "    - $task" -ForegroundColor Gray
                }
            }
        }
        Write-Host ""
    }
    
    Write-Host "`n=== Restart Instructions ===" -ForegroundColor Cyan
    Write-Host "Auto-Login: $($checkpoint.restartInstructions.autoLogin)"
    Write-Host "Gateway Start: $($checkpoint.restartInstructions.gatewayStart)"
    Write-Host "Resume: $($checkpoint.restartInstructions.resume)`n"
    
    exit 0
}

# Resume implementation
Write-Host "Resuming implementation from checkpoint..." -ForegroundColor Yellow
Write-Host "Current Phase: $($checkpoint.currentPhase)"
Write-Host "Last Checkpoint: $($checkpoint.lastCheckpoint)`n"

# Find next pending phase
$nextPhase = $checkpoint.phases | Where-Object { $_.status -ne "completed" } | Select-Object -First 1

if ($nextPhase) {
    Write-Host "Next Phase: $($nextPhase.name)" -ForegroundColor Cyan
    Write-Host "Estimated Time: $($nextPhase.estimatedTime)`n"
    
    # Notify TARS to resume
    Write-Host "To resume, tell TARS: 'Continue implementation from Phase $($nextPhase.id): $($nextPhase.name)'"
} else {
    Write-Host "✅ All phases completed!" -ForegroundColor Green
}
