$ErrorActionPreference = 'Stop'
# Release this project's executable before publishing backend changes on Windows.
& (Join-Path $PSScriptRoot 'Stop-PersonalApi.ps1')
& (Join-Path $PSScriptRoot 'Build-MobileApp.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Build failed. Correct the error and rerun this launcher.' }
& (Join-Path $PSScriptRoot 'Start-TrustedPhoneApp.ps1')
