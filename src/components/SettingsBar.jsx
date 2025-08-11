export default function SettingsBar({ isAutoPlay, onToggleAutoPlay, speedFactor, onChangeSpeed, showParticles, onToggleParticles }) {
  return (
    <div className="glass p-3 flex flex-col md:flex-row md:items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isAutoPlay} onChange={onToggleAutoPlay} />
          <span className="text-slate-300">自动播放</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showParticles} onChange={onToggleParticles} />
          <span className="text-slate-300">粒子背景</span>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-300">速度倍率</span>
        <input
          className="accent-sky-400"
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={speedFactor}
          onChange={(e) => onChangeSpeed(Number(e.target.value))}
        />
        <span className="text-slate-200">x{speedFactor.toFixed(1)}</span>
      </div>
      <div className="text-slate-400 ml-auto">
        快捷键： ←/→ 切换阶段 · 空格 暂停/继续
      </div>
    </div>
  )
}


