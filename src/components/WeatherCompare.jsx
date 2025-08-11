import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchRealOWM, fetchRealCMA, fetchRealAMap, fetchRealOpenMeteo } from '../services/weatherProviders'

// Utility
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function WeatherCompare({
  city = 'Beijing',
  lat,
  lon,
  apiKey,
  predictionApiUrl,
  refreshInterval = 5 * 60 * 1000,
  thresholdLow = 5,
  thresholdHigh = 15,
  onDataUpdate,
  onCityChange,
  videoBackground = false,
  provider = 'owm', // 'owm' | 'cma' | 'amap'
  cmaConfig, // { id, key, sheng, place }
  amapConfig, // { city?:string, adcode?:string }
  mockPredictionRange = { temp: 2, hum: 5, pres: 8, wind: 0.8, dir: 20 },
  autoRefresh = false,
  autoInit = false,
  cities = [], // 预置可选城市
}) {
  const [location, setLocation] = useState({ city, lat, lon })
  const [cityList, setCityList] = useState(() => Array.from(new Set([city, ...cities].filter(Boolean))))
  useEffect(()=>{ setCityList(Array.from(new Set([city, ...cities].filter(Boolean)))) }, [cities, city])
  const [real, setReal] = useState(null)
  const [pred, setPred] = useState(null)
  const [history, setHistory] = useState([]) // {t, real:{}, pred:{}}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(true)
  const timerRef = useRef(0)
  const [isMockPred, setIsMockPred] = useState(false)

  const fetchReal = useCallback(async () => {
    try {
      setError('')
      if (provider === 'cma') {
        const cfg = cmaConfig || {}
        if (!cfg.id || !cfg.key || !cfg.sheng || !cfg.place) throw new Error('CMA 需提供 id/key/sheng/place')
        return await fetchRealCMA(cfg)
      } else if (provider === 'amap') {
        const cfg = amapConfig || {}
        return await fetchRealAMap({ city: cfg.city || location.city, adcode: cfg.adcode, lat: location.lat, lon: location.lon, apiKey })
      }
      // 首选 OWM（有 key），否则回退 Open‑Meteo（无需 key）
      if (apiKey) return await fetchRealOWM({ city: location.city, lat: location.lat, lon: location.lon, apiKey })
      return await fetchRealOpenMeteo({ city: location.city, lat: location.lat, lon: location.lon })
    } catch (e) {
      setError(e.message || '请求失败'); return null
    }
  }, [apiKey, location, provider, cmaConfig])

  const fetchPred = useCallback(async () => {
    try {
      if (!predictionApiUrl) return null
      const body = location.lat && location.lon
        ? { lat: location.lat, lon: location.lon }
        : { city: location.city }
      const res = await fetch(predictionApiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(12000)
      })
      if (!res.ok) {
        // 404/5xx 直接走教学用预测，不打断演示
        if (res.status === 404 || res.status >= 500) return null
        throw new Error('预测接口请求失败')
      }
      const data = await res.json()
      return normalizePred(data)
    } catch (e) { /* 静默失败，走 mock */ return null }
  }, [predictionApiUrl, location])

  const pull = useCallback(async () => {
    setLoading(true)
    const [r, p] = await Promise.all([fetchReal(), fetchPred()])
    setLoading(false)
    let predVal = p
    if (!predVal && r) {
      // 预测接口不可用时，生成一个“教学用”预测（基于真实值微调），保证演示可用
      predVal = genMockPrediction(r, mockPredictionRange)
      setIsMockPred(true)
    } else {
      setIsMockPred(false)
    }
    if (r && predVal) {
      setReal(r); setPred(predVal)
      const entry = { t: Date.now(), real: r, pred: predVal }
      setHistory((prev) => {
        const next = [...prev.slice(-71), entry]
        try { localStorage.setItem('wc_history', JSON.stringify(next)) } catch {}
        return next
      })
      onDataUpdate?.(r, predVal)
    }
  }, [fetchReal, fetchPred, onDataUpdate, mockPredictionRange])

  useEffect(() => {
    try {
      const cache = localStorage.getItem('wc_history')
      if (cache) setHistory(JSON.parse(cache))
    } catch {}
  }, [])

  // 手动触发：点击“查询/定位”时调用 handleQuery
  useEffect(() => {
    if (autoInit) pull()
  }, [autoInit, pull])

  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(pull, refreshInterval)
    return () => clearInterval(timerRef.current)
  }, [autoRefresh, refreshInterval, pull])

  const diffs = useMemo(() => real && pred ? calcDiffs(real, pred) : null, [real, pred])

  // 动态提醒：超阈值时震动/提示音
  useEffect(() => {
    if (!diffs) return
    const maxPct = Math.max(...['temperature','humidity','pressure','wind_speed'].map(k => Math.abs(diffs[k].pct||0)))
    if (maxPct >= thresholdHigh) {
      try {
        if (window.navigator?.vibrate) navigator.vibrate(80)
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.value = 0.05; o.start(); setTimeout(()=>{o.stop(); ctx.close()}, 160)
      } catch {}
    }
  }, [diffs, thresholdHigh])

  return (
    <div className="relative glass p-4 overflow-hidden">
      {videoBackground && <VideoBg weather={real?.weather_description} />}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Header
            location={location}
            onQuery={(q)=>{ setLocation((prev)=>({ ...prev, ...q })); setTimeout(()=> pull(), 0) }}
            loading={loading}
            cities={cityList}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <RealTimeWeatherCard data={real} />
            <PredictionWeatherCard data={pred} isMock={isMockPred} />
          </div>
          <ErrorAnalysisPanel diffs={diffs} thresholdLow={thresholdLow} thresholdHigh={thresholdHigh} />
        </div>
        <div className="flex-1 min-h-[320px]">
          <ChartTabs history={history} thresholdLow={thresholdLow} thresholdHigh={thresholdHigh} />
        </div>
      </div>

      {error && <div className="mt-3 text-rose-300 text-sm">{error}</div>}
    </div>
  )
}

