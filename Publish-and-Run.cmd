@echo off
title Clinic Growth OS - Publish and Preview
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git for Windows is required. Install it, then run this file again.
  pause
  exit /b 1
)
if not exist .git (
  echo Run this launcher from the prepared project folder, not from the ZIP archive.
  pause
  exit /b 1
)
echo Uploading committed project to https://github.com/Prethiveraj/clinic-os
echo If GitHub sign-in opens, sign in as Prethiveraj.
git push -u origin main
if errorlevel 1 (
  echo Upload did not finish. The project has not been published by this launcher.
  echo Check your GitHub sign-in and access to Prethiveraj/clinic-os.
  pause
  exit /b 1
)
echo Upload succeeded. Starting the app now.
call Start-Clinic-Growth.cmd
