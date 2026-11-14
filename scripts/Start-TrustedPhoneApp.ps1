param([string]$Address)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $Address) {
    $Address = Get-NetIPConfiguration | Where-Object IPv4DefaultGateway | ForEach-Object { $_.IPv4Address.IPAddress } | Where-Object { $_ -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } | Select-Object -First 1
}
if (-not $Address -or $Address -notmatch '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d{1,3}(\.\d{1,3}){1,2}$') { throw 'Provide the private Wi-Fi IPv4 address with -Address.' }
$parsedAddress = $null
if (-not [Net.IPAddress]::TryParse($Address, [ref]$parsedAddress)) { throw 'Invalid IPv4 address.' }
$webRoot = Join-Path $projectRoot 'BE/wwwroot'
if (-not (Test-Path (Join-Path $webRoot 'index.html'))) { throw 'Run scripts/Build-MobileApp.ps1 first.' }
$certificateRoot = Join-Path $projectRoot 'artifacts/phone-https'
New-Item -ItemType Directory -Path $certificateRoot -Force | Out-Null
$root = Get-ChildItem Cert:/CurrentUser/My | Where-Object { $_.Subject -eq 'CN=FORM Local Development CA' -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date).AddDays(400) } | Sort-Object NotAfter -Descending | Select-Object -First 1
if (-not $root) {
    # The CA private key stays non-exportable in this Windows user's certificate store.
    # This does not add a root to any device's trusted-root store.
    $root = New-SelfSignedCertificate -Type Custom -Subject 'CN=FORM Local Development CA' -FriendlyName 'FORM Local Development CA' -CertStoreLocation Cert:/CurrentUser/My -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 -KeyExportPolicy NonExportable -KeyUsage CertSign,CRLSign,DigitalSignature -TextExtension @('2.5.29.19={critical}{text}CA=true&pathlength=0') -NotAfter (Get-Date).AddYears(3)
}
$statePath = Join-Path $certificateRoot 'state.json'
$state = if (Test-Path $statePath) { Get-Content $statePath -Raw | ConvertFrom-Json } else { $null }
$leaf = if ($state -and $state.Address -eq $Address -and $state.RootThumbprint -eq $root.Thumbprint) { Get-Item "Cert:/CurrentUser/My/$($state.LeafThumbprint)" -ErrorAction SilentlyContinue } else { $null }
if (-not $leaf -or $leaf.NotAfter -lt (Get-Date).AddDays(30)) {
    $leaf = New-SelfSignedCertificate -Type Custom -Subject 'CN=FORM Local Training App' -FriendlyName "FORM phone HTTPS ($Address)" -Signer $root -CertStoreLocation Cert:/CurrentUser/My -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -KeyExportPolicy Exportable -KeyUsage DigitalSignature,KeyEncipherment -TextExtension @("2.5.29.17={text}DNS=localhost&IPAddress=127.0.0.1&IPAddress=$Address", '2.5.29.37={text}1.3.6.1.5.5.7.3.1', '2.5.29.19={critical}{text}CA=false') -NotAfter (Get-Date).AddDays(365)
    $random = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($random)
    $rng.Dispose()
    $state = [PSCustomObject]@{ Address=$Address; RootThumbprint=$root.Thumbprint; LeafThumbprint=$leaf.Thumbprint; Password=[Convert]::ToBase64String($random) }
    $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
}
$pfxPath = Join-Path $certificateRoot 'phone.pfx'
$password = ConvertTo-SecureString $state.Password -AsPlainText -Force
Export-PfxCertificate -Cert $leaf -FilePath $pfxPath -Password $password -ChainOption EndEntityCertOnly | Out-Null
$publicDirectory = Join-Path $webRoot 'certificates'
New-Item -ItemType Directory -Path $publicDirectory -Force | Out-Null
Export-Certificate -Cert $root -FilePath (Join-Path $publicDirectory 'form-local-root.cer') -Type CERT | Out-Null
$sha256 = [Security.Cryptography.SHA256]::Create()
$fingerprint = ([BitConverter]::ToString($sha256.ComputeHash($root.RawData))).Replace('-', ':')
$sha256.Dispose()
$phoneUrl = "https://${Address}:7089"
$setup = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'phone-setup.template.html')).Replace('{{FINGERPRINT}}', $fingerprint).Replace('{{APP_URL}}', $phoneUrl)
[IO.File]::WriteAllText((Join-Path $webRoot 'phone-setup.html'), $setup, [Text.UTF8Encoding]::new($false))

# Restart only listeners whose executable belongs to this project's build folders.
$listeners = Get-NetTCPConnection -LocalPort 7089 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($listenerId in $listeners) {
    $listener = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerId"
    $allowedPaths = @((Join-Path $projectRoot 'BE/bin/Release/net8.0/BE.exe'), (Join-Path $projectRoot 'BE/bin/Debug/net8.0/BE.exe'))
    if ($listener.ExecutablePath -notin $allowedPaths) { throw 'Port 7089 belongs to another program; no process was stopped.' }
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.ParentProcessId)"
    Stop-Process -Id $listenerId
    if ($parent.Name -eq 'dotnet.exe' -and $parent.CommandLine -match 'run\s+--project\s+BE\s+--launch-profile\s+(phone|https)') { Stop-Process -Id $parent.ProcessId -ErrorAction SilentlyContinue }
}
$logRoot = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$previousPath = $env:Kestrel__Certificates__Default__Path
$previousPassword = $env:Kestrel__Certificates__Default__Password
try {
    $env:Kestrel__Certificates__Default__Path = $pfxPath
    $env:Kestrel__Certificates__Default__Password = $state.Password
    $process = Start-Process dotnet -ArgumentList @('run','--project','BE','--launch-profile','phone','--configuration','Release') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'trusted-phone-api.log') -RedirectStandardError (Join-Path $logRoot 'trusted-phone-api-error.log') -PassThru
} finally {
    $env:Kestrel__Certificates__Default__Path = $previousPath
    $env:Kestrel__Certificates__Default__Password = $previousPassword
}
Write-Host "Phone setup: $phoneUrl/phone-setup.html"
Write-Host "First-time setup (no cached app or HTTPS trust required): http://${Address}:7088/phone-setup.html"
Write-Host "App: $phoneUrl/dashboard"
Write-Host "CA SHA-256: $fingerprint"
Write-Host "Started process $($process.Id). Trust the public CA certificate once on each phone; private keys are never served."
