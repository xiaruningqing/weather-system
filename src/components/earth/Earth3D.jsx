/*
  Earth3D.jsx
  高性能教学用 3D 动态地球组件（React + react-three/fiber + drei）
  - 支持地表/大气辉光/云层动画
  - 卫星轨迹（圆/椭圆或 TLE via satellite.js）与卫星运动
  - 气象站标记（Html tooltip + 点击回调）
  - 交互：旋转/缩放、双击复位、时间缩放/播放控制、层开关
  - 可选后处理 Bloom/FXAA

  使用说明：
  import Earth3D from './components/earth/Earth3D'
  <Earth3D
    earthTextures={{ map: '/tex/earth_day.jpg', normal: '/tex/earth_normal.jpg', specular: '/tex/earth_spec.jpg', clouds: '/tex/clouds.png' }}
    satellites={[{ id:'sat1', name:'Aqua', color:'#60a5fa', orbitRadius:1.8, inclination:35, period:10000 }]} 
    stations={[{ id:'st1', name:'Beijing', lat:39.9, lon:116.4, data:{temp:25,hum:60}}]}
    timeScale={60}
    showClouds
    showSatellites
    showStations
    onStationClick={(s)=>console.log(s)}
    onSatelliteClick={(s)=>console.log(s)}
  />
*/

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as sat from 'satellite.js'

export default function Earth3D(props) {
  const {
    earthTextures = {},
    satellites = [],
    stations = [],
    dataCenter = { name: '数据中心', lat: 34.34, lon: 108.94 },
    initialTime = Date.now(),
    timeScale = 60, // 1 秒 = 60 秒模拟时长
    showClouds = true,
    showSatellites = true,
    showStations = true,
    onStationClick,
    onSatelliteClick,
    deviceFallback = 'auto', // auto | low | 2d
    postprocessing = true,
    height = 640,
    showLinks = true,
    focusCity, // { name, lat, lon }
    onClearFocus,
  } = props

  const [isPlaying, setIsPlaying] = useState(true)
  const [simTime, setSimTime] = useState(initialTime)

  return (
    <div className="glass" style={{ width: '100%', height, position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={[0, 0, 0, 0]} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={[0x8ec5ff, 0x0b1020, 0.25]} />
        <directionalLight position={[5, 3, 5]} intensity={1} />

        <TimeTicker isPlaying={isPlaying} timeScale={timeScale} setSimTime={setSimTime} />

        <EarthSurface textures={earthTextures} deviceFallback={deviceFallback} />
        {showClouds && <CloudLayer textures={earthTextures} />}
        <Atmosphere />
        <Stars radius={50} depth={20} count={2000} factor={2} saturation={0} fade speed={0.6} />

        {showSatellites && (
          <SatelliteLayer
            satellites={satellites}
            simTime={simTime}
            timeScale={timeScale}
            isPlaying={isPlaying}
            onSatelliteClick={onSatelliteClick}
          />
        )}

        {showStations && <StationLayer stations={stations} onStationClick={onStationClick} />}
        {showStations && <HeatmapLayer stations={stations} />}
        {showStations && <DataCenterMarker center={dataCenter} />}
        {focusCity && <FocusMarker city={focusCity} />}

        {/* 数据传输链路：卫星 ↔ 气象站 ↔ 数据中心 动态脉冲 */}
        {showLinks && showSatellites && showStations && (
          <LinkLayer satellites={satellites} stations={stations} dataCenter={dataCenter} simTime={simTime} timeScale={timeScale} isPlaying={isPlaying} focusCity={focusCity} />
        )}

        <CameraControls focusVec={focusCity ? latLonToXYZ(focusCity.lat, focusCity.lon, 1) : null} />

        {postprocessing && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.4} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
            <FXAA />
          </EffectComposer>
        )}
      </Canvas>

      <EarthHUD
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        timeScale={timeScale}
        simTime={simTime}
        focusCity={focusCity}
        onClearFocus={onClearFocus}
      />
    </div>
  )
}

// 基于 R3F 帧循环推进模拟时间
function TimeTicker({ isPlaying, timeScale, setSimTime }) {
  useFrame((_, delta) => {
    if (!isPlaying) return
    setSimTime((t) => t + delta * 1000 * timeScale)
  })
  return null
}

