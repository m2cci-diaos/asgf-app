import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchProjets,
  createProjet,
  updateProjet,
  deleteProjet,
  fetchProjetInscriptions,
  updateProjetInscriptionStatus,
  updateProjetInscription,
  deleteProjetInscription,
} from '../services/api'

const STATUT_LABELS = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
}

const STATUT_COLORS = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
}

const ProjetsContent = () => {
  const [projets, setProjets] = useState([])
  const [inscriptions, setInscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inscriptions') // 'projets' ou 'inscriptions'
  const [selectedProjet, setSelectedProjet] = useState(null)
  const [selectedInscription, setSelectedInscription] = useState(null)
  const [showProjetModal, setShowProjetModal] = useState(false)
  const [showInscriptionModal, setShowInscriptionModal] = useState(false)
  const [filters, setFilters] = useState({
    projet_id: '',
    statut: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [formData, setFormData] = useState({
    projet_id: '',
    titre: '',
    description: '',
    icon: '',
    color: '#667eea',
    is_active: true,
  })
  const [inscriptionFormData, setInscriptionFormData] = useState({})

  const loadProjets = useCallback(async () => {
    try {
      const data = await fetchProjets()
      setProjets(data)
    } catch (err) {
      console.error('Erreur chargement projets:', err)
      alert('Erreur lors du chargement des projets: ' + err.message)
    }
  }, [])

  const loadInscriptions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchProjetInscriptions({
        page,
        limit: 20,
        ...filters,
      })
      setInscriptions(result.inscriptions || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (err) {
      console.error('Erreur chargement inscriptions:', err)
      alert('Erreur lors du chargement des inscriptions: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    loadProjets()
  }, [loadProjets])

  useEffect(() => {
    if (activeTab === 'inscriptions') {
      loadInscriptions()
    }
  }, [activeTab, loadInscriptions])

  const handleCreateProjet = async () => {
    try {
      await createProjet(formData)
      await loadProjets()
      setShowProjetModal(false)
      setFormData({
        projet_id: '',
        titre: '',
        description: '',
        icon: '',
        color: '#667eea',
        is_active: true,
      })
      alert('Projet créé avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleUpdateProjet = async () => {
    try {
      await updateProjet(selectedProjet.projet_id, formData)
      await loadProjets()
      setShowProjetModal(false)
      setSelectedProjet(null)
      alert('Projet mis à jour avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDeleteProjet = async (projetId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      return
    }
    try {
      await deleteProjet(projetId)
      await loadProjets()
      alert('Projet supprimé avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleEditProjet = (projet) => {
    setSelectedProjet(projet)
    setFormData({
      projet_id: projet.projet_id,
      titre: projet.titre,
      description: projet.description || '',
      icon: projet.icon || '',
      color: projet.color || '#667eea',
      is_active: projet.is_active !== undefined ? projet.is_active : true,
    })
    setShowProjetModal(true)
  }

  const handleUpdateInscriptionStatus = async (inscriptionId, statut) => {
    try {
      await updateProjetInscriptionStatus(inscriptionId, statut)
      await loadInscriptions()
      alert('Statut mis à jour avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleEditInscription = (inscription) => {
    setSelectedInscription(inscription)
    setInscriptionFormData({
      prenom: inscription.prenom,
      nom: inscription.nom,
      email: inscription.email,
      telephone: inscription.telephone || '',
      numero_membre: inscription.numero_membre || '',
      statut_pro: inscription.statut_pro || '',
      motivation: inscription.motivation || '',
      competences: inscription.competences || '',
      statut: inscription.statut,
    })
    setShowInscriptionModal(true)
  }

  const handleUpdateInscription = async () => {
    try {
      await updateProjetInscription(selectedInscription.id, inscriptionFormData)
      await loadInscriptions()
      setShowInscriptionModal(false)
      setSelectedInscription(null)
      alert('Inscription mise à jour avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDeleteInscription = async (inscriptionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) {
      return
    }
    try {
      await deleteProjetInscription(inscriptionId)
      await loadInscriptions()
      alert('Inscription supprimée avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  return (
    <div className="module-content">
      <div className="module-header">
        <h1>Gestion des Projets</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'inscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('inscriptions')}
          >
            Inscriptions ({inscriptions.length})
          </button>
          <button
            className={`tab ${activeTab === 'projets' ? 'active' : ''}`}
            onClick={() => setActiveTab('projets')}
          >
            Projets ({projets.length})
          </button>
        </div>
      </div>

      {activeTab === 'inscriptions' && (
        <div className="inscriptions-section">
          <div className="filters-bar">
            <input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="filter-input"
            />
            <select
              value={filters.projet_id}
              onChange={(e) => setFilters({ ...filters, projet_id: e.target.value })}
              className="filter-select"
            >
              <option value="">Tous les projets</option>
              {projets.map((p) => (
                <option key={p.projet_id} value={p.projet_id}>
                  {p.titre}
                </option>
              ))}
            </select>
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="filter-select"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Rejetées</option>
            </select>
            <button onClick={() => setFilters({ projet_id: '', statut: '', search: '' })} className="btn-secondary">
              Réinitialiser
            </button>
          </div>

          {loading ? (
            <div className="loading">Chargement...</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Projet</th>
                    <th>Statut pro</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map((inscription) => (
                    <tr key={inscription.id}>
                      <td>{inscription.prenom} {inscription.nom}</td>
                      <td>{inscription.email}</td>
                      <td>
                        {projets.find((p) => p.projet_id === inscription.projet_id)?.titre || inscription.projet_id}
                      </td>
                      <td>{inscription.statut_pro || '-'}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: STATUT_COLORS[inscription.statut] }}
                        >
                          {STATUT_LABELS[inscription.statut]}
                        </span>
                      </td>
                      <td>{new Date(inscription.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEditInscription(inscription)}
                            className="btn-icon"
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          {inscription.statut === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateInscriptionStatus(inscription.id, 'approved')}
                                className="btn-icon"
                                title="Approuver"
                                style={{ color: '#22c55e' }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleUpdateInscriptionStatus(inscription.id, 'rejected')}
                                className="btn-icon"
                                title="Rejeter"
                                style={{ color: '#ef4444' }}
                              >
                                ✗
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteInscription(inscription.id)}
                            className="btn-icon"
                            title="Supprimer"
                            style={{ color: '#ef4444' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                    Précédent
                  </button>
                  <span>
                    Page {page} sur {totalPages}
                  </span>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'projets' && (
        <div className="projets-section">
          <button
            onClick={() => {
              setSelectedProjet(null)
              setFormData({
                projet_id: '',
                titre: '',
                description: '',
                icon: '',
                color: '#667eea',
                is_active: true,
              })
              setShowProjetModal(true)
            }}
            className="btn-primary"
          >
            + Ajouter un projet
          </button>

          <div className="projets-grid">
            {projets.map((projet) => (
              <div key={projet.id} className="projet-card-admin">
                <div className="projet-card-header" style={{ background: projet.color || '#667eea' }}>
                  <span className="projet-icon">{projet.icon || '📋'}</span>
                  <h3>{projet.titre}</h3>
                </div>
                <div className="projet-card-body">
                  <p>{projet.description || 'Aucune description'}</p>
                  <div className="projet-meta">
                    <span className={`status-badge ${projet.is_active ? 'active' : 'inactive'}`}>
                      {projet.is_active ? 'Actif' : 'Inactif'}
                    </span>
                    <span className="projet-id">ID: {projet.projet_id}</span>
                  </div>
                  <div className="projet-actions">
                    <button onClick={() => handleEditProjet(projet)} className="btn-secondary">
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteProjet(projet.projet_id)}
                      className="btn-danger"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal projet */}
      {showProjetModal && (
        <div className="modal-overlay" onClick={() => setShowProjetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedProjet ? 'Modifier le projet' : 'Nouveau projet'}</h2>
            <div className="form-group">
              <label>ID du projet *</label>
              <input
                type="text"
                value={formData.projet_id}
                onChange={(e) => setFormData({ ...formData, projet_id: e.target.value })}
                disabled={!!selectedProjet}
                placeholder="ex: mon-nouveau-projet"
              />
            </div>
            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder="Titre du projet"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="4"
                placeholder="Description du projet"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Icône (emoji)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🚀"
                />
              </div>
              <div className="form-group">
                <label>Couleur</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Projet actif
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowProjetModal(false)} className="btn-secondary">
                Annuler
              </button>
              <button
                onClick={selectedProjet ? handleUpdateProjet : handleCreateProjet}
                className="btn-primary"
              >
                {selectedProjet ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal inscription */}
      {showInscriptionModal && selectedInscription && (
        <div className="modal-overlay" onClick={() => setShowInscriptionModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Modifier l'inscription</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  value={inscriptionFormData.prenom}
                  onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, prenom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={inscriptionFormData.nom}
                  onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={inscriptionFormData.email}
                  onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={inscriptionFormData.telephone}
                  onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, telephone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Statut professionnel</label>
                <input
                  type="text"
                  value={inscriptionFormData.statut_pro}
                  onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, statut_pro: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Numéro membre</label>
                <input
                  type="text"
                  value={inscriptionFormData.numero_membre}
                  onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, numero_membre: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Motivation</label>
              <textarea
                value={inscriptionFormData.motivation}
                onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, motivation: e.target.value })}
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Compétences</label>
              <textarea
                value={inscriptionFormData.competences}
                onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, competences: e.target.value })}
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select
                value={inscriptionFormData.statut}
                onChange={(e) => setInscriptionFormData({ ...inscriptionFormData, statut: e.target.value })}
              >
                <option value="pending">En attente</option>
                <option value="approved">Approuvée</option>
                <option value="rejected">Rejetée</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowInscriptionModal(false)} className="btn-secondary">
                Annuler
              </button>
              <button onClick={handleUpdateInscription} className="btn-primary">
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .module-content {
          padding: 2rem;
        }
        .module-header {
          margin-bottom: 2rem;
        }
        .module-header h1 {
          margin-bottom: 1rem;
        }
        .tabs {
          display: flex;
          gap: 1rem;
          border-bottom: 2px solid #e2e8f0;
        }
        .tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-weight: 600;
          color: #64748b;
        }
        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }
        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .filter-input,
        .filter-select {
          padding: 0.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        .data-table th,
        .data-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table th {
          background: #f8fafc;
          font-weight: 600;
        }
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .status-badge.active {
          background: #22c55e;
        }
        .status-badge.inactive {
          background: #6b7280;
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0.25rem;
        }
        .projets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .projet-card-admin {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .projet-card-header {
          padding: 1.5rem;
          color: white;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .projet-icon {
          font-size: 2rem;
        }
        .projet-card-body {
          padding: 1.5rem;
        }
        .projet-meta {
          display: flex;
          justify-content: space-between;
          margin: 1rem 0;
        }
        .projet-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-content.large {
          max-width: 700px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-primary {
          background: #667eea;
          color: white;
        }
        .btn-secondary {
          background: #e2e8f0;
          color: #475569;
        }
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .loading {
          text-align: center;
          padding: 2rem;
        }
      `}</style>
    </div>
  )
}

export default ProjetsContent