function Header({ location, onQuery, loading, cities=[] }) {
  const [city, setCity] = useState(location.city || cities[0] || '')
  const locate = () => navigator.geolocation?.getCurrentPosition((pos) => {
    onQuery({ lat: pos.coords.latitude, lon: pos.coords.longitude, city: undefined })
  })
  return (
    <div className="flex items-center gap-2">
      {/* 左侧滚动选择器 */}
      <select
        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm min-w-[200px]"
        value={city || ''}
        onChange={(e)=> { setCity(e.target.value); onCityChange?.(e.target.value) }}
      >
        {(!city && cities.length === 0) && <option value="" disabled>请选择城市</option>}
        {cities.map((c)=> (
          <option key={c} value={c}>{c}</option>
        ))}
        {cities.length === 0 && city && <option value={city}>{city}</option>}
      </select>
      <button className="px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary" onClick={()=> onQuery({ city, lat: undefined, lon: undefined })} disabled={loading}>查询</button>
      <button className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700" onClick={locate}>定位</button>
    </div>
  )
}


function Card({ title, children }) {
  return (
    <div className="rounded border border-slate-700 p-3">
      <div className="text-sm text-slate-400 mb-2">{title}</div>
      {children}
    </div>
  )
}

function RealTimeWeatherCard({ data }) {
  return (
    <Card title="实时天气">
      {!data ? <div className="text-slate-400 text-sm">等待数据…</div> : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Metric label="温度" value={`${data.temperature}°C`} />
          <Metric label="湿度" value={`${data.humidity}%`} />
          <Metric label="气压" value={`${data.pressure}hPa`} />
          <Metric label="风速" value={`${data.wind_speed}m/s`} />
          <Metric label="风向" value={`${data.wind_deg}°`} />
          <Metric label="现象" value={data.weather_description} />
        </div>
      )}
    </Card>
  )
}

