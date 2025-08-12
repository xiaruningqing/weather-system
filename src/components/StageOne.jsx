import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useGlobal } from '../store/global.jsx'
import { Info } from 'lucide-react'

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomPick(list) { return list[Math.floor(Math.random() * list.length)] }

function useAllDone(devicesState) {
  return useMemo(() => Object.values(devicesState).every((d) => d.status === 'done'), [devicesState])
}

export default function StageOne({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const { setStageOneScore } = useGlobal()
  const [devicesState, setDevicesState] = useState({
    satellite: { status: 'idle', data: null },
    ground: { status: 'idle', data: null },
    radar: { status: 'idle', data: null },
    buoy: { status: 'idle', data: null },
  })
  const [openKey, setOpenKey] = useState(null)
  const [score, setScore] = useState(0)
  const [markers, setMarkers] = useState([]) // {x,y,key,id,done}
  const hasCompletedRef = useRef(false)
  const allDone = useAllDone(devicesState)

  useEffect(() => { setStageOneScore(score) }, [score, setStageOneScore])

  useEffect(() => {
    if (allDone && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      if (isAutoPlay) {
        const t = setTimeout(() => onComplete?.(), Math.max(500, 1200 / Math.max(0.25, speedFactor)))
        return () => clearTimeout(t)
      }
    }
  }, [allDone, isAutoPlay, onComplete, speedFactor])

  const startCollectAt = (key, xPct, yPct) => {
    setDevicesState((prev) => {
      if (prev[key]?.status !== 'idle') return prev
      return { ...prev, [key]: { ...prev[key], status: 'collecting' } }
    })
    const id = `${key}-${Date.now()}`
    setMarkers((arr) => [...arr, { x: xPct, y: yPct, key, id, done: false }])

    const duration = 1200 + randomInt(0, 800)
    setTimeout(() => {
      const generated = {
        temperatureC: randomInt(10, 34),
        humidityPct: randomInt(20, 95),
        pressureHpa: randomInt(985, 1035),
        windSpeed: randomInt(0, 18),
        windDir: randomPick(WIND_DIRECTIONS),
        cloudPct: randomInt(0, 100),
        rainMm: randomInt(0, 8) / 10,
      }
      setDevicesState((prev) => ({ ...prev, [key]: { status: 'done', data: generated } }))
      setMarkers((arr) => arr.map((m) => (m.id === id ? { ...m, done: true } : m)))
      setScore((s) => s + 10)
    }, duration)
  }

  const progress = useMemo(() => Object.values(devicesState).filter((d) => d.status === 'done').length, [devicesState])

  return (
    <section className="min-h-[520px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">阶段一 · 多源感知</h2>
          <p className="mt-1 text-slate-300">将右侧传感器拖到左侧地球，完成采集；再次点击卡片可查看采集数据</p>
        </div>
        <div className="text-sm text-slate-300 flex items-center gap-3">
          <span>进度</span>
          <div className="w-40 h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${(progress/4)*100}%` }} /></div>
          <span className="text-sky-300">{progress}/4</span>
          <span className="ml-4">得分 <span className="text-amber-300 font-semibold">{score}</span></span>
          <button
            className="ml-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
            onClick={() => { setDevicesState({ satellite:{status:'idle',data:null}, ground:{status:'idle',data:null}, radar:{status:'idle',data:null}, buoy:{status:'idle',data:null} }); setMarkers([]); setScore(0); setOpenKey(null); hasCompletedRef.current = false; }}
          >重置</button>
        </div>
      </div>

      {allDone && (
        <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-2">
          数据采集完成{isAutoPlay ? '，正在进入阶段二…' : '，可手动进入下一阶段'}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* 左：three.js 地球投放区 */}
        <div className="lg:col-span-3">
          <StageOneGlobe markers={markers} onDropDevice={(key, world) => {
            const x = 50 + (world.x || 0) * 30
            const y = 50 - (world.y || 0) * 30
            startCollectAt(key, x, y)
          }} />
        </div>

        {/* 右：传感器面板（两列 + 自定义图标 + 查看数据） */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <div className="text-sky-300 font-semibold mb-3">多源感知</div>
            <div className="grid grid-cols-2 gap-3">
              <SensorCard icon={SensorIcon} iconType="satellite" title="卫星" k="satellite" state={devicesState.satellite} openKey={openKey} setOpenKey={setOpenKey} />
              <SensorCard icon={SensorIcon} iconType="ground" title="地面站" k="ground" state={devicesState.ground} openKey={openKey} setOpenKey={setOpenKey} />
              <SensorCard icon={SensorIcon} iconType="radar" title="雷达" k="radar" state={devicesState.radar} openKey={openKey} setOpenKey={setOpenKey} />
              <SensorCard icon={SensorIcon} iconType="buoy" title="浮标" k="buoy" state={devicesState.buoy} openKey={openKey} setOpenKey={setOpenKey} />
            </div>
            <div className="mt-4 space-y-2">
              <DataBlock title="温度" value={mergeMetric(devicesState, 'temperatureC', (v)=>`${v}°C`)} />
              <DataBlock title="湿度" value={mergeMetric(devicesState, 'humidityPct', (v)=>`${v}%`)} />
              <DataBlock title="气压" value={mergeMetric(devicesState, 'pressureHpa', (v)=>`${v} hPa`)} />
              <DataBlock title="能见度" value={mergeMetric(devicesState, 'visibilityKm', (v)=>`${v||3.2}km`, true)} />
              <DataBlock title="降水" value={mergeMetric(devicesState, 'rainMm', (v)=>`${v||0}mm`, true)} />
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 pt-2">
              <Info size={14} />
              <span>拖拽到左侧地球任意位置开始采集；绿色“完成”为已采集</span>
            </div>
            {!isAutoPlay && allDone && (
              <button type="button" className="mt-3 w-full px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary" onClick={() => onComplete?.()}>进入阶段二</button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function GlobeDropArea({ markers, onDropDevice, isPaused }) {
  const ref = useRef(null)
  return (
    <div
      ref={ref}
      className="relative h-[420px] md:h-[500px] rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden"
      onDragOver={(e) => { e.preventDefault() }}
      onDrop={(e) => {
        e.preventDefault()
        const key = e.dataTransfer.getData('text/plain')
        if (!key) return
        const rect = ref.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        onDropDevice?.(key, x, y)
      }}
    >
      {/* 背景星空 */}
      <Stars />
      {/* 地球本体（SVG 画圆 + 渐变，高光与暗侧） */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[90%] max-w-[560px] aspect-square">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-900/70 via-slate-900 to-slate-900 border border-slate-700/60 shadow-[inset_-60px_-40px_120px_rgba(0,0,0,0.6),_0_0_50px_rgba(14,165,233,0.12)]" />
          {/* 经线网格 */}
          <div className="absolute inset-3 rounded-full border border-slate-600/30" />
          <div className="absolute inset-10 rounded-full border border-slate-600/20" />
          <div className="absolute inset-16 rounded-full border border-slate-600/10" />
          {/* 高光 */}
          <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-sky-300/10 blur-3xl" />
        </div>
      </div>

      {/* 投放提示 */}
      <div className="absolute left-4 top-4 text-xs text-slate-300 bg-slate-800/60 rounded px-2 py-1 border border-slate-700/60">将右侧传感器拖到地球</div>

      {/* 标记与涟漪 */}
      {markers.map((m) => (
        <DropMarker key={m.id} x={m.x} y={m.y} done={m.done} />
      ))}
    </div>
  )
}

function Stars() {
  const dots = useMemo(() => new Array(80).fill(0).map(() => ({ x: Math.random()*100, y: Math.random()*100, a: 0.4 + Math.random()*0.6 })), [])
  return (
    <div className="absolute inset-0">
      {dots.map((d, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{ left: `${d.x}%`, top: `${d.y}%`, width: 2, height: 2, opacity: d.a }} />
      ))}
    </div>
  )
}

function DropMarker({ x, y, done }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}>
      <div className={`w-3 h-3 rounded-full ${done ? 'bg-emerald-400' : 'bg-sky-400'} shadow-[0_0_12px_rgba(56,189,248,0.5)]`} />
      <span className={`absolute inset-0 rounded-full border ${done ? 'border-emerald-300/50' : 'border-sky-300/40'} animate-ping`} />
    </div>
  )
}

function SensorCard({ icon: Icon, iconType, title, k, state, openKey, setOpenKey }) {
  const isDone = state.status === 'done'
  const isCollecting = state.status === 'collecting'
  const opened = openKey === k
  return (
    <div
      className={`rounded-xl border p-4 bg-slate-800/40 ${isDone ? 'border-emerald-500/40' : isCollecting ? 'border-primary/50 shadow-glow' : 'border-slate-700/60 hover:border-primary/40'}`}
      draggable={state.status === 'idle'}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', k) }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sky-300">
          <motion.span animate={{ rotate: isCollecting ? (iconType==='radar'?360:0) : 0 }} transition={{ repeat: isCollecting && iconType==='radar' ? Infinity : 0, ease: 'linear', duration: 1.8 }}>
            <Icon type={iconType} />
          </motion.span>
          <span className="font-semibold">{title}</span>
        </div>
        <StatusPill status={state.status} />
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {state.status === 'idle' && '拖到地球开始采集'}
        {state.status === 'collecting' && '采集中…'}
        {isDone && (
          <button className="text-primary ml-1 underline underline-offset-2" onClick={() => setOpenKey(opened ? null : k)}>查看数据</button>
        )}
      </div>
      {opened && isDone && state.data && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <Metric label="温度" value={`${state.data.temperatureC}°C`} />
          <Metric label="湿度" value={`${state.data.humidityPct}%`} />
          <Metric label="气压" value={`${state.data.pressureHpa} hPa`} />
          <Metric label="风速" value={`${state.data.windSpeed} m/s`} />
          <Metric label="风向" value={state.data.windDir} />
          <Metric label="云量" value={`${state.data.cloudPct}%`} />
          <Metric label="降水" value={`${state.data.rainMm} mm`} />
        </div>
      )}
    </div>
  )
}

// ===== 3D 地球（按截图风格，蓝色科幻质感 + 夜昼分界 + 大气辉光） =====
function StageOneGlobe({ markers, onDropDevice }) {
  return (
    <div className="relative h-[420px] md:h-[520px] rounded-xl overflow-hidden border border-slate-700/60 bg-black">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 2.2], fov: 45 }} onCreated={({ gl }) => { gl.setClearColor('#020617') }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <Atmosphere />
        <EarthCore />
        <Markers3D markers={markers} />
        <Controls3D onDropDevice={onDropDevice} />
      </Canvas>
      <div className="absolute left-3 top-3 text-xs text-slate-300 bg-slate-800/60 rounded px-2 py-1 border border-slate-700/60">将右侧传感器拖到地球</div>
      <LegendHint />
    </div>
  )
}

function EarthCore() {
  const textureUrl = import.meta.env.VITE_EARTH_TEX_MAP || 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/land_ocean_ice_cloud_2048.jpg'
  const tex = useMemo(() => new THREE.TextureLoader().load(textureUrl), [textureUrl])
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial map={tex} shininess={8} specular={new THREE.Color('#1e293b')} />
    </mesh>
  )
}

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[1.03, 64, 64]} />
      <meshBasicMaterial color={'#38bdf8'} transparent opacity={0.08} side={THREE.BackSide} />
    </mesh>
  )
}

