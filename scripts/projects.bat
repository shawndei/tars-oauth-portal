@echo off
REM Projects System - CLI Wrapper for Windows
REM Usage: projects [command] [arguments]

powershell.exe -ExecutionPolicy Bypass -File "%~dp0projects-manager.ps1" %*
