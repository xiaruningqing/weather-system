import { useEffect, useMemo, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import ReactECharts from 'echarts-for-react'
import { useGlobal } from '../store/global.jsx'

export default function StageFour({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const { history, predictionResult } = useGlobal()
  
  // 使用阶段三的预测结果作为当前预测
  const currentPrediction = predictionResult?.rainProbability || 65
  
  // 生成模拟的实际值（在教学环境中）
  const [actualValue] = useState(() => {
    // 基于预测值生成合理的实际值，加入一些随机性
    const baseActual = currentPrediction
    const variance = Math.random() * 30 - 15 // -15 到 +15 的随机偏差
    return Math.max(0, Math.min(100, Math.round(baseActual + variance)))
  })
  
  // 历史数据包含当前预测
  const [series] = useState(() => {
    const historicalData = Array.from({ length: 7 }).map((_, i) => {
      const pred = Math.round(45 + Math.random() * 40)
      const act = Math.max(0, Math.min(100, Math.round(pred + (Math.random() * 2 - 1) * 20)))
      return { t: Date.now() - (7 - i) * 3600000, pred, act }
    })
    
    // 添加当前预测作为最新数据点
    historicalData.push({
      t: Date.now(),
      pred: currentPrediction,
      act: actualValue
    })
    
    return historicalData
  })
  
  const prediction = currentPrediction
  const actual = actualValue
  const error = Math.abs(prediction - actual)
  const upgrading = error >= 20
  const glowCtrl = useAnimationControls()
  
  // 误差评级系统
  const errorGrade = useMemo(() => {
    if (error <= 10) return { level: '优秀', color: 'text-emerald-400', bgColor: 'bg-emerald-400/20', description: '预测准确度极高' }
    if (error <= 15) return { level: '良好', color: 'text-blue-400', bgColor: 'bg-blue-400/20', description: '预测效果较好' }
    if (error <= 20) return { level: '一般', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20', description: '预测效果中等' }
    if (error <= 30) return { level: '较差', color: 'text-orange-400', bgColor: 'bg-orange-400/20', description: '预测误差较大' }
    return { level: '很差', color: 'text-red-400', bgColor: 'bg-red-400/20', description: '预测准确度低' }
  }, [error])

  useEffect(() => {
    if (isPaused || !isAutoPlay) return
    const timer = setTimeout(() => onComplete?.(), Math.max(900, 3000 / Math.max(0.25, speedFactor)))
    return () => clearTimeout(timer)
  }, [isPaused, onComplete, isAutoPlay, speedFactor])

  useEffect(() => {
    if (!upgrading || isPaused) {
      glowCtrl.stop()
      return
    }
    glowCtrl.start({
      boxShadow: [
        '0 0 0 rgba(34,211,238,0)',
        '0 0 24px rgba(34,211,238,0.6)',
        '0 0 0 rgba(34,211,238,0)'
      ],
      transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
    })
  }, [upgrading, isPaused, glowCtrl])

  return (
    <section className="min-h-[480px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">阶段四 · 动态优化（模型升级）</h2>
          <p className="mt-1 text-slate-300">基于预测结果与实际对比，进行模型性能评估与自适应优化</p>
        </div>
        <div className="text-sm text-slate-300 flex items-center gap-3">
          <span>预测来源</span>
          <div className="text-sky-300 font-semibold">阶段三模型预测</div>
        </div>
      </div>

      {/* 预测结果对比 */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-sm text-slate-400">模型预测</div>
          <div className="text-2xl text-sky-300 font-semibold mt-1">{prediction}%</div>
          <div className="text-xs text-slate-400 mt-1">来自阶段三</div>
        </motion.div>

        <motion.div 
          className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-sm text-slate-400">实际观测</div>
          <div className="text-2xl text-emerald-300 font-semibold mt-1">{actual}%</div>
          <div className="text-xs text-slate-400 mt-1">模拟实测值</div>
        </motion.div>

        <motion.div 
          className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-sm text-slate-400">预测误差</div>
          <div className="text-2xl text-rose-300 font-semibold mt-1">{error}%</div>
          <div className="text-xs text-slate-400 mt-1">绝对误差</div>
        </motion.div>

        <motion.div 
          className={`rounded-xl border border-slate-700/60 p-4 text-center ${errorGrade.bgColor}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-sm text-slate-400">评级</div>
          <div className={`text-2xl font-semibold mt-1 ${errorGrade.color}`}>{errorGrade.level}</div>
          <div className="text-xs text-slate-400 mt-1">{errorGrade.description}</div>
        </motion.div>
      </div>

      {/* 误差评级说明 */}
      <motion.div
        className="mt-6 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <span className="text-sky-300 font-semibold">预测准确度评级标准</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <ErrorGradeItem error="≤10%" level="优秀" color="emerald" description="预测准确度极高，模型性能卓越" />
          <ErrorGradeItem error="11-15%" level="良好" color="blue" description="预测效果较好，模型表现稳定" />
          <ErrorGradeItem error="16-20%" level="一般" color="yellow" description="预测效果中等，需适度调优" />
          <ErrorGradeItem error="21-30%" level="较差" color="orange" description="预测误差较大，需重点优化" />
          <ErrorGradeItem error=">30%" level="很差" color="red" description="预测准确度低，需大幅改进" />
        </div>
      </motion.div>

      {/* 模型优化状态 */}
      <div className="mt-6">
        {upgrading ? (
          <motion.div 
            className="rounded-xl border border-sky-400/60 bg-sky-400/10 p-4 text-center" 
            animate={glowCtrl}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <motion.div
                className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="text-sky-300 font-semibold">模型升级中…</div>
            </div>
            <div className="text-slate-300 text-sm">根据误差反馈调整参数，优化下一轮预测</div>
            <div className="mt-2 text-xs text-sky-400">
              调整策略：学习率 ↑ | 网络复杂度 ↑ | 集成权重优化
            </div>
          </motion.div>
        ) : (
          <div className="rounded-xl border border-emerald-400/60 bg-emerald-400/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-emerald-400"></div>
              <div className="text-emerald-300 font-semibold">预测表现良好</div>
            </div>
            <div className="text-slate-300 text-sm">误差在可接受范围内，模型保持稳定</div>
            <div className="mt-2 text-xs text-emerald-400">
              维持策略：当前参数表现优异，继续使用
            </div>
          </div>
        )}
      </div>

      {/* 分析图表 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-sky-300 font-semibold">误差时间序列</span>
          </div>
          <ErrorTrendChart series={series} />
        </div>
        
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <span className="text-sky-300 font-semibold">自适应优化</span>
          </div>
          <div className="space-y-4">
            <AutoLRPanel error={error} />
            
            {/* 模型参数建议 */}
            <div className="pt-4 border-t border-slate-600/40">
              <div className="text-xs text-slate-400 mb-2">优化建议</div>
              <div className="space-y-2 text-xs">
                {error > 20 && (
                  <div className="flex items-center gap-2 text-orange-300">
                    <span>•</span>
                    <span>增加神经网络层数提升模型复杂度</span>
                  </div>
                )}
                {error > 15 && (
                  <div className="flex items-center gap-2 text-yellow-300">
                    <span>•</span>
                    <span>调高学习率加快模型收敛</span>
                  </div>
                )}
                {error <= 10 && (
                  <div className="flex items-center gap-2 text-emerald-300">
                    <span>•</span>
                    <span>当前参数配置良好，建议保持</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-blue-300">
                  <span>•</span>
                  <span>考虑增加训练数据提升泛化能力</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        {isPaused && <div className="text-xs text-slate-400">已暂停</div>}
        {!isAutoPlay && (
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary"
            onClick={() => onComplete?.()}
          >
            返回阶段一
          </button>
        )}
      </div>
    </section>
  )
}

function toRainProb(d) {
  if (!d) return 50
  const humidity = Number(d.humidity ?? 0)
  const pressure = Number(d.pressure ?? 1010)
  const wind = Number(d.wind_speed ?? 0)
  let p = 0
  p += humidity * 0.6
  p += (1010 - pressure) * 0.5
  p += Math.max(0, 10 - Math.abs(wind - 8)) * 2
  return Math.max(0, Math.min(100, Math.round(p)))
}


function ErrorTrendChart({ series }) {
  const option = useMemo(() => {
    const times = series.map(s => new Date(s.t).toLocaleTimeString('zh-CN', { hour12: false }))
    const errors = series.map(s => Math.abs(s.pred - s.act))
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 10, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: times, axisLine: { lineStyle: { color: '#64748b' } } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#64748b' } } },
      series: [
        { type: 'line', smooth: true, data: errors, areaStyle: { color: 'rgba(56,189,248,0.15)' }, lineStyle: { color: '#38bdf8' } }
      ]
    }
  }, [series])
  return <ReactECharts option={option} style={{ height: 240 }} />
}

// 误差评级项组件
function ErrorGradeItem({ error, level, color, description }) {
  const colorClasses = {
    emerald: { bg: 'bg-emerald-400/20', text: 'text-emerald-400', border: 'border-emerald-400/40' },
    blue: { bg: 'bg-blue-400/20', text: 'text-blue-400', border: 'border-blue-400/40' },
    yellow: { bg: 'bg-yellow-400/20', text: 'text-yellow-400', border: 'border-yellow-400/40' },
    orange: { bg: 'bg-orange-400/20', text: 'text-orange-400', border: 'border-orange-400/40' },
    red: { bg: 'bg-red-400/20', text: 'text-red-400', border: 'border-red-400/40' }
  }
  
  const styles = colorClasses[color]
  
  return (
    <div className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}>
      <div className="font-medium text-slate-200 mb-1">{error}</div>
      <div className={`font-semibold mb-1 ${styles.text}`}>{level}</div>
      <div className="text-slate-400 text-[10px] leading-tight">{description}</div>
    </div>
  )
}

function AutoLRPanel({ error }) {
  // 依据误差动态调节"学习率"演示：误差越大，学习率越高
  const lr = useMemo(() => Math.min(0.9, Math.max(0.1, error / 100)), [error])
  const width = Math.round(lr * 100)
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">学习率：<span className="text-primary font-semibold">{lr.toFixed(2)}</span></div>
      <div className="h-2 rounded bg-slate-800 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <div className="text-xs text-slate-400 mt-2">说明：误差大→更积极更新；误差小→缓慢微调，避免过拟合。</div>
    </div>
  )
}



