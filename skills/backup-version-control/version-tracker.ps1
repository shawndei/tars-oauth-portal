#!/usr/bin/env powershell
<#
.SYNOPSIS
    Version Tracker for OpenClaw Workspace
    Tracks changes to key files and maintains version history

.DESCRIPTION
    Monitors specified files for changes and maintains a complete version history
    with diffs, file hashes, and metadata.

.PARAMETER Action
    The action to perform: TrackVersion, GetHistory, GetRecentChanges, GenerateDiff

.EXAMPLE
    .\version-tracker.ps1 -Action TrackVersion -FilePath "MEMORY.md"
#>

param(
    [ValidateSet('TrackVersion', 'GetHistory', 'GetRecentChanges', 'GenerateDiff')]
    [string]$Action = 'TrackVersion',
    
    [string]$FilePath,
    [string]$Version1,
    [string]$Version2,
    [int]$Days = 7,
    [string]$ConfigPath = "backup-config.json"
)

# Get workspace root
$workspaceRoot = Get-Location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommandPath
Set-Location $workspaceRoot

# Load configuration
function Load-Config {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Error "Configuration file not found: $Path"
        exit 1
    }
    
    return Get-Content $Path -Raw | ConvertFrom-Json
}

# Check if file matches tracked patterns
function Should-TrackFile {
    param(
        [string]$FilePath,
        [object]$Config
    )
    
    $filePath = (Resolve-Path $FilePath -ErrorAction SilentlyContinue).Path
    
    foreach ($pattern in $Config.versionControl.trackFiles) {
        if ($FilePath -like $pattern) {
            return $true
        }
    }
    
    return $false
}

# Get version history directory for a file
function Get-VersionHistoryDir {
    param(
        [string]$FilePath,
        [object]$Config
    )
    
    $historyDir = $Config.versionControl.versionHistoryDir
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $versionDir = Join-Path $historyDir "$fileName.versions"
    
    return $versionDir
}

# Calculate file hash
function Get-FileHashSHA256 {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        return $null
    }
    
    return (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash
}

# Calculate diff lines
function Get-DiffLines {
    param(
        [string[]]$OldLines,
        [string[]]$NewLines
    )
    
    $linesAdded = 0
    $linesRemoved = 0
    $linesModified = 0
    
    $oldHash = @{}
    foreach ($line in $OldLines) {
        if (-not $oldHash.ContainsKey($line)) {
            $oldHash[$line] = 0
        }
        $oldHash[$line]++
    }
    
    foreach ($line in $NewLines) {
        if ($oldHash.ContainsKey($line) -and $oldHash[$line] -gt 0) {
            $oldHash[$line]--
        } else {
            $linesAdded++
        }
    }
    
    $linesRemoved = $oldHash.Values | Measure-Object -Sum | Select-Object -ExpandProperty Sum
    
    return @{
        added = $linesAdded
        removed = $linesRemoved
        modified = $linesModified
    }
}

