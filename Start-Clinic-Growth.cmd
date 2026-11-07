@echo off
title Clinic Growth OS - Local Preview
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS, then run this launcher again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm.cmd run prisma:generate
if errorlevel 1 (
  pause
  exit /b 1
)
echo Opening the app at http://localhost:3000
echo Keep this window open. Press Ctrl+C here to stop the app.
echo Real clinic search needs the credentials listed in SETUP-UPDATED.md.
start "" /min powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:3000'"
call npm.cmd run dev
pause
