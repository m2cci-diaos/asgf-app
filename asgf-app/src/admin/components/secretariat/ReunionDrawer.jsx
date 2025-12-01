import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchParticipants,
  fetchReunion,
  addParticipant,
  updateParticipant,
  saveCompteRendu,
  getCompteRendu,
  fetchActions,
  createAction,
  updateAction,
  generateReunionPDF,
  fetchAllMembers,
  updateReunion,
} from '../../services/api'
import StatusBadge from './StatusBadge'
import EmptyState from './EmptyState'

/**
 * Drawer professionnel pour les détails d'une réunion
 */
export default function ReunionDrawer({ reunion, onClose, onUpdate, currentUser }) {
  const [activeTab, setActiveTab] = useState('infos')
  const [loading, setLoading] = useState(false)
  const [participants, setParticipants] = useState([])
  const [compteRendu, setCompteRendu] = useState(null)
  const [actions, setActions] = useState([])
  const [members, setMembers] = useState([])
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [showAddAction, setShowAddAction] = useState(false)
  const [editing, setEditing] = useState(false)

  // Charger les données
  useEffect(() => {
    loadData()
  }, [reunion?.id])

  const loadData = async () => {
    if (!reunion?.id) return
    
    setLoading(true)
    try {
      const [parts, cr, acts] = await Promise.all([
        fetchParticipants(reunion.id).catch(() => []),
        getCompteRendu(reunion.id).catch(() => null),
        fetchActions(reunion.id).catch(() => []),
      ])
      
      setParticipants(Array.isArray(parts) ? parts : [])
      setCompteRendu(cr)
      setActions(Array.isArray(acts) ? acts : [])
      
      // Charger membres pour sélection
      if (showAddParticipant) {
        const mems = await fetchAllMembers({ limit: 200 })
        setMembers(Array.isArray(mems) ? mems : [])
      }
    } catch (err) {
      console.error('Erreur chargement données:', err)
    } finally {
      setLoading(false)
    }
  }

  // Gérer statut invitation inline
  const handleStatusChange = async (participantId, newStatus) => {
    try {
      await updateParticipant(participantId, { statut_invitation: newStatus })
      loadData()
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  // Gérer présence inline
  const handlePresenceChange = async (participantId, newPresence) => {
    try {
      await updateParticipant(participantId, { 
        presence: newPresence || null,
        motif_absence: newPresence === 'absent' ? null : null // Réinitialiser motif si on change la présence
      })
      loadData()
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  // Gérer commentaire inline
  const handleCommentChange = async (participantId, newComment) => {
    try {
      await updateParticipant(participantId, { commentaire: newComment || null })
      // Ne pas recharger immédiatement pour une meilleure UX
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  // Ajouter participants multiples
  const handleAddParticipants = async (selectedMemberIds) => {
    if (!selectedMemberIds || selectedMemberIds.length === 0) return
    
    try {
      const participantsData = selectedMemberIds.map(membreId => ({
        reunion_id: reunion.id,
        membre_id: membreId,
        statut_invitation: 'envoye',
      }))
      
      const result = await addParticipant(participantsData)
      setShowAddParticipant(false)
      loadData()
      onUpdate?.()
      
      // Afficher un message de succès
      if (result && Array.isArray(result) && result.length > 0) {
        alert(`${result.length} participant(s) ajouté(s) avec succès`)
      }
    } catch (err) {
      console.error('Erreur ajout participants:', err)
      alert('Erreur : ' + (err.message || 'Impossible d\'ajouter les participants'))
    }
  }

  // Sauvegarder compte-rendu
  const handleSaveCompteRendu = async (formData) => {
    try {
      await saveCompteRendu({
        reunion_id: reunion.id,
        ...formData,
      })
      loadData()
      alert('Compte-rendu sauvegardé avec succès')
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  // Générer PDF
  const handleGeneratePDF = async () => {
    try {
      await generateReunionPDF(reunion.id)
      alert('PDF généré avec succès')
      loadData() // Recharger pour avoir le lien_pdf
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  // Sauvegarder les modifications de la réunion
  const handleSaveReunion = async (formData) => {
    try {
      // Nettoyer les données : convertir les chaînes vides en null pour les champs optionnels uniquement
      const cleanedData = {
        titre: formData.titre,
        type_reunion: formData.type_reunion,
        date_reunion: formData.date_reunion,
        heure_debut: formData.heure_debut,
        description: formData.description || null,
        heure_fin: formData.heure_fin || null,
        pole: formData.pole || null,
        lien_visio: formData.lien_visio || null,
        ordre_du_jour: formData.ordre_du_jour || null,
      }
      
      await updateReunion(reunion.id, cleanedData)
      setEditing(false)
      // Recharger les données de la réunion
      const updatedReunion = await fetchReunion(reunion.id)
      if (updatedReunion) {
        // Mettre à jour la réunion dans le parent
        onUpdate?.()
      }
      alert('Réunion mise à jour avec succès')
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const dateReunion = reunion.date_reunion ? new Date(reunion.date_reunion) : null
  const presents = participants.filter(p => p.presence === 'present').length
  const absents = participants.filter(p => p.presence === 'absent').length
  const invites = participants.length

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
                {reunion.titre}
              </h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={reunion.type_reunion} size="sm" />
                {dateReunion && (
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    {dateReunion.toLocaleDateString('fr-FR', { 
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                )}
                {reunion.heure_debut && (
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    {reunion.heure_debut}
                    {reunion.heure_fin && ` - ${reunion.heure_fin}`}
                  </span>
                )}
                {reunion.pole && (
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    • {reunion.pole}
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
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                color: '#475569',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Éditer
            </button>
            {reunion.lien_visio && (
              <a
                href={reunion.lien_visio}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Rejoindre la visio
              </a>
            )}
          </div>
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
            { id: 'participants', label: 'Participants' },
            { id: 'compte-rendu', label: 'Compte rendu' },
            { id: 'actions', label: 'Actions' },
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
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#475569'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#64748b'
                }
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
          {editing ? (
            <EditReunionForm
              reunion={reunion}
              onSave={handleSaveReunion}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              {activeTab === 'infos' && (
                <InfosTab reunion={reunion} />
              )}
          
          {activeTab === 'participants' && (
            <ParticipantsTab
              participants={participants}
              loading={loading}
              onStatusChange={handleStatusChange}
              onPresenceChange={handlePresenceChange}
              onCommentChange={handleCommentChange}
              onAddParticipants={handleAddParticipants}
              showAdd={showAddParticipant}
              onShowAdd={() => {
                setShowAddParticipant(true)
                if (members.length === 0) {
                  fetchAllMembers({ limit: 200 }).then(mems => {
                    setMembers(Array.isArray(mems) ? mems : [])
                  })
                }
              }}
              onHideAdd={() => setShowAddParticipant(false)}
              members={members}
              stats={{ invites, presents, absents }}
              onReload={loadData}
            />
          )}
          
          {activeTab === 'compte-rendu' && (
            <CompteRenduTab
              compteRendu={compteRendu}
              reunion={reunion}
              onSave={handleSaveCompteRendu}
              onGeneratePDF={handleGeneratePDF}
              participants={participants}
            />
          )}
          
          {activeTab === 'actions' && (
            <ActionsTab
              actions={actions}
              loading={loading}
              reunionId={reunion.id}
              onUpdate={loadData}
              currentUser={currentUser}
            />
          )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Formulaire d'édition de réunion
function EditReunionForm({ reunion, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    titre: reunion.titre || '',
    type_reunion: reunion.type_reunion || '',
    description: reunion.description || '',
    date_reunion: reunion.date_reunion ? new Date(reunion.date_reunion).toISOString().split('T')[0] : '',
    heure_debut: reunion.heure_debut || '',
    heure_fin: reunion.heure_fin || '',
    pole: reunion.pole || '',
    lien_visio: reunion.lien_visio || '',
    ordre_du_jour: reunion.ordre_du_jour || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
        Modifier la réunion
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
            Type de réunion *
          </label>
          <select
            required
            value={formData.type_reunion}
            onChange={(e) => setFormData({ ...formData, type_reunion: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <option value="">Sélectionner</option>
            <option value="ca">Conseil d'Administration</option>
            <option value="bureau">Bureau</option>
            <option value="pole">Pôle</option>
            <option value="ag">Assemblée Générale</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
            Date de réunion *
          </label>
          <input
            type="date"
            required
            value={formData.date_reunion}
            onChange={(e) => setFormData({ ...formData, date_reunion: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Heure de début *
            </label>
            <input
              type="time"
              required
              value={formData.heure_debut}
              onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Heure de fin
            </label>
            <input
              type="time"
              value={formData.heure_fin}
              onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
            Pôle
          </label>
          <input
            type="text"
            value={formData.pole}
            onChange={(e) => setFormData({ ...formData, pole: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
            Lien visio
          </label>
          <input
            type="url"
            value={formData.lien_visio}
            onChange={(e) => setFormData({ ...formData, lien_visio: e.target.value })}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
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
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
            Ordre du jour
          </label>
          <textarea
            value={formData.ordre_du_jour}
            onChange={(e) => setFormData({ ...formData, ordre_du_jour: e.target.value })}
            rows={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={onCancel}
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
            disabled={saving}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '0.375rem',
              color: 'white',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Onglet Infos
function InfosTab({ reunion }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {reunion.description && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
            Description
          </h3>
          <p style={{ color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {reunion.description}
          </p>
        </div>
      )}
      
      {reunion.ordre_du_jour && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
            Ordre du jour
          </h3>
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {reunion.ordre_du_jour}
            </p>
          </div>
        </div>
      )}
      
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }}>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Créé le {reunion.created_at 
            ? new Date(reunion.created_at).toLocaleDateString('fr-FR')
            : '—'}
        </p>
        {reunion.updated_at && reunion.updated_at !== reunion.created_at && (
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Mis à jour le {new Date(reunion.updated_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  )
}

// Onglet Participants
function ParticipantsTab({ 
  participants, 
  loading, 
  onStatusChange,
  onPresenceChange,
  onCommentChange,
  onAddParticipants,
  showAdd,
  onShowAdd,
  onHideAdd,
  members,
  stats,
  onReload
}) {
  const [selectedMembers, setSelectedMembers] = useState([])
  const [search, setSearch] = useState('')

  const filteredMembers = members.filter(m => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      m.prenom?.toLowerCase().includes(searchLower) ||
      m.nom?.toLowerCase().includes(searchLower) ||
      m.email?.toLowerCase().includes(searchLower) ||
      m.numero_membre?.toLowerCase().includes(searchLower)
    )
  })

  const existingMemberIds = participants
    .map(p => p.membre_id)
    .filter(Boolean)

  const availableMembers = filteredMembers.filter(m => 
    !existingMemberIds.includes(m.id)
  )

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSubmit = () => {
    if (selectedMembers.length === 0) {
      alert('Veuillez sélectionner au moins un membre')
      return
    }
    onAddParticipants(selectedMembers)
    setSelectedMembers([])
    setSearch('')
  }

  return (
    <div>
      {/* Statistiques */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem'
      }}>
        <div>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Invités: </span>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>{stats.invites}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Présents: </span>
          <span style={{ fontWeight: '600', color: '#10b981' }}>{stats.presents}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Excusés: </span>
          <span style={{ fontWeight: '600', color: '#ef4444' }}>{stats.absents}</span>
        </div>
      </div>

      {/* Bouton ajouter */}
      {!showAdd && (
        <button
          onClick={onShowAdd}
          style={{
            marginBottom: '1.5rem',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>+</span>
          <span>Ajouter participants</span>
        </button>
      )}

      {/* Modal ajout participants */}
      {showAdd && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>
              Sélectionner des membres
            </h3>
            <button
              onClick={onHideAdd}
              style={{
                padding: '0.25rem 0.5rem',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}
          />

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            marginBottom: '1rem'
          }}>
            {availableMembers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                {search ? 'Aucun résultat' : 'Aucun membre disponible'}
              </div>
            ) : (
              availableMembers.map(member => {
                const isSelected = selectedMembers.includes(member.id)
                return (
                  <label
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleMember(member.id)}
                      style={{ marginRight: '0.75rem', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500', color: '#1e293b' }}>
                        {member.prenom} {member.nom}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {member.numero_membre} • {member.email}
                      </div>
                    </div>
                  </label>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={onHideAdd}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                color: '#475569',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Ajouter ({selectedMembers.length})
            </button>
          </div>
        </div>
      )}

      {/* Tableau participants */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#64748b' }}>Chargement...</p>
        </div>
      ) : participants.length === 0 ? (
        <EmptyState
          title="Aucun participant"
          description="Ajoutez des participants à cette réunion"
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
                  Nom & Prénom
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
                  Statut invitation
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
                  Présence
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
                  Commentaire
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.map(participant => {
                const nom = participant.membre
                  ? `${participant.membre.prenom} ${participant.membre.nom}`
                  : participant.prenom_externe && participant.nom_externe
                  ? `${participant.prenom_externe} ${participant.nom_externe}`
                  : 'Participant externe'

                return (
                  <tr key={participant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', color: '#1e293b' }}>{nom}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={participant.statut_invitation || 'envoye'}
                        onChange={(e) => onStatusChange(participant.id, e.target.value)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="envoye">Envoyée</option>
                        <option value="acceptee">Acceptée</option>
                        <option value="refusee">Refusée</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={participant.presence || ''}
                        onChange={(e) => onPresenceChange(participant.id, e.target.value || null)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          minWidth: '120px'
                        }}
                      >
                        <option value="">Non renseigné</option>
                        <option value="present">Présent</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="text"
                        value={participant.commentaire || ''}
                        onChange={(e) => onCommentChange(participant.id, e.target.value)}
                        onBlur={() => onReload?.()}
                        placeholder="Ajouter un commentaire..."
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          color: '#1e293b'
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Onglet Compte-rendu
function CompteRenduTab({ compteRendu, reunion, onSave, onGeneratePDF, participants }) {
  const [formData, setFormData] = useState({
    resume: '',
    decisions: '',
    actions_assignées: '',
    participants_list: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (compteRendu) {
      setFormData({
        resume: compteRendu.resume || '',
        decisions: compteRendu.decisions || '',
        actions_assignées: compteRendu.actions_assignées || '',
        participants_list: compteRendu.participants_list || '',
      })
    } else {
      // Auto-remplir participants_list
      const participantsList = participants
        .filter(p => p.presence === 'present')
        .map(p => {
          if (p.membre) {
            return `${p.membre.prenom} ${p.membre.nom}`
          }
          return `${p.prenom_externe || ''} ${p.nom_externe || ''}`.trim()
        })
        .join(', ')
      
      setFormData({
        resume: '',
        decisions: '',
        actions_assignées: '',
        participants_list: participantsList,
      })
    }
  }, [compteRendu, participants])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Résumé
            </label>
            <textarea
              value={formData.resume}
              onChange={(e) => setFormData({ ...formData, resume: e.target.value })}
              rows={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder="Résumé de la réunion..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Décisions
            </label>
            <textarea
              value={formData.decisions}
              onChange={(e) => setFormData({ ...formData, decisions: e.target.value })}
              rows={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder="Décisions prises..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Actions assignées
            </label>
            <textarea
              value={formData.actions_assignées}
              onChange={(e) => setFormData({ ...formData, actions_assignées: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder="Actions assignées..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Liste des participants (auto-rempli)
            </label>
            <textarea
              value={formData.participants_list}
              onChange={(e) => setFormData({ ...formData, participants_list: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onGeneratePDF}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#10b981',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Générer PDF
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le CR'}
            </button>
          </div>
        </div>
      </form>

      {compteRendu?.lien_pdf && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '0.5rem'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.5rem' }}>
            PDF généré le {compteRendu.created_at 
              ? new Date(compteRendu.created_at).toLocaleDateString('fr-FR')
              : '—'}
          </p>
          <a
            href={compteRendu.lien_pdf}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Télécharger PDF
          </a>
        </div>
      )}
    </div>
  )
}

// Onglet Actions
function ActionsTab({ actions, loading, reunionId, onUpdate, currentUser }) {
  const [viewMode, setViewMode] = useState('table') // 'table' ou 'kanban'
  const [showAdd, setShowAdd] = useState(false)

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'table' ? '#3b82f6' : 'white',
              color: viewMode === 'table' ? 'white' : '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Tableau
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'kanban' ? '#3b82f6' : 'white',
              color: viewMode === 'kanban' ? 'white' : '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Kanban
          </button>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          + Ajouter une action
        </button>
      </div>

      {viewMode === 'table' ? (
        <ActionsTableView actions={actions} onUpdate={onUpdate} />
      ) : (
        <ActionsKanbanView actions={actions} onUpdate={onUpdate} />
      )}

      {showAdd && (
        <AddActionModal
          reunionId={reunionId}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false)
            onUpdate()
          }}
        />
      )}
    </div>
  )
}

// Vue tableau actions
function ActionsTableView({ actions, onUpdate }) {
  const handleStatusChange = async (actionId, newStatus) => {
    try {
      // Import dynamique pour éviter les problèmes de scope
      const { updateAction } = await import('../../services/api')
      await updateAction(actionId, { statut: newStatus })
      onUpdate()
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  if (actions.length === 0) {
    return <EmptyState title="Aucune action" description="Aucune action n'a été créée pour cette réunion" />
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
              Intitulé
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
              Assigné à
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
              Statut
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>
              Deadline
            </th>
          </tr>
        </thead>
        <tbody>
          {actions.map(action => {
            const deadline = action.deadline ? new Date(action.deadline) : null
            const isOverdue = deadline && deadline < new Date() && action.statut !== 'termine'
            
            return (
              <tr key={action.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', color: '#1e293b', fontWeight: '500' }}>
                  {action.intitule}
                </td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>
                  {action.membre 
                    ? `${action.membre.prenom} ${action.membre.nom}`
                    : 'Non assigné'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <select
                    value={action.statut || 'en_cours'}
                    onChange={(e) => handleStatusChange(action.id, e.target.value)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {deadline ? (
                    <span style={{ color: isOverdue ? '#dc2626' : '#64748b' }}>
                      {deadline.toLocaleDateString('fr-FR')}
                      {isOverdue && (
                        <StatusBadge status="en_retard" size="sm" style={{ marginLeft: '0.5rem' }} />
                      )}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Vue Kanban actions
function ActionsKanbanView({ actions, onUpdate }) {
  const columns = [
    { id: 'en_cours', label: 'En cours', color: '#f97316' },
    { id: 'termine', label: 'Terminé', color: '#10b981' },
    { id: 'annule', label: 'Annulé', color: '#ef4444' },
  ]

  const getActionsByStatus = (status) => {
    return actions.filter(a => (a.statut || 'en_cours') === status)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      {columns.map(column => {
        const columnActions = getActionsByStatus(column.id)
        return (
          <div key={column.id} style={{
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            padding: '1rem',
            minHeight: '200px'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: column.color,
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: `2px solid ${column.color}`
            }}>
              {column.label} ({columnActions.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {columnActions.map(action => {
                const deadline = action.deadline ? new Date(action.deadline) : null
                const isOverdue = deadline && deadline < new Date() && action.statut !== 'termine'
                
                return (
                  <div
                    key={action.id}
                    style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      border: isOverdue ? '1px solid #dc2626' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <p style={{ fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                      {action.intitule}
                    </p>
                    {action.membre && (
                      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        {action.membre.prenom} {action.membre.nom}
                      </p>
                    )}
                    {deadline && (
                      <p style={{
                        fontSize: '0.875rem',
                        color: isOverdue ? '#dc2626' : '#64748b'
                      }}>
                        {deadline.toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                )
              })}
              {columnActions.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                  Aucune action
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Modal ajout action
function AddActionModal({ reunionId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    intitule: '',
    assigne_a: '',
    statut: 'en_cours',
    deadline: '',
  })
  const [members, setMembers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAllMembers({ limit: 200 }).then(mems => {
      setMembers(Array.isArray(mems) ? mems : [])
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createAction({
        reunion_id: reunionId,
        ...formData,
      })
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
        padding: '1rem'
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
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '1.5rem' }}>
          Ajouter une action
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                Intitulé *
              </label>
              <input
                type="text"
                required
                value={formData.intitule}
                onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                placeholder="Ex: Préparer le budget 2025"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                Assigné à
              </label>
              <select
                value={formData.assigne_a}
                onChange={(e) => setFormData({ ...formData, assigne_a: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Sélectionner un membre</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.prenom} {m.nom} ({m.numero_membre})
                  </option>
                ))}
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
                  cursor: 'pointer'
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
                  opacity: submitting ? 0.6 : 1
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

