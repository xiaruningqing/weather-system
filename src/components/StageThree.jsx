import { useEffect, useMemo, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { useGlobal } from '../store/global.jsx'

/**
 * 阶段三：自主决策（天气因素权重调节）
 * 
 * 教学优化功能：
 * 1. 简化参数理解：将复杂的机器学习参数替换为直观的天气因素权重
 * 2. 实时数据流可视化：多源融合数据 → 特征聚合 → 权重计算 → 实时结果
 * 3. 智能计算过程动画：4步骤计算进度指示器，分步骤高亮活跃节点
 * 4. 天气因素权重调节：学生可调节湿度、气压、云量、降水对降雨概率的影响度
 * 5. 贡献度实时反馈：显示各因素对降雨概率的实际贡献分数和权重关系
 * 6. 教育引导提示：权重总和平衡提醒，预设方案快速体验不同配置效果
 * 7. 实时更新反馈：所有组件支持更新状态，显示脉冲效果和边框高亮
 */

// 简化的天气预测模型 - 基于融合数据和天气因素权重
function computeWeatherPrediction(fusedData, weatherWeights) {
  if (!fusedData) {
    // 使用默认值
    fusedData = {
      temperature: 16.5,
      humidity: 64,
      pressure: 1013,
      windSpeed: 13.5,
      precipitation: 3.9,
      cloudiness: 72
    }
  }

  const { humidityWeight, pressureWeight, cloudinessWeight, precipitationWeight } = weatherWeights
  
  // 基础预测计算
  let rainProb = 0
  let tempPred = fusedData.temperature
  let windPred = fusedData.windSpeed
  
  // 降雨概率预测 - 基于各天气因素的加权影响
  // 湿度因子：湿度越高越容易降雨 (0-100 -> 0-40分)
  const humidityContrib = (fusedData.humidity / 100) * 40 * humidityWeight
  
  // 气压因子：低气压容易降雨 (1013为标准，低于1010有利降雨，0-30分)
  const pressureContrib = Math.max(0, (1013 - fusedData.pressure)) * 0.6 * pressureWeight
  
  // 云量因子：云量越多越容易降雨 (0-100 -> 0-35分)
  const cloudinessContrib = (fusedData.cloudiness / 100) * 35 * cloudinessWeight
  
  // 当前降水因子：已有降水增加持续概率 (0-20mm/h -> 0-25分)
  const precipContrib = Math.min(25, fusedData.precipitation * 5) * precipitationWeight
  
  rainProb = humidityContrib + pressureContrib + cloudinessContrib + precipContrib
  
  // 温度预测 (简化趋势分析)
  tempPred += (fusedData.cloudiness > 70 ? -1.5 : 1.2)
  tempPred += (fusedData.windSpeed > 10 ? -0.8 : 0.5)
  
  // 风速预测 (简化动力学模型)
  windPred *= (1 + (fusedData.pressure - 1013) * 0.001)
  
  // 置信度计算：权重平衡度越好，置信度越高
  const weightSum = humidityWeight + pressureWeight + cloudinessWeight + precipitationWeight
  const weightBalance = 1 - Math.abs(weightSum - 1) // 权重总和接近1时平衡度高
  const confidence = Math.min(95, Math.max(70, 75 + weightBalance * 20))
  
  return {
    rainProbability: Math.max(0, Math.min(100, Math.round(rainProb))),
    temperature: Math.round(tempPred * 10) / 10,
    windSpeed: Math.round(windPred * 10) / 10,
    confidence: Math.round(confidence),
    // 返回各因素贡献值用于可视化
    contributions: {
      humidity: Math.round(humidityContrib),
      pressure: Math.round(pressureContrib), 
      cloudiness: Math.round(cloudinessContrib),
      precipitation: Math.round(precipContrib)
    }
  }
}

export default function StageThree({ onComplete, isPaused, isAutoPlay = true, speedFactor = 1 }) {
  const { fusedData, setPredictionResult } = useGlobal()
  const [changeTick, setChangeTick] = useState(0)
  const [isComputing, setIsComputing] = useState(false)
  const [computingStep, setComputingStep] = useState(0)
  const [dataFlowActive, setDataFlowActive] = useState(false)
  
  // 天气因素权重参数 - 学生可以调节这些权重来理解不同因素对降雨的影响
  const [weatherWeights, setWeatherWeights] = useState({
    humidityWeight: 0.35,      // 湿度影响权重 (0-1)
    pressureWeight: 0.25,      // 气压影响权重 (0-1) 
    cloudinessWeight: 0.30,    // 云量影响权重 (0-1)
    precipitationWeight: 0.10  // 当前降水影响权重 (0-1)
  })
  
  // 预测结果
  const prediction = useMemo(() => {
    return computeWeatherPrediction(fusedData, weatherWeights)
  }, [fusedData, weatherWeights])
  
  const gearCtrl = useAnimationControls()
  
  // 天气因素贡献度分析 - 直接从预测结果获取
  const weatherContributions = useMemo(() => {
    if (!prediction.contributions) return { humidity: 0, pressure: 0, cloudiness: 0, precipitation: 0 }
    return prediction.contributions
  }, [prediction.contributions])

  // 保存预测结果到全局状态
  useEffect(() => {
    setPredictionResult({
      ...prediction,
      weatherWeights,
      inputData: fusedData,
      timestamp: Date.now()
    })
  }, [prediction, weatherWeights, fusedData, setPredictionResult])

  // 变化脉冲：当融合数据或天气权重变化时触发一次动画
  useEffect(() => {
    setChangeTick((n) => n + 1)
    setDataFlowActive(true)
    
    // 模拟计算过程
    setIsComputing(true)
    setComputingStep(0)
    
    const computingTimer = setInterval(() => {
      setComputingStep(step => {
        if (step >= 3) {
          clearInterval(computingTimer)
          setIsComputing(false)
          return 0
        }
        return step + 1
      })
    }, 300)
    
    // 数据流动效果持续时间
    const flowTimer = setTimeout(() => {
      setDataFlowActive(false)
    }, 1500)
    
    return () => {
      clearInterval(computingTimer)
      clearTimeout(flowTimer)
    }
  }, [fusedData, weatherWeights])

  // 特征聚合：从多源融合数据提取、标准化并聚合为模型输入特征
  const aggregated = useMemo(() => {
    const d = fusedData || {
      temperature: 16.5,
      humidity: 64,
      pressure: 1013,
      windSpeed: 13.5,
      precipitation: 3.9,
      cloudiness: 72,
    }
    const moistureIndex = Math.round(d.humidity * 0.7 + Math.min(20, d.precipitation * 8)) // 0-100+
    const pressureAnomaly = Math.round(1013 - d.pressure) // 负值代表高压
    const convectionPotential = Math.round((d.cloudiness / 100) * 20 + Math.max(0, d.windSpeed - 6) * 1.2)
    const precipIntensityScaled = Math.round(Math.min(20, d.precipitation * 8))
    const cloudOpacity = Math.round(d.cloudiness)
    const aggregateScore = Math.max(
      0,
      Math.round(
        moistureIndex * 0.35 +
          Math.max(0, pressureAnomaly) * 1.2 +
          convectionPotential * 1.1 +
          precipIntensityScaled * 1.4 +
          cloudOpacity * 0.25
      )
    )
    return {
      features: { moistureIndex, pressureAnomaly, convectionPotential, precipIntensityScaled, cloudOpacity },
      aggregateScore,
    }
  }, [fusedData])

  // 自动 5 秒后进入阶段四
  useEffect(() => {
    if (isPaused || !isAutoPlay) return
    const timer = setTimeout(() => onComplete?.(), Math.max(1500, 5000 / Math.max(0.25, speedFactor)))
    return () => clearTimeout(timer)
  }, [isPaused, onComplete, isAutoPlay, speedFactor])

  // 预测动画
  useEffect(() => {
    if (isPaused) gearCtrl.stop()
    else gearCtrl.start({ rotate: 360, transition: { duration: 6, repeat: Infinity, ease: 'linear' } })
  }, [isPaused, gearCtrl])

  const updateWeatherWeight = (param, value) => {
    setWeatherWeights(prev => ({ ...prev, [param]: value }))
  }

  return (
    <section className="min-h-[480px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">阶段三 · 自主决策（模型预测）</h2>
          <p className="mt-1 text-slate-300">基于融合数据，通过调节模型参数进行智能天气预测</p>
        </div>
        <div className="text-sm text-slate-300 flex items-center gap-3">
          <span>输入数据源</span>
          <div className="text-emerald-300 font-semibold">阶段二融合结果</div>
        </div>
      </div>

      {/* 流程可视化：多源融合 → 特征聚合 → 预测模型 → 实时结果 */}
      <motion.div
        className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 relative overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* 数据流动背景效果 */}
        {dataFlowActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 via-sky-500/10 to-purple-500/10"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        )}
        
        <div className="flex items-center justify-between text-xs text-slate-300 relative z-10">
          <PipelineNode 
            label="多源融合数据" 
            accent="emerald" 
            pulseKey={changeTick}
            isActive={computingStep >= 0}
          />
          <PipelineArrow isActive={dataFlowActive && computingStep >= 1} />
          <PipelineNode 
            label="特征聚合" 
            accent="amber" 
            pulseKey={changeTick}
            isActive={computingStep >= 1}
          />
          <PipelineArrow isActive={dataFlowActive && computingStep >= 2} />
          <PipelineNode 
            label="预测模型" 
            accent="sky" 
            pulseKey={changeTick}
            isActive={computingStep >= 2}
          />
          <PipelineArrow isActive={dataFlowActive && computingStep >= 3} />
          <PipelineNode 
            label="实时结果" 
            accent="purple" 
            pulseKey={changeTick}
            isActive={computingStep >= 3}
          />
        </div>
        
        {/* 计算状态指示器 */}
        {isComputing && (
          <motion.div
            className="mt-2 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((step) => (
                <motion.div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    step <= computingStep ? 'bg-sky-400' : 'bg-slate-600'
                  }`}
                  animate={{
                    scale: step === computingStep ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: 0.3, repeat: step === computingStep ? Infinity : 0 }}
                />
              ))}
            </div>
            <span className="text-xs text-sky-300">智能计算中...</span>
          </motion.div>
        )}
      </motion.div>

      {/* 融合数据概览 */}
      {fusedData && (
        <motion.div
          className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* 数据变化波纹效果 */}
          <motion.div
            key={changeTick}
            className="absolute inset-0 rounded-xl border-2 border-emerald-400/30"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 1 }}
          />
          
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <motion.div 
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ 
                boxShadow: dataFlowActive 
                  ? ['0 0 0 0 rgba(52, 211, 153, 0.7)', '0 0 0 10px rgba(52, 211, 153, 0)']
                  : '0 0 0 0 rgba(52, 211, 153, 0)'
              }}
              transition={{ duration: 1, repeat: dataFlowActive ? Infinity : 0 }}
            />
            <span className="text-sm text-slate-300 font-medium">输入：融合数据</span>
            {dataFlowActive && (
              <motion.span 
                className="text-xs text-emerald-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                数据更新中...
              </motion.span>
            )}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs relative z-10">
            <DataInput 
              label="温度" 
              value={`${fusedData.temperature}°C`} 
              isUpdating={dataFlowActive}
            />
            <DataInput 
              label="湿度" 
              value={`${fusedData.humidity}%`} 
              isUpdating={dataFlowActive}
            />
            <DataInput 
              label="气压" 
              value={`${fusedData.pressure}hPa`} 
              isUpdating={dataFlowActive}
            />
            <DataInput 
              label="风速" 
              value={`${fusedData.windSpeed}m/s`} 
              isUpdating={dataFlowActive}
            />
            <DataInput 
              label="降水" 
              value={`${fusedData.precipitation}mm/h`} 
              isUpdating={dataFlowActive}
            />
            <DataInput 
              label="云量" 
              value={`${fusedData.cloudiness}%`} 
              isUpdating={dataFlowActive}
            />
          </div>
        </motion.div>
      )}

      {/* 特征聚合概览 */}
      <motion.div
        className="mt-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {/* 聚合计算波纹效果 */}
        <motion.div
          key={`${changeTick}-aggregated`}
          className="absolute inset-0 rounded-xl border-2 border-amber-400/30"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.05, opacity: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        />
        
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <motion.div 
            className="w-2 h-2 rounded-full bg-amber-400"
            animate={{ 
              boxShadow: isComputing && computingStep >= 1
                ? ['0 0 0 0 rgba(251, 191, 36, 0.7)', '0 0 0 10px rgba(251, 191, 36, 0)']
                : '0 0 0 0 rgba(251, 191, 36, 0)'
            }}
            transition={{ duration: 1, repeat: (isComputing && computingStep >= 1) ? Infinity : 0 }}
          />
          <span className="text-sm text-slate-300 font-medium">特征聚合（标准化与加权）</span>
          {isComputing && computingStep === 1 && (
            <motion.span 
              className="text-xs text-amber-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              特征提取中...
            </motion.span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs relative z-10">
          <DataInput 
            label="湿度-降水指数" 
            value={aggregated.features.moistureIndex} 
            isUpdating={isComputing && computingStep >= 1}
          />
          <DataInput 
            label="气压距平" 
            value={aggregated.features.pressureAnomaly} 
            isUpdating={isComputing && computingStep >= 1}
          />
          <DataInput 
            label="对流势能" 
            value={aggregated.features.convectionPotential} 
            isUpdating={isComputing && computingStep >= 1}
          />
          <DataInput 
            label="降水强度(归一)" 
            value={aggregated.features.precipIntensityScaled} 
            isUpdating={isComputing && computingStep >= 1}
          />
          <DataInput 
            label="云层不透明度" 
            value={aggregated.features.cloudOpacity} 
            isUpdating={isComputing && computingStep >= 1}
          />
        </div>
        <motion.div 
          className="mt-2 p-2 bg-slate-700/30 rounded border border-slate-600/30 flex items-center justify-between relative"
          animate={{
            borderColor: isComputing && computingStep >= 1 
              ? ['rgba(251, 191, 36, 0.3)', 'rgba(251, 191, 36, 0.6)', 'rgba(251, 191, 36, 0.3)']
              : 'rgba(251, 191, 36, 0.3)'
          }}
          transition={{ duration: 0.8, repeat: (isComputing && computingStep >= 1) ? Infinity : 0 }}
        >
          <span className="text-xs text-slate-400">聚合得分</span>
          <motion.span 
            className="text-sm font-semibold text-amber-300"
            key={aggregated.aggregateScore}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3 }}
          >
            {aggregated.aggregateScore}
          </motion.span>
        </motion.div>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：天气因素权重调节 */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <span className="text-sky-300 font-semibold">天气因素权重</span>
            </div>
            
            <div className="text-xs text-slate-400 mb-3 p-2 bg-slate-700/30 rounded">
              💡 调节不同天气因素对降雨概率的影响程度
            </div>
            
            <WeatherWeightSlider
              label="湿度影响度"
              min={0}
              max={1}
              step={0.05}
              value={weatherWeights.humidityWeight}
              onChange={(v) => updateWeatherWeight('humidityWeight', v)}
              description="湿度越高，降雨可能性越大"
              color="text-blue-300"
            />
            
            <WeatherWeightSlider
              label="气压影响度"
              min={0}
              max={1}
              step={0.05}
              value={weatherWeights.pressureWeight}
              onChange={(v) => updateWeatherWeight('pressureWeight', v)}
              description="低气压有利于降雨形成"
              color="text-green-300"
            />
            
            <WeatherWeightSlider
              label="云量影响度"
              min={0}
              max={1}
              step={0.05}
              value={weatherWeights.cloudinessWeight}
              onChange={(v) => updateWeatherWeight('cloudinessWeight', v)}
              description="云量多容易产生降水"
              color="text-yellow-300"
            />
            
            <WeatherWeightSlider
              label="降水影响度"
              min={0}
              max={1}
              step={0.05}
              value={weatherWeights.precipitationWeight}
              onChange={(v) => updateWeatherWeight('precipitationWeight', v)}
              description="当前降水影响持续概率"
              color="text-purple-300"
            />
            
            {/* 权重总和提示 */}
            <div className="mt-3 p-2 bg-slate-700/30 rounded border border-slate-600/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">权重总和</span>
                <span className={`font-medium ${
                  Math.abs((weatherWeights.humidityWeight + weatherWeights.pressureWeight + 
                           weatherWeights.cloudinessWeight + weatherWeights.precipitationWeight) - 1) < 0.1 
                  ? 'text-green-300' : 'text-yellow-300'
                }`}>
                  {(weatherWeights.humidityWeight + weatherWeights.pressureWeight + 
                    weatherWeights.cloudinessWeight + weatherWeights.precipitationWeight).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                建议总和接近1.0以获得最佳预测效果
              </div>
            </div>
            
            {/* 预设配置 */}
            <div className="mt-4 space-y-2">
              <div className="text-xs text-slate-400 mb-2">预设权重方案</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <PresetButton label="均衡预测" onClick={() => setWeatherWeights({humidityWeight:0.25, pressureWeight:0.25, cloudinessWeight:0.25, precipitationWeight:0.25})} />
                <PresetButton label="湿度主导" onClick={() => setWeatherWeights({humidityWeight:0.5, pressureWeight:0.2, cloudinessWeight:0.2, precipitationWeight:0.1})} />
                <PresetButton label="气压敏感" onClick={() => setWeatherWeights({humidityWeight:0.2, pressureWeight:0.5, cloudinessWeight:0.2, precipitationWeight:0.1})} />
                <PresetButton label="云量关注" onClick={() => setWeatherWeights({humidityWeight:0.2, pressureWeight:0.2, cloudinessWeight:0.5, precipitationWeight:0.1})} />
              </div>
            </div>
          </div>
        </div>

        {/* 中：预测结果 */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 relative">
            {/* 预测计算波纹效果 */}
            <motion.div
              key={`${changeTick}-prediction`}
              className="absolute inset-0 rounded-xl border-2 border-sky-400/30"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.05, opacity: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
            />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <motion.div 
                className="w-3 h-3 rounded-full bg-sky-400"
                animate={{ 
                  boxShadow: isComputing && computingStep >= 2
                    ? ['0 0 0 0 rgba(56, 189, 248, 0.7)', '0 0 0 12px rgba(56, 189, 248, 0)']
                    : '0 0 0 0 rgba(56, 189, 248, 0)'
                }}
                transition={{ duration: 1, repeat: (isComputing && computingStep >= 2) ? Infinity : 0 }}
              />
              <span className="text-sky-300 font-semibold">预测结果</span>
              {isComputing && computingStep === 2 && (
                <motion.span 
                  className="text-xs text-sky-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  模型预测中...
                </motion.span>
              )}
            </div>
            
            <div className="flex items-center justify-center h-32 mb-4 relative z-10">
              <motion.div className="relative">
                <motion.div 
                  className="w-24 h-24 rounded-full border-4 border-sky-400/60 border-t-transparent" 
                  animate={gearCtrl} 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs text-slate-400">降雨概率</div>
                    <motion.div 
                      className="text-lg font-bold text-sky-300"
                      key={prediction.rainProbability}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      {prediction.rainProbability}%
                    </motion.div>
                  </div>
                </div>
                {/* 实时变化脉冲 */}
                <motion.div
                  key={changeTick}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.8 }}
                  className="absolute -right-2 -top-2 w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                  title="融合/参数变化已生效"
                />
                
                {/* 计算进度环 */}
                {isComputing && computingStep >= 2 && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </motion.div>
            </div>
            
            <div className="space-y-3 relative z-10">
              <PredictionResult 
                label="未来降雨概率" 
                value={`${prediction.rainProbability}%`} 
                color="text-sky-300"
                isUpdating={isComputing && computingStep >= 2}
              />
              <PredictionResult 
                label="预测温度" 
                value={`${prediction.temperature}°C`} 
                color="text-orange-300"
                isUpdating={isComputing && computingStep >= 2}
              />
              <PredictionResult 
                label="预测风速" 
                value={`${prediction.windSpeed}m/s`} 
                color="text-emerald-300"
                isUpdating={isComputing && computingStep >= 2}
              />
              <PredictionResult 
                label="模型置信度" 
                value={`${prediction.confidence}%`} 
                color="text-purple-300"
                isUpdating={isComputing && computingStep >= 2}
              />
            </div>
          </div>
        </div>

        {/* 右：因素贡献度分析 */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="text-sky-300 font-semibold">因素贡献度分析</span>
            </div>
            
            <div className="text-xs text-slate-400 mb-3 p-2 bg-slate-700/30 rounded">
              📊 各天气因素对当前降雨概率的实际贡献分数
            </div>
            
            <div className="space-y-3">
              <ContributionBar 
                label="湿度贡献" 
                value={weatherContributions.humidity} 
                max={40} 
                color="#60a5fa"
                weight={weatherWeights.humidityWeight}
              />
              <ContributionBar 
                label="气压贡献" 
                value={weatherContributions.pressure} 
                max={30} 
                color="#34d399"
                weight={weatherWeights.pressureWeight}
              />
              <ContributionBar 
                label="云量贡献" 
                value={weatherContributions.cloudiness} 
                max={35} 
                color="#fbbf24"
                weight={weatherWeights.cloudinessWeight}
              />
              <ContributionBar 
                label="降水贡献" 
                value={weatherContributions.precipitation} 
                max={25} 
                color="#a78bfa"
                weight={weatherWeights.precipitationWeight}
              />
            </div>
            
            <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">总贡献分数</div>
              <div className="text-lg font-semibold text-emerald-300">
                {weatherContributions.humidity + weatherContributions.pressure + 
                 weatherContributions.cloudiness + weatherContributions.precipitation} 分
              </div>
              <div className="text-xs text-slate-500 mt-1">
                = 降雨概率 {prediction.rainProbability}%
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">模型置信度</div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-200">{prediction.confidence}%</div>
                <div className="flex-1 h-1 bg-slate-600 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.confidence}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {isPaused && <div className="text-xs text-slate-400">已暂停</div>}
        {!isAutoPlay && (
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary"
            onClick={() => onComplete?.()}
          >
            进入阶段四
          </button>
        )}
      </div>
    </section>
  )
}

// 数据输入显示组件
function DataInput({ label, value, isUpdating = false }) {
  return (
    <motion.div 
      className="bg-slate-700/30 rounded p-2 border border-slate-600/30 relative"
      animate={{
        borderColor: isUpdating 
          ? ['rgba(148, 163, 184, 0.3)', 'rgba(34, 197, 94, 0.6)', 'rgba(148, 163, 184, 0.3)']
          : 'rgba(148, 163, 184, 0.3)'
      }}
      transition={{ duration: 0.8, repeat: isUpdating ? Infinity : 0 }}
    >
      <div className="text-slate-400 text-[10px]">{label}</div>
      <motion.div 
        className="text-slate-200 text-xs font-medium"
        key={value}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.div>
      {isUpdating && (
        <motion.div
          className="absolute top-0 right-0 w-1 h-1 bg-emerald-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

// 天气权重滑块组件
function WeatherWeightSlider({ label, min, max, step, value, onChange, description, color = "text-slate-300" }) {
  const percentage = ((value - min) / (max - min)) * 100
  
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
        <span className={color}>{label}</span>
        <span className="text-slate-200 font-medium">{value.toFixed(2)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-amber-400 mb-1"
        />
        {/* 权重强度指示器 */}
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
          <span>弱</span>
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-300 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span>强</span>
        </div>
      </div>
      <div className="text-xs text-slate-400">{description}</div>
    </div>
  )
}

// 预测结果组件
function PredictionResult({ label, value, color, isUpdating = false }) {
  return (
    <motion.div 
      className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30 relative"
      animate={{
        borderColor: isUpdating 
          ? ['rgba(148, 163, 184, 0.3)', 'rgba(56, 189, 248, 0.6)', 'rgba(148, 163, 184, 0.3)']
          : 'rgba(148, 163, 184, 0.3)'
      }}
      transition={{ duration: 0.8, repeat: isUpdating ? Infinity : 0 }}
    >
      <span className="text-xs text-slate-400">{label}</span>
      <motion.span 
        className={`text-sm font-medium ${color}`}
        key={value}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.span>
      {isUpdating && (
        <motion.div
          className="absolute top-1 right-1 w-1 h-1 bg-sky-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

// 贡献度条形图组件
function ContributionBar({ label, value, max, color, weight }) {
  const percentage = Math.min(100, (Math.abs(value) / max) * 100)
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          {label}
          {weight && (
            <span className="text-xs text-slate-500">
              (权重: {weight.toFixed(2)})
            </span>
          )}
        </span>
        <span className="text-slate-300 font-medium">{value > 0 ? '+' : ''}{value} 分</span>
      </div>
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: 0.2, duration: 0.8 }}
        />
        {/* 权重强度指示 */}
        {weight && (
          <motion.div
            className="absolute top-0 right-0 h-full w-1 bg-white/30 rounded-r-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: weight > 0.3 ? 0.8 : 0.3 }}
            transition={{ duration: 0.3 }}
            title={`权重: ${weight.toFixed(2)}`}
          />
        )}
      </div>
    </div>
  )
}

function PresetButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

// 流程节点组件
function PipelineNode({ label, accent, pulseKey, isActive = false }) {
  const accentColors = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400', 
    sky: 'bg-sky-400',
    purple: 'bg-purple-400'
  }
  
  return (
    <motion.div
      key={pulseKey}
      initial={{ scale: 1 }}
      animate={{ 
        scale: [1, 1.05, 1],
        boxShadow: isActive 
          ? ['0 0 0 0 rgba(148, 163, 184, 0.1)', '0 0 20px 5px rgba(148, 163, 184, 0.3)', '0 0 0 0 rgba(148, 163, 184, 0.1)']
          : '0 0 0 0 rgba(148, 163, 184, 0)'
      }}
      transition={{ 
        scale: { duration: 0.5 },
        boxShadow: { duration: 1, repeat: isActive ? Infinity : 0 }
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 relative ${
        isActive ? 'border-slate-400/70' : ''
      }`}
    >
      <motion.div 
        className={`w-2 h-2 rounded-full ${accentColors[accent] || 'bg-slate-400'}`}
        animate={{
          boxShadow: isActive && accent === 'emerald'
            ? ['0 0 0 0 rgba(52, 211, 153, 0)', '0 0 8px 2px rgba(52, 211, 153, 0.6)']
            : isActive && accent === 'amber'
            ? ['0 0 0 0 rgba(251, 191, 36, 0)', '0 0 8px 2px rgba(251, 191, 36, 0.6)']
            : isActive && accent === 'sky'
            ? ['0 0 0 0 rgba(56, 189, 248, 0)', '0 0 8px 2px rgba(56, 189, 248, 0.6)']
            : isActive && accent === 'purple'
            ? ['0 0 0 0 rgba(168, 85, 247, 0)', '0 0 8px 2px rgba(168, 85, 247, 0.6)']
            : '0 0 0 0 transparent'
        }}
        transition={{ duration: 0.8, repeat: isActive ? Infinity : 0, repeatType: "reverse" }}
      />
      <span className={`text-xs font-medium ${isActive ? 'text-slate-200' : 'text-slate-300'}`}>
        {label}
      </span>
      {isActive && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

// 流程箭头组件
function PipelineArrow({ isActive = false }) {
  return (
    <div className="flex items-center relative">
      <motion.div 
        className={`w-6 h-px ${isActive ? 'bg-cyan-400' : 'bg-slate-600'}`}
        animate={{
          opacity: isActive ? [0.5, 1, 0.5] : 1
        }}
        transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
      />
      <motion.div 
        className={`w-0 h-0 border-l-[4px] border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ${
          isActive ? 'border-l-cyan-400' : 'border-l-slate-600'
        }`}
        animate={{
          opacity: isActive ? [0.5, 1, 0.5] : 1
        }}
        transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
      />
      {isActive && (
        <motion.div
          className="absolute inset-0 flex items-center"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 10, opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <div className="w-1 h-1 bg-cyan-300 rounded-full"></div>
        </motion.div>
      )}
    </div>
  )
}



