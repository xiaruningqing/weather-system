import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'

export default function ComparisonTable() {
  const [isExpanded, setIsExpanded] = useState(false)
  const rows = [
    {
      field: '数据来源',
      traditional: '单一/有限来源',
      smart: '地面 + 高空 + 卫星等多源融合',
      tipT: '传统：常依赖单一或少量测站，覆盖有限，空间/时间分辨率不足',
      tipS: '数智：地面/高空/卫星遥感等多源数据叠加，覆盖广，分辨率高',
    },
    {
      field: '数据处理',
      traditional: '规则/人工为主',
      smart: '自动化清洗、对齐、统一格式',
      tipT: '传统：各源数据格式异构、时间轴不一致，对齐成本高',
      tipS: '数智：自动进行时空配准、异常检测、去噪与格式标准化',
    },
    {
      field: '决策效率',
      traditional: '批处理、周期长',
      smart: '近实时、可交互',
      tipT: '传统：结果更新慢，难以快速响应突发天气',
      tipS: '数智：短周期增量更新，交互式试验不同输入与情境',
    },
    {
      field: '自我优化能力',
      traditional: '弱/需要大量人工干预',
      smart: '持续学习，基于误差动态优化',
      tipT: '传统：模型更新依赖人工调参，周期长',
      tipS: '数智：闭环学习，通过误差反传快速优化参数',
    },
  ]

  const [tip, setTip] = useState({ visible: false, text: '', x: 0, y: 0 })
  const wrapRef = useRef(null)

  const showTip = (text, e) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    setTip({
      visible: true,
      text,
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top + 10,
    })
  }

  const hideTip = () => setTip((t) => ({ ...t, visible: false }))

  return (
    <motion.div 
      className="glass overflow-hidden relative" 
      ref={wrapRef} 
      onMouseLeave={hideTip}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 表格标题和切换按钮 */}
      <motion.div 
        className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.3)' }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <BarChart3 size={16} className="text-sky-400" />
          <span className="text-sm text-slate-300 font-medium">传统天气预测系统 vs 数智系统</span>
        </div>
        <motion.div
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-xs">{isExpanded ? '收起' : '展开'}</span>
          <ChevronDown size={16} />
        </motion.div>
      </motion.div>

      {/* 表格内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <motion.div 
              className="overflow-x-auto"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <table className="w-full text-sm">
                <motion.thead 
                  className="bg-slate-800/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-300 border-r border-slate-700/30">阶段</th>
                    <th className="text-left px-4 py-3 font-medium text-orange-300 border-r border-slate-700/30">传统系统</th>
                    <th className="text-left px-4 py-3 font-medium text-emerald-300">数智系统</th>
                  </tr>
                </motion.thead>
                <tbody>
                  {rows.map((r, index) => (
                    <motion.tr 
                      key={r.field} 
                      className="border-t border-slate-800/60 hover:bg-slate-800/20 transition-colors group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                      whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.2)' }}
                    >
                      <td className="px-4 py-3 text-slate-200 font-medium border-r border-slate-700/20 group-hover:text-white transition-colors">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-sky-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                          {r.field}
                        </motion.div>
                      </td>
                      <motion.td
                        className="px-4 py-3 text-orange-200 cursor-help border-r border-slate-700/20 group-hover:text-orange-100 transition-colors"
                        onMouseEnter={(e) => showTip(r.tipT, e)}
                        onMouseMove={(e) => showTip(r.tipT, e)}
                        onMouseLeave={hideTip}
                        whileHover={{ 
                          backgroundColor: 'rgba(251, 146, 60, 0.1)',
                          scale: 1.01 
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="relative">
                          {r.traditional}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </motion.td>
                      <motion.td
                        className="px-4 py-3 text-emerald-200 cursor-help group-hover:text-emerald-100 transition-colors"
                        onMouseEnter={(e) => showTip(r.tipS, e)}
                        onMouseMove={(e) => showTip(r.tipS, e)}
                        onMouseLeave={hideTip}
                        whileHover={{ 
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          scale: 1.01 
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="relative">
                          {r.smart}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </motion.td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
            
            {/* 底部装饰条 */}
            <motion.div
              className="h-1 bg-gradient-to-r from-orange-400/30 via-sky-400/30 to-emerald-400/30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提示框 */}
      <AnimatePresence>
        {tip.visible && (
          <motion.div
            className="absolute z-20 max-w-xs text-xs px-3 py-2 rounded-lg border border-sky-400/40 bg-slate-900/95 text-slate-200 shadow-glow backdrop-blur-sm"
            style={{ left: tip.x, top: tip.y }}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative">
              {tip.text}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-sky-400/20 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}




