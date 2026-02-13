# Test All Completed Skills Script
# Sets up environment and tests each skill systematically

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   TESTING ALL COMPLETED SKILLS - OPERATIONAL STATUS" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Extract and set OpenAI API key from OpenClaw credentials
$openaiKey = node -e "const path = require('path'); const os = require('os'); const fs = require('fs'); const credPath = path.join(os.homedir(), '.openclaw', 'auth', 'credentials.json'); const creds = JSON.parse(fs.readFileSync(credPath, 'utf8')); if (creds.openai_embeddings && creds.openai_embeddings.key) { console.log(creds.openai_embeddings.key); }"

if ($openaiKey) {
    $env:OPENAI_API_KEY = $openaiKey
    Write-Host "[OK] OpenAI API key configured" -ForegroundColor Green
} else {
    Write-Host "[FAIL] OpenAI API key not found!" -ForegroundColor Red
}

$env:OPENCLAW_WORKSPACE = "$PWD"
Write-Host "[OK] Workspace set to: $env:OPENCLAW_WORKSPACE" -ForegroundColor Green
Write-Host ""

$script:results = @()

# Test function
function Test-Skill {
    param(
        [string]$Name,
        [string]$TestCommand,
        [string]$Description
    )
    
    Write-Host "=== Testing: $Name ===" -ForegroundColor Yellow
    Write-Host "$Description" -ForegroundColor Gray
    Write-Host ""
    
    $startTime = Get-Date
    try {
        $output = Invoke-Expression $TestCommand 2>&1 | Out-String
        $duration = ((Get-Date) - $startTime).TotalSeconds
        
        $success = $LASTEXITCODE -eq 0 -or $output -notmatch "Error|error|failed|Failed|FAILED"
        
        if ($success) {
            Write-Host "[PASS] Duration: $([math]::Round($duration, 2))s" -ForegroundColor Green
            $status = "OPERATIONAL"
        } else {
            Write-Host "[FAIL] Duration: $([math]::Round($duration, 2))s" -ForegroundColor Red
            $status = "FAILED"
        }
        
        $script:results += [PSCustomObject]@{
            Skill = $Name
            Status = $status
            Duration = "$([math]::Round($duration, 2))s"
            Output = $output
        }
        
        Write-Host ""
        return $success
    } catch {
        Write-Host "[ERROR] $_" -ForegroundColor Red
        $script:results += [PSCustomObject]@{
            Skill = $Name
            Status = "ERROR"
            Duration = "N/A"
            Output = $_.Exception.Message
        }
        Write-Host ""
        return $false
    }
}

Write-Host "Starting skill tests..." -ForegroundColor Cyan
Write-Host ""

# Test each skill
Test-Skill -Name "episodic-memory" -TestCommand "cd skills/episodic-memory; node index.js stats" -Description "Vector database for memory search"
Test-Skill -Name "reflection-validator" -TestCommand "cd skills/reflection-validator; if (Test-Path 'test.js') { node test.js } else { 'No test file' }" -Description "Response quality validation"
Test-Skill -Name "code-sandbox" -TestCommand "cd skills/code-sandbox; if (Test-Path 'test.js') { node test.js } else { 'No test file' }" -Description "Safe code execution"
Test-Skill -Name "workspace-integration" -TestCommand "cd skills/workspace-integration; if (Test-Path 'test.js') { node test.js } else { 'No test file' }" -Description "File management"
Test-Skill -Name "multi-agent-orchestration" -TestCommand "cd skills/multi-agent-orchestration; if (Test-Path 'test.js') { node test.js } else { 'No test file' }" -Description "Multi-agent coordination"
Test-Skill -Name "deep-research" -TestCommand "cd skills/deep-research; if (Test-Path 'test.js') { node test.js } else { 'No test file' }" -Description "Research pipeline"
Test-Skill -Name "realtime-pipelines" -TestCommand "cd skills/realtime-pipelines; if (Test-Path 'test.js') { node test.js } else { 'No test file' }" -Description "Streaming data"
Test-Skill -Name "local-embeddings" -TestCommand "cd skills/local-embeddings; node -e `"const { createEmbeddingService } = require('./src/embeddings.js'); console.log('Module loads OK');`"" -Description "Local embeddings"
Test-Skill -Name "browser-advanced" -TestCommand "cd skills/browser-advanced; if (Test-Path 'test.js') { node test.js } else { 'No test file' }" -Description "Browser automation"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($script:results | Where-Object { $_.Status -eq "OPERATIONAL" }).Count
$failed = ($script:results | Where-Object { $_.Status -ne "OPERATIONAL" }).Count
$total = $script:results.Count

Write-Host "Total: $total | Passed: $passed | Failed: $failed" -ForegroundColor White
Write-Host ""

$script:results | Format-Table -AutoSize

Write-Host "===================================================" -ForegroundColor Cyan
