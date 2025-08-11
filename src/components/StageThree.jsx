import { useEffect, useMemo, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import StudentVoting from './StudentVoting.jsx'

function computeRainProbability({ humidity, pressure, wind }) {
  // 简化：湿度↑ 概率↑；气压↑ 概率↓；风速中等略↑
  let p = 0
  p += humidity * 0.6
  p += (1010 - pressure) * 0.5 // 低压更易下雨
  p += Math.max(0, 10 - Math.abs(wind - 8)) * 2
  return Math.max(0, Math.min(100, Math.round(p)))
}

export default function StageThree({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const [params, setParams] = useState({ humidity: 60, pressure: 1005, wind: 6 })
  const [prob, setProb] = useState(() => computeRainProbability(params))
  const gearCtrl = useAnimationControls()
  const contributions = useMemo(() => {
    // 与 computeRainProbability 保持一致的解释性分解
    const cHum = params.humidity * 0.6
    const cPres = (1010 - params.pressure) * 0.5
    const cWind = Math.max(0, 10 - Math.abs(params.wind - 8)) * 2
    return { cHum, cPres, cWind }
  }, [params])
  const uncertainty = useMemo(() => {
    // 纯参数型不确定性：远离经验中值(湿60/压1005/风8)则不确定性上升
    const humU = Math.abs(params.humidity - 60) / 60
    const presU = Math.abs(params.pressure - 1005) / 55
    const windU = Math.abs(params.wind - 8) / 12
    const mix = (humU + presU + windU) / 3
    return Math.max(5, Math.min(95, Math.round(20 + mix * 60)))
  }, [params])

  // 自动 5 秒后进入阶段四
  useEffect(() => {
    if (isPaused || !isAutoPlay) return
    const timer = setTimeout(() => onComplete?.(), Math.max(1500, 5000 / Math.max(0.25, speedFactor)))
    return () => clearTimeout(timer)
  }, [isPaused, onComplete, isAutoPlay, speedFactor])

  // 预测动画
  useEffect(() => {
    if (isPaused) gearCtrl.stop()
    else gearCtrl.start({ rotate: 360, transition: { duration: 6, repeat: Infinity, ease: 'linear' } })
  }, [isPaused, gearCtrl])

  const recalc = (next) => {
    const np = computeRainProbability(next)
    setParams(next)
    setProb(np)
  }

  return (
    <section className="min-h-[340px]">
      <h2 className="text-xl md:text-2xl font-semibold">阶段三 · 自主决策（预测）</h2>
      <p className="mt-1 text-slate-300">交互调整湿度/气压/风速，观察预测变化（新增：情景预设、不确定性与贡献度）</p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="glass p-4">
          <div className="flex items-center justify-center h-32">
            <motion.div className="w-24 h-24 rounded-full border-4 border-sky-400/60 border-t-transparent" animate={gearCtrl} />
          </div>
          <div className="mt-3 text-center text-lg">
            未来 2 小时降雨概率：
            <span className="ml-2 text-primary font-semibold">{prob}%</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded border border-slate-700 p-2">
              <div className="text-slate-400">湿度贡献</div>
              <div className="text-sky-300 font-semibold">+{Math.round(contributions.cHum)}</div>
            </div>
            <div className="rounded border border-slate-700 p-2">
              <div className="text-slate-400">气压贡献</div>
              <div className="text-sky-300 font-semibold">{contributions.cPres>=0?'+':''}{Math.round(contributions.cPres)}</div>
            </div>
            <div className="rounded border border-slate-700 p-2">
              <div className="text-slate-400">风速贡献</div>
              <div className="text-sky-300 font-semibold">+{Math.round(contributions.cWind)}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <UncertaintyGauge value={uncertainty} />
            <div className="text-xs text-slate-400">不确定性：<span className="text-amber-300 font-medium">{uncertainty}%</span></div>
          </div>
        </div>

        <div className="glass p-4">
          <ParamSlider
            label="湿度"
            unit="%"
            min={0}
            max={100}
            value={params.humidity}
            onChange={(v) => recalc({ ...params, humidity: v })}
          />
          <ParamSlider
            label="气压"
            unit="hPa"
            min={980}
            max={1035}
            value={params.pressure}
            onChange={(v) => recalc({ ...params, pressure: v })}
          />
          <ParamSlider
            label="风速"
            unit="m/s"
            min={0}
            max={20}
            value={params.wind}
            onChange={(v) => recalc({ ...params, wind: v })}
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <PresetButton label="潮湿低压" onClick={() => recalc({ humidity: 85, pressure: 995, wind: 7 })} />
            <PresetButton label="干冷高压" onClick={() => recalc({ humidity: 30, pressure: 1025, wind: 5 })} />
            <PresetButton label="大风对流" onClick={() => recalc({ humidity: 55, pressure: 1002, wind: 12 })} />
          </div>
        </div>
      </div>

      {/* 第三阶段根据参数进行预测，不再实时请求外部天气 */}
      <StudentVoting modelProb={prob} />

      <div className="mt-2 flex items-center gap-3">
        {isPaused && <div className="text-xs text-slate-400">已暂停</div>}
        {!isAutoPlay && (
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary"
            onClick={() => onComplete?.()}
          >
            进入阶段四
          </button>
        )}
      </div>
    </section>
  )
}

function ParamSlider({ label, unit, min, max, value, onChange }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span className="text-slate-200">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-400"
      />
    </div>
  )
}

function PresetButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function UncertaintyGauge({ value }) {
  // value: 0~100 不确定性（越大越不确定）
  const angle = Math.max(2, Math.min(100, value))
  const bg = `conic-gradient(rgba(248,113,113,0.6) 0% ${angle}%, rgba(2,6,23,0.6) ${angle}% 100%)`
  return (
    <div className="relative w-14 h-14 rounded-full" style={{ background: bg }}>
      <div className="absolute inset-1 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center text-[11px] text-slate-300">{value}%</div>
    </div>
  )
}



