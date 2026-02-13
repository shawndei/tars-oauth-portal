#!/usr/bin/env powershell
<#
.SYNOPSIS
    Backup Manager for OpenClaw Workspace
    Handles creation, retention, and management of backups

.DESCRIPTION
    Manages backup operations including full backups, incremental backups,
    retention policies, compression, and verification.

.PARAMETER Action
    The action to perform: Backup, Cleanup, Status, Verify, Stats

.PARAMETER Description
    Optional description for the backup

.PARAMETER Incremental
    Whether to create an incremental backup (default: true after first full backup)

.EXAMPLE
    .\backup-manager.ps1 -Action Backup -Description "Pre-deployment backup"
#>

param(
    [ValidateSet('Backup', 'Cleanup', 'Status', 'Verify', 'Stats')]
    [string]$Action = 'Backup',
    
    [string]$Description = "Automated backup",
    [bool]$Incremental = $true,
    [int]$DaysOld = 30,
    [string]$ConfigPath = "backup-config.json"
)

# Get script directory and workspace root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommandPath
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
Set-Location $workspaceRoot

# Load configuration
function Load-Config {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Error "Configuration file not found: $Path"
        exit 1
    }
    
    $config = Get-Content $Path -Raw | ConvertFrom-Json
    return $config
}

# Initialize backup directories
function Initialize-Directories {
    param([object]$Config)
    
    $dirs = @(
        $Config.backups.backupDir,
        $Config.backups.logsDir,
        $Config.versionControl.versionHistoryDir
    )
    
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Verbose "Created directory: $dir"
        }
    }
}

# Get the latest backup
function Get-LatestBackup {
    param([string]$BackupDir)
    
    $backups = Get-ChildItem -Path $BackupDir -Directory -Filter "backup-*" | 
               Sort-Object Name -Descending | 
               Select-Object -First 1
    
    return $backups
}

# Create a full backup
function New-FullBackup {
    param(
        [object]$Config,
        [string]$Description
    )
    
    $timestamp = Get-Date -Format "yyyyMMddTHHmmssZ"
    $backupId = "backup-$timestamp"
    $backupPath = Join-Path $Config.backups.backupDir $backupId
    
    Write-Host "Creating full backup: $backupId"
    
    # Create backup directory
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    
    # Get source files, excluding those in exclusion list
    $files = Get-ChildItem -Path $workspaceRoot -Recurse -File |
             Where-Object {
                 $file = $_
                 $shouldExclude = $false
                 
                 # Check directory exclusions
                 foreach ($excludeDir in $Config.exclusions.directories) {
                     if ($file.FullName -like "*$excludeDir*") {
                         $shouldExclude = $true
                         break
                     }
                 }
                 
                 # Check file exclusions
                 foreach ($excludeFile in $Config.exclusions.files) {
                     if ($file.Name -like $excludeFile) {
                         $shouldExclude = $true
                         break
                     }
                 }
                 
                 # Check pattern exclusions
                 foreach ($pattern in $Config.exclusions.patterns) {
                     if ($file.FullName -like $pattern) {
                         $shouldExclude = $true
                         break
                     }
                 }
                 
                 return -not $shouldExclude
             }
    
    $fileCount = @($files).Count
    Write-Host "Found $fileCount files to backup"
    
    # Copy files to backup directory
    $copiedCount = 0
    $totalSize = 0
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($workspaceRoot.Length).TrimStart('\')
        $destPath = Join-Path $backupPath $relativePath
        $destDir = Split-Path -Parent $destPath
        
        # Create destination directory
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        # Copy file
        Copy-Item -Path $file.FullName -Destination $destPath -Force | Out-Null
        $copiedCount++
        $totalSize += $file.Length
        
        if ($copiedCount % 100 -eq 0) {
            Write-Host "  Copied $copiedCount files..."
        }
    }
    
    Write-Host "Copied $copiedCount files (Total: $(Format-Bytes $totalSize))"
    
    # Create manifest
    $manifest = @{
        fileCount = $copiedCount
        totalSize = $totalSize
        files = @()
    }
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($workspaceRoot.Length).TrimStart('\')
        $manifest.files += @{
            path = $relativePath
            size = $file.Length
            hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
            modified = $file.LastWriteTime.ToString('o')
        }
    }
    
    # Create metadata
    $startTime = Get-Date
    $metadata = @{
        id = $backupId
        timestamp = $timestamp
        type = "full"
        startTime = $startTime.ToString('o')
        endTime = (Get-Date).ToString('o')
        duration_ms = ([int]((Get-Date) - $startTime).TotalMilliseconds)
        files_count = $copiedCount
        size_bytes = $totalSize
        compressed = $false
        hash = "pending"
        status = "completed"
        description = $Description
        verification = @{
            passed = $false
            checked_files = 0
            errors = @()
        }
    }
    
    # Save metadata and manifest
    $metadata | ConvertTo-Json -Depth 10 | Out-File -Path (Join-Path $backupPath "metadata.json")
    $manifest | ConvertTo-Json -Depth 10 | Out-File -Path (Join-Path $backupPath "manifest.json")
    
    # Verify backup
    Write-Host "Verifying backup integrity..."
    $verificationResult = Verify-Backup -BackupPath $backupPath -Manifest $manifest
    $metadata.verification = $verificationResult
    
    # Update metadata with final verification
    $metadata | ConvertTo-Json -Depth 10 | Out-File -Path (Join-Path $backupPath "metadata.json")
    
    # Log backup
    Log-Operation -Config $Config -Message "Full backup created: $backupId" -Status "Success" -Details @{
        filesCount = $copiedCount
        totalSize = $totalSize
        verified = $verificationResult.passed
    }
    
    return @{
        id = $backupId
        path = $backupPath
        metadata = $metadata
    }
}

