$ErrorActionPreference = 'Stop'
Set-NetFirewallRule -Name 'MLDSA-Docker-TCP3000' -NewDisplayName 'Docker Web TCP 3000 8000 8080 8317 LAN' -Protocol TCP -LocalPort 3000,8000,8080,8317
Write-Output 'PORTS=3000,8000,8080,8317'