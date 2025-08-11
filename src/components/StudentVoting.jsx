import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'student_voting_counts_v1'

function loadCounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { rain: 0, norain: 0 }
    const parsed = JSON.parse(raw)
    return { rain: Number(parsed.rain) || 0, norain: Number(parsed.norain) || 0 }
  } catch {
    return { rain: 0, norain: 0 }
  }
}

function saveCounts(counts) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(counts)) } catch {}
}

export default function StudentVoting({ modelProb }) {
  const [counts, setCounts] = useState(loadCounts)

  useEffect(() => { saveCounts(counts) }, [counts])

  const total = counts.rain + counts.norain
  const rainPct = total ? Math.round((counts.rain / total) * 100) : 0
  const gap = modelProb != null ? Math.abs(rainPct - modelProb) : null

  // 若学生票数很集中且样本量足够，提示教师可引导讨论系统与群体判断差异

  return (
    <div className="glass p-3 mt-4">
      <div className="text-sm text-slate-200 font-medium">学生投票预测</div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          className="rounded border border-sky-500/40 bg-sky-500/10 text-sky-200 py-3 hover:bg-sky-500/20"
          onClick={() => setCounts((c) => ({ ...c, rain: c.rain + 1 }))}
        >
          认为会下雨（+1）
        </button>
        <button
          className="rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 py-3 hover:bg-emerald-500/20"
          onClick={() => setCounts((c) => ({ ...c, norain: c.norain + 1 }))}
        >
          认为不会下雨（+1）
        </button>
        <button
          className="rounded border border-slate-600 bg-slate-800/60 text-slate-200 py-3 hover:bg-slate-700"
          onClick={() => setCounts({ rain: 0, norain: 0 })}
        >
          重置投票
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
        <div className="rounded border border-slate-700 p-3">
          <div className="text-xs text-slate-400">会下雨票数</div>
          <div className="text-xl text-sky-300 font-semibold">{counts.rain}</div>
        </div>
        <div className="rounded border border-slate-700 p-3">
          <div className="text-xs text-slate-400">不会下雨票数</div>
          <div className="text-xl text-emerald-300 font-semibold">{counts.norain}</div>
        </div>
        <div className="rounded border border-slate-700 p-3">
          <div className="text-xs text-slate-400">投票样本量</div>
          <div className="text-xl text-slate-200 font-semibold">{total}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs text-slate-400 mb-1">学生预测比例（会下雨）</div>
        <div className="h-2 rounded bg-slate-800 overflow-hidden">
          <div className="h-full bg-sky-400" style={{ width: `${rainPct}%` }} />
        </div>
        <div className="mt-1 text-xs text-slate-300">{rainPct}%</div>
      </div>

      {gap != null && (
        <div className="mt-2 text-xs text-slate-400">
          与系统预测差距：<span className="text-primary font-semibold">{gap}%</span>
        </div>
      )}
    </div>
  )
}


