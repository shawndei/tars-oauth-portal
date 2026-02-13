# Projects System - Functionality Test Suite
# Tests core functionality: create, switch, archive, restore

$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
$ProjectsDir = "$WorkspaceRoot\projects"
$ScriptPath = "$WorkspaceRoot\scripts\projects-manager.ps1"
$TestResults = @()

function Test-ProjectCreation {
    Write-Host "`n=== Test 1: Project Creation ===" -ForegroundColor Cyan
    
    $testProjectName = "test-project-$(Get-Date -Format 'yyyyMMddHHmmss')"
    
    try {
        # Create test project
        & $ScriptPath -Action "create" -ProjectName $testProjectName -Template "generic"
        
        if (Test-Path "$ProjectsDir\$testProjectName") {
            Write-Host "[PASS] Project directory created" -ForegroundColor Green
            
            # Verify required files exist
            $requiredFiles = @("MEMORY.md", "CONTEXT.md", "CONFIG.json", "tasks.md", "README.md")
            $allFilesExist = $true
            
            foreach ($file in $requiredFiles) {
                if (-not (Test-Path "$ProjectsDir\$testProjectName\$file")) {
                    Write-Host "[FAIL] Missing file: $file" -ForegroundColor Red
                    $allFilesExist = $false
                }
            }
            
            if ($allFilesExist) {
                Write-Host "[PASS] All required files created" -ForegroundColor Green
                $script:TestResults += @{ Test = "Project Creation"; Status = "PASS" }
                
                # Cleanup
                Remove-Item -Path "$ProjectsDir\$testProjectName" -Recurse -Force
                return $true
            }
        }
        
        Write-Host "[FAIL] Project creation failed" -ForegroundColor Red
        $script:TestResults += @{ Test = "Project Creation"; Status = "FAIL" }
        return $false
    }
    catch {
        Write-Host "[FAIL] Exception during project creation: $_" -ForegroundColor Red
        $script:TestResults += @{ Test = "Project Creation"; Status = "FAIL" }
        return $false
    }
}

function Test-ProjectListing {
    Write-Host "`n=== Test 2: Project Listing ===" -ForegroundColor Cyan
    
    try {
        # Test that list command runs without errors
        & $ScriptPath -Action "list" 2>&1 | Out-Null
        
        # Verify projects exist in config file
        $config = Get-Content "$WorkspaceRoot\projects-config.json" | ConvertFrom-Json
        
        if ($config.projects.'web-app-redesign' -and $config.projects.'data-pipeline') {
            Write-Host "[PASS] Project listing works and expected projects exist" -ForegroundColor Green
            $script:TestResults += @{ Test = "Project Listing"; Status = "PASS" }
            return $true
        } else {
            Write-Host "[FAIL] Expected projects not found in config" -ForegroundColor Red
            $script:TestResults += @{ Test = "Project Listing"; Status = "FAIL" }
            return $false
        }
    }
    catch {
        Write-Host "[FAIL] Exception during project listing: $_" -ForegroundColor Red
        $script:TestResults += @{ Test = "Project Listing"; Status = "FAIL" }
        return $false
    }
}

function Test-ProjectStatus {
    Write-Host "`n=== Test 3: Project Status ===" -ForegroundColor Cyan
    
    try {
        # Test that status command runs without errors
        & $ScriptPath -Action "status" -ProjectName "web-app-redesign" 2>&1 | Out-Null
        
        # Verify project config exists and has expected data
        $config = Get-Content "$ProjectsDir\web-app-redesign\CONFIG.json" | ConvertFrom-Json
        
        if ($config.name -eq "web-app-redesign" -and $config.template -eq "web-dev") {
            Write-Host "[PASS] Project status works and config is valid" -ForegroundColor Green
            $script:TestResults += @{ Test = "Project Status"; Status = "PASS" }
            return $true
        } else {
            Write-Host "[FAIL] Project config incomplete or incorrect" -ForegroundColor Red
            $script:TestResults += @{ Test = "Project Status"; Status = "FAIL" }
            return $false
        }
    }
    catch {
        Write-Host "[FAIL] Exception during project status: $_" -ForegroundColor Red
        $script:TestResults += @{ Test = "Project Status"; Status = "FAIL" }
        return $false
    }
}

function Test-TemplateSystem {
    Write-Host "`n=== Test 4: Template System ===" -ForegroundColor Cyan
    
    $templates = @("generic", "web-dev", "data-science", "writing", "research", "code")
    $pass = $true
    
    foreach ($template in $templates) {
        $testProjectName = "test-template-$template-$(Get-Date -Format 'yyyyMMddHHmmss')"
        
        try {
            & $ScriptPath -Action "create" -ProjectName $testProjectName -Template $template 2>&1 | Out-Null
            
            if (Test-Path "$ProjectsDir\$testProjectName") {
                $config = Get-Content "$ProjectsDir\$testProjectName\CONFIG.json" | ConvertFrom-Json
                
                if ($config.template -eq $template) {
                    Write-Host "[PASS] Template '$template' works correctly" -ForegroundColor Green
                } else {
                    Write-Host "[FAIL] Template '$template' not applied correctly" -ForegroundColor Red
                    $pass = $false
                }
                
                # Cleanup
                Remove-Item -Path "$ProjectsDir\$testProjectName" -Recurse -Force
            } else {
                Write-Host "[FAIL] Template '$template' failed to create project" -ForegroundColor Red
                $pass = $false
            }
        }
        catch {
            Write-Host "[FAIL] Exception testing template '$template': $_" -ForegroundColor Red
            $pass = $false
        }
    }
    
    if ($pass) {
        $script:TestResults += @{ Test = "Template System"; Status = "PASS" }
    } else {
        $script:TestResults += @{ Test = "Template System"; Status = "FAIL" }
    }
    
    return $pass
}

