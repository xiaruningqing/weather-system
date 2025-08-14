@echo off
echo K-means图片压缩程序
echo ====================

REM 检查是否有图片文件
if exist "test.jpg" (
    echo 找到图片文件: test.jpg
    goto compress
)
if exist "images\test.jpg" (
    echo 找到图片文件: images\test.jpg
    goto compress
)
if exist "test.png" (
    echo 找到图片文件: test.png
    goto compress
)
if exist "images\test.png" (
    echo 找到图片文件: images\test.png
    goto compress
)

echo 未找到图片文件，正在生成测试图片...
python create_test_image.py
if errorlevel 1 (
    echo 生成测试图片失败
    pause
    exit /b 1
)

:compress
echo.
echo 开始压缩图片...
python minimal_compression.py
if errorlevel 1 (
    echo 压缩失败
    pause
    exit /b 1
)

echo.
echo 压缩完成！
pause 