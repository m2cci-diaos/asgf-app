// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  fetchPendingMembers,
  approveMember,
  rejectMember,
  fetchMentoratStats,
  fetchRelations,
  fetchRecrutementStats,
  fetchCandidatures,
  createMentor,
  createMentee,
  createRelation,
  createCandidature,
  createRecommandation,
  createSuivi,
  createRendezVous,
  fetchAllMembers,
  fetchMentors,
  fetchMentees,
  fetchTresorerieStats,
  fetchCotisations,
  createCotisation,
  fetchPaiements,
  createPaiement,
  createRelance,
  createCarteMembre,
  fetchDepenses,
  createDepense,
  fetchHistorique,
  validateCotisation,
  resetCotisation,
  deleteCotisation,
  validatePaiement,
  cancelPaiement,
  deletePaiement,
  validateDepense,
  rejectDepense,
  deleteDepense,
  downloadCotisationsExport,
  downloadPaiementsExport,
  downloadDepensesExport,
  downloadTresorerieReport,
  fetchSecretariatStats,
  fetchReunions,
  createReunion,
  addParticipant,
  createAction,
  saveCompteRendu,
  createDocument,
} from "../services/api"
import logoASGF from "../img/Logo_officiel_ASGF.png"
import "./AdminDashboard.css"

const MONTH_OPTIONS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
]

const TREASURY_FILTERS_DEFAULT = {
  periode_mois: "",
  periode_annee: "",
  statutCotisation: "",
  typePaiement: "",
  statutPaiement: "",
  statutDepense: "",
}

