# Projects System - Isolation Test Suite
# Tests context isolation between projects

$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
$ProjectsDir = "$WorkspaceRoot\projects"
$TestResults = @()

function Test-FileIsolation {
    Write-Host "`n=== Test 1: File System Isolation ===" -ForegroundColor Cyan
    
    $webAppExists = Test-Path "$ProjectsDir\web-app-redesign\MEMORY.md"
    $dataPipelineExists = Test-Path "$ProjectsDir\data-pipeline\MEMORY.md"
    
    if ($webAppExists -and $dataPipelineExists) {
        Write-Host "[PASS] Both test projects have independent MEMORY.md files" -ForegroundColor Green
        $script:TestResults += @{ Test = "File Isolation"; Status = "PASS" }
        return $true
    } else {
        Write-Host "[FAIL] One or more MEMORY.md files missing" -ForegroundColor Red
        $script:TestResults += @{ Test = "File Isolation"; Status = "FAIL" }
        return $false
    }
}

function Test-ContentIsolation {
    Write-Host "`n=== Test 2: Content Isolation ===" -ForegroundColor Cyan
    
    $webAppMemory = Get-Content "$ProjectsDir\web-app-redesign\MEMORY.md" -Raw
    $dataPipelineMemory = Get-Content "$ProjectsDir\data-pipeline\MEMORY.md" -Raw
    
    # Check for expected content in each project
    $webAppHasReact = $webAppMemory -match "React"
    $webAppHasStripe = $webAppMemory -match "Stripe"
    $dataPipelineHasAirflow = $dataPipelineMemory -match "Airflow"
    $dataPipelineHasSpark = $dataPipelineMemory -match "Spark"
    
    # Check for contamination (should NOT be present)
    $webAppHasAirflow = $webAppMemory -match "Airflow"
    $dataPipelineHasReact = $dataPipelineMemory -match "React"
    
    $pass = $true
    
    if ($webAppHasReact -and $webAppHasStripe) {
        Write-Host "[PASS] web-app-redesign has expected content (React, Stripe)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] web-app-redesign missing expected content" -ForegroundColor Red
        $pass = $false
    }
    
    if ($dataPipelineHasAirflow -and $dataPipelineHasSpark) {
        Write-Host "[PASS] data-pipeline has expected content (Airflow, Spark)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] data-pipeline missing expected content" -ForegroundColor Red
        $pass = $false
    }
    
    if (-not $webAppHasAirflow) {
        Write-Host "[PASS] web-app-redesign does NOT contain Airflow (no contamination)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] web-app-redesign contains Airflow (contamination detected!)" -ForegroundColor Red
        $pass = $false
    }
    
    if (-not $dataPipelineHasReact) {
        Write-Host "[PASS] data-pipeline does NOT contain React (no contamination)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] data-pipeline contains React (contamination detected!)" -ForegroundColor Red
        $pass = $false
    }
    
    if ($pass) {
        $script:TestResults += @{ Test = "Content Isolation"; Status = "PASS" }
    } else {
        $script:TestResults += @{ Test = "Content Isolation"; Status = "FAIL" }
    }
    
    return $pass
}

function Test-ConfigIsolation {
    Write-Host "`n=== Test 3: Configuration Isolation ===" -ForegroundColor Cyan
    
    $webAppConfig = Get-Content "$ProjectsDir\web-app-redesign\CONFIG.json" | ConvertFrom-Json
    $dataPipelineConfig = Get-Content "$ProjectsDir\data-pipeline\CONFIG.json" | ConvertFrom-Json
    
    $pass = $true
    
    if ($webAppConfig.template -eq "web-dev") {
        Write-Host "[PASS] web-app-redesign has correct template (web-dev)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] web-app-redesign has wrong template" -ForegroundColor Red
        $pass = $false
    }
    
    if ($dataPipelineConfig.template -eq "data-science") {
        Write-Host "[PASS] data-pipeline has correct template (data-science)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] data-pipeline has wrong template" -ForegroundColor Red
        $pass = $false
    }
    
    if ($webAppConfig.tags -contains "react") {
        Write-Host "[PASS] web-app-redesign has correct tags" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] web-app-redesign missing expected tags" -ForegroundColor Red
        $pass = $false
    }
    
    if ($dataPipelineConfig.tags -contains "airflow") {
        Write-Host "[PASS] data-pipeline has correct tags" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] data-pipeline missing expected tags" -ForegroundColor Red
        $pass = $false
    }
    
    if ($pass) {
        $script:TestResults += @{ Test = "Config Isolation"; Status = "PASS" }
    } else {
        $script:TestResults += @{ Test = "Config Isolation"; Status = "FAIL" }
    }
    
    return $pass
}

