# SESSION LOCK CLEANUP - Prevents deadlocks from lock contention
# Runs via HEARTBEAT.md every 15 minutes
# Issue #4355 root cause mitigation

$lockPath = "$env:USERPROFILE\.openclaw\agents\main\sessions"
$thresholdSeconds = 120  # 2 minutes

Write-Host "=== SESSION LOCK CLEANUP ===" -ForegroundColor Cyan
Write-Host "Lock directory: $lockPath"
Write-Host "Threshold: $thresholdSeconds seconds"
Write-Host ""

# Get all lock files
$lockFiles = Get-ChildItem -Path $lockPath -Filter "*.lock" -ErrorAction SilentlyContinue

if ($lockFiles.Count -eq 0) {
    Write-Host "[OK] No lock files found (healthy state)" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($lockFiles.Count) lock file(s)" -ForegroundColor Yellow
Write-Host ""

$removed = 0
$kept = 0

foreach ($lock in $lockFiles) {
    $age = ((Get-Date) - $lock.LastWriteTime).TotalSeconds
    $ageDisplay = if ($age -lt 60) { "$([math]::Round($age, 1))s" } else { "$([math]::Round($age/60, 1))m" }
    
    if ($age -gt $thresholdSeconds) {
        Write-Host "[REMOVE] $($lock.Name) (age: $ageDisplay)" -ForegroundColor Red
        Remove-Item $lock.FullName -Force
        $removed++
    } else {
        Write-Host "[KEEP] $($lock.Name) (age: $ageDisplay, still fresh)" -ForegroundColor Gray
        $kept++
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Removed: $removed stale lock(s)" -ForegroundColor $(if ($removed -gt 0) { "Red" } else { "Green" })
Write-Host "Kept: $kept active lock(s)" -ForegroundColor Gray
Write-Host ""

# Log to monitoring
$logDir = "$env:USERPROFILE\.openclaw\workspace\monitoring_logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logEntry = @{
    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    removed = $removed
    kept = $kept
    totalChecked = $lockFiles.Count
    thresholdSeconds = $thresholdSeconds
} | ConvertTo-Json -Compress

Add-Content -Path "$logDir\lock-contentions.jsonl" -Value $logEntry

if ($removed -gt 0) {
    Write-Host "[WARN] Stale locks removed. If this happens frequently (>5/day), investigate root cause." -ForegroundColor Yellow
    exit 1  # Signal that cleanup was needed
} else {
    Write-Host "[OK] System healthy - no cleanup needed" -ForegroundColor Green
    exit 0
}
