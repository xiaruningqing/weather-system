import { useEffect, useRef } from 'react'

// 全屏粒子背景：50~80 粒子、蓝白半透明、缓慢移动、边缘反弹、响应窗口缩放
export default function ParticleBackground() {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particleCount = Math.floor(50 + Math.random() * 30) // 50~80
    const particles = []

    const colorPool = [
      'rgba(147, 197, 253, 0.55)', // blue-300
      'rgba(96, 165, 250, 0.55)',  // blue-400
      'rgba(226, 232, 240, 0.35)', // slate-200
      'rgba(125, 211, 252, 0.45)', // cyan-300
    ]

    const rand = (min, max) => Math.random() * (max - min) + min

    const state = {
      width: 0,
      height: 0,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    }

    function resize() {
      state.width = window.innerWidth
      state.height = window.innerHeight
      canvas.style.width = state.width + 'px'
      canvas.style.height = state.height + 'px'
      canvas.width = Math.floor(state.width * state.dpr)
      canvas.height = Math.floor(state.height * state.dpr)
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0)
    }

    function createParticles() {
      particles.length = 0
      for (let i = 0; i < particleCount; i += 1) {
        const radius = rand(1.2, 2.6)
        const speed = rand(0.12, 0.45) // 缓慢移动
        const angle = rand(0, Math.PI * 2)
        particles.push({
          x: rand(0, state.width),
          y: rand(0, state.height),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius,
          color: colorPool[Math.floor(rand(0, colorPool.length))],
          twinkleOffset: rand(0, Math.PI * 2),
        })
      }
    }

    function parseRgba(color) {
      // 期望格式：rgba(r, g, b, a)
      const m = color.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/)
      if (!m) return { r: 148, g: 163, b: 184, a: 0.5 }
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: Number(m[4]) }
    }

    function step() {
      // 背景渐变填充，保证与深色主题融合
      const gradient = ctx.createLinearGradient(0, 0, 0, state.height)
      gradient.addColorStop(0, 'rgba(2,6,23,1)') // slate-950 近似
      gradient.addColorStop(1, 'rgba(15,23,42,1)') // slate-900 近似
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, state.width, state.height)

      // 粒子更新与绘制
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // 边缘反弹
        if (p.x < p.radius) {
          p.x = p.radius
          p.vx *= -1
        } else if (p.x > state.width - p.radius) {
          p.x = state.width - p.radius
          p.vx *= -1
        }
        if (p.y < p.radius) {
          p.y = p.radius
          p.vy *= -1
        } else if (p.y > state.height - p.radius) {
          p.y = state.height - p.radius
          p.vy *= -1
        }

        // 轻微闪烁（呼吸），不过度影响性能
        const alphaPulse = 0.85 + 0.15 * Math.sin(p.twinkleOffset)
        p.twinkleOffset += 0.015

        ctx.beginPath()
        const { r, g, b, a } = parseRgba(p.color)
        const alpha = Math.max(0, Math.min(1, a * alphaPulse))
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(step)
    }

    // 初始化
    resize()
    createParticles()
    step()

    const onResize = () => {
      resize()
      createParticles()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 block w-full h-full"
      aria-hidden
    />
  )
}


