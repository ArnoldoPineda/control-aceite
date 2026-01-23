import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { BarChart3, TrendingUp, Droplets, MapPin, Calendar, Target } from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLibras: 0,
    totalCiclos: 0,
    ciclosCompletados: 0,
    promedioLibrasPorCiclo: 0,
    ultimoCiclo: null,
    tiposAceite: {},
    porCentro: {},
    centrosTop3: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    
    try {
      // 1. Obtener todos los ciclos
      const { data: ciclos } = await supabase
        .from('ciclos_recoleccion')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. Obtener todas las recepciones
      const { data: recepciones } = await supabase
        .from('recepciones')
        .select('cantidad, tipo_aceite, lugar_id, ciclo_id')

      // 3. Obtener lugares
      const { data: lugares } = await supabase
        .from('lugares')
        .select('id, nombre')

      if (recepciones && ciclos) {
        // Total libras consolidado
        const totalLibras = parseFloat(
          recepciones.reduce((sum, r) => sum + (r.cantidad || 0), 0).toFixed(2)
        )

        // Ciclos completados
        const ciclosCompletados = ciclos.filter(c => c.estado === 'Cerrado').length

        // Promedio libras por ciclo
        const promedioLibrasPorCiclo = ciclos.length > 0 
          ? parseFloat((totalLibras / ciclos.length).toFixed(2))
          : 0

        // Último ciclo
        const ultimoCiclo = ciclos.length > 0 ? ciclos[0] : null

        // Agrupar por tipo de aceite
        const tipos = {}
        recepciones.forEach(r => {
          tipos[r.tipo_aceite] = (tipos[r.tipo_aceite] || 0) + r.cantidad
        })

        // Agrupar por centro (lugar)
        const porCentro = {}
        const centrosData = []

        if (lugares) {
          lugares.forEach(l => {
            const cantidadCentro = recepciones
              .filter(r => r.lugar_id === l.id)
              .reduce((sum, r) => sum + r.cantidad, 0)
            
            if (cantidadCentro > 0) {
              porCentro[l.nombre] = parseFloat(cantidadCentro.toFixed(2))
              centrosData.push({
                nombre: l.nombre,
                cantidad: parseFloat(cantidadCentro.toFixed(2))
              })
            }
          })
        }

        // Top 3 centros
        const centrosTop3 = centrosData
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 3)

        setStats({
          totalLibras: totalLibras,
          totalCiclos: ciclos.length,
          ciclosCompletados: ciclosCompletados,
          promedioLibrasPorCiclo: promedioLibrasPorCiclo,
          ultimoCiclo: ultimoCiclo,
          tiposAceite: tipos,
          porCentro: porCentro,
          centrosTop3: centrosTop3
        })
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
    
    setLoading(false)
  }

  const formatearLibras = (numero) => {
    return parseFloat(numero || 0).toFixed(2)
  }

  if (loading) return <div className="dashboard-container"><p>Cargando...</p></div>

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <BarChart3 size={32} color="white" />
        <h1>Dashboard de Control</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <Droplets size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Recolectado</h3>
            <p className="stat-value">{formatearLibras(stats.totalLibras)} lbs</p>
          </div>
        </div>

        <div className="stat-card ciclos">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Ciclos Completados</h3>
            <p className="stat-value">{stats.ciclosCompletados}/{stats.totalCiclos}</p>
          </div>
        </div>

        <div className="stat-card promedio">
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <h3>Promedio por Ciclo</h3>
            <p className="stat-value">{formatearLibras(stats.promedioLibrasPorCiclo)} lbs</p>
          </div>
        </div>

        <div className="stat-card centros">
          <div className="stat-icon">
            <MapPin size={24} />
          </div>
          <div className="stat-content">
            <h3>Centros Activos</h3>
            <p className="stat-value">{Object.keys(stats.porCentro).length}</p>
          </div>
        </div>
      </div>

      {stats.ultimoCiclo && (
        <div className="ultimo-ciclo-card">
          <h3>Último Ciclo Procesado</h3>
          <div className="ciclo-info">
            <div className="ciclo-detalle">
              <span className="label">Nombre:</span>
              <span className="valor">{stats.ultimoCiclo.nombre}</span>
            </div>
            <div className="ciclo-detalle">
              <span className="label">Responsable:</span>
              <span className="valor">{stats.ultimoCiclo.persona_responsable}</span>
            </div>
            <div className="ciclo-detalle">
              <span className="label">Total Libras:</span>
              <span className="valor">{formatearLibras(stats.ultimoCiclo.total_libras)} lbs</span>
            </div>
            <div className="ciclo-detalle">
              <span className="label">Lugares Visitados:</span>
              <span className="valor">{stats.ultimoCiclo.total_lugares}</span>
            </div>
            <div className="ciclo-detalle">
              <span className="label">Estado:</span>
              <span className={`estado ${stats.ultimoCiclo.estado.toLowerCase()}`}>
                {stats.ultimoCiclo.estado}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="charts-section">
        <div className="chart-box top-centros">
          <h2>🏆 Top 3 Centros de Recolección</h2>
          <div className="top-centros-list">
            {stats.centrosTop3.length > 0 ? (
              stats.centrosTop3.map((centro, index) => (
                <div key={centro.nombre} className="top-centro-item">
                  <div className="top-posicion">#{index + 1}</div>
                  <div className="top-info">
                    <span className="top-nombre">{centro.nombre}</span>
                    <div className="top-barra">
                      <div 
                        className="top-relleno"
                        style={{
                          width: `${(centro.cantidad / stats.totalLibras) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="top-valor">{formatearLibras(centro.cantidad)} lbs</span>
                </div>
              ))
            ) : (
              <p className="sin-datos">No hay datos disponibles</p>
            )}
          </div>
        </div>

        <div className="chart-box por-centros">
          <h2>Distribución por Centro</h2>
          <div className="chart-items">
            {Object.entries(stats.porCentro).length > 0 ? (
              Object.entries(stats.porCentro).map(([centro, cantidad]) => (
                <div key={centro} className="chart-item">
                  <span className="chart-label">{centro}</span>
                  <div className="chart-bar">
                    <div 
                      className="chart-fill"
                      style={{
                        width: `${(cantidad / stats.totalLibras) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="chart-value">{formatearLibras(cantidad)} lbs</span>
                </div>
              ))
            ) : (
              <p className="sin-datos">No hay datos disponibles</p>
            )}
          </div>
        </div>
      </div>

      {Object.keys(stats.tiposAceite).length > 0 && (
        <div className="chart-box tipos-aceite">
          <h2>Tipos de Aceite Recolectado</h2>
          <div className="chart-items">
            {Object.entries(stats.tiposAceite).map(([tipo, cantidad]) => (
              <div key={tipo} className="chart-item">
                <span className="chart-label">{tipo}</span>
                <div className="chart-bar">
                  <div 
                    className="chart-fill"
                    style={{
                      width: `${(cantidad / stats.totalLibras) * 100}%`
                    }}
                  ></div>
                </div>
                <span className="chart-value">{formatearLibras(cantidad)} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={fetchStats} className="btn-refresh">
        🔄 Actualizar datos
      </button>
    </div>
  )
}