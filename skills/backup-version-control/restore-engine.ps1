#!/usr/bin/env powershell
<#
.SYNOPSIS
    Restore Engine for OpenClaw Workspace
    Handles restoration of files from backups with validation and rollback support

.DESCRIPTION
    Performs restore operations including full restore, selective restore,
    point-in-time recovery, and validation of restored data.

.PARAMETER Action
    The action to perform: Restore, ListBackups, ValidateRestore, CreateRestorePoint

.EXAMPLE
    .\restore-engine.ps1 -Action Restore -BackupId "backup-2026-02-13T023456Z"
#>

param(
    [ValidateSet('Restore', 'ListBackups', 'ValidateRestore', 'CreateRestorePoint', 'RollbackRestore')]
    [string]$Action = 'ListBackups',
    
    [string]$BackupId,
    [string[]]$FilePaths,
    [datetime]$Timestamp,
    [switch]$DryRun = $false,
    [switch]$Verify = $true,
    [string]$ConfigPath = "backup-config.json"
)

# Get workspace root
$workspaceRoot = Get-Location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommandPath

# Load configuration
function Load-Config {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Error "Configuration file not found: $Path"
        exit 1
    }
    
    return Get-Content $Path -Raw | ConvertFrom-Json
}

# List available backups
function List-Backups {
    param([object]$Config)
    
    $backupDir = $Config.backups.backupDir
    
    if (-not (Test-Path $backupDir)) {
        Write-Host "No backups found"
        return @()
    }
    
    $backups = Get-ChildItem -Path $backupDir -Directory -Filter "backup-*" |
               Sort-Object Name -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "No backups found"
        return @()
    }
    
    Write-Host "Available Backups:"
    Write-Host "=================="
    
    $backupList = @()
    
    foreach ($backup in $backups) {
        $metadataPath = Join-Path $backup.FullName "metadata.json"
        
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath -Raw | ConvertFrom-Json
            $size = (Get-ChildItem -Path $backup.FullName -Recurse | Measure-Object -Property Length -Sum).Sum
            
            Write-Host ""
            Write-Host "ID: $($backup.Name)"
            Write-Host "  Type: $($metadata.type)"
            Write-Host "  Timestamp: $($metadata.timestamp)"
            Write-Host "  Size: $(Format-Bytes $size)"
            Write-Host "  Status: $($metadata.status)"
            if ($metadata.type -eq "incremental") {
                Write-Host "  Based On: $($metadata.basedOn)"
            }
            
            $backupList += @{
                id = $backup.Name
                path = $backup.FullName
                metadata = $metadata
                size = $size
            }
        }
    }
    
    return $backupList
}

# Find backup by timestamp
function Find-BackupByTimestamp {
    param(
        [datetime]$Timestamp,
        [object]$Config
    )
    
    $backups = List-Backups -Config $Config
    
    $closestBackup = $null
    $closestDiff = $null
    
    foreach ($backup in $backups) {
        if ($backup.metadata.type -eq "full") {
            $backupTime = [datetime]$backup.metadata.timestamp
            $diff = [Math]::Abs(($backupTime - $Timestamp).TotalSeconds)
            
            if (-not $closestDiff -or $diff -lt $closestDiff) {
                $closestBackup = $backup
                $closestDiff = $diff
            }
        }
    }
    
    if ($closestBackup) {
        Write-Host "Found closest backup: $($closestBackup.id)"
        return $closestBackup
    }
    
    return $null
}

