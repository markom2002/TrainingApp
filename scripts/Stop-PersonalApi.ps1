$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$allowedPaths = @('BE/bin/Release/net8.0/BE.exe', 'BE/bin/Debug/net8.0/BE.exe') | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $projectRoot $_)) }
$listeners = @(Get-NetTCPConnection -LocalPort 7088,7089 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
$processes = @($listeners | ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId = $_" })
foreach ($process in $processes) {
    if ($process.ExecutablePath -notin $allowedPaths) { throw 'An app port belongs to another program; no process was stopped.' }
}
foreach ($process in $processes) { Stop-Process -Id $process.ProcessId }