# Track a file version
function Track-FileVersion {
    param(
        [string]$FilePath,
        [object]$Config
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Error "File not found: $FilePath"
        return
    }
    
    if (-not (Should-TrackFile -FilePath $FilePath -Config $Config)) {
        Write-Warning "File not in tracked patterns: $FilePath"
        return
    }
    
    # Get or create version history directory
    $versionDir = Get-VersionHistoryDir -FilePath $FilePath -Config $Config
    
    if (-not (Test-Path $versionDir)) {
        New-Item -ItemType Directory -Path $versionDir -Force | Out-Null
    }
    
    # Load or create history file
    $historyFile = Join-Path $versionDir "history.json"
    
    if (Test-Path $historyFile) {
        $history = Get-Content $historyFile -Raw | ConvertFrom-Json
    } else {
        $history = @{
            file = $FilePath
            versions = @()
            latest = $null
        }
    }
    
    # Get current file info
    $fileInfo = Get-Item $FilePath
    $fileContent = Get-Content -Path $FilePath -Raw
    $fileLines = @($fileContent -split "`n")
    $fileHash = Get-FileHashSHA256 -FilePath $FilePath
    
    # Check if file has changed
    $lastVersion = $null
    if ($history.latest) {
        $lastVersionFile = Join-Path $versionDir "v$($history.latest).md"
        if (Test-Path $lastVersionFile) {
            $lastContent = Get-Content -Path $lastVersionFile -Raw
            $lastHash = (Get-FileHash -Path $lastVersionFile -Algorithm SHA256).Hash
            
            if ($lastHash -eq $fileHash) {
                Write-Host "File unchanged: $FilePath"
                return @{ changed = $false }
            }
        }
    }
    
    # Create new version
    $versionCount = $history.versions.Count + 1
    $timestamp = Get-Date
    $timestampStr = $timestamp.ToString('yyyyMMddTHHmmss')
    $versionId = "v$versionCount"
    $versionFile = Join-Path $versionDir "$versionId-$timestampStr.md"
    
    # Copy current file to version
    Copy-Item -Path $FilePath -Destination $versionFile
    
    # Calculate changes from previous version
    $changes = @{
        lines_added = 0
        lines_removed = 0
        lines_modified = 0
    }
    
    if ($history.latest) {
        $lastVersionFile = Join-Path $versionDir "v$($history.latest).md"
        if (Test-Path $lastVersionFile) {
            $lastContent = Get-Content -Path $lastVersionFile -Raw
            $lastLines = @($lastContent -split "`n")
            $diffLines = Get-DiffLines -OldLines $lastLines -NewLines $fileLines
            $changes = $diffLines
        }
    } else {
        $changes.lines_added = $fileLines.Count
    }
    
    # Create version entry
    $versionEntry = @{
        id = $versionId
        timestamp = $timestamp.ToString('o')
        size = $fileInfo.Length
        hash = $fileHash
        lineCount = $fileLines.Count
        changes = $changes
    }
    
    # Add to history
    $history.versions += $versionEntry
    $history.latest = $versionId
    
    # Save history
    $history | ConvertTo-Json -Depth 10 | Out-File -Path $historyFile
    
    Write-Host "Tracked version: $versionId"
    Write-Host "  File: $FilePath"
    Write-Host "  Hash: $fileHash"
    Write-Host "  Lines Added: $($changes.lines_added)"
    Write-Host "  Lines Removed: $($changes.lines_removed)"
    
    return @{
        changed = $true
        versionId = $versionId
        timestamp = $timestamp
        changes = $changes
    }
}

# Get file history
function Get-FileHistory {
    param(
        [string]$FilePath,
        [object]$Config
    )
    
    $versionDir = Get-VersionHistoryDir -FilePath $FilePath -Config $Config
    
    if (-not (Test-Path $versionDir)) {
        Write-Host "No version history found for: $FilePath"
        return
    }
    
    $historyFile = Join-Path $versionDir "history.json"
    
    if (-not (Test-Path $historyFile)) {
        Write-Host "No version history found for: $FilePath"
        return
    }
    
    $history = Get-Content $historyFile -Raw | ConvertFrom-Json
    
    Write-Host "Version History for: $FilePath"
    Write-Host "======================================"
    
    foreach ($version in $history.versions | Sort-Object { $_.timestamp } -Descending) {
        Write-Host ""
        Write-Host "Version: $($version.id)"
        Write-Host "  Timestamp: $($version.timestamp)"
        Write-Host "  Size: $($version.size) bytes"
        Write-Host "  Lines: $($version.lineCount)"
        Write-Host "  Hash: $($version.hash.Substring(0, 16))..."
        Write-Host "  Changes:"
        Write-Host "    Added: $($version.changes.lines_added)"
        Write-Host "    Removed: $($version.changes.lines_removed)"
        Write-Host "    Modified: $($version.changes.lines_modified)"
    }
    
    return $history
}

# Get recent changes
function Get-RecentChanges {
    param(
        [object]$Config,
        [int]$Days
    )
    
    $historyDir = $Config.versionControl.versionHistoryDir
    
    if (-not (Test-Path $historyDir)) {
        Write-Host "No version history found"
        return
    }
    
    $cutoffDate = (Get-Date).AddDays(-$Days)
    $recentChanges = @()
    
    # Get all version directories
    $versionDirs = Get-ChildItem -Path $historyDir -Directory -Filter "*.versions"
    
    Write-Host "Recent Changes (Last $Days days)"
    Write-Host "===================================="
    
    foreach ($versionDirItem in $versionDirs) {
        $historyFile = Join-Path $versionDirItem.FullName "history.json"
        
        if (Test-Path $historyFile) {
            $history = Get-Content $historyFile -Raw | ConvertFrom-Json
            
            $recentVersions = @($history.versions | 
                              Where-Object { [datetime]$_.timestamp -gt $cutoffDate } |
                              Sort-Object { $_.timestamp } -Descending)
            
            if ($recentVersions.Count -gt 0) {
                Write-Host ""
                Write-Host "File: $($history.file)"
                
                foreach ($version in $recentVersions) {
                    Write-Host "  $($version.id) - $($version.timestamp)"
                    Write-Host "    Changes: +$($version.changes.lines_added) -$($version.changes.lines_removed)"
                }
                
                $recentChanges += @{
                    file = $history.file
                    versions = $recentVersions
                }
            }
        }
    }
    
    return $recentChanges
}

