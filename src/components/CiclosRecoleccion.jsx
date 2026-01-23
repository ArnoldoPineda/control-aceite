import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Trash2, Edit2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import './CiclosRecoleccion.css'

export default function CiclosRecoleccion() {
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [cicloExpandido, setCicloExpandido] = useState(null)
  const [lugares, setLugares] = useState([])
  
  // Modal de edición de recepciones
  const [modalRecepciones, setModalRecepciones] = useState({
    mostrar: false,
    cicloId: null,
    cicloNombre: ''
  })
  const [recepciones, setRecepciones] = useState([])
  const [recepcionesEdicion, setRecepcionesEdicion] = useState({})
  
  // Formulario para agregar nueva recepción
  const [mostrarFormularioNueva, setMostrarFormularioNueva] = useState(false)
  const [nuevaRecepcion, setNuevaRecepcion] = useState({
    lugar_id: '',
    cantidad: '',
    observaciones: '',
    estado_aceite: ''
  })
  
  // Confirmación de eliminación
  const [confirmacionEliminar, setConfirmacionEliminar] = useState({
    mostrar: false,
    cicloId: null,
    paso: 1
  })

  useEffect(() => {
    cargarLugares()
    cargarCiclos()
  }, [])

  const cargarLugares = async () => {
    try {
      const { data, error } = await supabase
        .from('lugares')
        .select('id, nombre, codigo_tienda')
        .order('nombre')
      
      if (error) throw error
      setLugares(data || [])
    } catch (error) {
      console.error('Error cargando lugares:', error)
    }
  }

  const cargarCiclos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ciclos_recoleccion')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCiclos(data || [])

      // 🔄 Recalcular totales para cada ciclo (en caso de que estén en 0)
      if (data && data.length > 0) {
        for (const ciclo of data) {
          await recalcularTotalesCiclo(ciclo.id)
        }
        // Recargar ciclos después de recalcular
        const { data: datosActualizados, error: errorActualizados } = await supabase
          .from('ciclos_recoleccion')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (!errorActualizados && datosActualizados) {
          setCiclos(datosActualizados)
        }
      }
    } catch (error) {
      setMensaje('❌ Error al cargar ciclos: ' + error.message)
    }
    setLoading(false)
  }

  const cargarRecepciones = async (cicloId) => {
    try {
      const { data, error } = await supabase
        .from('recepciones')
        .select('*')
        .eq('ciclo_id', cicloId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecepciones(data || [])
      
      // Inicializar datos de edición
      const edicion = {}
      data?.forEach(rec => {
        edicion[rec.id] = { ...rec }
      })
      setRecepcionesEdicion(edicion)
    } catch (error) {
      setMensaje('❌ Error al cargar recepciones: ' + error.message)
    }
  }

  const formatearLibras = (numero) => {
    return parseFloat(numero || 0).toFixed(2)
  }

  const recalcularTotalesCiclo = async (cicloId) => {
    try {
      // Obtener todas las recepciones del ciclo
      const { data: recepcionesData, error: errorRec } = await supabase
        .from('recepciones')
        .select('cantidad, lugar_id')
        .eq('ciclo_id', cicloId)

      if (errorRec) throw errorRec

      // Calcular total libras y redondear a 2 decimales
      const totalLibras = parseFloat(
        recepcionesData.reduce((sum, rec) => sum + (rec.cantidad || 0), 0).toFixed(2)
      )
      
      // Contar lugares únicos
      const lugaresUnicos = new Set(recepcionesData.map(r => r.lugar_id)).size

      // Actualizar el ciclo con los nuevos totales
      const { error: errorUpdate } = await supabase
        .from('ciclos_recoleccion')
        .update({
          total_libras: totalLibras,
          total_lugares: lugaresUnicos
        })
        .eq('id', cicloId)

      if (errorUpdate) throw errorUpdate

      console.log(`✅ Totales recalculados: ${totalLibras} lbs, ${lugaresUnicos} lugares`)
    } catch (error) {
      console.error('Error recalculando totales:', error)
    }
  }

  const toggleExpandir = (cicloId) => {
    setCicloExpandido(cicloExpandido === cicloId ? null : cicloId)
  }

  const abrirModalRecepciones = async (ciclo) => {
    setModalRecepciones({
      mostrar: true,
      cicloId: ciclo.id,
      cicloNombre: ciclo.nombre
    })
    setMostrarFormularioNueva(false)
    setNuevaRecepcion({
      lugar_id: '',
      cantidad: '',
      observaciones: '',
      estado_aceite: ''
    })
    await cargarRecepciones(ciclo.id)
  }

  const cerrarModalRecepciones = () => {
    setModalRecepciones({ mostrar: false, cicloId: null, cicloNombre: '' })
    setRecepciones([])
    setRecepcionesEdicion({})
    setMostrarFormularioNueva(false)
  }

  const actualizarRecepcion = async (recepcionId) => {
    setLoading(true)
    try {
      const datos = recepcionesEdicion[recepcionId]
      const { error } = await supabase
        .from('recepciones')
        .update({
          cantidad: datos.cantidad,
          lugar_id: datos.lugar_id,
          observaciones: datos.observaciones,
          estado_aceite: datos.estado_aceite
        })
        .eq('id', recepcionId)

      if (error) throw error

      // Recalcular totales del ciclo después de actualizar
      await recalcularTotalesCiclo(modalRecepciones.cicloId)

      setMensaje('✅ Recepción actualizada')
      await cargarRecepciones(modalRecepciones.cicloId)
      await cargarCiclos()

      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      setMensaje('❌ Error: ' + error.message)
    }
    setLoading(false)
  }

  const eliminarRecepcion = async (recepcionId) => {
    if (!window.confirm('¿Eliminar esta recepción?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('recepciones')
        .delete()
        .eq('id', recepcionId)

      if (error) throw error

      // Recalcular totales del ciclo después de eliminar
      await recalcularTotalesCiclo(modalRecepciones.cicloId)

      setMensaje('✅ Recepción eliminada')
      await cargarRecepciones(modalRecepciones.cicloId)
      await cargarCiclos()

      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      setMensaje('❌ Error: ' + error.message)
    }
    setLoading(false)
  }

  const agregarNuevaRecepcion = async () => {
    setLoading(true)
    try {
      // Validar que lugar_id y cantidad tengan valores
      if (!nuevaRecepcion.lugar_id || !nuevaRecepcion.cantidad) {
        setMensaje('❌ Debe ingresar lugar y cantidad')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('recepciones')
        .insert([
          {
            ciclo_id: modalRecepciones.cicloId,
            lugar_id: parseInt(nuevaRecepcion.lugar_id),
            tipo_aceite: 'Aceite Quemado',
            cantidad: parseFloat(nuevaRecepcion.cantidad),
            observaciones: nuevaRecepcion.observaciones,
            estado_aceite: nuevaRecepcion.estado_aceite,
            recolector_nombre: '', // Se puede agregar más adelante
            fecha_recepcion: new Date().toISOString()
          }
        ])

      if (error) throw error

      // Recalcular totales después de agregar
      await recalcularTotalesCiclo(modalRecepciones.cicloId)

      setMensaje('✅ Nueva recepción agregada')
      setNuevaRecepcion({
        lugar_id: '',
        cantidad: '',
        observaciones: '',
        estado_aceite: ''
      })
      setMostrarFormularioNueva(false)
      await cargarRecepciones(modalRecepciones.cicloId)
      await cargarCiclos()

      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      setMensaje('❌ Error: ' + error.message)
    }
    setLoading(false)
  }

  const iniciarEliminacion = (cicloId) => {
    setConfirmacionEliminar({
      mostrar: true,
      cicloId: cicloId,
      paso: 1
    })
  }

  const confirmarEliminacionPaso1 = () => {
    setConfirmacionEliminar({
      mostrar: true,
      cicloId: confirmacionEliminar.cicloId,
      paso: 2
    })
  }

  const confirmarEliminacionPaso2 = async () => {
    setLoading(true)
    try {
      const { error: errorRecepciones } = await supabase
        .from('recepciones')
        .delete()
        .eq('ciclo_id', confirmacionEliminar.cicloId)

      if (errorRecepciones) throw errorRecepciones

      const { error: errorCiclo } = await supabase
        .from('ciclos_recoleccion')
        .delete()
        .eq('id', confirmacionEliminar.cicloId)

      if (errorCiclo) throw errorCiclo

      setMensaje('✅ Ciclo eliminado correctamente')
      setConfirmacionEliminar({ mostrar: false, cicloId: null, paso: 1 })
      cargarCiclos()

      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      setMensaje('❌ Error: ' + error.message)
    }
    setLoading(false)
  }

  const cancelarEliminacion = () => {
    setConfirmacionEliminar({
      mostrar: false,
      cicloId: null,
      paso: 1
    })
  }

  const obtenerNombreLugar = (lugarId) => {
    const lugar = lugares.find(l => l.id === lugarId)
    return lugar ? lugar.nombre : 'Desconocido'
  }

  return (
    <div className="ciclos-container">
      <div className="ciclos-header">
        <h1>Ciclos de Recolección</h1>
        <p>Gestiona todos tus ciclos de recolección y recepciones</p>
      </div>

      {mensaje && (
        <div className={`mensaje ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
          {mensaje}
        </div>
      )}

      {loading && !ciclos.length && <p className="cargando">Cargando ciclos...</p>}

      {ciclos.length === 0 && !loading && (
        <div className="sin-ciclos">
          <p>No hay ciclos registrados aún</p>
        </div>
      )}

      <div className="ciclos-lista">
        {ciclos.map((ciclo) => (
          <div key={ciclo.id} className="ciclo-card">
            {/* ENCABEZADO CICLO */}
            <div
              className="ciclo-encabezado"
              onClick={() => toggleExpandir(ciclo.id)}
            >
              <div className="ciclo-info-basica">
                <h3>{ciclo.nombre}</h3>
                <span className={`estado ${ciclo.estado.toLowerCase()}`}>
                  {ciclo.estado}
                </span>
              </div>

              <div className="ciclo-resumen">
                <div className="resumen-item">
                  <span className="label">Total:</span>
                  <span className="valor">{formatearLibras(ciclo.total_libras)} lbs</span>
                </div>
                <div className="resumen-item">
                  <span className="label">Lugares:</span>
                  <span className="valor">{ciclo.total_lugares || 0}</span>
                </div>
              </div>

              <button className="btn-expandir">
                {cicloExpandido === ciclo.id ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
            </div>

            {/* CONTENIDO EXPANDIDO */}
            {cicloExpandido === ciclo.id && (
              <div className="ciclo-contenido">
                <div className="ciclo-detalles">
                  <div className="detalle-row">
                    <span className="label">Responsable:</span>
                    <span className="valor">
                      {ciclo.persona_responsable || 'No especificado'}
                    </span>
                  </div>

                  <div className="detalle-row">
                    <span className="label">Mes/Año:</span>
                    <span className="valor">{ciclo.mes_ano}</span>
                  </div>

                  <div className="detalle-row">
                    <span className="label">Total Libras:</span>
                    <span className="valor">{formatearLibras(ciclo.total_libras)} lbs</span>
                  </div>

                  <div className="detalle-row">
                    <span className="label">Lugares:</span>
                    <span className="valor">{ciclo.total_lugares || 0}</span>
                  </div>

                  <div className="detalle-row">
                    <span className="label">Inicio:</span>
                    <span className="valor">
                      {new Date(ciclo.fecha_inicio).toLocaleString('es-ES')}
                    </span>
                  </div>

                  {ciclo.fecha_cierre && (
                    <div className="detalle-row">
                      <span className="label">Cierre:</span>
                      <span className="valor">
                        {new Date(ciclo.fecha_cierre).toLocaleString('es-ES')}
                      </span>
                    </div>
                  )}

                  {ciclo.observaciones && (
                    <div className="detalle-row full">
                      <span className="label">Observaciones:</span>
                      <p className="valor-texto">{ciclo.observaciones}</p>
                    </div>
                  )}

                  <div className="botones-acciones">
                    <button
                      onClick={() => abrirModalRecepciones(ciclo)}
                      className="btn-editar"
                      title="Editar recepciones del ciclo"
                    >
                      <Edit2 size={18} /> Editar Recepciones
                    </button>
                    <button
                      onClick={() => iniciarEliminacion(ciclo.id)}
                      className="btn-eliminar-ciclo"
                      title="Eliminar ciclo"
                    >
                      <Trash2 size={18} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL RECEPCIONES */}
      {modalRecepciones.mostrar && (
        <div className="modal-recepciones-overlay">
          <div className="modal-recepciones">
            <div className="modal-header">
              <h2>Editar Recepciones - {modalRecepciones.cicloNombre}</h2>
              <button 
                className="btn-cerrar-modal"
                onClick={cerrarModalRecepciones}
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {recepciones.length === 0 && !mostrarFormularioNueva ? (
                <p className="sin-recepciones">No hay recepciones en este ciclo</p>
              ) : (
                <div className="recepciones-lista">
                  {recepciones.map((rec) => (
                    <div key={rec.id} className="recepcion-item">
                      <div className="recepcion-header">
                        <strong>{obtenerNombreLugar(rec.lugar_id)}</strong>
                        <span className="fecha">
                          {new Date(rec.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>

                      <div className="recepcion-campos">
                        <div className="campo">
                          <label>Lugar</label>
                          <select
                            value={recepcionesEdicion[rec.id]?.lugar_id || ''}
                            onChange={(e) => setRecepcionesEdicion({
                              ...recepcionesEdicion,
                              [rec.id]: {
                                ...recepcionesEdicion[rec.id],
                                lugar_id: parseInt(e.target.value)
                              }
                            })}
                            className="input-recepcion"
                          >
                            <option value="">Selecciona lugar</option>
                            {lugares.map(lugar => (
                              <option key={lugar.id} value={lugar.id}>
                                {lugar.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="campo">
                          <label>Cantidad (lbs)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={recepcionesEdicion[rec.id]?.cantidad || 0}
                            onChange={(e) => setRecepcionesEdicion({
                              ...recepcionesEdicion,
                              [rec.id]: {
                                ...recepcionesEdicion[rec.id],
                                cantidad: parseFloat(e.target.value)
                              }
                            })}
                            className="input-recepcion"
                          />
                        </div>

                        <div className="campo">
                          <label>Observaciones</label>
                          <input
                            type="text"
                            value={recepcionesEdicion[rec.id]?.observaciones || ''}
                            onChange={(e) => setRecepcionesEdicion({
                              ...recepcionesEdicion,
                              [rec.id]: {
                                ...recepcionesEdicion[rec.id],
                                observaciones: e.target.value
                              }
                            })}
                            className="input-recepcion"
                            placeholder="Ej: Bidón #1"
                          />
                        </div>

                        <div className="campo">
                          <label>Estado Aceite</label>
                          <input
                            type="text"
                            value={recepcionesEdicion[rec.id]?.estado_aceite || ''}
                            onChange={(e) => setRecepcionesEdicion({
                              ...recepcionesEdicion,
                              [rec.id]: {
                                ...recepcionesEdicion[rec.id],
                                estado_aceite: e.target.value
                              }
                            })}
                            className="input-recepcion"
                            placeholder="Ej: Bien, Quemado, etc"
                          />
                        </div>
                      </div>

                      <div className="recepcion-acciones">
                        <button
                          onClick={() => actualizarRecepcion(rec.id)}
                          disabled={loading}
                          className="btn-guardar-rec"
                        >
                          ✅ Guardar
                        </button>
                        <button
                          onClick={() => eliminarRecepcion(rec.id)}
                          disabled={loading}
                          className="btn-eliminar-rec"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FORMULARIO NUEVA RECEPCIÓN */}
              {mostrarFormularioNueva && (
                <div className="formulario-nueva-recepcion">
                  <h3>➕ Agregar Nueva Recepción</h3>
                  <div className="recepcion-campos">
                    <div className="campo">
                      <label>Lugar *</label>
                      <select
                        value={nuevaRecepcion.lugar_id}
                        onChange={(e) => setNuevaRecepcion({
                          ...nuevaRecepcion,
                          lugar_id: e.target.value
                        })}
                        className="input-recepcion"
                      >
                        <option value="">Selecciona lugar</option>
                        {lugares.map(lugar => (
                          <option key={lugar.id} value={lugar.id}>
                            {lugar.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="campo">
                      <label>Cantidad (lbs) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={nuevaRecepcion.cantidad}
                        onChange={(e) => setNuevaRecepcion({
                          ...nuevaRecepcion,
                          cantidad: e.target.value
                        })}
                        className="input-recepcion"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="campo">
                      <label>Observaciones</label>
                      <input
                        type="text"
                        value={nuevaRecepcion.observaciones}
                        onChange={(e) => setNuevaRecepcion({
                          ...nuevaRecepcion,
                          observaciones: e.target.value
                        })}
                        className="input-recepcion"
                        placeholder="Ej: Bidón #7"
                      />
                    </div>

                    <div className="campo">
                      <label>Estado Aceite</label>
                      <input
                        type="text"
                        value={nuevaRecepcion.estado_aceite}
                        onChange={(e) => setNuevaRecepcion({
                          ...nuevaRecepcion,
                          estado_aceite: e.target.value
                        })}
                        className="input-recepcion"
                        placeholder="Ej: Bien, Quemado, etc"
                      />
                    </div>
                  </div>

                  <div className="botones-formulario">
                    <button
                      onClick={agregarNuevaRecepcion}
                      disabled={loading}
                      className="btn-agregar"
                    >
                      ✅ Agregar
                    </button>
                    <button
                      onClick={() => setMostrarFormularioNueva(false)}
                      disabled={loading}
                      className="btn-cancelar-formulario"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* BOTÓN PARA AGREGAR NUEVA RECEPCIÓN */}
              {!mostrarFormularioNueva && (
                <button
                  onClick={() => setMostrarFormularioNueva(true)}
                  className="btn-agregar-recepcion"
                >
                  <Plus size={20} /> Agregar Nueva Recepción
                </button>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={cerrarModalRecepciones}
                className="btn-cerrar"
              >
                ❌ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINACIÓN */}
      {confirmacionEliminar.mostrar && (
        <div className="modal-confirmacion">
          <div className="modal-contenido">
            {confirmacionEliminar.paso === 1 ? (
              <>
                <h3>⚠️ Confirmar Eliminación</h3>
                <p>
                  ¿Estás seguro de que deseas eliminar este ciclo y todas sus recolecciones?
                </p>
                <p className="advertencia">Esta acción no se puede deshacer.</p>
                <div className="botones-modal">
                  <button
                    onClick={confirmarEliminacionPaso1}
                    className="btn-confirmar-paso1"
                  >
                    Sí, continuar
                  </button>
                  <button
                    onClick={cancelarEliminacion}
                    className="btn-cancelar-modal"
                  >
                    No, cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>⚠️⚠️ SEGUNDA CONFIRMACIÓN</h3>
                <p>
                  Esta es tu última oportunidad. ¿Realmente deseas eliminar permanentemente este ciclo?
                </p>
                <p className="advertencia-roja">
                  Se eliminarán el ciclo y TODAS las recolecciones asociadas.
                </p>
                <div className="botones-modal">
                  <button
                    onClick={confirmarEliminacionPaso2}
                    disabled={loading}
                    className="btn-eliminar-definitivo"
                  >
                    {loading ? '⏳ Eliminando...' : '🗑️ Sí, eliminar definitivamente'}
                  </button>
                  <button
                    onClick={cancelarEliminacion}
                    disabled={loading}
                    className="btn-cancelar-modal"
                  >
                    No, volver atrás
                  </button>
                </div>
              </>
            )}
          </div>
          <div
            className="modal-fondo"
            onClick={cancelarEliminacion}
          ></div>
        </div>
      )}
    </div>
  )
}