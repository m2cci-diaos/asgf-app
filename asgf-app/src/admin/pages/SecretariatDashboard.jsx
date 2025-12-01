import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchSecretariatStats,
  fetchReunions,
  fetchReunion,
  fetchParticipants,
  fetchActions,
  fetchDocuments,
  createReunion,
  createDocument,
  fetchAllMembers,
  findMemberByEmail,
  updateAction,
  deleteAction,
} from '../services/api'
import KPICard from '../components/secretariat/KPICard'
import StatusBadge from '../components/secretariat/StatusBadge'
import EmptyState from '../components/secretariat/EmptyState'
import ReunionTimeline from '../components/secretariat/ReunionTimeline'
import ReunionDrawer from '../components/secretariat/ReunionDrawer'

/**
 * Dashboard Secrétariat Professionnel
 */
export default function SecretariatDashboard({ currentUser }) {
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [reunions, setReunions] = useState([])
  const [reunionsAVenir, setReunionsAVenir] = useState([])
  const [mesActions, setMesActions] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedReunion, setSelectedReunion] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [period, setPeriod] = useState('mois')
  const [filteredSection, setFilteredSection] = useState(null)
  const [showRapportModal, setShowRapportModal] = useState(false)
  const [showReunionModal, setShowReunionModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [allActions, setAllActions] = useState([])
  const [actionsLoading, setActionsLoading] = useState(false)
  const [actionsFilter, setActionsFilter] = useState({ statut: '', assigne_a: '' })
  const [editingAction, setEditingAction] = useState(null)
  const [actionFormData, setActionFormData] = useState({})
  const [members, setMembers] = useState([])
  const [reunionFormData, setReunionFormData] = useState({})
  const [documentFormData, setDocumentFormData] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Charger les données
  const loadData = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const [statsData, reunionsData] = await Promise.all([
        fetchSecretariatStats(),
        fetchReunions({ limit: 50 }),
      ])

      setStats(statsData || {})
      
      const allReunions = Array.isArray(reunionsData) ? reunionsData : []
      setReunions(allReunions)

      // Filtrer réunions à venir
      const aVenir = allReunions.filter(r => {
        const dateReunion = r.date_reunion ? new Date(r.date_reunion).toISOString().split('T')[0] : null
        return dateReunion && dateReunion >= today
      }).sort((a, b) => {
        const dateA = new Date(a.date_reunion)
        const dateB = new Date(b.date_reunion)
        return dateA - dateB
      })
      setReunionsAVenir(aVenir.slice(0, 5))

      // Charger mes actions
      // Les actions sont assignées à des membres (adhesion.members), pas aux admins
      // Il faut trouver le membre correspondant à l'admin par email
      try {
        let actionsToShow = []
        
        if (currentUser?.email) {
          // Essayer de trouver le membre correspondant à l'admin
          try {
            const member = await findMemberByEmail(currentUser.email)
            
            if (member?.id) {
              // Charger les actions assignées à ce membre
              const assignedActions = await fetchActions({ 
                assigne_a: member.id,
                limit: 10 
              })
              actionsToShow = Array.isArray(assignedActions) ? assignedActions : []
              console.log('✅ Actions assignées trouvées:', actionsToShow.length, 'pour membre:', member.id)
            } else {
              console.log('⚠️ Aucun membre trouvé pour email:', currentUser.email)
            }
          } catch (memberErr) {
            console.error('Erreur recherche membre:', memberErr)
          }
        }
        
        // Si aucune action assignée trouvée, charger toutes les actions
        if (actionsToShow.length === 0) {
          const allActions = await fetchActions({ limit: 20 })
          actionsToShow = Array.isArray(allActions) ? allActions : []
          console.log('📋 Toutes les actions chargées:', actionsToShow.length)
          
          // Afficher les détails des actions pour debug
          if (actionsToShow.length > 0) {
            console.log('Actions disponibles:', actionsToShow.map(a => ({
              id: a.id,
              intitule: a.intitule,
              assigne_a: a.assigne_a,
              statut: a.statut
            })))
          }
        }
        
        setMesActions(actionsToShow.slice(0, 5))
      } catch (err) {
        console.error('❌ Erreur chargement actions:', err)
        setMesActions([])
      }

      // Charger documents récents
      try {
        const docsData = await fetchDocuments({ limit: 5 })
        setDocuments(Array.isArray(docsData) ? docsData : [])
      } catch (err) {
        console.error('Erreur chargement documents:', err)
      }

    } catch (err) {
      console.error('Erreur chargement dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gérer ouverture drawer
  const handleReunionClick = async (reunion) => {
    try {
      const fullReunion = await fetchReunion(reunion.id)
      setSelectedReunion(fullReunion)
      setDrawerOpen(true)
    } catch (err) {
      console.error('Erreur chargement réunion:', err)
      setSelectedReunion(reunion)
      setDrawerOpen(true)
    }
  }

  // Gérer clic KPI
  const handleKPIClick = (section) => {
    setFilteredSection(section)
    setTimeout(() => {
      const element = document.getElementById(`section-${section}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  // Charger toutes les actions pour le modal
  const loadAllActions = useCallback(async () => {
    setActionsLoading(true)
    try {
      const actions = await fetchActions({
        ...(actionsFilter.statut && { statut: actionsFilter.statut }),
        ...(actionsFilter.assigne_a && { assigne_a: actionsFilter.assigne_a }),
        limit: 100
      })
      setAllActions(Array.isArray(actions) ? actions : [])
    } catch (err) {
      console.error('Erreur chargement actions:', err)
      setAllActions([])
    } finally {
      setActionsLoading(false)
    }
  }, [actionsFilter])

  // Charger les membres pour le formulaire d'édition
  useEffect(() => {
    if (showActionsModal && editingAction) {
      const loadMembers = async () => {
        try {
          const membersData = await fetchAllMembers()
          setMembers(Array.isArray(membersData) ? membersData : [])
        } catch (err) {
          console.error('Erreur chargement membres:', err)
        }
      }
      loadMembers()
    }
  }, [showActionsModal, editingAction])

  // Charger les actions quand le modal s'ouvre
  useEffect(() => {
    if (showActionsModal) {
      loadAllActions()
      setEditingAction(null)
    }
  }, [showActionsModal, loadAllActions])

  // Gérer l'édition d'une action
  const handleEditAction = (action) => {
    setEditingAction(action)
    setActionFormData({
      intitule: action.intitule || '',
      statut: action.statut || 'en_cours',
      assigne_a: action.assigne_a || '',
      deadline: action.deadline ? action.deadline.split('T')[0] : '',
    })
  }

  // Gérer la sauvegarde d'une action modifiée
  const handleSaveAction = async () => {
    if (!editingAction || !actionFormData.intitule) {
      alert('Veuillez remplir l\'intitulé de l\'action')
      return
    }

    setSubmitting(true)
    try {
      const updates = {
        intitule: actionFormData.intitule,
        statut: actionFormData.statut,
        assigne_a: actionFormData.assigne_a || null,
        deadline: actionFormData.deadline || null,
      }
      await updateAction(editingAction.id, updates)
      await loadAllActions()
      setEditingAction(null)
      setActionFormData({})
      alert('Action mise à jour avec succès')
    } catch (err) {
      console.error('Erreur mise à jour action:', err)
      alert(`Erreur : ${err.message || 'Erreur lors de la mise à jour de l\'action'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Gérer la suppression d'une action
  const handleDeleteAction = async (actionId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette action ?')) {
      return
    }

    try {
      await deleteAction(actionId)
      await loadAllActions()
      alert('Action supprimée avec succès')
    } catch (err) {
      console.error('Erreur suppression action:', err)
      alert(`Erreur : ${err.message || 'Erreur lors de la suppression de l\'action'}`)
    }
  }

  // Icônes SVG
  const CalendarIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )

  const ClockIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  const CheckIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )

  const DocumentIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      padding: '2rem'
    }}>
      {/* HEADER */}
      <div style={{ 
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '0.5rem'
          }}>
            Secrétariat
          </h1>
          <p style={{ 
            color: '#64748b', 
            fontSize: '1rem'
          }}>
            Suivi des réunions, participants, décisions, comptes rendus et documents
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              fontSize: '0.875rem',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="annee">Cette année</option>
          </select>
          
          <button
            onClick={() => setShowRapportModal(true)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            <span>📊</span>
            <span>Rendre compte au Président</span>
          </button>
          
          <button
            onClick={() => setShowReunionModal(true)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            <span>+</span>
            <span>Nouvelle réunion</span>
          </button>
          
          <button
            onClick={() => setShowActionsModal(true)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
          >
            <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Actions</span>
          </button>
          
          <button
            onClick={() => setShowDocumentModal(true)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: 'white',
              color: '#475569',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            <span>+</span>
            <span>Ajouter document</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <KPICard
          title="Réunions totales"
          value={loading ? '...' : (stats?.total_reunions || 0)}
          icon={<CalendarIcon />}
          color="blue"
          onClick={() => handleKPIClick('reunions')}
          loading={loading}
        />
        <KPICard
          title="À venir"
          value={loading ? '...' : (stats?.reunions_a_venir || 0)}
          icon={<ClockIcon />}
          color="green"
          onClick={() => handleKPIClick('reunions')}
          loading={loading}
        />
        <KPICard
          title="Actions en cours"
          value={loading ? '...' : (stats?.actions_en_cours || 0)}
          icon={<CheckIcon />}
          color="orange"
          onClick={() => handleKPIClick('actions')}
          loading={loading}
        />
        <KPICard
          title="Documents"
          value={loading ? '...' : (stats?.total_documents || 0)}
          icon={<DocumentIcon />}
          color="yellow"
          onClick={() => handleKPIClick('documents')}
          loading={loading}
        />
      </div>

      {/* GRID 2 COLONNES */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Colonne gauche (70%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Réunions à venir */}
          <div id="section-reunions" style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#1e293b',
              marginBottom: '1.5rem'
            }}>
              Réunions à venir
            </h2>
            <ReunionTimeline
              reunions={reunionsAVenir}
              onReunionClick={handleReunionClick}
              loading={loading}
            />
          </div>

          {/* Réunions récentes */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#1e293b',
              marginBottom: '1.5rem'
            }}>
              Réunions récentes
            </h2>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#64748b' }}>Chargement...</p>
              </div>
            ) : reunions.length === 0 ? (
              <EmptyState
                title="Aucune réunion"
                description="Créez votre première réunion pour commencer"
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#64748b'
                      }}>Titre</th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#64748b'
                      }}>Type</th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#64748b'
                      }}>Date</th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#64748b'
                      }}>Heure</th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#64748b'
                      }}>Pôle</th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '0.75rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#64748b'
                      }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reunions.slice(0, 10).map((reunion) => {
                      const dateReunion = reunion.date_reunion 
                        ? new Date(reunion.date_reunion)
                        : null
                      const statut = reunion.statut || 'programmee'
                      
                      return (
                        <tr
                          key={reunion.id}
                          onClick={() => handleReunionClick(reunion)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '0.75rem', color: '#1e293b', fontWeight: '500' }}>
                            {reunion.titre}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#64748b' }}>
                            {reunion.type_reunion}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#64748b' }}>
                            {dateReunion 
                              ? dateReunion.toLocaleDateString('fr-FR')
                              : '—'}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#64748b' }}>
                            {reunion.heure_debut || '—'}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#64748b' }}>
                            {reunion.pole || '—'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <StatusBadge status={statut} size="sm" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite (30%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Mes actions */}
          <div id="section-actions" style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#1e293b',
              marginBottom: '1.5rem'
            }}>
              Mes actions
            </h2>
            
            {mesActions.length === 0 ? (
              <EmptyState
                title="Aucune action assignée"
                description="Vous n'avez pas d'actions en cours"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {mesActions.map((action) => {
                  const deadline = action.deadline ? new Date(action.deadline) : null
                  const isOverdue = deadline && deadline < new Date() && action.statut !== 'termine'
                  
                  return (
                    <div
                      key={action.id}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        backgroundColor: isOverdue ? '#fef2f2' : '#f8fafc'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem'
                      }}>
                        <p style={{ 
                          fontWeight: '500', 
                          color: '#1e293b',
                          marginBottom: '0.25rem'
                        }}>
                          {action.intitule}
                        </p>
                        {isOverdue && (
                          <StatusBadge status="en_retard" size="sm" />
                        )}
                      </div>
                      {deadline && (
                        <p style={{ 
                          fontSize: '0.875rem', 
                          color: isOverdue ? '#dc2626' : '#64748b'
                        }}>
                          Deadline: {deadline.toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      <div style={{ marginTop: '0.5rem' }}>
                        <StatusBadge status={action.statut || 'en_cours'} size="sm" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Derniers documents */}
          <div id="section-documents" style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#1e293b',
              marginBottom: '1.5rem'
            }}>
              Derniers documents
            </h2>
            
            {documents.length === 0 ? (
              <EmptyState
                title="Aucun document"
                description="Aucun document disponible pour le moment"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    <p style={{ 
                      fontWeight: '500', 
                      color: '#1e293b',
                      marginBottom: '0.25rem'
                    }}>
                      {doc.titre}
                    </p>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#64748b',
                      marginBottom: '0.5rem'
                    }}>
                      {doc.categorie} • {doc.created_at 
                        ? new Date(doc.created_at).toLocaleDateString('fr-FR')
                        : '—'}
                    </p>
                    {doc.lien_pdf && (
                      <a
                        href={doc.lien_pdf}
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
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                      >
                        Ouvrir PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Réunion */}
      {drawerOpen && selectedReunion && typeof document !== 'undefined' && createPortal(
        <ReunionDrawer
          reunion={selectedReunion}
          onClose={() => {
            setDrawerOpen(false)
            setSelectedReunion(null)
          }}
          onUpdate={loadData}
          currentUser={currentUser}
        />,
        document.body
      )}

      {/* Modal Nouvelle Réunion */}
      {showReunionModal && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowReunionModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              Créer une réunion
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setSubmitting(true)
              try {
                await createReunion(reunionFormData)
                alert('Réunion créée avec succès !')
                setShowReunionModal(false)
                setReunionFormData({})
                loadData()
              } catch (err) {
                alert('Erreur : ' + err.message)
              } finally {
                setSubmitting(false)
              }
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Type de réunion *
                </label>
                <select
                  required
                  value={reunionFormData.type_reunion || ''}
                  onChange={(e) => setReunionFormData({ ...reunionFormData, type_reunion: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
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
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Titre *
                </label>
                <input
                  type="text"
                  required
                  value={reunionFormData.titre || ''}
                  onChange={(e) => setReunionFormData({ ...reunionFormData, titre: e.target.value })}
                  placeholder="Ex: Réunion CA - Janvier 2025"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Date de réunion *
                </label>
                <input
                  type="date"
                  required
                  value={reunionFormData.date_reunion || ''}
                  onChange={(e) => setReunionFormData({ ...reunionFormData, date_reunion: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Heure de début *
                </label>
                <input
                  type="time"
                  required
                  value={reunionFormData.heure_debut || ''}
                  onChange={(e) => setReunionFormData({ ...reunionFormData, heure_debut: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowReunionModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Ajouter Document */}
      {showDocumentModal && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDocumentModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '600px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              Ajouter un document
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setSubmitting(true)
              try {
                await createDocument({
                  ...documentFormData,
                  uploaded_by: currentUser?.id,
                })
                alert('Document créé avec succès !')
                setShowDocumentModal(false)
                setDocumentFormData({})
                loadData()
              } catch (err) {
                alert('Erreur : ' + err.message)
              } finally {
                setSubmitting(false)
              }
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Titre *
                </label>
                <input
                  type="text"
                  required
                  value={documentFormData.titre || ''}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, titre: e.target.value })}
                  placeholder="Ex: Procès-verbal CA Janvier 2025"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Catégorie *
                </label>
                <select
                  required
                  value={documentFormData.categorie || ''}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, categorie: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <option value="">Sélectionner</option>
                  <option value="pv">Procès-verbal</option>
                  <option value="compte_rendu">Compte rendu</option>
                  <option value="rapport">Rapport</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Lien PDF *
                </label>
                <input
                  type="url"
                  required
                  value={documentFormData.lien_pdf || ''}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, lien_pdf: e.target.value })}
                  placeholder="URL du document PDF"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDocumentModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Rapport Présidence */}
      {showRapportModal && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowRapportModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
              Rendre compte au Président
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Cette fonctionnalité sera disponible prochainement.
            </p>
            <button
              onClick={() => setShowRapportModal(false)}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Actions */}
      {showActionsModal && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowActionsModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b' }}>
                Toutes les actions
              </h2>
              <button
                onClick={() => setShowActionsModal(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1.5rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <select
                value={actionsFilter.statut}
                onChange={(e) => setActionsFilter({ ...actionsFilter, statut: e.target.value })}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  fontSize: '0.875rem',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="a_faire">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </div>

            {/* Formulaire d'édition */}
            {editingAction && (
              <div style={{
                padding: '1.5rem',
                border: '2px solid #3b82f6',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                backgroundColor: '#f8fafc'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                  Modifier l'action
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                      Intitulé *
                    </label>
                    <input
                      type="text"
                      value={actionFormData.intitule}
                      onChange={(e) => setActionFormData({ ...actionFormData, intitule: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                        Statut
                      </label>
                      <select
                        value={actionFormData.statut}
                        onChange={(e) => setActionFormData({ ...actionFormData, statut: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.625rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      >
                        <option value="a_faire">À faire</option>
                        <option value="en_cours">En cours</option>
                        <option value="termine">Terminé</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={actionFormData.deadline}
                        onChange={(e) => setActionFormData({ ...actionFormData, deadline: e.target.value })}
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
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                      Assigné à
                    </label>
                    <select
                      value={actionFormData.assigne_a}
                      onChange={(e) => setActionFormData({ ...actionFormData, assigne_a: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Non assigné</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.prenom} {member.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setEditingAction(null)
                        setActionFormData({})
                      }}
                      style={{
                        padding: '0.625rem 1.25rem',
                        backgroundColor: 'white',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveAction}
                      disabled={submitting}
                      style={{
                        padding: '0.625rem 1.25rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        opacity: submitting ? 0.6 : 1
                      }}
                    >
                      {submitting ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Liste des actions */}
            {actionsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Chargement...
              </div>
            ) : allActions.length === 0 ? (
              <EmptyState
                title="Aucune action"
                description="Aucune action trouvée avec les filtres sélectionnés"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {allActions.map((action) => {
                  const deadline = action.deadline ? new Date(action.deadline) : null
                  const isOverdue = deadline && deadline < new Date() && action.statut !== 'termine'
                  
                  return (
                    <div
                      key={action.id}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        backgroundColor: isOverdue ? '#fef2f2' : '#f8fafc'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            fontWeight: '500', 
                            color: '#1e293b',
                            marginBottom: '0.25rem'
                          }}>
                            {action.intitule}
                          </p>
                          {action.membre && (
                            <p style={{ 
                              fontSize: '0.875rem', 
                              color: '#64748b',
                              marginBottom: '0.25rem'
                            }}>
                              Assigné à: {action.membre.prenom} {action.membre.nom}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {isOverdue && (
                            <StatusBadge status="en_retard" size="sm" />
                          )}
                          <StatusBadge 
                            status={action.statut || 'en_cours'} 
                            size="sm" 
                          />
                          <button
                            onClick={() => handleEditAction(action)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteAction(action.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                      {deadline && (
                        <p style={{ 
                          fontSize: '0.875rem', 
                          color: isOverdue ? '#dc2626' : '#64748b'
                        }}>
                          Deadline: {deadline.toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

