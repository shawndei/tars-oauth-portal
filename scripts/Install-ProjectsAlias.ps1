# Install Projects System CLI Alias
# Adds 'projects' command to PowerShell profile

$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
$ScriptPath = "$WorkspaceRoot\scripts\projects-manager.ps1"
$ProfilePath = $PROFILE

Write-Host "Installing 'projects' command alias..." -ForegroundColor Cyan

# Check if profile exists
if (!(Test-Path $ProfilePath)) {
    Write-Host "Creating PowerShell profile at: $ProfilePath" -ForegroundColor Yellow
    New-Item -Path $ProfilePath -Type File -Force | Out-Null
}

# Read current profile
$profileContent = Get-Content $ProfilePath -Raw -ErrorAction SilentlyContinue

# Check if alias already exists
if ($profileContent -match "function projects") {
    Write-Host "Warning: 'projects' function already exists in profile" -ForegroundColor Yellow
    Write-Host "Remove it manually if you want to reinstall" -ForegroundColor Yellow
    exit 0
}

# Add the function to profile
$functionCode = @"

# Projects System CLI Function
function projects {
    param(
        [Parameter(Position=0)]
        [string]`$Action = "help",
        
        [Parameter(Position=1, ValueFromRemainingArguments=`$true)]
        [string[]]`$Arguments
    )
    
    `$scriptPath = "$ScriptPath"
    
    # Parse arguments
    `$projectName = ""
    `$template = "generic"
    `$description = ""
    
    for (`$i = 0; `$i -lt `$Arguments.Length; `$i++) {
        `$arg = `$Arguments[`$i]
        
        if (`$arg -eq "--template" -or `$arg -eq "-t") {
            if (`$i + 1 -lt `$Arguments.Length) {
                `$template = `$Arguments[`$i + 1]
                `$i++
            }
        }
        elseif (`$arg -eq "--description" -or `$arg -eq "-d") {
            if (`$i + 1 -lt `$Arguments.Length) {
                `$description = `$Arguments[`$i + 1]
                `$i++
            }
        }
        elseif ([string]::IsNullOrEmpty(`$projectName)) {
            `$projectName = `$arg
        }
    }
    
    # Execute the script
    & `$scriptPath -Action `$Action -ProjectName `$projectName -Template `$template -Description `$description
}

# Tab completion for projects command
Register-ArgumentCompleter -CommandName projects -ParameterName Action -ScriptBlock {
    param(`$commandName, `$parameterName, `$wordToComplete, `$commandAst, `$fakeBoundParameters)
    
    @('create', 'list', 'switch', 'status', 'archive', 'restore', 'help') | 
        Where-Object { `$_ -like "`$wordToComplete*" } |
        ForEach-Object { [System.Management.Automation.CompletionResult]::new(`$_, `$_, 'ParameterValue', `$_) }
}

# Export the function
Export-ModuleMember -Function projects
"@

Add-Content -Path $ProfilePath -Value $functionCode

Write-Host "[OK] 'projects' command installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "The command has been added to your PowerShell profile:" -ForegroundColor Cyan
Write-Host "  $ProfilePath" -ForegroundColor Gray
Write-Host ""
Write-Host "To use it immediately, run:" -ForegroundColor Yellow
Write-Host "  . `$PROFILE" -ForegroundColor White
Write-Host ""
Write-Host "Or restart PowerShell" -ForegroundColor Yellow
Write-Host ""
Write-Host "Usage examples:" -ForegroundColor Cyan
Write-Host "  projects list" -ForegroundColor White
Write-Host "  projects create my-project --template web-dev" -ForegroundColor White
Write-Host "  projects switch my-project" -ForegroundColor White
Write-Host "  projects status" -ForegroundColor White
Write-Host ""
