# Backup & Version Control Skill

**Purpose:** Automated backup and version control system for OpenClaw workspace, ensuring data safety with automated backups, incremental versioning, and rollback capabilities.

## Overview

This skill provides a comprehensive backup and version control system for:
- Daily workspace backups
- Configuration file backups
- Memory file backups
- Incremental backup chains
- Version history tracking
- Rollback to previous states
- Multi-destination backup support (local, cloud-ready)

## Features

### 1. Backup Operations
- **Daily Backups:** Scheduled backups of the entire workspace
- **Config Backups:** Automatic backup of configuration files
- **Memory Backups:** Backup of memory and session state files
- **Incremental Backups:** Only changed files backed up to save space
- **Automatic Retention:** Old backups cleaned up based on retention policy

### 2. Version Control
- **Change Tracking:** All changes to key files are tracked with timestamps
- **Version History:** Complete history of file changes available
- **Diff Generation:** See exactly what changed between versions
- **Metadata:** File size, hash, timestamp, and description for each backup

### 3. Backup Destinations
- **Local Disk:** Primary backup location
- **Cloud Storage:** Optional integration (AWS S3, Azure, Google Cloud ready)
- **Multiple Backups:** Keep backups in multiple locations for redundancy

### 4. Recovery Operations
- **Full Restore:** Restore entire workspace from backup
- **Selective Restore:** Restore specific files or directories
- **Point-in-Time:** Restore to any previous backup timestamp
- **Validation:** Verify backup integrity before and after restore

## Configuration

Configuration is stored in `backup-config.json` at the workspace root:

```json
{
  "backups": {
    "enabled": true,
    "backupDir": "backups",
    "retention": {
      "daily": 7,
      "weekly": 4,
      "monthly": 12
    },
    "schedule": "0 2 * * *",
    "incremental": true
  },
  "versionControl": {
    "enabled": true,
    "trackFiles": [
      "MEMORY.md",
      "AGENTS.md",
      "SOUL.md",
      "TOOLS.md",
      "USER.md",
      "**/*.json"
    ],
    "versionHistoryDir": "version-history",
    "maxVersions": 50
  },
  "destinations": {
    "local": {
      "enabled": true,
      "path": "backups"
    },
    "cloud": {
      "enabled": false,
      "provider": "aws-s3",
      "bucket": "openclaw-backups",
      "region": "us-east-1"
    }
  },
  "exclusions": [
    "node_modules",
    ".git",
    ".env",
    "backups",
    "version-history",
    "*.tmp",
    "*.log"
  ]
}
```

## Usage

### Manual Backup
```powershell
# Create a backup
backup-version-control -Action Backup -Description "Pre-deployment backup"

# Create an incremental backup
backup-version-control -Action Backup -Incremental $true
```

### Version Tracking
```powershell
# Track changes to a file
backup-version-control -Action TrackVersion -FilePath "MEMORY.md"

# View version history
backup-version-control -Action GetHistory -FilePath "MEMORY.md"

# View recent changes
backup-version-control -Action GetRecentChanges -Days 7
```

### Restore Operations
```powershell
# List available backups
backup-version-control -Action ListBackups

# Restore from specific backup
backup-version-control -Action Restore -BackupId "backup-2026-02-13T023456Z"

# Restore specific files
backup-version-control -Action Restore -BackupId "backup-2026-02-13T023456Z" -FilePath @("MEMORY.md", "AGENTS.md")

# Restore to point-in-time
backup-version-control -Action Restore -Timestamp "2026-02-12T18:00:00Z"
```

### Status & Maintenance
```powershell
# Check backup status
backup-version-control -Action Status

# Verify backup integrity
backup-version-control -Action Verify -BackupId "backup-2026-02-13T023456Z"

# Cleanup old backups
backup-version-control -Action Cleanup -DaysOld 30

# Get backup statistics
backup-version-control -Action Stats
```

## Implementation

The skill implements the following components:

### 1. Backup Manager (`backup-manager.ps1`)
- Manages backup creation and storage
- Handles retention policies
- Implements incremental backup logic
- Archives old backups

### 2. Version Tracker (`version-tracker.ps1`)
- Tracks changes to key files
- Generates diffs between versions
- Maintains change history
- Provides audit trail

### 3. Restore Engine (`restore-engine.ps1`)
- Performs restore operations
- Validates backup integrity
- Handles selective restore
- Point-in-time recovery

### 4. Cloud Integration (`cloud-sync.ps1`)
- Syncs backups to cloud storage
- Manages cloud credentials
- Implements cloud backup retention
- Validates cloud backup checksums

## Backup Structure

```
backups/
├── backup-2026-02-13T023456Z/          # Full backup
│   ├── metadata.json                    # Backup metadata
│   ├── manifest.json                    # List of files
│   ├── MEMORY.md
│   ├── AGENTS.md
│   ├── memory/
│   │   ├── 2026-02-13.md
│   │   └── 2026-02-12.md
│   └── skills/
│       └── ...
├── backup-2026-02-12T023456Z-delta/    # Incremental backup
│   ├── metadata.json
│   ├── manifest.json
│   ├── delta/                           # Only changed files
│   │   ├── MEMORY.md.delta
│   │   └── memory/2026-02-13.md
│   └── deleted.json
└── backup-manifest.jsonl               # Index of all backups

version-history/
├── MEMORY.md.versions/
│   ├── v1-2026-01-15T120000Z.md
│   ├── v2-2026-01-20T083000Z.md
│   └── history.json
├── AGENTS.md.versions/
│   └── history.json
└── SOUL.md.versions/
    └── history.json
```

