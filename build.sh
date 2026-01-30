#!/bin/bash

echo ""
echo "========================================"
echo "   Video AI 打包脚本"
echo "========================================"
echo ""

# 1. Clean old build
echo "[1/4] 清理旧构建..."
rm -rf dist
echo "   ✓ 清理完成"
echo ""

# 2. Build project
echo "[2/4] 构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ✗ 构建失败！"
    exit 1
fi
echo "   ✓ 构建完成"
echo ""

# 3. Copy server scripts
echo "[3/4] 复制启动脚本和文档..."
cp start-server.bat dist/ 2>/dev/null || true
cp start-server.sh dist/
cp 分发指南.md dist/
cp public/README.md dist/使用说明.md
echo "   ✓ 文件复制完成"
echo ""

# 4. Create ZIP archive
echo "[4/4] 打包为 ZIP..."
ZIP_FILE="video-ai-v1.0.0.zip"
if [ -f "$ZIP_FILE" ]; then
    rm "$ZIP_FILE"
fi
zip -r "$ZIP_FILE" dist/
echo "   ✓ 打包完成: $ZIP_FILE"
echo ""

# Show file size
FILE_SIZE=$(du -h "$ZIP_FILE" | cut -f1)

echo "========================================"
echo "   打包完成！"
echo "   文件位置: $ZIP_FILE"
echo "   文件大小: $FILE_SIZE"
echo ""
echo "   现在可以分享给朋友使用了！"
echo "   朋友只需解压并运行 start-server.sh 即可启动"
echo "========================================"