function PredictionWeatherCard({ data, isMock }) {
  return (
    <Card title={<div className="flex items-center gap-2"><span>模型预测</span>{isMock && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200">教学用模拟</span>}</div>}>
      {!data ? <div className="text-slate-400 text-sm">等待数据…</div> : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Metric label="温度" value={`${data.temperature}°C`} />
          <Metric label="湿度" value={`${data.humidity}%`} />
          <Metric label="气压" value={`${data.pressure}hPa`} />
          <Metric label="风速" value={`${data.wind_speed}m/s`} />
          <Metric label="风向" value={`${data.wind_deg}°`} />
          <Metric label="现象" value={data.weather_description} />
        </div>
      )}
    </Card>
  )
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded bg-slate-900/50 border border-slate-700/60 px-2 py-1">
      <span className="text-slate-400 mr-1">{label}</span>
      <span className="text-slate-100">{value}</span>
      {hint && <span className="ml-1 text-slate-400">{hint}</span>}
    </div>
  )
}

function WeatherComparisonChart({ history, thresholdLow, thresholdHigh }) {
  const times = history.map(h => new Date(h.t).toLocaleTimeString('zh-CN', { hour12: false }))
  const tempReal = history.map(h => h.real.temperature)
  const tempPred = history.map(h => h.pred.temperature)
  const humReal = history.map(h => h.real.humidity)
  const humPred = history.map(h => h.pred.humidity)

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['实温', '预温', '实湿', '预湿'], textStyle: { color: '#cbd5e1' } },
    grid: { left: 40, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: times, axisLine: { lineStyle: { color: '#64748b' } } },
    yAxis: [{ type: 'value', axisLine: { lineStyle: { color: '#64748b' } } }],
    series: [
      { name: '实温', type: 'line', smooth: true, data: tempReal, lineStyle: { color: '#22d3ee' } },
      { name: '预温', type: 'line', smooth: true, data: tempPred, lineStyle: { color: '#38bdf8' } },
      { name: '实湿', type: 'bar', data: humReal, yAxisIndex: 0, itemStyle: { color: '#14b8a6' }, opacity: 0.8 },
      { name: '预湿', type: 'bar', data: humPred, yAxisIndex: 0, itemStyle: { color: '#10b981' }, opacity: 0.6 },
    ],
  }
  return <ReactECharts option={option} style={{ height: 320 }} />
}

function ChartTabs({ history, thresholdLow, thresholdHigh }) {
  const [mode, setMode] = useState('line') // line | radar | diff
  return (
    <div>
      <div className="flex items-center gap-2 text-xs">
        <button className={`px-2 py-1 rounded ${mode==='line'?'bg-sky-500/20 text-sky-300':'bg-slate-800 border border-slate-700'}`} onClick={()=>setMode('line')}>折线+柱</button>
        <button className={`px-2 py-1 rounded ${mode==='radar'?'bg-sky-500/20 text-sky-300':'bg-slate-800 border border-slate-700'}`} onClick={()=>setMode('radar')}>雷达</button>
        <button className={`px-2 py-1 rounded ${mode==='diff'?'bg-sky-500/20 text-sky-300':'bg-slate-800 border border-slate-700'}`} onClick={()=>setMode('diff')}>差值柱</button>
      </div>
      <div className="mt-2">
        {mode==='line' && <WeatherComparisonChart history={history} thresholdLow={thresholdLow} thresholdHigh={thresholdHigh} />}
        {mode==='radar' && <RadarChart history={history} />}
        {mode==='diff' && <DiffBarChart history={history} />}
      </div>
      <Timeline history={history} />
    </div>
  )
}

