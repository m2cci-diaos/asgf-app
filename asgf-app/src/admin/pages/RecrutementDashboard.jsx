import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchRecrutementStats,
  fetchCandidatures,
  updateCandidature,
} from '../services/api'
import CandidatureDrawer from '../components/recrutement/CandidatureDrawer'
import AjouterCandidatureModal from '../components/recrutement/AjouterCandidatureModal'
import AjouterSuiviModal from '../components/recrutement/AjouterSuiviModal'
import AjouterRecommandationModal from '../components/recrutement/AjouterRecommandationModal'
import './RecrutementDashboard.css'

export default function RecrutementDashboard() {
  const [stats, setStats] = useState({
    total_candidatures: 0,
    total_suivis: 0,
    total_recommandations: 0,
  })
  const [candidatures, setCandidatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidature, setSelectedCandidature] = useState(null)
  const [showModalCandidature, setShowModalCandidature] = useState(false)
  const [showModalSuivi, setShowModalSuivi] = useState(false)
  const [showModalRecommandation, setShowModalRecommandation] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
  })

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, candidaturesData] = await Promise.all([
        fetchRecrutementStats(),
        fetchCandidatures({
          page: 1,
          limit: 50,
          search: filters.search,
          statut: filters.statut,
        }),
      ])
      setStats(statsData || {})
      
      // fetchCandidatures retourne { candidatures: [...], pagination: {...} } ou directement un tableau
      let candidaturesArray = []
      if (Array.isArray(candidaturesData)) {
        candidaturesArray = candidaturesData
      } else if (candidaturesData?.candidatures && Array.isArray(candidaturesData.candidatures)) {
        candidaturesArray = candidaturesData.candidatures
      } else if (candidaturesData?.data?.candidatures && Array.isArray(candidaturesData.data.candidatures)) {
        candidaturesArray = candidaturesData.data.candidatures
      }
      
      console.log('Données reçues de fetchCandidatures:', candidaturesData)
      console.log('Candidatures extraites:', candidaturesArray.length, candidaturesArray)
      
      setCandidatures(candidaturesArray)
    } catch (err) {
      console.error('Erreur chargement données:', err)
      alert('Erreur : ' + err.message)
      setCandidatures([])
    } finally {
      setLoading(false)
    }
  }

  const handleCandidatureClick = async (candidature) => {
    try {
      // Charger les détails complets de la candidature
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/recrutement/candidatures/${candidature.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('asgf_admin_token') || ''}`,
          },
        }
      )
      const data = await response.json()
      if (data.success && data.data) {
        setSelectedCandidature(data.data)
      } else {
        setSelectedCandidature(candidature)
      }
    } catch (err) {
      console.error('Erreur chargement détails:', err)
      setSelectedCandidature(candidature)
    }
  }

  const handleStatutChange = async (candidatureId, newStatut) => {
    try {
      await updateCandidature(candidatureId, { statut: newStatut })
      loadData()
      if (selectedCandidature?.id === candidatureId) {
        setSelectedCandidature({ ...selectedCandidature, statut: newStatut })
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const getStatutBadgeClass = (statut) => {
    switch (statut) {
      case 'envoye':
        return 'statut-badge envoye'
      case 'en entretien':
        return 'statut-badge en-entretien'
      case 'retenu':
        return 'statut-badge retenu'
      case 'refusé':
      case 'refuse':
        return 'statut-badge refuse'
      case 'abandonné':
      case 'abandonne':
        return 'statut-badge abandonne'
      default:
        return 'statut-badge'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="recrutement-dashboard">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Recrutement</h1>
          <p className="breadcrumb">
            Suivi des candidatures, contacts entreprises et recommandations
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon purple">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{stats.total_candidatures || 0}</div>
            <div className="kpi-label">Candidatures totales</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon blue">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{stats.total_suivis || 0}</div>
            <div className="kpi-label">Suivis réalisés</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{stats.total_recommandations || 0}</div>
            <div className="kpi-label">Recommandations</div>
          </div>
        </div>
      </div>

      {/* Section Candidatures */}
      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">Candidatures récentes</h2>
          <div className="section-actions">
            <button
              className="btn-primary"
              onClick={() => setShowModalCandidature(true)}
            >
              + Ajouter Candidature
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowModalSuivi(true)}
            >
              + Ajouter Suivi
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowModalRecommandation(true)}
            >
              + Ajouter Recommandation
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="toolbar-filters">
          <input
            type="text"
            placeholder="Rechercher (poste, entreprise)..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="filter-input"
          />
          <select
            value={filters.statut}
            onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
            className="filter-select"
          >
            <option value="">Tous les statuts</option>
            <option value="envoye">Envoyé</option>
            <option value="en entretien">En entretien</option>
            <option value="retenu">Retenu</option>
            <option value="refusé">Refusé</option>
            <option value="abandonné">Abandonné</option>
          </select>
        </div>

        {/* Tableau */}
        {loading ? (
          <div className="loading-state">
            <p>Chargement...</p>
          </div>
        ) : candidatures.length === 0 ? (
          <div className="empty-state">
            <p>Aucune candidature pour le moment.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Poste</th>
                  <th>Entreprise</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {candidatures.map((candidature) => (
                  <tr
                    key={candidature.id}
                    onClick={() => handleCandidatureClick(candidature)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      {candidature.membre
                        ? `${candidature.membre.prenom || ''} ${candidature.membre.nom || ''}`.trim()
                        : '—'}
                    </td>
                    <td>{candidature.titre_poste || '—'}</td>
                    <td>{candidature.entreprise || '—'}</td>
                    <td>
                      <span className={getStatutBadgeClass(candidature.statut)}>
                        {candidature.statut || 'envoye'}
                      </span>
                    </td>
                    <td>{formatDate(candidature.date_candidature)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Drawer Candidature */}
      {selectedCandidature && typeof document !== 'undefined' && createPortal(
        <CandidatureDrawer
          candidature={selectedCandidature}
          onClose={() => setSelectedCandidature(null)}
          onUpdate={loadData}
          onStatutChange={handleStatutChange}
        />,
        document.body
      )}

      {/* Modals */}
      {showModalCandidature && typeof document !== 'undefined' && createPortal(
        <AjouterCandidatureModal
          onClose={() => setShowModalCandidature(false)}
          onSuccess={() => {
            setShowModalCandidature(false)
            loadData()
          }}
        />,
        document.body
      )}

      {showModalSuivi && typeof document !== 'undefined' && createPortal(
        <AjouterSuiviModal
          candidatureId={selectedCandidature?.id}
          onClose={() => setShowModalSuivi(false)}
          onSuccess={() => {
            setShowModalSuivi(false)
            loadData()
            if (selectedCandidature) {
              handleCandidatureClick(selectedCandidature)
            }
          }}
        />,
        document.body
      )}

      {showModalRecommandation && typeof document !== 'undefined' && createPortal(
        <AjouterRecommandationModal
          menteeId={selectedCandidature?.membre_id}
          onClose={() => setShowModalRecommandation(false)}
          onSuccess={() => {
            setShowModalRecommandation(false)
            loadData()
          }}
        />,
        document.body
      )}
    </div>
  )
}