function Markers3D({ markers }) {
  return (
    <group>
      {markers.map((m) => (
        <mesh key={m.id} position={[ (m.x-50)/30, -(m.y-50)/30, 1.01 ]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color={m.done ? '#34d399' : '#38bdf8'} />
        </mesh>
      ))}
    </group>
  )
}

function Controls3D({ onDropDevice }) {
  const { gl, camera, scene } = useThree()
  // 拖拽投放支持：监听原生 dragover/drop，将落点映射到球面
  useEffect(() => {
    const dom = gl.domElement
    const handleOver = (e) => { e.preventDefault() }
    const handleDrop = (e) => {
      e.preventDefault()
      const key = e.dataTransfer.getData('text/plain')
      if (!key) return
      const rect = dom.getBoundingClientRect()
      const xNorm = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const yNorm = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const ray = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2(xNorm, yNorm), camera)
      const globe = scene.children.find((c) => c.geometry && c.geometry.type === 'SphereGeometry')
      if (!globe) return
      const hit = ray.intersectObject(globe)
      if (hit && hit[0]) {
        // 告知世界坐标（单位球面）
        const p = hit[0].point.clone().normalize()
        onDropDevice?.(key, { x: p.x, y: p.y, z: p.z })
      }
    }
    dom.addEventListener('dragover', handleOver)
    dom.addEventListener('drop', handleDrop)
    return () => {
      dom.removeEventListener('dragover', handleOver)
      dom.removeEventListener('drop', handleDrop)
    }
  }, [gl, camera, scene, onDropDevice])
  return <OrbitControls enablePan={false} maxDistance={3} minDistance={1.6} />
}

