import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { useGlobal } from '../store/global.jsx'

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function useAllDone(devicesState) {
  return useMemo(() => Object.values(devicesState).every((d) => d.status === 'done'), [devicesState])
}

export default function StageOne({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const { setStageOneScore } = useGlobal()
  const [devicesState, setDevicesState] = useState({
    ground: { status: 'idle', data: null },
    balloon: { status: 'idle', data: null },
    satellite: { status: 'idle', data: null },
  })
  const [score, setScore] = useState(0)

  const hasCompletedRef = useRef(false)
  const allDone = useAllDone(devicesState)

  useEffect(() => {
    if (allDone && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      if (isAutoPlay) {
        const timer = setTimeout(() => {
          onComplete?.()
        }, Math.max(300, 1000 / Math.max(0.25, speedFactor)))
        return () => clearTimeout(timer)
      }
    }
  }, [allDone, onComplete, isAutoPlay, speedFactor])

  // 将得分写入全局，供后续阶段融合权重使用
  useEffect(() => { setStageOneScore(score) }, [score, setStageOneScore])

  const startCollect = (key) => {
    setDevicesState((prev) => {
      if (prev[key].status !== 'idle') return prev
      return { ...prev, [key]: { ...prev[key], status: 'collecting' } }
    })

    // 模拟采集时长
    const duration = 1400 + randomInt(0, 600)
    setTimeout(() => {
      const generated = {
        temperatureC: randomInt(12, 34),
        humidityPct: randomInt(20, 95),
        pressureHpa: randomInt(985, 1032),
        windSpeed: randomInt(0, 20),
        windDir: randomPick(WIND_DIRECTIONS),
        cloudPct: randomInt(0, 100),
      }
      setDevicesState((prev) => ({
        ...prev,
        [key]: { status: 'done', data: generated },
      }))
      setScore((s)=> s+10)
    }, duration)
  }

  return (
    <section className="min-h-[420px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">阶段一 · 多源感知</h2>
          <p className="mt-1 text-slate-300">完成三个小游戏来采集数据：旋钮对准、选择高度、对准云团</p>
        </div>
        <div className="text-sm text-slate-300 flex items-center gap-3">
          <span>进度</span>
          <div className="w-40 h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${(Object.values(devicesState).filter(d=>d.status==='done').length/3)*100}%` }} /></div>
          <span className="text-sky-300">{Object.values(devicesState).filter(d=>d.status==='done').length}/3</span>
          <span className="ml-4">得分 <span className="text-amber-300 font-semibold">{score}</span></span>
          <button className="ml-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" onClick={()=>{setDevicesState({ ground:{status:'idle',data:null}, balloon:{status:'idle',data:null}, satellite:{status:'idle',data:null} }); setScore(0); hasCompletedRef.current=false;}}>重玩</button>
        </div>
      </div>

      {allDone && (
        <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-2">
          数据采集完成{isAutoPlay ? '，正在进入阶段二...' : '，可手动进入下一阶段'}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <DeviceCard
          title="地面气象站（旋转指针到目标值）"
          status={devicesState.ground.status}
          data={devicesState.ground.data}
          onClick={() => !isPaused && startCollect('ground')}
          isPaused={isPaused}
        >
          <GaugeGame onSuccess={() => startCollect('ground')} disabled={devicesState.ground.status !== 'idle'} />
        </DeviceCard>

        <DeviceCard
          title="高空探测仪（选择合适高度）"
          status={devicesState.balloon.status}
          data={devicesState.balloon.data}
          onClick={() => !isPaused && startCollect('balloon')}
          isPaused={isPaused}
        >
          <AltitudeGame onSuccess={() => startCollect('balloon')} disabled={devicesState.balloon.status !== 'idle'} />
        </DeviceCard>

        <DeviceCard
          title="卫星遥感（对准云团采集）"
          status={devicesState.satellite.status}
          data={devicesState.satellite.data}
          onClick={() => !isPaused && startCollect('satellite')}
          isPaused={isPaused}
        >
          <DroneCloudGame onSuccess={() => startCollect('satellite')} disabled={devicesState.satellite.status !== 'idle'} />
        </DeviceCard>
      </div>

      {!isAutoPlay && allDone && (
        <div className="mt-4">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary"
            onClick={() => onComplete?.()}
          >
            进入阶段二
          </button>
        </div>
      )}
    </section>
  )
}

// 小游戏 1：地面气象站仪表——拖动旋钮，使指针接近目标值完成
function GaugeGame({ onSuccess, disabled }) {
  const [angle, setAngle] = useState(0)
  const [target] = useState(() => Math.round(Math.random()*120 - 60))
  const diff = Math.abs(angle - target)
  const done = diff < 6
  useEffect(() => { if (done && !disabled) onSuccess?.() }, [done, disabled, onSuccess])
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28 rounded-full border border-slate-600">
        <div className="absolute inset-2 rounded-full bg-slate-900/60" />
        <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%,-50%) rotate(${angle}deg)` }}>
          <div className="w-12 h-0.5 bg-sky-400" />
        </div>
        <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%,-50%) rotate(${target}deg)` }}>
          <div className="w-12 h-0.5 bg-emerald-400/60" />
        </div>
      </div>
      <input
        type="range" min={-60} max={120} value={angle}
        onChange={(e) => setAngle(Number(e.target.value))}
        disabled={disabled}
        className="mt-2 w-44 accent-sky-400"
      />
      <div className="mt-1 text-xs text-slate-400">目标角度 {target}°，调整到绿色指针附近即可</div>
    </div>
  )
}

