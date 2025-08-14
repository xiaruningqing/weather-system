import os
# 设置环境变量，避免joblib的CPU核心检测错误
os.environ['LOKY_MAX_CPU_COUNT'] = '1'

# 创建测试图片
import numpy as np
import cv2
import warnings

# 忽略警告信息
warnings.filterwarnings('ignore')

def create_test_image():
    # 创建一个彩色测试图片
    height, width = 300, 400
    image = np.zeros((height, width, 3), dtype=np.uint8)
    
    # 添加一些彩色区域
    # 红色区域
    image[0:100, 0:200] = [255, 0, 0]
    # 绿色区域
    image[100:200, 0:200] = [0, 255, 0]
    # 蓝色区域
    image[200:300, 0:200] = [0, 0, 255]
    # 黄色区域
    image[0:150, 200:400] = [255, 255, 0]
    # 紫色区域
    image[150:300, 200:400] = [255, 0, 255]
    
    # 添加一些渐变
    for i in range(height):
        for j in range(width):
            if 50 <= i <= 250 and 50 <= j <= 350:
                image[i, j] = [i % 256, j % 256, (i + j) % 256]
    
    # 保存图片为JPG格式，避免PNG警告
    cv2.imwrite("test.jpg", image)
    print("测试图片已创建：test.jpg")

if __name__ == "__main__":
    create_test_image() 