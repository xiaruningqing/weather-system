import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { FaSatellite, FaShip } from 'react-icons/fa'
import { MdHome, MdRadar } from 'react-icons/md'
import { useGlobal } from '../store/global.jsx'

// 异构数据源配置
const DATA_SOURCES = {
  satellite: {
    name: '卫星数据',
    icon: FaSatellite,
    color: '#4DA3FF',
    format: 'NetCDF',
    frequency: '15min',
    coverage: '全球',
    dataTypes: ['云量', '云顶温度', '水汽含量', '地表温度', '太阳辐射', '大气顶温度']
  },
  ground: {
    name: '地面站数据', 
    icon: MdHome,
    color: '#1FD38A',
    format: 'CSV',
    frequency: '1min',
    coverage: '点位',
    dataTypes: ['气温', '相对湿度', '大气压力', '风速', '风向', '降水量', '能见度']
  },
  radar: {
    name: '雷达数据',
    icon: MdRadar,
    color: '#FFA500', 
    format: 'HDF5',
    frequency: '6min',
    coverage: '扇形区域',
    dataTypes: ['降水强度', '雷达反射率', '径向速度', '回波顶高', '液态水含量', '风场强度']
  },
  buoy: {
    name: '浮标数据',
    icon: FaShip,
    color: '#A16EFF',
    format: 'JSON',
    frequency: '30min', 
    coverage: '海洋点位',
    dataTypes: ['海表温度', '波高', '波周期', '海流速度', '海水盐度', '海面风速']
  }
}

