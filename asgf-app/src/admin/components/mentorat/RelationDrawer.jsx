import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchObjectifsByRelation,
  fetchRendezVousByRelation,
  closeRelation,
  createObjectif,
  updateObjectif,
} from '../../services/api'

/**
 * Drawer professionnel pour les détails d'une relation mentor/mentoré
 */
export default function RelationDrawer({ relation, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('infos')
  const [loading, setLoading] = useState(false)
  const [objectifs, setObjectifs] = useState([])
  const [rendezvous, setRendezvous] = useState([])
  const [relationData, setRelationData] = useState(relation)
  const [closing, setClosing] = useState(false)

  // Charger les données
  useEffect(() => {
    loadData()
  }, [relation?.id])

  const loadData = async () => {
    if (!relation?.id) return
    
    setLoading(true)
    try {
      const [objData, rdvData] = await Promise.all([
        fetchObjectifsByRelation(relation.id).catch(() => []),
        fetchRendezVousByRelation(relation.id).catch(() => []),
      ])
      
      setObjectifs(Array.isArray(objData) ? objData : [])
      setRendezvous(Array.isArray(rdvData) ? rdvData : [])
      // Utiliser les données de relation déjà passées en props
      setRelationData(relation)
    } catch (err) {
      console.error('Erreur chargement données:', err)
    } finally {
      setLoading(false)
    }
  }

  // Clôturer la relation
  const handleCloseRelation = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir clôturer cette relation ?')) {
      return
    }
    
    setClosing(true)
    try {
      await closeRelation(relation.id)
      await loadData() // Recharger les données
      onUpdate?.() // Notifier le parent
      alert('Relation clôturée avec succès')
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setClosing(false)
    }
  }

  const getStatutBadgeStyle = (statut) => {
    switch (statut) {
      case 'active':
        return { backgroundColor: '#10b981', color: 'white' }
      case 'terminee':
        return { backgroundColor: '#f97316', color: 'white' }
      case 'suspendue':
        return { backgroundColor: '#64748b', color: 'white' }
      default:
        return { backgroundColor: '#e2e8f0', color: '#475569' }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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
      minute: '2-digit'
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
        animation: 'fadeIn 0.2s ease-out'
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
          animation: 'slideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Relation Mentor/Mentoré
              </h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  ...getStatutBadgeStyle(relationData?.statut_relation),
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {relationData?.statut_relation || 'active'}
                </span>
                {relationData?.date_debut && (
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    Début: {formatDate(relationData.date_debut)}
                  </span>
                )}
                {relationData?.date_fin && (
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    Fin: {formatDate(relationData.date_fin)}
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
                lineHeight: 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          </div>
          
          {relationData?.statut_relation === 'active' && (
            <button
              onClick={handleCloseRelation}
              disabled={closing}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#f97316',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                fontWeight: '500',
                cursor: closing ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: closing ? 0.6 : 1
              }}
            >
              {closing ? 'Clôture en cours...' : 'Clôturer la relation'}
            </button>
          )}
        </div>

        {/* ONGLETS */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white',
          padding: '0 1.5rem'
        }}>
          {[
            { id: 'infos', label: 'Infos' },
            { id: 'objectifs', label: 'Objectifs' },
            { id: 'rendezvous', label: 'Rendez-vous' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENU */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>
          {activeTab === 'infos' && (
            <InfosTab relation={relationData} />
          )}
      
          {activeTab === 'objectifs' && (
            <ObjectifsTab 
              objectifs={objectifs} 
              loading={loading}
              relationId={relation?.id}
              onUpdate={loadData}
            />
          )}
      
          {activeTab === 'rendezvous' && (
            <RendezVousTab 
              rendezvous={rendezvous} 
              loading={loading}
              relationId={relation?.id}
              onUpdate={loadData}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Onglet Infos
function InfosTab({ relation }) {
  if (!relation) return <div>Chargement...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Mentor */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
          Mentor
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: '#1e293b', fontWeight: '500' }}>
            {relation.mentor?.membre?.prenom || ''} {relation.mentor?.membre?.nom || ''}
          </p>
          {relation.mentor?.domaine && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Domaine: {relation.mentor.domaine}
            </p>
          )}
          {relation.mentor?.membre?.email && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Email: {relation.mentor.membre.email}
            </p>
          )}
        </div>
      </div>

      {/* Mentoré */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
          Mentoré
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: '#1e293b', fontWeight: '500' }}>
            {relation.mentee?.membre?.prenom || ''} {relation.mentee?.membre?.nom || ''}
          </p>
          {relation.mentee?.domaine_souhaite && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Domaine souhaité: {relation.mentee.domaine_souhaite}
            </p>
          )}
          {relation.mentee?.membre?.email && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Email: {relation.mentee.membre.email}
            </p>
          )}
        </div>
      </div>

      {/* Commentaire admin */}
      {relation.commentaire_admin && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
            Commentaire admin
          </h3>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {relation.commentaire_admin}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Onglet Objectifs
function ObjectifsTab({ objectifs, loading, relationId, onUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    statut: 'en cours',
    deadline: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleAddClick = () => {
    setEditingId(null)
    setFormData({
      titre: '',
      description: '',
      statut: 'en cours',
      deadline: ''
    })
    setShowAddForm(true)
  }

  const handleEditClick = (obj) => {
    setEditingId(obj.id)
    setFormData({
      titre: obj.titre || '',
      description: obj.description || '',
      statut: obj.statut || 'en cours',
      deadline: obj.deadline ? new Date(obj.deadline).toISOString().split('T')[0] : ''
    })
    setShowAddForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const dataToSend = {
        ...formData,
        relation_id: relationId,
        deadline: formData.deadline || null,
      }

      if (editingId) {
        await updateObjectif(editingId, dataToSend)
        alert('Objectif mis à jour avec succès')
      } else {
        await createObjectif(dataToSend)
        alert('Objectif créé avec succès')
      }

      setShowAddForm(false)
      setEditingId(null)
      setFormData({
        titre: '',
        description: '',
        statut: 'en cours',
        deadline: ''
      })
      onUpdate()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (objectifId, newStatus) => {
    try {
      await updateObjectif(objectifId, { statut: newStatus })
      onUpdate()
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
  }

  return (
    <div>
      {/* Bouton Ajouter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={handleAddClick}
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
            fontSize: '0.875rem'
          }}
        >
          <span>+</span>
          <span>Ajouter un objectif</span>
        </button>
      </div>

      {/* Formulaire Ajout/Modification */}
      {showAddForm && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
            {editingId ? 'Modifier l\'objectif' : 'Nouvel objectif'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Titre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Ex: Trouver un stage en développement SIG"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  placeholder="Description détaillée de l'objectif..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                    Statut
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="en cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingId(null)
                    setFormData({
                      titre: '',
                      description: '',
                      statut: 'en cours',
                      deadline: ''
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
                    fontSize: '0.875rem'
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
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Enregistrement...' : (editingId ? 'Modifier' : 'Créer')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Liste des objectifs */}
      {objectifs.length === 0 && !showAddForm ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#64748b'
        }}>
          <p>Aucun objectif défini pour cette relation</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {objectifs.map((obj) => (
            <div
              key={obj.id}
              style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', flex: 1 }}>
                  {obj.titre}
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={obj.statut || 'en cours'}
                    onChange={(e) => handleStatusChange(obj.id, e.target.value)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      backgroundColor: obj.statut === 'termine' ? '#10b981' : obj.statut === 'annule' ? '#ef4444' : '#f97316',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="en cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                  <button
                    onClick={() => handleEditClick(obj)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      color: '#475569',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                    title="Modifier"
                  >
                    ✏️
                  </button>
                </div>
              </div>
              {obj.description && (
                <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                  {obj.description}
                </p>
              )}
              {obj.deadline && (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Deadline: {new Date(obj.deadline).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Onglet Rendez-vous
function RendezVousTab({ rendezvous, loading, relationId, onUpdate }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
  }

  if (rendezvous.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: '#64748b'
      }}>
        <p>Aucun rendez-vous enregistré pour cette relation</p>
      </div>
    )
  }

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'visio':
        return '#3b82f6'
      case 'presentiel':
        return '#10b981'
      case 'telephone':
        return '#f97316'
      default:
        return '#64748b'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {rendezvous.map((rdv) => (
        <div
          key={rdv.id}
          style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                {new Date(rdv.date_rdv).toLocaleString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              backgroundColor: getTypeBadgeColor(rdv.type),
              color: 'white'
            }}>
              {rdv.type || '—'}
            </span>
          </div>
          {rdv.notes_rdv && (
            <div style={{ marginBottom: '0.5rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                Notes:
              </p>
              <p style={{ color: '#475569', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                {rdv.notes_rdv}
              </p>
            </div>
          )}
          {rdv.prochaine_action && (
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                Prochaine action:
              </p>
              <p style={{ color: '#475569', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                {rdv.prochaine_action}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