## Version History Format

Each tracked file has a `versions/` directory containing:

**history.json:**
```json
{
  "file": "MEMORY.md",
  "versions": [
    {
      "id": "v1",
      "timestamp": "2026-01-15T12:00:00Z",
      "size": 2048,
      "hash": "sha256:abc123...",
      "description": "Initial version",
      "changes": {
        "lines_added": 50,
        "lines_removed": 0,
        "lines_modified": 5
      }
    },
    {
      "id": "v2",
      "timestamp": "2026-01-20T08:30:00Z",
      "size": 2150,
      "hash": "sha256:def456...",
      "description": "Added learning patterns",
      "changes": {
        "lines_added": 20,
        "lines_removed": 5,
        "lines_modified": 3
      }
    }
  ],
  "latest": "v2"
}
```

## Backup Metadata

**metadata.json** in each backup:
```json
{
  "id": "backup-2026-02-13T023456Z",
  "timestamp": "2026-02-13T02:34:56Z",
  "type": "full",
  "duration_ms": 1234,
  "files_count": 156,
  "size_bytes": 5242880,
  "compressed_size_bytes": 1048576,
  "compression_ratio": 0.2,
  "files_changed": [],
  "hash": "sha256:manifest_hash",
  "status": "completed",
  "verification": {
    "passed": true,
    "checked_files": 156,
    "errors": []
  },
  "description": "Daily backup"
}
```

## Scheduled Backups

Backups are scheduled via the system scheduler:

**Windows Task Scheduler:**
- Task Name: `OpenClaw-Daily-Backup`
- Trigger: Daily at 2:00 AM
- Action: Run PowerShell script `backup-manager.ps1 -Action Backup`

**Cron (Linux/macOS):**
```cron
0 2 * * * /path/to/backup-manager.sh --action Backup
```

## Retention Policy

- **Daily backups:** Keep 7 days
- **Weekly backups:** Keep 4 weeks
- **Monthly backups:** Keep 12 months
- **On-demand backups:** Keep indefinitely (manual cleanup)
- **Incremental chain limit:** 20 deltas per full backup

## Security Considerations

1. **Backup Encryption:** Backups support AES-256 encryption (optional)
2. **Access Control:** Restrict backup directory to owner
3. **Integrity Verification:** SHA-256 hashing of all backups
4. **Audit Trail:** All backup/restore operations logged
5. **Sensitive Files:** Exclude .env, secrets, and tokens
6. **Cloud Encryption:** Cloud backups encrypted at rest

## Integration with OpenClaw

### Heartbeat Integration
Add to `HEARTBEAT.md`:
```markdown
## Backup Status
- Check: Daily backup completed
- Check: Version changes tracked
- Action: Run cleanup if needed
```

### Cron Job Integration
Schedule daily backup:
```
OpenClaw-Daily-Backup: 0 2 * * * backup-version-control -Action Backup -Description "Daily automated backup"
```

## Troubleshooting

### Backup Creation Failed
1. Check disk space: `backup-version-control -Action Status`
2. Verify permissions on backup directory
3. Check for locked files during backup
4. Review logs: `Get-Content backups/logs/backup-latest.log`

### Restore Failed
1. Verify backup integrity: `backup-version-control -Action Verify -BackupId <id>`
2. Ensure sufficient disk space
3. Check file permission conflicts
4. Check for corrupted backup metadata

### Version History Not Tracking
1. Verify files match patterns in config
2. Check file permissions allow reading
3. Verify version-history directory exists
4. Check disk space availability

## Performance Notes

- **Daily Backup Time:** ~30-60 seconds (incremental)
- **Full Backup Time:** ~5-10 minutes (first backup)
- **Incremental Overhead:** <5% disk space
- **Restore Time:** ~2-5 minutes for full restore

## Future Enhancements

- [ ] Differential backups (only changed blocks)
- [ ] Blockchain-based backup verification
- [ ] Real-time mirroring to cloud
- [ ] Backup compression optimization
- [ ] Machine learning for smart retention
- [ ] Automated rollback on corruption detection
- [ ] Multi-region backup redundancy

## API Reference

### backup-version-control PowerShell Function

```powershell
function backup-version-control {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('Backup','Restore','TrackVersion','GetHistory','ListBackups','Status','Verify','Cleanup','Stats','GetRecentChanges')]
        [string]$Action,
        
        [string]$BackupId,
        [string]$FilePath,
        [string[]]$FilePaths,
        [datetime]$Timestamp,
        [string]$Description,
        [bool]$Incremental = $true,
        [int]$Days = 7,
        [int]$DaysOld = 30
    )
    # Implementation details...
}
```

## Support

For issues or feature requests related to backup and version control:
1. Check troubleshooting section above
2. Review logs in `backups/logs/`
3. Verify configuration in `backup-config.json`
4. Test with `backup-version-control -Action Verify`

---

**Last Updated:** 2026-02-13
**Status:** Active
**Maintenance:** Daily automated backups
