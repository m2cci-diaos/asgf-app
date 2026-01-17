import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchRecommandationsByMentee,
  createSuivi,
  updateCandidature,
} from '../../services/api'

export default function CandidatureDrawer({
  candidature,
  onClose,
  onUpdate,
  onStatutChange,
}) {
  const [activeTab, setActiveTab] = useState('infos')
  const [loading, setLoading] = useState(false)
  const [suivis, setSuivis] = useState(candidature.suivis || [])
  const [recommandations, setRecommandations] = useState([])
  const [showAddSuivi, setShowAddSuivi] = useState(false)
  const [formData, setFormData] = useState({
    statut: candidature.statut || 'envoye',
    commentaire_mentor: candidature.commentaire_mentor || '',
  })

  useEffect(() => {
    loadRecommandations()
  }, [candidature.membre_id])

  const loadRecommandations = async () => {
    if (!candidature.membre_id) return

    try {
      // Récupérer le mentee_id depuis le membre_id
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/mentorat/mentees?membre_id=${candidature.membre_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('asgf_admin_token') || ''}`,
          },
        }
      )
      const menteeData = await response.json()
      
      if (menteeData.success && menteeData.data && menteeData.data.length > 0) {
        const menteeId = menteeData.data[0].id
        const recos = await fetchRecommandationsByMentee(menteeId)
        setRecommandations(recos || [])
      }
    } catch (err) {
      console.error('Erreur chargement recommandations:', err)
    }
  }

  const handleStatutChange = async (newStatut) => {
    try {
      await updateCandidature(candidature.id, { statut: newStatut })
      setFormData({ ...formData, statut: newStatut })
      onStatutChange?.(candidature.id, newStatut)
      onUpdate?.()
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const handleCommentaireChange = async (newCommentaire) => {
    try {
      await updateCandidature(candidature.id, { commentaire_mentor: newCommentaire })
      setFormData({ ...formData, commentaire_mentor: newCommentaire })
      onUpdate?.()
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const handleAddSuivi = async (suiviData) => {
    try {
      await createSuivi({
        ...suiviData,
        candidature_id: candidature.id,
      })
      // Recharger les suivis
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/recrutement/candidatures/${candidature.id}/suivis`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('asgf_admin_token') || ''}`,
          },
        }
      )
      const data = await response.json()
      if (data.success) {
        setSuivis(data.data || [])
        onUpdate?.()
      }
      setShowAddSuivi(false)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '900px',
          height: '100%',
          backgroundColor: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
            }}
          >
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '0.5rem',
                }}
              >
                Détail candidature
              </h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backgroundColor:
                      candidature.statut === 'retenu'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : candidature.statut === 'en entretien'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : candidature.statut === 'refusé' || candidature.statut === 'refuse'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : candidature.statut === 'abandonné' || candidature.statut === 'abandonne'
                        ? 'rgba(100, 116, 139, 0.15)'
                        : 'rgba(249, 115, 22, 0.15)',
                    color:
                      candidature.statut === 'retenu'
                        ? '#4ade80'
                        : candidature.statut === 'en entretien'
                        ? '#60a5fa'
                        : candidature.statut === 'refusé' || candidature.statut === 'refuse'
                        ? '#f87171'
                        : candidature.statut === 'abandonné' || candidature.statut === 'abandonne'
                        ? '#94a3b8'
                        : '#fb923c',
                  }}
                >
                  {candidature.statut || 'envoye'}
                </span>
                {candidature.date_candidature && (
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    {formatDate(candidature.date_candidature)}
                  </span>
                )}
              </div>
            </div>
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
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              ×
            </button>
          </div>
        </div>

        {/* ONGLETS */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: 'white',
            padding: '0 1.5rem',
          }}
        >
          {[
            { id: 'infos', label: 'Infos' },
            { id: 'suivi', label: 'Suivi' },
            { id: 'recommandations', label: 'Recommandations' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom:
                  activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENU */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}
        >
          {activeTab === 'infos' && (
            <InfosTab
              candidature={candidature}
              formData={formData}
              onStatutChange={handleStatutChange}
              onCommentaireChange={handleCommentaireChange}
            />
          )}

          {activeTab === 'suivi' && (
            <SuiviTab
              suivis={suivis}
              loading={loading}
              onAddSuivi={handleAddSuivi}
              showAddSuivi={showAddSuivi}
              setShowAddSuivi={setShowAddSuivi}
            />
          )}

          {activeTab === 'recommandations' && (
            <RecommandationsTab
              recommandations={recommandations}
              loading={loading}
              candidature={candidature}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Onglet Infos
function InfosTab({ candidature, formData, onStatutChange, onCommentaireChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Membre */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '0.75rem',
          }}
        >
          Membre
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: '#1e293b', fontWeight: '500' }}>
            {candidature.membre
              ? `${candidature.membre.prenom || ''} ${candidature.membre.nom || ''}`.trim()
              : '—'}
          </p>
          {candidature.membre?.email && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Email: {candidature.membre.email}
            </p>
          )}
        </div>
      </div>

      {/* Poste, Entreprise, Type contrat */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '0.75rem',
          }}
        >
          Détails du poste
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: '#1e293b' }}>
            <strong>Poste:</strong> {candidature.titre_poste || '—'}
          </p>
          <p style={{ color: '#1e293b' }}>
            <strong>Entreprise:</strong> {candidature.entreprise || '—'}
          </p>
          <p style={{ color: '#1e293b' }}>
            <strong>Type de contrat:</strong> {candidature.type_contrat || '—'}
          </p>
        </div>
      </div>

      {/* Statut */}
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
          Statut
        </label>
        <select
          value={formData.statut}
          onChange={(e) => onStatutChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white',
          }}
        >
          <option value="envoye">Envoyé</option>
          <option value="en entretien">En entretien</option>
          <option value="retenu">Retenu</option>
          <option value="refusé">Refusé</option>
          <option value="abandonné">Abandonné</option>
        </select>
      </div>

      {/* Liens */}
      {(candidature.cv_url || candidature.lm_url || candidature.portfolio_url) && (
        <div>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.75rem',
            }}
          >
            Documents
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {candidature.cv_url && (
              <a
                href={candidature.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                📄 Voir CV
              </a>
            )}
            {candidature.lm_url && (
              <a
                href={candidature.lm_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                📝 Voir Lettre de motivation
              </a>
            )}
            {candidature.portfolio_url && (
              <a
                href={candidature.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                🎨 Voir Portfolio
              </a>
            )}
          </div>
        </div>
      )}

      {/* Commentaire mentor */}
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
          Commentaire mentor (retours CV/LM)
        </label>
        <textarea
          value={formData.commentaire_mentor}
          onChange={(e) => onCommentaireChange(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
          placeholder="Ajouter des commentaires pour aider le membre à améliorer son CV ou sa lettre de motivation..."
        />
      </div>
    </div>
  )
}

// Onglet Suivi
function SuiviTab({ suivis, loading, onAddSuivi, showAddSuivi, setShowAddSuivi }) {
  const [formData, setFormData] = useState({
    date_event: new Date().toISOString().slice(0, 16),
    type_event: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onAddSuivi({
        date_event: formData.date_event,
        type_event: formData.type_event,
        notes: formData.notes || null,
      })
      setFormData({
        date_event: new Date().toISOString().slice(0, 16),
        type_event: '',
        notes: '',
      })
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Bouton Ajouter */}
      {!showAddSuivi && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowAddSuivi(true)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <span>+</span>
            <span>Ajouter un suivi</span>
          </button>
        </div>
      )}

      {/* Formulaire Ajout */}
      {showAddSuivi && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '1rem',
            }}
          >
            Nouveau suivi
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSuivi(false)
                    setFormData({
                      date_event: new Date().toISOString().slice(0, 16),
                      type_event: '',
                      notes: '',
                    })
                  }}
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
      )}

      {/* Liste des suivis */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
      ) : suivis.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#64748b',
          }}
        >
          <p>Aucun suivi encore enregistré.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {suivis.map((suivi) => (
            <div
              key={suivi.id}
              style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                    {suivi.type_event || '—'}
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    {formatDateTime(suivi.date_event)}
                  </p>
                </div>
              </div>
              {suivi.notes && (
                <p style={{ color: '#475569', fontSize: '0.875rem', whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                  {suivi.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Onglet Recommandations
function RecommandationsTab({ recommandations, loading, candidature }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
  }

  if (recommandations.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#64748b',
        }}
      >
        <p>Aucune recommandation pour ce membre.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {recommandations.map((reco) => (
        <div
          key={reco.id}
          style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
              Mentor: {reco.mentor?.membre ? `${reco.mentor.membre.prenom} ${reco.mentor.membre.nom}` : '—'}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Date: {reco.created_at ? new Date(reco.created_at).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
          <p style={{ color: '#475569', fontSize: '0.875rem', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>
            {reco.texte?.substring(0, 200)}...
          </p>
          {reco.lien_pdf && (
            <a
              href={reco.lien_pdf}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Télécharger PDF
            </a>
          )}
        </div>
      ))}
    </div>
  )
}






