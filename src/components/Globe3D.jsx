import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// 简化版 3D 地球：保留用于 StageTwo 卡片展示，主高阶版本见 earth/Earth3D.jsx
export default function Globe3D({ height = 280, autoRotate = true }) {
  const wrapRef = useRef(null)
  const rendererRef = useRef(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, wrap.clientWidth / height, 0.1, 1000)
    camera.position.set(0, 0, 3.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(wrap.clientWidth, height)
    wrap.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 灯光
    const light = new THREE.DirectionalLight(0xffffff, 1.0)
    light.position.set(5, 3, 5)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0x88aaff, 0.2))

    // 地球
    const geo = new THREE.SphereGeometry(1, 48, 48)
    const mat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.1, roughness: 0.7 })
    const earth = new THREE.Mesh(geo, mat)
    scene.add(earth)

    // 大气辉光（外层半透明）
    const glowGeo = new THREE.SphereGeometry(1.05, 48, 48)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.08 })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    scene.add(glow)

    // 星点背景
    const starGeo = new THREE.BufferGeometry()
    const starCount = 800
    const positions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = -Math.random() * 20 - 5
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const starMat = new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.01 })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // 自适应
    function resize() {
      if (!rendererRef.current) return
      const w = wrap.clientWidth
      renderer.setSize(w, height)
      camera.aspect = w / height
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    function animate() {
      if (autoRotate) earth.rotation.y += 0.0022
      frameRef.current = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      ro.disconnect()
      renderer.dispose()
      wrap.removeChild(renderer.domElement)
      // 清理场景资源
      geo.dispose(); glowGeo.dispose(); starGeo.dispose()
      mat.dispose(); glowMat.dispose(); starMat.dispose()
    }
  }, [height, autoRotate])

  return <div ref={wrapRef} style={{ width: '100%', height }} />
}


