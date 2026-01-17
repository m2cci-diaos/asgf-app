import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createSuivi, fetchCandidatures } from '../../services/api'

export default function AjouterSuiviModal({ candidatureId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    candidature_id: candidatureId || '',
    date_event: new Date().toISOString().slice(0, 16),
    type_event: '',
    notes: '',
  })
  const [candidatures, setCandidatures] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!candidatureId) {
      loadCandidatures()
    }
  }, [candidatureId])

  const loadCandidatures = async () => {
    setLoading(true)
    try {
      const data = await fetchCandidatures({ limit: 100 })
      // fetchCandidatures peut retourner { candidatures: [...], pagination: {...} } ou directement un tableau
      let candidaturesArray = []
      if (Array.isArray(data)) {
        candidaturesArray = data
      } else if (data?.candidatures) {
        candidaturesArray = data.candidatures
      } else if (data?.data?.candidatures) {
        candidaturesArray = data.data.candidatures
      }
      setCandidatures(candidaturesArray)
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
      alert('Erreur lors du chargement des candidatures : ' + err.message)
      setCandidatures([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createSuivi(formData)
      onSuccess()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
            Ajouter un suivi
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '0.375rem',
              color: '#64748b',
              fontSize: '1.5rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Sélection candidature si pas pré-remplie */}
            {!candidatureId && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                  }}
                >
                  Candidature *
                </label>
                <select
                  required
                  value={formData.candidature_id}
                  onChange={(e) => setFormData({ ...formData, candidature_id: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: loading ? '#f1f5f9' : 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="">
                    {loading ? 'Chargement...' : 'Sélectionner une candidature'}
                  </option>
                  {candidatures.length === 0 && !loading && (
                    <option value="" disabled>Aucune candidature disponible</option>
                  )}
                  {candidatures.map((cand) => {
                    if (!cand || !cand.id) return null
                    const membreNom = cand.membre
                      ? `${cand.membre.prenom || ''} ${cand.membre.nom || ''}`.trim()
                      : 'Membre inconnu'
                    const poste = cand.titre_poste || '—'
                    const entreprise = cand.entreprise || '—'
                    return (
                      <option key={cand.id} value={cand.id}>
                        {membreNom} - {poste} @ {entreprise}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Date et heure */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#1e293b',
                  marginBottom: '0.5rem',
                }}
              >
                Date et heure *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.date_event}
                onChange={(e) => setFormData({ ...formData, date_event: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Type événement */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#1e293b',
                  marginBottom: '0.5rem',
                }}
              >
                Type d'événement *
              </label>
              <select
                required
                value={formData.type_event}
                onChange={(e) => setFormData({ ...formData, type_event: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Sélectionner</option>
                <option value="candidature envoyée">Candidature envoyée</option>
                <option value="relance">Relance</option>
                <option value="entretien téléphonique">Entretien téléphonique</option>
                <option value="entretien RH">Entretien RH</option>
                <option value="entretien technique">Entretien technique</option>
                <option value="offre reçue">Offre reçue</option>
                <option value="offre refusée">Offre refusée</option>
                <option value="réponse positive">Réponse positive</option>
                <option value="réponse négative">Réponse négative</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#1e293b',
                  marginBottom: '0.5rem',
                }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                placeholder="Notes sur cet événement..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  color: '#475569',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: 'white',
                  fontWeight: '500',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