# Create an incremental backup
function New-IncrementalBackup {
    param(
        [object]$Config,
        [string]$Description
    )
    
    $timestamp = Get-Date -Format "yyyyMMddTHHmmssZ"
    $backupId = "backup-$timestamp-delta"
    $backupPath = Join-Path $Config.backups.backupDir $backupId
    
    # Get latest full backup
    $latestBackup = Get-LatestBackup -BackupDir $Config.backups.backupDir
    
    if (-not $latestBackup) {
        Write-Host "No previous backup found. Creating full backup instead."
        return New-FullBackup -Config $Config -Description $Description
    }
    
    Write-Host "Creating incremental backup: $backupId"
    Write-Host "Based on: $($latestBackup.Name)"
    
    # Create backup directory
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $backupPath "delta") -Force | Out-Null
    
    # Load previous manifest
    $prevManifest = Get-Content (Join-Path $latestBackup.FullName "manifest.json") -Raw | ConvertFrom-Json
    $prevFiles = @{}
    foreach ($file in $prevManifest.files) {
        $prevFiles[$file.path] = $file
    }
    
    # Get current files
    $currentFiles = Get-ChildItem -Path $workspaceRoot -Recurse -File |
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
    
    # Track changes
    $newFiles = @()
    $modifiedFiles = @()
    $deletedFiles = @()
    $totalDeltaSize = 0
    
    foreach ($file in $currentFiles) {
        $relativePath = $file.FullName.Substring($workspaceRoot.Length).TrimStart('\')
        $currentHash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
        
        if ($prevFiles.ContainsKey($relativePath)) {
            # File exists in previous backup
            if ($prevFiles[$relativePath].hash -ne $currentHash) {
                # File modified
                $modifiedFiles += $relativePath
                $totalDeltaSize += $file.Length
                
                # Copy modified file
                $destPath = Join-Path $backupPath "delta" ([System.IO.Path]::GetFileName($relativePath))
                Copy-Item -Path $file.FullName -Destination $destPath -Force | Out-Null
            }
            
            # Remove from prevFiles so we can find deletions
            $prevFiles.Remove($relativePath)
        } else {
            # New file
            $newFiles += $relativePath
            $totalDeltaSize += $file.Length
            
            # Copy new file
            $destPath = Join-Path $backupPath "delta" ([System.IO.Path]::GetFileName($relativePath))
            Copy-Item -Path $file.FullName -Destination $destPath -Force | Out-Null
        }
    }
    
    # Remaining files in prevFiles are deleted
    $deletedFiles = @($prevFiles.Keys)
    
    # Create delta manifest
    $deltaManifest = @{
        basedOn = $latestBackup.Name
        timestamp = $timestamp
        newFiles = $newFiles
        modifiedFiles = $modifiedFiles
        deletedFiles = $deletedFiles
        totalDeltaSize = $totalDeltaSize
    }
    
    # Create metadata
    $metadata = @{
        id = $backupId
        timestamp = $timestamp
        type = "incremental"
        basedOn = $latestBackup.Name
        startTime = (Get-Date).ToString('o')
        endTime = (Get-Date).ToString('o')
        new_files = @($newFiles).Count
        modified_files = @($modifiedFiles).Count
        deleted_files = @($deletedFiles).Count
        delta_size_bytes = $totalDeltaSize
        status = "completed"
        description = $Description
    }
    
    # Save manifests and metadata
    $deltaManifest | ConvertTo-Json -Depth 10 | Out-File -Path (Join-Path $backupPath "delta-manifest.json")
    $metadata | ConvertTo-Json -Depth 10 | Out-File -Path (Join-Path $backupPath "metadata.json")
    
    Write-Host "Incremental backup created:"
    Write-Host "  New files: $(@($newFiles).Count)"
    Write-Host "  Modified files: $(@($modifiedFiles).Count)"
    Write-Host "  Deleted files: $(@($deletedFiles).Count)"
    Write-Host "  Delta size: $(Format-Bytes $totalDeltaSize)"
    
    # Log operation
    Log-Operation -Config $Config -Message "Incremental backup created: $backupId" -Status "Success" -Details @{
        newFiles = @($newFiles).Count
        modifiedFiles = @($modifiedFiles).Count
        deletedFiles = @($deletedFiles).Count
        deltaSize = $totalDeltaSize
    }
    
    return @{
        id = $backupId
        path = $backupPath
        metadata = $metadata
    }
}

