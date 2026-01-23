import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Calendar, Download, RotateCcw, FileText } from 'lucide-react'
import './Reportes.css'

export default function Reportes() {
  const [tab, setTab] = useState('recepciones') // 'recepciones' o 'ciclos'
  
  // RECEPCIONES
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [recepciones, setRecepciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [generado, setGenerado] = useState(false)
  const [lugares, setLugares] = useState({})

  // CICLOS
  const [fechaDesdeC, setFechaDesdeC] = useState('')
  const [fechaHastaC, setFechaHastaC] = useState('')
  const [ciclos, setCiclos] = useState([])
  const [loadingC, setLoadingC] = useState(false)
  const [generadoC, setGeneradoC] = useState(false)

  // Cargar lugares al montar
  useEffect(() => {
    cargarLugares()
  }, [])

  const cargarLugares = async () => {
    const { data } = await supabase.from('lugares').select('id, nombre, codigo_tienda')
    if (data) {
      const lugaresMap = {}
      data.forEach(l => {
        lugaresMap[l.id] = { nombre: l.nombre, codigo: l.codigo_tienda }
      })
      setLugares(lugaresMap)
    }
  }

  // ============ RECEPCIONES ============
  const generarReporte = async (e) => {
    e.preventDefault()
    
    if (!fechaDesde && !fechaHasta) {
      alert('Por favor selecciona al menos una fecha')
      return
    }

    setLoading(true)

    let query = supabase
      .from('recepciones')
      .select('*')
      .order('created_at', { ascending: false })

    if (fechaDesde) {
      query = query.gte('created_at', `${fechaDesde}T00:00:00`)
    }
    if (fechaHasta) {
      query = query.lte('created_at', `${fechaHasta}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      alert('Error: ' + error.message)
      console.error(error)
    } else {
      setRecepciones(data || [])
      setGenerado(true)
    }
    setLoading(false)
  }

  const limpiar = () => {
    setFechaDesde('')
    setFechaHasta('')
    setRecepciones([])
    setGenerado(false)
  }

  const calcularTotales = () => {
    const totalKg = recepciones.reduce((sum, r) => sum + parseFloat(r.cantidad || 0), 0)
    const totalImporte = recepciones.reduce((sum, r) => {
      const precio = parseFloat(r.precio || 0)
      const cantidad = parseFloat(r.cantidad || 0)
      return sum + (precio * cantidad)
    }, 0)

    return { totalKg, totalImporte }
  }

  const exportarCSV = () => {
    if (recepciones.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    const headers = [
      'País',
      'Código Tienda',
      'Tienda',
      'Operario',
      'Tipo Aceite',
      'Fecha',
      'KG/Litros',
      'Precio',
      'Importe',
      'Estado',
      'Observaciones'
    ]

    const rows = recepciones.map(r => {
      const precio = parseFloat(r.precio || 0)
      const cantidad = parseFloat(r.cantidad || 0)
      const importe = precio * cantidad

      return [
        'Honduras',
        lugares[r.lugar_id]?.codigo || '-',
        lugares[r.lugar_id]?.nombre || '-',
        r.operario || '-',
        r.tipo_aceite || '-',
        new Date(r.created_at).toLocaleDateString('es-HN'),
        cantidad.toFixed(2),
        precio.toFixed(2),
        importe.toFixed(2),
        r.estado_aceite || '-',
        r.observaciones || '-'
      ]
    })

    const totales = calcularTotales()

    rows.push([
      '',
      '',
      'TOTALES',
      '',
      '',
      '',
      totales.totalKg.toFixed(2),
      '',
      totales.totalImporte.toFixed(2),
      '',
      ''
    ])

    let csv = headers.join(',') + '\n'
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_recepciones_${fechaDesde || 'completo'}_a_${fechaHasta || 'hoy'}.csv`)
    link.click()
  }

  // ============ CICLOS ============
  const generarReporteCiclos = async (e) => {
    e.preventDefault()
    
    if (!fechaDesdeC && !fechaHastaC) {
      alert('Por favor selecciona al menos una fecha')
      return
    }

    setLoadingC(true)

    let query = supabase
      .from('ciclos_recoleccion')
      .select('*')
      .order('created_at', { ascending: false })

    if (fechaDesdeC) {
      query = query.gte('fecha_inicio', `${fechaDesdeC}T00:00:00`)
    }
    if (fechaHastaC) {
      query = query.lte('fecha_inicio', `${fechaHastaC}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      alert('Error: ' + error.message)
      console.error(error)
    } else {
      setCiclos(data || [])
      setGeneradoC(true)
    }
    setLoadingC(false)
  }

  const limpiarC = () => {
    setFechaDesdeC('')
    setFechaHastaC('')
    setCiclos([])
    setGeneradoC(false)
  }

  const calcularTotalesCiclos = () => {
    const totalLibras = ciclos.reduce((sum, c) => sum + parseFloat(c.total_libras || 0), 0)
    const totalLugares = ciclos.reduce((sum, c) => sum + (c.total_lugares || 0), 0)
    const ciclosCompletados = ciclos.filter(c => c.estado === 'Cerrado').length

    return { totalLibras, totalLugares, ciclosCompletados }
  }

  const exportarCSVCiclos = () => {
    if (ciclos.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    const headers = [
      'Nombre Ciclo',
      'Mes/Año',
      'Responsable',
      'Total Libras',
      'Total Lugares',
      'Estado',
      'Fecha Inicio',
      'Fecha Cierre',
      'Observaciones'
    ]

    const rows = ciclos.map(c => [
      c.nombre || '-',
      c.mes_ano || '-',
      c.persona_responsable || '-',
      parseFloat(c.total_libras || 0).toFixed(2),
      c.total_lugares || 0,
      c.estado || '-',
      new Date(c.fecha_inicio).toLocaleDateString('es-HN'),
      c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleDateString('es-HN') : '-',
      c.observaciones || '-'
    ])

    const totales = calcularTotalesCiclos()

    rows.push([
      'TOTALES',
      '',
      '',
      totales.totalLibras.toFixed(2),
      totales.totalLugares,
      `${totales.ciclosCompletados}/${ciclos.length}`,
      '',
      '',
      ''
    ])

    let csv = headers.join(',') + '\n'
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_ciclos_${fechaDesdeC || 'completo'}_a_${fechaHastaC || 'hoy'}.csv`)
    link.click()
  }

  const { totalKg, totalImporte } = calcularTotales()
  const { totalLibras, totalLugares, ciclosCompletados } = calcularTotalesCiclos()

  return (
    <div className="reportes-container">
      <div className="reportes-header">
        <div className="header-content">
          <FileText size={40} color="#667eea" />
          <div>
            <h1>📊 Reportes de Recepciones</h1>
            <p>Genera reportes filtrados por rango de fechas</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs-header">
        <button 
          className={`tab-btn ${tab === 'recepciones' ? 'activo' : ''}`}
          onClick={() => setTab('recepciones')}
        >
          📋 Recepciones
        </button>
        <button 
          className={`tab-btn ${tab === 'ciclos' ? 'activo' : ''}`}
          onClick={() => setTab('ciclos')}
        >
          🔄 Ciclos
        </button>
      </div>

      {/* ============ RECEPCIONES ============ */}
      {tab === 'recepciones' && (
        <>
          <form onSubmit={generarReporte} className="filtro-form">
            <h3>Filtrar por fechas</h3>
            
            <div className="fecha-group">
              <div className="input-group">
                <label>
                  <Calendar size={18} /> Fecha Desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>
                  <Calendar size={18} /> Fecha Hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
            </div>

            <div className="botones-grupo">
              <button type="submit" disabled={loading} className="btn-generar">
                {loading ? '⏳ Generando...' : '🔍 Generar Reporte'}
              </button>
              <button type="button" onClick={limpiar} className="btn-limpiar">
                <RotateCcw size={18} /> Limpiar
              </button>
            </div>
          </form>

          {generado && (
            <div className="reporte-resultado">
              <div className="reporte-info">
                <div className="info-content">
                  <h2>Resultado del Reporte</h2>
                  <div className="info-detalles">
                    <p>
                      <strong>De:</strong> {fechaDesde ? new Date(fechaDesde).toLocaleDateString('es-HN') : 'Inicio'}
                    </p>
                    <p>
                      <strong>Hasta:</strong> {fechaHasta ? new Date(fechaHasta).toLocaleDateString('es-HN') : 'Hoy'}
                    </p>
                    <p className="total-registros">
                      <strong>Total registros:</strong> {recepciones.length}
                    </p>
                  </div>
                </div>
              </div>

              {recepciones.length === 0 ? (
                <div className="sin-datos">
                  <p>❌ No hay datos para el rango de fechas seleccionado</p>
                </div>
              ) : (
                <>
                  <div className="tabla-scroll">
                    <table className="tabla-reportes">
                      <thead>
                        <tr>
                          <th>País</th>
                          <th>Código</th>
                          <th>Tienda</th>
                          <th>Operario</th>
                          <th>Tipo Aceite</th>
                          <th>Fecha</th>
                          <th>KG/Litros</th>
                          <th>Precio $</th>
                          <th>Importe $</th>
                          <th>Estado</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recepciones.map((r, idx) => {
                          const precio = parseFloat(r.precio || 0)
                          const cantidad = parseFloat(r.cantidad || 0)
                          const importe = precio * cantidad

                          return (
                            <tr key={idx}>
                              <td>Honduras</td>
                              <td className="codigo">{lugares[r.lugar_id]?.codigo || '-'}</td>
                              <td className="tienda">{lugares[r.lugar_id]?.nombre || '-'}</td>
                              <td>{r.operario || '-'}</td>
                              <td>{r.tipo_aceite || '-'}</td>
                              <td>{new Date(r.fecha_recepcion).toLocaleDateString('es-HN')}</td>
                              <td className="numero">{cantidad.toFixed(2)}</td>
                              <td className="numero">${precio.toFixed(2)}</td>
                              <td className="numero">${importe.toFixed(2)}</td>
                              <td>
                                <span className={`badge-estado ${r.estado_aceite}`}>
                                  {r.estado_aceite || '-'}
                                </span>
                              </td>
                              <td className="observaciones">{r.observaciones || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="totales">
                          <td colSpan="6" className="label-totales">
                            TOTALES
                          </td>
                          <td className="numero total-valor">
                            <strong>{totalKg.toFixed(2)}</strong>
                          </td>
                          <td></td>
                          <td className="numero total-valor">
                            <strong>${totalImporte.toFixed(2)}</strong>
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="botones-exportar">
                    <button onClick={exportarCSV} className="btn-export">
                      <Download size={20} /> Descargar CSV
                    </button>
                  </div>

                  <div className="resumen-datos">
                    <div className="resumen-card">
                      <h4>Total Recolectado</h4>
                      <p className="valor">{totalKg.toFixed(2)} KG/L</p>
                    </div>
                    <div className="resumen-card">
                      <h4>Total Importe</h4>
                      <p className="valor">${totalImporte.toFixed(2)}</p>
                    </div>
                    <div className="resumen-card">
                      <h4>Registros</h4>
                      <p className="valor">{recepciones.length}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ CICLOS ============ */}
      {tab === 'ciclos' && (
        <>
          <form onSubmit={generarReporteCiclos} className="filtro-form">
            <h3>Filtrar por fechas</h3>
            
            <div className="fecha-group">
              <div className="input-group">
                <label>
                  <Calendar size={18} /> Fecha Desde
                </label>
                <input
                  type="date"
                  value={fechaDesdeC}
                  onChange={(e) => setFechaDesdeC(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>
                  <Calendar size={18} /> Fecha Hasta
                </label>
                <input
                  type="date"
                  value={fechaHastaC}
                  onChange={(e) => setFechaHastaC(e.target.value)}
                />
              </div>
            </div>

            <div className="botones-grupo">
              <button type="submit" disabled={loadingC} className="btn-generar">
                {loadingC ? '⏳ Generando...' : '🔍 Generar Reporte'}
              </button>
              <button type="button" onClick={limpiarC} className="btn-limpiar">
                <RotateCcw size={18} /> Limpiar
              </button>
            </div>
          </form>

          {generadoC && (
            <div className="reporte-resultado">
              <div className="reporte-info">
                <div className="info-content">
                  <h2>Resultado del Reporte - Ciclos</h2>
                  <div className="info-detalles">
                    <p>
                      <strong>De:</strong> {fechaDesdeC ? new Date(fechaDesdeC).toLocaleDateString('es-HN') : 'Inicio'}
                    </p>
                    <p>
                      <strong>Hasta:</strong> {fechaHastaC ? new Date(fechaHastaC).toLocaleDateString('es-HN') : 'Hoy'}
                    </p>
                    <p className="total-registros">
                      <strong>Total ciclos:</strong> {ciclos.length}
                    </p>
                  </div>
                </div>
              </div>

              {ciclos.length === 0 ? (
                <div className="sin-datos">
                  <p>❌ No hay datos para el rango de fechas seleccionado</p>
                </div>
              ) : (
                <>
                  <div className="tabla-scroll">
                    <table className="tabla-reportes">
                      <thead>
                        <tr>
                          <th>Nombre Ciclo</th>
                          <th>Mes/Año</th>
                          <th>Responsable</th>
                          <th>Total Libras</th>
                          <th>Total Lugares</th>
                          <th>Estado</th>
                          <th>Fecha Inicio</th>
                          <th>Fecha Cierre</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ciclos.map((c, idx) => (
                          <tr key={idx}>
                            <td className="tienda">{c.nombre}</td>
                            <td>{c.mes_ano || '-'}</td>
                            <td>{c.persona_responsable || '-'}</td>
                            <td className="numero">{parseFloat(c.total_libras || 0).toFixed(2)}</td>
                            <td className="numero">{c.total_lugares || 0}</td>
                            <td>
                              <span className={`badge-estado ${c.estado.toLowerCase()}`}>
                                {c.estado}
                              </span>
                            </td>
                            <td>{new Date(c.fecha_inicio).toLocaleDateString('es-HN')}</td>
                            <td>{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleDateString('es-HN') : '-'}</td>
                            <td className="observaciones">{c.observaciones || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="totales">
                          <td colSpan="3" className="label-totales">
                            TOTALES
                          </td>
                          <td className="numero total-valor">
                            <strong>{totalLibras.toFixed(2)}</strong>
                          </td>
                          <td className="numero total-valor">
                            <strong>{totalLugares}</strong>
                          </td>
                          <td className="numero total-valor">
                            <strong>{ciclosCompletados}/{ciclos.length}</strong>
                          </td>
                          <td colSpan="3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="botones-exportar">
                    <button onClick={exportarCSVCiclos} className="btn-export">
                      <Download size={20} /> Descargar CSV
                    </button>
                  </div>

                  <div className="resumen-datos">
                    <div className="resumen-card">
                      <h4>Total Libras</h4>
                      <p className="valor">{totalLibras.toFixed(2)} lbs</p>
                    </div>
                    <div className="resumen-card">
                      <h4>Total Lugares</h4>
                      <p className="valor">{totalLugares}</p>
                    </div>
                    <div className="resumen-card">
                      <h4>Ciclos Completados</h4>
                      <p className="valor">{ciclosCompletados}/{ciclos.length}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}