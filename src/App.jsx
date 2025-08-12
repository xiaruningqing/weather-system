import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ParticleBackground from './components/ParticleBackground.jsx'
import { GlobalProvider } from './store/global.jsx'
import StageOne from './components/StageOne.jsx'
import StageTwo from './components/StageTwo.jsx'
import StageThree from './components/StageThree.jsx'
import StageFour from './components/StageFour.jsx'
import StageController from './components/StageController.jsx'
import ComparisonTable from './components/ComparisonTable.jsx'
import SettingsBar from './components/SettingsBar.jsx'
import TeachingHint from './components/TeachingHint.jsx'
import PDFSummaryButton from './components/PDFSummaryButton.jsx'

export default function App() {
  const [currentStage, setCurrentStage] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [speedFactor, setSpeedFactor] = useState(1)
  const [showParticles, setShowParticles] = useState(true)

  const handleNextStage = useCallback(() => {
    setCurrentStage((prev) => (prev % 4) + 1)
  }, [])

  const handlePrevStage = useCallback(() => {
    setCurrentStage((prev) => (prev - 2 + 4) % 4 + 1)
  }, [])

  // 键盘快捷键：←/→ 切换，Space 暂停
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'ArrowRight') handleNextStage()
      else if (e.key === 'ArrowLeft') handlePrevStage()
      else if (e.code === 'Space') setIsPaused((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNextStage, handlePrevStage])

  const StageView = useMemo(() => {
    const common = { onComplete: handleNextStage, isPaused, isAutoPlay, speedFactor }
    switch (currentStage) {
      case 1:
        return <StageOne {...common} />
      case 2:
        return <StageTwo {...common} />
      case 3:
        return <StageThree {...common} />
      case 4:
        return <StageFour {...common} />
      default:
        return null
    }
  }, [currentStage, handleNextStage, isPaused])

  return (
    <GlobalProvider>
    <div className="relative min-h-screen overflow-hidden">
      {showParticles && <ParticleBackground />}

      <header className="relative z-10 container mx-auto px-6 pt-8">
        <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">
          天气预测数智系统教学演示平台
        </h1>
        <p className="mt-2 text-slate-300">
          从多源感知 → 异构融合 → 自主决策 → 动态优化的端到端演示
        </p>
        <div className="mt-3">
          <TeachingHint stage={currentStage} />
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-6">
        <div className="glass p-4 md:p-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {StageView}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4">
          <StageController
            currentStage={currentStage}
            onSelectStage={setCurrentStage}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((p) => !p)}
            onPrev={handlePrevStage}
            onNext={handleNextStage}
          />
        </div>

        <div className="mt-4">
          <SettingsBar
            isAutoPlay={isAutoPlay}
            onToggleAutoPlay={() => setIsAutoPlay((v) => !v)}
            speedFactor={speedFactor}
            onChangeSpeed={setSpeedFactor}
            showParticles={showParticles}
            onToggleParticles={() => setShowParticles((v) => !v)}
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-300">传统与数智系统对比</div>
            <PDFSummaryButton selector="main" />
          </div>
          <ComparisonTable />
        </div>
      </main>
    </div>
    </GlobalProvider>
  )
}