// 小游戏 2：高空探测仪——选择合适高度区间完成
function AltitudeGame({ onSuccess, disabled }) {
  const [h, setH] = useState(0)
  const [range] = useState(() => { const s = 20 + Math.round(Math.random()*40); return { min: s, max: s+20 } })
  const inRange = h >= range.min && h <= range.max
  useEffect(() => { if (inRange && !disabled) onSuccess?.() }, [inRange, disabled, onSuccess])
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-10 border border-slate-600 rounded bg-slate-900/60 overflow-hidden">
        {/* 目标绿色区：使用 top/bottom 锚定，确保不同区间可见 */}
        <div
          className="absolute left-0 right-0"
          style={{ top: `${range.min}%`, bottom: `${100 - range.max}%` }}
        >
          <div className={`w-full h-full ${inRange ? 'bg-emerald-400/40' : 'bg-emerald-400/25'}`} />
        </div>
        <div className="absolute left-1/2" style={{ bottom: `${h}%`, transform: 'translateX(-50%)' }}>
          <div className={`w-6 h-3 ${inRange ? 'bg-emerald-400/80' : 'bg-sky-400/70'} rounded transition-colors`} />
        </div>
      </div>
      <input type="range" min={0} max={100} value={h} onChange={(e) => setH(Number(e.target.value))} disabled={disabled} className="mt-2 w-44 accent-sky-400" />
      <div className="mt-1 text-xs text-slate-400">移动到绿色区域完成采集（目标 {range.min}–{range.max}%）</div>
    </div>
  )
}

