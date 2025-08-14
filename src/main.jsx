import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import EarthPage from './pages/EarthPage.jsx'
import ClusteringCase from './components/ClusteringCase.jsx'
import NavBar from './components/NavBar.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/earth" element={<EarthPage />} />
        <Route path="/clustering" element={<ClusteringCase />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)



