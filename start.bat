@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 veya daha yeni bir surum gerekli. https://nodejs.org/
  pause
  exit /b 1
)
start "Internet for Agents - Server" /D "%~dp0" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765/"