// 小游戏 3：卫星遥感——用鼠标移动无人机对准随机云团
function DroneCloudGame({ onSuccess, disabled }) {
  const [drone, setDrone] = useState({ x: 20, y: 20 })
  const [cloud, setCloud] = useState({ x: 60 + Math.random() * 20, y: 20 + Math.random() * 40 })
  const dist = Math.hypot(drone.x - cloud.x, drone.y - cloud.y)
  const done = dist < 8
  useEffect(() => { if (done && !disabled) onSuccess?.() }, [done, disabled, onSuccess])
  // 轻微云团漂移动画
  useEffect(() => {
    const id = setInterval(() => {
      setCloud((c) => ({ x: 50 + ((c.x + 2) % 40), y: c.y }))
    }, 120)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="relative w-60 h-32 border border-slate-600 rounded bg-slate-900/60"
      onMouseMove={(e) => {
        if (disabled) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setDrone({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
      }}
      onTouchMove={(e) => {
        if (disabled) return
        const t = e.touches[0]
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((t.clientX - rect.left) / rect.width) * 100
        const y = ((t.clientY - rect.top) / rect.height) * 100
        setDrone({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
      }}
    >
      {/* 云团：带呼吸动画与阴影 */}
      <div className="absolute" style={{ left: `${cloud.x}%`, top: `${cloud.y}%`, transform: 'translate(-50%,-50%)' }}>
        <div className={`w-10 h-6 ${done ? 'bg-emerald-300/80' : 'bg-slate-200/70'} rounded-full shadow-[0_0_10px_rgba(56,189,248,0.35)] animate-pulse`} />
      </div>
      {/* 无人机 */}
      <div className="absolute" style={{ left: `${drone.x}%`, top: `${drone.y}%`, transform: 'translate(-50%,-50%)' }}>
        <div className={`w-6 h-6 rounded-full border-2 ${done ? 'border-emerald-400' : 'border-sky-400'} border-t-transparent animate-spin-slow`} />
      </div>
      {!disabled && (<div className="absolute right-1 bottom-1 text-[10px] text-slate-400">对准云团完成采集</div>)}
    </div>
  )
}

function DeviceCard({ title, status, data, onClick, children, isPaused }) {
  const isCollecting = status === 'collecting'
  const isDone = status === 'done'
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isCollecting || isDone}
      className={
        'relative w-full text-left rounded-xl border p-4 overflow-hidden focus:outline-none ' +
        (isDone
          ? 'border-emerald-500/40 bg-slate-800/40 shadow-[0_0_24px_rgba(16,185,129,0.15)]'
          : isCollecting
          ? 'border-primary/50 bg-slate-800/40 shadow-glow'
          : 'border-slate-700/60 bg-slate-800/40 hover:border-primary/40 hover:shadow-glow')
      }
      whileTap={{ scale: 0.98 }}
      animate={isCollecting && !isPaused ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 1.2, repeat: isCollecting && !isPaused ? Infinity : 0, ease: 'easeInOut' }}
    >
      <div className="flex items-center justify-between">
        <div className="text-primary font-semibold">{title}</div>
        <StatusPill status={status} />
      </div>

      <div className="mt-3 flex items-center justify-center min-h-[120px]">{children}</div>

      {/* 采集中动效覆盖层 */}
      {isCollecting && (
        <CollectingOverlay paused={isPaused} />
      )}

      {/* 数据展示 */}
      {isDone && data && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <Metric label="温度" value={`${data.temperatureC}°C`} />
          <Metric label="湿度" value={`${data.humidityPct}%`} />
          <Metric label="气压" value={`${data.pressureHpa} hPa`} />
          <Metric label="风速" value={`${data.windSpeed} m/s`} />
          <Metric label="风向" value={data.windDir} />
          <Metric label="云量" value={`${data.cloudPct}%`} />
        </div>
      )}
    </motion.button>
  )
}

function StatusPill({ status }) {
  const map = {
    idle: { text: '待采集', cls: 'bg-slate-700/60 text-slate-200' },
    collecting: { text: '正在采集…', cls: 'bg-primary/20 text-primary border border-primary/40' },
    done: { text: '完成', cls: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' },
  }
  const m = map[status]
  return <span className={`text-[11px] px-2 py-0.5 rounded ${m.cls}`}>{m.text}</span>
}

function Metric({ label, value }) {
  return (
    <div className="rounded bg-slate-900/50 border border-slate-700/60 px-2 py-1">
      <span className="text-slate-400 mr-1">{label}</span>
      <span className="text-slate-100">{value}</span>
    </div>
  )
}

function CollectingOverlay({ paused }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-sky-400/5" />
      <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-4 text-[11px] text-slate-300">
        <Thermometer paused={paused} />
        <WindSpinner paused={paused} />
        <CloudScanner paused={paused} />
      </div>
    </div>
  )
}

function Thermometer({ paused }) {
  const controls = useAnimationControls()
  useEffect(() => {
    if (paused) {
      controls.stop()
    } else {
      controls.start({ height: ['10%', '80%', '60%'], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } })
    }
  }, [paused, controls])
  return (
    <div className="flex items-end gap-1">
      <div className="w-2 h-8 rounded bg-slate-700/70 overflow-hidden">
        <motion.div className="w-full bg-rose-500/70" initial={{ height: '10%' }} animate={controls} />
      </div>
      <span>温度上升</span>
    </div>
  )
}

function WindSpinner({ paused }) {
  const controls = useAnimationControls()
  useEffect(() => {
    if (paused) controls.stop()
    else controls.start({ rotate: 360, transition: { repeat: Infinity, ease: 'linear', duration: 2.2 } })
  }, [paused, controls])
  return (
    <div className="flex items-center gap-1">
      <motion.div className="w-6 h-6 rounded-full border-2 border-sky-400/70 border-t-transparent" animate={controls} />
      <span>风速旋转</span>
    </div>
  )
}

function CloudScanner({ paused }) {
  const controls = useAnimationControls()
  useEffect(() => {
    if (paused) controls.stop()
    else controls.start({ x: ['0%', '100%'], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } })
  }, [paused, controls])
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-20 h-6 rounded bg-slate-700/60 overflow-hidden">
        <motion.div className="absolute top-0 left-0 h-full w-8 bg-sky-300/40" animate={controls} />
      </div>
      <span>云图扫描</span>
    </div>
  )
}

