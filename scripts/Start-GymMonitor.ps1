$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'Start-GymApp.ps1'
$task = Get-ScheduledTask -TaskName 'Gym App Auto Start' -ErrorAction SilentlyContinue
if ($task) {
    if ($task.State -eq 'Running') { return }
    # Hand recovery over to Task Scheduler instead of leaving it attached to
    # the shortcut's terminal (or to the process which installed the app).
    $monitorPattern = '-File\s+"?' + [regex]::Escape($launcher) + '"?\s+-Monitor\s*$'
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -match $monitorPattern } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
    }
    Start-ScheduledTask -TaskName 'Gym App Auto Start'
    $deadline = (Get-Date).AddSeconds(10)
    do {
        if ((Get-ScheduledTask -TaskName 'Gym App Auto Start').State -eq 'Running') { return }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw 'Windows did not start Gym App Auto Start. Open Gym App again to retry.'
}
# First launch can still run while Windows requests the one-time setup consent.
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$launcher`"", '-Monitor') -WorkingDirectory (Split-Path $PSScriptRoot)
