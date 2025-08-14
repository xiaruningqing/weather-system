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
      satellite: '#93c5fd', // 淡蓝色
      ground: '#86efac',     // 淡绿色
      radar: '#fdba74',      // 淡橙色
      buoy: '#c4b5fd'        // 淡紫色
    }
    return colorMap[type] || '#93c5fd'
  }
  
  const getMarkerColor = (type, occupied) => {
    if (occupied) {
      return 'border-slate-500 bg-slate-500/10'
    }
    const colorMap = {
      satellite: 'border-blue-300 bg-blue-300/20',
      ground: 'border-green-300 bg-green-300/20',
      radar: 'border-orange-300 bg-orange-300/20',
      buoy: 'border-purple-300 bg-purple-300/20'
    }
    return colorMap[type] || 'border-blue-300 bg-blue-300/20'
  }
  
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.15 // 轻微的脉动
  
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        zIndex: marker.key === 'satellite' ? 8 : 5, // 低于实际传感器的层级
        transform: marker.key === 'satellite' ? 'translate(-50%, -50%) scale(1.1)' : 'translate(-50%, -50%)',
        opacity: isOccupied ? 0.3 : 0.7 // 已占用的位置显示更淡
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
                size={16} 
                color={iconColor}
                style={{ 
                  filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.3))',
                  opacity: 0.8
                }}
              />
            )
          })()} 
        </div>
        
        {/* 预设位置的虚线圈 */}
        <div 
          className={`absolute rounded-full border-2 ${getMarkerColor(sensorType, isOccupied)} -z-10`}
          style={{
            width: '32px',
            height: '32px',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${pulseScale})`,
            borderStyle: 'dashed',
            opacity: isOccupied ? 0.2 : 0.6
          }}
        ></div>
        
        {/* 外层的缓和提示圈 */}
        {!isOccupied && (
          <div 
            className={`absolute rounded-full border ${getMarkerColor(sensorType, isOccupied).split(' ')[0]}`}
            style={{
              width: '48px',
              height: '48px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderStyle: 'dotted',
              opacity: 0.3 + Math.sin(pulsePhase * 2) * 0.2
            }}
          ></div>
        )}
        
        {/* 位置名称标签 */}
        <div 
          className="absolute text-xs whitespace-nowrap pointer-events-none"
          style={{
            left: marker.key === 'satellite' ? '120%' : '120%',
            top: '50%',
            transform: 'translateY(-50%)',
            color: getIconColor(sensorType, isOccupied),
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            opacity: isOccupied ? 0.4 : 0.8
          }}
        >
          <div className="font-medium">{marker.name}</div>
          <div className="text-[10px] opacity-70">{marker.description}</div>
        </div>
        
        {/* 拖放提示箭头 */}
        {!isOccupied && (
          <div 
            className="absolute"
            style={{
              left: '50%',
              top: '-30px',
              transform: 'translateX(-50%)',
              opacity: 0.4 + Math.sin(pulsePhase * 3) * 0.3
            }}
          >
            <div 
              className="text-xs"
              style={{
                color: getIconColor(sensorType, isOccupied),
                textShadow: '0 0 4px rgba(0,0,0,0.8)'
              }}
            >
              ↓
            </div>
          </div>
        )}
        
        {/* 卫星轨道指示 */}
        {marker.key === 'satellite' && !isOccupied && (
          <div 
            className="absolute rounded-full border border-blue-300/20"
            style={{
              width: '120px',
              height: '120px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderStyle: 'dashed',
              opacity: 0.3 + Math.sin(pulsePhase * 0.5) * 0.1
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