// 安全纹理加载（失败时返回 null，避免中断渲染）
function useSafeTexture(url) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    if (!url) { setTex(null); return }
    let mounted = true
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (t) => { if (!mounted) return; t.wrapS = t.wrapT = THREE.RepeatWrapping; setTex(t) },
      undefined,
      () => { console.warn('Texture load failed:', url); if (mounted) setTex(null) }
    )
    return () => { mounted = false }
  }, [url])
  return tex
}

// 地表
function EarthSurface({ textures, deviceFallback }) {
  const defaultMap = textures.map || '/assets/earth_day.jpg'
  const defaultNormal = textures.normal || 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'
  const defaultSpec = textures.specular || 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'

  const map = useSafeTexture(defaultMap)
  const normal = useSafeTexture(defaultNormal)
  const spec = useSafeTexture(defaultSpec)

  const segments = useMemo(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    const isLow = deviceFallback === 'low' || (deviceFallback === 'auto' && (window.innerWidth < 768 || isMobile))
    return isLow ? 24 : 64
  }, [deviceFallback])

  return (
    <mesh>
      <sphereGeometry args={[1, segments, segments]} />
      <meshPhongMaterial map={map || null} normalMap={normal || null} specularMap={spec || null} shininess={10} color={map ? 0xffffff : 0x0ea5e9} />
    </mesh>
  )
}

// 大气辉光（外层半透明，法线反转）
function Atmosphere() {
  return (
    <mesh scale={1.06}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        uniforms={{ c: { value: 0.5 }, p: { value: 4.5 } }}
        vertexShader={`
          varying vec3 vNormal;
          void main(){
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vNormal;
          void main(){
            float intensity = pow(0.6 - dot(vNormal, vec3(0.0,0.0,1.0)), 2.0);
            gl_FragColor = vec4(0.3,0.7,1.0,1.0) * intensity * 0.9;
          }
        `}
      />
    </mesh>
  )
}

// 云层：半径稍大，UV 偏移流动
function CloudLayer({ textures }) {
  const defaultClouds = 'https://threejs.org/examples/textures/planets/earth_clouds_2048.png'
  const clouds = useSafeTexture(textures.clouds || defaultClouds)
  const matRef = useRef()
  useFrame((_, delta) => {
    const m = matRef.current
    if (!m || !m.map) return
    m.map.offset.x = (m.map.offset.x + delta * 0.005) % 1
    m.map.offset.y = (m.map.offset.y + delta * 0.002) % 1
  })
  if (!clouds) return null
  return (
    <mesh scale={1.01}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshPhongMaterial
        ref={matRef}
        map={clouds}
        transparent
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// 卫星轨迹 + 卫星实体
function SatelliteLayer({ satellites, simTime, timeScale, isPlaying, onSatelliteClick }) {
  const group = useRef()
  const tmp = new THREE.Object3D()

  // 实例化卫星点（性能）
  const colors = useMemo(() => satellites.map((s) => new THREE.Color(s.color || '#7dd3fc')), [satellites])

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.children.forEach((child) => {
      if (child.userData && typeof child.userData.update === 'function') {
        child.userData.update(delta, simTime, timeScale, isPlaying)
      }
    })
  })

  return (
    <group ref={group}>
      {satellites.map((satellite, idx) => (
        <SingleSatellite
          key={satellite.id || idx}
          satellite={satellite}
          color={colors[idx]}
          onClick={onSatelliteClick}
        />
      ))}
    </group>
  )
}

