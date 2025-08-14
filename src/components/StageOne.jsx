import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { FaSatellite, FaShip } from 'react-icons/fa'
import { MdHome, MdRadar } from 'react-icons/md'
import { useGlobal } from '../store/global.jsx'
import { Info } from 'lucide-react'
import UISensorCard from './ui/SensorCard.jsx'
import { PresetMarkers } from './PresetMarker.jsx'

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomPick(list) { return list[Math.floor(Math.random() * list.length)] }

function useAllDone(devicesState) {
  return useMemo(() => Object.values(devicesState).every((d) => d.status === 'done'), [devicesState])
}

// 预设传感器位置（地面站、雷达、浮标在地球表面，卫星在轨道）
const PRESET_POSITIONS = {
  satellite: { x: 80, y: 20, z: 1.5, name: '卫星轨道', description: '低地球轨道' }, // 卫星在轨道上
  ground: { x: 65, y: 45, z: 1.0, name: '地面站', description: '气象观测站' }, // 地面站在陆地
  radar: { x: 40, y: 35, z: 1.0, name: '雷达站', description: '多普勒雷达' }, // 雷达在内陆
  buoy: { x: 25, y: 70, z: 1.0, name: '海洋浮标', description: '深海观测点' }, // 浮标在海洋
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

  const [markers, setMarkers] = useState([]) // {x,y,key,id,done}
  const [dragOrigin, setDragOrigin] = useState(null) // {x,y} from sensor card
  const [hoverWorld, setHoverWorld] = useState(null) // {x,y,z}
  const [isDragging, setIsDragging] = useState(false)
  const [highlightKey, setHighlightKey] = useState(null)
  const hasCompletedRef = useRef(false)
  const allDone = useAllDone(devicesState)



  useEffect(() => {
    if (allDone && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      if (isAutoPlay) {
        const t = setTimeout(() => onComplete?.(), Math.max(500, 1200 / Math.max(0.25, speedFactor)))
        return () => clearTimeout(t)
      }
    }
  }, [allDone, isAutoPlay, onComplete, speedFactor])



  // 根据传感器类型生成对应的数据
  const generateSensorData = (sensorType) => {
    switch(sensorType) {
      case 'satellite':
        return {
          cloudCoverage: randomInt(0, 100),
          cloudTopTemp: randomInt(-80, 20),
          waterVapor: randomInt(0, 70),
          surfaceTemp: randomInt(-50, 60),
          solarRadiation: randomInt(0, 1400),
          atmosphericTopTemp: randomInt(-80, -20)
        }
      case 'ground':
        return {
          airTemperature: randomInt(-40, 50),
          relativeHumidity: randomInt(0, 100),
          atmosphericPressure: randomInt(800, 1100),
          windSpeed: randomInt(0, 30),
          windDirection: randomPick(WIND_DIRECTIONS),
          precipitation: randomInt(0, 200) / 10,
          visibility: randomInt(1, 500) / 10
        }
      case 'radar':
        return {
          precipitationIntensity: randomInt(0, 300) / 10,
          radarReflectivity: randomInt(0, 80),
          radialVelocity: randomInt(-50, 50),
          echoTopHeight: randomInt(0, 200) / 10,
          verticalLiquidWater: randomInt(0, 80),
          windFieldIntensity: randomInt(0, 50)
        }
      case 'buoy':
        return {
          seaSurfaceTemp: randomInt(-20, 350) / 10,
          waveHeight: randomInt(0, 150) / 10,
          wavePeriod: randomInt(20, 250) / 10,
          oceanCurrentSpeed: randomInt(0, 30) / 10,
          salinity: randomInt(300, 400) / 10,
          seaSurfaceWind: randomInt(0, 40)
        }
      default:
        return {
          temperatureC: randomInt(10, 34),
          humidityPct: randomInt(20, 95),
          pressureHpa: randomInt(985, 1035)
        }
    }
  }

  const startCollectAt = (key, xPct, yPct) => {
    setDevicesState((prev) => {
      if (prev[key]?.status !== 'idle') return prev
      return { ...prev, [key]: { ...prev[key], status: 'collecting' } }
    })
    const id = `${key}-${Date.now()}`
    
    // 使用预设位置或用户投放位置
    const position = PRESET_POSITIONS[key] ? 
      { x: PRESET_POSITIONS[key].x, y: PRESET_POSITIONS[key].y } : 
      { x: xPct, y: yPct }
    
    setMarkers((arr) => [...arr, { 
      x: position.x, 
      y: position.y, 
      key, 
      id, 
      done: false,
      isOrbital: key === 'satellite' // 标记卫星为轨道传感器
    }])

    const duration = 1200 + randomInt(0, 800)
    setTimeout(() => {
      const generated = generateSensorData(key)
      const dataQuality = randomInt(85, 98) // 随机生成85%到98%的数据质量
      setDevicesState((prev) => ({ ...prev, [key]: { status: 'done', data: generated, dataQuality } }))
      setMarkers((arr) => arr.map((m) => (m.id === id ? { ...m, done: true } : m)))
      
      // 自动显示采集完成的传感器数据
      setTimeout(() => {
        setOpenKey(key)
        setHighlightKey(key)
      }, 500) // 延迟500ms显示数据，让用户看到采集完成的动画
    }, duration)
  }

  const progress = useMemo(() => Object.values(devicesState).filter((d) => d.status === 'done').length, [devicesState])
  useEffect(() => {
    if (openKey && devicesState[openKey]?.status === 'done') setHighlightKey(openKey)
  }, [openKey, devicesState])

  // 监听地球上传感器点击事件
  useEffect(() => {
    const handleSensorClick = (event) => {
      const { sensorType } = event.detail
      if (devicesState[sensorType]?.status === 'done') {
        setOpenKey(openKey === sensorType ? null : sensorType)
      }
    }
    
    window.addEventListener('openSensorData', handleSensorClick)
    return () => window.removeEventListener('openSensorData', handleSensorClick)
  }, [openKey, devicesState])

  return (
    <section className="min-h-[520px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">阶段一 · 多源感知</h2>
          <p className="mt-1 text-slate-300">拖拽右侧传感器到左侧地球对应的虚线位置采集数据，点击已放置的传感器查看数据</p>
        </div>
        <div className="text-sm text-slate-300 flex items-center gap-3">
          <span>进度</span>
          <div className="w-40 h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${(progress/4)*100}%` }} /></div>
          <span className="text-sky-300">{progress}/4</span>

          <button
            className="ml-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
            onClick={() => { setDevicesState({ satellite:{status:'idle',data:null,dataQuality:null}, ground:{status:'idle',data:null,dataQuality:null}, radar:{status:'idle',data:null,dataQuality:null}, buoy:{status:'idle',data:null,dataQuality:null} }); setMarkers([]); setOpenKey(null); hasCompletedRef.current = false; }}
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
          <StageOneGlobe dragOrigin={dragOrigin} markers={markers} hoverWorld={isDragging ? hoverWorld : null} highlightKey={highlightKey} devicesState={devicesState} onDropDevice={(key, world) => {
            const x = 50 + (world.x || 0) * 30
            const y = 50 - (world.y || 0) * 30
            startCollectAt(key, x, y)
            setHoverWorld(null)
            setIsDragging(false)
          }} onHoverDevice={(world) => setHoverWorld(world)} />
        </div>

        {/* 右：传感器面板（两列 + 自定义图标 + 查看数据） */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sky-300 font-semibold">多源感知</span>
              <div className="text-xs text-slate-400">
                当前打开: {openKey || '无'} | 
                <button 
                  onClick={() => setOpenKey('satellite')} 
                  className="ml-1 text-blue-400 hover:text-blue-300"
                >
                  测试卫星
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div 
                draggable={devicesState.satellite.status==='idle'} 
                onDragStart={(e)=>{
                  if(devicesState.satellite.status !== 'idle') {
                    e.preventDefault();
                    return false;
                  }
                  const r=e.currentTarget.getBoundingClientRect(); 
                  setDragOrigin({x:r.left+r.width/2,y:r.top+r.height/2}); 
                  e.dataTransfer.setData('text/plain','satellite'); 
                  setIsDragging(true)
                }} 
                onDragEnd={()=>setIsDragging(false)}
              >
                <UISensorCard id="satellite" type="satellite" title="卫星" status={devicesState.satellite.status==='idle'?'idle':devicesState.satellite.status} desc={devicesState.satellite.status==='done'?'已完成，点击查看数据':devicesState.satellite.status==='collecting'?'采集中…':'拖到地球开始采集'} onClick={(id)=>{console.log('Clicked sensor:', id, 'current openKey:', openKey); setOpenKey(openKey===id?null:id)}} onStatusClick={(id)=>{console.log('Status clicked:', id); setOpenKey(openKey===id?null:id)}} />
              </div>
              <div draggable={devicesState.ground.status==='idle'} onDragStart={(e)=>{const r=e.currentTarget.getBoundingClientRect(); setDragOrigin({x:r.left+r.width/2,y:r.top+r.height/2}); e.dataTransfer.setData('text/plain','ground'); setIsDragging(true)}} onDragEnd={()=>setIsDragging(false)}>
                <UISensorCard id="ground" type="ground" title="地面站" status={devicesState.ground.status==='idle'?'idle':devicesState.ground.status} desc={devicesState.ground.status==='done'?'已完成，点击查看数据':devicesState.ground.status==='collecting'?'采集中…':'拖到地球开始采集'} onClick={(id)=>setOpenKey(openKey===id?null:id)} onStatusClick={(id)=>setOpenKey(openKey===id?null:id)} />
              </div>
              <div draggable={devicesState.radar.status==='idle'} onDragStart={(e)=>{const r=e.currentTarget.getBoundingClientRect(); setDragOrigin({x:r.left+r.width/2,y:r.top+r.height/2}); e.dataTransfer.setData('text/plain','radar'); setIsDragging(true)}} onDragEnd={()=>setIsDragging(false)}>
                <UISensorCard id="radar" type="radar" title="雷达" status={devicesState.radar.status==='idle'?'idle':devicesState.radar.status} desc={devicesState.radar.status==='done'?'已完成，点击查看数据':devicesState.radar.status==='collecting'?'采集中…':'拖到地球开始采集'} onClick={(id)=>setOpenKey(openKey===id?null:id)} onStatusClick={(id)=>setOpenKey(openKey===id?null:id)} />
              </div>
              <div draggable={devicesState.buoy.status==='idle'} onDragStart={(e)=>{const r=e.currentTarget.getBoundingClientRect(); setDragOrigin({x:r.left+r.width/2,y:r.top+r.height/2}); e.dataTransfer.setData('text/plain','buoy'); setIsDragging(true)}} onDragEnd={()=>setIsDragging(false)}>
                <UISensorCard id="buoy" type="buoy" title="浮标" status={devicesState.buoy.status==='idle'?'idle':devicesState.buoy.status} desc={devicesState.buoy.status==='done'?'已完成，点击查看数据':devicesState.buoy.status==='collecting'?'采集中…':'拖到地球开始采集'} onClick={(id)=>setOpenKey(openKey===id?null:id)} onStatusClick={(id)=>setOpenKey(openKey===id?null:id)} />
              </div>
            </div>
            {/* 传感器数据详情区域 */}
            <div className="mt-4">
              {openKey && devicesState[openKey]?.status === 'done' ? (
                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${openKey === 'satellite' ? 'bg-blue-500/20' : openKey === 'ground' ? 'bg-green-500/20' : openKey === 'radar' ? 'bg-orange-500/20' : 'bg-purple-500/20'}`}>
                        {(() => {
                          const icons = {
                            satellite: <FaSatellite className="text-blue-400" size={16} />,
                            ground: <MdHome className="text-green-400" size={16} />,
                            radar: <MdRadar className="text-orange-400" size={16} />,
                            buoy: <FaShip className="text-purple-400" size={16} />
                          }
                          return icons[openKey]
                        })()}
                      </div>
                      <span className="text-sky-300 font-semibold">
                        {openKey === 'satellite' ? '卫星' : openKey === 'ground' ? '地面站' : openKey === 'radar' ? '雷达' : '浮标'}数据详情
                      </span>
                    </div>
                    <button 
                      onClick={() => setOpenKey(null)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* 根据传感器类型显示不同数据 */}
                    {openKey === 'satellite' && devicesState[openKey]?.data && (
                      <>
                        <DetailDataItem label="云量" value={`${devicesState[openKey].data?.cloudCoverage || '--'}%`} icon="☁️" />
                        <DetailDataItem label="云顶温度" value={`${devicesState[openKey].data?.cloudTopTemp || '--'}°C`} icon="🌡️" />
                        <DetailDataItem label="水汽含量" value={`${devicesState[openKey].data?.waterVapor || '--'}mm`} icon="💧" />
                        <DetailDataItem label="地表温度" value={`${devicesState[openKey].data?.surfaceTemp || '--'}°C`} icon="🌍" />
                        <DetailDataItem label="太阳辐射" value={`${devicesState[openKey].data?.solarRadiation || '--'}W/m²`} icon="☀️" />
                        <DetailDataItem label="大气顶温度" value={`${devicesState[openKey].data?.atmosphericTopTemp || '--'}°C`} icon="🌌" />
                      </>
                    )}
                    {openKey === 'ground' && devicesState[openKey]?.data && (
                      <>
                        <DetailDataItem label="气温" value={`${devicesState[openKey].data?.airTemperature || '--'}°C`} icon="🌡️" />
                        <DetailDataItem label="相对湿度" value={`${devicesState[openKey].data?.relativeHumidity || '--'}%`} icon="💧" />
                        <DetailDataItem label="大气压力" value={`${devicesState[openKey].data?.atmosphericPressure || '--'}hPa`} icon="📊" />
                        <DetailDataItem label="风速" value={`${devicesState[openKey].data?.windSpeed || '--'}m/s`} icon="🌪️" />
                        <DetailDataItem label="风向" value={devicesState[openKey].data?.windDirection || '--'} icon="🧭" />
                        <DetailDataItem label="降水量" value={`${devicesState[openKey].data?.precipitation || '--'}mm/h`} icon="🌧️" />
                        <DetailDataItem label="能见度" value={`${devicesState[openKey].data?.visibility || '--'}km`} icon="👁️" />
                      </>
                    )}
                    {openKey === 'radar' && devicesState[openKey]?.data && (
                      <>
                        <DetailDataItem label="降水强度" value={`${devicesState[openKey].data?.precipitationIntensity || '--'}mm/h`} icon="🌧️" />
                        <DetailDataItem label="雷达反射率" value={`${devicesState[openKey].data?.radarReflectivity || '--'}dBZ`} icon="📡" />
                        <DetailDataItem label="径向速度" value={`${devicesState[openKey].data?.radialVelocity || '--'}m/s`} icon="🔄" />
                        <DetailDataItem label="回波顶高" value={`${devicesState[openKey].data?.echoTopHeight || '--'}km`} icon="📏" />
                        <DetailDataItem label="液态水含量" value={`${devicesState[openKey].data?.verticalLiquidWater || '--'}kg/m²`} icon="💧" />
                        <DetailDataItem label="风场强度" value={`${devicesState[openKey].data?.windFieldIntensity || '--'}m/s`} icon="🌪️" />
                      </>
                    )}
                    {openKey === 'buoy' && devicesState[openKey]?.data && (
                      <>
                        <DetailDataItem label="海表温度" value={`${devicesState[openKey].data?.seaSurfaceTemp || '--'}°C`} icon="🌊" />
                        <DetailDataItem label="波高" value={`${devicesState[openKey].data?.waveHeight || '--'}m`} icon="🌊" />
                        <DetailDataItem label="波周期" value={`${devicesState[openKey].data?.wavePeriod || '--'}s`} icon="⏱️" />
                        <DetailDataItem label="海流速度" value={`${devicesState[openKey].data?.oceanCurrentSpeed || '--'}m/s`} icon="🌊" />
                        <DetailDataItem label="海水盐度" value={`${devicesState[openKey].data?.salinity || '--'}ppt`} icon="🧂" />
                        <DetailDataItem label="海面风速" value={`${devicesState[openKey].data?.seaSurfaceWind || '--'}m/s`} icon="💨" />
                      </>
                    )}
                  </div>
                  
                  <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">数据质量</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-600 rounded-full h-2">
                        <div className="bg-green-400 h-2 rounded-full transition-all duration-500" style={{ 
                          width: `${devicesState[openKey]?.dataQuality || 90}%` 
                        }}></div>
                      </div>
                      <span className="text-xs text-green-400 font-medium">
                        {devicesState[openKey]?.dataQuality || 90}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-center">
                  <div className="text-slate-400 text-sm">
                    <div className="text-2xl mb-2">📊</div>
                    <div>点击已完成的传感器查看详细数据</div>
                    <div className="text-xs mt-1 text-slate-500">拖拽传感器到地球上开始数据采集</div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-2">雷达传输速度：x1.0</div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (progress/4)*100 + 20)}%` }}></div>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 pt-2">
              <Info size={14} />
              <span>拖拽到左侧地球任意位置开始采集；绿色"完成"为已采集</span>
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
      <DotsStars />
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

function DotsStars() {
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

function SensorCard({ iconType, title, k, state, openKey, setOpenKey, setDragOrigin, setIsDragging }) {
  const isDone = state.status === 'done'
  const isCollecting = state.status === 'collecting'
  const opened = openKey === k
  return (
    <div
      className={`rounded-xl border p-4 bg-slate-800/40 ${isDone ? 'border-emerald-500/40' : isCollecting ? 'border-primary/50 shadow-glow' : 'border-slate-700/60 hover:border-primary/40'}`}
      draggable={state.status === 'idle'}
      onDragStart={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setDragOrigin?.({ x: rect.left + rect.width/2, y: rect.top + rect.height/2 })
        e.dataTransfer.setData('text/plain', k)
        setIsDragging?.(true)
      }}
      onDragEnd={() => setIsDragging?.(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sky-300">
          <motion.span animate={{ rotate: isCollecting && iconType==='radar' ? 360 : 0 }} transition={{ repeat: isCollecting && iconType==='radar' ? Infinity : 0, ease: 'linear', duration: 1.6 }}>
            <SensorIconBox type={iconType} size={26} />
          </motion.span>
          <span className="font-semibold">{title}</span>
        </div>
        <StatusPill status={state.status} />
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {state.status === 'idle' && '拖到地球开始采集'}
        {state.status === 'collecting' && '采集中…'}
        {isDone && (<>
          已完成，
          <button className="text-primary underline underline-offset-2" onClick={() => setOpenKey(opened ? null : k)}>点击查看数据</button>
        </>)}
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

// ===== 详细数据项组件 =====
function DetailDataItem({ label, value, icon }) {
  return (
    <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/30">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

// ===== 3D 地球（按截图风格，蓝色科幻质感 + 夜昼分界 + 大气辉光） =====
function StageOneGlobe({ markers, onDropDevice, onHoverDevice, dragOrigin, hoverWorld, highlightKey, devicesState }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef(null)
  const [rotation, setRotation] = useState(0)
  const [dragPreview, setDragPreview] = useState({ visible: false, position: null, sensorType: null })
  
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused) {
        setCurrentTime(new Date())
        setRotation(prev => (prev + 0.2) % 360)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [isPaused])

  const formatTime = (date) => {
    return `北京时间 ${date.getFullYear()}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}:${date.getSeconds().toString().padStart(2,'0')}`
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const key = e.dataTransfer.getData('text/plain')
    if (!key || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 检查是否在地球圆形区域内
    const dx = x - centerX
    const dy = y - centerY
    const earthRadius = Math.min(centerX, centerY) * 0.8
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance <= earthRadius) {
      // 转换为世界坐标
      const worldX = (dx / earthRadius)
      const worldY = -(dy / earthRadius)
      const worldZ = Math.sqrt(Math.max(0, 1 - worldX * worldX - worldY * worldY))
      onDropDevice?.(key, { x: worldX, y: worldY, z: worldZ })
    }
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-[420px] md:h-[520px] rounded-xl overflow-hidden border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* 星空背景 */}
      <DotsStars />
      
      {/* 3D地球 */}
      <Canvas 
        dpr={[1, 2]} 
        camera={{ position: [0, 0, 2.5], fov: 45 }} 
        onCreated={({ gl }) => {
          gl.setClearColor('#020617')
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.2
        }}
      >
        {/* 环境光 - 确保地球整体可见 */}
        <ambientLight intensity={0.6} color={'#ffffff'} />
        
        {/* 主光源 - 模拟太阳光 */}
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1.8} 
          color={'#ffffff'}
          castShadow={false}
        />
        
        {/* 辅助光源 - 增强细节 */}
        <directionalLight 
          position={[-3, -2, 2]} 
          intensity={0.4} 
          color={'#e3f2fd'}
        />
        
        <Earth3DCore isPaused={isPaused} markers={markers} />
        <EarthControls onDropDevice={onDropDevice} containerRef={containerRef} setDragPreview={setDragPreview} />
        <TextureStatus />
      </Canvas>
      
      {/* 2D传感器标记层 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 预设位置标记 */}
        <PresetMarkers presetMarkers={Object.entries(PRESET_POSITIONS).map(([key, position]) => ({
          id: `preset-${key}`,
          x: position.x,
          y: position.y,
          key: key,
          isPreset: true,
          name: position.name,
          description: position.description,
          isOccupied: devicesState[key]?.status !== 'idle'
        }))} />
        {/* 实际传感器标记 */}
        <Markers2D markers={markers} devicesState={devicesState} />
      </div>
      
      {/* 2D拖拽预览层 */}
      <DragPreview2D 
        position={dragPreview.position}
        visible={dragPreview.visible}
        sensorType={dragPreview.sensorType}
        containerRef={containerRef}
      />
      
      {/* 暂停控制 */}
      <div className="absolute left-3 top-3 pointer-events-auto">
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="px-3 py-1 text-xs bg-slate-800/80 border border-slate-600/60 rounded text-slate-200 hover:bg-slate-700/80 pointer-events-auto"
        >
          {isPaused ? '播放' : '暂停'}
        </button>
      </div>
      
      {/* 时间显示 */}
      <div className="absolute right-3 top-3 text-xs text-slate-300 bg-slate-800/80 rounded px-2 py-1 border border-slate-700/60">
        {formatTime(currentTime)}
      </div>
      
      {/* 获取状态提示 */}
      <div className="absolute left-3 bottom-3 text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 rounded px-2 py-1">
        图例：蓝色采集中 绿色：完成
      </div>
      

      
      {/* 拖拽提示 */}
      <div className="absolute bottom-3 right-3 text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 rounded px-2 py-1">
        拖拽传感器到对应的虚线位置
      </div>
    </div>
  )
}

// ===== 强制纹理加载 Hook =====
function useSafeTexture(url, fallbackColor = '#1e3a8a') {
  const [texture, setTexture] = useState(null)
  const [fallback, setFallback] = useState(false)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!url) {
      setFallback(true)
      return
    }
    
    setLoading(true)
    const loader = new THREE.TextureLoader()
    
    // 创建跨域代理URL或使用本地备份
    const proxyUrl = url.includes('threejs.org') ? url : `https://cors-anywhere.herokuapp.com/${url}`
    
    // 尝试多个加载方案
    const loadTexture = (urls) => {
      const tryLoad = (urlIndex) => {
        if (urlIndex >= urls.length) {
          console.warn('All texture URLs failed, using fallback')
          setFallback(true)
          setLoading(false)
          return
        }
        
        loader.load(
          urls[urlIndex],
          (loadedTexture) => {
            console.log('Texture loaded successfully:', urls[urlIndex])
            loadedTexture.wrapS = THREE.RepeatWrapping
            loadedTexture.wrapT = THREE.RepeatWrapping
            setTexture(loadedTexture)
            setFallback(false)
            setLoading(false)
          },
          (progress) => {
            console.log('Loading progress:', progress)
          },
          (error) => {
            console.warn(`Texture loading failed for ${urls[urlIndex]}:`, error)
            tryLoad(urlIndex + 1)
          }
        )
      }
      tryLoad(0)
    }
    
    // 多个备用URL
    const fallbackUrls = [
      url,
      `https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg`,
      `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#4a90e2"/><circle cx="128" cy="128" r="100" fill="#2e7d32"/></svg>')}`
    ]
    
    loadTexture(fallbackUrls)
  }, [url])
  
  return { texture, fallback, loading, fallbackColor }
}

// ===== 3D 地球核心组件 =====
function Earth3DCore({ isPaused, markers = [] }) {
  const earthRef = useRef()
  const cloudsRef = useRef()
  
  // 使用更可靠的地球纹理源
  const earthTexUrl = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
  const normalTexUrl = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'
  const specularTexUrl = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'
  const cloudsTexUrl = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png'
  
  const { texture: earthMap, fallback: earthFallback, loading: earthLoading } = useSafeTexture(earthTexUrl)
  const { texture: normalMap } = useSafeTexture(normalTexUrl)
  const { texture: specularMap } = useSafeTexture(specularTexUrl)
  const { texture: cloudsMap } = useSafeTexture(cloudsTexUrl)
  
  // 纹理状态显示
  const textureStatus = useMemo(() => {
    if (earthLoading) return '加载中...'
    if (earthFallback) return '程序化纹理'
    if (earthMap) return '高清纹理'
    return '基础纹理'
  }, [earthLoading, earthFallback, earthMap])
  
  // 创建程序化地球纹理
  const proceduralEarthTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    // 绘制海洋背景
    ctx.fillStyle = '#1976d2'
    ctx.fillRect(0, 0, 512, 256)
    
    // 绘制大陆形状 (简化的世界地图)
    ctx.fillStyle = '#388e3c'
    
    // 非洲和欧洲
    ctx.beginPath()
    ctx.ellipse(280, 100, 40, 60, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 亚洲
    ctx.beginPath() 
    ctx.ellipse(380, 80, 60, 40, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 北美洲
    ctx.beginPath()
    ctx.ellipse(120, 70, 45, 50, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 南美洲
    ctx.beginPath()
    ctx.ellipse(140, 170, 25, 55, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 澳大利亚
    ctx.beginPath()
    ctx.ellipse(420, 180, 30, 20, 0, 0, Math.PI * 2)
    ctx.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])

  // 地球材质 - 根据纹理加载状态动态调整
  const earthMaterial = useMemo(() => {
    if (earthFallback || !earthMap) {
      // 使用程序化纹理确保真实地球外观
      return new THREE.MeshPhongMaterial({
        map: proceduralEarthTexture,
        shininess: 50,
        specular: new THREE.Color('#1976d2')
      })
    } else {
      // 完整纹理材质
      return new THREE.MeshPhongMaterial({
        map: earthMap,
        normalMap: normalMap,
        specularMap: specularMap,
        shininess: 100,
        specular: new THREE.Color('#ffffff')
      })
    }
  }, [earthMap, normalMap, specularMap, earthFallback, proceduralEarthTexture])
  
  // 云层材质
  const cloudsMaterial = useMemo(() => {
    if (!cloudsMap) {
      return new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1
      })
    }
    return new THREE.MeshBasicMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.4
    })
  }, [cloudsMap])
  
  // 移除地球自动旋转，保持固定相机视角
  // useFrame((_, delta) => {
  //   if (!isPaused) {
  //     if (earthRef.current) {
  //       earthRef.current.rotation.y += delta * 0.05
  //     }
  //     if (cloudsRef.current) {
  //       cloudsRef.current.rotation.y += delta * 0.08
  //     }
  //   }
  // })
  
  return (
    <group>
      {/* 地球主体 */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>
      
      {/* 云层 */}
      <mesh ref={cloudsRef} scale={1.003}>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={cloudsMaterial} attach="material" />
      </mesh>
      
      {/* 大气辉光 */}
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color={'#64b5f6'} 
          transparent 
          opacity={0.1} 
          side={THREE.BackSide} 
        />
      </mesh>
      
      {/* 内部大气 */}
      <mesh scale={1.02}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={'#e3f2fd'} 
          transparent 
          opacity={0.05} 
        />
      </mesh>
      
      {/* 3D传感器标记已移除，使用2D覆盖层 */}
    </group>
  )
}

// ===== 2D拖拽预览组件 =====
function DragPreview2D({ position, visible, sensorType, containerRef }) {
  const [pulsePhase, setPulsePhase] = useState(0)
  
  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setPulsePhase(prev => prev + 0.2)
    }, 50)
    return () => clearInterval(interval)
  }, [visible])
  
  if (!visible || !position || !containerRef.current) return null
  
  // 将3D位置转换为2D屏幕坐标
  const rect = containerRef.current.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const earthRadius = Math.min(centerX, centerY) * 0.8
  
  const screenX = centerX + position.x * earthRadius
  const screenY = centerY - position.y * earthRadius
  
  const colors = {
    satellite: { border: 'border-blue-400', bg: 'bg-blue-400/20', shadow: 'shadow-blue-400/50' },
    ground: { border: 'border-green-400', bg: 'bg-green-400/20', shadow: 'shadow-green-400/50' },
    radar: { border: 'border-orange-400', bg: 'bg-orange-400/20', shadow: 'shadow-orange-400/50' },
    buoy: { border: 'border-purple-400', bg: 'bg-purple-400/20', shadow: 'shadow-purple-400/50' }
  }[sensorType] || { border: 'border-cyan-400', bg: 'bg-cyan-400/20', shadow: 'shadow-cyan-400/50' }
  
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.4
  
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* 主预览圈 */}
      <div 
        className={`absolute rounded-full border-4 ${colors.border} ${colors.bg} animate-pulse shadow-lg ${colors.shadow}`}
        style={{
          width: '60px',
          height: '60px',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${pulseScale})`
        }}
      ></div>
      
      {/* 中心点 */}
      <div className={`absolute w-2 h-2 rounded-full ${colors.bg} border ${colors.border}`}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      ></div>
      
      {/* 外圈效果 */}
      <div 
        className={`absolute rounded-full border-2 ${colors.border} animate-ping`}
        style={{
          width: '80px',
          height: '80px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.5
        }}
      ></div>
      
      <div 
        className={`absolute rounded-full border ${colors.border} animate-ping`}
        style={{
          width: '100px',
          height: '100px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          animationDelay: '0.5s',
          opacity: 0.3
        }}
      ></div>
      
      {/* 投射指示线 */}
      <div 
        className={`absolute ${colors.bg} opacity-60`}
        style={{
          width: '2px',
          height: '50px',
          left: '50%',
          top: '100%',
          transformOrigin: 'top',
          transform: 'translateX(-50%)',
          background: `linear-gradient(to bottom, ${colors.border.replace('border-', '').replace('400', '400')}, transparent)`
        }}
      ></div>
    </div>
  )
}

// ===== 数据粒子系统 =====
function DataParticles({ startPos, endPos, active, color }) {
  const pointsRef = useRef()
  const [particles] = useState(() => {
    const positions = new Float32Array(60)
    const start = new THREE.Vector3(startPos.x, startPos.y, startPos.z)
    const end = new THREE.Vector3(0, 0, 0) // 地球中心
    
    for (let i = 0; i < 20; i++) {
      const t = i / 19
      const pos = start.clone().lerp(end, t)
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z
    }
    return positions
  })
  
  useFrame((_, delta) => {
    if (pointsRef.current && active) {
      pointsRef.current.rotation.z += delta * 2
    }
  })
  
  if (!active) return null
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={20}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color={color} transparent opacity={0.8} />
    </points>
  )
}

// ===== 3D 传感器标记组件 =====
function SensorMarker3D({ marker, isActive }) {
  const groupRef = useRef()
  const beamRef = useRef()
  const [pulsePhase, setPulsePhase] = useState(0)
  const [animationPhase, setAnimationPhase] = useState(0)
  
  useFrame((_, delta) => {
    if (!groupRef.current) return
    
    setPulsePhase(prev => prev + delta * 2)
    setAnimationPhase(prev => prev + delta)
    
    if (isActive) {
      // 活跃状态的动画
      if (marker.type === 'radar') {
        groupRef.current.rotation.y += delta * 3
      } else if (marker.type === 'satellite') {
        groupRef.current.rotation.z += delta * 1.5
      } else if (marker.type === 'buoy') {
        groupRef.current.position.y += Math.sin(animationPhase * 2) * 0.005
      }
      
      // 光束效果
      if (beamRef.current) {
        beamRef.current.material.opacity = 0.3 + Math.sin(pulsePhase * 2) * 0.2
      }
    }
  })
  
  const color = {
    satellite: '#4DA3FF',
    ground: '#1FD38A',
    radar: '#FFA500', 
    buoy: '#A16EFF'
  }[marker.type] || '#ffffff'
  
  const worldPos = new THREE.Vector3(marker.x, marker.y, marker.z).normalize()
  
  return (
    <group ref={groupRef} position={[worldPos.x * 1.05, worldPos.y * 1.05, worldPos.z * 1.05]}>
      {/* 主体标记 */}
      <mesh>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* 脉冲环 */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.04, 0.08, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.6 + Math.sin(pulsePhase) * 0.3} 
        />
      </mesh>
      
      {/* 数据传输光束 */}
      {isActive && (
        <mesh 
          ref={beamRef}
          position={[0, 0, -0.5]}
          rotation={[Math.PI/2, 0, 0]}
        >
          <cylinderGeometry args={[0.015, 0.04, 1, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )}
      
      {/* 外层脉冲环 */}
      {isActive && (
        <mesh rotation={[Math.PI/2, 0, 0]} scale={1 + Math.sin(pulsePhase * 1.5) * 0.2}>
          <ringGeometry args={[0.08, 0.12, 16]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.3} 
          />
        </mesh>
      )}
      
      {/* 特殊类型效果 */}
      {marker.type === 'radar' && isActive && (
        <>
          <mesh rotation={[0, pulsePhase, 0]}>
            <ringGeometry args={[0.12, 0.16, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.2} />
          </mesh>
          <mesh rotation={[0, -pulsePhase * 0.5, 0]}>
            <ringGeometry args={[0.16, 0.2, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.1} />
          </mesh>
        </>
      )}
      
      {marker.type === 'satellite' && isActive && (
        <DataParticles 
          startPos={worldPos}
          endPos={{x: 0, y: 0, z: 0}}
          active={isActive}
          color={color}
        />
      )}
      
      {marker.type === 'ground' && isActive && (
        <mesh position={[0, 0, -0.1]}>
          <cylinderGeometry args={[0.06, 0.02, 0.2, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  )
}

// ===== 3D 地球控制组件 =====
function EarthControls({ onDropDevice, containerRef, setDragPreview }) {
  const { gl, camera, scene } = useThree()
  
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault()
      
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      
      const sphere = scene.children.find(child => 
        child.geometry && child.geometry.type === 'SphereGeometry' && child.scale.x === 1
      )
      
      if (sphere) {
        const intersects = raycaster.intersectObject(sphere)
        if (intersects.length > 0) {
          const point = intersects[0].point.normalize()
          const sensorType = e.dataTransfer.getData('text/plain') || 'satellite'
          
          setDragPreview({
            visible: true,
            position: point,
            sensorType: sensorType
          })
        } else {
          setDragPreview({ visible: false, position: null, sensorType: null })
        }
      }
    }
    
    const handleDragLeave = () => {
      setDragPreview({ visible: false, position: null, sensorType: null })
    }
    
    const handleDrop = (e) => {
      e.preventDefault()
      setDragPreview({ visible: false, position: null, sensorType: null })
      
      const key = e.dataTransfer.getData('text/plain')
      if (!key) return
      
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      
      const sphere = scene.children.find(child => 
        child.geometry && child.geometry.type === 'SphereGeometry' && child.scale.x === 1
      )
      
      if (sphere) {
        const intersects = raycaster.intersectObject(sphere)
        if (intersects.length > 0) {
          const point = intersects[0].point.normalize()
          onDropDevice?.(key, { x: point.x, y: point.y, z: point.z })
        }
      }
    }
    
    gl.domElement.addEventListener('dragover', handleDragOver)
    gl.domElement.addEventListener('dragleave', handleDragLeave)
    gl.domElement.addEventListener('drop', handleDrop)
    
    return () => {
      gl.domElement.removeEventListener('dragover', handleDragOver)
      gl.domElement.removeEventListener('dragleave', handleDragLeave)
      gl.domElement.removeEventListener('drop', handleDrop)
    }
  }, [gl, camera, scene, onDropDevice])
  
  return (
    <OrbitControls 
      enablePan={false} 
      enableRotate={false} 
      enableZoom={false}
      maxDistance={3} 
      minDistance={3}
      target={[0, 0, 0]}
    />
  )
}

// ===== 纹理状态显示组件 =====
function TextureStatus() {
  return null // 在3D场景中不需要显示状态
}

// useThree 已从 @react-three/fiber 导入

// 汇总显示用：如某字段不存在，用 format 默认值
function mergeMetric(state, key, format, allowEmpty = false) {
  const values = Object.values(state).map((s) => s.data?.[key]).filter((v) => v !== undefined && v !== null)
  if (!values.length) return allowEmpty ? format(undefined) : '—'
  
  // 处理不同数据类型
  if (values.some(v => typeof v === 'string')) {
    // 字符串类型（如风向）返回最后一个值
    return format(values[values.length - 1])
  }
  
  // 数值类型计算平均值
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
function SensorIconBox({ type, size = 20 }) {
  const styleMap = {
    satellite: { bg: 'from-sky-900 to-sky-700', chip: 'bg-violet-400' },
    ground: { bg: 'from-emerald-900 to-emerald-700', chip: 'bg-emerald-400' },
    radar: { bg: 'from-amber-900 to-amber-700', chip: 'bg-amber-400' },
    buoy: { bg: 'from-indigo-900 to-indigo-700', chip: 'bg-indigo-400' },
  }
  const m = styleMap[type] || styleMap.satellite
  const s = { width: size, height: size }
  const iconColor = '#eef2ff'
  return (
    <div className={`relative rounded-md bg-gradient-to-br ${m.bg} border border-white/10 shadow-[0_0_12px_rgba(2,132,199,0.25)]`} style={s}>
      <div className={`absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full ${m.chip}`} />
      {/* glyph */}
      <div className="absolute inset-0 flex items-center justify-center">
        {type === 'satellite' && (
          <svg viewBox="0 0 24 24" width={size-6} height={size-6} fill="none" stroke={iconColor} strokeWidth="1.6">
            <path d="M6 6l4 4M14 14l4 4M14 10l4-4M6 18l4-4" />
            <rect x="10" y="10" width="4" height="4" rx="1" stroke={iconColor} />
          </svg>
        )}
        {type === 'ground' && (
          <svg viewBox="0 0 24 24" width={size-6} height={size-6} fill="none" stroke={iconColor} strokeWidth="1.6">
            <path d="M4 18h16M8 18V9l4-3 4 3v9" />
            <circle cx="12" cy="12" r="1.6" fill={iconColor} />
          </svg>
        )}
        {type === 'radar' && (
          <svg viewBox="0 0 24 24" width={size-6} height={size-6} fill="none" stroke={iconColor} strokeWidth="1.6">
            <circle cx="12" cy="12" r="7" />
            <path d="M12 12l6-2" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        )}
        {type === 'buoy' && (
          <svg viewBox="0 0 24 24" width={size-6} height={size-6} fill="none" stroke={iconColor} strokeWidth="1.6">
            <path d="M4 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
            <path d="M12 14v-6l-2-2" />
            <circle cx="12" cy="5" r="1" />
          </svg>
        )}
      </div>
    </div>
  )
}

// 纹理相关函数已移除，改用2D CSS/SVG实现

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

// 2D地球组件已移除，改用3D实现

// ===== 2D 传感器标记 =====
function Markers2D({ markers, devicesState }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-[90%] max-w-[520px] aspect-square">
        {markers.map((m) => (
          <Marker2D key={m.id} marker={m} devicesState={devicesState} />
        ))}
      </div>
    </div>
  )
}

function Marker2D({ marker, devicesState }) {
  const [isAnimating, setIsAnimating] = useState(true)
  const [pulsePhase, setPulsePhase] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 1500)
    return () => clearTimeout(timer)
  }, [])
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => prev + 0.1)
    }, 50)
    return () => clearInterval(interval)
  }, [])
  
  // 根据传感器类型设定位置（卫星在轨道上，其他在地面）
  let x, y, z = 1.0
  
  if (marker.isOrbital) {
    // 卫星在轨道上，相对离地球表面较远
    x = marker.x
    y = marker.y
    z = 1.3 // 轨道高度
  } else {
    // 其他传感器在地球表面
    x = marker.x
    y = marker.y
    z = 1.0
  }
  
  // 获取传感器类型和状态
  const sensorType = marker.key // marker对象使用key字段
  const sensorStatus = devicesState[sensorType]?.status || 'idle'
  const isActive = sensorStatus === 'collecting' || sensorStatus === 'done' // 采集中或完成时都显示动画
  const isCompleted = sensorStatus === 'done'
  
  const getMarkerIcon = (type) => {
    const iconMap = {
      satellite: FaSatellite,  // 卫星
      ground: MdHome,          // 地面站
      radar: MdRadar,          // 雷达
      buoy: FaShip             // 浮标
    }
    return iconMap[type] || FaSatellite
  }
  
  const getIconColor = (type) => {
    const colorMap = {
      satellite: '#4DA3FF',
      ground: '#1FD38A',
      radar: '#FFA500',
      buoy: '#A16EFF'
    }
    return colorMap[type] || '#4DA3FF'
  }
  
  const getMarkerColor = (type) => {
    const colorMap = {
      satellite: 'border-blue-400 bg-blue-400/80',
      ground: 'border-green-400 bg-green-400/80',
      radar: 'border-orange-400 bg-orange-400/80',
      buoy: 'border-purple-400 bg-purple-400/80'
    }
    return colorMap[type] || 'border-cyan-400 bg-cyan-400/80'
  }
  
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.3
  
  // 统一闪烁动画效果
  const getIconAnimation = (type) => {
    if (!isActive) return isAnimating ? 'animate-bounce' : ''
    
    // 所有传感器都使用统一的闪烁效果
    return 'animate-pulse'
  }
  
  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${isCompleted ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        zIndex: marker.isOrbital ? 15 : 10, // 卫星层级更高
        transform: marker.isOrbital ? 'translate(-50%, -50%) scale(1.2)' : 'translate(-50%, -50%)' // 卫星显示更大
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (isCompleted) {
          window.dispatchEvent(new CustomEvent('openSensorData', { detail: { sensorType } }))
        }
      }}
    >
      {/* 主体图标 */}
      <div 
        className={`relative text-2xl ${getIconAnimation(sensorType)}`}
        style={{
          // 移除特殊动画，统一使用闪烁效果
          transform: 'none'
        }}
      >
        {/* 图标背景增强 */}
        <div 
          className={`absolute rounded-full ${getMarkerColor(sensorType)} border-2`}
          style={{
            width: '32px',
            height: '32px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.85,
            boxShadow: `0 0 15px ${getIconColor(sensorType)}80, 0 0 30px ${getIconColor(sensorType)}50`
          }}
        ></div>
        
        {/* 白色背景圈增强对比度 */}
        <div 
          className="absolute rounded-full bg-white/70 border border-white/80"
          style={{
            width: '28px',
            height: '28px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5
          }}
        ></div>
        
        <div className="relative flex items-center justify-center z-10">
          {(() => {
            const IconComponent = getMarkerIcon(sensorType)
            const iconColor = getIconColor(sensorType)
            return (
              <IconComponent 
                size={24} 
                color={iconColor}
                style={{ 
                  filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.9)) drop-shadow(0 0 2px rgba(255,255,255,0.6))',
                  fontWeight: 'bold',
                  stroke: '#ffffff',
                  strokeWidth: '0.5px'
                }}
              />
            )
          })()}
        </div>
        
        {/* 增强的闪烁辐射效果 */}
        {isActive && (
          <>
            {/* 内层闪烁圈 */}
            <div 
              className={`absolute rounded-full border-2 ${getMarkerColor(sensorType).split(' ')[0]} animate-pulse`}
              style={{
                width: '45px',
                height: '45px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.9,
                boxShadow: `0 0 20px ${getIconColor(sensorType)}, 0 0 40px ${getIconColor(sensorType)}70`
              }}
            ></div>
            
            {/* 中层辐射圈 */}
            <div 
              className={`absolute rounded-full border-2 ${getMarkerColor(sensorType).split(' ')[0]}`}
              style={{
                width: '60px',
                height: '60px',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${1 + Math.sin(pulsePhase * 1.5) * 0.2})`,
                opacity: 0.7 - Math.sin(pulsePhase * 1.5) * 0.2,
                boxShadow: `0 0 25px ${getIconColor(sensorType)}70`
              }}
            ></div>
            
            {/* 外层辐射圈 */}
            <div 
              className={`absolute rounded-full border ${getMarkerColor(sensorType).split(' ')[0]}`}
              style={{
                width: '75px',
                height: '75px',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${1 + Math.sin(pulsePhase + 1) * 0.3})`,
                opacity: 0.5 - Math.sin(pulsePhase + 1) * 0.2,
                boxShadow: `0 0 30px ${getIconColor(sensorType)}50`
              }}
            ></div>
            
            {/* 闪烁中心点 */}
            <div 
              className={`absolute rounded-full ${getMarkerColor(sensorType)}`}
              style={{
                width: '8px',
                height: '8px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 1,
                zIndex: 30,
                boxShadow: `0 0 15px ${getIconColor(sensorType)}, 0 0 30px ${getIconColor(sensorType)}, 0 0 45px ${getIconColor(sensorType)}50`
              }}
            ></div>
          </>
        )}
        
        {/* 统一数据传输线 */}
        {isActive && (
          <>
            <div 
              className="absolute"
              style={{
                width: '2px',
                height: marker.isOrbital ? '100px' : '60px', // 卫星传输线更长
                left: '50%',
                top: marker.isOrbital ? '-100px' : '100%', // 卫星向上传输，其他向下
                background: `linear-gradient(${marker.isOrbital ? 'to top' : 'to bottom'}, ${getIconColor(sensorType)}, transparent)`,
                transform: 'translateX(-50%)',
                opacity: 0.6 + Math.sin(pulsePhase * 3) * 0.4
              }}
            ></div>
            
            {/* 卫星轨道指示 */}
            {marker.isOrbital && (
              <div 
                className="absolute rounded-full border border-blue-300/30"
                style={{
                  width: '160px',
                  height: '160px',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  borderStyle: 'dashed',
                  opacity: 0.3 + Math.sin(pulsePhase * 0.5) * 0.2
                }}
              ></div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
