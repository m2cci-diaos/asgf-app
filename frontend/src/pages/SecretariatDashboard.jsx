import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchSecretariatStats,
  fetchReunions,
  fetchReunion,
  fetchParticipants,
  fetchActions,
  fetchDocuments,
} from '../services/api'
import KPICard from '../components/secretariat/KPICard'
import StatusBadge from '../components/secretariat/StatusBadge'
import EmptyState from '../components/secretariat/EmptyState'
import ReunionTimeline from '../components/secretariat/ReunionTimeline'
import ReunionDrawer from '../components/secretariat/ReunionDrawer'
import RapportPresidenceModal from '../components/secretariat/RapportPresidenceModal'

/**
 * Dashboard Secrétariat Professionnel
 */
export default function SecretariatDashboard({ currentUser }) {
  console.log('🎯 SecretariatDashboard chargé - Version professionnelle')
  
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

  // Charger les données
  const loadData = useCallback(async () => {
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

      // Charger mes actions si user connecté
      if (currentUser?.id) {
        try {
          // Récupérer toutes les actions avec filtre assigne_a
          const allActions = await fetchActions({ 
            assigne_a: currentUser.id,
            limit: 10 
          })
          setMesActions(Array.isArray(allActions) ? allActions.slice(0, 5) : [])
        } catch (err) {
          console.error('Erreur chargement actions:', err)
          setMesActions([])
        }
      } else {
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
    loadData()
  }, [loadData])

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
    // Scroll vers la section concernée
    setTimeout(() => {
      const element = document.getElementById(`section-${section}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  // Icônes SVG
  const CalendarIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )

  const ClockIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  const CheckIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )

  const DocumentIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            onClick={() => {/* TODO: Ouvrir modal nouvelle réunion */}}
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
            onClick={() => {/* TODO: Ouvrir modal document */}}
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

      {/* Drawer */}
      {drawerOpen && selectedReunion && (
        <ReunionDrawer
          reunion={selectedReunion}
          onClose={() => {
            setDrawerOpen(false)
            setSelectedReunion(null)
          }}
          onUpdate={loadData}
          currentUser={currentUser}
        />
      )}

      {/* Modal Rapport Présidence */}
      {showRapportModal && (
        <RapportPresidenceModal
          onClose={() => setShowRapportModal(false)}
          onSuccess={(rapport) => {
            console.log('Rapport généré:', rapport)
            loadData()
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

