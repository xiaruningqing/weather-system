import React, { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ClusteringCase() {
  const navigate = useNavigate()

  useEffect(() => {
    // 动态加载聚类案例的CSS样式
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/clustering-case/styles.css'
    document.head.appendChild(link)

    // 动态加载聚类案例的JavaScript
    const script = document.createElement('script')
    script.src = '/clustering-case/script.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      // 清理资源
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="min-h-screen">
      {/* 导航栏 */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">返回天气预测系统</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800">🔬 K-means聚类算法学习平台</h1>
              <p className="text-sm text-gray-600 mt-1">从入门到实践的完整学习体验</p>
            </div>
            
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      {/* 聚类案例iframe容器 */}
      <div className="clustering-case-iframe-container">
        <iframe
          src="/clustering-case/index.html"
          width="100%"
          height="800px"
          frameBorder="0"
          title="K-means聚类案例"
          style={{
            border: 'none',
            minHeight: '100vh'
          }}
        />
      </div>
    </div>
  )
}