# Verify backup integrity
function Verify-Backup {
    param(
        [string]$BackupPath,
        [object]$Manifest
    )
    
    $errors = @()
    $checkedFiles = 0
    
    foreach ($file in $Manifest.files) {
        $filePath = Join-Path $BackupPath $file.path
        
        if (-not (Test-Path $filePath)) {
            $errors += "Missing file: $($file.path)"
            continue
        }
        
        $currentHash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
        if ($currentHash -ne $file.hash) {
            $errors += "Hash mismatch: $($file.path)"
        }
        
        $checkedFiles++
    }
    
    return @{
        passed = $errors.Count -eq 0
        checked_files = $checkedFiles
        errors = $errors
    }
}

# Cleanup old backups
function Cleanup-OldBackups {
    param(
        [object]$Config,
        [int]$DaysOld
    )
    
    Write-Host "Cleaning up backups older than $DaysOld days..."
    
    $cutoffDate = (Get-Date).AddDays(-$DaysOld)
    $backupDir = $Config.backups.backupDir
    $deletedCount = 0
    $freedSpace = 0
    
    $backups = Get-ChildItem -Path $backupDir -Directory -Filter "backup-*" |
               Sort-Object Name -Descending
    
    foreach ($backup in $backups) {
        # Extract timestamp from backup name
        if ($backup.Name -match "backup-(\d{8})T") {
            $dateStr = $matches[1]
            $backupDate = [datetime]::ParseExact($dateStr, "yyyyMMdd", $null)
            
            if ($backupDate -lt $cutoffDate) {
                Write-Host "Removing: $($backup.Name)"
                
                # Calculate size before deletion
                $size = (Get-ChildItem -Path $backup.FullName -Recurse | Measure-Object -Property Length -Sum).Sum
                $freedSpace += $size
                
                # Delete backup
                Remove-Item -Path $backup.FullName -Recurse -Force
                $deletedCount++
            }
        }
    }
    
    Write-Host "Deleted $deletedCount old backups"
    Write-Host "Freed space: $(Format-Bytes $freedSpace)"
    
    Log-Operation -Config $Config -Message "Cleanup completed" -Status "Success" -Details @{
        deletedBackups = $deletedCount
        freedSpace = $freedSpace
    }
}

# Get backup status
function Get-BackupStatus {
    param([object]$Config)
    
    $backupDir = $Config.backups.backupDir
    
    if (-not (Test-Path $backupDir)) {
        Write-Host "No backups found"
        return
    }
    
    $backups = Get-ChildItem -Path $backupDir -Directory -Filter "backup-*" |
               Sort-Object Name -Descending |
               Select-Object -First 10
    
    Write-Host "Recent Backups:"
    Write-Host "==============="
    
    foreach ($backup in $backups) {
        $metadataPath = Join-Path $backup.FullName "metadata.json"
        
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath -Raw | ConvertFrom-Json
            $size = (Get-ChildItem -Path $backup.FullName -Recurse | Measure-Object -Property Length -Sum).Sum
            
            Write-Host "Name: $($backup.Name)"
            Write-Host "  Type: $($metadata.type)"
            Write-Host "  Time: $($metadata.timestamp)"
            Write-Host "  Size: $(Format-Bytes $size)"
            Write-Host "  Status: $($metadata.status)"
            Write-Host "  Verified: $($metadata.verification.passed)"
            Write-Host ""
        }
    }
    
    # Storage statistics
    $totalSize = (Get-ChildItem -Path $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
    Write-Host "Total Backup Storage: $(Format-Bytes $totalSize)"
}

