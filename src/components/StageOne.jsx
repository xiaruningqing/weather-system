import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGlobal } from '../store/global.jsx'

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomPick(list) { return list[Math.floor(Math.random() * list.length)] }
function useAllDone(devicesState) { return useMemo(() => Object.values(devicesState).every((d) => d.status === 'done'), [devicesState]) }

const SENSOR_META = {
  satellite: { title: '卫星', color: '#60a5fa' },
  ground: { title: '地面站', color: '#34d399' },
  radar: { title: '雷达', color: '#f59e0b' },
  buoy: { title: '浮标', color: '#a78bfa' },
}

export default function StageOne({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const { setStageOneScore } = useGlobal()
  const [devicesState, setDevicesState] = useState({
    satellite: { status: 'idle', data: null },
    ground: { status: 'idle', data: null },
    radar: { status: 'idle', data: null },
    buoy: { status: 'idle', data: null },
  })
  const [score, setScore] = useState(0)
  const [selectedKey, setSelectedKey] = useState(null)
  const [dropHint, setDropHint] = useState(false)
  const hasCompletedRef = useRef(false)
  const allDone = useAllDone(devicesState)

  useEffect(() => {
    if (allDone && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      if (isAutoPlay) {
        const timer = setTimeout(() => { onComplete?.() }, Math.max(600, 1200 / Math.max(0.25, speedFactor)))
        return () => clearTimeout(timer)
      }
    }
  }, [allDone, onComplete, isAutoPlay, speedFactor])

  useEffect(() => { setStageOneScore(score) }, [score, setStageOneScore])

  const startCollect = (key) => {
    setDevicesState((prev) => {
      if (prev[key].status !== 'idle') return prev
      return { ...prev, [key]: { ...prev[key], status: 'collecting' } }
    })
    const duration = 1000 + randomInt(400, 1200)
    setTimeout(() => {
      const data = genDataByDevice(key)
      setDevicesState((prev) => ({ ...prev, [key]: { status: 'done', data } }))
      setScore((s) => s + 10)
    }, duration)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const key = e.dataTransfer.getData('text/plain')
    if (!key) return
    if (isPaused) return
    startCollect(key)
    setDropHint(false)
  }

  const progress = Object.values(devicesState).filter((d) => d.status === 'done').length

  return (
    <section className="min-h-[460px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">阶段一 · 多源感知</h2>
          <p className="mt-1 text-slate-300">右侧拖拽传感器到左侧地球以采集数据，点击已完成的传感器查看数据</p>
        </div>
        <div className="text-sm text-slate-300 flex items-center gap-3">
          <span>进度</span>
          <div className="w-40 h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${(progress/4)*100}%` }} /></div>
          <span className="text-sky-300">{progress}/4</span>
          <span className="ml-4">得分 <span className="text-amber-300 font-semibold">{score}</span></span>
          <button className="ml-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" onClick={()=>{setDevicesState({ satellite:{status:'idle',data:null}, ground:{status:'idle',data:null}, radar:{status:'idle',data:null}, buoy:{status:'idle',data:null} }); setScore(0); hasCompletedRef.current=false;}}>重玩</button>
        </div>
      </div>

      {allDone && (
        <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-2">
          数据采集完成{isAutoPlay ? '，正在进入阶段二...' : '，可手动进入下一阶段'}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左：地球投影为拖放目标 */}
        <div className="md:col-span-2">
          <div
            className={`relative mx-auto w-[520px] max-w-full aspect-square rounded-full shadow-[0_0_120px_rgba(56,189,248,0.18)]`}
            onDragOver={(e)=>{ e.preventDefault(); setDropHint(true) }}
            onDragLeave={()=> setDropHint(false)}
            onDrop={handleDrop}
          >
            {/* 行星背景 */}
            <PlanetVisual hint={dropHint} />
            {/* 已收集标记 */}
            <CollectedBadges devicesState={devicesState} />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-3 text-xs text-slate-300">将传感器拖到地球开始采集</div>
          </div>
        </div>

        {/* 右：传感器面板 */}
        <div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <div className="text-center text-lg text-primary mb-3">多源感知</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(SENSOR_META).map((key) => (
                <SensorTile
                  key={key}
                  sensorKey={key}
                  state={devicesState[key]}
                  onDragStart={(k)=>{}}
                  onClick={()=>{ if (devicesState[key].status==='done') setSelectedKey(key) }}
                />
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="px-3 py-2 rounded border border-slate-700/60 bg-slate-900/40">温度: {summaryValue(devicesState, 'temperatureC', '—')}°C</div>
              <div className="px-3 py-2 rounded border border-slate-700/60 bg-slate-900/40">湿度: {summaryValue(devicesState, 'humidityPct', '—')}%</div>
              <div className="px-3 py-2 rounded border border-slate-700/60 bg-slate-900/40">气压: {summaryValue(devicesState, 'pressureHpa', '—')}hPa</div>
            </div>
          </div>
        </div>
      </div>

      {/* 数据弹窗 */}
      {selectedKey && devicesState[selectedKey]?.data && (
        <DataModal
          title={`$${SENSOR_META[selectedKey].title}数据`.replace('$','')}
          onClose={()=> setSelectedKey(null)}
          data={devicesState[selectedKey].data}
        />
      )}

    </section>
  )
}

function summaryValue(devicesState, key, fallback) {
  const first = Object.values(devicesState).find(d=>d.data && key in d.data)
  return first ? first.data[key] : fallback
}

function genDataByDevice(key) {
  switch (key) {
    case 'satellite':
      return {
        cloudPct: randomInt(20, 90),
        sstC: Number((randomInt(180, 310)/10).toFixed(1)),
        humidityPct: randomInt(40, 90),
        windSpeed: randomInt(2, 18),
        pressureHpa: randomInt(990, 1030),
      }
    case 'ground':
      return {
        temperatureC: randomInt(12, 34),
        humidityPct: randomInt(20, 85),
        pressureHpa: randomInt(985, 1032),
        windDir: randomPick(WIND_DIRECTIONS),
      }
    case 'radar':
      return {
        reflectivityDbz: randomInt(5, 55),
        rainRate: Number((Math.random()*20).toFixed(1)),
        windSpeed: randomInt(0, 25),
      }
    case 'buoy':
      return {
        sstC: Number((randomInt(160, 300)/10).toFixed(1)),
        waveHeightM: Number((Math.random()*3+0.3).toFixed(1)),
        pressureHpa: randomInt(990, 1026),
      }
    default:
      return {}
  }
}

function PlanetVisual({ hint }) {
  return (
    <div className="absolute inset-0 rounded-full">
      <div className="absolute inset-0 rounded-full" style={{
        background: 'radial-gradient(55% 55% at 50% 45%, rgba(56,189,248,0.85) 0%, rgba(59,130,246,0.6) 40%, rgba(15,23,42,1) 100%)'
      }} />
      {/* 高光 */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full" style={{ background:'radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)'}} />
      {hint && <div className="absolute inset-0 rounded-full ring-4 ring-primary/40 animate-pulse" />}
    </div>
  )
}

function CollectedBadges({ devicesState }) {
  const placed = Object.entries(devicesState).filter(([_,v])=> v.status==='done')
  const angleStep = Math.max(40, 360 / Math.max(1, placed.length))
  return (
    <>
      {placed.map(([key], idx)=>{
        const angle = idx * angleStep
        const r = 42
        const x = 50 + r * Math.cos((angle*Math.PI)/180)
        const y = 50 + r * Math.sin((angle*Math.PI)/180)
        return (
          <div key={key} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform:'translate(-50%,-50%)' }}>
            <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{
              background:'rgba(15,23,42,0.6)', borderColor:'rgba(99,102,241,0.5)', color:'#c7d2fe'
            }}>{SENSOR_META[key].title} ✓</span>
          </div>
        )
      })}
    </>
  )
}

function SensorTile({ sensorKey, state, onClick }) {
  const meta = SENSOR_META[sensorKey]
  const draggable = state.status==='idle'
  return (
    <div
      className={`group rounded-lg border p-3 select-none cursor-${draggable?'grab':'pointer'} transition ${state.status==='done' ? 'border-emerald-500/40 bg-emerald-500/10' : state.status==='collecting' ? 'border-primary/40 bg-primary/10' : 'border-slate-700/60 bg-slate-900/40 hover:border-primary/40'}`}
      draggable={draggable}
      onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', sensorKey) }}
      onClick={onClick}
      title={draggable? '拖到左侧地球采集' : (state.status==='done' ? '点击查看数据' : '采集中...')}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold" style={{ color: meta.color }}>{meta.title}</div>
        <StatusPill status={state.status} />
      </div>
      <div className="mt-2 text-[12px] text-slate-300 min-h-[22px]">
        {state.status==='done' ? '已完成，点击查看数据' : state.status==='collecting' ? '正在采集…' : '拖拽到地球开始采集'}
      </div>
    </div>
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

function DataModal({ title, data, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[92%] max-w-md rounded-xl border border-sky-400/30 bg-slate-900/90 p-6 shadow-[0_0_40px_rgba(56,189,248,0.35)]">
        <div className="text-center text-xl text-sky-300 mb-4">{title}</div>
        <div className="space-y-2 text-slate-200 text-sm">
          {Object.entries(data).map(([k,v])=> (
            <div key={k} className="rounded border border-slate-700/60 bg-slate-800/40 px-3 py-2 flex items-center justify-between">
              <span className="text-slate-300">{labelOf(k)}</span>
              <span className="text-slate-100">{formatValue(k,v)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 text-center">
          <button className="px-4 py-2 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

function labelOf(k){
  const map = { temperatureC:'气温', humidityPct:'大气湿度', pressureHpa:'气压', windSpeed:'风速', windDir:'风向', cloudPct:'云层覆盖', sstC:'海表温度', reflectivityDbz:'回波强度', rainRate:'降雨强度', waveHeightM:'浪高' }
  return map[k] || k
}

function formatValue(k,v){
  const unit = { temperatureC:'°C', humidityPct:'%', pressureHpa:'hPa', windSpeed:'m/s', cloudPct:'%', sstC:'°C', reflectivityDbz:'dBZ', rainRate:'mm/h', waveHeightM:'m' }
  return `${v}${unit[k] || ''}`
}
