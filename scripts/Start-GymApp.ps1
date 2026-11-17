param([switch]$Monitor, [switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$logRoot = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Get-GymAddress {
    $address = Get-NetIPConfiguration | Where-Object IPv4DefaultGateway | ForEach-Object { $_.IPv4Address.IPAddress } | Where-Object { $_ -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } | Select-Object -First 1
    if (-not $address) { throw 'Connect the laptop to your home Wi-Fi and try again.' }
    return $address
}
function Test-GymReady {
    $allowedPaths = @('BE/bin/Release/net8.0/BE.exe', 'BE/bin/Debug/net8.0/BE.exe') | ForEach-Object { Join-Path $projectRoot $_ }
    $listeners = @(Get-NetTCPConnection -LocalPort 7089 -State Listen -ErrorAction SilentlyContinue)
    if (-not $listeners.Count) { return $false }
    foreach ($listener in $listeners) {
        if ((Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue).Path -notin $allowedPaths) { return $false }
    }
    & curl.exe -k --silent --fail --max-time 3 https://localhost:7089/health/live 2>$null | Out-Null
    return $LASTEXITCODE -eq 0
}
function Start-GymServer {
    $launchLock = New-Object Threading.Mutex($false, 'Local\TrainingApp-Gym-Launch')
    $locked = $false
    try {
        try { $locked = $launchLock.WaitOne(120000) } catch [Threading.AbandonedMutexException] { $locked = $true }
        if (-not $locked) { throw 'Another Gym App launcher is still starting the server.' }
        $address = Get-GymAddress
        $statePath = Join-Path $projectRoot 'artifacts/phone-https/state.json'
        $previousAddress = if (Test-Path -LiteralPath $statePath) { (Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json).Address }
        if ((Test-GymReady) -and $previousAddress -eq $address) { return $address }
        if (-not (Test-Path (Join-Path $projectRoot 'BE/wwwroot/index.html')) -or -not (Test-Path (Join-Path $projectRoot 'BE/bin/Release/net8.0/BE.exe'))) {
            & (Join-Path $PSScriptRoot 'Build-MobileApp.ps1')
            if ($LASTEXITCODE -ne 0) { throw 'Gym App build failed.' }
        }
        & (Join-Path $PSScriptRoot 'Start-TrustedPhoneApp.ps1') -Address $address | Out-Host
        $deadline = (Get-Date).AddSeconds(90)
        while ((Get-Date) -lt $deadline) {
            if (Test-GymReady) { return $address }
            Start-Sleep -Seconds 2
        }
        throw 'Gym App did not start. Check .local-logs/trusted-phone-api-error.log.'
    } finally {
        if ($locked) { $launchLock.ReleaseMutex() }
        $launchLock.Dispose()
    }
}

if ($Monitor) {
    $monitorLock = New-Object Threading.Mutex($false, 'Local\TrainingApp-Gym-Monitor')
    $ownsMonitor = $false
    try {
        try { $ownsMonitor = $monitorLock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownsMonitor = $true }
        if (-not $ownsMonitor) { exit 0 }
        while ($true) {
            try { Start-GymServer | Out-Null }
            catch { Add-Content -LiteralPath (Join-Path $logRoot 'gym-launcher.log') -Value "$(Get-Date -Format s) $($_.Exception.Message)" }
            Start-Sleep -Seconds 30
        }
    } finally {
        if ($ownsMonitor) { $monitorLock.ReleaseMutex() }
        $monitorLock.Dispose()
    }
} else {
    $address = Start-GymServer
    & (Join-Path $PSScriptRoot 'Start-GymMonitor.ps1')
    $url = "https://${address}:7089/dashboard"
    Write-Host "Gym App (laptop and phone): $url"
    if ($OpenBrowser) { Start-Process $url }
    if ($OpenBrowser -and -not (Test-Path (Join-Path $projectRoot 'artifacts/gym-windows-ready'))) {
        try {
            $setupScript = Join-Path $PSScriptRoot 'Enable-GymAutoStart.ps1'
            $setup = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$setupScript`"") -Wait -PassThru
            if ($setup.ExitCode -ne 0) { Write-Warning 'Windows setup was not completed. Gym App is running; accept Windows setup next time to enable automatic startup and phone access.' }
        } catch { Write-Warning 'Windows setup was not accepted. Open Gym App again to retry.' }
    }
}