# Get backup statistics
function Get-BackupStats {
    param([object]$Config)
    
    $backupDir = $Config.backups.backupDir
    
    if (-not (Test-Path $backupDir)) {
        Write-Host "No backups found"
        return @{}
    }
    
    $backups = Get-ChildItem -Path $backupDir -Directory -Filter "backup-*"
    $fullBackups = @($backups | Where-Object { $_.Name -notmatch "-delta$" })
    $incrementalBackups = @($backups | Where-Object { $_.Name -match "-delta$" })
    
    $totalSize = 0
    $oldestBackup = $null
    $newestBackup = $null
    
    foreach ($backup in $backups) {
        $size = (Get-ChildItem -Path $backup.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
        $totalSize += $size
        
        if (-not $oldestBackup -or $backup.CreationTime -lt $oldestBackup.CreationTime) {
            $oldestBackup = $backup
        }
        
        if (-not $newestBackup -or $backup.CreationTime -gt $newestBackup.CreationTime) {
            $newestBackup = $backup
        }
    }
    
    $stats = @{
        totalBackups = $backups.Count
        fullBackups = $fullBackups.Count
        incrementalBackups = $incrementalBackups.Count
        totalSize = $totalSize
        oldestBackup = if ($oldestBackup) { $oldestBackup.CreationTime } else { $null }
        newestBackup = if ($newestBackup) { $newestBackup.CreationTime } else { $null }
    }
    
    Write-Host "Backup Statistics:"
    Write-Host "==================="
    Write-Host "Total Backups: $($stats.totalBackups)"
    Write-Host "Full Backups: $($stats.fullBackups)"
    Write-Host "Incremental Backups: $($stats.incrementalBackups)"
    Write-Host "Total Size: $(Format-Bytes $stats.totalSize)"
    Write-Host "Oldest: $(if ($stats.oldestBackup) { $stats.oldestBackup.ToString('o') } else { 'N/A' })"
    Write-Host "Newest: $(if ($stats.newestBackup) { $stats.newestBackup.ToString('o') } else { 'N/A' })"
    
    return $stats
}

# Verify a specific backup
function Verify-SpecificBackup {
    param(
        [object]$Config,
        [string]$BackupId
    )
    
    $backupPath = Join-Path $Config.backups.backupDir $BackupId
    
    if (-not (Test-Path $backupPath)) {
        Write-Error "Backup not found: $BackupId"
        return
    }
    
    Write-Host "Verifying backup: $BackupId"
    
    $metadataPath = Join-Path $backupPath "metadata.json"
    $manifestPath = Join-Path $backupPath "manifest.json"
    
    if (-not (Test-Path $metadataPath)) {
        Write-Error "Metadata file not found"
        return
    }
    
    if (-not (Test-Path $manifestPath)) {
        Write-Error "Manifest file not found"
        return
    }
    
    $metadata = Get-Content $metadataPath -Raw | ConvertFrom-Json
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    
    $result = Verify-Backup -BackupPath $backupPath -Manifest $manifest
    
    Write-Host "Verification Results:"
    Write-Host "  Files Checked: $($result.checked_files)"
    Write-Host "  Passed: $($result.passed)"
    Write-Host "  Errors: $($result.errors.Count)"
    
    if ($result.errors.Count -gt 0) {
        Write-Host "  Error Details:"
        foreach ($error in $result.errors) {
            Write-Host "    - $error"
        }
    }
}

# Logging function
function Log-Operation {
    param(
        [object]$Config,
        [string]$Message,
        [string]$Status,
        [hashtable]$Details = @{}
    )
    
    $logDir = $Config.backups.logsDir
    $logFile = Join-Path $logDir "backup-operations.log"
    
    $logEntry = @{
        timestamp = (Get-Date).ToString('o')
        message = $Message
        status = $Status
        details = $Details
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
    Initialize-Directories -Config $config
    
    switch ($Action) {
        'Backup' {
            if ($Incremental -and (Get-LatestBackup -BackupDir $config.backups.backupDir)) {
                New-IncrementalBackup -Config $config -Description $Description
            } else {
                New-FullBackup -Config $config -Description $Description
            }
        }
        'Cleanup' {
            Cleanup-OldBackups -Config $config -DaysOld $DaysOld
        }
        'Status' {
            Get-BackupStatus -Config $config
        }
        'Verify' {
            if ($args.Count -gt 0) {
                Verify-SpecificBackup -Config $config -BackupId $args[0]
            } else {
                Write-Host "Usage: .\backup-manager.ps1 -Action Verify <BackupId>"
            }
        }
        'Stats' {
            Get-BackupStats -Config $config
        }
    }
}
catch {
    Write-Error "Error: $_"
    exit 1
}
