import { useEffect, useMemo, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import ReactECharts from 'echarts-for-react'
import { useGlobal } from '../store/global.jsx'

export default function StageFour({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const { history } = useGlobal()
  // 优先使用全局历史数据；若不足则回退到演示数据
  const [series] = useState(() => {
    if (history && history.length >= 3) {
      return history.map(h => {
        const predProb = toRainProb(h.pred)
        const realProb = toRainProb(h.real)
        return { t: h.t, pred: predProb, act: realProb }
      })
    }
    return Array.from({ length: 8 }).map((_, i) => {
      const pred = Math.round(55 + Math.random() * 40)
      const act = Math.max(0, Math.min(100, Math.round(pred + (Math.random() * 2 - 1) * 25)))
      return { t: Date.now() - (8 - i) * 3600000, pred, act }
    })
  })
  const last = series[series.length - 1]
  const prediction = last.pred
  const actual = last.act
  const error = Math.abs(prediction - actual)
  const upgrading = error >= 20
  const glowCtrl = useAnimationControls()

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
    <section className="min-h-[300px]">
      <h2 className="text-xl md:text-2xl font-semibold">阶段四 · 动态优化（模型升级）</h2>
      <p className="mt-1 text-slate-300">对比预测与实际，基于误差触发模型升级与参数调整</p>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="glass p-4 text-center">
          <div className="text-sm text-slate-400">预测降雨概率</div>
          <div className="text-2xl text-sky-300 font-semibold mt-1">{prediction}%</div>
        </div>

        <div className="glass p-4 text-center">
          <div className="text-sm text-slate-400">实际降雨概率</div>
          <div className="text-2xl text-emerald-300 font-semibold mt-1">{actual}%</div>
        </div>

        <div className="glass p-4 text-center">
          <div className="text-sm text-slate-400">预测误差</div>
          <div className="text-2xl text-rose-300 font-semibold mt-1">{error}%</div>
        </div>
      </div>

      <div className="mt-6">
        {upgrading ? (
          <motion.div className="glass p-4 text-center" animate={glowCtrl}>
            <div className="text-sky-300 font-semibold">模型升级中…</div>
            <div className="text-slate-300 text-sm mt-1">根据误差反馈调整参数，优化下一轮预测</div>
          </motion.div>
        ) : (
          <div className="glass p-4 text-center">
            <div className="text-emerald-300 font-semibold">预测表现良好</div>
            <div className="text-slate-300 text-sm mt-1">误差较小，无需显著升级</div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-3">
          <div className="text-sm text-slate-400 mb-2">误差时间序列</div>
          <ErrorTrendChart series={series} />
        </div>
        <div className="glass p-3">
          <div className="text-sm text-slate-400 mb-2">自适应学习率示意</div>
          <AutoLRPanel error={error} />
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

function AutoLRPanel({ error }) {
  // 依据误差动态调节“学习率”演示：误差越大，学习率越高
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



