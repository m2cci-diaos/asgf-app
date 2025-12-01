import React, { useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal pour générer un rapport Présidence
 */
export default function RapportPresidenceModal({ onClose, onSuccess, currentUser }) {
  const [formData, setFormData] = useState({
    periode_type: 'mensuel',
    periode_mois: new Date().getMonth() + 1,
    periode_annee: new Date().getFullYear(),
    periode_annee_seule: new Date().getFullYear(),
    options: {
      include_statistiques_reunions: true,
      include_participation: true,
      include_actions: true,
      include_documents: true,
    },
    send_email: false,
  })
  const [generating, setGenerating] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGenerating(true)

    try {
      // Calculer periode_debut et periode_fin
      let periode_debut, periode_fin

      if (formData.periode_type === 'mensuel') {
        const date = new Date(formData.periode_annee, formData.periode_mois - 1, 1)
        periode_debut = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
        periode_fin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
      } else {
        periode_debut = `${formData.periode_annee_seule}-01-01`
        periode_fin = `${formData.periode_annee_seule}-12-31`
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/secretariat/rapports/presidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('asgf_admin_token') && {
            Authorization: `Bearer ${localStorage.getItem('asgf_admin_token')}`
          }),
        },
        body: JSON.stringify({
          periode_type: formData.periode_type,
          periode_debut,
          periode_fin,
          options: formData.options,
          send_email: formData.send_email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.message || 'Erreur lors de la génération du rapport')
      }

      // Télécharger le PDF si disponible
      if (data.data?.lien_pdf) {
        window.open(data.data.lien_pdf, '_blank')
      }

      onSuccess?.(data.data)
      alert('Rapport généré avec succès !')
      onClose()
    } catch (err) {
      alert('Erreur : ' + err.message)
      console.error('Erreur génération rapport:', err)
    } finally {
      setGenerating(false)
    }
  }

  const moisOptions = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ]

  const anneeOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year, label: year.toString() }
  })

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
        padding: '1rem'
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
            📊 Rendre compte au Président
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
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Type de rapport */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                Type de rapport *
              </label>
              <select
                required
                value={formData.periode_type}
                onChange={(e) => setFormData({ ...formData, periode_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="mensuel">Mensuel</option>
                <option value="annuel">Annuel</option>
              </select>
            </div>

            {/* Choix période */}
            {formData.periode_type === 'mensuel' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                    Mois *
                  </label>
                  <select
                    required
                    value={formData.periode_mois}
                    onChange={(e) => setFormData({ ...formData, periode_mois: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white'
                    }}
                  >
                    {moisOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                    Année *
                  </label>
                  <select
                    required
                    value={formData.periode_annee}
                    onChange={(e) => setFormData({ ...formData, periode_annee: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white'
                    }}
                  >
                    {anneeOptions.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Année *
                </label>
                <select
                  required
                  value={formData.periode_annee_seule}
                  onChange={(e) => setFormData({ ...formData, periode_annee_seule: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  {anneeOptions.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Options */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.75rem' }}>
                Options d'inclusion
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                {[
                  { key: 'include_statistiques_reunions', label: 'Inclure statistiques réunions' },
                  { key: 'include_participation', label: 'Inclure participation' },
                  { key: 'include_actions', label: 'Inclure actions' },
                  { key: 'include_documents', label: 'Inclure documents' },
                ].map(option => (
                  <label
                    key={option.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.options[option.key]}
                      onChange={(e) => setFormData({
                        ...formData,
                        options: {
                          ...formData.options,
                          [option.key]: e.target.checked
                        }
                      })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Email automatique */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '1rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '0.5rem'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.send_email}
                  onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#166534', display: 'block' }}>
                    Envoyer par email automatiquement au Président
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    Le rapport sera envoyé automatiquement une fois généré
                  </span>
                </div>
              </label>
            </div>

            {/* Actions */}
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
                  fontSize: '0.875rem'
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={generating}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: 'white',
                  fontWeight: '500',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  opacity: generating ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {generating ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    <span>Générer le rapport PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}





