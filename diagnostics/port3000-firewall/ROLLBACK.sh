#!/usr/bin/env bash
set -euo pipefail
powershell.exe -NoProfile -Command "Set-NetFirewallRule -Name 'MLDSA-Docker-TCP3000' -NewDisplayName 'ML-DSA Docker TCP 3000 LAN' -Protocol TCP -LocalPort 3000 -ErrorAction Stop; Write-Output 'PORTS=3000'"