function RadarChart({ history }) {
  const last = history[history.length-1]
  if (!last) return <div className="text-slate-400 text-sm mt-4">等待数据…</div>
  const indicators = [
    { name:'温度', max: 50 },{ name:'湿度', max: 100 },{ name:'气压', max: 1100 },{ name:'风速', max: 40 }
  ]
  const option = {
    backgroundColor: 'transparent',
    legend: { data:['实时','预测'], textStyle:{ color:'#cbd5e1' } },
    radar: { indicator: indicators, axisName: { color:'#cbd5e1' } },
    series: [{ type:'radar', data:[
      { name:'实时', value:[last.real.temperature, last.real.humidity, last.real.pressure, last.real.wind_speed] },
      { name:'预测', value:[last.pred.temperature, last.pred.humidity, last.pred.pressure, last.pred.wind_speed] },
    ] }]
  }
  return <ReactECharts option={option} style={{ height: 320 }} />
}

function DiffBarChart({ history }) {
  const last = history[history.length-1]
  if (!last) return <div className="text-slate-400 text-sm mt-4">等待数据…</div>
  const diff = {
    温度: last.pred.temperature - last.real.temperature,
    湿度: last.pred.humidity - last.real.humidity,
    气压: last.pred.pressure - last.real.pressure,
    风速: last.pred.wind_speed - last.real.wind_speed,
  }
  const option = {
    backgroundColor:'transparent', tooltip:{}, grid:{ left:40, right:20, top:30, bottom:30 },
    xAxis:{ type:'category', data:Object.keys(diff), axisLine:{ lineStyle:{ color:'#64748b' } } },
    yAxis:{ type:'value', axisLine:{ lineStyle:{ color:'#64748b' } } },
    series:[{ type:'bar', data:Object.values(diff), itemStyle:{ color:(p)=> p.value>=0?'#f59e0b':'#22d3ee' } }]
  }
  return <ReactECharts option={option} style={{ height: 320 }} />
}

function Timeline({ history }) {
  const [i, setI] = useState(history.length-1)
  const [playing, setPlaying] = useState(false)
  useEffect(()=> setI(history.length-1), [history.length])
  useEffect(()=>{
    if (!playing) return
    const id = setInterval(()=> setI((x)=> (x+1) % Math.max(1, history.length)), 1200)
    return ()=> clearInterval(id)
  }, [playing, history.length])
  const cur = history[i]
  return (
    <div className="mt-2 text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 rounded bg-slate-800 border border-slate-700" onClick={()=> setPlaying((p)=>!p)}>{playing?'暂停':'播放'}</button>
        <input type="range" min={0} max={Math.max(0, history.length-1)} value={i} onChange={(e)=>setI(Number(e.target.value))} className="flex-1 accent-sky-400" />
        <span>{cur ? new Date(cur.t).toLocaleTimeString('zh-CN',{hour12:false}) : '--:--'}</span>
      </div>
    </div>
  )
}

function VideoBg({ weather }) {
  const src = useMemo(() => {
    if (!weather) return null
    const w = weather.toLowerCase()
    if (w.includes('rain')) return 'https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4'
    if (w.includes('snow')) return 'https://storage.googleapis.com/coverr-main/mp4/Misty_Forest.mp4'
    return 'https://storage.googleapis.com/coverr-main/mp4/Northern_Lights.mp4'
  }, [weather])
  if (!src) return null
  return (
    <video autoPlay muted loop playsInline className="absolute inset-0 -z-10 opacity-20 object-cover">
      <source src={src} type="video/mp4" />
    </video>
  )
}

function ErrorAnalysisPanel({ diffs, thresholdLow, thresholdHigh }) {
  if (!diffs) return (
    <div className="mt-3 text-sm text-slate-400">等待对比数据…</div>
  )
  const items = [
    ['温度', 'temperature'], ['湿度', 'humidity'], ['气压', 'pressure'], ['风速', 'wind_speed']
  ]
  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map(([label, key]) => (
        <ErrorBadge key={key} label={label} diff={diffs[key]} thresholdLow={thresholdLow} thresholdHigh={thresholdHigh} />
      ))}
      <div className="col-span-2 text-xs text-slate-400">
        误差解读：{analysisText(diffs)}
      </div>
    </div>
  )
}

