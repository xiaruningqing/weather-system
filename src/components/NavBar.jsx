import { Link, useLocation } from 'react-router-dom'
import { CloudSun, Globe2 } from 'lucide-react'

export default function NavBar() {
  const loc = useLocation()
  const isActive = (path) => (loc.pathname === path ? 'text-sky-300' : 'text-slate-300 hover:text-slate-100')
  return (
    <nav className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur border-b border-slate-800">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="text-slate-100 font-semibold tracking-tight flex items-center gap-2">
          <CloudSun size={18} className="text-sky-300" /> 天气预测数智系统
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className={`flex items-center gap-1 ${isActive('/')}`}><CloudSun size={14}/> 演示主页面</Link>
          <Link to="/earth" className={`flex items-center gap-1 ${isActive('/earth')}`}><Globe2 size={14}/> 3D 动态地球</Link>
        </div>
      </div>
    </nav>
  )
}


