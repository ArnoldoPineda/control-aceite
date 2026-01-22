import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Droplet, Plus, Trash2, ChevronRight } from 'lucide-react'
import './FormRecoleccion.css'

export default function FormRecoleccion() {
  const [lugares, setLugares] = useState([])
  const [lugarActual, setLugarActual] = useState(null)
  const [bidones, setBidones] = useState([{ id: 1, cantidad: '' }])
  const [totalLugares, setTotalLugares] = useState(0)
  const [lugarActualIndex, setLugarActualIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  useEffect(() => {
    fetchLugares()
  }, [])

  const fetchLugares = async () => {
    const { data, error } = await supabase.from('lugares').select('*').order('id')
    if (error) console.error('Error:', error)
    else {
      setLugares(data || [])
      if (data && data.length > 0) {
        setLugarActual(data[0])
        setTotalLugares(data.length)
      }
    }
  }

  // Agregar nuevo bidón automáticamente cuando el anterior se completa
  const handleBidonChange = (index, value) => {
    const newBidones = [...bidones]
    newBidones[index].cantidad = value

    // Si el campo actual tiene valor y es el último, agregar uno nuevo
    if (value && index === bidones.length - 1) {
      newBidones.push({ id: bidones.length + 1, cantidad: '' })
    }

    setBidones(newBidones)
  }

  // Eliminar bidón
  const eliminarBidon = (index) => {
    if (bidones.length > 1) {
      const newBidones = bidones.filter((_, i) => i !== index)
      // Renumerar los bidones
      newBidones.forEach((bidon, i) => {
        bidon.id = i + 1
      })
      setBidones(newBidones)
    }
  }

  // Calcular total de libras
  const calcularTotal = () => {
    return bidones.reduce((sum, bidon) => sum + (parseFloat(bidon.cantidad) || 0), 0)
  }

  // Guardar todos los bidones de un lugar
  const handleGuardar = async () => {
    if (!lugarActual) {
      alert('Selecciona un lugar')
      return
    }

    // Validar que haya al menos un bidón con cantidad
    const bidonesConCantidad = bidones.filter(b => b.cantidad && parseFloat(b.cantidad) > 0)
    if (bidonesConCantidad.length === 0) {
      alert('Debes ingresar al menos una cantidad')
      return
    }

    setLoading(true)

    try {
      // Guardar cada bidón como un registro en la BD
      for (const bidon of bidonesConCantidad) {
        const { error } = await supabase.from('recepciones').insert([
          {
            lugar_id: lugarActual.id,
            tipo_aceite: 'Aceite Quemado',
            cantidad: parseFloat(bidon.cantidad),
            observaciones: `Bidón #${bidon.id}`,
            fecha_recepcion: new Date().toISOString(),
            recolector_nombre: null
          }
        ])

        if (error) throw error
      }

      // Éxito
      setMensajeExito(`✅ ${bidonesConCantidad.length} bidón(es) guardado(s) en ${lugarActual.nombre}`)
      
      // Ir al siguiente lugar
      if (lugarActualIndex < totalLugares - 1) {
        setTimeout(() => {
          setLugarActualIndex(lugarActualIndex + 1)
          setLugarActual(lugares[lugarActualIndex + 1])
          setBidones([{ id: 1, cantidad: '' }])
          setMensajeExito('')
        }, 1500)
      } else {
        // Último lugar
        setTimeout(() => {
          alert('✅ ¡Recolección completada en todos los lugares!')
          setLugarActualIndex(0)
          setLugarActual(lugares[0])
          setBidones([{ id: 1, cantidad: '' }])
          setMensajeExito('')
        }, 1500)
      }
    } catch (error) {
      alert('Error: ' + error.message)
    }

    setLoading(false)
  }

  // Ir al lugar anterior
  const irAlAnterior = () => {
    if (lugarActualIndex > 0) {
      setLugarActualIndex(lugarActualIndex - 1)
      setLugarActual(lugares[lugarActualIndex - 1])
      setBidones([{ id: 1, cantidad: '' }])
      setMensajeExito('')
    }
  }

  if (!lugarActual) {
    return <div className="form-container"><p>Cargando lugares...</p></div>
  }

  const total = calcularTotal()

  return (
    <div className="form-container">
      <div className="form-header">
        <Droplet size={32} color="#2563eb" />
        <h1>Control de Aceite Quemado</h1>
        <p className="lugar-info">
          Lugar {lugarActualIndex + 1} de {totalLugares}
        </p>
      </div>

      {/* UBICACIÓN ACTUAL */}
      <div className="lugar-header">
        <h2>{lugarActual.nombre}</h2>
        <span className="codigo-tienda">Código: {lugarActual.codigo_tienda}</span>
      </div>

      {/* MENSAJE DE ÉXITO */}
      {mensajeExito && (
        <div className="mensaje-exito">
          {mensajeExito}
        </div>
      )}

      {/* TIPO DE ACEITE (FIJO) */}
      <div className="aceite-fijo">
        <p>Tipo: <strong>Aceite Quemado</strong></p>
      </div>

      {/* CONTENEDOR DE BIDONES */}
      <div className="bidones-container">
        <label className="label-unidad">Libras</label>
        
        {bidones.map((bidon, index) => (
          <div key={index} className="bidon-row">
            <div className="bidon-label">Bidón {bidon.id}</div>
            <input
              type="number"
              step="0.1"
              min="0"
              value={bidon.cantidad}
              onChange={(e) => handleBidonChange(index, e.target.value)}
              placeholder="0"
              className="bidon-input"
            />
            {bidones.length > 1 && (
              <button
                type="button"
                onClick={() => eliminarBidon(index)}
                className="btn-eliminar"
                title="Eliminar bidón"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* CONTADOR TOTAL */}
      <div className="total-section">
        <div className="total-card">
          <span className="total-label">Total Recolectado:</span>
          <span className="total-valor">{total.toFixed(2)} lbs</span>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="botones-section">
        <button
          type="button"
          onClick={irAlAnterior}
          disabled={lugarActualIndex === 0 || loading}
          className="btn-anterior"
        >
          ← Anterior
        </button>

        <button
          type="button"
          onClick={handleGuardar}
          disabled={loading || total === 0}
          className="btn-guardar"
        >
          {loading ? '⏳ Guardando...' : '💾 Guardar y Siguiente'}
        </button>
      </div>

      {/* INDICADOR DE PROGRESO */}
      <div className="progreso-bar">
        <div 
          className="progreso-fill" 
          style={{ width: `${((lugarActualIndex + 1) / totalLugares) * 100}%` }}
        ></div>
      </div>
    </div>
  )
}