import React, { useState } from 'react'
import { Droplet } from 'lucide-react'
import FormRecoleccion from './components/FormRecoleccion'
import Dashboard from './components/Dashboard'
import Reportes from './components/Reportes'
import ReporteVisual from './components/ReporteVisual'
import CiclosRecoleccion from './components/CiclosRecoleccion'
import './App.css'

export default function App() {
  const [paginaActiva, setPaginaActiva] = useState('registrar')
  const [menuAbierto, setMenuAbierto] = useState(false)

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto)
  }

  const cambiarPagina = (pagina) => {
    setPaginaActiva(pagina)
    setMenuAbierto(false)
  }

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-contenido">
          <div className="navbar-logo">
            <Droplet size={32} color="white" />
            <span>Control Aceite</span>
          </div>

          {/* MENÚ DESKTOP */}
          <div className="navbar-menu">
            <button
              className={`nav-btn ${paginaActiva === 'registrar' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('registrar')}
            >
              📝 Registrar
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'dashboard' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'reportes' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('reportes')}
            >
              📋 Reportes
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'reporte-visual' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('reporte-visual')}
            >
              📈 Reporte Visual
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'ciclos' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('ciclos')}
            >
              🔄 Ciclos
            </button>
          </div>

          {/* BOTÓN MENÚ MÓVIL */}
          <button className="menu-toggle" onClick={toggleMenu}>
            ☰
          </button>
        </div>

        {/* MENÚ MÓVIL */}
        {menuAbierto && (
          <div className="navbar-menu-movil">
            <button
              className={`nav-btn ${paginaActiva === 'registrar' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('registrar')}
            >
              📝 Registrar
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'dashboard' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'reportes' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('reportes')}
            >
              📋 Reportes
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'reporte-visual' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('reporte-visual')}
            >
              📈 Reporte Visual
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'ciclos' ? 'activo' : ''}`}
              onClick={() => cambiarPagina('ciclos')}
            >
              🔄 Ciclos
            </button>
          </div>
        )}
      </nav>

      {/* CONTENIDO */}
      <div className="contenido">
        {paginaActiva === 'registrar' && <FormRecoleccion />}
        {paginaActiva === 'dashboard' && <Dashboard />}
        {paginaActiva === 'reportes' && <Reportes />}
        {paginaActiva === 'reporte-visual' && <ReporteVisual />}
        {paginaActiva === 'ciclos' && <CiclosRecoleccion />}
      </div>
    </div>
  )
}