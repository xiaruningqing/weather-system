const HINTS = {
  1: '阶段一：不同设备收集不同维度的气象数据，协同覆盖更全面的时空信息',
  2: '阶段二：异构数据融合，进行时空对齐、去噪与统一编码，形成可用数据流',
  3: '阶段三：基于融合数据进行预测，可调整输入观察输出敏感性',
  4: '阶段四：将预测与实际对比，基于误差进行模型升级与持续优化',
}

export default function TeachingHint({ stage }) {
  return (
    <div className="text-xs md:text-sm text-sky-300">
      {HINTS[stage]}
    </div>
  )
}