// 设备 SVG —— 循环动效根据 paused 控制
function GroundStationSVG({ paused, active }) {
  const antennaCtrl = useAnimationControls()
  const needleCtrl = useAnimationControls()
  useEffect(() => {
    if (paused) {
      antennaCtrl.stop(); needleCtrl.stop()
    } else {
      antennaCtrl.start({ rotate: [-4, 4, -2, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } })
      needleCtrl.start({ rotate: [-20, 10, -10, 15, -5], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } })
    }
  }, [paused, antennaCtrl, needleCtrl])
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <rect x="22" y="60" width="96" height="44" rx="6" fill="rgba(15,23,42,0.8)" stroke="rgba(100,116,139,0.5)" />
        <circle cx="46" cy="82" r="14" fill="rgba(2,132,199,0.15)" stroke="rgba(56,189,248,0.7)" />
        <motion.line x1="46" y1="82" x2="60" y2="78" stroke="rgba(56,189,248,0.9)" strokeWidth="2" style={{ originX: 0.33, originY: 0.66 }} animate={needleCtrl} />
        <rect x="78" y="74" width="28" height="16" rx="3" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.5)" />
        <motion.rect x="68" y="20" width="4" height="40" rx="2" fill="rgba(56,189,248,0.8)" animate={antennaCtrl} style={{ originY: 1 }} />
        <circle cx="70" cy="18" r="4" fill="rgba(56,189,248,1)" />
      </g>
      {active && (
        <g>
          <circle cx="70" cy="18" r="10" stroke="rgba(56,189,248,0.5)" />
          <circle cx="70" cy="18" r="16" stroke="rgba(56,189,248,0.3)" />
        </g>
      )}
    </svg>
  )
}

function BalloonProbeSVG({ paused, active }) {
  const bounceCtrl = useAnimationControls()
  const swayCtrl = useAnimationControls()
  useEffect(() => {
    if (paused) {
      bounceCtrl.stop(); swayCtrl.stop()
    } else {
      bounceCtrl.start({ y: [0, -6, 0, -3, 0], transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } })
      swayCtrl.start({ rotate: [-4, 4, -2, 2, 0], transition: { duration: 4.4, repeat: Infinity, ease: 'easeInOut' } })
    }
  }, [paused, bounceCtrl, swayCtrl])
  return (
    <motion.svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" animate={bounceCtrl}>
      <g>
        <circle cx="70" cy="40" r="20" fill="rgba(14,165,233,0.2)" stroke="rgba(56,189,248,0.8)" />
        <line x1="70" y1="60" x2="70" y2="76" stroke="rgba(56,189,248,0.6)" />
        <motion.rect x="60" y="76" width="20" height="16" rx="3" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.6)" animate={swayCtrl} style={{ originX: 0.5, originY: 0 }} />
      </g>
      {active && (
        <g>
          <circle cx="70" cy="40" r="26" stroke="rgba(56,189,248,0.35)" />
          <circle cx="70" cy="40" r="32" stroke="rgba(56,189,248,0.2)" />
        </g>
      )}
    </motion.svg>
  )
}

function SatelliteSVG({ paused, active }) {
  const rotateCtrl = useAnimationControls()
  const bladeCtrl = useAnimationControls()
  useEffect(() => {
    if (paused) {
      rotateCtrl.stop(); bladeCtrl.stop()
    } else {
      rotateCtrl.start({ rotate: 360, transition: { repeat: Infinity, ease: 'linear', duration: 20 } })
      bladeCtrl.start({ rotate: 360, transition: { repeat: Infinity, ease: 'linear', duration: 1.4 } })
    }
  }, [paused, rotateCtrl, bladeCtrl])

  return (
    <motion.svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" animate={rotateCtrl}>
      <g>
        <rect x="60" y="54" width="20" height="12" rx="2" fill="rgba(2,132,199,0.3)" stroke="rgba(56,189,248,0.8)" />
        <rect x="38" y="56" width="18" height="8" rx="2" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.6)" />
        <rect x="84" y="56" width="18" height="8" rx="2" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.6)" />
        <motion.g style={{ originX: 70, originY: 60 }} animate={bladeCtrl}>
          <line x1="70" y1="60" x2="70" y2="48" stroke="rgba(56,189,248,0.7)" strokeWidth="2" />
          <line x1="70" y1="60" x2="82" y2="60" stroke="rgba(56,189,248,0.7)" strokeWidth="2" />
          <line x1="70" y1="60" x2="70" y2="72" stroke="rgba(56,189,248,0.7)" strokeWidth="2" />
          <line x1="70" y1="60" x2="58" y2="60" stroke="rgba(56,189,248,0.7)" strokeWidth="2" />
        </motion.g>
      </g>
      {active && (
        <g>
          <circle cx="70" cy="60" r="20" stroke="rgba(56,189,248,0.25)" />
          <circle cx="70" cy="60" r="28" stroke="rgba(56,189,248,0.15)" />
        </g>
      )}
    </motion.svg>
  )
}



