import { useState, useRef } from 'react'

export default function ComparisonTable() {
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
    <div className="glass overflow-hidden relative" ref={wrapRef} onMouseLeave={hideTip}>
      <div className="px-4 py-3 border-b border-slate-700/50 text-sm text-slate-300">
        传统天气预测系统 vs 数智系统
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-300">字段</th>
              <th className="text-left px-4 py-3 font-medium text-slate-300">传统系统</th>
              <th className="text-left px-4 py-3 font-medium text-slate-300">数智系统</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.field} className="border-t border-slate-800/60">
                <td className="px-4 py-3 text-slate-200">{r.field}</td>
                <td
                  className="px-4 py-3 text-slate-300 cursor-help"
                  onMouseEnter={(e) => showTip(r.tipT, e)}
                  onMouseMove={(e) => showTip(r.tipT, e)}
                  onMouseLeave={hideTip}
                >
                  {r.traditional}
                </td>
                <td
                  className="px-4 py-3 text-slate-300 cursor-help"
                  onMouseEnter={(e) => showTip(r.tipS, e)}
                  onMouseMove={(e) => showTip(r.tipS, e)}
                  onMouseLeave={hideTip}
                >
                  {r.smart}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tip.visible && (
        <div
          className="absolute z-20 max-w-xs text-xs px-2 py-1 rounded border border-sky-400/40 bg-slate-900/95 text-slate-200 shadow-glow"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
    </div>
  )
}




