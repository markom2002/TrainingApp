$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
New-Item -ItemType Directory -Path (Join-Path $projectRoot '.local-logs') -Force | Out-Null
$logPath = Join-Path $projectRoot '.local-logs/windows-setup.log'
try {
    & (Join-Path $PSScriptRoot 'Enable-PhoneAccess.ps1')
    $account = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $launcher = Join-Path $PSScriptRoot 'Start-GymApp.ps1'
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`" -Monitor" -WorkingDirectory $projectRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $account
    $principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask -TaskName 'Gym App Auto Start' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Keep the local gym app available to the laptop and phone after sign-in.' -Force | Out-Null
    if (-not (Get-ScheduledTask -TaskName 'Gym App Auto Start' -ErrorAction SilentlyContinue)) { throw 'Windows did not save the automatic startup task.' }
    if ((Get-NetFirewallRule -Name 'FORM-Phone-Local-WiFi-7089').Enabled -ne 'True') { throw 'Phone access rule is not enabled.' }
    'Firewall and automatic startup configured successfully.' | Set-Content -LiteralPath $logPath
    'Ready' | Set-Content -LiteralPath (Join-Path $projectRoot 'artifacts/gym-windows-ready')
} catch {
    $_.Exception.Message | Set-Content -LiteralPath $logPath
    exit 1
}