function SingleSatellite({ satellite, color, onClick }) {
  const { camera } = useThree()
  const satRef = useRef()
  const lineRef = useRef()

  // 构建轨迹（简单圆/椭圆）
  const curve = useMemo(() => {
    if (satellite.tle1 && satellite.tle2) {
      // 若使用 TLE，此处只绘制近似圆轨道；精确位置用 satellite.js 动态算
      const r = satellite.orbitRadius || 2.0
      return new THREE.EllipseCurve(0, 0, r, r)
    } else {
      const r = satellite.orbitRadius || 2.0
      const eccY = satellite.eccentricityY || r
      return new THREE.EllipseCurve(0, 0, r, eccY)
    }
  }, [satellite])

  const points = useMemo(() => curve.getPoints(256).map((p) => new THREE.Vector3(p.x, 0, p.y)), [curve])
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])

  // 轨迹线材质（方向渐变模拟）：片段颜色沿顶点 alpha 变化
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.6 }), [color])

  // 更新卫星位置
  const update = (delta, simTime, timeScale, isPlaying) => {
    if (!isPlaying || !satRef.current) return
    const t = (simTime / 1000) * (1 / (satellite.period ? satellite.period : 10000))
    if (satellite.tle1 && satellite.tle2) {
      // TLE 计算
      const satrec = sat.twoline2satrec(satellite.tle1, satellite.tle2)
      const now = new Date(simTime)
      const pv = sat.propagate(satrec, now)
      const gmst = sat.gstime(now)
      const p = sat.eciToGeodetic(pv.position, gmst)
      // 经纬度到三维坐标（半径 = 1.5）
      const R = satellite.orbitRadius || 1.8
      const lat = p.latitude
      const lon = p.longitude
      const x = R * Math.cos(lat) * Math.cos(lon)
      const y = R * Math.sin(lat)
      const z = R * Math.cos(lat) * Math.sin(lon)
      satRef.current.position.set(x, y, z)
      const inc = satellite.inclination || 0
      satRef.current.rotation.z = THREE.MathUtils.degToRad(inc)
    } else {
      const R = satellite.orbitRadius || 1.8
      const inc = THREE.MathUtils.degToRad(satellite.inclination || 0)
      const angle = (t % 1) * Math.PI * 2
      const x = R * Math.cos(angle)
      const y = R * Math.sin(inc) * Math.sin(angle)
      const z = R * Math.cos(inc) * Math.sin(angle)
      satRef.current.position.set(x, y, z)
    }
  }

  useEffect(() => {
    // 将更新逻辑挂到父 group 调度
    if (satRef.current) satRef.current.parent.userData.update = update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <group>
      <line ref={lineRef} geometry={geom} material={lineMat} rotation={[Math.PI / 2, 0, THREE.MathUtils.degToRad(satellite.inclination || 0)]} />
      {/* 卫星实体 + 箭头 sprite */}
      <mesh ref={satRef} onClick={() => onClick?.(satellite)}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color={color} />
        {/* 轨道高度/名称标注 */}
        <Html distanceFactor={10} position={[0.06, 0.06, 0]} style={{ pointerEvents: 'none' }}>
          <div className="earth-label" style={{ color: '#7dd3fc' }}>
            {satellite.name || 'Satellite'} · {Math.round((satellite.orbitRadius || 1.8) * 350)}km
          </div>
        </Html>
      </mesh>
      {/* 箭头：在轨迹切点方向放置小条，随时间微动，增强方向感 */}
      <mesh position={points[Math.floor((Date.now()/500)%points.length)] || points[10]} rotation={[Math.PI / 2, 0, THREE.MathUtils.degToRad(satellite.inclination || 0)]}>
        <boxGeometry args={[0.02, 0.002, 0.002]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

// 气象站标记（经纬度->球面坐标）
function StationLayer({ stations, onStationClick }) {
  return (
    <group>
      {stations.map((s) => (
        <StationMarker key={s.id} station={s} onClick={onStationClick} />
      ))}
    </group>
  )
}

function latLonToXYZ(lat, lon, R = 1.01) {
  const la = THREE.MathUtils.degToRad(lat)
  const lo = THREE.MathUtils.degToRad(lon)
  const x = R * Math.cos(la) * Math.cos(lo)
  const y = R * Math.sin(la)
  const z = R * Math.cos(la) * Math.sin(lo)
  return new THREE.Vector3(x, y, z)
}

function StationMarker({ station, onClick }) {
  const p = useMemo(() => latLonToXYZ(station.lat, station.lon), [station])
  return (
    <group position={p.toArray()}>
      <mesh onPointerOver={(e) => (e.object.scale.set(1.5, 1.5, 1.5))} onPointerOut={(e) => (e.object.scale.set(1, 1, 1))} onClick={() => onClick?.(station)}>
        <sphereGeometry args={[0.012, 10, 10]} />
        <meshBasicMaterial color={'#38bdf8'} />
      </mesh>
      {/* 小屏或近距离时才显示文字，其他情况仅显示发光点以减少遮挡 */}
      <Html distanceFactor={12} position={[0.05, 0.05, 0]} style={{ pointerEvents: 'none' }} transform>
        <div className="earth-label" style={{ display: 'none' }}>
          {station.name} {station.data ? `${station.data.temp}°C/${station.data.hum}%` : ''}
        </div>
      </Html>
    </group>
  )
}

// 简易热力图层：根据站点密度渲染地面投影（加色叠加，教学示意）
function HeatmapLayer({ stations }) {
  const group = useRef()
  const points = useMemo(() => stations.map((s) => latLonToXYZ(s.lat, s.lon, 1.001)), [stations])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.08 }), [])
  const plane = useMemo(() => new THREE.SphereGeometry(0.06, 8, 8), [])

  useEffect(() => {
    if (!group.current) return
    group.current.clear()
    for (const p of points) {
      const m = new THREE.Mesh(plane, mat)
      m.position.copy(p)
      m.lookAt(0, 0, 0)
      group.current.add(m)
    }
  }, [points, mat, plane])

  return <group ref={group} />
}

