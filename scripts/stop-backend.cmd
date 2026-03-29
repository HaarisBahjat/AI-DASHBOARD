@echo off
setlocal EnableDelayedExpansion

set FOUND=
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3004 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
  set FOUND=1
)

if defined FOUND (
  echo Stopped existing backend process on port 3004.
) else (
  echo No backend process found on port 3004.
)

exit /b 0