function Test-DirectoryStructure {
    Write-Host "`n=== Test 4: Directory Structure Isolation ===" -ForegroundColor Cyan
    
    $webAppDirs = @("files/html", "files/css", "files/js", "files/assets")
    $dataPipelineDirs = @("files/data/raw", "files/data/processed", "files/notebooks", "files/analysis")
    
    $pass = $true
    
    # Check web-app structure
    foreach ($dir in $webAppDirs) {
        if (Test-Path "$ProjectsDir\web-app-redesign\$dir") {
            Write-Host "[PASS] web-app-redesign has $dir" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] web-app-redesign missing $dir" -ForegroundColor Red
            $pass = $false
        }
    }
    
    # Check data-pipeline structure
    foreach ($dir in $dataPipelineDirs) {
        if (Test-Path "$ProjectsDir\data-pipeline\$dir") {
            Write-Host "[PASS] data-pipeline has $dir" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] data-pipeline missing $dir" -ForegroundColor Red
            $pass = $false
        }
    }
    
    if ($pass) {
        $script:TestResults += @{ Test = "Directory Structure"; Status = "PASS" }
    } else {
        $script:TestResults += @{ Test = "Directory Structure"; Status = "FAIL" }
    }
    
    return $pass
}

function Test-TaskIsolation {
    Write-Host "`n=== Test 5: Task Isolation ===" -ForegroundColor Cyan
    
    $webAppTasks = Get-Content "$ProjectsDir\web-app-redesign\tasks.md" -Raw
    $dataPipelineTasks = Get-Content "$ProjectsDir\data-pipeline\tasks.md" -Raw
    
    # Check tasks are different
    if ($webAppTasks -ne $dataPipelineTasks) {
        Write-Host "[PASS] Task files are independent (different content)" -ForegroundColor Green
        $script:TestResults += @{ Test = "Task Isolation"; Status = "PASS" }
        return $true
    } else {
        Write-Host "[FAIL] Task files have identical content (should be different)" -ForegroundColor Red
        $script:TestResults += @{ Test = "Task Isolation"; Status = "FAIL" }
        return $false
    }
}

function Test-GlobalRegistry {
    Write-Host "`n=== Test 6: Global Project Registry ===" -ForegroundColor Cyan
    
    $config = Get-Content "$WorkspaceRoot\projects-config.json" | ConvertFrom-Json
    
    $pass = $true
    
    if ($config.projects.'web-app-redesign') {
        Write-Host "[PASS] web-app-redesign registered in global config" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] web-app-redesign not registered" -ForegroundColor Red
        $pass = $false
    }
    
    if ($config.projects.'data-pipeline') {
        Write-Host "[PASS] data-pipeline registered in global config" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] data-pipeline not registered" -ForegroundColor Red
        $pass = $false
    }
    
    $templateCount = @($config.templates.PSObject.Properties).Count
    if ($templateCount -ge 6) {
        Write-Host "[PASS] All 6 templates present in config ($templateCount templates)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Missing templates in config (found $templateCount, expected 6)" -ForegroundColor Red
        $pass = $false
    }
    
    if ($pass) {
        $script:TestResults += @{ Test = "Global Registry"; Status = "PASS" }
    } else {
        $script:TestResults += @{ Test = "Global Registry"; Status = "FAIL" }
    }
    
    return $pass
}

function Test-RequiredFiles {
    Write-Host "`n=== Test 7: Required Files Present ===" -ForegroundColor Cyan
    
    $requiredFiles = @("MEMORY.md", "CONTEXT.md", "CONFIG.json", "tasks.md", "README.md")
    $projects = @("web-app-redesign", "data-pipeline")
    
    $pass = $true
    
    foreach ($project in $projects) {
        foreach ($file in $requiredFiles) {
            if (Test-Path "$ProjectsDir\$project\$file") {
                Write-Host "[PASS] $project/$file exists" -ForegroundColor Green
            } else {
                Write-Host "[FAIL] $project/$file missing" -ForegroundColor Red
                $pass = $false
            }
        }
    }
    
    if ($pass) {
        $script:TestResults += @{ Test = "Required Files"; Status = "PASS" }
    } else {
        $script:TestResults += @{ Test = "Required Files"; Status = "FAIL" }
    }
    
    return $pass
}

# Run all tests
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "Projects System - Isolation Test Suite" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Yellow

Test-FileIsolation
Test-ContentIsolation
Test-ConfigIsolation
Test-DirectoryStructure
Test-TaskIsolation
Test-GlobalRegistry
Test-RequiredFiles

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
    Write-Host "`n[OK] ALL TESTS PASSED - System is ready for production" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[FAIL] TESTS FAILED - Review issues above" -ForegroundColor Red
    exit 1
}
