# Перезапуск бота Глава Про
$port = 3000
$project = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Останавливаю процесс на порту $port..."
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

Set-Location $project
Write-Host "Запускаю бота..."
& "C:\Program Files\nodejs\npm.cmd" start
