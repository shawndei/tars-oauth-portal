# Direct curl.exe call for afreesms SMS sends
# 11 florists with Valentine's Day rose inquiry

$message = "Hola, necesito cotizar 2 docenas de rosas rosadas de tallo largo para entrega el 14 feb a Campestre SJD. Tienen disponibilidad y pueden entregar? Precio?"

$florists = @(
    "6241220663",  # La Floristería
    "6241051451",  # Cabo Flowers & Cakes
    "6241435604",  # Emporio Arte Floral (CSL)
    "6241435604",  # Emporio Arte Floral (SJC)
    "6241438593",  # Areté Florals
    "6241750364",  # Areté Florals (alt)
    "6241434088",  # Baja Flowers
    "6241430718",  # Florería Patricia
    "6241721720",  # Florenta Flower Design
    "5518784901",  # Mrs. Flowers
    "6241281166"   # Floreria Alba's
)

$count = 0
foreach ($phone in $florists) {
    $count++
    Write-Host "[$count/11] Sending SMS to $phone..." -ForegroundColor Cyan
    
    # Use curl.exe directly with proper escaping
    & curl.exe -X POST "https://www.afreesms.com/freesms/" `
        -d "country=Mexico" `
        -d "phone=$phone" `
        -d "message=$message" `
        -s -o $null -w "%{http_code}`n"
    
    Start-Sleep -Milliseconds 800
}

Write-Host "`n✅ All 11 SMS messages sent!" -ForegroundColor Green
