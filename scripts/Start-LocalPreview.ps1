param([switch]$Build)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listeners = Get-NetTCPConnection -LocalPort 7089,5206 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($listenerId in $listeners) {
    $listener = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerId"
    $allowedPaths = @((Join-Path $projectRoot 'BE/bin/Release/net8.0/BE.exe'), (Join-Path $projectRoot 'BE/bin/Debug/net8.0/BE.exe'))
    if ($listener.ExecutablePath -notin $allowedPaths) { throw 'An app port belongs to another program; nothing was stopped.' }
}
foreach ($listenerId in $listeners) {
    $listener = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerId"
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.ParentProcessId)"
    Stop-Process -Id $listenerId
    if ($parent.Name -eq 'dotnet.exe' -and $parent.CommandLine -match 'run\s+--project\s+BE\s+--launch-profile\s+(phone|https|local-preview)') { Stop-Process -Id $parent.ProcessId -ErrorAction SilentlyContinue }
}
$webRoot = Join-Path $projectRoot 'BE/wwwroot'
if ($Build -or -not (Test-Path (Join-Path $webRoot 'index.html'))) {
    Push-Location $projectRoot
    try {
        & powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Build-MobileApp.ps1
        if ($LASTEXITCODE -ne 0) { throw 'App build failed.' }
    } finally { Pop-Location }
}
$logRoot = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$previousPath = $env:Kestrel__Certificates__Default__Path
$previousPassword = $env:Kestrel__Certificates__Default__Password
try {
    $env:Kestrel__Certificates__Default__Path = $null
    $env:Kestrel__Certificates__Default__Password = $null
    $process = Start-Process dotnet -ArgumentList @('run','--project','BE','--launch-profile','local-preview','--configuration','Release') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'local-preview-api.log') -RedirectStandardError (Join-Path $logRoot 'local-preview-api-error.log') -PassThru
} finally {
    $env:Kestrel__Certificates__Default__Path = $previousPath
    $env:Kestrel__Certificates__Default__Password = $previousPassword
}
Write-Host 'Laptop: http://localhost:7089/dashboard'
Get-NetIPConfiguration | Where-Object IPv4DefaultGateway | ForEach-Object {
    $phoneAddress = $_.IPv4Address.IPAddress
    if ($phoneAddress) { Write-Host "Phone: http://${phoneAddress}:7089/dashboard" }
}
Write-Host "Started process $($process.Id). Keep the laptop on and use the same private Wi-Fi. This preview uses HTTP and is not an installable PWA."
