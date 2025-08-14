import os
# 设置环境变量，避免joblib的CPU核心检测错误
os.environ['LOKY_MAX_CPU_COUNT'] = '1'

import numpy as np
import cv2
from sklearn.cluster import KMeans
import warnings

# 忽略所有警告
warnings.filterwarnings('ignore')

def compress_image(image_path, k=16):
    """
    使用K-means压缩图片
    """
    try:
        # 读取图片
        image = cv2.imread(image_path)
        if image is None:
            print(f"无法读取图片: {image_path}")
            return False
        
        # 转换为RGB格式
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # 获取图片尺寸
        height, width, channels = image_rgb.shape
        print(f"图片尺寸: {width}x{height}")
        
        # 重塑为像素数组
        pixels = image_rgb.reshape(-1, channels)
        
        # K-means聚类
        print(f"开始聚类 (K={k})...")
        kmeans = KMeans(n_clusters=k, random_state=42)
        labels = kmeans.fit_predict(pixels)
        
        # 获取聚类中心并替换像素
        centers = kmeans.cluster_centers_.astype(np.uint8)
        compressed_pixels = centers[labels]
        
        # 重塑回图片形状
        compressed_image = compressed_pixels.reshape(height, width, channels)
        
        # 保存压缩图片
        compressed_bgr = cv2.cvtColor(compressed_image, cv2.COLOR_RGB2BGR)
        cv2.imwrite("compressed_image.jpg", compressed_bgr)
        
        print("压缩完成！")
        print("压缩图片已保存为: compressed_image.jpg")
        return True
        
    except Exception as e:
        print(f"压缩过程中出错: {e}")
        return False

def main():
    # 查找图片文件
    image_files = [
        "test.jpg", "test.png", "test.jpeg",
        "images/test.jpg", "images/test.png", "images/test.jpeg"
    ]
    
    image_path = None
    for file_path in image_files:
        if os.path.exists(file_path):
            image_path = file_path
            break
    
    if image_path is None:
        print("未找到图片文件")
        print("请将图片文件放在以下位置之一:")
        for file_path in image_files:
            print(f"  - {file_path}")
        print("\n或者运行: python create_test_image.py")
        return
    
    print(f"找到图片: {image_path}")
    compress_image(image_path, k=16)

if __name__ == "__main__":
    main() 