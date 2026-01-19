import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Calendar, Download, RotateCcw, FileText } from 'lucide-react'
import './Reportes.css'

export default function Reportes() {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [recepciones, setRecepciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [generado, setGenerado] = useState(false)
  const [lugares, setLugares] = useState({})

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

    // Agregar fila de totales
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

    // Crear CSV
    let csv = headers.join(',') + '\n'
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_${fechaDesde || 'completo'}_a_${fechaHasta || 'hoy'}.csv`)
    link.click()
  }

  const { totalKg, totalImporte } = calcularTotales()

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

      {/* FORMULARIO FILTRO */}
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

      {/* TABLA DE RESULTADOS */}
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
    </div>
  )
}