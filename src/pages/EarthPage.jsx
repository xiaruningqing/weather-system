import { useEffect, useState } from 'react'
import Earth3D from '../components/earth/Earth3D.jsx'
import EarthControlPanel from '../components/earth/EarthControlPanel.jsx'
import WeatherCompare from '../components/WeatherCompare.jsx'
import { geocodeAMapCity } from '../services/weatherProviders.js'

const demoSatellites = [
  { id:'sat1', name:'Aqua', color:'#60a5fa', orbitRadius:1.8, inclination:35, period:12000 },
  { id:'sat2', name:'NOAA-20', color:'#7dd3fc', orbitRadius:2.0, inclination:98, period:14000 },
]

const demoStations = [
  { id:'st1', name:'Beijing', lat:39.9042, lon:116.4074, data:{ temp:26, hum:52 } },
  { id:'st2', name:'Shanghai', lat:31.2304, lon:121.4737, data:{ temp:27, hum:70 } },
  { id:'st3', name:'Guangzhou', lat:23.1291, lon:113.2644, data:{ temp:29, hum:78 } },
  { id:'st4', name:'Shenzhen', lat:22.5431, lon:114.0579, data:{ temp:30, hum:75 } },
  { id:'st5', name:'Chengdu', lat:30.5728, lon:104.0668, data:{ temp:24, hum:66 } },
  { id:'st6', name:'Hangzhou', lat:30.2741, lon:120.1551, data:{ temp:28, hum:68 } },
  { id:'st7', name:'Hefei', lat:31.8206, lon:117.2272, data:{ temp:27, hum:65 } },
  { id:'st8', name:'Urumqi', lat:43.8256, lon:87.6168, data:{ temp:20, hum:40 } },
]

function centerFromKey(key){
  switch(key){
    case 'bj': return { name: '国家气象数据中心（北京）', lat: 39.9042, lon: 116.4074 }
    case 'sh': return { name: '国家气象数据中心（上海）', lat: 31.2304, lon: 121.4737 }
    case 'gz': return { name: '国家气象数据中心（广州）', lat: 23.1291, lon: 113.2644 }
    case 'xa':
    default: return { name: '国家气象数据中心（西安）', lat: 34.3416, lon: 108.9398 }
  }
}

export default function EarthPage() {
  const [cfg, setCfg] = useState({ showClouds: true, showSatellites: true, showStations: true, showLinks: true, timeScale: 60, postprocessing: true, isPlaying: true, centerKey: 'xa' })
  const [focusCity, setFocusCity] = useState(null)
  const EARTH_TEX_MAP = import.meta.env.VITE_EARTH_TEX_MAP || 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'
  const EARTH_TEX_CLOUDS = import.meta.env.VITE_EARTH_TEX_CLOUDS || 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_2048.png'
  return (
    <div className="min-h-screen">
      <header className="container mx-auto px-6 py-6">
        <h1 className="text-2xl md:text-3xl font-semibold">3D 动态地球 · 卫星与气象站</h1>
        <p className="mt-2 text-slate-300">可旋转/缩放、点击站点与卫星查看信息，适配教学展示</p>
      </header>

      <main className="container mx-auto px-6 pb-10">
        <EarthControlPanel
          isPlaying={cfg.isPlaying}
          onTogglePlay={() => setCfg((c)=>({ ...c, isPlaying: !c.isPlaying }))}
          showClouds={cfg.showClouds}
          onToggleClouds={() => setCfg((c)=>({ ...c, showClouds: !c.showClouds }))}
          showSatellites={cfg.showSatellites}
          onToggleSatellites={() => setCfg((c)=>({ ...c, showSatellites: !c.showSatellites }))}
          showStations={cfg.showStations}
          onToggleStations={() => setCfg((c)=>({ ...c, showStations: !c.showStations }))}
          showLinks={cfg.showLinks}
          onToggleLinks={() => setCfg((c)=>({ ...c, showLinks: !c.showLinks }))}
          timeScale={cfg.timeScale}
          onChangeTimeScale={(v)=>setCfg((c)=>({ ...c, timeScale: v }))}
          postprocessing={cfg.postprocessing}
          onTogglePP={() => setCfg((c)=>({ ...c, postprocessing: !c.postprocessing }))}
          dataCenter={cfg.centerKey}
          onChangeCenter={(k)=>setCfg((c)=>({ ...c, centerKey: k }))}
        />
        <div className="glass p-4">
          <Earth3D
            earthTextures={{ map: EARTH_TEX_MAP, clouds: EARTH_TEX_CLOUDS }}
            satellites={demoSatellites}
            stations={demoStations}
            dataCenter={centerFromKey(cfg.centerKey)}
            timeScale={cfg.timeScale}
            showClouds={cfg.showClouds}
            showSatellites={cfg.showSatellites}
            showStations={cfg.showStations}
            showLinks={cfg.showLinks}
            postprocessing={cfg.postprocessing}
            height={740}
            focusCity={focusCity}
            onClearFocus={()=> setFocusCity(null)}
          />
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">实时天气对比（高德地图 数据源示例）</h2>
          <WeatherCompare
            provider="amap"
            apiKey={import.meta.env.VITE_AMAP_KEY || 'fef7c61a28adaa2d040029ce6107cf8d'}
            amapConfig={{}}
            predictionApiUrl={null}
            videoBackground
            cities={[ '上海', '广州', '深圳', '成都', '杭州', '合肥' ]}
            autoRefresh={false}
            autoInit={false}
            onCityChange={async (cityName) => {
              try {
                if (!cityName) return
                const geo = await geocodeAMapCity(cityName, import.meta.env.VITE_AMAP_KEY || 'fef7c61a28adaa2d040029ce6107cf8d')
                setFocusCity({ name: cityName, lat: geo.lat, lon: geo.lon })
              } catch {}
            }}
          />
        </div>
      </main>
    </div>
  )
}


