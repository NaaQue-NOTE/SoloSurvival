@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js를 찾지 못했습니다. 실행 안내를 확인해 주세요.
  pause
  exit /b 1
)
node server.cjs --open
if errorlevel 1 pause
