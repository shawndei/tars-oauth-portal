# Enable Windows Auto-Login for Unattended Restarts
# SECURITY: This stores password in registry - only use on secure personal systems

param(
    [string]$Username = "DEI",
    [switch]$Disable
)

if ($Disable) {
    # Disable auto-login
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "AutoAdminLogon" -Value "0"
    Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DefaultPassword" -ErrorAction SilentlyContinue
    Write-Host "✅ Auto-login disabled"
} else {
    # Check if running as admin
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Host "❌ Must run as Administrator"
        exit 1
    }
    
    # Prompt for password securely
    Write-Host "Setting up auto-login for user: $Username"
    Write-Host "NOTE: Password will be stored in registry (encrypted)"
    
    $Password = Read-Host -Prompt "Enter password for $Username" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    # Set auto-login
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "AutoAdminLogon" -Value "1"
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DefaultUserName" -Value $Username
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DefaultPassword" -Value $PlainPassword
    
    Write-Host "✅ Auto-login enabled for $Username"
    Write-Host "⚠️  To disable later, run: .\enable-autologin.ps1 -Disable"
}
