import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createRecommandation } from '../../services/api'

export default function AjouterRecommandationModal({ menteeId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    mentor_id: '',
    mentee_id: menteeId || '',
    texte: '',
  })
  const [mentors, setMentors] = useState([])
  const [mentees, setMentees] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    loadMentorsAndMentees()
  }, [])

  const loadMentorsAndMentees = async () => {
    try {
      const [mentorsRes, menteesRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/mentorat/mentors`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('asgf_admin_token') || ''}`,
            },
          }
        ),
        fetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/mentorat/mentees`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('asgf_admin_token') || ''}`,
            },
          }
        ),
      ])

      const mentorsData = await mentorsRes.json()
      const menteesData = await menteesRes.json()

      if (mentorsData.success) {
        setMentors(mentorsData.data || [])
      }
      if (menteesData.success) {
        setMentees(menteesData.data || [])
      }
    } catch (err) {
      console.error('Erreur chargement mentors/mentees:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createRecommandation({
        ...formData,
        generate_pdf: true, // Le backend générera le PDF
      })
      onSuccess()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!formData.mentor_id || !formData.mentee_id || !formData.texte) {
      alert('Veuillez remplir tous les champs obligatoires avant de générer le PDF')
      return
    }

    setGeneratingPDF(true)
    try {
      await createRecommandation({
        ...formData,
        generate_pdf: true,
      })
      alert('Recommandation créée et PDF généré avec succès')
      onSuccess()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setGeneratingPDF(false)
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
            Créer une recommandation
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
            {/* Sélection mentor */}
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
                Mentor *
              </label>
              <select
                required
                value={formData.mentor_id}
                onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Sélectionner un mentor</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.membre
                      ? `${mentor.membre.prenom} ${mentor.membre.nom}`
                      : `Mentor ${mentor.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection mentee */}
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
                Mentoré *
              </label>
              <select
                required
                value={formData.mentee_id}
                onChange={(e) => setFormData({ ...formData, mentee_id: e.target.value })}
                disabled={!!menteeId}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: menteeId ? '#f1f5f9' : 'white',
                }}
              >
                <option value="">Sélectionner un mentoré</option>
                {mentees.map((mentee) => (
                  <option key={mentee.id} value={mentee.id}>
                    {mentee.membre
                      ? `${mentee.membre.prenom} ${mentee.membre.nom}`
                      : `Mentoré ${mentee.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Texte recommandation */}
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
                Texte de la recommandation *
              </label>
              <textarea
                required
                value={formData.texte}
                onChange={(e) => setFormData({ ...formData, texte: e.target.value })}
                rows={10}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                placeholder="Rédigez la recommandation complète..."
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
                type="button"
                onClick={handleGeneratePDF}
                disabled={generatingPDF || !formData.mentor_id || !formData.mentee_id || !formData.texte}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: 'white',
                  fontWeight: '500',
                  cursor: generatingPDF || !formData.mentor_id || !formData.mentee_id || !formData.texte ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  opacity: generatingPDF || !formData.mentor_id || !formData.mentee_id || !formData.texte ? 0.6 : 1,
                }}
              >
                {generatingPDF ? 'Génération PDF...' : 'Générer PDF et enregistrer'}
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






