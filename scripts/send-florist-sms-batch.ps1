# Florist SMS Campaign - Batch Sender
# Using afreesms.com API for 11 florists

$message = "Hola, necesito cotizar 2 docenas de rosas rosadas de tallo largo para entrega el 14 feb a Campestre SJD. Tienen disponibilidad y pueden entregar? Precio?"

$florists = @(
    @{name="La Floristería"; phone="6241220663"},
    @{name="Cabo Flowers & Cakes"; phone="6241051451"},
    @{name="Emporio Arte Floral (CSL)"; phone="6241435604"},
    @{name="Emporio Arte Floral (SJC)"; phone="6241435604"},
    @{name="Areté Florals"; phone="6241438593"},
    @{name="Areté Florals (alt)"; phone="6241750364"},
    @{name="Baja Flowers"; phone="6241434088"},
    @{name="Florería Patricia"; phone="6241430718"},
    @{name="Florenta Flower Design"; phone="6241721720"},
    @{name="Mrs. Flowers"; phone="5518784901"},
    @{name="Floreria Alba's"; phone="6241281166"}
)

$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

foreach ($florist in $florists) {
    Write-Host "Sending SMS to $($florist.name) ($($florist.phone))..." -ForegroundColor Cyan
    
    $body = @{
        country = "Mexico"
        phone = $florist.phone
        message = $message
    } | ConvertTo-Json
    
    try {
        # Using curl to send via afreesms
        $curlCmd = "curl -X POST https://www.afreesms.com/freesms/ -d 'country=Mexico&phone=$($florist.phone)&message=$([System.Uri]::EscapeDataString($message))' -s"
        $response = Invoke-Expression $curlCmd
        
        # Log result
        $results += @{
            timestamp = $timestamp
            florist = $florist.name
            phone = $florist.phone
            status = "sent"
            response_snippet = $response.Substring(0, [Math]::Min(100, $response.Length))
        }
        
        Write-Host "✅ Sent to $($florist.name)" -ForegroundColor Green
        Start-Sleep -Milliseconds 500
        
    } catch {
        Write-Host "❌ Error sending to $($florist.name): $_" -ForegroundColor Red
        $results += @{
            timestamp = $timestamp
            florist = $florist.name
            phone = $florist.phone
            status = "error"
            error = $_.Exception.Message
        }
    }
}

# Save results
$results | ConvertTo-Json | Out-File "florist-sms-batch-results.json"
Write-Host "`n✅ Campaign complete. Results saved to florist-sms-batch-results.json" -ForegroundColor Green
Write-Host "Total: $($results.Count) messages processed" -ForegroundColor Cyan