// 城市高亮标记（联动）
function FocusMarker({ city }) {
  const p = useMemo(() => latLonToXYZ(city.lat, city.lon, 1.03), [city])
  const pulse = useRef(0)
  useFrame((_, delta) => { pulse.current = (pulse.current + delta) % 1 })
  return (
    <group position={p.toArray()}>
      <mesh>
        <sphereGeometry args={[0.02 + 0.01 * (0.5 + 0.5 * Math.sin(pulse.current * Math.PI * 2)), 16, 16]} />
        <meshBasicMaterial color={'#f59e0b'} />
      </mesh>
      <Html distanceFactor={10} position={[0.05, 0.05, 0]} style={{ pointerEvents: 'none' }}>
        <div className="earth-label earth-label--center">{city.name}</div>
      </Html>
    </group>
  )
}

// 数据中心标记
function DataCenterMarker({ center }) {
  const p = useMemo(() => latLonToXYZ(center.lat, center.lon, 1.02), [center])
  return (
    <group position={p.toArray()}>
      <mesh>
        <boxGeometry args={[0.04, 0.04, 0.04]} />
        <meshBasicMaterial color={'#f59e0b'} />
      </mesh>
      <Html distanceFactor={10} position={[0.05, 0.05, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200">
          {center.name}
        </div>
      </Html>
    </group>
  )
}

// 数据链路：从每颗卫星向最近的站点发射脉冲粒子（教学演示）
function LinkLayer({ satellites, stations, dataCenter, simTime, timeScale, isPlaying, focusCity }) {
  const groupRef = useRef()
  const pulseMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#22d3ee' }), [])
  const sphere = useMemo(() => new THREE.SphereGeometry(0.008, 8, 8), [])

  // 近似计算：根据 orbitRadius/inclination 求卫星位置（与 SingleSatellite 保持一致的简化）
  const getSatellitePos = (satellite) => {
    const t = (simTime / 1000) * (1 / (satellite.period ? satellite.period : 10000))
    const R = satellite.orbitRadius || 1.8
    const inc = THREE.MathUtils.degToRad(satellite.inclination || 0)
    const angle = (t % 1) * Math.PI * 2
    const x = R * Math.cos(angle)
    const y = R * Math.sin(inc) * Math.sin(angle)
    const z = R * Math.cos(inc) * Math.sin(angle)
    return new THREE.Vector3(x, y, z)
  }

  const getStationPos = (s) => latLonToXYZ(s.lat, s.lon, 1.02)
  const getCenterPos = useMemo(() => latLonToXYZ(dataCenter.lat, dataCenter.lon, 1.02), [dataCenter])
  // 若存在 focusCity，则让一颗“虚拟卫星”直接向该点发射粒子以增强联动感

  // 帧循环：更新一批脉冲点从卫星向最近站点移动
  const pulses = useRef([])
  useFrame((_, delta) => {
    if (!groupRef.current) return
    // 根据“链路强度”调节：随机带宽（高时更快更多，低时更少更红）
    const bandwidth = 0.5 + Math.random() * 0.5 // 0.5~1.0
    const packetLoss = Math.random() * 0.1 // 0~10%
    const speed = (1.0 + bandwidth) * 1.0 * (timeScale / 60)
    // 生成
    if (isPlaying && Math.random() < (0.04 + 0.08 * bandwidth) && satellites.length && stations.length) {
      const sat = satellites[Math.floor(Math.random() * satellites.length)]
      const satPos = getSatellitePos(sat)
      // 最近站
      let nearest = stations[0], nd = Infinity
      for (const st of stations) {
        const d = satPos.distanceTo(getStationPos(st))
        if (d < nd) { nd = d; nearest = st }
      }
      // 卫星 -> 站点
      pulses.current.push({
        pos: satPos.clone(),
        target: getStationPos(nearest),
        life: 1,
        color: new THREE.Color(packetLoss > 0.05 ? '#fb7185' : '#22d3ee'),
      })
      // 站点 -> 数据中心
      pulses.current.push({
        pos: getStationPos(nearest).clone(),
        target: getCenterPos.clone(),
        life: 1,
        color: new THREE.Color(packetLoss > 0.05 ? '#fb923c' : '#f59e0b'),
      })
    }
    // 联动城市：城市→最近站点→最近卫星（青色专色）
    if (isPlaying && focusCity && Math.random() < 0.2 && satellites.length && stations.length) {
      const cityPos = latLonToXYZ(focusCity.lat, focusCity.lon, 1.03)
      let nearest = stations[0], nd = Infinity
      for (const st of stations) {
        const d = cityPos.distanceTo(getStationPos(st))
        if (d < nd) { nd = d; nearest = st }
      }
      // 最近卫星（简化为随机一颗）
      const sat = satellites[Math.floor(Math.random() * satellites.length)]
      const satPos = getSatellitePos(sat)
      pulses.current.push({ pos: cityPos.clone(), target: getStationPos(nearest), life: 1, color: new THREE.Color('#22d3ee') })
      pulses.current.push({ pos: getStationPos(nearest).clone(), target: satPos.clone(), life: 1, color: new THREE.Color('#22d3ee') })
    }
    // 更新
    groupRef.current.clear()
    const survivors = []
    for (const p of pulses.current) {
      const dir = new THREE.Vector3().subVectors(p.target, p.pos).normalize()
      p.pos.addScaledVector(dir, delta * speed)
      p.life -= delta * 0.6
      if (p.life > 0 && p.pos.distanceTo(p.target) > 0.02) {
        const m = new THREE.Mesh(sphere, pulseMat.clone())
        m.material.color = p.color
        m.position.copy(p.pos)
        groupRef.current.add(m)
        survivors.push(p)
      }
    }
    pulses.current = survivors
  })

  return <group ref={groupRef} />
}

// 轨道/视角控制
function CameraControls({ focusVec }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef()
  useEffect(() => {
    const handler = () => {
      camera.position.set(0, 0, 3.2)
    }
    gl.domElement.addEventListener('dblclick', handler)
    return () => gl.domElement.removeEventListener('dblclick', handler)
  }, [camera, gl])
  // 聚焦动画：当传入 focusVec 时，缓动至该点
  useEffect(() => {
    if (!focusVec || !controlsRef.current) return
    const target = new THREE.Vector3(focusVec.x, focusVec.y, focusVec.z)
    const startPos = camera.position.clone()
    const startTarget = controlsRef.current.target.clone()
    const endTarget = target.clone().multiplyScalar(1.0)
    const endPos = target.clone().multiplyScalar(3.0)
    let t = 0
    let raf = 0
    const animate = () => {
      t = Math.min(1, t + 0.03)
      camera.position.lerpVectors(startPos, endPos, t)
      controlsRef.current.target.lerpVectors(startTarget, endTarget, t)
      controlsRef.current.update()
      if (t < 1) raf = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(raf)
  }, [focusVec, camera])
  return (
    <OrbitControls ref={controlsRef} enablePan={false} minDistance={2} maxDistance={6} zoomSpeed={0.6} rotateSpeed={0.6} />
  )
}

// HUD 控件：播放/暂停、时间标签
function EarthHUD({ isPlaying, setIsPlaying, timeScale, simTime, focusCity, onClearFocus }) {
  return (
    <div style={{ position: 'absolute', inset: 8, pointerEvents: 'none' }}>
      <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
        <button className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-200" onClick={() => setIsPlaying((p) => !p)}>
          {isPlaying ? '暂停' : '播放'}
        </button>
        <span className="text-xs text-slate-300">时间倍率 x{timeScale}</span>
        <span className="text-xs text-sky-300 ml-2">北京时间 {new Date(simTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</span>
        {focusCity && (
          <span className="text-xs text-amber-300 ml-2 flex items-center gap-2">
            当前联动：{focusCity.name}
            <button className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200" onClick={onClearFocus}>取消高亮</button>
          </span>
        )}
      </div>
      <div className="mt-2 text-[10px] text-slate-400" style={{ pointerEvents: 'none' }}>
        图例：<span style={{ color:'#22d3ee' }}>青色</span> 城市→站点/卫星，<span style={{ color:'#f59e0b' }}>橙色</span> 站点→中心
      </div>
    </div>
  )
}


