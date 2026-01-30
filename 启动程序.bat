@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

set "NODE_VERSION=v20.11.1"
set "NODE_DIR=%~dp0.node"
set "NODE_EXE=%NODE_DIR%\node.exe"

echo ===========================================
echo    AI 视频创作工具 - 全自动启动器
echo ===========================================
echo.

:: 1. 检查环境变量中是否已有 Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [状态] 检测到系统已安装 Node.js 环境
    goto :APP_START
)

:: 2. 检查当前目录下是否已下载过轻量化 Node.js
if exist "%NODE_EXE%" (
    echo [状态] 使用本地集成运行环境
    set "PATH=%NODE_DIR%;%PATH%"
    goto :APP_START
)

:: 3. 自动下载 Node.js 便携版
echo [提示] 未检测到 Node.js 环境，准备为您自动下载...
echo [状态] 正在下载集成环境 (%NODE_VERSION%)，请稍候...
echo [注意] 此过程需要约 30MB 下载流量，取决于网速可能需要 15-60 秒。
echo.

if not exist "%NODE_DIR%" mkdir "%NODE_DIR%"

:: 使用 PowerShell 下载并解压
:: 默认使用官方源，如果网络不通可手动更换镜像地址
set "DOWNLOAD_URL=https://nodejs.org/dist/%NODE_VERSION%/node-%NODE_VERSION%-win-x64.zip"

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = '%DOWNLOAD_URL%'; $zip = '%NODE_DIR%\node.zip'; Write-Host '正在下载...'; Invoke-WebRequest -Uri $url -OutFile $zip; Write-Host '正在解压...'; Expand-Archive -Path $zip -DestinationPath '%NODE_DIR%\temp' -Force; $innerDir = Get-ChildItem -Path '%NODE_DIR%\temp' -Directory | Select-Object -First 1; Move-Item -Path \"$($innerDir.FullName)\*\" -Destination '%NODE_DIR%'; Remove-Item -Path $zip; Remove-Item -Path '%NODE_DIR%\temp' -Recurse -Force; Write-Host '环境配置成功！'"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 自动配置失败，可能是网络原因。
    echo 请手动安装 Node.js (推荐 v18+): https://nodejs.org/
    pause
    exit /b
)

set "PATH=%NODE_DIR%;%PATH%"

:APP_START
echo.
:: 4. 检查并安装依赖
if not exist "node_modules\" (
    echo [状态] 第一次运行，正在安装应用依赖包...
    echo [注意] 此过程通常耗时 1-2 分钟，请耐心等待。
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查您的网络。
        pause
        exit /b
    )
)

:: 5. 启动开发服务器并自动打开浏览器
echo [状态] 正在启动预览界面，正在弹出浏览器...
echo ===========================================
echo  启动成功！请在弹出的浏览器中进行创作。
echo  提示：别忘了在侧边栏“设置”中填入 API Key！
echo ===========================================
echo.

call npm run dev -- --open

pause