# Create a restore point (backup before restoring)
function Create-RestorePoint {
    param([object]$Config)
    
    Write-Host "Creating restore point before restore operation..."
    
    $timestamp = Get-Date -Format "yyyyMMddTHHmmssZ"
    $backupId = "restore-point-$timestamp"
    $backupPath = Join-Path $Config.backups.backupDir $backupId
    
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    
    # Get all files from workspace
    $files = Get-ChildItem -Path $workspaceRoot -Recurse -File |
             Where-Object {
                 $file = $_
                 $shouldExclude = $false
                 
                 foreach ($excludeDir in $Config.exclusions.directories) {
                     if ($file.FullName -like "*$excludeDir*") {
                         $shouldExclude = $true
                         break
                     }
                 }
                 
                 foreach ($excludeFile in $Config.exclusions.files) {
                     if ($file.Name -like $excludeFile) {
                         $shouldExclude = $true
                         break
                     }
                 }
                 
                 return -not $shouldExclude
             }
    
    # Copy critical files only
    $criticalFiles = @("MEMORY.md", "AGENTS.md", "SOUL.md", "USER.md", "TOOLS.md", "HEARTBEAT.md")
    $copiedCount = 0
    
    foreach ($file in $files) {
        $fileName = $file.Name
        
        if ($criticalFiles -contains $fileName) {
            $destPath = Join-Path $backupPath $fileName
            Copy-Item -Path $file.FullName -Destination $destPath -Force
            $copiedCount++
        }
    }
    
    # Create metadata
    $metadata = @{
        id = $backupId
        timestamp = (Get-Date).ToString('o')
        type = "restore-point"
        description = "Automatic restore point before restore operation"
        files = $copiedCount
    }
    
    $metadata | ConvertTo-Json | Out-File -Path (Join-Path $backupPath "metadata.json")
    
    Write-Host "Restore point created: $backupId ($copiedCount critical files)"
    
    return @{
        id = $backupId
        path = $backupPath
    }
}

# Validate backup before restore
function Validate-BackupIntegrity {
    param(
        [string]$BackupPath,
        [object]$Metadata
    )
    
    Write-Host "Validating backup integrity..."
    
    $metadataPath = Join-Path $BackupPath "metadata.json"
    $manifestPath = Join-Path $BackupPath "manifest.json"
    
    if (-not (Test-Path $metadataPath)) {
        Write-Error "Metadata file missing"
        return $false
    }
    
    if (-not (Test-Path $manifestPath)) {
        Write-Error "Manifest file missing"
        return $false
    }
    
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    
    # Verify files exist and match hashes
    $errors = @()
    $verified = 0
    
    foreach ($file in $manifest.files) {
        $filePath = Join-Path $BackupPath $file.path
        
        if (-not (Test-Path $filePath)) {
            $errors += "Missing: $($file.path)"
            continue
        }
        
        $currentHash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
        if ($currentHash -ne $file.hash) {
            $errors += "Hash mismatch: $($file.path)"
            continue
        }
        
        $verified++
    }
    
    Write-Host "Verified $verified/$($manifest.files.Count) files"
    
    if ($errors.Count -gt 0) {
        Write-Host "Found $($errors.Count) errors:"
        foreach ($error in $errors | Select-Object -First 10) {
            Write-Host "  - $error"
        }
        return $false
    }
    
    return $true
}