# Generate diff between two versions
function Generate-Diff {
    param(
        [string]$FilePath,
        [string]$FromVersion,
        [string]$ToVersion,
        [object]$Config
    )
    
    $versionDir = Get-VersionHistoryDir -FilePath $FilePath -Config $Config
    
    if (-not (Test-Path $versionDir)) {
        Write-Error "No version history found for: $FilePath"
        return
    }
    
    # Find version files
    $fromFile = Get-ChildItem -Path $versionDir -Filter "$FromVersion*.md" | Select-Object -First 1
    $toFile = Get-ChildItem -Path $versionDir -Filter "$ToVersion*.md" | Select-Object -First 1
    
    if (-not $fromFile -or -not $toFile) {
        Write-Error "Version files not found"
        return
    }
    
    $fromContent = Get-Content -Path $fromFile.FullName -Raw
    $toContent = Get-Content -Path $toFile.FullName -Raw
    
    # Use git diff if available, otherwise simple diff
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host "Diff: $($fromFile.Name) -> $($toFile.Name)"
        Write-Host "========================================="
        
        # Write temp files
        $tempDir = [System.IO.Path]::GetTempPath()
        $tempFrom = Join-Path $tempDir "from.tmp"
        $tempTo = Join-Path $tempDir "to.tmp"
        
        Set-Content -Path $tempFrom -Value $fromContent
        Set-Content -Path $tempTo -Value $toContent
        
        # Use git diff
        & git diff --no-index $tempFrom $tempTo 2>$null
        
        # Cleanup
        Remove-Item -Path $tempFrom, $tempTo -Force -ErrorAction SilentlyContinue
    } else {
        # Simple line-by-line diff
        Write-Host "Diff: $($fromFile.Name) -> $($toFile.Name)"
        Write-Host "========================================="
        
        $fromLines = $fromContent -split "`n"
        $toLines = $toContent -split "`n"
        
        $maxLines = [Math]::Max($fromLines.Count, $toLines.Count)
        
        for ($i = 0; $i -lt $maxLines; $i++) {
            $fromLine = if ($i -lt $fromLines.Count) { $fromLines[$i] } else { "" }
            $toLine = if ($i -lt $toLines.Count) { $toLines[$i] } else { "" }
            
            if ($fromLine -ne $toLine) {
                if ($fromLine) {
                    Write-Host "- $fromLine" -ForegroundColor Red
                }
                if ($toLine) {
                    Write-Host "+ $toLine" -ForegroundColor Green
                }
            }
        }
    }
}

# Auto-track all configured files
function Auto-TrackFiles {
    param([object]$Config)
    
    Write-Host "Auto-tracking configured files..."
    
    $trackedCount = 0
    $changedCount = 0
    
    foreach ($pattern in $Config.versionControl.trackFiles) {
        $files = Get-ChildItem -Path $workspaceRoot -Recurse -File |
                Where-Object { $_.FullName -like $pattern }
        
        foreach ($file in $files) {
            $result = Track-FileVersion -FilePath $file.FullName -Config $Config
            
            if ($result -and $result.changed) {
                $changedCount++
            }
            
            $trackedCount++
        }
    }
    
    Write-Host "Tracked $trackedCount files, $changedCount changed"
}

# Main execution
try {
    $config = Load-Config -Path $ConfigPath
    
    switch ($Action) {
        'TrackVersion' {
            if (-not $FilePath) {
                Write-Error "FilePath parameter required for TrackVersion action"
                exit 1
            }
            Track-FileVersion -FilePath $FilePath -Config $config
        }
        'GetHistory' {
            if (-not $FilePath) {
                Write-Error "FilePath parameter required for GetHistory action"
                exit 1
            }
            Get-FileHistory -FilePath $FilePath -Config $config
        }
        'GetRecentChanges' {
            Get-RecentChanges -Config $config -Days $Days
        }
        'GenerateDiff' {
            if (-not $FilePath -or -not $Version1 -or -not $Version2) {
                Write-Error "FilePath, Version1, and Version2 parameters required for GenerateDiff action"
                exit 1
            }
            Generate-Diff -FilePath $FilePath -FromVersion $Version1 -ToVersion $Version2 -Config $config
        }
        default {
            Write-Error "Unknown action: $Action"
            exit 1
        }
    }
}
catch {
    Write-Error "Error: $_"
    exit 1
}