export default function StageTwo({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const { stageOneScore, fusionWeight, setFusedData } = useGlobal()
  const [currentPhase, setCurrentPhase] = useState('preprocessing') // preprocessing -> fusing -> unified
  const [dataStreams, setDataStreams] = useState({})
  const [localFusedData, setLocalFusedData] = useState(null)
  const fusionCtrl = useAnimationControls()
  const streamCtrl = useAnimationControls()

  // 模拟从阶段一获取的异构数据
  const mockStageOneData = useMemo(() => ({
    satellite: { cloudCoverage: 72, cloudTopTemp: -45, waterVapor: 24, surfaceTemp: 15, solarRadiation: 850, atmosphericTopTemp: -65, quality: 94 },
    ground: { airTemperature: 18, relativeHumidity: 68, atmosphericPressure: 1013, windSpeed: 12, windDirection: 'NE', precipitation: 2.5, visibility: 8.5, quality: 91 },
    radar: { precipitationIntensity: 5.2, radarReflectivity: 35, radialVelocity: -8, echoTopHeight: 6.8, verticalLiquidWater: 12, windFieldIntensity: 15, quality: 88 },
    buoy: { seaSurfaceTemp: 19.5, waveHeight: 2.3, wavePeriod: 7.8, oceanCurrentSpeed: 1.2, salinity: 35.2, seaSurfaceWind: 14, quality: 92 }
  }), [])

  // 异构数据融合流程
  useEffect(() => {
    if (isPaused) return
    
    const phases = [
      { phase: 'preprocessing', duration: 1200 },
      { phase: 'fusing', duration: 1800 },
      { phase: 'unified', duration: 1000 }
    ]
    
    let timeouts = []
    let currentTime = 0
    
    phases.forEach(({ phase, duration }) => {
      timeouts.push(setTimeout(() => {
        setCurrentPhase(phase)
        if (phase === 'unified') {
          // 生成融合后的数据
          const fusedResult = generateFusedData(mockStageOneData, fusionWeight)
          setLocalFusedData(fusedResult)
          setFusedData(fusedResult) // 保存到全局状态
        }
      }, currentTime))
      currentTime += Math.max(duration / 2, duration / Math.max(0.25, speedFactor))
    })
    
    if (isAutoPlay) {
      timeouts.push(setTimeout(() => onComplete?.(), currentTime + 1000))
    }
    
    return () => timeouts.forEach(clearTimeout)
  }, [isPaused, onComplete, isAutoPlay, speedFactor, mockStageOneData, fusionWeight])

  // 融合动画控制
  useEffect(() => {
    if (isPaused) {
      fusionCtrl.stop()
      streamCtrl.stop()
    } else if (currentPhase === 'fusing') {
      fusionCtrl.start({ 
        scale: [1, 1.2, 1], 
        rotate: [0, 360, 720],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } 
      })
    } else if (currentPhase === 'unified') {
      streamCtrl.start({ 
        x: ['0%', '100%'], 
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } 
      })
    }
  }, [isPaused, currentPhase, fusionCtrl, streamCtrl])

  // 生成融合数据
  const generateFusedData = (sourceData, weight) => {
    return {
      temperature: Math.round((sourceData.ground.airTemperature + sourceData.satellite.surfaceTemp) / 2 * 10) / 10,
      humidity: Math.round((sourceData.ground.relativeHumidity + sourceData.satellite.waterVapor * 2.5) / 2),
      pressure: sourceData.ground.atmosphericPressure,
      windSpeed: Math.round((sourceData.ground.windSpeed + sourceData.radar.windFieldIntensity) / 2 * 10) / 10,
      precipitation: Math.round((sourceData.ground.precipitation + sourceData.radar.precipitationIntensity) / 2 * 10) / 10,
      cloudiness: sourceData.satellite.cloudCoverage,
      seaCondition: {
        temperature: sourceData.buoy.seaSurfaceTemp,
        waveHeight: sourceData.buoy.waveHeight
      },
      fusionQuality: Math.round(Object.values(sourceData).reduce((acc, data) => acc + data.quality, 0) / 4),
      confidence: Math.round(weight * 100)
    }
  }

  return (
    <section className="min-h-[520px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">阶段二 · 异构数据融合</h2>
          <p className="mt-1 text-slate-300">多源异构数据预处理、对齐、融合形成统一的气象数据集</p>
        </div>
        <div className="text-sm text-slate-300 flex items-center gap-3">
          <span>融合进度</span>
          <div className="text-sky-300 font-semibold">{getPhaseLabel(currentPhase)}</div>
          <span className="ml-4">融合权重 <span className="text-amber-300 font-semibold">{fusionWeight}</span></span>
        </div>
      </div>

      {/* 主要融合区域 */}
      <div className="mt-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 relative">
          {/* 左：异构数据源 */}
          <div className="lg:col-span-1 relative">
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-sky-300 font-semibold">异构数据源</span>
              </div>
              
              <div className="space-y-3">
                {Object.entries(DATA_SOURCES).map(([key, source]) => (
                  <DataSourceCard 
                    key={key} 
                    source={source} 
                    data={mockStageOneData[key]}
                    isActive={true}
                    phase={currentPhase}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 数据流箭头动画 */}
          <div className="hidden lg:block absolute" style={{ 
            left: 'calc(33.333% + 1rem)', 
            top: '50%', 
            transform: 'translateY(-50%)',
            zIndex: 20
          }}>
            <DataFlowArrows phase={currentPhase} />
          </div>

          {/* 中：融合处理器 */}
          <div className="lg:col-span-1 relative">
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span className="text-sky-300 font-semibold">融合处理器</span>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <FusionProcessor 
                  phase={currentPhase} 
                  fusionCtrl={fusionCtrl}
                  dataCount={Object.keys(mockStageOneData).length}
                />
              </div>
              
              <div className="mt-4 space-y-2">
                <ProcessStep phase="preprocessing" current={currentPhase} label="预处理" />
                <ProcessStep phase="fusing" current={currentPhase} label="融合计算" />
                <ProcessStep phase="unified" current={currentPhase} label="输出统一数据" />
              </div>
            </div>
          </div>



          {/* 右：融合结果 */}
          <div className="lg:col-span-1 relative">
            {/* 数据接收指示器 */}
            {currentPhase === 'unified' && (
              <motion.div
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-emerald-400/60 bg-emerald-900/40 flex items-center justify-center"
                  animate={{
                    scale: [1, 1.2, 1],
                    borderColor: ['#10b98160', '#10b981ff', '#10b98160']
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <motion.div
                    className="w-1 h-1 bg-emerald-400 rounded-full"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.div>
              </motion.div>
            )}
            
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <div className="flex items-center gap-2 mb-4">
                <motion.div 
                  className="w-3 h-3 rounded-full bg-emerald-400"
                  animate={currentPhase === 'unified' ? {
                    opacity: [0.6, 1, 0.6],
                    scale: [1, 1.1, 1]
                  } : {}}
                  transition={{ duration: 1.5, repeat: currentPhase === 'unified' ? Infinity : 0 }}
                />
                <span className="text-sky-300 font-semibold">融合结果</span>
                {currentPhase === 'unified' && (
                  <motion.span
                    className="text-xs text-emerald-300 ml-auto"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    数据接收中...
                  </motion.span>
                )}
              </div>
              
              {localFusedData ? (
                <FusionResultDisplay data={localFusedData} />
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <div className="text-4xl mb-3">⚙️</div>
                  <div className="text-sm">融合处理中...</div>
                  <div className="text-xs mt-1">请等待数据融合完成</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 数据流可视化 */}
      {currentPhase === 'unified' && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-sm text-slate-300">融合数据流 → 阶段三</span>
          </div>
          <div className="relative h-4 rounded-lg bg-emerald-500/10 overflow-hidden border border-emerald-500/30">
            <motion.div 
              className="h-full w-24 bg-gradient-to-r from-emerald-400/80 to-emerald-300/60" 
              animate={streamCtrl} 
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          融合算法：时间对齐 + 空间插值 + 卡尔曼滤波 + 权重融合
        </p>
        <div className="flex items-center gap-3">
          {isPaused && <div className="text-xs text-slate-400">已暂停</div>}
          {!isAutoPlay && currentPhase === 'unified' && (
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary"
              onClick={() => onComplete?.()}
            >
              进入阶段三
            </button>
          )}
        </div>
      </div>
    </section>
  )

  function getPhaseLabel(phase) {
    const labels = {
      preprocessing: '预处理',
      fusing: '融合计算',
      unified: '完成'
    }
    return labels[phase] || '准备中'
  }
}

// 增强版数据流传输组件
function DataFlowArrows({ phase }) {
  const dataSourcesInfo = [
    { name: '卫星', color: '#4DA3FF', size: 'large', priority: 1 },
    { name: '地面站', color: '#1FD38A', size: 'medium', priority: 2 },
    { name: '雷达', color: '#FFA500', size: 'medium', priority: 3 },
    { name: '浮标', color: '#A16EFF', size: 'small', priority: 4 }
  ]

  return (
    <div className="relative w-24 h-40 flex flex-col justify-center">
      {/* 传输管道背景 */}
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-20 bg-gradient-to-r from-slate-700/20 to-amber-900/20 rounded-lg border border-slate-600/30"></div>
      
      {/* 数据流轨道 */}
      {dataSourcesInfo.map((source, i) => (
        <div key={source.name} className="relative mb-1">
          {/* 传输轨道 */}
          <div className="relative h-2 bg-slate-700/30 rounded-full overflow-hidden">
            {/* 轨道能量流 */}
            {(phase === 'fusing' || phase === 'unified') && (
              <motion.div
                className="absolute top-0 left-0 h-full w-2 rounded-full"
                style={{ backgroundColor: source.color + '40' }}
                animate={{ x: [-8, 96, -8] }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.2
                }}
              />
            )}
          </div>
          
          {/* 数据包传输 */}
          <div className="absolute top-0 left-0 h-2 w-full">
            {Array.from({ length: 3 }).map((_, packetIndex) => (
              <motion.div
                key={`${source.name}-packet-${packetIndex}`}
                className={`absolute rounded-full shadow-lg ${
                  source.size === 'large' ? 'w-3 h-3' : 
                  source.size === 'medium' ? 'w-2.5 h-2.5' : 'w-2 h-2'
                }`}
                style={{
                  backgroundColor: source.color,
                  boxShadow: `0 0 8px ${source.color}80`,
                  top: source.size === 'large' ? '-2px' : 
                       source.size === 'medium' ? '-1px' : '0px'
                }}
                initial={{ x: -12, opacity: 0, scale: 0 }}
                animate={phase === 'fusing' || phase === 'unified' ? {
                  x: [0, 48, 96],
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1, 1, 0.6]
                } : {}}
                transition={{
                  duration: 1.8,
                  repeat: phase === 'fusing' || phase === 'unified' ? Infinity : 0,
                  delay: i * 0.15 + packetIndex * 0.6,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          
          {/* 数据源标签 */}
          <motion.div
            className="absolute -left-16 top-0 text-xs text-slate-400 flex items-center"
            animate={phase === 'fusing' ? {
              opacity: [0.6, 1, 0.6]
            } : {}}
            transition={{ duration: 1.5, repeat: phase === 'fusing' ? Infinity : 0 }}
          >
            <div 
              className="w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: source.color }}
            />
            {source.name}
          </motion.div>
        </div>
      ))}
      
      {/* 汇聚指示器 */}
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
        <motion.div
          className="w-6 h-6 rounded-full border-2 border-amber-400/60 bg-amber-900/20 flex items-center justify-center"
          animate={phase === 'fusing' ? {
            scale: [1, 1.2, 1],
            borderColor: ['#fbbf2460', '#fbbf24ff', '#fbbf2460']
          } : {}}
          transition={{ duration: 1, repeat: phase === 'fusing' ? Infinity : 0 }}
        >
          <motion.div
            className="w-2 h-2 bg-amber-400 rounded-full"
            animate={phase === 'fusing' ? {
              opacity: [0.5, 1, 0.5]
            } : {}}
            transition={{ duration: 0.8, repeat: phase === 'fusing' ? Infinity : 0 }}
          />
        </motion.div>
      </div>
      
      {/* 数据流量统计 */}
      {(phase === 'fusing' || phase === 'unified') && (
        <motion.div
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-xs text-slate-400">数据流量</div>
          <motion.div
            className="text-xs text-emerald-300 font-medium"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {phase === 'fusing' ? '传输中...' : '完成'}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}



// 数据源卡片组件
function DataSourceCard({ source, data, isActive, phase }) {
  const Icon = source.icon
  
  return (
    <motion.div
      className={`relative p-3 rounded-lg border transition-all duration-300 overflow-hidden ${
        isActive 
          ? 'border-sky-400/60 bg-sky-400/10' 
          : 'border-slate-600/40 bg-slate-700/30'
      }`}
      animate={{
        scale: phase === 'preprocessing' ? [1, 1.02, 1] : 1,
        borderColor: isActive ? source.color + '60' : '#64748b60',
        boxShadow: isActive ? `0 0 20px ${source.color}30` : '0 0 0px transparent'
      }}
      transition={{ duration: 0.6, repeat: phase === 'preprocessing' ? Infinity : 0 }}
    >
      {/* 数据流动效果 */}
      {isActive && (
        <motion.div
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent"
          style={{ color: source.color }}
          animate={{ x: [-100, 100] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}
      
      <div className="flex items-center gap-2 mb-2">
        <motion.div 
          className="p-1.5 rounded relative" 
          style={{ backgroundColor: source.color + '20' }}
          animate={isActive ? {
            scale: [1, 1.1, 1],
            rotate: phase === 'fusing' ? [0, 5, -5, 0] : 0
          } : {}}
          transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
        >
          <Icon size={14} color={source.color} />
          {/* 脉冲效果 */}
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded border-2"
              style={{ borderColor: source.color + '40' }}
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>
        <span className="text-sm font-medium text-slate-200">{source.name}</span>
        
        {/* 状态指示器 */}
        <motion.div
          className={`ml-auto w-2 h-2 rounded-full ${
            isActive ? 'bg-emerald-400' : 'bg-slate-500'
          }`}
          animate={isActive ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
        />
      </div>
      
      <div className="text-xs text-slate-400 space-y-1">
        <div className="flex justify-between">
          <span>格式:</span>
          <motion.span 
            className="text-slate-300"
            animate={phase === 'preprocessing' ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 0.8, repeat: phase === 'preprocessing' ? Infinity : 0 }}
          >
            {source.format}
          </motion.span>
        </div>
        <div className="flex justify-between">
          <span>频率:</span>
          <motion.span 
            className="text-slate-300"
            animate={phase === 'preprocessing' ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 0.8, repeat: phase === 'preprocessing' ? Infinity : 0, delay: 0.1 }}
          >
            {source.frequency}
          </motion.span>
        </div>
        <div className="flex justify-between">
          <span>质量:</span>
          <motion.span 
            className="text-emerald-300 font-medium"
            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.2, repeat: isActive ? Infinity : 0 }}
          >
            {data.quality}%
          </motion.span>
        </div>
      </div>
      
      {/* 数据传输指示 */}
      {isActive && (
        <motion.div
          className="mt-2 pt-2 border-t border-slate-600/40"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1 h-1 rounded-full bg-current"
                style={{ color: source.color }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-slate-300">
                数据维度: {source.dataTypes.length}项
              </span>
            </div>
            {/* 传输状态 */}
            {(phase === 'fusing' || phase === 'unified') && (
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: source.color }}
                  animate={{
                    x: [0, 8, 16],
                    opacity: [1, 0.5, 0]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-xs text-emerald-300">→</span>
              </motion.div>
            )}
          </div>
          
          {/* 数据流速度指示 */}
          <div className="relative h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: source.color + '60' }}
              animate={phase === 'fusing' || phase === 'unified' ? {
                width: ['0%', '70%', '100%', '30%', '0%']
              } : phase === 'preprocessing' ? {
                width: ['0%', '40%', '0%']
              } : {}}
              transition={{ 
                duration: phase === 'fusing' ? 2.5 : 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
            {/* 传输脉冲 */}
            {(phase === 'fusing' || phase === 'unified') && (
              <motion.div
                className="absolute top-0 left-0 h-full w-4 bg-gradient-to-r from-transparent to-white/30"
                animate={{ x: [-16, 100] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
          
          {/* 实时数据包计数 */}
          {(phase === 'fusing' || phase === 'unified') && (
            <motion.div
              className="mt-1 text-xs text-slate-400 flex justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <span>传输包:</span>
              <motion.span
                className="text-emerald-300 font-mono"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {Math.floor(Math.random() * 999) + 100}
              </motion.span>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

// 融合处理器组件
function FusionProcessor({ phase, fusionCtrl, dataCount }) {
  return (
    <div className="relative">
      {/* 外层能量圈 */}
      {phase === 'fusing' && (
        <motion.div
          className="absolute inset-0 w-32 h-32 -top-4 -left-4 border-2 border-amber-400/30 rounded-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      
      {/* 主处理器 */}
      <motion.div
        className="relative w-24 h-24 rounded-xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-900/40 to-amber-700/40 shadow-lg flex items-center justify-center overflow-hidden"
        animate={{
          ...fusionCtrl,
          boxShadow: phase === 'fusing' ? 
            ['0 0 20px rgba(251, 191, 36, 0.3)', '0 0 40px rgba(251, 191, 36, 0.6)', '0 0 20px rgba(251, 191, 36, 0.3)'] : 
            '0 0 20px rgba(251, 191, 36, 0.3)'
        }}
        transition={{ duration: 1.5, repeat: phase === 'fusing' ? Infinity : 0 }}
      >
        {/* 内部能量流 */}
        {phase === 'fusing' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"
            animate={{ x: [-100, 100] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        
        <div className="relative w-12 h-12 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
          <motion.div 
            className="text-2xl"
            animate={phase === 'fusing' ? {
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            } : {}}
            transition={{ duration: 2, repeat: phase === 'fusing' ? Infinity : 0, ease: "linear" }}
          >
            ⚙️
          </motion.div>
        </div>
      </motion.div>
      
      {/* 数据流入指示 */}
      {phase === 'fusing' && (
        <>
          {/* 四个数据源的输入流 */}
          {[
            { color: '#4DA3FF', name: '卫星' },
            { color: '#1FD38A', name: '地面站' },
            { color: '#FFA500', name: '雷达' },
            { color: '#A16EFF', name: '浮标' }
          ].map((source, i) => (
            <div key={source.name}>
              {/* 主输入流 */}
              <motion.div
                className="absolute w-1 bg-gradient-to-b from-transparent"
                style={{
                  backgroundColor: source.color + '80',
                  left: `${15 + i * 18}%`,
                  top: '-45px',
                  height: '40px'
                }}
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scaleY: [0.6, 1.2, 0.6],
                  width: ['2px', '3px', '2px']
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15
                }}
              />
              
              {/* 数据包流入 */}
              {Array.from({ length: 2 }).map((_, packetIndex) => (
                <motion.div
                  key={`input-packet-${i}-${packetIndex}`}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: source.color,
                    boxShadow: `0 0 6px ${source.color}`,
                    left: `${14 + i * 18}%`,
                    top: '-50px'
                  }}
                  animate={{
                    y: [0, 45, 50],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2 + packetIndex * 0.8,
                    ease: "easeIn"
                  }}
                />
              ))}
            </div>
          ))}
          
          {/* 增强版数据汇聚粒子效果 */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2
            const radius = 15 + Math.random() * 10
            return (
              <motion.div
                key={`enhanced-particle-${i}`}
                className="absolute rounded-full"
                style={{
                  width: `${2 + Math.random() * 2}px`,
                  height: `${2 + Math.random() * 2}px`,
                  backgroundColor: ['#4DA3FF', '#1FD38A', '#FFA500', '#A16EFF'][i % 4],
                  left: '50%',
                  top: '50%'
                }}
                animate={{
                  x: [
                    Math.cos(angle) * radius,
                    Math.cos(angle) * (radius * 0.5),
                    0
                  ],
                  y: [
                    Math.sin(angle) * radius,
                    Math.sin(angle) * (radius * 0.5),
                    0
                  ],
                  scale: [0.8, 1, 0],
                  opacity: [0.3, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            )
          })}
          
          {/* 融合能量波纹 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={`wave-${i}`}
              className="absolute border border-amber-400/30 rounded-xl"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
              animate={{
                width: ['24px', '60px', '96px'],
                height: ['24px', '60px', '96px'],
                opacity: [0.8, 0.3, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
      
      {/* 输出数据流 */}
      {phase === 'unified' && (
        <>
          {/* 主输出流 */}
          <motion.div
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-8 bg-gradient-to-b from-emerald-400/80 to-transparent rounded-full"
            animate={{
              opacity: [0.6, 1, 0.6],
              scaleY: [0.9, 1.3, 0.9],
              scaleX: [0.8, 1.2, 0.8]
            }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          
          {/* 输出数据包 */}
          {Array.from({ length: 2 }).map((_, i) => (
            <motion.div
              key={`output-packet-${i}`}
              className="absolute left-1/2 transform -translate-x-1/2 w-3 h-2 rounded"
              style={{
                background: 'linear-gradient(45deg, #10b981, #06b6d4)',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                bottom: '-5px'
              }}
              animate={{
                y: [0, -20, -40],
                x: [0, 10, 20],
                opacity: [0, 1, 0],
                scale: [0.6, 1, 0.4]
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.9,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* 输出方向指示 */}
          <motion.div
            className="absolute -right-6 top-1/2 transform -translate-y-1/2 text-emerald-400"
            animate={{
              opacity: [0.5, 1, 0.5],
              x: [0, 3, 0]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="flex items-center text-xs">
              <span>→</span>
            </div>
          </motion.div>
        </>
      )}
      
      {/* 融合进度指示 */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <motion.div 
          className="text-xs text-slate-400 text-center"
          animate={phase === 'fusing' ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 1, repeat: phase === 'fusing' ? Infinity : 0 }}
        >
          {phase === 'preprocessing' ? '预处理中...' :
           phase === 'fusing' ? '融合计算中...' : '完成'}
        </motion.div>
      </div>
    </div>
  )
}

// 处理步骤组件
function ProcessStep({ phase, current, label }) {
  const isActive = current === phase
  const isCompleted = ['preprocessing', 'fusing', 'unified'].indexOf(current) > 
                     ['preprocessing', 'fusing', 'unified'].indexOf(phase)
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
      isActive ? 'bg-amber-400/20 border border-amber-400/40' : 
      isCompleted ? 'bg-emerald-400/10 border border-emerald-400/30' :
      'bg-slate-700/30 border border-slate-600/30'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isActive ? 'bg-amber-400' : 
        isCompleted ? 'bg-emerald-400' : 'bg-slate-500'
      }`} />
      <span className={`text-xs ${
        isActive ? 'text-amber-300' : 
        isCompleted ? 'text-emerald-300' : 'text-slate-400'
      }`}>
        {label}
      </span>
    </div>
  )
}

// 融合结果显示组件 - 更体现数据融合特性
function FusionResultDisplay({ data }) {
  return (
    <div className="space-y-4">
      {/* 融合权重可视化 */}
      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
        <div className="text-xs text-slate-400 mb-2">数据源权重分布</div>
        <div className="space-y-1">
          {[
            { name: '卫星', weight: 35, color: '#4DA3FF' },
            { name: '地面站', weight: 30, color: '#1FD38A' },
            { name: '雷达', weight: 20, color: '#FFA500' },
            { name: '浮标', weight: 15, color: '#A16EFF' }
          ].map((source, i) => (
            <div key={source.name} className="flex items-center gap-2">
              <div className="text-xs text-slate-300 w-12">{source.name}</div>
              <div className="flex-1 h-1.5 bg-slate-600/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: source.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${source.weight}%` }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                />
              </div>
              <div className="text-xs text-slate-400 w-8">{source.weight}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* 融合置信度矩阵 */}
      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
        <div className="text-xs text-slate-400 mb-2">交叉验证置信度</div>
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 16 }).map((_, i) => {
            const confidence = 0.7 + Math.random() * 0.25
            return (
              <motion.div
                key={i}
                className="h-4 rounded-sm border border-slate-600/40 flex items-center justify-center"
                style={{ 
                  backgroundColor: `rgba(${confidence > 0.9 ? '34,197,94' : 
                                           confidence > 0.8 ? '251,191,36' : '239,68,68'}, 0.3)` 
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <span className="text-[8px] text-slate-200">
                  {Math.round(confidence * 100)}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 融合算法状态 */}
      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
        <div className="text-xs text-slate-400 mb-2">融合算法状态</div>
        <div className="space-y-2">
          {[
            { name: '卡尔曼滤波', status: '收敛', accuracy: 94 },
            { name: '贝叶斯融合', status: '稳定', accuracy: 91 },
            { name: '神经网络', status: '训练', accuracy: 87 }
          ].map((algo, i) => (
            <motion.div
              key={algo.name}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    algo.status === '收敛' ? 'bg-emerald-400' : 
                    algo.status === '稳定' ? 'bg-amber-400' : 'bg-blue-400'
                  }`}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-xs text-slate-300">{algo.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{algo.status}</span>
                <span className="text-xs text-emerald-300">{algo.accuracy}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 最终融合输出 */}
      <div className="border-t border-slate-600/40 pt-3">
        <div className="text-xs text-slate-400 mb-2">统一输出数据</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <FusionDataItem label="温度" value={`${data.temperature}°C`} delay={0} confidence={data.fusionQuality} />
          <FusionDataItem label="湿度" value={`${data.humidity}%`} delay={0.1} confidence={data.fusionQuality} />
          <FusionDataItem label="气压" value={`${data.pressure}hPa`} delay={0.2} confidence={data.fusionQuality} />
          <FusionDataItem label="风速" value={`${data.windSpeed}m/s`} delay={0.3} confidence={data.fusionQuality} />
        </div>
      </div>

      {/* 总体融合质量 */}
      <div className="border-t border-slate-600/40 pt-3">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-slate-400">总体融合质量</span>
          <motion.span 
            className="text-emerald-300 font-medium"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {data.fusionQuality}%
          </motion.span>
        </div>
        <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${data.fusionQuality}%` }}
            transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
          />
          <motion.div
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent"
            animate={{ x: [-100, 100] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  )
}

// 融合数据项组件
function FusionDataItem({ label, value, delay = 0, confidence }) {
  return (
    <motion.div 
      className="bg-slate-700/30 rounded p-2 border border-slate-600/30 hover:border-slate-500/50 transition-colors relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(51, 65, 85, 0.4)' }}
    >
      {/* 置信度指示条 */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-600/30">
        <motion.div
          className="h-full bg-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ delay: delay + 0.3, duration: 0.5 }}
        />
      </div>
      
      <motion.div 
        className="text-slate-400 text-[10px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.2 }}
      >
        {label}
      </motion.div>
      <motion.div 
        className="text-slate-200 text-xs font-medium"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.2, duration: 0.3 }}
      >
        {value}
      </motion.div>
    </motion.div>
  )
}

// 原融合数据显示组件（保留作为备用）
function FusedDataDisplay({ data }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <DataItem label="温度" value={`${data.temperature}°C`} delay={0} />
        <DataItem label="湿度" value={`${data.humidity}%`} delay={0.1} />
        <DataItem label="气压" value={`${data.pressure}hPa`} delay={0.2} />
        <DataItem label="风速" value={`${data.windSpeed}m/s`} delay={0.3} />
        <DataItem label="降水" value={`${data.precipitation}mm/h`} delay={0.4} />
        <DataItem label="云量" value={`${data.cloudiness}%`} delay={0.5} />
      </div>
      
      <div className="border-t border-slate-600/40 pt-3">
        <motion.div 
          className="text-xs text-slate-400 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          海洋条件
        </motion.div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <DataItem label="海温" value={`${data.seaCondition.temperature}°C`} delay={0.7} />
          <DataItem label="波高" value={`${data.seaCondition.waveHeight}m`} delay={0.8} />
        </div>
      </div>
      
      <div className="border-t border-slate-600/40 pt-3">
        {/* 融合质量进度条 */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">融合质量</span>
            <motion.span 
              className="text-emerald-300 font-medium"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              {data.fusionQuality}%
            </motion.span>
          </div>
          <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${data.fusionQuality}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            />
            {/* 闪烁效果 */}
            <motion.div
              className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent"
              animate={{ x: [-100, 100] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
        
        {/* 置信度进度条 */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">置信度</span>
            <motion.span 
              className="text-amber-300 font-medium"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              {data.confidence}%
            </motion.span>
          </div>
          <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${data.confidence}%` }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            />
            {/* 闪烁效果 */}
            <motion.div
              className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-amber-300/30 to-transparent"
              animate={{ x: [-100, 100] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 数据项组件
function DataItem({ label, value, delay = 0 }) {
  return (
    <motion.div 
      className="bg-slate-700/30 rounded p-2 border border-slate-600/30 hover:border-slate-500/50 transition-colors"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(51, 65, 85, 0.4)' }}
    >
      <motion.div 
        className="text-slate-400 text-[10px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.2 }}
      >
        {label}
      </motion.div>
      <motion.div 
        className="text-slate-200 text-xs font-medium"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.2, duration: 0.3 }}
      >
        {value}
      </motion.div>
    </motion.div>
  )
}



