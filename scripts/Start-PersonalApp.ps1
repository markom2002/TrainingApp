$ErrorActionPreference = 'Stop'
# Prevent the recovery monitor from restarting the executable during an update.
$launchLock = New-Object Threading.Mutex($false, 'Local\TrainingApp-Gym-Launch')
$locked = $false
try {
    try { $locked = $launchLock.WaitOne(120000) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Another Gym App launcher is still starting the server.' }
    & (Join-Path $PSScriptRoot 'Stop-PersonalApi.ps1')
    & (Join-Path $PSScriptRoot 'Build-MobileApp.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. Correct the error and rerun this launcher.' }
    & (Join-Path $PSScriptRoot 'Start-TrustedPhoneApp.ps1')
} finally {
    if ($locked) { $launchLock.ReleaseMutex() }
    $launchLock.Dispose()
}
