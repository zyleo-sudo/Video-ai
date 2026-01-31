@echo off
chcp 65001
cls

echo ======================================
echo Video AI 版本更新脚本
echo ======================================
echo.

REM 检查 VERSION 文件是否存在
if not exist "VERSION" (
    echo 错误: VERSION 文件不存在
    pause
    exit /b 1
)

REM 读取当前版本号
set /p CURRENT_VERSION=<VERSION
echo 当前版本: %CURRENT_VERSION%
echo.

REM 解析版本号 (格式: v1.0.1)
for /f "tokens=1,2,3 delims=v." %%a in ("%CURRENT_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

REM 递增修订号 (PATCH)
set /a PATCH+=1
set NEW_VERSION=v%MAJOR%.%MINOR%.%PATCH%
echo 新版本: %NEW_VERSION%
echo.

REM 更新 VERSION 文件
echo %NEW_VERSION%>VERSION

REM 更新 TopBar.tsx 中的版本号
powershell -Command "(Get-Content 'src\components\layout\TopBar.tsx') -replace 'const APP_VERSION = .*;', 'const APP_VERSION = ^'%NEW_VERSION%^';' | Set-Content 'src\components\layout\TopBar.tsx'"

echo [1/3] 版本号已更新
echo.
echo [2/3] 添加修改的文件...
git add .
if %errorlevel% neq 0 (
    echo 错误: git add 失败
    pause
    exit /b 1
)

echo.
echo [3/3] 提交并推送到 GitHub...
git commit -m "release: bump version to %NEW_VERSION%"
if %errorlevel% neq 0 (
    echo 注意: 没有需要提交的修改，或提交失败
    pause
    exit /b 0
)

git push origin main
if %errorlevel% neq 0 (
    echo 错误: git push 失败
    pause
    exit /b 1
)

echo.
echo ======================================
echo ✅ 版本 %NEW_VERSION% 发布成功！
echo ======================================
echo.
echo Vercel正在自动部署（约30秒-1分钟）
echo 部署完成后，刷新网页即可看到新版本
echo 版本号将显示在页面右上角
echo.
pause
