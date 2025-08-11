// 统一的实时天气数据提供器，返回标准化结构
// { temperature, humidity, pressure, wind_speed, wind_deg, weather_description }

export async function fetchRealOWM({ city, lat, lon, apiKey }) {
  const query = lat != null && lon != null ? `lat=${lat}&lon=${lon}` : `q=${encodeURIComponent(city)}`
  const url = `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${apiKey}&units=metric`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error('OpenWeather 请求失败')
  const d = await res.json()
  return {
    temperature: Math.round(d.main.temp),
    humidity: d.main.humidity,
    pressure: d.main.pressure,
    wind_speed: d.wind.speed,
    wind_deg: d.wind.deg,
    weather_description: d.weather?.[0]?.description || '',
  }
}

// 中国气象局（接口盒子转发）：https://api.aa1.cn/doc/tqyb.html
// 请求地址：https://cn.apihz.cn/api/tianqi/tqyb.php?id=xxx&key=xxx&sheng=四川&place=绵阳
export async function fetchRealCMA({ id, key, sheng, place }) {
  const url = `https://cn.apihz.cn/api/tianqi/tqyb.php?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}&sheng=${encodeURIComponent(sheng)}&place=${encodeURIComponent(place)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error('CMA 接口请求失败')
  const d = await res.json()
  if (d.code !== 200) throw new Error(d.msg || 'CMA 返回错误')
  return {
    temperature: Math.round(Number(d.temperature)),
    humidity: Number(d.humidity),
    pressure: Number(d.pressure),
    wind_speed: Number(d.windSpeed),
    wind_deg: Number(d.windDirectionDegree),
    weather_description: `${d.windDirection || ''} ${d.windScale || ''}`.trim(),
  }
}

// 高德地图天气（Web Service）
// 文档参考：
// - Apifox 汇总: https://amap.apifox.cn/api-14675765
// - 官方文档: https://lbs.amap.com/api/webservice/guide/api/weatherinfo/#t1
// 说明：
// - 实况天气：GET https://restapi.amap.com/v3/weather/weatherInfo?key=KEY&city=城市编码或名称&extensions=base
// - 若仅有经纬度，需要先逆地理获取 adcode：GET https://restapi.amap.com/v3/geocode/regeo?key=KEY&location=lon,lat
export async function fetchRealAMap({ city, adcode, lat, lon, apiKey }) {
  let cityParam = adcode || city
  if (!cityParam && lat != null && lon != null) {
    // 逆地理获取 adcode（使用 JSONP 规避 CORS）
    const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${encodeURIComponent(apiKey)}&location=${encodeURIComponent(lon + ',' + lat)}&extensions=base`;
    const geo = await jsonp(geoUrl, 'callback', 12000)
    cityParam = geo?.regeocode?.addressComponent?.adcode || geo?.regeocode?.addressComponent?.citycode
  }
  if (!cityParam) throw new Error('AMap 需要 city/adcode 或 lat/lon')

  const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${encodeURIComponent(apiKey)}&city=${encodeURIComponent(cityParam)}&extensions=base`
  const d = await jsonp(url, 'callback', 12000)
  if (d.status !== '1') throw new Error(d.info || 'AMap 返回错误')
  const live = d?.lives?.[0]
  if (!live) throw new Error('AMap 无实时数据')
  const windMs = bftToMs(live.windpower)
  return {
    temperature: Number(live.temperature),
    humidity: Number(live.humidity),
    pressure: 0, // AMap 实况无气压，置 0 或由你方预测提供
    wind_speed: windMs,
    wind_deg: 0, // AMap 返回风向文字，不含度数；可选用 0 代替
    weather_description: `${live.weather} ${live.winddirection}${live.windpower ? live.windpower + '级' : ''}`.trim(),
  }
}

function bftToMs(bft) {
  // bft 可能是“≤3”或“3”，取数字后近似到 m/s
  const n = Number(String(bft).replace(/[^0-9.]/g, ''))
  if (Number.isNaN(n)) return 0
  // 简化映射（Beaufort）：0→0，1→1.5，2→3.3，3→5.4，4→7.9，5→10.7，6→13.8，7→17.1
  const map = [0, 1.5, 3.3, 5.4, 7.9, 10.7, 13.8, 17.1, 20.7, 24.4, 28.4, 32.6]
  return map[Math.min(map.length - 1, Math.max(0, Math.round(n)))]
}

// AMap 正向地理编码：城市名 -> { lat, lon, adcode }
export async function geocodeAMapCity(city, apiKey) {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${encodeURIComponent(apiKey)}&address=${encodeURIComponent(city)}`
  const d = await jsonp(url, 'callback', 12000)
  if (d.status !== '1' || !d.geocodes || d.geocodes.length === 0) throw new Error('AMap 无编码结果')
  const g = d.geocodes[0]
  const [lon, lat] = String(g.location || '').split(',').map(Number)
  return { lat, lon, adcode: g.adcode }
}

// 通用 JSONP 请求（规避 CORS）
function jsonp(url, cbParam = 'callback', timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const cbName = `__jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const cleanup = () => {
      try { delete window[cbName] } catch {}
      if (script && script.parentNode) script.parentNode.removeChild(script)
      if (timer) clearTimeout(timer)
    }
    window[cbName] = (data) => { cleanup(); resolve(data) }
    const script = document.createElement('script')
    script.src = `${url}${url.includes('?') ? '&' : '?'}${cbParam}=${cbName}`
    script.onerror = () => { cleanup(); reject(new Error('JSONP 加载失败')) }
    document.head.appendChild(script)
    const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP 超时')) }, timeoutMs)
  })
}

// Open‑Meteo 无需密钥的兜底数据源
export async function fetchRealOpenMeteo({ city, lat, lon }) {
  let latitude = lat
  let longitude = lon
  if ((latitude == null || longitude == null) && city) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`
    const res = await fetch(geoUrl)
    if (!res.ok) throw new Error('OpenMeteo 地名查询失败')
    const data = await res.json()
    if (!data.results || data.results.length === 0) throw new Error('OpenMeteo 无地名结果')
    latitude = data.results[0].latitude
    longitude = data.results[0].longitude
  }
  if (latitude == null || longitude == null) throw new Error('缺少经纬度')
  const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m&timezone=auto`
  const res2 = await fetch(wUrl)
  if (!res2.ok) throw new Error('OpenMeteo 天气失败')
  const w = await res2.json()
  const c = w?.current || {}
  return {
    temperature: Math.round(Number(c.temperature_2m ?? 0)),
    humidity: Number(c.relative_humidity_2m ?? 0),
    pressure: 1010, // OpenMeteo 此接口未含气压，使用常值做教学演示
    wind_speed: Number(c.wind_speed_10m ?? 0),
    wind_deg: Number(c.wind_direction_10m ?? 0),
    weather_description: (c.precipitation ?? 0) > 0 ? 'rain' : 'clouds',
  }
}


