import { Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react'

export default function StageController({ currentStage, onSelectStage, isPaused, onTogglePause, onPrev, onNext }) {
  const stages = [1, 2, 3, 4]
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
          onClick={onPrev}
        >
          <ChevronLeft size={14} className="inline-block mr-1"/> 上一阶段
        </button>
      </div>

      <div className="flex items-center gap-3">
        {stages.map((s) => (
          <button
            key={s}
            className={
              'w-3 h-3 rounded-full transition-all ' +
              (currentStage === s ? 'bg-primary shadow-glow scale-110' : 'bg-slate-600 hover:bg-slate-500')
            }
            aria-label={`切换到阶段 ${s}`}
            onClick={() => onSelectStage?.(s)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
          onClick={onTogglePause}
        >
          {isPaused ? (<><Play size={14} className="inline-block mr-1"/>继续</>) : (<><Pause size={14} className="inline-block mr-1"/>暂停</>)}
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
          onClick={onNext}
        >
          下一阶段 <ChevronRight size={14} className="inline-block ml-1"/>
        </button>
      </div>
    </div>
  )
}