function ErrorBadge({ label, diff, thresholdLow, thresholdHigh }) {
  const pct = diff.pct
  const color = pct == null ? 'bg-slate-700/60 text-slate-200' : pctAbsColor(pct, thresholdLow, thresholdHigh)
  return (
    <div className={`rounded px-2 py-1 text-sm border border-slate-700/60 ${color}`}>
      {label}：{diff.value > 0 ? '+' : ''}{diff.value}（{pct?.toFixed?.(1)}%）
    </div>
  )
}

function pctAbsColor(pct, low, high) {
  const a = Math.abs(pct)
  if (a < low) return 'bg-emerald-600/20 text-emerald-300'
  if (a < high) return 'bg-amber-600/20 text-amber-300'
  return 'bg-rose-600/20 text-rose-300'
}

// Normalizers
function normalizeOWM(d) {
  return {
    temperature: Math.round(d.main.temp),
    humidity: d.main.humidity,
    pressure: d.main.pressure,
    wind_speed: d.wind.speed,
    wind_deg: d.wind.deg,
    weather_description: d.weather?.[0]?.description || '',
  }
}

function normalizePred(d) {
  // 允许服务端返回已对齐字段，否则提供简单映射
  return {
    temperature: Math.round(d.temperature ?? d.temp ?? 0),
    humidity: d.humidity ?? 0,
    pressure: d.pressure ?? 0,
    wind_speed: d.wind_speed ?? d.windSpeed ?? 0,
    wind_deg: d.wind_deg ?? d.windDeg ?? 0,
    weather_description: d.weather_description ?? d.weather ?? '',
  }
}

function calcDiffs(real, pred) {
  const pct = (a, b) => b === 0 ? 0 : ((a - b) / (b === 0 ? 1 : b)) * 100
  return {
    temperature: { value: pred.temperature - real.temperature, pct: pct(pred.temperature, real.temperature) },
    humidity: { value: pred.humidity - real.humidity, pct: pct(pred.humidity, real.humidity) },
    pressure: { value: pred.pressure - real.pressure, pct: pct(pred.pressure, real.pressure) },
    wind_speed: { value: pred.wind_speed - real.wind_speed, pct: pct(pred.wind_speed, real.wind_speed) },
    wind_deg: { value: pred.wind_deg - real.wind_deg, pct: null },
  }
}

// 简易“误差解读”文本生成（可替换为更智能的规则/LLM）
function analysisText(diffs) {
  const sign = (v) => v > 0 ? '偏高' : (v < 0 ? '偏低' : '持平')
  const parts = []
  if (diffs.temperature) parts.push(`温度${sign(diffs.temperature.value)}${Math.abs(diffs.temperature.value)}°C`)
  if (diffs.humidity) parts.push(`湿度${sign(diffs.humidity.value)}${Math.abs(diffs.humidity.value)}%`)
  if (diffs.pressure) parts.push(`气压${sign(diffs.pressure.value)}${Math.abs(diffs.pressure.value)}hPa`)
  if (diffs.wind_speed) parts.push(`风速${sign(diffs.wind_speed.value)}${Math.abs(diffs.wind_speed.value)}m/s`)
  const tip = parts.length ? parts.join('，') : '各项指标基本一致'
  return `${tip}。教学提示：若温度/湿度误差同时偏高，可能是降水系统或冷空气入侵的时机/强度估计偏差；风向差异较大时，请结合地形或局地对流解释。`
}

function genMockPrediction(real, range={ temp:2, hum:5, pres:8, wind:0.8, dir:20 }){
  const rand = (mul) => (Math.random() * 2 - 1) * mul
  return {
    temperature: Math.round(real.temperature + rand(range.temp)),
    humidity: clamp(real.humidity + Math.round(rand(range.hum)), 0, 100),
    pressure: Math.round(real.pressure + rand(range.pres)),
    wind_speed: Math.max(0, Number((real.wind_speed + rand(range.wind)).toFixed(1))),
    wind_deg: (real.wind_deg + Math.round(rand(range.dir)) + 360) % 360,
    weather_description: real.weather_description || 'clouds',
  }
}


