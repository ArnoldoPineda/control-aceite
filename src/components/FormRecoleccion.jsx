import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Droplet, Plus, Trash2 } from 'lucide-react'
import './FormRecoleccion.css'

export default function FormRecoleccion() {
  const [lugares, setLugares] = useState([])
  const [formData, setFormData] = useState({
    lugar_id: '',
    tipo_aceite: '',
    cantidad: '',
    observaciones: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchLugares()
  }, [])

  const fetchLugares = async () => {
    const { data, error } = await supabase.from('lugares').select('*')
    if (error) console.error('Error:', error)
    else setLugares(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.from('recepciones').insert([
      {
        lugar_id: formData.lugar_id,
        tipo_aceite: formData.tipo_aceite,
        cantidad: parseFloat(formData.cantidad),
        observaciones: formData.observaciones,
        fecha_recepcion: new Date().toISOString()
      }
    ])

    if (error) alert('Error: ' + error.message)
    else {
      alert('✅ Recepción registrada')
      setFormData({ lugar_id: '', tipo_aceite: '', cantidad: '', observaciones: '' })
    }
    setLoading(false)
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <Droplet size={32} color="#2563eb" />
        <h1>Control de Aceite Quemado</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Lugar de Recolección</label>
          <select 
            value={formData.lugar_id}
            onChange={(e) => setFormData({...formData, lugar_id: e.target.value})}
            required
          >
            <option value="">Selecciona un lugar</option>
            {lugares.map(lugar => (
              <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tipo de Aceite</label>
          <select 
            value={formData.tipo_aceite}
            onChange={(e) => setFormData({...formData, tipo_aceite: e.target.value})}
            required
          >
           <option value="">Selecciona tipo</option>
<option value="Aceite Quemado">Aceite Quemado</option>
<option value="Grasa">Grasa</option>
<option value="Aceite / Grasa con mal olor">Aceite / Grasa con mal olor</option>
          </select>
        </div>

        <div className="form-group">
          <label>Cantidad (Litros)</label>
          <input 
            type="number" 
            step="0.1"
            value={formData.cantidad}
            onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Observaciones</label>
          <textarea 
            value={formData.observaciones}
            onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
            rows="3"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-submit">
          <Plus size={20} /> {loading ? 'Registrando...' : 'Registrar Recepción'}
        </button>
      </form>
    </div>
  )
}