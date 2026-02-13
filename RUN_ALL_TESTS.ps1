# PowerShell Script to Run All Operational Skill Tests
# Generated: 2026-02-13 10:28 GMT-7
# Purpose: Execute all verified skill tests and generate summary report

Write-Host "🚀 RUNNING ALL SKILL TESTS" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$results = @()

function Run-SkillTest {
    param($SkillName, $TestCommand, $WorkDir)
    
    Write-Host "Testing: $SkillName" -ForegroundColor Yellow
    $startTime = Get-Date
    
    Push-Location $WorkDir
    try {
        $output = Invoke-Expression $TestCommand 2>&1
        $exitCode = $LASTEXITCODE
        $duration = (Get-Date) - $startTime
        
        if ($exitCode -eq 0) {
            Write-Host "✅ PASS - $SkillName ($($duration.TotalSeconds)s)" -ForegroundColor Green
            $status = "PASS"
        } else {
            Write-Host "⚠️ PARTIAL - $SkillName" -ForegroundColor Yellow
            $status = "PARTIAL"
        }
    } catch {
        Write-Host "❌ FAIL - $SkillName : $_" -ForegroundColor Red
        $status = "FAIL"
        $duration = (Get-Date) - $startTime
    } finally {
        Pop-Location
    }
    
    return [PSCustomObject]@{
        Skill = $SkillName
        Status = $status
        Duration = $duration.TotalSeconds
    }
}

# Test Skills with npm test
$npmSkills = @(
    @{Name="agent-consensus"; Dir="skills/agent-consensus"},
    @{Name="browser-advanced"; Dir="skills/browser-advanced"},
    @{Name="code-sandbox"; Dir="skills/code-sandbox"},
    @{Name="knowledge-graph"; Dir="skills/knowledge-graph"},
    @{Name="local-embeddings"; Dir="skills/local-embeddings"},
    @{Name="rag-hybrid-search"; Dir="skills/rag-hybrid-search"},
    @{Name="skill-discovery"; Dir="skills/skill-discovery"}
)

foreach ($skill in $npmSkills) {
    $result = Run-SkillTest -SkillName $skill.Name -TestCommand "npm test" -WorkDir $skill.Dir
    $results += $result
}

# Test Skills with custom test commands
$customSkills = @(
    @{Name="reflection-validator"; Dir="skills/reflection-validator"; Cmd="node test-reflection.js --scenario=basic"},
    @{Name="self-healing-recovery"; Dir="skills/self-healing-recovery"; Cmd="node test-recovery.js"},
    @{Name="multi-agent-orchestration"; Dir="skills/multi-agent-orchestration"; Cmd="node test-orchestrator.js"},
    @{Name="data-analytics"; Dir="skills/data-analytics"; Cmd="node test-analytics.js"}
)

foreach ($skill in $customSkills) {
    $result = Run-SkillTest -SkillName $skill.Name -TestCommand $skill.Cmd -WorkDir $skill.Dir
    $results += $result
}

# Summary
Write-Host "`n====================================`n" -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$partial = ($results | Where-Object { $_.Status -eq "PARTIAL" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count
$totalDuration = ($results | Measure-Object -Property Duration -Sum).Sum

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "⚠️ Partial: $partial" -ForegroundColor Yellow
Write-Host "❌ Failed: $failed" -ForegroundColor Red
Write-Host "⏱️ Total Duration: $([Math]::Round($totalDuration, 2))s`n" -ForegroundColor Cyan

# Results Table
$results | Format-Table -Property Skill, Status, @{Label="Duration (s)"; Expression={[Math]::Round($_.Duration, 2)}} -AutoSize

Write-Host "`n✅ All tests complete!" -ForegroundColor Green
Write-Host "📄 See LIVE_SYSTEMS_STATUS.md for detailed results`n" -ForegroundColor Cyan
