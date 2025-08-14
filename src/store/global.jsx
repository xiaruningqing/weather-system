import React, { createContext, useContext, useMemo, useState } from 'react'

const GlobalCtx = createContext(null)

export function GlobalProvider({ children }) {
  const [stageOneScore, setStageOneScore] = useState(0)
  const [selectedCity, setSelectedCity] = useState('北京')
  const [history, setHistory] = useState([]) // { t, real, pred }
  const [fusedData, setFusedData] = useState(null) // 阶段二的融合数据
  const [predictionResult, setPredictionResult] = useState(null) // 阶段三的预测结果

  const fusionWeight = useMemo(() => {
    // 将阶段一得分[0,30+]映射到融合权重[0.3,0.85]
    const s = Math.max(0, Math.min(30, stageOneScore))
    return Number((0.3 + (s / 30) * 0.55).toFixed(2))
  }, [stageOneScore])

  const value = {
    stageOneScore,
    setStageOneScore,
    selectedCity,
    setSelectedCity,
    history,
    pushHistory: (entry) => setHistory((prev) => [...prev.slice(-95), entry]),
    fusionWeight,
    fusedData,
    setFusedData,
    predictionResult,
    setPredictionResult,
  }
  return <GlobalCtx.Provider value={value}>{children}</GlobalCtx.Provider>
}

export function useGlobal() {
  const ctx = useContext(GlobalCtx)
  if (!ctx) throw new Error('useGlobal must be used within GlobalProvider')
  return ctx
}


