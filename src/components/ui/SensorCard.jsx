import React from 'react'
import { FaSatellite, FaShip } from 'react-icons/fa'
import { MdHome, MdRadar } from 'react-icons/md'
import { GiRadarSweep } from 'react-icons/gi'

const TYPE_STYLES = {
	satellite: {
		name: '卫星',
		color: '#4DA3FF',
		border: 'border-[#4DA3FF]/60',
		glow: 'shadow-[0_0_14px_rgba(77,163,255,0.45)]',
		bg: 'from-[#0A1E3A]/80 to-[#0C2C5A]/80',
		Icon: FaSatellite,
	},
	ground: {
		name: '地面站',
		color: '#1FD38A',
		border: 'border-[#1FD38A]/60',
		glow: 'shadow-[0_0_14px_rgba(31,211,138,0.45)]',
		bg: 'from-[#07231A]/80 to-[#09462E]/80',
		Icon: MdHome,
	},
	radar: {
		name: '雷达',
		color: '#FFA500',
		border: 'border-[#FFA500]/60',
		glow: 'shadow-[0_0_14px_rgba(255,165,0,0.45)]',
		bg: 'from-[#2B1D07]/80 to-[#4A2E08]/80',
		Icon: GiRadarSweep,
	},
	buoy: {
		name: '浮标',
		color: '#A16EFF',
		border: 'border-[#A16EFF]/60',
		glow: 'shadow-[0_0_14px_rgba(161,110,255,0.45)]',
		bg: 'from-[#1D1434]/80 to-[#2B1F50]/80',
		Icon: FaShip,
	},
}

export default function SensorCard({
	id,
	type = 'satellite',
	title,
	status = 'done', // 'done' | 'idle' | 'collecting'
	desc = '已完成，点击查看数据',
	onClick,
	onStatusClick,
	className = '',
}) {
	const t = TYPE_STYLES[type] || TYPE_STYLES.satellite
	const Icon = t.Icon
	const name = title || t.name
	const isDone = status === 'done'

	return (
		<button
			type="button"
			onClick={() => onClick?.(id)}
			className={`w-full text-left rounded-lg border ${t.border} ${t.glow} bg-[#0D1B2A]/60 p-3 transition-colors duration-200 hover:border-opacity-90 hover:brightness-110 ${className}`}
		>
			<div className="flex items-center justify-between gap-2">
				{/* 左：圆形图标底 */}
				<div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${t.bg} grid place-items-center border border-white/10`}>
					<Icon size={28} color={t.color} />
				</div>

				{/* 中：两行文本 */}
				<div className="min-w-0 flex-1 px-2">
					<div className="text-sm font-semibold truncate" style={{ color: t.color }}>{name}</div>
					<div className="text-xs text-slate-400 truncate">{desc}</div>
				</div>

				{/* 右：状态按钮 */}
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onStatusClick?.(id) }}
					className={`px-3 py-1 rounded-md text-xs border ${t.border} bg-white/5 backdrop-blur transition-all duration-200 hover:shadow-[0_0_18px_currentColor]`}
					style={{ color: t.color }}
				>
					{isDone ? '完成' : status === 'collecting' ? '采集中' : '待采集'}
				</button>
			</div>
		</button>
	)
}


