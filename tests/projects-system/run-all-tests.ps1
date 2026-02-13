# Projects System - Master Test Runner
# Runs all test suites and generates comprehensive report

$WorkspaceRoot = "C:\Users\DEI\.openclaw\workspace"
$TestsDir = "$WorkspaceRoot\tests\projects-system"

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Magenta
Write-Host " Projects System - Complete Test Suite Runner" -ForegroundColor Magenta
Write-Host "=" * 80 -ForegroundColor Magenta
Write-Host ""

$results = @()

# Run Isolation Tests
Write-Host "`n[1/2] Running Isolation Tests..." -ForegroundColor Yellow
Write-Host "-" * 80
try {
    $isolationResult = & "$TestsDir\test-projects-isolation.ps1"
    $isolationExitCode = $LASTEXITCODE
    
    if ($isolationExitCode -eq 0) {
        $results += @{ Suite = "Isolation Tests"; Status = "PASS"; ExitCode = 0 }
        Write-Host "`n✓ Isolation Tests: PASSED" -ForegroundColor Green
    } else {
        $results += @{ Suite = "Isolation Tests"; Status = "FAIL"; ExitCode = $isolationExitCode }
        Write-Host "`n✗ Isolation Tests: FAILED" -ForegroundColor Red
    }
}
catch {
    $results += @{ Suite = "Isolation Tests"; Status = "ERROR"; ExitCode = -1 }
    Write-Host "`n✗ Isolation Tests: ERROR - $_" -ForegroundColor Red
}

# Run Functionality Tests
Write-Host "`n[2/2] Running Functionality Tests..." -ForegroundColor Yellow
Write-Host "-" * 80
try {
    $functionalityResult = & "$TestsDir\test-projects-functionality.ps1"
    $functionalityExitCode = $LASTEXITCODE
    
    if ($functionalityExitCode -eq 0) {
        $results += @{ Suite = "Functionality Tests"; Status = "PASS"; ExitCode = 0 }
        Write-Host "`n✓ Functionality Tests: PASSED" -ForegroundColor Green
    } else {
        $results += @{ Suite = "Functionality Tests"; Status = "FAIL"; ExitCode = $functionalityExitCode }
        Write-Host "`n✗ Functionality Tests: FAILED" -ForegroundColor Red
    }
}
catch {
    $results += @{ Suite = "Functionality Tests"; Status = "ERROR"; ExitCode = -1 }
    Write-Host "`n✗ Functionality Tests: ERROR - $_" -ForegroundColor Red
}

# Generate Final Report
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Magenta
Write-Host " FINAL TEST REPORT" -ForegroundColor Magenta
Write-Host "=" * 80 -ForegroundColor Magenta
Write-Host ""

$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$errorCount = ($results | Where-Object { $_.Status -eq "ERROR" }).Count
$totalSuites = $results.Count

Write-Host "Test Suites Run: $totalSuites" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $results) {
    $statusSymbol = switch ($result.Status) {
        "PASS" { "[OK]" }
        "FAIL" { "[FAIL]" }
        "ERROR" { "[ERROR]" }
    }
    $color = switch ($result.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "ERROR" { "Yellow" }
    }
    Write-Host "$statusSymbol $($result.Suite): $($result.Status)" -ForegroundColor $color
}

Write-Host ""
Write-Host "-" * 80
Write-Host "PASSED: $passCount" -ForegroundColor Green
Write-Host "FAILED: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "ERRORS: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "-" * 80

if ($failCount -eq 0 -and $errorCount -eq 0) {
    Write-Host ""
    Write-Host "*** ALL TEST SUITES PASSED! ***" -ForegroundColor Green
    Write-Host "    The Projects System is verified and ready for production." -ForegroundColor Green
    Write-Host ""
    
    # Save success report
    $reportPath = "$TestsDir\last-test-report.txt"
    $report = @"
Projects System - Test Report
=============================
Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Status: ✓ ALL TESTS PASSED

Test Suites:
- Isolation Tests: PASS
- Functionality Tests: PASS

Total: $totalSuites suites, $passCount passed, $failCount failed, $errorCount errors

System Status: READY FOR PRODUCTION
"@
    Set-Content -Path $reportPath -Value $report
    Write-Host "Test report saved to: $reportPath" -ForegroundColor Gray
    Write-Host ""
    
    exit 0
} else {
    Write-Host ""
    Write-Host "*** TESTS INCOMPLETE OR FAILED ***" -ForegroundColor Red
    Write-Host "    Review the output above for details." -ForegroundColor Red
    Write-Host ""
    
    # Save failure report
    $reportPath = "$TestsDir\last-test-report.txt"
    $report = @"
Projects System - Test Report
=============================
Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Status: ✗ TESTS FAILED

Test Suites:
$(foreach ($r in $results) { "- $($r.Suite): $($r.Status)" })

Total: $totalSuites suites, $passCount passed, $failCount failed, $errorCount errors

System Status: NEEDS ATTENTION
"@
    Set-Content -Path $reportPath -Value $report
    Write-Host "Test report saved to: $reportPath" -ForegroundColor Gray
    Write-Host ""
    
    exit 1
}
