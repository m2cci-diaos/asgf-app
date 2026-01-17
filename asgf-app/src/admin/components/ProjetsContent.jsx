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
  fetchGroupesTravail,
  createGroupeTravail,
  updateGroupeTravail,
  deleteGroupeTravail,
  fetchReunionsByGroupe,
  fetchActionsByGroupe,
  fetchGroupeTravailMembres,
  addMembreToGroupe,
  removeMembreFromGroupe,
  createReunion,
  createAction,
  fetchAllMembers,
  addParticipant,
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
  const [groupesTravail, setGroupesTravail] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inscriptions') // 'projets', 'inscriptions' ou 'groupes-travail'
  const [selectedProjet, setSelectedProjet] = useState(null)
  const [selectedInscription, setSelectedInscription] = useState(null)
  const [selectedGroupe, setSelectedGroupe] = useState(null)
  const [showProjetModal, setShowProjetModal] = useState(false)
  const [showInscriptionModal, setShowInscriptionModal] = useState(false)
  const [showGroupeModal, setShowGroupeModal] = useState(false)
  const [showGroupeMembresModal, setShowGroupeMembresModal] = useState(false)
  const [groupeMembres, setGroupeMembres] = useState([])
  const [inscriptionsApprouvees, setInscriptionsApprouvees] = useState([])
  const [selectedMembresToRemove, setSelectedMembresToRemove] = useState([])
  const [selectedMembresToAdd, setSelectedMembresToAdd] = useState([])
  const [showGroupeDetailsModal, setShowGroupeDetailsModal] = useState(false)
  const [groupeReunions, setGroupeReunions] = useState([])
  const [groupeActions, setGroupeActions] = useState([])
  const [loadingGroupeDetails, setLoadingGroupeDetails] = useState(false)
  const [showReunionModal, setShowReunionModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [reunionFormData, setReunionFormData] = useState({})
  const [actionFormData, setActionFormData] = useState({})
  const [members, setMembers] = useState([])
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
  const [groupeFormData, setGroupeFormData] = useState({
    projet_id: '',
    nom: '',
    description: '',
  })

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

  const loadGroupesTravail = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchGroupesTravail()
      setGroupesTravail(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur chargement groupes de travail:', err)
      alert('Erreur lors du chargement des groupes de travail: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjets()
    // Charger les membres pour les formulaires
    fetchAllMembers({ limit: 200 }).then(mems => {
      setMembers(Array.isArray(mems) ? mems : [])
    }).catch(err => console.error('Erreur chargement membres:', err))
  }, [loadProjets])

  useEffect(() => {
    if (activeTab === 'inscriptions') {
      loadInscriptions()
    } else if (activeTab === 'groupes-travail') {
      loadGroupesTravail()
    }
  }, [activeTab, loadInscriptions, loadGroupesTravail])

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

  // Fonctions pour les groupes de travail
  const handleCreateGroupe = async () => {
    if (!groupeFormData.projet_id || !groupeFormData.nom) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      await createGroupeTravail(groupeFormData)
      await loadGroupesTravail()
      setShowGroupeModal(false)
      setGroupeFormData({ projet_id: '', nom: '', description: '' })
      alert('Groupe de travail créé avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleUpdateGroupe = async () => {
    if (!selectedGroupe) return
    if (!groupeFormData.projet_id || !groupeFormData.nom) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      await updateGroupeTravail(selectedGroupe.id, groupeFormData)
      await loadGroupesTravail()
      setShowGroupeModal(false)
      setSelectedGroupe(null)
      setGroupeFormData({ projet_id: '', nom: '', description: '' })
      alert('Groupe de travail mis à jour avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleEditGroupe = (groupe) => {
    setSelectedGroupe(groupe)
    setGroupeFormData({
      projet_id: groupe.projet_id, // C'est déjà un varchar
      nom: groupe.nom,
      description: groupe.description || '',
    })
    setShowGroupeModal(true)
  }

  const handleDeleteGroupe = async (groupeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce groupe de travail ? Toutes les réunions et actions associées seront déliées.')) {
      return
    }
    try {
      await deleteGroupeTravail(groupeId)
      await loadGroupesTravail()
      alert('Groupe de travail supprimé avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  // Fonction pour ouvrir les détails d'un groupe (réunions et actions)
  const handleOpenGroupeDetails = async (groupe) => {
    setSelectedGroupe(groupe)
    setShowGroupeDetailsModal(true)
    setLoadingGroupeDetails(true)
    try {
      // Charger les réunions et actions du groupe
      const [reunions, actions] = await Promise.all([
        fetchReunionsByGroupe(groupe.id),
        fetchActionsByGroupe(groupe.id)
      ])
      setGroupeReunions(reunions || [])
      setGroupeActions(actions || [])
    } catch (err) {
      alert('Erreur lors du chargement des détails: ' + err.message)
    } finally {
      setLoadingGroupeDetails(false)
    }
  }

  // Fonction pour ouvrir le formulaire de création de réunion depuis un groupe
  const handleCreateReunionFromGroupe = async (groupe) => {
    setSelectedGroupe(groupe)
    
    // Charger les membres du groupe pour pré-remplir les participants
    let participantsIds = []
    try {
      const membres = await fetchGroupeTravailMembres(groupe.id)
      if (membres && Array.isArray(membres)) {
        // Extraire les membre_id des membres du groupe
        participantsIds = membres
          .map(m => m.membre_id)
          .filter(id => id !== null && id !== undefined)
      }
    } catch (err) {
      console.error('Erreur chargement membres du groupe:', err)
    }
    
    setReunionFormData({
      type_reunion: 'autre',
      titre: '',
      description: '',
      date_reunion: '',
      heure_debut: '',
      heure_fin: '',
      pole: '',
      lieu: '',
      lien_visio: '',
      ordre_du_jour: '',
      groupe_travail_id: groupe.id,
      participants: participantsIds, // Pré-remplir avec les membres du groupe
    })
    setShowReunionModal(true)
  }

  // Fonction pour ouvrir le formulaire de création d'action depuis un groupe
  const handleCreateActionFromGroupe = async (groupe) => {
    setSelectedGroupe(groupe)
    
    // Charger les membres du groupe pour pré-remplir les assignés
    let assigneesIds = []
    try {
      const membres = await fetchGroupeTravailMembres(groupe.id)
      if (membres && Array.isArray(membres)) {
        // Extraire les membre_id des membres du groupe
        assigneesIds = membres
          .map(m => m.membre_id)
          .filter(id => id !== null && id !== undefined)
      }
    } catch (err) {
      console.error('Erreur chargement membres du groupe:', err)
    }
    
    setActionFormData({
      intitule: '',
      reunion_id: null,
      groupe_travail_id: groupe.id,
      assignees: assigneesIds, // Pré-remplir avec les membres du groupe
      statut: 'en cours',
      deadline: null,
    })
    setShowActionModal(true)
  }

  // Fonction pour créer une réunion
  const handleSubmitReunion = async () => {
    try {
      // Créer la réunion d'abord
      const reunion = await createReunion(reunionFormData)
      
      // Si des participants sont spécifiés, les ajouter
      // createReunion retourne { success: true, data: { id: ... } }
      const reunionId = reunion?.data?.id || reunion?.id
      if (reunionId && reunionFormData.participants && Array.isArray(reunionFormData.participants) && reunionFormData.participants.length > 0) {
        try {
          const participantsData = reunionFormData.participants.map(membreId => ({
            reunion_id: reunionId,
            membre_id: membreId,
            statut_invitation: 'envoye',
          }))
          
          // Ajouter les participants (addParticipant accepte un tableau)
          await addParticipant(participantsData)
          console.log(`${participantsData.length} participant(s) ajouté(s) à la réunion`)
        } catch (participantsErr) {
          console.error('Erreur lors de l\'ajout des participants:', participantsErr)
          // Ne pas bloquer la création de la réunion si l'ajout des participants échoue
        }
      }
      
      alert('Réunion créée avec succès !')
      setShowReunionModal(false)
      setReunionFormData({})
      const groupeToReload = selectedGroupe
      setSelectedGroupe(null)
      // Recharger les détails du groupe si on était dans le modal de détails
      if (showGroupeDetailsModal && groupeToReload) {
        await handleOpenGroupeDetails(groupeToReload)
      }
      // Recharger les groupes
      await loadGroupesTravail()
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  // Fonction pour créer une action
  const handleSubmitAction = async () => {
    try {
      const actionData = {
        intitule: actionFormData.intitule,
        reunion_id: actionFormData.reunion_id || null,
        groupe_travail_id: actionFormData.groupe_travail_id || null,
        assignees: Array.isArray(actionFormData.assignees) ? actionFormData.assignees : [],
        statut: actionFormData.statut || 'en cours',
        deadline: actionFormData.deadline || null,
      }
      await createAction(actionData)
      alert('Action créée avec succès !')
      setShowActionModal(false)
      setActionFormData({})
      const groupeToReload = selectedGroupe
      setSelectedGroupe(null)
      // Recharger les détails du groupe si on était dans le modal de détails
      if (showGroupeDetailsModal && groupeToReload) {
        await handleOpenGroupeDetails(groupeToReload)
      }
      // Recharger les groupes
      await loadGroupesTravail()
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  // Fonctions pour gérer les membres d'un groupe
  const handleOpenGroupeMembres = async (groupe) => {
    setSelectedGroupe(groupe)
    setShowGroupeMembresModal(true)
    setSelectedMembresToRemove([])
    setSelectedMembresToAdd([])
    try {
      // Charger les membres du groupe
      const membres = await fetchGroupeTravailMembres(groupe.id)
      setGroupeMembres(membres || [])
      
      // Charger les inscriptions approuvées du projet
      const result = await fetchProjetInscriptions({
        projet_id: groupe.projet_id,
        statut: 'approved',
        limit: 1000
      })
      setInscriptionsApprouvees(result.inscriptions || [])
    } catch (err) {
      alert('Erreur lors du chargement des membres: ' + err.message)
    }
  }

  const handleAddMembreToGroupe = async (inscriptionId) => {
    if (!selectedGroupe) return
    try {
      await addMembreToGroupe(selectedGroupe.id, inscriptionId)
      // Recharger les membres
      const membres = await fetchGroupeTravailMembres(selectedGroupe.id)
      setGroupeMembres(membres || [])
      // Recharger les groupes pour mettre à jour le nombre de membres
      await loadGroupesTravail()
      alert('Membre ajouté au groupe avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleRemoveMembreFromGroupe = async (inscriptionId) => {
    if (!selectedGroupe) return
    if (!window.confirm('Êtes-vous sûr de vouloir retirer ce membre du groupe ?')) {
      return
    }
    try {
      await removeMembreFromGroupe(selectedGroupe.id, inscriptionId)
      // Recharger les membres
      const membres = await fetchGroupeTravailMembres(selectedGroupe.id)
      setGroupeMembres(membres || [])
      // Recharger les groupes pour mettre à jour le nombre de membres
      await loadGroupesTravail()
      alert('Membre retiré du groupe avec succès !')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  // Fonctions pour sélection multiple
  const handleToggleMembreToRemove = (inscriptionId) => {
    setSelectedMembresToRemove(prev => 
      prev.includes(inscriptionId)
        ? prev.filter(id => id !== inscriptionId)
        : [...prev, inscriptionId]
    )
  }

  const handleToggleMembreToAdd = (inscriptionId) => {
    setSelectedMembresToAdd(prev => 
      prev.includes(inscriptionId)
        ? prev.filter(id => id !== inscriptionId)
        : [...prev, inscriptionId]
    )
  }

  const handleAddMembresToGroupe = async () => {
    if (!selectedGroupe || selectedMembresToAdd.length === 0) return
    
    try {
      // Ajouter tous les membres sélectionnés
      for (const inscriptionId of selectedMembresToAdd) {
        await addMembreToGroupe(selectedGroupe.id, inscriptionId)
      }
      
      // Recharger les membres
      const membres = await fetchGroupeTravailMembres(selectedGroupe.id)
      setGroupeMembres(membres || [])
      // Recharger les groupes pour mettre à jour le nombre de membres
      await loadGroupesTravail()
      
      setSelectedMembresToAdd([])
      alert(`${selectedMembresToAdd.length} membre(s) ajouté(s) au groupe avec succès !`)
    } catch (err) {
      alert('Erreur lors de l\'ajout des membres: ' + err.message)
    }
  }

  const handleRemoveMembresFromGroupe = async () => {
    if (!selectedGroupe || selectedMembresToRemove.length === 0) return
    
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer ${selectedMembresToRemove.length} membre(s) du groupe ?`)) {
      return
    }
    
    try {
      // Retirer tous les membres sélectionnés
      for (const inscriptionId of selectedMembresToRemove) {
        await removeMembreFromGroupe(selectedGroupe.id, inscriptionId)
      }
      
      // Recharger les membres
      const membres = await fetchGroupeTravailMembres(selectedGroupe.id)
      setGroupeMembres(membres || [])
      // Recharger les groupes pour mettre à jour le nombre de membres
      await loadGroupesTravail()
      
      setSelectedMembresToRemove([])
      alert(`${selectedMembresToRemove.length} membre(s) retiré(s) du groupe avec succès !`)
    } catch (err) {
      alert('Erreur lors de la suppression des membres: ' + err.message)
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
          <button
            className={`tab ${activeTab === 'groupes-travail' ? 'active' : ''}`}
            onClick={() => setActiveTab('groupes-travail')}
          >
            Groupes de travail ({groupesTravail.length})
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

      {activeTab === 'groupes-travail' && (
        <div className="groupes-travail-section">
          <button
            onClick={() => {
              setSelectedGroupe(null)
              setGroupeFormData({
                projet_id: '',
                nom: '',
                description: '',
              })
              setShowGroupeModal(true)
            }}
            className="btn-primary"
          >
            + Créer un groupe de travail
          </button>

          {loading ? (
            <div className="loading">Chargement...</div>
          ) : (
            <div className="projets-grid" style={{ marginTop: '1.5rem' }}>
              {groupesTravail.map((groupe) => (
                <div key={groupe.id} className="projet-card-admin">
                  <div className="projet-card-header" style={{ background: groupe.projet?.color || '#667eea' }}>
                    <span className="projet-icon">{groupe.projet?.icon || '👥'}</span>
                    <h3>{groupe.nom}</h3>
                  </div>
                  <div className="projet-card-body">
                    <p style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#64748b' }}>
                      Projet: {groupe.projet?.titre || 'N/A'}
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>{groupe.description || 'Aucune description'}</p>
                    
                    {/* Affichage des membres */}
                    <div style={{ marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                        Membres ({groupe.nombre_membres || groupe.membres?.length || 0})
                      </p>
                      {groupe.membres && groupe.membres.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {groupe.membres.slice(0, 5).map((m, idx) => (
                            <span
                              key={m.inscription_id || idx}
                              style={{
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                              }}
                            >
                              {m.inscription?.prenom || m.membre?.prenom || ''} {m.inscription?.nom || m.membre?.nom || ''}
                            </span>
                          ))}
                          {groupe.membres.length > 5 && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              +{groupe.membres.length - 5} autres
                            </span>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Aucun membre</p>
                      )}
                    </div>
                    
                    <div className="projet-meta">
                      <span>Créé le {new Date(groupe.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="projet-actions">
                      <button 
                        onClick={() => handleOpenGroupeDetails(groupe)} 
                        className="btn-primary"
                        style={{ fontSize: '0.875rem', marginBottom: '0.5rem', width: '100%' }}
                      >
                        📋 Réunions & Actions
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleOpenGroupeMembres(groupe)} 
                          className="btn-secondary"
                          style={{ fontSize: '0.875rem' }}
                        >
                          Gérer membres
                        </button>
                        <button onClick={() => handleEditGroupe(groupe)} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteGroupe(groupe.id)}
                          className="btn-danger"
                          style={{ fontSize: '0.875rem' }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {groupesTravail.length === 0 && (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  Aucun groupe de travail créé. Cliquez sur "+ Créer un groupe de travail" pour commencer.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal groupe de travail */}
      {showGroupeModal && (
        <div className="modal-overlay" onClick={() => setShowGroupeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedGroupe ? 'Modifier le groupe de travail' : 'Nouveau groupe de travail'}</h2>
            <div className="form-group">
              <label>Projet *</label>
              <select
                value={groupeFormData.projet_id}
                onChange={(e) => setGroupeFormData({ ...groupeFormData, projet_id: e.target.value })}
                disabled={!!selectedGroupe}
              >
                <option value="">Sélectionner un projet</option>
                {projets.map((p) => (
                  <option key={p.projet_id} value={p.projet_id}>
                    {p.titre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nom du groupe *</label>
              <input
                type="text"
                value={groupeFormData.nom}
                onChange={(e) => setGroupeFormData({ ...groupeFormData, nom: e.target.value })}
                placeholder="Ex: Groupe technique"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={groupeFormData.description}
                onChange={(e) => setGroupeFormData({ ...groupeFormData, description: e.target.value })}
                rows="4"
                placeholder="Description du groupe de travail"
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowGroupeModal(false)} className="btn-secondary">
                Annuler
              </button>
              <button
                onClick={selectedGroupe ? handleUpdateGroupe : handleCreateGroupe}
                className="btn-primary"
                disabled={!groupeFormData.projet_id || !groupeFormData.nom}
              >
                {selectedGroupe ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion membres du groupe */}
      {showGroupeMembresModal && selectedGroupe && (
        <div className="modal-overlay" onClick={() => {
          setShowGroupeMembresModal(false)
          setSelectedGroupe(null)
          setGroupeMembres([])
          setInscriptionsApprouvees([])
          setSelectedMembresToRemove([])
          setSelectedMembresToAdd([])
        }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Gérer les membres - {selectedGroupe.nom}</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Projet: {selectedGroupe.projet?.titre || selectedGroupe.projet_id}
            </p>

            {/* Membres actuels du groupe */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>
                  Membres du groupe ({groupeMembres.length})
                </h3>
                {selectedMembresToRemove.length > 0 && (
                  <button
                    onClick={handleRemoveMembresFromGroupe}
                    className="btn-danger"
                    style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                  >
                    Retirer les sélectionnés ({selectedMembresToRemove.length})
                  </button>
                )}
              </div>
              {groupeMembres.length === 0 ? (
                <p style={{ color: '#94a3b8', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
                  Aucun membre dans ce groupe
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {groupeMembres.map((membre) => (
                    <div
                      key={membre.inscription_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: selectedMembresToRemove.includes(membre.inscription_id) ? '#fee2e2' : '#f8fafc',
                        borderRadius: '0.375rem',
                        border: selectedMembresToRemove.includes(membre.inscription_id) ? '2px solid #ef4444' : '1px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleToggleMembreToRemove(membre.inscription_id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedMembresToRemove.includes(membre.inscription_id)}
                          onChange={() => handleToggleMembreToRemove(membre.inscription_id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                        <div>
                          <p style={{ fontWeight: '500', color: '#1e293b' }}>
                            {membre.inscription?.prenom || membre.membre?.prenom || ''} {membre.inscription?.nom || membre.membre?.nom || ''}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {membre.inscription?.email || membre.membre?.email || ''}
                            {membre.inscription?.statut_pro && ` • ${membre.inscription.statut_pro}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inscriptions approuvées disponibles */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>
                  Ajouter des membres (inscriptions approuvées)
                </h3>
                {selectedMembresToAdd.length > 0 && (
                  <button
                    onClick={handleAddMembresToGroupe}
                    className="btn-primary"
                    style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                  >
                    Ajouter les sélectionnés ({selectedMembresToAdd.length})
                  </button>
                )}
              </div>
              {inscriptionsApprouvees.length === 0 ? (
                <p style={{ color: '#94a3b8', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
                  Aucune inscription approuvée disponible pour ce projet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {inscriptionsApprouvees
                    .filter(inscription => !groupeMembres.some(m => m.inscription_id === inscription.id))
                    .map((inscription) => (
                      <div
                        key={inscription.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          backgroundColor: selectedMembresToAdd.includes(inscription.id) ? '#dbeafe' : 'white',
                          borderRadius: '0.375rem',
                          border: selectedMembresToAdd.includes(inscription.id) ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleToggleMembreToAdd(inscription.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={selectedMembresToAdd.includes(inscription.id)}
                            onChange={() => handleToggleMembreToAdd(inscription.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                          <div>
                            <p style={{ fontWeight: '500', color: '#1e293b' }}>
                              {inscription.prenom} {inscription.nom}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {inscription.email}
                              {inscription.statut_pro && ` • ${inscription.statut_pro}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                onClick={() => {
                  setShowGroupeMembresModal(false)
                  setSelectedGroupe(null)
                  setGroupeMembres([])
                  setInscriptionsApprouvees([])
                  setSelectedMembresToRemove([])
                  setSelectedMembresToAdd([])
                }} 
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails du groupe (réunions et actions) */}
      {showGroupeDetailsModal && selectedGroupe && (
        <div className="modal-overlay" onClick={() => {
          setShowGroupeDetailsModal(false)
          setSelectedGroupe(null)
          setGroupeReunions([])
          setGroupeActions([])
        }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <h2>Détails du groupe - {selectedGroupe.nom}</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Projet: {selectedGroupe.projet?.titre || selectedGroupe.projet_id}
            </p>

            {loadingGroupeDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Chargement...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Section Réunions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                      Réunions ({groupeReunions.length})
                    </h3>
                    <button
                      onClick={() => handleCreateReunionFromGroupe(selectedGroupe)}
                      className="btn-primary"
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      + Créer une réunion
                    </button>
                  </div>
                  {groupeReunions.length === 0 ? (
                    <p style={{ color: '#94a3b8', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
                      Aucune réunion pour ce groupe
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {groupeReunions.map((reunion) => (
                        <div
                          key={reunion.id}
                          style={{
                            padding: '1rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                                {reunion.titre || 'Sans titre'}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#64748b' }}>
                                {reunion.date_reunion && (
                                  <p>
                                    <strong>Date:</strong> {new Date(reunion.date_reunion).toLocaleDateString('fr-FR', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                                {reunion.lieu && (
                                  <p><strong>Lieu:</strong> {reunion.lieu}</p>
                                )}
                                {reunion.pole && (
                                  <p><strong>Pôle:</strong> {reunion.pole}</p>
                                )}
                                {reunion.ordre_du_jour && (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <strong>Ordre du jour:</strong>
                                    <div style={{ 
                                      marginTop: '0.25rem', 
                                      padding: '0.5rem', 
                                      backgroundColor: 'white', 
                                      borderRadius: '0.25rem',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {reunion.ordre_du_jour}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section Actions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                      Actions ({groupeActions.length})
                    </h3>
                    <button
                      onClick={() => handleCreateActionFromGroupe(selectedGroupe)}
                      className="btn-primary"
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      + Créer une action
                    </button>
                  </div>
                  {groupeActions.length === 0 ? (
                    <p style={{ color: '#94a3b8', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
                      Aucune action pour ce groupe
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {groupeActions.map((action) => (
                        <div
                          key={action.id}
                          style={{
                            padding: '1rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                                {action.intitule || action.titre || 'Sans intitulé'}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#64748b' }}>
                                {action.statut && (
                                  <p>
                                    <strong>Statut:</strong>{' '}
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '0.25rem',
                                      backgroundColor: action.statut === 'termine' ? '#dcfce7' : action.statut === 'annule' ? '#fee2e2' : '#dbeafe',
                                      color: action.statut === 'termine' ? '#166534' : action.statut === 'annule' ? '#991b1b' : '#1e40af',
                                      fontWeight: '500'
                                    }}>
                                      {action.statut === 'termine' ? 'Terminé' : action.statut === 'annule' ? 'Annulé' : 'En cours'}
                                    </span>
                                  </p>
                                )}
                                {action.deadline && (
                                  <p>
                                    <strong>Deadline:</strong> {new Date(action.deadline).toLocaleDateString('fr-FR')}
                                  </p>
                                )}
                                {action.assignees_members && action.assignees_members.length > 0 && (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <strong>Assigné(s) à:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                      {action.assignees_members.map((assignee) => (
                                        <span
                                          key={assignee.member_id || assignee.id}
                                          style={{
                                            padding: '0.25rem 0.5rem',
                                            backgroundColor: '#eff6ff',
                                            color: '#1e40af',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '500'
                                          }}
                                        >
                                          {assignee.membre?.prenom || ''} {assignee.membre?.nom || ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {action.reunion_id && (
                                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                    Liée à une réunion
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                onClick={() => {
                  setShowGroupeDetailsModal(false)
                  setSelectedGroupe(null)
                  setGroupeReunions([])
                  setGroupeActions([])
                }} 
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création réunion depuis un groupe */}
      {showReunionModal && selectedGroupe && (
        <div className="modal-overlay" onClick={() => {
          setShowReunionModal(false)
          setReunionFormData({})
          setSelectedGroupe(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Créer une réunion - {selectedGroupe.nom}</h2>
            <div className="form-group">
              <label>Type de réunion *</label>
              <select
                required
                value={reunionFormData.type_reunion || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, type_reunion: e.target.value })}
              >
                <option value="">Sélectionner</option>
                <option value="ca">Conseil d'Administration</option>
                <option value="bureau">Bureau</option>
                <option value="pole">Pôle</option>
                <option value="ag">Assemblée Générale</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                required
                value={reunionFormData.titre || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, titre: e.target.value })}
                placeholder="Ex: Réunion Groupe - Janvier 2025"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={reunionFormData.description || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, description: e.target.value })}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Date de réunion *</label>
              <input
                type="date"
                required
                value={reunionFormData.date_reunion || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, date_reunion: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Heure de début *</label>
              <input
                type="time"
                required
                value={reunionFormData.heure_debut || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, heure_debut: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Heure de fin</label>
              <input
                type="time"
                value={reunionFormData.heure_fin || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, heure_fin: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Lieu</label>
              <input
                type="text"
                value={reunionFormData.lieu || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, lieu: e.target.value })}
                placeholder="Ex: Siège ASGF"
              />
            </div>
            <div className="form-group">
              <label>Pôle</label>
              <input
                type="text"
                value={reunionFormData.pole || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, pole: e.target.value })}
                placeholder="Ex: Communication"
              />
            </div>
            <div className="form-group">
              <label>Lien visio</label>
              <input
                type="url"
                value={reunionFormData.lien_visio || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, lien_visio: e.target.value })}
                placeholder="URL de la visioconférence"
              />
            </div>
            <div className="form-group">
              <label>Ordre du jour</label>
              <textarea
                value={reunionFormData.ordre_du_jour || ''}
                onChange={(e) => setReunionFormData({ ...reunionFormData, ordre_du_jour: e.target.value })}
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Participants (optionnel)</label>
              <MemberMultiSelect
                members={members}
                selectedIds={reunionFormData.participants || []}
                onChange={(selectedIds) => setReunionFormData({ ...reunionFormData, participants: selectedIds })}
              />
            </div>
            <div className="form-group" style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '0.375rem' }}>
              <label style={{ fontWeight: '600', color: '#1e40af' }}>
                📌 Groupe de travail: {selectedGroupe.nom}
              </label>
              <input type="hidden" value={selectedGroupe.id} />
            </div>
            <div className="modal-actions">
              <button onClick={() => {
                setShowReunionModal(false)
                setReunionFormData({})
                setSelectedGroupe(null)
              }} className="btn-secondary">
                Annuler
              </button>
              <button onClick={handleSubmitReunion} className="btn-primary">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création action depuis un groupe */}
      {showActionModal && selectedGroupe && (
        <div className="modal-overlay" onClick={() => {
          setShowActionModal(false)
          setActionFormData({})
          setSelectedGroupe(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Créer une action - {selectedGroupe.nom}</h2>
            <div className="form-group">
              <label>Intitulé *</label>
              <input
                type="text"
                required
                value={actionFormData.intitule || ''}
                onChange={(e) => setActionFormData({ ...actionFormData, intitule: e.target.value })}
                placeholder="Ex: Préparer le budget 2025"
              />
            </div>
            <div className="form-group">
              <label>Assigné(s) à (optionnel)</label>
              <MemberMultiSelect
                members={members}
                selectedIds={actionFormData.assignees || []}
                onChange={(selectedIds) => setActionFormData({ ...actionFormData, assignees: selectedIds })}
              />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select
                value={actionFormData.statut || 'en cours'}
                onChange={(e) => setActionFormData({ ...actionFormData, statut: e.target.value })}
              >
                <option value="en cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
            <div className="form-group">
              <label>Deadline (optionnel)</label>
              <input
                type="date"
                value={actionFormData.deadline || ''}
                onChange={(e) => setActionFormData({ ...actionFormData, deadline: e.target.value || null })}
              />
            </div>
            <div className="form-group" style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '0.375rem' }}>
              <label style={{ fontWeight: '600', color: '#1e40af' }}>
                📌 Groupe de travail: {selectedGroupe.nom}
              </label>
              <input type="hidden" value={selectedGroupe.id} />
            </div>
            <div className="modal-actions">
              <button onClick={() => {
                setShowActionModal(false)
                setActionFormData({})
                setSelectedGroupe(null)
              }} className="btn-secondary">
                Annuler
              </button>
              <button onClick={handleSubmitAction} className="btn-primary">
                Créer
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

// Composant MemberMultiSelect pour sélectionner plusieurs membres
const MemberMultiSelect = ({ members, selectedIds, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredMembers = members.filter(m => {
    const fullName = `${m.prenom} ${m.nom} ${m.numero_membre || ''}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase())
  })

  const toggleMember = (memberId) => {
    const newSelected = selectedIds.includes(memberId)
      ? selectedIds.filter(id => id !== memberId)
      : [...selectedIds, memberId]
    onChange(newSelected)
  }

  const selectedMembers = members.filter(m => selectedIds.includes(m.id))

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Champ de sélection */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.5rem',
          border: '1px solid #e2e8f0',
          borderRadius: '0.375rem',
          backgroundColor: 'white',
          cursor: 'pointer',
          minHeight: '42px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center'
        }}
      >
        {selectedMembers.length > 0 ? (
          selectedMembers.map(m => (
            <span
              key={m.id}
              style={{
                backgroundColor: '#667eea',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              {m.prenom} {m.nom}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMember(m.id)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span style={{ color: '#94a3b8' }}>Rechercher et sélectionner des membres...</span>
        )}
      </div>

      {/* Dropdown avec recherche et liste */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: 'none',
              borderBottom: '1px solid #e2e8f0',
              outline: 'none'
            }}
          />
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredMembers.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                Aucun membre trouvé
              </div>
            ) : (
              filteredMembers.map(m => (
                <div
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: selectedIds.includes(m.id) ? '#eff6ff' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedIds.includes(m.id)) {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedIds.includes(m.id)) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => {}}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>
                      {m.prenom} {m.nom}
                    </div>
                    {m.numero_membre && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {m.numero_membre}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Fermer le dropdown si on clique en dehors */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default ProjetsContent

