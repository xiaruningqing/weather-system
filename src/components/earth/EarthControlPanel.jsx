export default function EarthControlPanel({
  isPlaying, onTogglePlay,
  showClouds, onToggleClouds,
  showSatellites, onToggleSatellites,
  showStations, onToggleStations,
  showLinks, onToggleLinks,
  timeScale, onChangeTimeScale,
  postprocessing, onTogglePP,
  dataCenter, onChangeCenter,
}) {
  return (
    <div className="glass p-3 flex flex-wrap items-center gap-3 text-sm">
      <button className="px-2 py-1 rounded bg-slate-800 border border-slate-700" onClick={onTogglePlay}>{isPlaying ? '暂停' : '播放'}</button>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showClouds} onChange={onToggleClouds} />
        云层
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showSatellites} onChange={onToggleSatellites} />
        卫星轨迹
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showStations} onChange={onToggleStations} />
        气象站
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showLinks} onChange={onToggleLinks} />
        数据链路
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={postprocessing} onChange={onTogglePP} />
        Bloom/FXAA
      </label>
      <div className="flex items-center gap-2">
        <span className="text-slate-300">时间倍率</span>
        <input type="range" min={1} max={600} step={1} value={timeScale} onChange={(e)=>onChangeTimeScale(Number(e.target.value))} className="accent-sky-400" />
        <span className="text-slate-200">x{timeScale}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-300">数据中心</span>
        <select value={dataCenter} onChange={(e)=>onChangeCenter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1">
          <option value="xa">西安</option>
          <option value="bj">北京</option>
          <option value="sh">上海</option>
          <option value="gz">广州</option>
        </select>
      </div>
    </div>
  )
}


