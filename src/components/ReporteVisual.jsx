import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Calendar, RotateCcw, Printer } from 'lucide-react'
import './ReporteVisual.css'

export default function ReporteVisual() {
  const [tab, setTab] = useState('recepciones')
  
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

  // Precios por tipo de aceite
  const PRECIOS = {
    'Aceite Quemado': 1.50,
    'Grasa': 0.00,
    'Aceite / Grasa con mal olor': 0.00
  }

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
    const totalLibras = recepciones.reduce((sum, r) => sum + parseFloat(r.cantidad || 0), 0)
    const totalImporte = recepciones.reduce((sum, r) => {
      const precio = PRECIOS[r.tipo_aceite] || 0
      const cantidad = parseFloat(r.cantidad || 0)
      return sum + (precio * cantidad)
    }, 0)

    return { totalLibras, totalImporte }
  }

  const calcularPorTipo = () => {
    const resumen = {}
    
    recepciones.forEach(r => {
      if (!resumen[r.tipo_aceite]) {
        resumen[r.tipo_aceite] = {
          tipo: r.tipo_aceite,
          cantidad: 0,
          precio: PRECIOS[r.tipo_aceite] || 0,
          importe: 0
        }
      }
      const cant = parseFloat(r.cantidad || 0)
      resumen[r.tipo_aceite].cantidad += cant
      resumen[r.tipo_aceite].importe += cant * (PRECIOS[r.tipo_aceite] || 0)
    })

    return Object.values(resumen)
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

  const exportarPDF = () => {
    window.print()
  }

  const { totalLibras, totalImporte } = calcularTotales()
  const resumenTipos = calcularPorTipo()
  const { totalLibras: totalLibrasC, totalLugares, ciclosCompletados } = calcularTotalesCiclos()

  return (
    <div className="reporte-visual-container">
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
            <div className="reporte-visual">
              
              {/* ENCABEZADO */}
              <div className="reporte-header-visual">
                <h1>RECOLECCIÓN ORGÁNICOS VALORIZABLES {new Date().getFullYear()}</h1>
                <h2>ORGÁNICOS</h2>
              </div>

              {/* RESUMEN POR TIPO */}
              <div className="resumen-section">
                <table className="resumen-tabla">
                  <thead>
                    <tr>
                      <th>DET</th>
                      <th>CRR</th>
                      <th>VOLUMEN</th>
                      <th>IMPORTE $</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="resumen-fila">
                      <td>6070</td>
                      <td>Recolección de Orgánicos</td>
                      <td>{totalLibras.toFixed(1)}</td>
                      <td>$ {totalImporte.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABLA DE PRECIOS */}
              <div className="precios-section">
                <table className="precios-tabla">
                  <thead>
                    <tr>
                      <th>Precio</th>
                      <th>Residuo</th>
                      <th>KG/litros</th>
                      <th>$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenTipos.map((item, idx) => (
                      <tr key={idx}>
                        <td>${item.precio.toFixed(2)}</td>
                        <td>{item.tipo}</td>
                        <td>{item.cantidad.toFixed(2)}</td>
                        <td>$ {item.importe.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TABLA DETALLADA */}
              <div className="tabla-detallada-section">
                <h3>DETALLE DE RECEPCIONES</h3>
                
                <div className="tabla-scroll">
                  <table className="tabla-detallada">
                    <thead>
                      <tr>
                        <th>DET</th>
                        <th>PAÍS</th>
                        <th>CÓDIGO</th>
                        <th>TIENDA</th>
                        <th>COMPRADOR</th>
                        <th>SUBPRODUCTO</th>
                        <th>FECHA</th>
                        <th>LIBRAS</th>
                        <th>PRECIO</th>
                        <th>IMPORTE</th>
                        <th>INCIDENCIAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recepciones.map((r, idx) => {
                        const precio = PRECIOS[r.tipo_aceite] || 0
                        const cantidad = parseFloat(r.cantidad || 0)
                        const importe = precio * cantidad

                        return (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>Honduras</td>
                            <td>{lugares[r.lugar_id]?.codigo || '-'}</td>
                            <td>{lugares[r.lugar_id]?.nombre || '-'}</td>
                            <td>{r.operario || 'SOQUIN'}</td>
                            <td>{r.tipo_aceite}</td>
                            <td>{new Date(r.created_at).toLocaleDateString('es-HN')}</td>
                            <td className="numero">{cantidad.toFixed(2)}</td>
                            <td className="numero">$ {precio.toFixed(2)}</td>
                            <td className="numero">$ {importe.toFixed(2)}</td>
                            <td>{r.observaciones || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TOTALES */}
              <div className="totales-visual">
                <div className="total-item">
                  <span className="total-label">TOTAL LIBRAS:</span>
                  <span className="total-valor">{totalLibras.toFixed(2)}</span>
                </div>
                <div className="total-item">
                  <span className="total-label">TOTAL IMPORTE:</span>
                  <span className="total-valor">$ {totalImporte.toFixed(2)}</span>
                </div>
              </div>

              {/* BOTONES ACCIÓN */}
              <div className="botones-accion">
                <button onClick={exportarPDF} className="btn-print">
                  <Printer size={20} /> Imprimir
                </button>
              </div>
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
            <div className="reporte-visual">
              
              {/* ENCABEZADO */}
              <div className="reporte-header-visual">
                <h1>REPORTE DE CICLOS {new Date().getFullYear()}</h1>
                <h2>CICLOS DE RECOLECCIÓN</h2>
              </div>

              {/* RESUMEN */}
              <div className="resumen-section">
                <table className="resumen-tabla">
                  <thead>
                    <tr>
                      <th>DET</th>
                      <th>DESCRIPCIÓN</th>
                      <th>TOTAL LIBRAS</th>
                      <th>TOTAL LUGARES</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="resumen-fila">
                      <td>1000</td>
                      <td>Ciclos de Recolección</td>
                      <td>{totalLibrasC.toFixed(2)}</td>
                      <td>{totalLugares}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABLA PRECIOS/STATS */}
              <div className="precios-section">
                <table className="precios-tabla">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Cantidad</th>
                      <th>Total Libras</th>
                      <th>% Completados</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Completados</td>
                      <td>{ciclosCompletados}</td>
                      <td>{ciclos.filter(c => c.estado === 'Cerrado').reduce((sum, c) => sum + parseFloat(c.total_libras || 0), 0).toFixed(2)}</td>
                      <td>{ciclos.length > 0 ? ((ciclosCompletados / ciclos.length) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td>Abiertos</td>
                      <td>{ciclos.length - ciclosCompletados}</td>
                      <td>{ciclos.filter(c => c.estado === 'Abierto').reduce((sum, c) => sum + parseFloat(c.total_libras || 0), 0).toFixed(2)}</td>
                      <td>{ciclos.length > 0 ? (((ciclos.length - ciclosCompletados) / ciclos.length) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABLA DETALLADA */}
              <div className="tabla-detallada-section">
                <h3>DETALLE DE CICLOS</h3>
                
                <div className="tabla-scroll">
                  <table className="tabla-detallada">
                    <thead>
                      <tr>
                        <th>DET</th>
                        <th>NOMBRE CICLO</th>
                        <th>MES/AÑO</th>
                        <th>RESPONSABLE</th>
                        <th>ESTADO</th>
                        <th>TOTAL LIBRAS</th>
                        <th>LUGARES</th>
                        <th>FECHA INICIO</th>
                        <th>FECHA CIERRE</th>
                        <th>OBSERVACIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ciclos.map((c, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{c.nombre}</td>
                          <td>{c.mes_ano || '-'}</td>
                          <td>{c.persona_responsable || '-'}</td>
                          <td>{c.estado}</td>
                          <td className="numero">{parseFloat(c.total_libras || 0).toFixed(2)}</td>
                          <td className="numero">{c.total_lugares || 0}</td>
                          <td>{new Date(c.fecha_inicio).toLocaleDateString('es-HN')}</td>
                          <td>{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleDateString('es-HN') : '-'}</td>
                          <td>{c.observaciones || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TOTALES */}
              <div className="totales-visual">
                <div className="total-item">
                  <span className="total-label">TOTAL LIBRAS:</span>
                  <span className="total-valor">{totalLibrasC.toFixed(2)}</span>
                </div>
                <div className="total-item">
                  <span className="total-label">CICLOS COMPLETADOS:</span>
                  <span className="total-valor">{ciclosCompletados}/{ciclos.length}</span>
                </div>
              </div>

              {/* BOTONES ACCIÓN */}
              <div className="botones-accion">
                <button onClick={exportarPDF} className="btn-print">
                  <Printer size={20} /> Imprimir
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}