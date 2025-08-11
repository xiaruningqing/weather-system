import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import Globe3D from './Globe3D.jsx'

const SHAPES = ['square', 'circle', 'triangle']
const COLORS = ['#60a5fa', '#22d3ee', '#e2e8f0', '#93c5fd', '#7dd3fc']

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function genBlocks(n = 10) {
  return new Array(n).fill(0).map((_, i) => ({
    id: i,
    shape: SHAPES[i % SHAPES.length],
    color: COLORS[i % COLORS.length],
    ox: rand(-180, 180),
    oy: rand(-90, 90),
    delay: rand(0, 0.6),
  }))
}

export default function StageTwo({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const [blocks] = useState(() => genBlocks(12))
  const [unified, setUnified] = useState(false)
  const streamCtrl = useAnimationControls()

  // 自动流程：先汇聚，再统一颜色，3s 后进入阶段三
  useEffect(() => {
    if (isPaused) return
    const t1 = setTimeout(() => setUnified(true), Math.max(400, 1200 / Math.max(0.25, speedFactor)))
    let t2
    if (isAutoPlay) {
      t2 = setTimeout(() => onComplete?.(), Math.max(1200, 3000 / Math.max(0.25, speedFactor)))
    }
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2) }
  }, [isPaused, onComplete, isAutoPlay, speedFactor])

  useEffect(() => {
    if (isPaused) {
      streamCtrl.stop()
    } else if (unified) {
      streamCtrl.start({ x: ['0%', '100%'], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } })
    }
  }, [isPaused, unified, streamCtrl])

  return (
    <section className="min-h-[320px]">
      <h2 className="text-xl md:text-2xl font-semibold">阶段二 · 异构数据融合</h2>
      <p className="mt-1 text-slate-300">不同形状/颜色的数据块汇聚到“处理器”，统一成为标准化数据流</p>

      <div className="relative mt-5 h-56 glass overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* 处理器 + 数据块 */}
        <div className="relative z-10 flex items-center justify-center">
          <div className="w-20 h-20 rounded-xl border border-primary/50 bg-slate-900/60 shadow-glow flex items-center justify-center">
            <div className="w-10 h-10 rounded-lg border border-sky-400/60 bg-slate-800/60" />
          </div>
        </div>

        {/* 数据块：从周围偏移位置向中心收敛 */}
        {blocks.map((b) => (
          <motion.div
            key={b.id}
            className="absolute left-1/2 top-1/2"
            initial={{ x: b.ox, y: b.oy, opacity: 0.7, scale: 1 }}
            animate={{ x: 0, y: 0, opacity: 1, scale: unified ? 0.7 : 1 }}
            transition={{ delay: b.delay, type: 'spring', stiffness: 80, damping: 14 }}
            style={{ pointerEvents: 'none' }}
          >
            <Block shape={b.shape} color={unified ? '#38bdf8' : b.color} />
          </motion.div>
        ))}

        {/* 地球可视化 */}
        <div className="hidden md:block">
          <Globe3D height={220} />
        </div>
      </div>

      {/* 统一后的数据流可视化 */}
      {unified && (
        <div className="relative mt-3 h-3 rounded bg-sky-500/10 overflow-hidden border border-sky-500/30">
          <motion.div className="h-full w-16 bg-sky-300/60" animate={streamCtrl} />
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        说明：融合步骤包括时间对齐、空间配准、异常值处理、统一格式等
      </p>
      <div className="mt-2 flex items-center gap-3">
        {isPaused && <div className="text-xs text-slate-400">已暂停</div>}
        {!isAutoPlay && (
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary"
            onClick={() => onComplete?.()}
          >
            进入阶段三
          </button>
        )}
      </div>
    </section>
  )
}

function Block({ shape, color }) {
  const size = 14
  if (shape === 'circle') {
    return <div style={{ width: size, height: size, background: color, borderRadius: '9999px', boxShadow: '0 0 16px rgba(56,189,248,0.25)' }} />
  }
  if (shape === 'square') {
    return <div style={{ width: size, height: size, background: color, borderRadius: 3, boxShadow: '0 0 16px rgba(56,189,248,0.25)' }} />
  }
  // triangle
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid ${color}`,
        filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.35))',
      }}
    />
  )
}



