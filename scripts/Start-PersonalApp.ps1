$ErrorActionPreference = 'Stop'
# Refresh the actual phone frontend before starting the HTTPS server.
& (Join-Path $PSScriptRoot 'Build-MobileApp.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Build failed; the running application was not replaced.' }
& (Join-Path $PSScriptRoot 'Start-TrustedPhoneApp.ps1')