# Restore from backup
function Restore-Backup {
    param(
        [string]$BackupId,
        [string[]]$SelectiveFilePaths,
        [object]$Config,
        [switch]$DryRun = $false,
        [switch]$Verify = $true
    )
    
    $backupPath = Join-Path $Config.backups.backupDir $BackupId
    
    if (-not (Test-Path $backupPath)) {
        Write-Error "Backup not found: $BackupId"
        return $false
    }
    
    # Validate backup integrity
    $metadataPath = Join-Path $backupPath "metadata.json"
    $metadata = Get-Content $metadataPath -Raw | ConvertFrom-Json
    
    if (-not (Validate-BackupIntegrity -BackupPath $backupPath -Metadata $metadata)) {
        Write-Error "Backup validation failed"
        return $false
    }
    
    # Create restore point
    if (-not $DryRun) {
        $restorePoint = Create-RestorePoint -Config $Config
    }
    
    Write-Host "Restoring from backup: $BackupId"
    
    if ($DryRun) {
        Write-Host "[DRY RUN - No files will be modified]"
    }
    
    # Get manifest
    $manifestPath = Join-Path $backupPath "manifest.json"
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    
    # Determine which files to restore
    $filesToRestore = @()
    
    if ($SelectiveFilePaths.Count -gt 0) {
        # Selective restore
        foreach ($pattern in $SelectiveFilePaths) {
            $matching = @($manifest.files | Where-Object { $_.path -like $pattern })
            $filesToRestore += $matching
        }
    } else {
        # Full restore
        $filesToRestore = $manifest.files
    }
    
    # Restore files
    $restoredCount = 0
    $failedCount = 0
    $errors = @()
    
    foreach ($file in $filesToRestore) {
        $sourceFile = Join-Path $backupPath $file.path
        $destFile = Join-Path $workspaceRoot $file.path
        
        if (-not (Test-Path $sourceFile)) {
            $errors += "Source file not found: $($file.path)"
            $failedCount++
            continue
        }
        
        # Create destination directory
        $destDir = Split-Path -Parent $destFile
        if (-not (Test-Path $destDir)) {
            if ($DryRun) {
                Write-Host "[DRY RUN] Would create: $destDir"
            } else {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
        }
        
        if ($DryRun) {
            Write-Host "[DRY RUN] Would restore: $($file.path)"
            $restoredCount++
        } else {
            try {
                Copy-Item -Path $sourceFile -Destination $destFile -Force
                
                # Verify restored file
                if ($Verify) {
                    $restoredHash = (Get-FileHash -Path $destFile -Algorithm SHA256).Hash
                    if ($restoredHash -ne $file.hash) {
                        $errors += "Verification failed: $($file.path)"
                        $failedCount++
                        continue
                    }
                }
                
                $restoredCount++
            }
            catch {
                $errors += "Failed to restore: $($file.path) - $_"
                $failedCount++
            }
        }
    }
    
    # Log restore operation
    Write-Host ""
    Write-Host "Restore Summary:"
    Write-Host "  Files restored: $restoredCount"
    Write-Host "  Files failed: $failedCount"
    
    if ($errors.Count -gt 0) {
        Write-Host "  Errors:"
        foreach ($error in $errors | Select-Object -First 5) {
            Write-Host "    - $error"
        }
    }
    
    if (-not $DryRun) {
        Log-RestoreOperation -Config $Config -BackupId $BackupId -RestoredCount $restoredCount -FailedCount $failedCount
    }
    
    return $failedCount -eq 0
}

# Rollback a restore operation
function Rollback-Restore {
    param(
        [string]$RestorePointId,
        [object]$Config
    )
    
    Write-Host "Rolling back restore from: $RestorePointId"
    
    $restorePointPath = Join-Path $Config.backups.backupDir $RestorePointId
    
    if (-not (Test-Path $restorePointPath)) {
        Write-Error "Restore point not found: $RestorePointId"
        return $false
    }
    
    # Get metadata
    $metadataPath = Join-Path $restorePointPath "metadata.json"
    $metadata = Get-Content $metadataPath -Raw | ConvertFrom-Json
    
    if ($metadata.type -ne "restore-point") {
        Write-Error "Invalid restore point"
        return $false
    }
    
    # Restore critical files from the restore point
    $criticalFiles = @("MEMORY.md", "AGENTS.md", "SOUL.md", "USER.md", "TOOLS.md", "HEARTBEAT.md")
    
    $restoredCount = 0
    
    foreach ($fileName in $criticalFiles) {
        $sourceFile = Join-Path $restorePointPath $fileName
        
        if (Test-Path $sourceFile) {
            $destFile = Join-Path $workspaceRoot $fileName
            Copy-Item -Path $sourceFile -Destination $destFile -Force
            $restoredCount++
            Write-Host "Restored: $fileName"
        }
    }
    
    Write-Host "Rollback complete: $restoredCount files restored"
    
    return $true
}

# Validate restore operation before actual restore
function Validate-Restore {
    param(
        [string]$BackupId,
        [string[]]$SelectiveFilePaths,
        [object]$Config
    )
    
    Write-Host "Validating restore operation..."
    
    $backupPath = Join-Path $Config.backups.backupDir $BackupId
    
    if (-not (Test-Path $backupPath)) {
        Write-Error "Backup not found: $BackupId"
        return $false
    }
    
    # Check backup integrity
    if (-not (Validate-BackupIntegrity -BackupPath $backupPath -Metadata $null)) {
        Write-Error "Backup integrity check failed"
        return $false
    }
    
    # Check disk space
    $metadataPath = Join-Path $backupPath "metadata.json"
    $metadata = Get-Content $metadataPath -Raw | ConvertFrom-Json
    
    $manifesto = Join-Path $backupPath "manifest.json"
    $manifest = Get-Content $manifesto -Raw | ConvertFrom-Json
    
    $requiredSpace = $manifest | Select-Object -ExpandProperty totalSize
    $availableSpace = (Get-Volume -DriveLetter (Split-Path -Qualifier $workspaceRoot).TrimEnd(':')).SizeRemaining
    
    if ($availableSpace -lt $requiredSpace) {
        Write-Error "Insufficient disk space. Required: $(Format-Bytes $requiredSpace), Available: $(Format-Bytes $availableSpace)"
        return $false
    }
    
    Write-Host "Validation passed:"
    Write-Host "  Backup integrity: OK"
    Write-Host "  Disk space: OK (Required: $(Format-Bytes $requiredSpace))"
    Write-Host "  Files to restore: $($manifest.files.Count)"
    
    return $true
}

# Log restore operation
function Log-RestoreOperation {
    param(
        [object]$Config,
        [string]$BackupId,
        [int]$RestoredCount,
        [int]$FailedCount
    )
    
    $logDir = $Config.backups.logsDir
    $logFile = Join-Path $logDir "restore-operations.log"
    
    $logEntry = @{
        timestamp = (Get-Date).ToString('o')
        backupId = $BackupId
        restoredCount = $RestoredCount
        failedCount = $FailedCount
        status = if ($FailedCount -eq 0) { "Success" } else { "Partial" }
    } | ConvertTo-Json
    
    Add-Content -Path $logFile -Value $logEntry
}

# Helper function to format bytes
function Format-Bytes {
    param([long]$Bytes)
    
    if ($Bytes -eq 0) { return "0 B" }
    
    $sizes = @("B", "KB", "MB", "GB", "TB")
    $sizeIndex = 0
    
    while ($Bytes -ge 1024 -and $sizeIndex -lt $sizes.Count - 1) {
        $Bytes = $Bytes / 1024
        $sizeIndex++
    }
    
    return "{0:N2} {1}" -f $Bytes, $sizes[$sizeIndex]
}

# Main execution
try {
    $config = Load-Config -Path $ConfigPath
    
    switch ($Action) {
        'ListBackups' {
            List-Backups -Config $config
        }
        'Restore' {
            if (-not $BackupId) {
                Write-Error "BackupId parameter required"
                exit 1
            }
            
            if ($Timestamp) {
                $backup = Find-BackupByTimestamp -Timestamp $Timestamp -Config $config
                if (-not $backup) {
                    Write-Error "No backup found near timestamp: $Timestamp"
                    exit 1
                }
                $BackupId = $backup.id
            }
            
            if (-not (Validate-Restore -BackupId $BackupId -SelectiveFilePaths $FilePaths -Config $config)) {
                exit 1
            }
            
            $success = Restore-Backup -BackupId $BackupId -SelectiveFilePaths $FilePaths -Config $config -DryRun $DryRun -Verify $Verify
            
            if (-not $success) {
                exit 1
            }
        }
        'ValidateRestore' {
            if (-not $BackupId) {
                Write-Error "BackupId parameter required"
                exit 1
            }
            
            if (-not (Validate-Restore -BackupId $BackupId -SelectiveFilePaths $FilePaths -Config $config)) {
                exit 1
            }
        }
        'CreateRestorePoint' {
            Create-RestorePoint -Config $config
        }
        'RollbackRestore' {
            if (-not $BackupId) {
                Write-Error "BackupId parameter required (restore point ID)"
                exit 1
            }
            
            $success = Rollback-Restore -RestorePointId $BackupId -Config $config
            
            if (-not $success) {
                exit 1
            }
        }
    }
}
catch {
    Write-Error "Error: $_"
    exit 1
}
