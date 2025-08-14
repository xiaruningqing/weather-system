import React, { useEffect, useState } from 'react'
import { FaSatellite, FaShip } from 'react-icons/fa'
import { MdHome, MdRadar } from 'react-icons/md'

// ===== 预设位置标记组件 =====
export default function PresetMarker({ marker }) {
  const [pulsePhase, setPulsePhase] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => prev + 0.05) // 慢速脉动
    }, 50)
    return () => clearInterval(interval)
  }, [])
  
  // 根据传感器类型设定位置（卫星在轨道上，其他在地面）
  let x, y, z = 1.0
  
  if (marker.key === 'satellite') {
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
  const sensorType = marker.key
  const isOccupied = marker.isOccupied
  
  const getMarkerIcon = (type) => {
    const iconMap = {
      satellite: FaSatellite,
      ground: MdHome,
      radar: MdRadar,
      buoy: FaShip
    }
    return iconMap[type] || FaSatellite
  }
  
  const getIconColor = (type, occupied) => {
    if (occupied) {
      return '#64748b' // 已占用显示灰色
    }
    const colorMap = {
      satellite: '#3b82f6', // 更亮的蓝色
      ground: '#10b981',     // 更亮的绿色
      radar: '#f59e0b',      // 更亮的橙色
      buoy: '#8b5cf6'        // 更亮的紫色
    }
    return colorMap[type] || '#3b82f6'
  }
  
  const getMarkerColor = (type, occupied) => {
    if (occupied) {
      return 'border-slate-500 bg-slate-500/10'
    }
    const colorMap = {
      satellite: 'border-blue-400 bg-blue-400/60',
      ground: 'border-green-400 bg-green-400/60',
      radar: 'border-orange-400 bg-orange-400/60',
      buoy: 'border-purple-400 bg-purple-400/60'
    }
    return colorMap[type] || 'border-blue-400 bg-blue-400/60'
  }
  
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.15 // 轻微的脉动
  
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        zIndex: marker.key === 'satellite' ? 8 : 5, // 低于实际传感器的层级
        transform: marker.key === 'satellite' ? 'translate(-50%, -50%) scale(1.2)' : 'translate(-50%, -50%) scale(1.1)',
        opacity: isOccupied ? 0.4 : 0.95 // 大幅提升可见性
      }}
    >
      {/* 主体图标 - 虚线样式 */}
      <div className="relative text-lg">
        <div className="flex items-center justify-center">
          {(() => {
            const IconComponent = getMarkerIcon(sensorType)
            const iconColor = getIconColor(sensorType, isOccupied)
            return (
              <IconComponent 
                size={24} 
                color={iconColor}
                style={{ 
                  filter: `drop-shadow(0 0 10px ${iconColor}) drop-shadow(0 0 20px ${iconColor}) drop-shadow(0 0 6px rgba(0,0,0,0.8))`,
                  opacity: 1,
                  fontWeight: 'bold'
                }}
              />
            )
          })()} 
        </div>
        
        {/* 预设位置的强化虚线圈 */}
        <div 
          className={`absolute rounded-full border-4 ${getMarkerColor(sensorType, isOccupied)} -z-10`}
          style={{
            width: '40px',
            height: '40px',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${pulseScale})`,
            borderStyle: 'dashed',
            opacity: isOccupied ? 0.3 : 0.9,
            boxShadow: `0 0 15px ${getIconColor(sensorType, isOccupied)}80, 0 0 30px ${getIconColor(sensorType, isOccupied)}50`
          }}
        ></div>
        
        {/* 外层的强化提示圈 */}
        {!isOccupied && (
          <div 
            className={`absolute rounded-full border-2 ${getMarkerColor(sensorType, isOccupied).split(' ')[0]}`}
            style={{
              width: '60px',
              height: '60px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderStyle: 'dotted',
              opacity: 0.6 + Math.sin(pulsePhase * 2) * 0.3,
              boxShadow: `0 0 20px ${getIconColor(sensorType, isOccupied)}60`
            }}
          ></div>
        )}
        
        {/* 位置名称标签 */}
        <div 
          className="absolute text-sm whitespace-nowrap pointer-events-none"
          style={{
            left: marker.key === 'satellite' ? '120%' : '120%',
            top: '50%',
            transform: 'translateY(-50%)',
            color: getIconColor(sensorType, isOccupied),
            textShadow: `0 0 8px rgba(0,0,0,1), 0 0 4px ${getIconColor(sensorType, isOccupied)}`,
            opacity: isOccupied ? 0.5 : 0.95
          }}
        >
          <div className="font-bold">{marker.name}</div>
          <div className="text-xs opacity-80">{marker.description}</div>
        </div>
        
        {/* 拖放提示箭头 */}
        {!isOccupied && (
          <div 
            className="absolute"
            style={{
              left: '50%',
              top: '-35px',
              transform: 'translateX(-50%)',
              opacity: 0.7 + Math.sin(pulsePhase * 3) * 0.3
            }}
          >
            <div 
              className="text-lg font-bold"
              style={{
                color: getIconColor(sensorType, isOccupied),
                textShadow: `0 0 10px rgba(0,0,0,1), 0 0 6px ${getIconColor(sensorType, isOccupied)}`
              }}
            >
              ↓
            </div>
          </div>
        )}
        
        {/* 卫星轨道指示 */}
        {marker.key === 'satellite' && !isOccupied && (
          <div 
            className="absolute rounded-full border-2 border-blue-400/60"
            style={{
              width: '140px',
              height: '140px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderStyle: 'dashed',
              opacity: 0.6 + Math.sin(pulsePhase * 0.5) * 0.2,
              boxShadow: `0 0 25px #3b82f680`
            }}
          ></div>
        )}
      </div>
    </div>
  )
}

// ===== 预设位置标记容器组件 =====
export function PresetMarkers({ presetMarkers }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-[90%] max-w-[520px] aspect-square">
        {presetMarkers.map((marker) => (
          <PresetMarker key={marker.id} marker={marker} />
        ))}
      </div>
    </div>
  )
}