function LegendHint() {
  return (
    <div className="absolute left-3 bottom-3 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded px-2 py-1">
      蓝色：采集中  绿色：完成
    </div>
  )
}

// 汇总显示用：如某字段不存在，用 format 默认值
function mergeMetric(state, key, format, allowEmpty = false) {
  const values = Object.values(state).map((s) => s.data?.[key]).filter((v) => v !== undefined && v !== null)
  if (!values.length) return allowEmpty ? format(undefined) : '—'
  const avg = Math.round(values.reduce((a, b) => a + Number(b), 0) / values.length)
  return format(avg)
}

function DataBlock({ title, value }) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-sm">
      <span className="text-slate-300">{title}</span>
      <span className="text-sky-300">{value}</span>
    </div>
  )
}

// 自定义图标，尽量贴近截图视觉（线性 + 简洁）
function SensorIcon({ type, size = 18 }) {
  const common = 'stroke-sky-300'
  const s = { width: size, height: size }
  if (type === 'satellite') {
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" className={common} strokeWidth="1.6">
        <rect x="10" y="10" width="4" height="4" rx="1" stroke="currentColor" />
        <path d="M6 6l4 4M14 14l4 4M14 10l4-4M6 18l4-4" stroke="currentColor" />
      </svg>
    )
  }
  if (type === 'ground') {
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" className={common} strokeWidth="1.6">
        <path d="M4 18h16M8 18V9l4-3 4 3v9" stroke="currentColor" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      </svg>
    )
  }
  if (type === 'radar') {
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" className={common} strokeWidth="1.6">
        <circle cx="12" cy="12" r="7" stroke="currentColor" />
        <path d="M12 12l6-2" stroke="currentColor" />
        <circle cx="12" cy="12" r="2" stroke="currentColor" />
      </svg>
    )
  }
  // buoy
  return (
    <svg viewBox="0 0 24 24" style={s} fill="none" className={common} strokeWidth="1.6">
      <path d="M4 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" stroke="currentColor" />
      <path d="M12 14v-6l-2-2" stroke="currentColor" />
      <circle cx="12" cy="5" r="1" stroke="currentColor" />
    </svg>
  )
}

function StatusPill({ status }) {
  const map = {
    idle: { text: '待采集', cls: 'bg-slate-700/60 text-slate-200' },
    collecting: { text: '采集中', cls: 'bg-primary/20 text-primary border border-primary/40' },
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