function Test-ProjectArchiving {
    Write-Host "`n=== Test 5: Project Archiving ===" -ForegroundColor Cyan
    
    $testProjectName = "test-archive-$(Get-Date -Format 'yyyyMMddHHmmss')"
    
    try {
        # Create test project
        & $ScriptPath -Action "create" -ProjectName $testProjectName -Template "generic" 2>&1 | Out-Null
        
        # Archive it
        & $ScriptPath -Action "archive" -ProjectName $testProjectName 2>&1 | Out-Null
        
        # Check if archived
        $config = Get-Content "$ProjectsDir\$testProjectName\CONFIG.json" | ConvertFrom-Json
        
        if ($config.archived -eq $true) {
            Write-Host "[PASS] Project archived successfully" -ForegroundColor Green
            $script:TestResults += @{ Test = "Project Archiving"; Status = "PASS" }
            
            # Cleanup
            Remove-Item -Path "$ProjectsDir\$testProjectName" -Recurse -Force
            return $true
        } else {
            Write-Host "[FAIL] Project not marked as archived" -ForegroundColor Red
            $script:TestResults += @{ Test = "Project Archiving"; Status = "FAIL" }
            return $false
        }
    }
    catch {
        Write-Host "[FAIL] Exception during archiving: $_" -ForegroundColor Red
        $script:TestResults += @{ Test = "Project Archiving"; Status = "FAIL" }
        return $false
    }
}

function Test-ProjectRestoration {
    Write-Host "`n=== Test 6: Project Restoration ===" -ForegroundColor Cyan
    
    $testProjectName = "test-restore-$(Get-Date -Format 'yyyyMMddHHmmss')"
    
    try {
        # Create and archive test project
        & $ScriptPath -Action "create" -ProjectName $testProjectName -Template "generic" 2>&1 | Out-Null
        & $ScriptPath -Action "archive" -ProjectName $testProjectName 2>&1 | Out-Null
        
        # Restore it
        & $ScriptPath -Action "restore" -ProjectName $testProjectName 2>&1 | Out-Null
        
        # Check if restored
        $config = Get-Content "$ProjectsDir\$testProjectName\CONFIG.json" | ConvertFrom-Json
        
        if ($config.archived -eq $false) {
            Write-Host "[PASS] Project restored successfully" -ForegroundColor Green
            $script:TestResults += @{ Test = "Project Restoration"; Status = "PASS" }
            
            # Cleanup
            Remove-Item -Path "$ProjectsDir\$testProjectName" -Recurse -Force
            return $true
        } else {
            Write-Host "[FAIL] Project still marked as archived" -ForegroundColor Red
            $script:TestResults += @{ Test = "Project Restoration"; Status = "FAIL" }
            return $false
        }
    }
    catch {
        Write-Host "[FAIL] Exception during restoration: $_" -ForegroundColor Red
        $script:TestResults += @{ Test = "Project Restoration"; Status = "FAIL" }
        return $false
    }
}

function Test-ConfigIntegrity {
    Write-Host "`n=== Test 7: Configuration Integrity ===" -ForegroundColor Cyan
    
    try {
        # Verify projects-config.json is valid JSON
        $globalConfig = Get-Content "$WorkspaceRoot\projects-config.json" | ConvertFrom-Json
        
        if ($globalConfig.version -and $globalConfig.projects -and $globalConfig.templates) {
            Write-Host "[PASS] Global configuration structure valid" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Global configuration missing required fields" -ForegroundColor Red
            $script:TestResults += @{ Test = "Config Integrity"; Status = "FAIL" }
            return $false
        }
        
        # Verify each project's CONFIG.json is valid
        $projects = @("web-app-redesign", "data-pipeline")
        $allValid = $true
        
        foreach ($project in $projects) {
            try {
                $projectConfig = Get-Content "$ProjectsDir\$project\CONFIG.json" | ConvertFrom-Json
                
                if ($projectConfig.name -and $projectConfig.template -and $projectConfig.settings) {
                    Write-Host "[PASS] $project CONFIG.json is valid" -ForegroundColor Green
                } else {
                    Write-Host "[FAIL] $project CONFIG.json missing required fields" -ForegroundColor Red
                    $allValid = $false
                }
            }
            catch {
                Write-Host "[FAIL] $project CONFIG.json is invalid JSON" -ForegroundColor Red
                $allValid = $false
            }
        }
        
        if ($allValid) {
            $script:TestResults += @{ Test = "Config Integrity"; Status = "PASS" }
            return $true
        } else {
            $script:TestResults += @{ Test = "Config Integrity"; Status = "FAIL" }
            return $false
        }
    }
    catch {
        Write-Host "[FAIL] Exception checking configuration integrity: $_" -ForegroundColor Red
        $script:TestResults += @{ Test = "Config Integrity"; Status = "FAIL" }
        return $false
    }
}

# Run all tests
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "Projects System - Functionality Test Suite" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Yellow

Test-ProjectCreation
Test-ProjectListing
Test-ProjectStatus
Test-TemplateSystem
Test-ProjectArchiving
Test-ProjectRestoration
Test-ConfigIntegrity

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Yellow
Write-Host "TEST SUMMARY" -ForegroundColor Yellow
Write-Host ("=" * 60) -ForegroundColor Yellow

$passCount = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalTests = $TestResults.Count

foreach ($result in $TestResults) {
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "$($result.Test): $($result.Status)" -ForegroundColor $color
}

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor Cyan
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })

if ($failCount -eq 0) {
    Write-Host "`n[OK] ALL TESTS PASSED - Functionality verified" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[FAIL] TESTS FAILED - Review issues above" -ForegroundColor Red
    exit 1
}
