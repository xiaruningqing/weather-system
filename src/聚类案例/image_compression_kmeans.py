import os
# 设置环境变量，避免joblib的CPU核心检测错误
os.environ['LOKY_MAX_CPU_COUNT'] = '1'

import numpy as np
import cv2
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import warnings

# 忽略警告信息
warnings.filterwarnings('ignore')

def compress_image(image_path, k=16):
    """
    使用K-means压缩图片
    Args:
        image_path: 图片路径
        k: 聚类数量
    """
    # 检查文件是否存在
    if not os.path.exists(image_path):
        print(f"错误：找不到图片文件 {image_path}")
        return None, None
    
    # 读取图片
    image = cv2.imread(image_path)
    if image is None:
        print(f"错误：无法读取图片文件 {image_path}")
        return None, None
    
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 重塑图片为二维数组
    height, width, channels = image_rgb.shape
    pixels = image_rgb.reshape(-1, channels)
    
    # K-means聚类
    print(f"正在使用K={k}进行聚类...")
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(pixels)
    
    # 用聚类中心替换像素
    centers = kmeans.cluster_centers_.astype(np.uint8)
    compressed_pixels = centers[labels]
    
    # 重塑回图片形状
    compressed_image = compressed_pixels.reshape(height, width, channels)
    
    return image_rgb, compressed_image

def main():
    # 设置matplotlib中文字体
    plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    
    # 尝试多个可能的图片路径
    possible_paths = [
        "images/test.jpg",
        "test.jpg", 
        "images/test.png",
        "test.png",
        "images/test.jpeg",
        "test.jpeg"
    ]
    
    image_path = None
    for path in possible_paths:
        if os.path.exists(path):
            image_path = path
            break
    
    if image_path is None:
        print("错误：找不到图片文件")
        print("请将图片文件放在以下位置之一：")
        for path in possible_paths:
            print(f"  - {path}")
        return
    
    print(f"找到图片文件：{image_path}")
    
    # 压缩图片
    original, compressed = compress_image(image_path, k=16)
    
    if original is None or compressed is None:
        return
    
    # 显示对比
    plt.figure(figsize=(12, 6))
    
    plt.subplot(1, 2, 1)
    plt.imshow(original)
    plt.title('Original Image', fontsize=14)
    plt.axis('off')
    
    plt.subplot(1, 2, 2)
    plt.imshow(compressed)
    plt.title('Compressed Image (K=16)', fontsize=14)
    plt.axis('off')
    
    plt.tight_layout()
    plt.show()
    
    # 保存压缩图片
    compressed_bgr = cv2.cvtColor(compressed, cv2.COLOR_RGB2BGR)
    output_path = "compressed_image.jpg"
    cv2.imwrite(output_path, compressed_bgr)
    print(f"压缩图片已保存为 {output_path}")

if __name__ == "__main__":
    main() 