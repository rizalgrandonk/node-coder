@echo off
powershell -NoExit -Command "fnm env --use-on-cd | Out-String | Invoke-Expression; npm run start"
