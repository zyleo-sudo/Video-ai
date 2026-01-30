@echo off
echo.
echo ========================================
echo   Video AI Build Script
echo ========================================
echo.

echo [1/4] Cleaning old build...
if exist dist (
    rmdir /s /q dist
)
echo   Done
echo.

echo [2/4] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo   Build failed!
    pause
    exit /b 1
)
echo   Done
echo.

echo [3/4] Copying files...
copy start.bat dist\ > nul
copy start.sh dist\ > nul
copy DISTRIBUTION.md dist\README.md > nul
echo   Done
echo.

echo [4/4] Creating ZIP...
set ZIP_FILE=video-ai-v1.0.0.zip
if exist "%ZIP_FILE%" del "%ZIP_FILE%"
powershell -Command "Compress-Archive -Path dist -DestinationPath '%ZIP_FILE%' -Force"
echo   Done: %ZIP_FILE%
echo.

echo ========================================
echo   Build Complete!
echo   File: %ZIP_FILE%
echo   Size:
powershell -Command "[math]::Round((Get-Item '%ZIP_FILE%').Length / 1MB, 2)"
echo.
echo   Share with friends!
echo   They just extract and double-click start.bat
echo.
pause
