import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Calendar, Download, RotateCcw, Printer } from 'lucide-react'
import './ReporteVisual.css'

export default function ReporteVisual() {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [recepciones, setRecepciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [generado, setGenerado] = useState(false)
  const [lugares, setLugares] = useState({})

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

  const exportarPDF = () => {
    window.print()
  }

  const { totalLibras, totalImporte } = calcularTotales()
  const resumenTipos = calcularPorTipo()

  return (
    <div className="reporte-visual-container">
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

      {/* REPORTE VISUAL */}
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
    </div>
  )
}