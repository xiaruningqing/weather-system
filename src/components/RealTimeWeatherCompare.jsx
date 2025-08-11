import { useMemo, useState } from 'react'

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('地名查询失败')
  const data = await res.json()
  if (!data.results || data.results.length === 0) throw new Error('未找到该地点')
  const { latitude, longitude, name, country } = data.results[0]
  return { latitude, longitude, label: `${name}${country ? ' · ' + country : ''}` }
}

async function fetchWeather({ latitude, longitude }) {
  // 取最近的小时降水概率，若不可用则用降水量>0判断
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability,precipitation&current_weather=true&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('天气请求失败')
  const data = await res.json()
  return data
}

function nearestHourIndex(times) {
  const now = new Date()
  const target = new Date(now)
  target.setMinutes(0, 0, 0)
  let nearestIdx = 0
  let minDiff = Infinity
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i])
    const diff = Math.abs(t.getTime() - target.getTime())
    if (diff < minDiff) { minDiff = diff; nearestIdx = i }
  }
  return nearestIdx
}

export default function RealTimeWeatherCompare({ modelProb, onRealProb }) {
  const [city, setCity] = useState('北京')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [realProb, setRealProb] = useState(null)

  const diff = useMemo(() => {
    if (realProb == null || modelProb == null) return null
    return Math.round(modelProb - realProb)
  }, [realProb, modelProb])

  const onFetch = async () => {
    try {
      setLoading(true); setError('')
      const geo = await geocodeCity(city)
      setLabel(geo.label)
      const data = await fetchWeather(geo)
      const times = data?.hourly?.time || []
      const idx = times.length ? nearestHourIndex(times) : 0
      let p = null
      if (data?.hourly?.precipitation_probability) {
        p = data.hourly.precipitation_probability[idx]
      } else if (data?.hourly?.precipitation) {
        p = data.hourly.precipitation[idx] > 0 ? 60 : 10
      }
      setRealProb(p)
      onRealProb?.(p)
    } catch (e) {
      setError(e.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass p-3 mt-4">
      <div className="text-sm text-slate-200 font-medium">实时天气查询对比</div>
      <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
          placeholder="输入城市，如 北京"
        />
        <button
          className="px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary"
          disabled={loading}
          onClick={onFetch}
        >
          {loading ? '获取中...' : '获取实时天气'}
        </button>
        {label && <span className="text-xs text-slate-400">{label}</span>}
      </div>

      {error && <div className="mt-2 text-xs text-rose-300">{error}</div>}

      {(realProb != null) && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
          <div className="rounded border border-slate-700 p-3">
            <div className="text-slate-400 text-xs">系统预测降雨概率</div>
            <div className="text-xl text-sky-300 font-semibold">{modelProb}%</div>
          </div>
          <div className="rounded border border-slate-700 p-3">
            <div className="text-slate-400 text-xs">实时天气（Open‑Meteo）</div>
            <div className="text-xl text-emerald-300 font-semibold">{realProb}%</div>
          </div>
          <div className="rounded border border-slate-700 p-3">
            <div className="text-slate-400 text-xs">差值（系统 − 实时）</div>
            <div className={`text-xl font-semibold ${diff >= 0 ? 'text-amber-300' : 'text-rose-300'}`}>{diff}%</div>
          </div>
        </div>
      )}
    </div>
  )
}


