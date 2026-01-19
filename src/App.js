import React, { useState } from 'react'
import FormRecoleccion from './components/FormRecoleccion'
import Dashboard from './components/Dashboard'
import Reportes from './components/Reportes'
import ReporteVisual from './components/ReporteVisual'
import { Menu, X } from 'lucide-react'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('form')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <h1 className="nav-logo">🛢️ Control Aceite</h1>
          <button 
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <button 
              className={currentPage === 'form' ? 'active' : ''}
              onClick={() => {
                setCurrentPage('form')
                setMenuOpen(false)
              }}
            >
              Registrar
            </button>
            <button 
              className={currentPage === 'dashboard' ? 'active' : ''}
              onClick={() => {
                setCurrentPage('dashboard')
                setMenuOpen(false)
              }}
            >
              Dashboard
            </button>
            <button 
              className={currentPage === 'reportes' ? 'active' : ''}
              onClick={() => {
                setCurrentPage('reportes')
                setMenuOpen(false)
              }}
            >
              📋 Reportes
            </button>
            <button 
              className={currentPage === 'reporte-visual' ? 'active' : ''}
              onClick={() => {
                setCurrentPage('reporte-visual')
                setMenuOpen(false)
              }}
            >
              📊 Reporte Visual
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'form' && <FormRecoleccion />}
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'reportes' && <Reportes />}
        {currentPage === 'reporte-visual' && <ReporteVisual />}
      </main>
    </div>
  )
}

export default App