function AdminDashboard({ admin, onLogout }) {
  const [pendingMembers, setPendingMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeModule, setActiveModule] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    console.log("Connecté ✅", { admin })
    
    // Vérifier que le token existe
    const token = localStorage.getItem('asgf_admin_token')
    if (!token) {
      console.error('❌ Token manquant dans localStorage')
      setError('Session expirée. Veuillez vous reconnecter.')
      return
    }
    
    console.log('✅ Token présent:', token.substring(0, 20) + '...')
    loadPendingMembers()
  }, [])

  const loadPendingMembers = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchPendingMembers()
      setPendingMembers(data || [])
    } catch (err) {
      console.warn("Impossible de charger les membres en attente:", err)
      setError(
        "Les membres en attente ne peuvent pas être chargés pour le moment."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await approveMember(id)
      setPendingMembers((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      alert("Erreur lors de la validation du membre.")
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir rejeter cette adhésion ?")) {
      return
    }
    try {
      await rejectMember(id)
      setPendingMembers((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      alert("Erreur lors du rejet du membre.")
    }
  }

  // Initiales pour l'avatar
  const getInitials = (admin) => {
    if (admin?.numero_membre) {
      return admin.numero_membre.split('-').pop()?.substring(0, 2) || 'AD'
    }
    return 'AD'
  }

  // Stats calculées
  const stats = {
    totalMembers: 0, // À calculer depuis l'API
    pendingAdhesions: pendingMembers.length,
    activeFormations: 0, // À calculer depuis l'API
    cardsGenerated: 0, // À calculer depuis l'API
  }

  // Fonction pour obtenir le titre et breadcrumb selon le module
  const getModuleInfo = () => {
    const moduleInfo = {
      dashboard: { title: 'Tableau de bord', breadcrumb: 'Admin / Dashboard' },
      adhesions: { title: 'Adhésions', breadcrumb: 'Admin / Adhésions' },
      tresorerie: { title: 'Trésorerie', breadcrumb: 'Admin / Trésorerie' },
      secretariat: { title: 'Secrétariat', breadcrumb: 'Admin / Secrétariat' },
      members: { title: 'Membres', breadcrumb: 'Admin / Membres' },
      formations: { title: 'Formations', breadcrumb: 'Admin / Formations' },
      webinaires: { title: 'Webinaires', breadcrumb: 'Admin / Webinaires' },
      tresorerie: { title: 'Trésorerie', breadcrumb: 'Admin / Trésorerie' },
      mentorat: { title: 'Mentorat', breadcrumb: 'Admin / Mentorat' },
      recrutement: { title: 'Recrutement', breadcrumb: 'Admin / Recrutement' },
      settings: { title: 'Paramètres', breadcrumb: 'Admin / Paramètres' },
    }
    return moduleInfo[activeModule] || moduleInfo.dashboard
  }

  const moduleInfo = getModuleInfo()

  // Composant pour le contenu Mentorat
  const MentoratContent = () => {
    const [mentoratStats, setMentoratStats] = useState(null)
    const [relations, setRelations] = useState([])
    const [loading, setLoading] = useState(true) // Commencer avec true pour éviter le rendu avant le chargement
    const [showModal, setShowModal] = useState(null) // 'mentor', 'mentee', 'relation'
    const [members, setMembers] = useState([])
    const [mentors, setMentors] = useState([])
    const [mentees, setMentees] = useState([])
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const loadData = async () => {
      setLoading(true)
      try {
        const [statsData, relationsData] = await Promise.all([
          fetchMentoratStats(),
          fetchRelations({ limit: 10 }),
        ])
        setMentoratStats(statsData || {})
        // fetchRelations peut retourner un objet avec pagination ou directement un tableau
        let relationsArray = []
        if (Array.isArray(relationsData)) {
          relationsArray = relationsData
        } else if (relationsData?.relations) {
          relationsArray = relationsData.relations
        } else if (relationsData?.data?.relations) {
          relationsArray = relationsData.data.relations
        }
        setRelations(relationsArray)
      } catch (err) {
        console.error('Erreur chargement mentorat:', err)
        setRelations([])
        setMentoratStats({})
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      loadData()
    }, [])

    useEffect(() => {
      if (showModal) {
        const loadSelectData = async () => {
          try {
            const [membersData, mentorsData, menteesData] = await Promise.all([
              fetchAllMembers({ limit: 100 }),
              fetchMentors({ limit: 100 }),
              fetchMentees({ limit: 100 }),
            ])
            setMembers(Array.isArray(membersData) ? membersData : [])
            setMentors(Array.isArray(mentorsData) ? mentorsData : [])
            setMentees(Array.isArray(menteesData) ? menteesData : [])
          } catch (err) {
            console.error('Erreur chargement données sélecteurs:', err)
          }
        }
        loadSelectData()
      }
    }, [showModal])

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'mentor') {
          await createMentor(formData)
          alert('Mentor créé avec succès !')
        } else if (showModal === 'mentee') {
          await createMentee(formData)
          alert('Mentoré créé avec succès !')
        } else if (showModal === 'relation') {
          await createRelation(formData)
          alert('Relation créée avec succès !')
        } else if (showModal === 'rendezvous') {
          await createRendezVous(formData)
          alert('Rendez-vous créé avec succès !')
        }
        setShowModal(null)
        setFormData({})
        loadData()
      } catch (err) {
        alert('Erreur : ' + err.message)
      } finally {
        setSubmitting(false)
    }
  }

  return (
      <div className="module-content">
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Mentors actifs</p>
              <p className="kpi-value">{mentoratStats?.mentors_actifs || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Mentorés en recherche</p>
              <p className="kpi-value">{mentoratStats?.mentees_en_recherche || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Relations actives</p>
              <p className="kpi-value">{mentoratStats?.relations_actives || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon yellow">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Rendez-vous</p>
              <p className="kpi-value">{mentoratStats?.total_rendezvous || 0}</p>
            </div>
          </div>
        </section>

        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
          <div>
                <h3 className="card-title">Paiements récents</h3>
                <p className="card-subtitle">{paiements.length} paiement{paiements.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : paiements.length === 0 ? (
              <div className="empty-state">
                <p>Aucun paiement enregistré</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Type</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paiements.map((paiement) => (
                      <tr key={paiement.id}>
                        <td>{paiement.membre?.prenom} {paiement.membre?.nom}</td>
                        <td>{paiement.type_paiement || '—'}</td>
                        <td>{paiement.montant != null ? `${Number(paiement.montant).toFixed(2)} €` : '—'}</td>
                        <td>
                          <span className={`status-badge ${paiement.statut === 'valide' ? 'approved' : paiement.statut === 'annule' ? 'rejected' : 'pending'}`}>
                            {paiement.statut || '—'}
                </span>
                        </td>
                        <td>{paiement.date_paiement ? new Date(paiement.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>
                          <div className="table-actions">
                            {paiement.statut !== 'valide' && (
                              <button type="button" className="btn-link" onClick={() => handlePaiementAction(paiement, 'validate')}>
                                Valider
                              </button>
                            )}
                            <button type="button" className="btn-link" onClick={() => handlePaiementAction(paiement, 'cancel')}>
                              Annuler
                            </button>
                            <button type="button" className="btn-link danger" onClick={() => handlePaiementAction(paiement, 'delete')}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
          <div>
                <h3 className="card-title">Dépenses récentes</h3>
                <p className="card-subtitle">{depenses.length} dépense{depenses.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : depenses.length === 0 ? (
              <div className="empty-state">
                <p>Aucune dépense enregistrée</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Catégorie</th>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depenses.map((dep) => (
                      <tr key={dep.id}>
                        <td>{dep.titre}</td>
                        <td>{dep.categorie || '—'}</td>
                        <td>{dep.date_depense ? new Date(dep.date_depense).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>
                          {dep.montant_eur ? `${dep.montant_eur.toFixed(2)} €` : `${dep.montant} ${dep.devise || '€'}`}
                          {dep.devise && dep.devise.toUpperCase() !== 'EUR' && dep.montant_eur ? (
                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>
                              ({dep.montant} {dep.devise})
                </span>
                          ) : null}
                        </td>
                        <td>
                          <span className={`status-badge ${dep.statut === 'valide' ? 'approved' : dep.statut === 'rejete' ? 'rejected' : 'pending'}`}>
                            {dep.statut || 'planifie'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            {dep.statut !== 'valide' && (
                              <button type="button" className="btn-link" onClick={() => handleDepenseAction(dep, 'validate')}>
                                Valider
                              </button>
                            )}
                            {dep.statut !== 'rejete' && (
                              <button type="button" className="btn-link" onClick={() => handleDepenseAction(dep, 'reject')}>
                                Rejeter
                              </button>
                            )}
                            <button type="button" className="btn-link danger" onClick={() => handleDepenseAction(dep, 'delete')}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Historique des opérations</h3>
                <p className="card-subtitle">{historique.length} évènement{historique.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : historique.length === 0 ? (
              <div className="empty-state">
                <p>Aucune opération enregistrée</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historique.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.created_at ? new Date(entry.created_at).toLocaleString('fr-FR') : '—'}</td>
                        <td>{entry.action}</td>
                        <td>{entry.description || '—'}</td>
                        <td>{entry.montant != null ? `${entry.montant}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Binômes mentor/mentoré</h3>
                <p className="card-subtitle">
                  {loading ? 'Chargement...' : `${relations.length} relation${relations.length > 1 ? 's' : ''} active${relations.length > 1 ? 's' : ''}`}
            </p>
          </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" onClick={() => setShowModal('mentor')}>
                  + Ajouter Mentor
                </button>
                <button className="btn-primary" onClick={() => setShowModal('mentee')}>
                  + Ajouter Mentoré
                </button>
                <button className="btn-primary" onClick={() => setShowModal('relation')}>
                  + Créer Relation
                </button>
                <button className="btn-primary" onClick={() => {
                  if (relations.length === 0) {
                    alert('Veuillez d\'abord créer une relation mentor/mentoré')
                    return
                  }
                  setShowModal('rendezvous')
                }}>
                  + Ajouter Rendez-vous
                </button>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : relations.length === 0 ? (
              <div className="empty-state">
                <p>Aucune relation active</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mentor</th>
                      <th>Mentoré</th>
                      <th>Date début</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(relations) && relations.length > 0 ? (
                      relations.map((rel) => {
                        if (!rel || !rel.id) return null
                        return (
                          <tr key={rel.id}>
                            <td>
                              {rel.mentor?.membre?.prenom || ''} {rel.mentor?.membre?.nom || ''}
                            </td>
                            <td>
                              {rel.mentee?.membre?.prenom || ''} {rel.mentee?.membre?.nom || ''}
                            </td>
                            <td>
                              {rel.date_debut ? new Date(rel.date_debut).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td>
                              <span className={`status-badge ${rel.statut_relation === 'active' ? 'approved' : 'pending'}`}>
                                {rel.statut_relation || 'active'}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-4">Aucune relation trouvée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal pour créer Mentor/Mentee/Relation */}
        {showModal && typeof document !== 'undefined' && createPortal(
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showModal === 'mentor' && 'Ajouter un Mentor'}
                  {showModal === 'mentee' && 'Ajouter un Mentoré'}
                  {showModal === 'relation' && 'Créer une Relation'}
                  {showModal === 'rendezvous' && 'Ajouter un Rendez-vous'}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(null)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {showModal === 'mentor' && (
                  <>
                    <div className="form-group">
                      <label>Membre *</label>
                      <select
                        required
                        value={formData.membre_id || ''}
                        onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Domaine *</label>
                      <input
                        type="text"
                        required
                        value={formData.domaine || ''}
                        onChange={(e) => setFormData({ ...formData, domaine: e.target.value })}
                        placeholder="Ex: Géomatique, SIG, Cartographie..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Biographie</label>
                      <textarea
                        value={formData.biographie || ''}
                        onChange={(e) => setFormData({ ...formData, biographie: e.target.value })}
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Compétences</label>
                      <textarea
                        value={formData.competences || ''}
                        onChange={(e) => setFormData({ ...formData, competences: e.target.value })}
                        rows="2"
                      />
                    </div>
                    <div className="form-group">
                      <label>LinkedIn</label>
                      <input
                        type="url"
                        value={formData.linkedin || ''}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Disponibilité</label>
                      <select
                        value={formData.disponibilite || ''}
                        onChange={(e) => setFormData({ ...formData, disponibilite: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="disponible">Disponible</option>
                        <option value="limitee">Limitée</option>
                        <option value="indisponible">Indisponible</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select
                        value={formData.status || 'active'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>
                  </>
                )}

                {showModal === 'mentee' && (
                  <>
                    <div className="form-group">
                      <label>Membre *</label>
                      <select
                        required
                        value={formData.membre_id || ''}
                        onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Domaine souhaité *</label>
                      <input
                        type="text"
                        required
                        value={formData.domaine_souhaite || ''}
                        onChange={(e) => setFormData({ ...formData, domaine_souhaite: e.target.value })}
                        placeholder="Ex: Géomatique, SIG, Cartographie..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Objectif général</label>
                      <textarea
                        value={formData.objectif_general || ''}
                        onChange={(e) => setFormData({ ...formData, objectif_general: e.target.value })}
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Niveau</label>
                      <select
                        value={formData.niveau || ''}
                        onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="etudiant">Étudiant</option>
                        <option value="jeune_diplome">Jeune diplômé</option>
                        <option value="professionnel">Professionnel</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select
                        value={formData.status || 'en recherche'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="en recherche">En recherche</option>
                        <option value="en cours">En cours</option>
                        <option value="termine">Terminé</option>
                      </select>
                    </div>
                  </>
                )}

                {showModal === 'relation' && (
                  <>
                    <div className="form-group">
                      <label>Mentor *</label>
                      <select
                        required
                        value={formData.mentor_id || ''}
                        onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                      >
                        <option value="">Sélectionner un mentor</option>
                        {mentors.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.membre?.prenom} {m.membre?.nom} - {m.domaine}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mentoré *</label>
                      <select
                        required
                        value={formData.mentee_id || ''}
                        onChange={(e) => setFormData({ ...formData, mentee_id: e.target.value })}
                      >
                        <option value="">Sélectionner un mentoré</option>
                        {mentees.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.membre?.prenom} {m.membre?.nom} - {m.domaine_souhaite}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date de début</label>
                      <input
                        type="date"
                        value={formData.date_debut || ''}
                        onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut de la relation</label>
                      <select
                        value={formData.statut_relation || 'active'}
                        onChange={(e) => setFormData({ ...formData, statut_relation: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="terminee">Terminée</option>
                        <option value="suspendue">Suspendue</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Commentaire admin</label>
                      <textarea
                        value={formData.commentaire_admin || ''}
                        onChange={(e) => setFormData({ ...formData, commentaire_admin: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </>
                )}

                {showModal === 'rendezvous' && (
                  <>
                    <div className="form-group">
                      <label>Relation Mentor/Mentoré *</label>
                      <select
                        required
                        value={formData.relation_id || ''}
                        onChange={(e) => setFormData({ ...formData, relation_id: e.target.value })}
                      >
                        <option value="">Sélectionner une relation</option>
                        {relations.map((rel) => (
                          <option key={rel.id} value={rel.id}>
                            {rel.mentor?.membre?.prenom} {rel.mentor?.membre?.nom} ↔ {rel.mentee?.membre?.prenom} {rel.mentee?.membre?.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date et heure du rendez-vous *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.date_rdv || ''}
                        onChange={(e) => setFormData({ ...formData, date_rdv: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Type de rendez-vous *</label>
                      <select
                        required
                        value={formData.type || ''}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="premier_contact">Premier contact</option>
                        <option value="suivi">Suivi</option>
                        <option value="bilan">Bilan</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes du rendez-vous</label>
                      <textarea
                        value={formData.notes_rdv || ''}
                        onChange={(e) => setFormData({ ...formData, notes_rdv: e.target.value })}
                        rows="4"
                        placeholder="Notes sur le rendez-vous..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Prochaine action</label>
                      <textarea
                        value={formData.prochaine_action || ''}
                        onChange={(e) => setFormData({ ...formData, prochaine_action: e.target.value })}
                        rows="3"
                        placeholder="Actions à prévoir après ce rendez-vous..."
                      />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'En cours...' : 'Créer'}
          </button>
        </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Composant pour le contenu Recrutement
  const RecrutementContent = () => {
    const [recrutementStats, setRecrutementStats] = useState(null)
    const [candidatures, setCandidatures] = useState([])
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(null) // 'candidature', 'suivi', 'recommandation'
    const [members, setMembers] = useState([])
    const [mentors, setMentors] = useState([])
    const [mentees, setMentees] = useState([])
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [selectedCandidatureId, setSelectedCandidatureId] = useState(null)

    const loadData = async () => {
      setLoading(true)
      try {
        const [statsData, candidaturesData] = await Promise.all([
          fetchRecrutementStats(),
          fetchCandidatures({ limit: 10 }),
        ])
        setRecrutementStats(statsData || {})
        // fetchCandidatures peut retourner un objet avec pagination ou directement un tableau
        let candidaturesArray = []
        if (Array.isArray(candidaturesData)) {
          candidaturesArray = candidaturesData
        } else if (candidaturesData?.candidatures) {
          candidaturesArray = candidaturesData.candidatures
        } else if (candidaturesData?.data?.candidatures) {
          candidaturesArray = candidaturesData.data.candidatures
        }
        setCandidatures(candidaturesArray)
      } catch (err) {
        console.error('Erreur chargement recrutement:', err)
        setCandidatures([])
        setRecrutementStats({})
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      loadData()
    }, [])

    useEffect(() => {
      if (showModal) {
        const loadSelectData = async () => {
          try {
            if (showModal === 'recommandation') {
              // Pour recommandation, charger mentors et mentorés
              const [membersData, mentorsData, menteesData] = await Promise.all([
                fetchAllMembers({ limit: 100 }),
                fetchMentors({ limit: 100 }),
                fetchMentees({ limit: 100 }),
              ])
              setMembers(Array.isArray(membersData) ? membersData : [])
              setMentors(Array.isArray(mentorsData) ? mentorsData : [])
              setMentees(Array.isArray(menteesData) ? menteesData : [])
            } else {
              // Pour candidature et suivi, charger seulement les membres
              const membersData = await fetchAllMembers({ limit: 100 })
              setMembers(Array.isArray(membersData) ? membersData : [])
            }
          } catch (err) {
            console.error('Erreur chargement données sélecteurs:', err)
          }
        }
        loadSelectData()
      }
    }, [showModal])

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'candidature') {
          await createCandidature(formData)
          alert('Candidature créée avec succès !')
        } else if (showModal === 'suivi') {
          await createSuivi({ ...formData, candidature_id: selectedCandidatureId })
          alert('Suivi créé avec succès !')
        } else if (showModal === 'recommandation') {
          await createRecommandation(formData)
          alert('Recommandation créée avec succès !')
        }
        setShowModal(null)
        setFormData({})
        setSelectedCandidatureId(null)
        loadData()
      } catch (err) {
        alert('Erreur : ' + err.message)
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <div className="module-content">
        <section className="module-toolbar">
          <div className="toolbar-filters">
            <div className="filter-item">
              <label>Mois</label>
              <select value={filters.periode_mois} onChange={(e) => handleFilterChange('periode_mois', e.target.value)}>
                <option value="">Tous</option>
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>Année</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={filters.periode_annee}
                onChange={(e) => handleFilterChange('periode_annee', e.target.value)}
                placeholder="2025"
              />
            </div>
            <div className="filter-item">
              <label>Statut cotisation</label>
              <select value={filters.statutCotisation} onChange={(e) => handleFilterChange('statutCotisation', e.target.value)}>
                <option value="">Tous</option>
                <option value="en_attente">En attente</option>
                <option value="paye">Payé</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
            <div className="filter-item">
              <label>Type paiement</label>
              <select value={filters.typePaiement} onChange={(e) => handleFilterChange('typePaiement', e.target.value)}>
                <option value="">Tous</option>
                <option value="cotisation">Cotisation</option>
                <option value="don">Don</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="filter-item">
              <label>Statut paiement</label>
              <select value={filters.statutPaiement} onChange={(e) => handleFilterChange('statutPaiement', e.target.value)}>
                <option value="">Tous</option>
                <option value="valide">Validé</option>
                <option value="en_attente">En attente</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
            <div className="filter-item">
              <label>Statut dépense</label>
              <select value={filters.statutDepense} onChange={(e) => handleFilterChange('statutDepense', e.target.value)}>
                <option value="">Toutes</option>
                <option value="planifie">Planifiée</option>
                <option value="valide">Validée</option>
                <option value="rejete">Rejetée</option>
              </select>
            </div>
            <button className="btn-secondary" type="button" onClick={handleResetFilters}>
              Réinitialiser
            </button>
          </div>
          <div className="toolbar-actions">
            <button className="btn-secondary" type="button" disabled={exporting} onClick={() => handleExport('cotisations')}>
              Export cotisations
            </button>
            <button className="btn-secondary" type="button" disabled={exporting} onClick={() => handleExport('paiements')}>
              Export paiements
            </button>
            <button className="btn-secondary" type="button" disabled={exporting} onClick={() => handleExport('depenses')}>
              Export dépenses
            </button>
            <button className="btn-primary" type="button" disabled={exporting} onClick={handleReportDownload}>
              Rapport PDF
            </button>
          </div>
        </section>
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Candidatures totales</p>
              <p className="kpi-value">{recrutementStats?.total_candidatures || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Suivis réalisés</p>
              <p className="kpi-value">{recrutementStats?.total_suivis || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Recommandations</p>
              <p className="kpi-value">{recrutementStats?.total_recommandations || 0}</p>
            </div>
          </div>
        </section>

        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Candidatures récentes</h3>
                <p className="card-subtitle">{candidatures.length} candidature{candidatures.length > 1 ? 's' : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" onClick={() => setShowModal('candidature')}>
                  + Ajouter Candidature
                </button>
                <button className="btn-primary" onClick={() => {
                  if (candidatures.length === 0) {
                    alert('Veuillez d\'abord créer une candidature')
                    return
                  }
                  setShowModal('suivi')
                }}>
                  + Ajouter Suivi
                </button>
                <button className="btn-primary" onClick={() => setShowModal('recommandation')}>
                  + Ajouter Recommandation
                </button>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : candidatures.length === 0 ? (
              <div className="empty-state">
                <p>Aucune candidature</p>
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
                    {Array.isArray(candidatures) && candidatures.length > 0 ? (
                      candidatures.map((cand) => {
                        if (!cand || !cand.id) return null
                        return (
                          <tr key={cand.id}>
                            <td>
                              {cand.membre?.prenom || ''} {cand.membre?.nom || ''}
                            </td>
                            <td>{cand.titre_poste || '—'}</td>
                            <td>{cand.entreprise || '—'}</td>
                            <td>
                              <span className={`status-badge ${cand.statut === 'envoye' ? 'pending' : cand.statut === 'accepte' ? 'approved' : 'rejected'}`}>
                                {cand.statut || 'envoye'}
              </span>
                            </td>
                            <td>
                              {cand.date_candidature ? new Date(cand.date_candidature).toLocaleDateString('fr-FR') : '—'}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4">Aucune candidature trouvée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal pour créer Candidature/Suivi/Recommandation */}
        {showModal && typeof document !== 'undefined' && createPortal(
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showModal === 'candidature' && 'Ajouter une Candidature'}
                  {showModal === 'suivi' && 'Ajouter un Suivi'}
                  {showModal === 'recommandation' && 'Ajouter une Recommandation'}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(null)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {showModal === 'candidature' && (
                  <>
                    <div className="form-group">
                      <label>Membre *</label>
                      <select
                        required
                        value={formData.membre_id || ''}
                        onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Titre du poste *</label>
                      <input
                        type="text"
                        required
                        value={formData.titre_poste || ''}
                        onChange={(e) => setFormData({ ...formData, titre_poste: e.target.value })}
                        placeholder="Ex: Ingénieur Géomaticien"
                      />
                    </div>
                    <div className="form-group">
                      <label>Entreprise *</label>
                      <input
                        type="text"
                        required
                        value={formData.entreprise || ''}
                        onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                        placeholder="Ex: Société XYZ"
                      />
                    </div>
                    <div className="form-group">
                      <label>Type de contrat *</label>
                      <select
                        required
                        value={formData.type_contrat || ''}
                        onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="CDI">CDI</option>
                        <option value="CDD">CDD</option>
                        <option value="Stage">Stage</option>
                        <option value="Alternance">Alternance</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select
                        value={formData.statut || 'envoye'}
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                      >
                        <option value="envoye">Envoyé</option>
                        <option value="accepte">Accepté</option>
                        <option value="refuse">Refusé</option>
                        <option value="en_attente">En attente</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date de candidature</label>
                      <input
                        type="date"
                        value={formData.date_candidature || ''}
                        onChange={(e) => setFormData({ ...formData, date_candidature: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>URL CV</label>
                      <input
                        type="url"
                        value={formData.cv_url || ''}
                        onChange={(e) => setFormData({ ...formData, cv_url: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>URL Lettre de motivation</label>
                      <input
                        type="url"
                        value={formData.lm_url || ''}
                        onChange={(e) => setFormData({ ...formData, lm_url: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>URL Portfolio</label>
                      <input
                        type="url"
                        value={formData.portfolio_url || ''}
                        onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Commentaire mentor</label>
                      <textarea
                        value={formData.commentaire_mentor || ''}
                        onChange={(e) => setFormData({ ...formData, commentaire_mentor: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </>
                )}

                {showModal === 'suivi' && (
                  <>
                    <div className="form-group">
                      <label>Candidature *</label>
                      <select
                        required
                        value={selectedCandidatureId || ''}
                        onChange={(e) => setSelectedCandidatureId(e.target.value)}
                      >
                        <option value="">Sélectionner une candidature</option>
                        {candidatures.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.membre?.prenom} {c.membre?.nom} - {c.titre_poste} ({c.entreprise})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date de l'événement *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.date_event || ''}
                        onChange={(e) => setFormData({ ...formData, date_event: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Type d'événement *</label>
                      <select
                        required
                        value={formData.type_event || ''}
                        onChange={(e) => setFormData({ ...formData, type_event: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="entretien">Entretien</option>
                        <option value="relance">Relance</option>
                        <option value="reponse">Réponse</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows="4"
                      />
                    </div>
                  </>
                )}

                {showModal === 'recommandation' && (
                  <>
                    <div className="form-group">
                      <label>Mentor *</label>
                      <select
                        required
                        value={formData.mentor_id || ''}
                        onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                      >
                        <option value="">Sélectionner un mentor</option>
                        {mentors.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.membre?.prenom} {m.membre?.nom} - {m.domaine}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mentoré *</label>
                      <select
                        required
                        value={formData.mentee_id || ''}
                        onChange={(e) => setFormData({ ...formData, mentee_id: e.target.value })}
                      >
                        <option value="">Sélectionner un mentoré</option>
                        {mentees.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.membre?.prenom} {m.membre?.nom} - {m.domaine_souhaite}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Texte de recommandation *</label>
                      <textarea
                        required
                        value={formData.texte || ''}
                        onChange={(e) => setFormData({ ...formData, texte: e.target.value })}
                        rows="6"
                        placeholder="Rédigez la recommandation..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Lien PDF (optionnel)</label>
                      <input
                        type="url"
                        value={formData.lien_pdf || ''}
                        onChange={(e) => setFormData({ ...formData, lien_pdf: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'En cours...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Composant pour le contenu Trésorerie
  const TresorerieContent = () => {
    const [tresorerieStats, setTresorerieStats] = useState(null)
    const [cotisations, setCotisations] = useState([])
    const [paiements, setPaiements] = useState([])
    const [depenses, setDepenses] = useState([])
    const [historique, setHistorique] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(null) // 'cotisation', 'paiement', 'relance', 'carte'
    const [members, setMembers] = useState([])
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [cotisationTarif, setCotisationTarif] = useState({ amount: null, currency: '' })
    const [carteTarif, setCarteTarif] = useState({ amount: null, currency: '' })
    const [filters, setFilters] = useState(TREASURY_FILTERS_DEFAULT)
    const [exporting, setExporting] = useState(false)

    const determineTarifForCountry = (country = '') => {
      const normalized = country ? country.toLowerCase() : ''
      if (normalized.includes('senegal') || normalized.includes('sénégal')) {
        return { amount: 2000, currency: 'FCFA' }
      }
      return { amount: 10, currency: '€' }
    }

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const cotisationParams = {
          limit: 10,
          ...(filters.periode_annee && { annee: filters.periode_annee }),
          ...(filters.periode_mois && { periode_mois: filters.periode_mois }),
          ...(filters.statutCotisation && { statut_paiement: filters.statutCotisation }),
        }
        const paiementParams = {
          limit: 10,
          ...(filters.periode_mois && { periode_mois: filters.periode_mois }),
          ...(filters.periode_annee && { periode_annee: filters.periode_annee }),
          ...(filters.typePaiement && { type_paiement: filters.typePaiement }),
          ...(filters.statutPaiement && { statut: filters.statutPaiement }),
        }
        const depenseParams = {
          limit: 10,
          ...(filters.statutDepense && { statut: filters.statutDepense }),
          ...(filters.periode_mois && { periode_mois: filters.periode_mois }),
          ...(filters.periode_annee && { periode_annee: filters.periode_annee }),
        }

        const [statsData, cotisationsData, paiementsData, depensesData, historiqueData] = await Promise.all([
          fetchTresorerieStats(),
          fetchCotisations(cotisationParams),
          fetchPaiements(paiementParams),
          fetchDepenses(depenseParams),
          fetchHistorique({ limit: 10 }),
        ])

        const monthFilter = filters.periode_mois ? parseInt(filters.periode_mois, 10) : null
        const yearFilter = filters.periode_annee ? parseInt(filters.periode_annee, 10) : null

        let cotisationsList = Array.isArray(cotisationsData) ? cotisationsData : []
        if (monthFilter) {
          cotisationsList = cotisationsList.filter((cot) => Number(cot.periode_mois) === monthFilter)
        }

        let paiementsList = Array.isArray(paiementsData) ? paiementsData : []
        if (monthFilter) {
          paiementsList = paiementsList.filter((paiement) => Number(paiement.periode_mois) === monthFilter)
        }

        let depensesList = Array.isArray(depensesData) ? depensesData : []
        if (monthFilter || yearFilter) {
          depensesList = depensesList.filter((dep) => {
            if (!dep.date_depense) return false
            const date = new Date(dep.date_depense)
            const matchesMonth = monthFilter ? date.getMonth() + 1 === monthFilter : true
            const matchesYear = yearFilter ? date.getFullYear() === yearFilter : true
            return matchesMonth && matchesYear
          })
        }

        setTresorerieStats(statsData || {})
        setCotisations(cotisationsList)
        setPaiements(paiementsList)
        setDepenses(depensesList)
        setHistorique(Array.isArray(historiqueData) ? historiqueData : [])
      } catch (err) {
        console.error('Erreur chargement trésorerie:', err)
        setCotisations([])
        setPaiements([])
        setDepenses([])
        setHistorique([])
        setTresorerieStats({})
      } finally {
        setLoading(false)
      }
    }, [filters])

    useEffect(() => {
      loadData()
    }, [loadData])

    useEffect(() => {
      if (showModal) {
        const loadSelectData = async () => {
          try {
            const membersData = await fetchAllMembers({ limit: 100 })
            setMembers(Array.isArray(membersData) ? membersData : [])
          } catch (err) {
            console.error('Erreur chargement données sélecteurs:', err)
          }
        }
        loadSelectData()
      } else {
        setFormData({})
        setCotisationTarif({ amount: null, currency: '' })
        setCarteTarif({ amount: null, currency: '' })
      }
    }, [showModal])

    useEffect(() => {
      if (showModal === 'cotisation' || showModal === 'paiement') {
        const now = new Date()
        setFormData((prev) => ({
          ...prev,
          periode_mois: prev.periode_mois || now.getMonth() + 1,
          periode_annee: prev.periode_annee || now.getFullYear(),
        }))
      }
    }, [showModal])

    const handleCotisationMemberChange = (memberId) => {
      const selected = members.find((m) => m.id === memberId)
      const tarif = determineTarifForCountry(selected?.pays)
      setCotisationTarif(tarif)
      setFormData((prev) => ({
        ...prev,
        membre_id: memberId,
        montant: tarif.amount,
        pays: selected?.pays || '',
      }))
    }

    const handleCarteMemberChange = (memberId) => {
      const selected = members.find((m) => m.id === memberId)
      const tarif = determineTarifForCountry(selected?.pays)
      setCarteTarif(tarif)
      setFormData((prev) => ({
        ...prev,
        membre_id: memberId,
        numero_membre: selected?.numero_membre || '',
        pays: selected?.pays || '',
      }))
    }

    const handleFilterChange = (field, value) => {
      setFilters((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

    const handleResetFilters = () => {
      setFilters({ ...TREASURY_FILTERS_DEFAULT })
    }

    const downloadFileFromBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'export-asgf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    }

    const buildCotisationFilters = () => ({
      periode_mois: filters.periode_mois || undefined,
      periode_annee: filters.periode_annee || undefined,
      statut: filters.statutCotisation || undefined,
    })

    const buildPaiementFilters = () => ({
      periode_mois: filters.periode_mois || undefined,
      periode_annee: filters.periode_annee || undefined,
      statut: filters.statutPaiement || undefined,
      type_paiement: filters.typePaiement || undefined,
    })

    const buildDepenseFilters = () => ({
      periode_mois: filters.periode_mois || undefined,
      periode_annee: filters.periode_annee || undefined,
      statut: filters.statutDepense || undefined,
    })

    const handleExport = async (type) => {
      try {
        setExporting(true)
        let file
        if (type === 'cotisations') {
          file = await downloadCotisationsExport(buildCotisationFilters())
        } else if (type === 'paiements') {
          file = await downloadPaiementsExport(buildPaiementFilters())
        } else if (type === 'depenses') {
          file = await downloadDepensesExport(buildDepenseFilters())
        }
        if (file) {
          downloadFileFromBlob(file.blob, file.filename)
        }
      } catch (err) {
        alert('Erreur export : ' + err.message)
      } finally {
        setExporting(false)
      }
    }

    const handleReportDownload = async () => {
      try {
        setExporting(true)
        const file = await downloadTresorerieReport(buildCotisationFilters())
        downloadFileFromBlob(file.blob, file.filename)
      } catch (err) {
        alert('Erreur rapport : ' + err.message)
      } finally {
        setExporting(false)
      }
    }

    const handleCotisationAction = async (cot, action) => {
      try {
        if (action === 'validate') {
          await validateCotisation(cot.id, { date_paiement: new Date().toISOString().split('T')[0] })
        } else if (action === 'reset') {
          await resetCotisation(cot.id)
        } else if (action === 'delete') {
          if (!window.confirm('Supprimer définitivement cette cotisation ?')) {
            return
          }
          await deleteCotisation(cot.id)
        }
        await loadData()
      } catch (err) {
        alert('Action impossible : ' + err.message)
      }
    }

    const handlePaiementAction = async (paiement, action) => {
      try {
        if (action === 'validate') {
          await validatePaiement(paiement.id, { date_paiement: paiement.date_paiement || new Date().toISOString().split('T')[0] })
        } else if (action === 'cancel') {
          const reason = window.prompt('Raison de l’annulation ?', '')
          await cancelPaiement(paiement.id, { reason: reason || '' })
        } else if (action === 'delete') {
          if (!window.confirm('Supprimer définitivement ce paiement ?')) {
            return
          }
          await deletePaiement(paiement.id)
        }
        await loadData()
      } catch (err) {
        alert('Action impossible : ' + err.message)
      }
    }

    const handleDepenseAction = async (depense, action) => {
      try {
        if (action === 'validate') {
          await validateDepense(depense.id)
        } else if (action === 'reject') {
          const reason = window.prompt('Motif du rejet ?', '')
          await rejectDepense(depense.id, { reason: reason || '' })
        } else if (action === 'delete') {
          if (!window.confirm('Supprimer définitivement cette dépense ?')) {
            return
          }
          await deleteDepense(depense.id)
        }
        await loadData()
      } catch (err) {
        alert('Action impossible : ' + err.message)
      }
    }

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'cotisation') {
          await createCotisation(formData)
          alert('Cotisation créée avec succès !')
        } else if (showModal === 'paiement') {
          await createPaiement(formData)
          alert('Paiement créé avec succès !')
        } else if (showModal === 'relance') {
          await createRelance(formData)
          alert('Relance créée avec succès !')
        } else if (showModal === 'carte') {
          await createCarteMembre(formData)
          alert('Carte membre créée avec succès !')
        } else if (showModal === 'depense') {
          await createDepense(formData)
          alert('Dépense créée avec succès !')
        }
        setShowModal(null)
        setFormData({})
        await loadData()
      } catch (err) {
        alert('Erreur : ' + err.message)
      } finally {
        setSubmitting(false)
      }
    }

    const formatPeriod = (periodeMois, periodeAnnee, date) => {
      if (periodeMois && periodeAnnee) {
        const label = MONTH_OPTIONS[periodeMois - 1]?.label || `Mois ${periodeMois}`
        return `${label} ${periodeAnnee}`
      }
      if (date) {
        const parsed = new Date(date)
        const label = MONTH_OPTIONS[parsed.getMonth()]?.label || parsed.toLocaleDateString('fr-FR', { month: 'long' })
        return `${label} ${parsed.getFullYear()}`
      }
      if (periodeAnnee) {
        return `Année ${periodeAnnee}`
      }
      return '—'
    }

    return (
      <div className="module-content">
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations totales</p>
              <p className="kpi-value">{tresorerieStats?.total_cotisations || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations payées</p>
              <p className="kpi-value">{tresorerieStats?.cotisations_payees || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">En attente</p>
              <p className="kpi-value">{tresorerieStats?.cotisations_en_attente || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon yellow">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Montant total (EUR)</p>
              <p className="kpi-value">{tresorerieStats?.montant_total_eur?.toFixed(2) || '0.00'} €</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon teal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations Sénégal (EUR)</p>
              <p className="kpi-value">{tresorerieStats?.montant_senegal_eur?.toFixed(2) || '0.00'} €</p>
              <p className="card-subtitle">{tresorerieStats?.cotisations_senegal || 0} cotisations</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations Internationales (EUR)</p>
              <p className="kpi-value">{tresorerieStats?.montant_international_eur?.toFixed(2) || '0.00'} €</p>
              <p className="card-subtitle">{tresorerieStats?.cotisations_internationales || 0} cotisations</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon red">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0 0h6m-6 0H6M5 12h14" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Dépenses validées (EUR)</p>
              <p className="kpi-value">{tresorerieStats?.depenses_validees_eur?.toFixed(2) || '0.00'} €</p>
              <p className="card-subtitle">{tresorerieStats?.depenses_validees || 0} dépenses</p>
            </div>
          </div>
        </section>

        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Cotisations récentes</h3>
                <p className="card-subtitle">{cotisations.length} cotisation{cotisations.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => setShowModal('cotisation')}>
                  + Ajouter Cotisation
                </button>
                <button className="btn-primary" onClick={() => setShowModal('paiement')}>
                  + Ajouter Paiement
                </button>
                <button className="btn-primary" onClick={() => setShowModal('relance')}>
                  + Créer Relance
                </button>
                <button className="btn-primary" onClick={() => setShowModal('carte')}>
                  + Créer Carte
                </button>
                <button className="btn-primary" onClick={() => setShowModal('depense')}>
                  + Ajouter Dépense
                </button>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : cotisations.length === 0 ? (
              <div className="empty-state">
                <p>Aucune cotisation</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Période</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Date paiement</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotisations.map((cot) => (
                      <tr key={cot.id}>
                        <td>{cot.membre?.prenom} {cot.membre?.nom}</td>
                        <td>{formatPeriod(cot.periode_mois, cot.periode_annee, cot.date_paiement)}</td>
                        <td>
                          {cot.montant_eur ? `${cot.montant_eur.toFixed(2)} €` : `${cot.montant} ${cot.currencySymbol || '€'}`}
                          {cot.currencySymbol && cot.currencySymbol !== '€' && cot.montant_eur ? (
                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>
                              ({cot.montant} {cot.currencySymbol})
              </span>
                          ) : null}
                        </td>
                        <td>
                          <span className={`status-badge ${cot.statut_paiement === 'paye' ? 'approved' : 'pending'}`}>
                            {cot.statut_paiement || 'en_attente'}
                          </span>
                        </td>
                        <td>{cot.date_paiement ? new Date(cot.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>
                          <div className="table-actions">
                            {cot.statut_paiement !== 'paye' && (
                              <button type="button" className="btn-link" onClick={() => handleCotisationAction(cot, 'validate')}>
                                Valider
                              </button>
                            )}
                            {cot.statut_paiement === 'paye' && (
                              <button type="button" className="btn-link" onClick={() => handleCotisationAction(cot, 'reset')}>
                                Repasser en attente
                              </button>
                            )}
                            <button type="button" className="btn-link danger" onClick={() => handleCotisationAction(cot, 'delete')}>
                              Supprimer
                            </button>
          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
            )}
          </div>
        </section>

        {/* Modal pour créer Cotisation/Paiement/Relance/Carte */}
        {showModal && typeof document !== 'undefined' && createPortal(
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showModal === 'cotisation' && 'Ajouter une Cotisation'}
                  {showModal === 'paiement' && 'Ajouter un Paiement'}
                  {showModal === 'relance' && 'Créer une Relance'}
                  {showModal === 'carte' && 'Créer une Carte Membre'}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(null)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {showModal === 'cotisation' && (
                  <>
                    <div className="form-group">
                      <label>Membre *</label>
                      <select
                        required
                        value={formData.membre_id || ''}
                        onChange={(e) => handleCotisationMemberChange(e.target.value)}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    {cotisationTarif.amount && (
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '-8px' }}>
                        Tarif appliqué : {cotisationTarif.amount} {cotisationTarif.currency}
                      </p>
                    )}
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-6px' }}>
                      Sénégal = 2000 FCFA / mois · Autres pays = 10 € / mois
                    </p>
                    <div className="form-group">
                      <label>Période de cotisation *</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                          required
                          value={formData.periode_mois || ''}
                          onChange={(e) => setFormData({ ...formData, periode_mois: parseInt(e.target.value, 10) })}
                        >
                          <option value="">Mois</option>
                          {MONTH_OPTIONS.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          min="2020"
                          max="2100"
                          value={formData.periode_annee || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            setFormData({ ...formData, periode_annee: isNaN(value) ? '' : value })
                          }}
                          placeholder="Année"
                        />
          </div>
                    </div>
                    <div className="form-group">
                      <label>Année *</label>
                      <input
                        type="number"
                        required
                        value={formData.annee || ''}
                        onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                        placeholder="Ex: 2025"
                        min="2020"
                        max="2100"
                      />
                    </div>
                    <div className="form-group">
                      <label>Montant *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.montant ?? ''}
                        disabled
                        placeholder="Automatique"
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut paiement</label>
                      <select
                        value={formData.statut_paiement || 'en_attente'}
                        onChange={(e) => setFormData({ ...formData, statut_paiement: e.target.value })}
                      >
                        <option value="en_attente">En attente</option>
                        <option value="paye">Payé</option>
                        <option value="annule">Annulé</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mode de paiement</label>
                      <select
                        value={formData.mode_paiement || ''}
                        onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="virement">Virement</option>
                        <option value="cheque">Chèque</option>
                        <option value="especes">Espèces</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date de paiement</label>
                      <input
                        type="date"
                        value={formData.date_paiement || ''}
                        onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {showModal === 'paiement' && (
                  <>
                    <div className="form-group">
                      <label>Membre *</label>
                      <select
                        required
                        value={formData.membre_id || ''}
                        onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Période concernée *</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                          required
                          value={formData.periode_mois || ''}
                          onChange={(e) => setFormData({ ...formData, periode_mois: parseInt(e.target.value, 10) })}
                        >
                          <option value="">Mois</option>
                          {MONTH_OPTIONS.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          min="2020"
                          max="2100"
                          value={formData.periode_annee || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            setFormData({ ...formData, periode_annee: isNaN(value) ? '' : value })
                          }}
                          placeholder="Année"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Type de paiement *</label>
                      <select
                        required
                        value={formData.type_paiement || ''}
                        onChange={(e) => setFormData({ ...formData, type_paiement: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="cotisation">Cotisation</option>
                        <option value="don">Don</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Montant *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.montant || ''}
                        onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label>Mode de paiement</label>
                      <select
                        value={formData.mode_paiement || ''}
                        onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="virement">Virement</option>
                        <option value="cheque">Chèque</option>
                        <option value="especes">Espèces</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date de paiement</label>
                      <input
                        type="date"
                        value={formData.date_paiement || ''}
                        onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Détails</label>
                      <textarea
                        value={formData.details || ''}
                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </>
                )}

                {showModal === 'relance' && (
                  <>
                    <div className="form-group">
                      <label>Membre *</label>
                      <select
                        required
                        value={formData.membre_id || ''}
                        onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Année *</label>
                      <input
                        type="number"
                        required
                        value={formData.annee || ''}
                        onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                        placeholder="Ex: 2025"
                        min="2020"
                        max="2100"
                      />
                    </div>
                    <div className="form-group">
                      <label>Type de relance *</label>
                      <select
                        required
                        value={formData.type_relance || ''}
                        onChange={(e) => setFormData({ ...formData, type_relance: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="premiere">Première relance</option>
                        <option value="seconde">Seconde relance</option>
                        <option value="derniere">Dernière relance</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Commentaire</label>
                      <textarea
                        value={formData.commentaire || ''}
                        onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </>
                )}

                {showModal === 'carte' && (
                  <>
                    <div className="form-group">
                      <label>Membre *</label>
                      <select
                        required
                        value={formData.membre_id || ''}
                        onChange={(e) => handleCarteMemberChange(e.target.value)}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Numéro de membre *</label>
                      <input
                        type="text"
                        required
                        value={formData.numero_membre || ''}
                        onChange={(e) => setFormData({ ...formData, numero_membre: e.target.value })}
                        placeholder="Ex: ASGF-2025-001"
                      />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      Tarif carte membre : {carteTarif.amount ? `${carteTarif.amount} ${carteTarif.currency}` : 'Sélectionnez un membre'}
                      {' '} (2000 FCFA au Sénégal · 10 € ailleurs)
                    </p>
                    <div className="form-group">
                      <label>Date d'émission</label>
                      <input
                        type="date"
                        value={formData.date_emission || ''}
                        onChange={(e) => setFormData({ ...formData, date_emission: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Date de validité</label>
                      <input
                        type="date"
                        value={formData.date_validite || ''}
                        onChange={(e) => setFormData({ ...formData, date_validite: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Pays</label>
                      <input
                        type="text"
                        value={formData.pays || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormData({ ...formData, pays: value })
                          setCarteTarif(determineTarifForCountry(value))
                        }}
                        placeholder="Ex: France"
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut de la carte</label>
                      <select
                        value={formData.statut_carte || ''}
                        onChange={(e) => setFormData({ ...formData, statut_carte: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="active">Active</option>
                        <option value="expiree">Expirée</option>
                        <option value="annulee">Annulée</option>
                      </select>
                    </div>
                  </>
                )}

                {showModal === 'depense' && (
                  <>
                    <div className="form-group">
                      <label>Titre *</label>
                      <input
                        type="text"
                        required
                        value={formData.titre || ''}
                        onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                        placeholder="Ex: Impression flyers événement"
                      />
                    </div>
                    <div className="form-group">
                      <label>Montant *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.montant || ''}
                        onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label>Devise *</label>
                      <select
                        required
                        value={formData.devise || 'EUR'}
                        onChange={(e) => setFormData({ ...formData, devise: e.target.value })}
                      >
                        <option value="EUR">EUR</option>
                        <option value="FCFA">FCFA</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Catégorie</label>
                      <input
                        type="text"
                        value={formData.categorie || ''}
                        onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                        placeholder="Ex: Communication"
                      />
                    </div>
                    <div className="form-group">
                      <label>Date de dépense *</label>
                      <input
                        type="date"
                        required
                        value={formData.date_depense || ''}
                        onChange={(e) => setFormData({ ...formData, date_depense: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select
                        value={formData.statut || 'planifie'}
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                      >
                        <option value="planifie">Planifiée</option>
                        <option value="valide">Validée</option>
                        <option value="rejete">Rejetée</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Lien justificatif</label>
                      <input
                        type="url"
                        value={formData.justificatif_url || ''}
                        onChange={(e) => setFormData({ ...formData, justificatif_url: e.target.value })}
                        placeholder="URL du justificatif (Google Drive, etc.)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'En cours...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Composant pour le contenu Secrétariat
  const SecretariatContent = () => {
    const [secretariatStats, setSecretariatStats] = useState(null)
    const [reunions, setReunions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(null) // 'reunion', 'participant', 'action', 'document'
    const [members, setMembers] = useState([])
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const loadData = async () => {
      setLoading(true)
      try {
        const [statsData, reunionsData] = await Promise.all([
          fetchSecretariatStats(),
          fetchReunions({ limit: 10 }),
        ])
        setSecretariatStats(statsData || {})
        setReunions(Array.isArray(reunionsData) ? reunionsData : [])
      } catch (err) {
        console.error('Erreur chargement secrétariat:', err)
        setReunions([])
        setSecretariatStats({})
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      loadData()
    }, [])

    useEffect(() => {
      if (showModal) {
        const loadSelectData = async () => {
          try {
            const membersData = await fetchAllMembers({ limit: 100 })
            setMembers(Array.isArray(membersData) ? membersData : [])
          } catch (err) {
            console.error('Erreur chargement données sélecteurs:', err)
          }
        }
        loadSelectData()
      }
    }, [showModal])

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'reunion') {
          await createReunion(formData)
          alert('Réunion créée avec succès !')
        } else if (showModal === 'participant') {
          if (!formData.reunion_id) {
            alert('Veuillez d\'abord créer une réunion')
            return
          }
          await addParticipant(formData)
          alert('Participant ajouté avec succès !')
        } else if (showModal === 'action') {
          await createAction(formData)
          alert('Action créée avec succès !')
        } else if (showModal === 'document') {
          await createDocument(formData)
          alert('Document créé avec succès !')
        }
        setShowModal(null)
        setFormData({})
        loadData()
      } catch (err) {
        alert('Erreur : ' + err.message)
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <div className="module-content">
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Réunions totales</p>
              <p className="kpi-value">{secretariatStats?.total_reunions || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">À venir</p>
              <p className="kpi-value">{secretariatStats?.reunions_a_venir || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Actions en cours</p>
              <p className="kpi-value">{secretariatStats?.actions_en_cours || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon yellow">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Documents</p>
              <p className="kpi-value">{secretariatStats?.total_documents || 0}</p>
            </div>
          </div>
        </section>

        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Réunions récentes</h3>
                <p className="card-subtitle">{reunions.length} réunion{reunions.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => setShowModal('reunion')}>
                  + Créer Réunion
                </button>
                <button className="btn-primary" onClick={() => {
                  if (reunions.length === 0) {
                    alert('Veuillez d\'abord créer une réunion')
                    return
                  }
                  setShowModal('participant')
                }}>
                  + Ajouter Participant
                </button>
                <button className="btn-primary" onClick={() => setShowModal('action')}>
                  + Créer Action
                </button>
                <button className="btn-primary" onClick={() => setShowModal('document')}>
                  + Ajouter Document
                </button>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : reunions.length === 0 ? (
              <div className="empty-state">
                <p>Aucune réunion</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Heure</th>
                      <th>Pôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reunions.map((reunion) => (
                      <tr key={reunion.id}>
                        <td>{reunion.titre}</td>
                        <td>{reunion.type_reunion}</td>
                        <td>{reunion.date_reunion ? new Date(reunion.date_reunion).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>{reunion.heure_debut || '—'}</td>
                        <td>{reunion.pole || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal pour créer Réunion/Participant/Action/Document */}
        {showModal && typeof document !== 'undefined' && createPortal(
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showModal === 'reunion' && 'Créer une Réunion'}
                  {showModal === 'participant' && 'Ajouter un Participant'}
                  {showModal === 'action' && 'Créer une Action'}
                  {showModal === 'document' && 'Ajouter un Document'}
            </h2>
                <button className="modal-close" onClick={() => setShowModal(null)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {showModal === 'reunion' && (
                  <>
                    <div className="form-group">
                      <label>Type de réunion *</label>
                      <select
                        required
                        value={formData.type_reunion || ''}
                        onChange={(e) => setFormData({ ...formData, type_reunion: e.target.value })}
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
                        value={formData.titre || ''}
                        onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                        placeholder="Ex: Réunion CA - Janvier 2025"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Date de réunion *</label>
                      <input
                        type="date"
                        required
                        value={formData.date_reunion || ''}
                        onChange={(e) => setFormData({ ...formData, date_reunion: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Heure de début *</label>
                      <input
                        type="time"
                        required
                        value={formData.heure_debut || ''}
                        onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Heure de fin</label>
                      <input
                        type="time"
                        value={formData.heure_fin || ''}
                        onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Pôle</label>
                      <input
                        type="text"
                        value={formData.pole || ''}
                        onChange={(e) => setFormData({ ...formData, pole: e.target.value })}
                        placeholder="Ex: Communication"
                      />
                    </div>
                    <div className="form-group">
                      <label>Lien visio</label>
                      <input
                        type="url"
                        value={formData.lien_visio || ''}
                        onChange={(e) => setFormData({ ...formData, lien_visio: e.target.value })}
                        placeholder="URL de la visioconférence"
                      />
                    </div>
                    <div className="form-group">
                      <label>Ordre du jour</label>
                      <textarea
                        value={formData.ordre_du_jour || ''}
                        onChange={(e) => setFormData({ ...formData, ordre_du_jour: e.target.value })}
                        rows="4"
                      />
                    </div>
                  </>
                )}

                {showModal === 'participant' && (
                  <>
                    <div className="form-group">
                      <label>Réunion *</label>
                      <select
                        required
                        value={formData.reunion_id || ''}
                        onChange={(e) => setFormData({ ...formData, reunion_id: e.target.value })}
                      >
                        <option value="">Sélectionner une réunion</option>
                        {reunions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.titre} - {r.date_reunion ? new Date(r.date_reunion).toLocaleDateString('fr-FR') : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Membre</label>
                      <select
                        value={formData.membre_id || ''}
                        onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Statut invitation</label>
                      <select
                        value={formData.statut_invitation || 'envoye'}
                        onChange={(e) => setFormData({ ...formData, statut_invitation: e.target.value })}
                      >
                        <option value="envoye">Envoyée</option>
                        <option value="acceptee">Acceptée</option>
                        <option value="refusee">Refusée</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Commentaire</label>
                      <textarea
                        value={formData.commentaire || ''}
                        onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </>
                )}

                {showModal === 'action' && (
                  <>
                    <div className="form-group">
                      <label>Réunion</label>
                      <select
                        value={formData.reunion_id || ''}
                        onChange={(e) => setFormData({ ...formData, reunion_id: e.target.value })}
                      >
                        <option value="">Sélectionner une réunion (optionnel)</option>
                        {reunions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.titre} - {r.date_reunion ? new Date(r.date_reunion).toLocaleDateString('fr-FR') : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Intitulé *</label>
                      <input
                        type="text"
                        required
                        value={formData.intitule || ''}
                        onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
                        placeholder="Ex: Préparer le budget 2025"
                      />
                    </div>
                    <div className="form-group">
                      <label>Assigné à</label>
                      <select
                        value={formData.assigne_a || ''}
                        onChange={(e) => setFormData({ ...formData, assigne_a: e.target.value })}
                      >
                        <option value="">Sélectionner un membre</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom} ({m.numero_membre})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select
                        value={formData.statut || 'en cours'}
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                      >
                        <option value="en cours">En cours</option>
                        <option value="termine">Terminé</option>
                        <option value="annule">Annulé</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Deadline</label>
                      <input
                        type="date"
                        value={formData.deadline || ''}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {showModal === 'document' && (
                  <>
                    <div className="form-group">
                      <label>Titre *</label>
                      <input
                        type="text"
                        required
                        value={formData.titre || ''}
                        onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                        placeholder="Ex: Procès-verbal CA Janvier 2025"
                      />
                    </div>
                    <div className="form-group">
                      <label>Catégorie *</label>
                      <select
                        required
                        value={formData.categorie || ''}
                        onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        <option value="pv">Procès-verbal</option>
                        <option value="compte_rendu">Compte rendu</option>
                        <option value="rapport">Rapport</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Lien PDF *</label>
                      <input
                        type="url"
                        required
                        value={formData.lien_pdf || ''}
                        onChange={(e) => setFormData({ ...formData, lien_pdf: e.target.value })}
                        placeholder="URL du document PDF"
                      />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'En cours...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logoASGF} alt="ASGF" className="sidebar-logo" />
          <h2 className="sidebar-title">ASGF Admin</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveModule('dashboard')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'adhesions' ? 'active' : ''}`}
            onClick={() => setActiveModule('adhesions')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Adhésions</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'members' ? 'active' : ''}`}
            onClick={() => setActiveModule('members')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Membres</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'formations' ? 'active' : ''}`}
            onClick={() => setActiveModule('formations')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Formations</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'webinaires' ? 'active' : ''}`}
            onClick={() => setActiveModule('webinaires')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Webinaires</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'tresorerie' ? 'active' : ''}`}
            onClick={() => setActiveModule('tresorerie')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Trésorerie</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'secretariat' ? 'active' : ''}`}
            onClick={() => setActiveModule('secretariat')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Secrétariat</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'mentorat' ? 'active' : ''}`}
            onClick={() => setActiveModule('mentorat')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Mentorat</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'recrutement' ? 'active' : ''}`}
            onClick={() => setActiveModule('recrutement')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Recrutement</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveModule('settings')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Paramètres</span>
          </button>
        </nav>

        <button className="sidebar-logout" onClick={onLogout}>
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </aside>

      {/* Main Content */}
      <div className="admin-main-content">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
                  <div>
              <h1 className="page-title">{moduleInfo.title}</h1>
              <p className="breadcrumb">{moduleInfo.breadcrumb}</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className="admin-info">
              <div className="admin-details">
                <span className="admin-name">{admin?.numero_membre || 'Admin'}</span>
                <span className="admin-role">
                  {admin?.is_master ? 'Superadmin' : admin?.role_global || 'Admin'}
                </span>
              </div>
              <div className="admin-avatar">
                {getInitials(admin)}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="admin-content">
          {activeModule === 'mentorat' && <MentoratContent />}
          {activeModule === 'recrutement' && <RecrutementContent />}
          {activeModule === 'tresorerie' && <TresorerieContent />}
          {activeModule === 'secretariat' && <SecretariatContent />}
          {activeModule === 'dashboard' && (
            <>
              {/* KPI Cards */}
              <section className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon blue">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="kpi-content">
                <p className="kpi-label">Membres totaux</p>
                <p className="kpi-value">{stats.totalMembers}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon orange">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="kpi-content">
                <p className="kpi-label">Adhésions en attente</p>
                <p className="kpi-value">{stats.pendingAdhesions}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon green">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="kpi-content">
                <p className="kpi-label">Formations actives</p>
                <p className="kpi-value">{stats.activeFormations}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon yellow">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              <div className="kpi-content">
                <p className="kpi-label">Cartes générées</p>
                <p className="kpi-value">{stats.cardsGenerated}</p>
              </div>
            </div>
          </section>

          {/* Charts Section */}
          <section className="charts-grid">
            <div className="chart-card">
              <div className="card-header">
                <h3 className="card-title">Évolution des adhésions</h3>
                <button className="card-action">Voir tout</button>
              </div>
              <div className="chart-placeholder">
                <p className="placeholder-text">Graphique en barres - Adhésions par mois</p>
                <div className="chart-bars">
                  {[65, 80, 45, 90, 70, 85, 95].map((height, i) => (
                    <div key={i} className="bar" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="card-header">
                <h3 className="card-title">Répartition géographique</h3>
                <button className="card-action">Voir tout</button>
              </div>
              <div className="chart-placeholder">
                <p className="placeholder-text">Graphique donut - France / Sénégal / Autres</p>
                <div className="chart-donut">
                  <div className="donut-segment france" style={{ '--percentage': '60%' }}></div>
                  <div className="donut-segment senegal" style={{ '--percentage': '30%' }}></div>
                  <div className="donut-segment autres" style={{ '--percentage': '10%' }}></div>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color france"></span>
                    <span>France (60%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color senegal"></span>
                    <span>Sénégal (30%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color autres"></span>
                    <span>Autres (10%)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Table Section */}
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Adhésions en attente de validation</h3>
                  <p className="card-subtitle">
                    {Array.isArray(pendingMembers) ? pendingMembers.length : 0} demande{Array.isArray(pendingMembers) && pendingMembers.length > 1 ? 's' : ''} en attente
                    </p>
                  </div>
                <button
                  onClick={loadPendingMembers}
                  disabled={loading}
                  className="refresh-btn"
                >
                  <svg className={`refresh-icon ${loading ? 'spinning' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Chargement...' : 'Actualiser'}
                </button>
              </div>

              {error && !loading && (
                <div className="error-banner">
                  <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {loading && (!Array.isArray(pendingMembers) || pendingMembers.length === 0) && (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Chargement des données...</p>
                </div>
              )}
              {!loading && (!Array.isArray(pendingMembers) || pendingMembers.length === 0) && (
                <div className="empty-state">
                  <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Aucune adhésion en attente</p>
                </div>
              )}
              {!loading && Array.isArray(pendingMembers) && pendingMembers.length > 0 && (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Pays</th>
                        <th>Statut</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(pendingMembers) && pendingMembers.length > 0 ? (
                        pendingMembers.map((membre) => {
                          if (!membre || !membre.id) return null
                          return (
                            <tr key={membre.id}>
                              <td>
                                <div className="table-cell-name">
                                  <div className="name-avatar">
                                    {(membre.prenom?.[0] || '?').toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="name-primary">
                                      {membre.prenom || ''} {membre.nom || ''}
                                    </div>
                                    {membre.domaine && (
                                      <div className="name-secondary">{membre.domaine}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>{membre.email || '—'}</td>
                              <td>
                                <span className="country-badge">{membre.pays || '—'}</span>
                              </td>
                              <td>
                                <span className="status-badge pending">En attente</span>
                              </td>
                              <td>
                                {membre.created_at 
                                  ? new Date(membre.created_at).toLocaleDateString('fr-FR')
                                  : '—'}
                              </td>
                              <td>
                                <div className="table-actions">
                    <button
                      onClick={() => handleApprove(membre.id)}
                                    className="action-btn approve"
                                    title="Valider"
                    >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                    </button>
                    <button
                      onClick={() => handleReject(membre.id)}
                                    className="action-btn reject"
                                    title="Rejeter"
                    >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                    </button>
                  </div>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-4">Aucune adhésion en attente</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
            </div>
          )}
            </div>
        </section>
            </>
          )}
          {activeModule !== 'dashboard' && activeModule !== 'mentorat' && activeModule !== 'recrutement' && (
            <div className="module-placeholder">
              <p>Module "{moduleInfo.title}" en cours de développement</p>
            </div>
          )}
      </main>
      </div>
    </div>
  )
}

export default AdminDash