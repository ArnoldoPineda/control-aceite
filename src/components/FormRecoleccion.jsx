import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Droplet, Plus, X } from 'lucide-react'
import './FormRecoleccion.css'

export default function FormRecoleccion() {
  const [lugares, setLugares] = useState([])
  const [lugarActual, setLugarActual] = useState(null)
  const [bidones, setBidones] = useState([{ id: 1, cantidad: '' }])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [iniciado, setIniciado] = useState(false)

  // CICLO
  const [cicloActual, setCicloActual] = useState(null)
  const [mostrarModalCiclo, setMostrarModalCiclo] = useState(true)
  const [personaResponsable, setPersonaResponsable] = useState('')
  const [nombreCiclo, setNombreCiclo] = useState('')
  const [resumenCiclo, setResumenCiclo] = useState({
    totalLibras: 0,
    lugaresVisitados: [],
    recolecciones: []
  })

  // SELECTOR LUGAR
  const [indexActual, setIndexActual] = useState(0)

  useEffect(() => {
    cargarLugares()
  }, [])

  const cargarLugares = async () => {
    const { data, error } = await supabase
      .from('lugares')
      .select('*')
      .order('id')

    if (error) {
      console.error('Error:', error)
      return
    }

    if (data && data.length > 0) {
      setLugares(data)
    }
  }

  // Generar nombre automático del ciclo
  const generarNombreCiclo = () => {
    const ahora = new Date()
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    const mes = meses[ahora.getMonth()]
    const ano = ahora.getFullYear()
    return `${mes} ${ano}`
  }

  const crearCiclo = async () => {
    if (!personaResponsable.trim()) {
      setMensaje('❌ Ingresa el nombre de la persona responsable')
      return
    }

    setLoading(true)

    try {
      // Obtener ciclos del mes actual para saber el número
      const mesAno = generarNombreCiclo()
      const { data: ciclosExistentes, error: errorBusqueda } = await supabase
        .from('ciclos_recoleccion')
        .select('numero_ciclo')
        .eq('mes_ano', mesAno)

      if (errorBusqueda) throw errorBusqueda

      const numeroCiclo = (ciclosExistentes?.length || 0) + 1
      const nombreCompleto = `${mesAno} - Ciclo ${numeroCiclo}`

      // Crear ciclo
      const { data, error } = await supabase
        .from('ciclos_recoleccion')
        .insert([
          {
            nombre: nombreCompleto,
            mes_ano: mesAno,
            numero_ciclo: numeroCiclo,
            persona_responsable: personaResponsable,
            estado: 'Abierto',
            total_libras: 0,
            total_lugares: 0
          }
        ])
        .select()

      if (error) throw error

      setCicloActual(data[0])
      setNombreCiclo(nombreCompleto)
      setMostrarModalCiclo(false)
      setIniciado(true)

      setMensaje(`✅ Ciclo creado: ${nombreCompleto}`)
      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      setMensaje('❌ Error: ' + error.message)
    }

    setLoading(false)
  }

  const iniciarRecoleccion = (lugarSeleccionado) => {
    const index = lugares.findIndex((l) => l.id === lugarSeleccionado.id)
    setIndexActual(index)
    setLugarActual(lugarSeleccionado)
    setBidones([{ id: 1, cantidad: '' }])
  }

  const handleBidonChange = (index, valor) => {
    const nuevosBidones = [...bidones]
    nuevosBidones[index].cantidad = valor

    if (valor && index === bidones.length - 1) {
      nuevosBidones.push({
        id: bidones.length + 1,
        cantidad: ''
      })
    }

    setBidones(nuevosBidones)
  }

  const eliminarBidon = (index) => {
    if (bidones.length > 1) {
      const nuevosBidones = bidones.filter((_, i) => i !== index)
      nuevosBidones.forEach((bidon, i) => {
        bidon.id = i + 1
      })
      setBidones(nuevosBidones)
    }
  }

  const calcularTotal = () => {
    return bidones.reduce((sum, bidon) => {
      return sum + (parseFloat(bidon.cantidad) || 0)
    }, 0)
  }

  const guardarRecoleccion = async () => {
    if (!lugarActual) {
      setMensaje('❌ Selecciona un lugar')
      return
    }

    const bidonesConCantidad = bidones.filter(
      (b) => b.cantidad && parseFloat(b.cantidad) > 0
    )

    if (bidonesConCantidad.length === 0) {
      setMensaje('❌ Ingresa al menos una cantidad')
      return
    }

    setLoading(true)
    setMensaje('')

    try {
      let totalGuardado = 0

      for (const bidon of bidonesConCantidad) {
        const { error } = await supabase.from('recepciones').insert([
          {
            lugar_id: lugarActual.id,
            tipo_aceite: 'Aceite Quemado',
            cantidad: parseFloat(bidon.cantidad),
            observaciones: `Bidón #${bidon.id}`,
            fecha_recepcion: new Date().toISOString(),
            recolector_nombre: personaResponsable,
            ciclo_id: cicloActual.id
          }
        ])

        if (error) throw error
        totalGuardado += parseFloat(bidon.cantidad)
      }

      // Actualizar resumen del ciclo
      const nuevoResumen = { ...resumenCiclo }
      nuevoResumen.totalLibras += totalGuardado

      if (!nuevoResumen.lugaresVisitados.includes(lugarActual.nombre)) {
        nuevoResumen.lugaresVisitados.push(lugarActual.nombre)
      }

      nuevoResumen.recolecciones.push({
        lugar: lugarActual.nombre,
        cantidad: totalGuardado,
        fecha: new Date().toLocaleString('es-ES'),
        bidones: bidonesConCantidad.length
      })

      setResumenCiclo(nuevoResumen)

      setMensaje(
        `✅ ${bidonesConCantidad.length} bidón(es) guardado(s) - Total: ${totalGuardado.toFixed(2)} lbs`
      )

      setTimeout(() => {
        setLugarActual(null)
        setBidones([{ id: 1, cantidad: '' }])
        setMensaje('')
      }, 1500)
    } catch (error) {
      setMensaje('❌ Error: ' + error.message)
    }

    setLoading(false)
  }

  const cambiarLugar = () => {
    setLugarActual(null)
    setBidones([{ id: 1, cantidad: '' }])
    setMensaje('')
  }

  const cerrarCiclo = async () => {
    if (!window.confirm('¿Cerrar este ciclo? No podrás agregar más recolecciones')) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('ciclos_recoleccion')
        .update({
          estado: 'Cerrado',
          fecha_cierre: new Date().toISOString(),
          total_libras: resumenCiclo.totalLibras,
          total_lugares: resumenCiclo.lugaresVisitados.length
        })
        .eq('id', cicloActual.id)

      if (error) throw error

      setMensaje('✅ Ciclo cerrado correctamente')
      setTimeout(() => {
        setCicloActual(null)
        setIniciado(false)
        setMostrarModalCiclo(true)
        setPersonaResponsable('')
        setResumenCiclo({
          totalLibras: 0,
          lugaresVisitados: [],
          recolecciones: []
        })
        setMensaje('')
      }, 2000)
    } catch (error) {
      setMensaje('❌ Error: ' + error.message)
    }

    setLoading(false)
  }

  // MODAL CICLO
  if (mostrarModalCiclo && !cicloActual) {
    return (
      <div className="form-container">
        <div className="form-header">
          <Droplet size={32} color="#2563eb" />
          <div>
            <h1>Control de Aceite Quemado</h1>
          </div>
        </div>

        <div className="modal-ciclo">
          <h2>Crear Nuevo Ciclo de Recolección</h2>

          <div className="ciclo-info">
            <div className="info-item">
              <label>Ciclo Automático:</label>
              <p>{generarNombreCiclo()}</p>
            </div>

            <div className="form-group">
              <label>Persona Responsable *</label>
              <input
                type="text"
                value={personaResponsable}
                onChange={(e) => setPersonaResponsable(e.target.value)}
                placeholder="Ej: Juan García"
                className="input-text"
              />
            </div>
          </div>

          {mensaje && (
            <div className={`mensaje ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
              {mensaje}
            </div>
          )}

          <button
            onClick={crearCiclo}
            disabled={loading || !personaResponsable.trim()}
            className="btn-crear-ciclo"
          >
            {loading ? '⏳ Creando...' : '✅ Crear Ciclo'}
          </button>
        </div>
      </div>
    )
  }

  // PANTALLA PRINCIPAL - SIN LUGAR SELECCIONADO
  if (!lugarActual) {
    return (
      <div className="form-container">
        <div className="form-header">
          <Droplet size={32} color="#2563eb" />
          <div>
            <h1>Control de Aceite Quemado</h1>
          </div>
        </div>

        {/* INFORMACIÓN DEL CICLO */}
        {cicloActual && (
          <div className="info-ciclo">
            <div className="ciclo-titulo">
              <h3>{nombreCiclo}</h3>
              <span className="responsable">Por: {personaResponsable}</span>
            </div>
            <div className="ciclo-stats">
              <div className="stat">
                <span className="label">Total Recolectado:</span>
                <span className="valor">{resumenCiclo.totalLibras.toFixed(2)} lbs</span>
              </div>
              <div className="stat">
                <span className="label">Lugares Visitados:</span>
                <span className="valor">{resumenCiclo.lugaresVisitados.length}</span>
              </div>
            </div>
          </div>
        )}

        <div className="selector-lugar">
          <h2>Selecciona lugar de recolección</h2>

          <div className="lista-lugares">
            {lugares.map((lugar) => {
              const visitado = resumenCiclo.lugaresVisitados.includes(lugar.nombre)
              return (
                <button
                  key={lugar.id}
                  onClick={() => iniciarRecoleccion(lugar)}
                  className={`btn-lugar ${visitado ? 'visitado' : ''}`}
                >
                  <div className="lugar-nombre">
                    {visitado && '✅ '} {lugar.nombre}
                  </div>
                  <div className="lugar-codigo">Código: {lugar.codigo_tienda}</div>
                </button>
              )
            })}
          </div>
        </div>

        {cicloActual && (
          <button
            onClick={cerrarCiclo}
            disabled={loading}
            className="btn-cerrar-ciclo"
          >
            🔒 Cerrar Ciclo
          </button>
        )}
      </div>
    )
  }

  // PANTALLA - CON LUGAR SELECCIONADO
  const total = calcularTotal()

  return (
    <div className="form-container">
      <div className="form-header">
        <Droplet size={32} color="#2563eb" />
        <div>
          <h1>Control de Aceite Quemado</h1>
          <p className="info-lugar">Ciclo: {nombreCiclo}</p>
        </div>
      </div>

      {/* UBICACIÓN ACTUAL */}
      <div className="lugar-actual">
        <h2>{lugarActual.nombre}</h2>
        <span className="codigo">Código: {lugarActual.codigo_tienda}</span>
      </div>

      {/* MENSAJE */}
      {mensaje && (
        <div className={`mensaje ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
          {mensaje}
        </div>
      )}

      {/* TIPO ACEITE FIJO */}
      <div className="aceite-tipo">
        <strong>Tipo:</strong> Aceite Quemado
      </div>

      {/* BIDONES */}
      <div className="bidones-seccion">
        <label className="label-libras">Libras</label>

        {bidones.map((bidon, index) => (
          <div key={index} className="fila-bidon">
            <span className="nombre-bidon">Bidón {bidon.id}</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={bidon.cantidad}
              onChange={(e) => handleBidonChange(index, e.target.value)}
              placeholder="0"
              className="input-cantidad"
            />
            {bidones.length > 1 && (
              <button
                type="button"
                onClick={() => eliminarBidon(index)}
                className="btn-eliminar"
                title="Eliminar"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <div className="total-recolectado">
        <span>Total Recolectado:</span>
        <span className="valor-total">{total.toFixed(2)} lbs</span>
      </div>

      {/* BOTONES */}
      <div className="botones-accion">
        <button
          onClick={guardarRecoleccion}
          disabled={loading || total === 0}
          className="btn-guardar"
        >
          {loading ? '⏳ Guardando...' : '💾 Guardar'}
        </button>

        <button
          onClick={cambiarLugar}
          disabled={loading}
          className="btn-cambiar"
        >
          🔄 Cambiar Lugar
        </button>
      </div>
    </div>
  )
}