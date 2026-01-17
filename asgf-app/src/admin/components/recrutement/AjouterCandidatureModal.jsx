import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createCandidature, fetchAllMembers } from '../../services/api'

export default function AjouterCandidatureModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    membre_id: '',
    titre_poste: '',
    entreprise: '',
    type_contrat: '',
    cv_url: '',
    lm_url: '',
    portfolio_url: '',
    date_candidature: new Date().toISOString().split('T')[0],
    statut: 'envoye',
  })
  const [members, setMembers] = useState([])
  const [searchMember, setSearchMember] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const mems = await fetchAllMembers({ limit: 200 })
      setMembers(Array.isArray(mems) ? mems : [])
    } catch (err) {
      console.error('Erreur chargement membres:', err)
    }
  }

  const filteredMembers = members.filter((m) => {
    if (!searchMember) return true
    const search = searchMember.toLowerCase()
    return (
      m.prenom?.toLowerCase().includes(search) ||
      m.nom?.toLowerCase().includes(search) ||
      m.email?.toLowerCase().includes(search) ||
      m.numero_membre?.toLowerCase().includes(search)
    )
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (duplicateWarning) {
      const proceed = window.confirm(
        'Une candidature similaire existe déjà. Voulez-vous continuer quand même ?'
      )
      if (!proceed) return
    }

    setSubmitting(true)
    try {
      await createCandidature(formData)
      onSuccess()
    } catch (err) {
      if (err.message.includes('similaire existe déjà')) {
        setDuplicateWarning(err.message)
      } else {
        alert('Erreur : ' + err.message)
      }
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
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
            Ajouter une candidature
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

        {duplicateWarning && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
              ⚠️ {duplicateWarning}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Recherche membre */}
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
                Membre *
              </label>
              <input
                type="text"
                placeholder="Rechercher un membre (nom, prénom, email, numéro)..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                }}
              />
              <select
                required
                value={formData.membre_id}
                onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Sélectionner un membre</option>
                {filteredMembers.slice(0, 20).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.prenom} {member.nom} ({member.numero_membre || member.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Titre poste */}
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
                Titre du poste *
              </label>
              <input
                type="text"
                required
                value={formData.titre_poste}
                onChange={(e) => setFormData({ ...formData, titre_poste: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
                placeholder="Ex: Développeur SIG"
              />
            </div>

            {/* Entreprise */}
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
                Entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.entreprise}
                onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
                placeholder="Ex: ESRI France"
              />
            </div>

            {/* Type contrat */}
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
                Type de contrat *
              </label>
              <select
                required
                value={formData.type_contrat}
                onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
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
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Stage">Stage</option>
                <option value="Alternance">Alternance</option>
                <option value="Freelance">Freelance</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            {/* Date candidature */}
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
                Date de candidature
              </label>
              <input
                type="date"
                value={formData.date_candidature}
                onChange={(e) => setFormData({ ...formData, date_candidature: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* URLs optionnelles */}
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
                URL CV (optionnel)
              </label>
              <input
                type="url"
                value={formData.cv_url}
                onChange={(e) => setFormData({ ...formData, cv_url: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
                placeholder="https://..."
              />
            </div>

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
                URL Lettre de motivation (optionnel)
              </label>
              <input
                type="url"
                value={formData.lm_url}
                onChange={(e) => setFormData({ ...formData, lm_url: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
                placeholder="https://..."
              />
            </div>

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
                URL Portfolio (optionnel)
              </label>
              <input
                type="url"
                value={formData.portfolio_url}
                onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
                placeholder="https://..."
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
                {submitting ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}






