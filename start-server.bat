@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   Video AI - Local Server
echo ========================================
echo.
echo Starting server...
echo Open browser: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

npx serve -p 3000