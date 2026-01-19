import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { BarChart3, TrendingUp, Droplets, MapPin } from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRecepcion: 0,
    tiposAceite: {},
    porLugar: {}
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    
    // Total recepción
    const { data: recepciones } = await supabase
      .from('recepciones')
      .select('cantidad, tipo_aceite, lugar_id')
    
    if (recepciones) {
      const total = recepciones.reduce((sum, r) => sum + r.cantidad, 0)
      
      // Agrupar por tipo
      const tipos = {}
      recepciones.forEach(r => {
        tipos[r.tipo_aceite] = (tipos[r.tipo_aceite] || 0) + r.cantidad
      })
      
      // Agrupar por lugar
      const { data: lugares } = await supabase.from('lugares').select('id, nombre')
      const porLugar = {}
      
      if (lugares) {
        lugares.forEach(l => {
          const cantidadLugar = recepciones
            .filter(r => r.lugar_id === l.id)
            .reduce((sum, r) => sum + r.cantidad, 0)
          if (cantidadLugar > 0) porLugar[l.nombre] = cantidadLugar
        })
      }

      setStats({
        totalRecepcion: total,
        tiposAceite: tipos,
        porLugar: porLugar
      })
    }
    
    setLoading(false)
  }

  if (loading) return <div className="dashboard-container"><p>Cargando...</p></div>

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <BarChart3 size={32} color="#2563eb" />
        <h1>Dashboard de Control</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <Droplets size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Recolectado</h3>
            <p className="stat-value">{stats.totalRecepcion.toFixed(1)} L</p>
          </div>
        </div>

        <div className="stat-card tipos">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Tipos de Aceite</h3>
            <p className="stat-value">{Object.keys(stats.tiposAceite).length}</p>
          </div>
        </div>

        <div className="stat-card lugares">
          <div className="stat-icon">
            <MapPin size={24} />
          </div>
          <div className="stat-content">
            <h3>Lugares Activos</h3>
            <p className="stat-value">{Object.keys(stats.porLugar).length}</p>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-box">
          <h2>Por Tipo de Aceite</h2>
          <div className="chart-items">
            {Object.entries(stats.tiposAceite).map(([tipo, cantidad]) => (
              <div key={tipo} className="chart-item">
                <span className="chart-label">{tipo}</span>
                <div className="chart-bar">
                  <div 
                    className="chart-fill"
                    style={{
                      width: `${(cantidad / stats.totalRecepcion) * 100}%`
                    }}
                  ></div>
                </div>
                <span className="chart-value">{cantidad.toFixed(1)}L</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-box">
          <h2>Por Lugar</h2>
          <div className="chart-items">
            {Object.entries(stats.porLugar).map(([lugar, cantidad]) => (
              <div key={lugar} className="chart-item">
                <span className="chart-label">{lugar}</span>
                <div className="chart-bar">
                  <div 
                    className="chart-fill"
                    style={{
                      width: `${(cantidad / stats.totalRecepcion) * 100}%`
                    }}
                  ></div>
                </div>
                <span className="chart-value">{cantidad.toFixed(1)}L</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={fetchStats} className="btn-refresh">
        Actualizar datos
      </button>
    </div>
  )
}