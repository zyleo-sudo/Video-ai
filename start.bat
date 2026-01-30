@echo off
cd /d "%~dp0"
echo ========================================
echo   Video AI - Local Server
echo ========================================
echo.
echo Starting server...
echo Open: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

npx serve -p 3000
