$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$frontendRoot = Join-Path $projectRoot 'FE/training-app-frontend'
Push-Location $frontendRoot
try {
    if (-not (Test-Path 'node_modules')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally { Pop-Location }
$webRoot = Join-Path $projectRoot 'BE/wwwroot'
New-Item -ItemType Directory -Path $webRoot -Force | Out-Null
Copy-Item -Path (Join-Path $frontendRoot 'dist/training-app-frontend/browser/*') -Destination $webRoot -Recurse -Force
Push-Location $projectRoot
try {
    & dotnet publish BE/BE.csproj --configuration Release --output artifacts/mobile-app -p:UseAppHost=false
    if ($LASTEXITCODE -ne 0) { throw 'App publish failed.' }
} finally { Pop-Location }
Write-Host 'Ready: artifacts/mobile-app. Serve this ASP.NET app behind a trusted HTTPS address.'
Write-Host 'Configure ConnectionStrings__DefaultConnection, Jwt__Key, Jwt__Issuer and Jwt__Audience on your host.'
Write-Host 'Apply EF migrations before starting the upgraded app. See MOBILNA-APLIKACIJA.md.'
