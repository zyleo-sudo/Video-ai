@echo off
chcp 65001
cls

echo ======================================
echo Video AI 一键更新脚本
echo ======================================
echo.

REM 检查是否在正确目录
if not exist "package.json" (
    echo 错误: 请在 video-ai 项目目录下运行此脚本!
    pause
    exit /b 1
)

echo [1/3] 添加修改的文件...
git add .
if %errorlevel% neq 0 (
    echo 错误: git add 失败
    pause
    exit /b 1
)

echo.
echo [2/3] 提交修改...

REM 获取当前日期时间
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)

git commit -m "update: %mydate% %mytime%"
if %errorlevel% neq 0 (
    echo 注意: 没有需要提交的修改，或提交失败
    pause
    exit /b 0
)

echo.
echo [3/3] 推送到GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo 错误: git push 失败
    pause
    exit /b 1
)

echo.
echo ======================================
echo ✅ 更新成功！
echo ======================================
echo.
echo Vercel正在自动部署（约30秒-1分钟）
echo 部署完成后，刷新网页即可看到新版本
echo.
pause
