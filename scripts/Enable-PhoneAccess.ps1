# Run this script in an Administrator PowerShell window.
$ErrorActionPreference = 'Stop'
$phoneRuleName = 'FORM-Phone-Local-WiFi-7089'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$programPath = Join-Path $projectRoot 'BE/bin/Release/net8.0/BE.exe'
if (-not (Test-Path -LiteralPath $programPath)) { throw 'Build the app in Release configuration first.' }
if (-not (Get-NetFirewallRule -Name $phoneRuleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $phoneRuleName -DisplayName 'FORM phone access - private Wi-Fi only' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 7089 -RemoteAddress LocalSubnet -Profile Private -InterfaceType Wireless -Program $programPath | Out-Null
}
Write-Host 'FORM access is allowed on private Wi-Fi networks, for local devices only.'
Get-NetIPConfiguration | Where-Object IPv4DefaultGateway | ForEach-Object {
    $phoneAddress = $_.IPv4Address.IPAddress
    if ($phoneAddress) { Write-Host "Phone address: https://${phoneAddress}:7089/dashboard" }
}
