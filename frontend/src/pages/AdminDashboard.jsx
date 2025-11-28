// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import {
  fetchPendingMembers,
  approveMember,
  rejectMember,
  fetchAdhesionStats,
  fetchAllMembers,
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
  fetchMentors,
  fetchMentees,
  fetchCotisations,
  createCotisation,
  fetchPaiements,
  createPaiement,
  updatePaiement,
  createRelance,
  createCarteMembre,
  geocodeMemberAddress,
  fetchCarteMembreByNumero,
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
  fetchRelances,
  fetchSecretariatStats,
  fetchReunions,
  createReunion,
  addParticipant,
  createAction,
  saveCompteRendu,
  createDocument,
  fetchFormationStats,
  fetchFormations,
  createFormation,
  updateFormation,
  deleteFormation,
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
  fetchInscriptions,
  createInscription,
  updateInscription,
  deleteInscription,
  confirmInscription,
  rejectInscription,
  fetchFormateurs,
  createFormateur,
  updateFormateur,
  deleteFormateur,
  fetchWebinaireStats,
  fetchWebinaires,
  createWebinaire,
  updateWebinaire,
  deleteWebinaire,
  fetchWebinaireInscriptions,
  createWebinaireInscription,
  updateWebinaireInscription,
  deleteWebinaireInscription,
  fetchPresentateurs,
  createPresentateur,
  updatePresentateur,
  deletePresentateur,
} from "../services/api"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import L from "leaflet"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import "leaflet/dist/leaflet.css"
import logoASGF from "../img/Logo_officiel_ASGF.png"
import "./AdminDashboard.css"
import TreasuryFilters from "../components/treasury/TreasuryFilters"
import TreasuryActionsBar from "../components/treasury/TreasuryActionsBar"
import TreasuryAnalytics from "../components/treasury/TreasuryAnalytics"
import TreasuryTimeline from "../components/treasury/TreasuryTimeline"

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const MEMBER_MARKER_ICON = L.icon({
  iconUrl:
    "data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23f97316' stroke='%23ffffff' stroke-width='1' d='M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z'/%3E%3C/svg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 30],
  popupAnchor: [0, -28],
  shadowUrl: markerShadow,
  shadowSize: [40, 40],
  shadowAnchor: [12, 40],
})

const createClusterIcon = (cluster) =>
  L.divIcon({
    html: `<div class="member-cluster"><span>${cluster.getChildCount()}</span></div>`,
    className: "member-cluster-icon",
    iconSize: L.point(44, 44, true),
  })

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
  memberQuery: "",
}

const MONTH_LABEL_SHORT = MONTH_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label.slice(0, 3)
  return acc
}, {})

const normalizeText = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

const categorizeCountry = (country = "") => {
  const normalized = normalizeText(country)
  if (normalized.includes("senegal")) return "senegal"
  if (normalized.includes("france")) return "france"
  return "international"
}

const computeKpis = (cotisations, paiements, depenses) => {
  const isPaidCotisation = (status) => normalizeText(status) === "paye"
  const isValidated = (status) => normalizeText(status) === "valide"

  const cotisationsPayees = cotisations.filter((cot) => isPaidCotisation(cot.statut_paiement))
  const montantTotalEur = cotisationsPayees.reduce((sum, cot) => sum + (cot.montant_eur || cot.montant || 0), 0)
  const montantSenegalEur = cotisationsPayees
    .filter((cot) => categorizeCountry(cot.membre?.pays) === "senegal")
    .reduce((sum, cot) => sum + (cot.montant_eur || cot.montant || 0), 0)
  const montantInternationalEur = cotisationsPayees
    .filter((cot) => categorizeCountry(cot.membre?.pays) !== "senegal")
    .reduce((sum, cot) => sum + (cot.montant_eur || cot.montant || 0), 0)
  const depensesValidees = depenses.filter((dep) => dep.statut === "valide")
  const depensesValideesEur = depensesValidees.reduce((sum, dep) => sum + (dep.montant_eur || dep.montant || 0), 0)
  const paiementsDons = paiements.filter(
    (pai) => normalizeText(pai.statut) === "valide" && ["don", "subvention"].includes(normalizeText(pai.type_paiement))
  )
  const totalPaiementsDonsEur = paiementsDons.reduce((sum, pai) => sum + (pai.montant || 0), 0)

  return {
    total_cotisations: cotisations.length,
    cotisations_payees: cotisationsPayees.length,
    cotisations_en_attente: cotisations.length - cotisationsPayees.length,
    montant_total_eur: montantTotalEur,
    montant_senegal_eur: montantSenegalEur,
    montant_international_eur: montantInternationalEur,
    depenses_validees_eur: depensesValideesEur,
    depenses_validees: depensesValidees.length,
    total_paiements_dons_eur: totalPaiementsDonsEur,
    paiements_dons_count: paiementsDons.length,
  }
}

const buildAnalyticsData = (cotisations, paiements, depenses) => {
  const isPaidCotisation = (status) => normalizeText(status) === "paye"
  const isValidated = (status) => normalizeText(status) === "valide"
  const map = new Map()

  const upsert = (item, field, value) => {
    if (!item.periode_annee || !item.periode_mois) return
    const key = `${item.periode_annee}-${String(item.periode_mois).padStart(2, "0")}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `${MONTH_LABEL_SHORT[item.periode_mois] || "M"} ${item.periode_annee}`,
        cotisations: 0,
        paiements: 0,
        depenses: 0,
      })
    }
    map.get(key)[field] += value
  }

  cotisations
    .filter((cot) => isPaidCotisation(cot.statut_paiement))
    .forEach((cot) => upsert(cot, "cotisations", cot.montant_eur || cot.montant || 0))

  paiements
    .filter((pai) => isValidated(pai.statut))
    .forEach((pai) => upsert(pai, "paiements", pai.montant || 0))

  depenses
    .filter((dep) => isValidated(dep.statut))
    .forEach((dep) => upsert(dep, "depenses", dep.montant_eur || dep.montant || 0))

  const trends = Array.from(map.values()).sort((a, b) => (a.key > b.key ? 1 : -1))
  const distributionCounters = { france: 0, senegal: 0, international: 0 }

  cotisations
    .filter((cot) => isPaidCotisation(cot.statut_paiement))
    .forEach((cot) => {
      const bucket = categorizeCountry(cot.membre?.pays)
      distributionCounters[bucket] += cot.montant_eur || cot.montant || 0
    })

  const distribution = [
    { name: "France", value: distributionCounters.france },
    { name: "Sénégal", value: distributionCounters.senegal },
    { name: "International", value: distributionCounters.international },
  ]

  return {
    trends,
    distribution,
    timeline: trends,
  }
}

const filterByMemberQuery = (items, query) => {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return items
  return items.filter((item) => {
    const fullName = normalizeText(`${item.membre?.prenom || ""} ${item.membre?.nom || ""}`)
    const numero = normalizeText(item.membre?.numero_membre || "")
    return fullName.includes(normalizedQuery) || numero.includes(normalizedQuery)
  })
}

const DEFAULT_MAP_CENTER = [14.4974, -14.4524] // Dakar par défaut

const buildGeocodeKey = (member) => {
  if (!member) return ''
  return [member.adresse, member.ville, member.pays]
    .map((value) => (value || '').trim().toLowerCase())
    .filter(Boolean)
    .join(', ')
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

  // Composant pour le contenu Membres
  const MembersContent = () => {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedMember, setSelectedMember] = useState(null)
    const [carteMembre, setCarteMembre] = useState(null)
    const [loadingCarte, setLoadingCarte] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [memberLocations, setMemberLocations] = useState([])
    const [geocoding, setGeocoding] = useState(false)
    const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 })
    const [mapReady, setMapReady] = useState(false)
    const geocodeCacheRef = useRef({})
    const PAGE_SIZE = 20

    useEffect(() => {
      setMapReady(true)
      if (typeof window === 'undefined') return
      try {
        const storedCache = window.localStorage.getItem('asgf_member_geocode_cache')
        if (storedCache) {
          geocodeCacheRef.current = JSON.parse(storedCache) || {}
        }
      } catch (err) {
        console.warn('Impossible de charger le cache de géocodage:', err)
      }
    }, [])

    const persistGeocodeCache = useCallback(() => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem('asgf_member_geocode_cache', JSON.stringify(geocodeCacheRef.current))
      } catch (err) {
        console.warn('Impossible de sauvegarder le cache de géocodage:', err)
      }
    }, [])

    const updateMapLocationsFromCache = useCallback((membersList) => {
      if (!Array.isArray(membersList) || membersList.length === 0) {
        setMemberLocations([])
        return
      }

      const mapped = membersList
        .map((member) => {
          const key = buildGeocodeKey(member)
          if (!key) return null
          const cached = geocodeCacheRef.current[key]
          if (!cached?.lat || !cached?.lng) return null
          return {
            memberId: member.id,
            lat: Number(cached.lat),
            lng: Number(cached.lng),
            member,
            label: cached.label || cached.display_name || '',
          }
        })
        .filter(Boolean)

      setMemberLocations(mapped)
    }, [])

    const geocodeMissingLocations = useCallback(
      async (membersList) => {
        if (!Array.isArray(membersList) || membersList.length === 0) {
          setMemberLocations([])
          return
        }

        const membersWithAddress = membersList.filter((member) => buildGeocodeKey(member))
        const missingMembers = membersWithAddress.filter((member) => {
          const key = buildGeocodeKey(member)
          return key && !geocodeCacheRef.current[key]
        })

        if (!missingMembers.length) {
          updateMapLocationsFromCache(membersList)
          return
        }

        setGeocoding(true)
        setGeocodeProgress({ done: 0, total: missingMembers.length })

        for (let i = 0; i < missingMembers.length; i += 1) {
          const member = missingMembers[i]
          const key = buildGeocodeKey(member)
          if (!key) {
            setGeocodeProgress((prev) => ({ ...prev, done: Math.min(prev.done + 1, prev.total) }))
            continue
          }

          try {
            const result = await geocodeMemberAddress({
              adresse: member.adresse,
              ville: member.ville,
              pays: member.pays,
            })

            if (result?.lat && result?.lng) {
              geocodeCacheRef.current[key] = {
                lat: Number(result.lat),
                lng: Number(result.lng),
                label: result.display_name || '',
              }
              persistGeocodeCache()
            }
          } catch (err) {
            console.warn('Erreur géocodage membre', member.id, err)
          } finally {
            setGeocodeProgress((prev) => ({
              ...prev,
              done: Math.min(prev.done + 1, prev.total),
            }))

            if (i < missingMembers.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1100))
            }
          }
        }

        updateMapLocationsFromCache(membersList)
        setGeocoding(false)
      },
      [persistGeocodeCache, updateMapLocationsFromCache]
    )

    const loadMembers = useCallback(async () => {
      setLoading(true)
      try {
        const allMembers = []
        let page = 1
        let hasMore = true

        while (hasMore) {
          const chunk = await fetchAllMembers({ page, limit: 100 })
          const membersData = Array.isArray(chunk) ? chunk : chunk?.data || []
          allMembers.push(...membersData)
          hasMore = membersData.length === 100
          page += 1
        }

        setMembers(allMembers)
        updateMapLocationsFromCache(allMembers)
        geocodeMissingLocations(allMembers)
      } catch (err) {
        console.error('Erreur chargement membres:', err)
        setMembers([])
        setMemberLocations([])
      } finally {
        setLoading(false)
      }
    }, [geocodeMissingLocations, updateMapLocationsFromCache])

    useEffect(() => {
      loadMembers()
    }, [loadMembers])

    const handleViewMember = async (member) => {
      setSelectedMember(member)
      setCarteMembre(null)

      if (member.numero_membre) {
        setLoadingCarte(true)
        try {
          const carte = await fetchCarteMembreByNumero(member.numero_membre)
          setCarteMembre(carte)
        } catch (err) {
          console.error('Erreur chargement carte membre:', err)
        } finally {
          setLoadingCarte(false)
        }
      }
    }

    const filteredMembers = useMemo(() => {
      if (!searchQuery) return members
      const query = searchQuery.toLowerCase()
      return members.filter((m) => {
        const fullName = `${m.prenom || ''} ${m.nom || ''}`.toLowerCase()
        const email = (m.email || '').toLowerCase()
        const numero = (m.numero_membre || '').toLowerCase()
        return fullName.includes(query) || email.includes(query) || numero.includes(query)
      })
    }, [members, searchQuery])

    const paginatedMembers = useMemo(() => {
      const start = (currentPage - 1) * PAGE_SIZE
      return filteredMembers.slice(start, start + PAGE_SIZE)
    }, [filteredMembers, currentPage])

    const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE)
    const mapCenter = useMemo(() => {
      if (!memberLocations.length) return DEFAULT_MAP_CENTER
      const avgLat = memberLocations.reduce((sum, loc) => sum + loc.lat, 0) / memberLocations.length
      const avgLng = memberLocations.reduce((sum, loc) => sum + loc.lng, 0) / memberLocations.length
      return [avgLat, avgLng]
    }, [memberLocations])
    const localizedPlural = memberLocations.length !== 1 ? 's' : ''

    return (
      <div className="module-content">
        <div className="module-header">
          <h2>Gestion des Membres</h2>
          <p className="module-subtitle">Fiches techniques des membres de l'association</p>
        </div>

        {/* Barre de recherche */}
        <div className="search-bar" style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Rechercher par nom, email ou numéro de membre..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="search-input"
          />
        </div>

        {/* Carte interactive */}
        <section className="card members-map-card">
          <div className="card-header">
            <div>
              <h3>Carte des membres</h3>
              <p className="card-subtitle">Localisation approximative basée sur Adresse / Ville / Pays</p>
            </div>
            <div className="map-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => geocodeMissingLocations(members)}
                disabled={geocoding || !members.length}
              >
                {geocoding
                  ? `Géocodage... (${geocodeProgress.done}/${geocodeProgress.total})`
                  : 'Mettre à jour la carte'}
              </button>
              <span className="map-counter">
                {memberLocations.length} membre{localizedPlural} localisé{localizedPlural}
              </span>
            </div>
          </div>
          <div className="map-wrapper">
            {!mapReady && <div className="loading-state">Préparation de la carte...</div>}
            {mapReady && memberLocations.length > 0 && (
              <MapContainer
                key={memberLocations.length}
                center={mapCenter}
                zoom={3}
                minZoom={2}
                maxZoom={10}
                scrollWheelZoom
                className="members-map"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MarkerClusterGroup
                  chunkedLoading
                  showCoverageOnHover={false}
                  spiderfyOnMaxZoom
                  iconCreateFunction={createClusterIcon}
                >
                  {memberLocations.map((location) => (
                    <Marker key={location.memberId} position={[location.lat, location.lng]} icon={MEMBER_MARKER_ICON}>
                      <Popup>
                        <div className="map-popup">
                          <p className="map-popup-title">
                            {location.member?.prenom || ''} {location.member?.nom || ''}
                          </p>
                          <p>Numéro : {location.member?.numero_membre || '—'}</p>
                          <p>Ville : {location.member?.ville || '—'}</p>
                          <p>Pays : {location.member?.pays || '—'}</p>
                          <button className="btn-link" type="button" onClick={() => handleViewMember(location.member)}>
                            Ouvrir la fiche membre
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            )}
            {mapReady && memberLocations.length === 0 && (
              <div className="no-data">
                <p>Aucun membre géolocalisé pour le moment.</p>
                <p>Utilisez le bouton ci-dessus pour lancer le géocodage.</p>
              </div>
            )}
          </div>
          {geocoding && (
            <div className="geocode-progress">
              Géocodage en cours ({geocodeProgress.done}/{geocodeProgress.total})
            </div>
          )}
        </section>

        {/* Tableau des membres */}
        {loading ? (
          <div className="loading-state">Chargement des membres...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Statut Pro</th>
                    <th>Pays</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.length > 0 ? (
                    paginatedMembers.map((member) => (
                      <tr key={member.id}>
                        <td>{member.numero_membre || '-'}</td>
                        <td>{member.nom || '-'}</td>
                        <td>{member.prenom || '-'}</td>
                        <td>{member.email || '-'}</td>
                        <td>
                          <span className={`status-badge ${member.status === 'approved' ? 'approved' : member.status === 'pending' ? 'pending' : 'rejected'}`}>
                            {member.status === 'approved' ? 'Approuvé' : member.status === 'pending' ? 'En attente' : 'Rejeté'}
                          </span>
                        </td>
                        <td>{member.statut_pro || '-'}</td>
                        <td>{member.pays || '-'}</td>
                        <td>
          <button
                            onClick={() => handleViewMember(member)}
                            className="action-btn view"
                            title="Voir la fiche"
          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        {searchQuery ? 'Aucun membre trouvé' : 'Aucun membre'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
        </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Précédent
                </button>
                <span className="pagination-info">
                  Page {currentPage} sur {totalPages} ({filteredMembers.length} membre{filteredMembers.length !== 1 ? 's' : ''})
              </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal Fiche Technique Membre */}
        {selectedMember && createPortal(
          <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Fiche Technique - {selectedMember.prenom} {selectedMember.nom}</h3>
                <button className="modal-close" onClick={() => setSelectedMember(null)}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  {/* Colonne gauche - Informations personnelles */}
                  <div>
                    <h4 style={{ marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Informations Personnelles
                    </h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Numéro de membre :</span>
                        <span className="info-value">{selectedMember.numero_membre || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Nom :</span>
                        <span className="info-value">{selectedMember.nom || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Prénom :</span>
                        <span className="info-value">{selectedMember.prenom || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email :</span>
                        <span className="info-value">{selectedMember.email || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Téléphone :</span>
                        <span className="info-value">{selectedMember.telephone || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Date de naissance :</span>
                        <span className="info-value">
                          {selectedMember.date_naissance ? new Date(selectedMember.date_naissance).toLocaleDateString('fr-FR') : '-'}
              </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Statut :</span>
                        <span className={`status-badge ${selectedMember.status === 'approved' ? 'approved' : selectedMember.status === 'pending' ? 'pending' : 'rejected'}`}>
                          {selectedMember.status === 'approved' ? 'Approuvé' : selectedMember.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Date d'adhésion :</span>
                        <span className="info-value">
                          {selectedMember.date_adhesion ? new Date(selectedMember.date_adhesion).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </div>
                    </div>

                    <h4 style={{ marginTop: '30px', marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Informations Professionnelles
                    </h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Statut Pro :</span>
                        <span className="info-value">{selectedMember.statut_pro || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Domaine :</span>
                        <span className="info-value">{selectedMember.domaine || '-'}</span>
                      </div>
                    </div>

                    <h4 style={{ marginTop: '30px', marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Informations Académiques
                    </h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Université :</span>
                        <span className="info-value">{selectedMember.universite || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Niveau d'études :</span>
                        <span className="info-value">{selectedMember.niveau_etudes || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Année universitaire :</span>
                        <span className="info-value">{selectedMember.annee_universitaire || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Spécialité :</span>
                        <span className="info-value">{selectedMember.specialite || '-'}</span>
                      </div>
                    </div>

                    <h4 style={{ marginTop: '30px', marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Adresse
                    </h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Adresse :</span>
                        <span className="info-value">{selectedMember.adresse || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Ville :</span>
                        <span className="info-value">{selectedMember.ville || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Pays :</span>
                        <span className="info-value">{selectedMember.pays || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Colonne droite - Carte Membre */}
                  <div>
                    <h4 style={{ marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Carte Membre
                    </h4>
                    {loadingCarte ? (
                      <div className="loading-state">Chargement de la carte membre...</div>
                    ) : carteMembre ? (
                      <div className="carte-membre-container">
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Numéro de membre :</span>
                            <span className="info-value">{carteMembre.numero_membre || '-'}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Date d'émission :</span>
                            <span className="info-value">
                              {carteMembre.date_emission ? new Date(carteMembre.date_emission).toLocaleDateString('fr-FR') : '-'}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Date de validité :</span>
                            <span className="info-value">
                              {carteMembre.date_validite ? new Date(carteMembre.date_validite).toLocaleDateString('fr-FR') : '-'}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Pays :</span>
                            <span className="info-value">{carteMembre.pays || '-'}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Statut carte :</span>
                            <span className="info-value">{carteMembre.statut_carte || '-'}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Statut paiement :</span>
                            <span className="info-value">{carteMembre.statut_paiement || '-'}</span>
                          </div>
                        </div>

                        {carteMembre.lien_pdf && (
                          <div style={{ marginTop: '20px' }}>
                            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Carte Membre PDF :</div>
                            <iframe
                              src={carteMembre.lien_pdf}
                              style={{
                                width: '100%',
                                height: '500px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                              }}
                              title="Carte Membre PDF"
                            />
                            <div style={{ marginTop: '10px' }}>
                              <a
                                href={carteMembre.lien_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{ display: 'inline-block', textDecoration: 'none' }}
                              >
                                Ouvrir dans un nouvel onglet
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="no-data">
                        <p>Aucune carte membre trouvée pour ce membre.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedMember(null)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Composant pour le contenu Adhésion
  const AdhesionContent = () => {
    const [stats, setStats] = useState({})
    const [members, setMembers] = useState([])
    const [pendingMembers, setPendingMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ search: '', status: '', pays: '' })
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 20

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const [statsData, pendingData, membersData] = await Promise.all([
          fetchAdhesionStats(),
          fetchPendingMembers(),
          fetchAllMembers({ page: currentPage, limit: PAGE_SIZE, ...filters }),
        ])
        setStats(statsData || {})
        setPendingMembers(Array.isArray(pendingData) ? pendingData : [])
        setMembers(Array.isArray(membersData) ? membersData : membersData?.data || [])
      } catch (err) {
        console.error('Erreur chargement adhésion:', err)
        setStats({})
        setPendingMembers([])
        setMembers([])
      } finally {
        setLoading(false)
      }
    }, [currentPage, filters])

    useEffect(() => {
      loadData()
    }, [loadData])

    const handleApprove = async (id) => {
      try {
        await approveMember(id)
        await loadData()
        alert('Membre approuvé avec succès !')
      } catch (err) {
        alert('Erreur : ' + err.message)
      }
    }

    const handleReject = async (id) => {
      if (!window.confirm('Etes-vous sur de vouloir rejeter cette adhesion ?')) {
        return
      }
      try {
        await rejectMember(id)
        await loadData()
        alert('Membre rejeté.')
      } catch (err) {
        alert('Erreur : ' + err.message)
      }
    }

    // Préparer les données pour les graphiques
    const monthlyData = useMemo(() => {
      if (!stats.monthly_evolution) return []
      return Object.entries(stats.monthly_evolution)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          const [year, month] = key.split('-')
          const monthIndex = parseInt(month, 10) - 1
          const monthLabel = (MONTH_OPTIONS[monthIndex]?.label) || month
          return {
            label: `${monthLabel} ${year}`,
            total: value.total || 0,
            approved: value.approved || 0,
            pending: value.pending || 0,
            rejected: value.rejected || 0,
          }
        })
    }, [stats.monthly_evolution])

    const countryData = useMemo(() => {
      if (!stats.country_distribution) return []
      return Object.entries(stats.country_distribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    }, [stats.country_distribution])

    const levelData = useMemo(() => {
      if (!stats.level_distribution) return []
      return Object.entries(stats.level_distribution)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }))
    }, [stats.level_distribution])

    return (
      <div className="module-content">
        {/* KPI Section */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Total membres</p>
              <p className="kpi-value">{stats.total_members || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Membres actifs</p>
              <p className="kpi-value">{stats.active_members || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">En attente</p>
              <p className="kpi-value">{stats.pending_members || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon teal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Approuvés</p>
              <p className="kpi-value">{stats.approved_members || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Taux de croissance</p>
              <p className="kpi-value">{stats.growth_rate > 0 ? '+' : ''}{stats.growth_rate?.toFixed(1) || '0.0'}%</p>
              <p className="card-subtitle">Ce mois vs mois précédent</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon yellow">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Rejetés</p>
              <p className="kpi-value">{stats.rejected_members || 0}</p>
            </div>
          </div>
        </section>

        {/* Analytics Section */}
        <section className="treasury-analytics">
          <div className="analytics-card">
            <h3>Évolution mensuelle des adhésions</h3>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="empty-state small">
                <p>Aucune donnée disponible</p>
              </div>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '20px' }}>
                {(() => {
                  const maxTotal = Math.max(...monthlyData.map(m => m.total || 0), 1)
                  return monthlyData.slice(-12).map((item, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '200px', gap: '2px' }}>
                        <div style={{ height: `${((item.approved || 0) / maxTotal) * 100}%`, background: '#4ade80', borderRadius: '4px 4px 0 0', minHeight: item.approved > 0 ? '2px' : '0' }} title={`Approuvés: ${item.approved}`}></div>
                        <div style={{ height: `${((item.pending || 0) / maxTotal) * 100}%`, background: '#f97316', borderRadius: '0', minHeight: item.pending > 0 ? '2px' : '0' }} title={`En attente: ${item.pending}`}></div>
                        <div style={{ height: `${((item.rejected || 0) / maxTotal) * 100}%`, background: '#ef4444', borderRadius: '0 0 4px 4px', minHeight: item.rejected > 0 ? '2px' : '0' }} title={`Rejetés: ${item.rejected}`}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{item.label}</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>

          <div className="analytics-card">
            <h3>Répartition par pays</h3>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
              </div>
            ) : countryData.length === 0 ? (
              <div className="empty-state small">
                <p>Aucune donnée disponible</p>
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {countryData.slice(0, 8).map((item, idx) => {
                    const total = countryData.reduce((sum, c) => sum + c.value, 0)
                    const percentage = ((item.value / total) * 100).toFixed(1)
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{item.name}</span>
                          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{item.value} ({percentage}%)</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percentage}%`, background: '#38bdf8', transition: 'width 0.3s' }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="module-toolbar">
          <div className="toolbar-filters">
            <div className="filter-item">
              <label>Recherche</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Nom, email, numéro..."
              />
            </div>
            <div className="filter-item">
              <label>Statut</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">Tous</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>
            <div className="filter-item">
              <label>Pays</label>
              <input
                type="text"
                value={filters.pays}
                onChange={(e) => setFilters({ ...filters, pays: e.target.value })}
                placeholder="Filtrer par pays..."
              />
            </div>
            <button className="btn-secondary" onClick={() => setFilters({ search: '', status: '', pays: '' })}>
              Réinitialiser
            </button>
          </div>
        </section>

        {/* Pending Members Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Adhésions en attente de validation</h3>
                <p className="card-subtitle">{pendingMembers.length} demande{pendingMembers.length !== 1 ? 's' : ''} en attente</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement...</p>
              </div>
            ) : pendingMembers.length === 0 ? (
              <div className="empty-state">
                <p>Aucune adhésion en attente</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Pays</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMembers.map((membre) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  // Composant pour le contenu Trésorerie
  const TresorerieContent = () => {
    const [cotisationsData, setCotisationsData] = useState([])
    const [paiementsData, setPaiementsData] = useState([])
    const [depensesData, setDepensesData] = useState([])
    const [historique, setHistorique] = useState([])
    const [relances, setRelances] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(null) // 'cotisation', 'paiement', 'relance', 'carte'
    const [editingPaiement, setEditingPaiement] = useState(null) // Paiement en cours d'édition
    const [members, setMembers] = useState([])
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [cotisationTarif, setCotisationTarif] = useState({ amount: null, currency: '' })
    const [carteTarif, setCarteTarif] = useState({ amount: null, currency: '' })
    const [filters, setFilters] = useState(TREASURY_FILTERS_DEFAULT)
    const [exporting, setExporting] = useState(false)
    const timelineRef = useRef(null)
    const [selectedRelanceMembers, setSelectedRelanceMembers] = useState([])
    const [relanceSearch, setRelanceSearch] = useState('')

    const determineTarifForCountry = (country = '') => {
      const normalized = country ? country.toLowerCase() : ''
      if (normalized.includes('senegal') || normalized.includes('sénégal')) {
        return { amount: 2000, currency: 'FCFA' }
      }
      return { amount: 10, currency: '€' }
    }

    const PAGE_SIZE = 100

    const buildCotisationParams = (page = 1) => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.periode_annee && { annee: filters.periode_annee }),
      ...(filters.periode_mois && { periode_mois: filters.periode_mois }),
      ...(filters.statutCotisation && { statut_paiement: filters.statutCotisation }),
    })

    const buildPaiementParams = (page = 1) => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.periode_mois && { periode_mois: filters.periode_mois }),
      ...(filters.periode_annee && { periode_annee: filters.periode_annee }),
      ...(filters.typePaiement && { type_paiement: filters.typePaiement }),
      ...(filters.statutPaiement && { statut: filters.statutPaiement }),
    })

    const buildDepenseParams = (page = 1) => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.statutDepense && { statut: filters.statutDepense }),
      ...(filters.periode_mois && { periode_mois: filters.periode_mois }),
      ...(filters.periode_annee && { periode_annee: filters.periode_annee }),
    })

    const fetchAllPages = async (fetchFn, builder) => {
      const aggregated = []
      let page = 1
      while (true) {
        const chunk = await fetchFn(builder(page))
        const items = Array.isArray(chunk) ? chunk : chunk?.data || []
        if (!items.length) break
        aggregated.push(...items)
        if (items.length < PAGE_SIZE) break
        page += 1
        if (page > 10) break
      }
      return aggregated
    }

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const [cotisationsResult, paiementsResult, depensesResult, historiqueData, relancesData] = await Promise.all([
          fetchAllPages(fetchCotisations, buildCotisationParams),
          fetchAllPages(fetchPaiements, buildPaiementParams),
          fetchAllPages(fetchDepenses, buildDepenseParams),
          fetchHistorique({ limit: 10 }),
          fetchRelances({ limit: 50 }),
        ])
        setCotisationsData(cotisationsResult)
        setPaiementsData(paiementsResult)
        setDepensesData(depensesResult)
        setHistorique(Array.isArray(historiqueData) ? historiqueData : [])
        setRelances(Array.isArray(relancesData) ? relancesData : [])
      } catch (err) {
        console.error('Erreur chargement trésorerie:', err)
        setCotisationsData([])
        setPaiementsData([])
        setDepensesData([])
        setHistorique([])
      } finally {
        setLoading(false)
      }
    }, [filters])

    useEffect(() => {
      loadData()
    }, [loadData])

    const loadMembers = useCallback(async () => {
      try {
        const aggregated = []
        let page = 1
        const limit = 100
        while (true) {
          const chunk = await fetchAllMembers({ page, limit })
          const items = Array.isArray(chunk) ? chunk : chunk?.data || []
          if (!items.length) break
          aggregated.push(...items)
          if (items.length < limit) break
          page += 1
          if (page > 20) break
        }
        setMembers(aggregated)
      } catch (err) {
        console.error('Erreur chargement données sélecteurs:', err)
      }
    }, [])

    useEffect(() => {
      if (showModal) {
        loadMembers()
      } else {
        setFormData({})
        setEditingPaiement(null)
        setCotisationTarif({ amount: null, currency: '' })
        setCarteTarif({ amount: null, currency: '' })
        setSelectedRelanceMembers([])
        setRelanceSearch('')
      }
    }, [showModal, loadMembers])

    useEffect(() => {
      if (showModal === 'cotisation' || (showModal === 'paiement' && !editingPaiement)) {
        const now = new Date()
        setFormData((prev) => {
          const periode_annee = prev.periode_annee || now.getFullYear()
          return {
            ...prev,
            periode_mois: prev.periode_mois || now.getMonth() + 1,
            periode_annee,
            annee: periode_annee,
            type_paiement: prev.type_paiement || 'don',
            statut: prev.statut || 'valide',
          }
        })
      }
    }, [showModal, editingPaiement])

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

    const memberQuery = filters.memberQuery.trim()
    const filteredCotisations = useMemo(
      () => filterByMemberQuery(cotisationsData, memberQuery),
      [cotisationsData, memberQuery]
    )
    const filteredPaiements = useMemo(
      () => filterByMemberQuery(paiementsData, memberQuery),
      [paiementsData, memberQuery]
    )
    const filteredDepenses = useMemo(
      () => filterByMemberQuery(depensesData, memberQuery),
      [depensesData, memberQuery]
    )
    const filteredRelanceMembers = useMemo(() => {
      const query = normalizeText(relanceSearch)
      if (!query) return members
      return members.filter((member) => {
        const label = normalizeText(`${member.prenom || ''} ${member.nom || ''} ${member.numero_membre || ''}`)
        return label.includes(query)
      })
    }, [members, relanceSearch])

    const cotisations = useMemo(() => filteredCotisations.slice(0, 10), [filteredCotisations])
    const paiements = useMemo(() => filteredPaiements.slice(0, 10), [filteredPaiements])
    const depenses = useMemo(() => filteredDepenses.slice(0, 10), [filteredDepenses])

    const analyticsData = useMemo(
      () => buildAnalyticsData(filteredCotisations, filteredPaiements, filteredDepenses),
      [filteredCotisations, filteredPaiements, filteredDepenses]
    )
    const kpis = useMemo(
      () => computeKpis(filteredCotisations, filteredPaiements, filteredDepenses),
      [filteredCotisations, filteredPaiements, filteredDepenses]
    )
    const senegalCotisations = useMemo(
      () => filteredCotisations.filter((cot) => categorizeCountry(cot.membre?.pays) === 'senegal').length,
      [filteredCotisations]
    )
    const internationalCotisations = filteredCotisations.length - senegalCotisations

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

    const handleExport = async (type = 'cotisations') => {
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

    const updateCotisationState = (updated) => {
      if (!updated) return
      setCotisationsData((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      )
    }

    const removeCotisationState = (id) => {
      setCotisationsData((prev) => prev.filter((item) => item.id !== id))
    }

    const updatePaiementState = (updated) => {
      if (!updated) return
      setPaiementsData((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
    }

    const removePaiementState = (id) => {
      setPaiementsData((prev) => prev.filter((item) => item.id !== id))
    }

    const updateDepenseState = (updated) => {
      if (!updated) return
      setDepensesData((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
    }

    const removeDepenseState = (id) => {
      setDepensesData((prev) => prev.filter((item) => item.id !== id))
    }

    const handleCotisationAction = async (cot, action) => {
      try {
        if (action === 'validate') {
          const updated = await validateCotisation(cot.id, { date_paiement: new Date().toISOString().split('T')[0] })
          updateCotisationState(updated)
        } else if (action === 'reset') {
          const updated = await resetCotisation(cot.id)
          updateCotisationState(updated)
        } else if (action === 'delete') {
          if (!window.confirm('Supprimer définitivement cette cotisation ?')) {
            return
          }
          await deleteCotisation(cot.id)
          removeCotisationState(cot.id)
        }
        await loadData()
      } catch (err) {
        alert('Action impossible : ' + err.message)
      }
    }

    const handlePaiementAction = async (paiement, action) => {
      try {
        if (action === 'edit') {
          // Pré-remplir le formulaire avec les données du paiement
          setEditingPaiement(paiement)
          setFormData({
            type_paiement: paiement.type_paiement || 'don',
            montant: paiement.montant || '',
            mode_paiement: paiement.mode_paiement || '',
            statut: paiement.statut || 'valide',
            date_paiement: paiement.date_paiement ? paiement.date_paiement.split('T')[0] : '',
            periode_mois: paiement.periode_mois || new Date().getMonth() + 1,
            periode_annee: paiement.periode_annee || new Date().getFullYear(),
            details: paiement.details || '',
          })
          setShowModal('paiement')
        } else if (action === 'validate') {
          const updated = await validatePaiement(paiement.id, { date_paiement: paiement.date_paiement || new Date().toISOString().split('T')[0] })
          updatePaiementState(updated)
        } else if (action === 'cancel') {
          const reason = window.prompt('Raison de l\'annulation ?', '')
          const updated = await cancelPaiement(paiement.id, { reason: reason || '' })
          updatePaiementState(updated)
        } else if (action === 'delete') {
          if (!window.confirm('Supprimer définitivement ce paiement ?')) {
            return
          }
          await deletePaiement(paiement.id)
          removePaiementState(paiement.id)
        }
        if (action !== 'edit') {
          await loadData()
        }
      } catch (err) {
        alert('Action impossible : ' + err.message)
      }
    }

    const handleDepenseAction = async (depense, action) => {
      try {
        if (action === 'validate') {
          const updated = await validateDepense(depense.id)
          updateDepenseState(updated)
        } else if (action === 'reject') {
          const reason = window.prompt('Motif du rejet ?', '')
          const updated = await rejectDepense(depense.id, { reason: reason || '' })
          updateDepenseState(updated)
        } else if (action === 'delete') {
          if (!window.confirm('Supprimer définitivement cette dépense ?')) {
            return
          }
          await deleteDepense(depense.id)
          removeDepenseState(depense.id)
        }
        await loadData()
      } catch (err) {
        alert('Action impossible : ' + err.message)
      }
    }

    const scrollToTimeline = () => {
      if (timelineRef.current) {
        timelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'cotisation') {
          const payload = {
            ...formData,
            annee: formData.periode_annee || formData.annee || new Date().getFullYear(),
          }
          await createCotisation(payload)
          alert('Cotisation créée avec succès !')
        } else if (showModal === 'paiement') {
          const payload = {
            ...formData,
            membre_id: null,
          }
          if (editingPaiement) {
            // Mise à jour d'un paiement existant
            await updatePaiement(editingPaiement.id, payload)
            alert('Paiement modifié avec succès !')
            setEditingPaiement(null)
          } else {
            // Création d'un nouveau paiement
            await createPaiement(payload)
            alert('Paiement créé avec succès !')
          }
        } else if (showModal === 'relance') {
          if (!selectedRelanceMembers.length) {
            alert('Veuillez sélectionner au moins un membre.')
            setSubmitting(false)
            return
          }
          await Promise.all(
            selectedRelanceMembers.map((memberId) =>
              createRelance({
                ...formData,
                membre_id: memberId,
              })
            )
          )
          alert('Relances créées avec succès !')
        } else if (showModal === 'carte') {
          await createCarteMembre(formData)
          alert('Carte membre créée avec succès !')
        } else if (showModal === 'depense') {
          await createDepense(formData)
          alert('Dépense créée avec succès !')
        }
        setShowModal(null)
        setFormData({})
        setEditingPaiement(null)
        setSelectedRelanceMembers([])
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
        <TreasuryFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          monthOptions={MONTH_OPTIONS}
        />
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations totales</p>
              <p className="kpi-value">{kpis.total_cotisations}</p>
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
              <p className="kpi-value">{kpis.cotisations_payees}</p>
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
              <p className="kpi-value">{kpis.cotisations_en_attente}</p>
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
              <p className="kpi-value">{kpis.montant_total_eur.toFixed(2)} €</p>
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
              <p className="kpi-value">{kpis.montant_senegal_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{senegalCotisations} cotisations</p>
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
              <p className="kpi-value">{kpis.montant_international_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{internationalCotisations} cotisations</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon slate">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0 0H6m6 0h6M6 12h12" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Dons & subventions (EUR)</p>
              <p className="kpi-value">{kpis.total_paiements_dons_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{kpis.paiements_dons_count} paiements</p>
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
              <p className="kpi-value">{kpis.depenses_validees_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{kpis.depenses_validees} dépenses</p>
            </div>
          </div>
        </section>
        <TreasuryActionsBar
          exporting={exporting}
          onExportCsv={handleExport}
          onExportPdf={handleReportDownload}
          onScrollTimeline={scrollToTimeline}
        />
        <TreasuryAnalytics trendsData={analyticsData.trends} distributionData={analyticsData.distribution} />
        <TreasuryTimeline ref={timelineRef} data={analyticsData.timeline} loading={loading} />

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
                  + Ajouter don/subvention
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
                  {showModal === 'paiement' && (editingPaiement ? 'Modifier don/subvention' : 'Ajouter don/subvention')}
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
                            setFormData({
                              ...formData,
                              periode_annee: isNaN(value) ? '' : value,
                              annee: isNaN(value) ? '' : value,
                            })
                          }}
                          placeholder="Année"
                        />
          </div>
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
                    <p className="form-hint">
                      Ces paiements correspondent aux dons ou subventions reçus par l’association. Aucun membre n’est associé.
                    </p>
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
                        value={formData.type_paiement || 'don'}
                        onChange={(e) => setFormData({ ...formData, type_paiement: e.target.value })}
                      >
                        <option value="don">Don</option>
                        <option value="subvention">Subvention</option>
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
                    <div className="form-group">
                      <label>Description / Source *</label>
                      <textarea
                        required
                        value={formData.details || ''}
                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        rows="3"
                        placeholder="Ex : Don entreprise X, Subvention ministère..."
                      />
                    </div>
                  </>
                )}

                {showModal === 'relance' && (
                  <>
                    <div className="form-group">
                      <label>Membres concernés *</label>
                      <input
                        type="text"
                        placeholder="Filtrer..."
                        value={relanceSearch}
                        onChange={(e) => setRelanceSearch(e.target.value)}
                      />
                      <div className="multi-select-list">
                        {filteredRelanceMembers.map((membre) => (
                          <label key={membre.id} className="multi-select-item">
                            <input
                              type="checkbox"
                              checked={selectedRelanceMembers.includes(membre.id)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedRelanceMembers((prev) =>
                                  checked ? [...prev, membre.id] : prev.filter((id) => id !== membre.id)
                                )
                              }}
                            />
                            <span>
                              {membre.prenom} {membre.nom} ({membre.numero_membre})
              </span>
                          </label>
                        ))}
                        {filteredRelanceMembers.length === 0 && (
                          <p className="form-hint">Aucun membre ne correspond à votre recherche.</p>
                        )}
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

  // Composant pour le contenu Formations
  const FormationsContent = () => {
    const [stats, setStats] = useState({})
    const [formations, setFormations] = useState([])
    const [sessions, setSessions] = useState([])
    const [inscriptions, setInscriptions] = useState([])
    const [formateurs, setFormateurs] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(null) // 'formation', 'session', 'inscription', 'formateur'
    const [formData, setFormData] = useState({})
    const [editingId, setEditingId] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [filters, setFilters] = useState({ search: '', categorie: '', statut: '' })

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const [statsData, formationsData, sessionsData, inscriptionsData, formateursData] = await Promise.all([
          fetchFormationStats(),
          fetchFormations({ page: 1, limit: 50 }),
          fetchSessions({ page: 1, limit: 50 }),
          fetchInscriptions({ page: 1, limit: 50 }),
          fetchFormateurs(),
        ])
        setStats(statsData || {})
        setFormations(Array.isArray(formationsData) ? formationsData : [])
        setSessions(Array.isArray(sessionsData) ? sessionsData : [])
        setInscriptions(Array.isArray(inscriptionsData) ? inscriptionsData : [])
        setFormateurs(Array.isArray(formateursData) ? formateursData : [])
      } catch (err) {
        console.error('Erreur chargement formations:', err)
        setStats({})
        setFormations([])
        setSessions([])
        setInscriptions([])
        setFormateurs([])
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      loadData()
    }, [loadData])

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'formation') {
          if (editingId) {
            await updateFormation(editingId, formData)
            alert('Formation mise à jour avec succès !')
          } else {
            await createFormation(formData)
            alert('Formation créée avec succès !')
          }
        } else if (showModal === 'session') {
          if (editingId) {
            await updateSession(editingId, formData)
            alert('Session mise à jour avec succès !')
          } else {
            await createSession(formData)
            alert('Session créée avec succès !')
          }
        } else if (showModal === 'inscription') {
          if (editingId) {
            await updateInscription(editingId, formData)
            alert('Inscription mise à jour avec succès !')
          } else {
            await createInscription(formData)
            alert('Inscription créée avec succès !')
          }
        } else if (showModal === 'formateur') {
          if (editingId) {
            await updateFormateur(editingId, formData)
            alert('Formateur mis à jour avec succès !')
          } else {
            await createFormateur(formData)
            alert('Formateur créé avec succès !')
          }
        }
        setShowModal(null)
        setFormData({})
        setEditingId(null)
        await loadData()
      } catch (err) {
        alert(err.message || 'Erreur lors de l\'opération')
      } finally {
        setSubmitting(false)
      }
    }

    const handleDelete = async (type, id) => {
      if (!window.confirm(`Supprimer définitivement cet élément ?`)) return
      try {
        if (type === 'formation') await deleteFormation(id)
        else if (type === 'session') await deleteSession(id)
        else if (type === 'inscription') await deleteInscription(id)
        else if (type === 'formateur') await deleteFormateur(id)
        alert('Élément supprimé avec succès !')
        await loadData()
      } catch (err) {
        alert(err.message || 'Erreur lors de la suppression')
      }
    }

    const handleConfirmInscription = async (id) => {
      try {
        await confirmInscription(id)
        alert('Inscription confirmée avec succès !')
        await loadData()
      } catch (err) {
        alert(err.message || 'Erreur lors de la confirmation')
      }
    }

    const handleRejectInscription = async (id) => {
      try {
        await rejectInscription(id)
        alert('Inscription rejetée avec succès !')
        await loadData()
      } catch (err) {
        alert(err.message || 'Erreur lors du rejet')
      }
    }

    useEffect(() => {
      if (!showModal) {
        setFormData({})
        setEditingId(null)
      }
    }, [showModal])

    if (loading) {
      return <div className="module-content"><p>Chargement...</p></div>
    }

    return (
      <div className="module-content">
        {/* KPI Section */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Formations actives</p>
              <p className="kpi-value">{stats.total_formations || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Inscriptions totales</p>
              <p className="kpi-value">{stats.total_inscriptions || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Inscriptions confirmées</p>
              <p className="kpi-value">{stats.confirmed_inscriptions || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon yellow">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">En attente</p>
              <p className="kpi-value">{stats.pending_inscriptions || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Sessions à venir</p>
              <p className="kpi-value">{stats.upcoming_sessions || 0}</p>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="module-toolbar">
          <div className="toolbar-filters">
            <input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="filter-input"
            />
            <select
              value={filters.categorie}
              onChange={(e) => setFilters({ ...filters, categorie: e.target.value })}
              className="filter-select"
            >
              <option value="">Toutes les catégories</option>
              {Object.keys(stats.categories || {}).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => { setShowModal('formation'); setEditingId(null); setFormData({}) }}>
              + Ajouter Formation
            </button>
            <button className="btn-primary" onClick={() => { setShowModal('session'); setEditingId(null); setFormData({}) }}>
              + Ajouter Session
            </button>
            <button className="btn-primary" onClick={() => { setShowModal('inscription'); setEditingId(null); setFormData({}) }}>
              + Ajouter Inscription
            </button>
            <button className="btn-primary" onClick={() => { setShowModal('formateur'); setEditingId(null); setFormData({}) }}>
              + Ajouter Formateur
            </button>
          </div>
        </section>

        {/* Formations Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Formations</h3>
                <p className="card-subtitle">{formations.length} formation{formations.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Catégorie</th>
                    <th>Mode</th>
                    <th>Inscriptions</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formations.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Aucune formation</td>
                    </tr>
                  ) : (
                    formations.map((formation) => (
                      <tr key={formation.id}>
                        <td>{formation.titre || '—'}</td>
                        <td>{formation.categorie || '—'}</td>
                        <td>{formation.mode || '—'}</td>
                        <td>{formation.inscriptions_count || 0} / {formation.participants_max || '∞'}</td>
                        <td>
                          <span className={`status-badge ${formation.is_active ? 'approved' : 'rejected'}`}>
                            {formation.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="btn-link" onClick={() => { setShowModal('formation'); setEditingId(formation.id); setFormData(formation) }}>
                              Modifier
                            </button>
                            <button type="button" className="btn-link danger" onClick={() => handleDelete('formation', formation.id)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Sessions Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Sessions</h3>
                <p className="card-subtitle">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Formation</th>
                    <th>Date début</th>
                    <th>Date fin</th>
                    <th>Capacité</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Aucune session</td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.formation?.titre || '—'}</td>
                        <td>{session.date_debut ? new Date(session.date_debut).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>{session.date_fin ? new Date(session.date_fin).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>{session.inscriptions_count || 0} / {session.capacite_max || '∞'}</td>
                        <td>
                          <span className={`status-badge ${session.statut === 'ouverte' ? 'approved' : 'pending'}`}>
                            {session.statut || '—'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="btn-link" onClick={() => { setShowModal('session'); setEditingId(session.id); setFormData(session) }}>
                              Modifier
                            </button>
                            <button type="button" className="btn-link danger" onClick={() => handleDelete('session', session.id)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Inscriptions Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Inscriptions</h3>
                <p className="card-subtitle">{inscriptions.length} inscription{inscriptions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Formation</th>
                    <th>Niveau</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Aucune inscription</td>
                    </tr>
                  ) : (
                    inscriptions.map((inscription) => (
                      <tr key={inscription.id}>
                        <td>{inscription.prenom} {inscription.nom}</td>
                        <td>{inscription.email || '—'}</td>
                        <td>{inscription.formation?.titre || '—'}</td>
                        <td>{inscription.niveau || '—'}</td>
                        <td>
                          <span className={`status-badge ${inscription.status === 'confirmed' ? 'approved' : inscription.status === 'pending' ? 'pending' : 'rejected'}`}>
                            {inscription.status || '—'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            {inscription.status === 'pending' && (
                              <>
                                <button type="button" className="btn-link" onClick={() => handleConfirmInscription(inscription.id)}>
                                  Confirmer
                                </button>
                                <button type="button" className="btn-link danger" onClick={() => handleRejectInscription(inscription.id)}>
                                  Rejeter
                                </button>
                              </>
                            )}
                            <button type="button" className="btn-link" onClick={() => { setShowModal('inscription'); setEditingId(inscription.id); setFormData(inscription) }}>
                              Modifier
                            </button>
                            <button type="button" className="btn-link danger" onClick={() => handleDelete('inscription', inscription.id)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Modals */}
        {showModal && typeof document !== 'undefined' && createPortal(
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showModal === 'formation' && (editingId ? 'Modifier Formation' : 'Ajouter Formation')}
                  {showModal === 'session' && (editingId ? 'Modifier Session' : 'Ajouter Session')}
                  {showModal === 'inscription' && (editingId ? 'Modifier Inscription' : 'Ajouter Inscription')}
                  {showModal === 'formateur' && (editingId ? 'Modifier Formateur' : 'Ajouter Formateur')}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(null)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {showModal === 'formation' && (
                  <>
                    <div className="form-group">
                      <label>Slug *</label>
                      <input type="text" required value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Titre *</label>
                      <input type="text" required value={formData.titre || ''} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Catégorie *</label>
                      <input type="text" required value={formData.categorie || ''} onChange={(e) => setFormData({ ...formData, categorie: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Mode</label>
                      <input type="text" value={formData.mode || ''} onChange={(e) => setFormData({ ...formData, mode: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Participants max</label>
                      <input type="number" value={formData.participants_max || ''} onChange={(e) => setFormData({ ...formData, participants_max: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Prix</label>
                      <input type="number" step="0.01" value={formData.prix || ''} onChange={(e) => setFormData({ ...formData, prix: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Formateur</label>
                      <select value={formData.formateur_id || ''} onChange={(e) => setFormData({ ...formData, formateur_id: e.target.value || null })}>
                        <option value="">Aucun</option>
                        {formateurs.map((f) => (
                          <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Active</label>
                      <input type="checkbox" checked={formData.is_active !== false} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                    </div>
                  </>
                )}

                {showModal === 'session' && (
                  <>
                    <div className="form-group">
                      <label>Formation *</label>
                      <select required value={formData.formation_id || ''} onChange={(e) => setFormData({ ...formData, formation_id: e.target.value })}>
                        <option value="">Sélectionner...</option>
                        {formations.map((f) => (
                          <option key={f.id} value={f.id}>{f.titre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date début *</label>
                      <input type="date" required value={formData.date_debut || ''} onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Date fin</label>
                      <input type="date" value={formData.date_fin || ''} onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Capacité max</label>
                      <input type="number" value={formData.capacite_max || ''} onChange={(e) => setFormData({ ...formData, capacite_max: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select value={formData.statut || 'ouverte'} onChange={(e) => setFormData({ ...formData, statut: e.target.value })}>
                        <option value="ouverte">Ouverte</option>
                        <option value="fermee">Fermée</option>
                        <option value="terminee">Terminée</option>
                      </select>
                    </div>
                  </>
                )}

                {showModal === 'inscription' && (
                  <>
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input type="text" required value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Nom *</label>
                      <input type="text" required value={formData.nom || ''} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Formation *</label>
                      <select required value={formData.formation_id || ''} onChange={(e) => setFormData({ ...formData, formation_id: e.target.value })}>
                        <option value="">Sélectionner...</option>
                        {formations.map((f) => (
                          <option key={f.id} value={f.id}>{f.titre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Session</label>
                      <select value={formData.session_id || ''} onChange={(e) => setFormData({ ...formData, session_id: e.target.value || null })}>
                        <option value="">Aucune</option>
                        {sessions.filter(s => s.formation_id === formData.formation_id).map((s) => (
                          <option key={s.id} value={s.id}>{new Date(s.date_debut).toLocaleDateString('fr-FR')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Niveau *</label>
                      <select required value={formData.niveau || ''} onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}>
                        <option value="">Sélectionner...</option>
                        <option value="Débutant">Débutant</option>
                        <option value="Intermédiaire">Intermédiaire</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select value={formData.status || 'pending'} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmée</option>
                        <option value="cancelled">Annulée</option>
                      </select>
                    </div>
                  </>
                )}

                {showModal === 'formateur' && (
                  <>
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input type="text" required value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Nom *</label>
                      <input type="text" required value={formData.nom || ''} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Photo URL</label>
                      <input type="url" value={formData.photo_url || ''} onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Biographie</label>
                      <textarea value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows="3" />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'En cours...' : editingId ? 'Mettre à jour' : 'Créer'}
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

  // Composant pour le contenu Webinaires
  const WebinairesContent = () => {
    const [stats, setStats] = useState({})
    const [webinaires, setWebinaires] = useState([])
    const [inscriptions, setInscriptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(null) // 'webinaire', 'inscription', 'presentateur'
    const [formData, setFormData] = useState({})
    const [editingId, setEditingId] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [filters, setFilters] = useState({ search: '', theme: '', statut: '' })
    const [selectedWebinaire, setSelectedWebinaire] = useState(null)
    const [presentateurs, setPresentateurs] = useState([])

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const [statsData, webinairesData, inscriptionsData] = await Promise.all([
          fetchWebinaireStats(),
          fetchWebinaires({ page: 1, limit: 50 }),
          fetchWebinaireInscriptions({ page: 1, limit: 50 }),
        ])
        setStats(statsData || {})
        setWebinaires(Array.isArray(webinairesData) ? webinairesData : [])
        setInscriptions(Array.isArray(inscriptionsData) ? inscriptionsData : [])
      } catch (err) {
        console.error('Erreur chargement webinaires:', err)
        setStats({})
        setWebinaires([])
        setInscriptions([])
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      loadData()
    }, [loadData])

    const loadPresentateurs = useCallback(async (webinaireId) => {
      try {
        const data = await fetchPresentateurs(webinaireId)
        setPresentateurs(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erreur chargement présentateurs:', err)
        setPresentateurs([])
      }
    }, [])

    useEffect(() => {
      if (selectedWebinaire) {
        loadPresentateurs(selectedWebinaire)
      }
    }, [selectedWebinaire, loadPresentateurs])

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'webinaire') {
          if (editingId) {
            await updateWebinaire(editingId, formData)
            alert('Webinaire mis à jour avec succès !')
          } else {
            await createWebinaire(formData)
            alert('Webinaire créé avec succès !')
          }
        } else if (showModal === 'inscription') {
          if (editingId) {
            await updateWebinaireInscription(editingId, formData)
            alert('Inscription mise à jour avec succès !')
          } else {
            await createWebinaireInscription(formData)
            alert('Inscription créée avec succès !')
          }
        } else if (showModal === 'presentateur') {
          if (editingId) {
            await updatePresentateur(editingId, formData)
            alert('Présentateur mis à jour avec succès !')
          } else {
            await createPresentateur(formData)
            alert('Présentateur créé avec succès !')
          }
          if (selectedWebinaire) {
            await loadPresentateurs(selectedWebinaire)
          }
        }
        setShowModal(null)
        setFormData({})
        setEditingId(null)
        await loadData()
      } catch (err) {
        alert(err.message || 'Erreur lors de l\'opération')
      } finally {
        setSubmitting(false)
      }
    }

    const handleDelete = async (type, id) => {
      if (!window.confirm(`Supprimer définitivement cet élément ?`)) return
      try {
        if (type === 'webinaire') await deleteWebinaire(id)
        else if (type === 'inscription') await deleteWebinaireInscription(id)
        else if (type === 'presentateur') {
          await deletePresentateur(id)
          if (selectedWebinaire) {
            await loadPresentateurs(selectedWebinaire)
          }
        }
        alert('Élément supprimé avec succès !')
        await loadData()
      } catch (err) {
        alert(err.message || 'Erreur lors de la suppression')
      }
    }

    useEffect(() => {
      if (!showModal) {
        setFormData({})
        setEditingId(null)
      }
    }, [showModal])

    if (loading) {
      return <div className="module-content"><p>Chargement...</p></div>
    }

    return (
      <div className="module-content">
        {/* KPI Section */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Webinaires programmés</p>
              <p className="kpi-value">{stats.total_webinaires || 0}</p>
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
              <p className="kpi-value">{stats.upcoming_webinaires || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Inscriptions totales</p>
              <p className="kpi-value">{stats.total_inscriptions || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Taux moyen participation</p>
              <p className="kpi-value">{stats.taux_moyen_participation || 0}%</p>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="module-toolbar">
          <div className="toolbar-filters">
            <input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="filter-input"
            />
            <select
              value={filters.theme}
              onChange={(e) => setFilters({ ...filters, theme: e.target.value })}
              className="filter-select"
            >
              <option value="">Tous les thèmes</option>
              {Object.keys(stats.themes || {}).map((theme) => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => { setShowModal('webinaire'); setEditingId(null); setFormData({}) }}>
              + Ajouter Webinaire
            </button>
            <button className="btn-primary" onClick={() => { setShowModal('inscription'); setEditingId(null); setFormData({}) }}>
              + Ajouter Inscription
            </button>
          </div>
        </section>

        {/* Webinaires Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
                  <div>
                <h3 className="card-title">Webinaires</h3>
                <p className="card-subtitle">{webinaires.length} webinaire{webinaires.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Thème</th>
                    <th>Date</th>
                    <th>Heure</th>
                    <th>Inscriptions</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webinaires.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Aucun webinaire</td>
                    </tr>
                  ) : (
                    webinaires.map((webinaire) => (
                      <tr key={webinaire.id}>
                        <td>{webinaire.titre || '—'}</td>
                        <td>{webinaire.theme || '—'}</td>
                        <td>{webinaire.date_webinaire ? new Date(webinaire.date_webinaire).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>{webinaire.heure_debut || '—'}</td>
                        <td>{webinaire.inscriptions_count || 0} / {webinaire.capacite_max || '∞'}</td>
                        <td>
                          <span className={`status-badge ${webinaire.is_active ? 'approved' : 'rejected'}`}>
                            {webinaire.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="btn-link" onClick={() => { setSelectedWebinaire(webinaire.id); setShowModal('presentateur'); setEditingId(null); setFormData({ webinaire_id: webinaire.id }) }}>
                              Présentateurs
                            </button>
                            <button type="button" className="btn-link" onClick={() => { setShowModal('webinaire'); setEditingId(webinaire.id); setFormData(webinaire) }}>
                              Modifier
                            </button>
                            <button type="button" className="btn-link danger" onClick={() => handleDelete('webinaire', webinaire.id)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Inscriptions Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Inscriptions</h3>
                <p className="card-subtitle">{inscriptions.length} inscription{inscriptions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Pays</th>
                    <th>Webinaire</th>
                    <th>Membre</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Aucune inscription</td>
                    </tr>
                  ) : (
                    inscriptions.map((inscription) => (
                      <tr key={inscription.id}>
                        <td>{inscription.prenom} {inscription.nom}</td>
                        <td>{inscription.email || '—'}</td>
                        <td>{inscription.pays || '—'}</td>
                        <td>{inscription.webinaire?.titre || '—'}</td>
                        <td>{inscription.membre ? 'Oui' : 'Non'}</td>
                        <td>
                          <span className={`status-badge ${inscription.statut === 'confirmed' ? 'approved' : inscription.statut === 'pending' ? 'pending' : 'rejected'}`}>
                            {inscription.statut || '—'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="btn-link" onClick={() => { setShowModal('inscription'); setEditingId(inscription.id); setFormData(inscription) }}>
                              Modifier
                            </button>
                            <button type="button" className="btn-link danger" onClick={() => handleDelete('inscription', inscription.id)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Modals */}
        {showModal && typeof document !== 'undefined' && createPortal(
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showModal === 'webinaire' && (editingId ? 'Modifier Webinaire' : 'Ajouter Webinaire')}
                  {showModal === 'inscription' && (editingId ? 'Modifier Inscription' : 'Ajouter Inscription')}
                  {showModal === 'presentateur' && (editingId ? 'Modifier Présentateur' : 'Ajouter Présentateur')}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(null)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {showModal === 'webinaire' && (
                  <>
                    <div className="form-group">
                      <label>Slug *</label>
                      <input type="text" required value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Titre *</label>
                      <input type="text" required value={formData.titre || ''} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Thème *</label>
                      <input type="text" required value={formData.theme || ''} onChange={(e) => setFormData({ ...formData, theme: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Date webinaire *</label>
                      <input type="date" required value={formData.date_webinaire || ''} onChange={(e) => setFormData({ ...formData, date_webinaire: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Heure début *</label>
                      <input type="time" required value={formData.heure_debut || ''} onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Heure fin</label>
                      <input type="time" value={formData.heure_fin || ''} onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Mode</label>
                      <input type="text" value={formData.mode || 'En ligne'} onChange={(e) => setFormData({ ...formData, mode: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Lien webinaire</label>
                      <input type="url" value={formData.lien_webinaire || ''} onChange={(e) => setFormData({ ...formData, lien_webinaire: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Capacité max</label>
                      <input type="number" value={formData.capacite_max || ''} onChange={(e) => setFormData({ ...formData, capacite_max: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Active</label>
                      <input type="checkbox" checked={formData.is_active !== false} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                    </div>
                  </>
                )}

                {showModal === 'inscription' && (
                  <>
                    <div className="form-group">
                      <label>Webinaire *</label>
                      <select required value={formData.webinaire_id || ''} onChange={(e) => setFormData({ ...formData, webinaire_id: e.target.value })}>
                        <option value="">Sélectionner...</option>
                        {webinaires.map((w) => (
                          <option key={w.id} value={w.id}>{w.titre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input type="text" required value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Nom *</label>
                      <input type="text" required value={formData.nom || ''} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Pays</label>
                      <input type="text" value={formData.pays || 'France'} onChange={(e) => setFormData({ ...formData, pays: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>WhatsApp</label>
                      <input type="text" value={formData.whatsapp || ''} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select value={formData.statut || 'pending'} onChange={(e) => setFormData({ ...formData, statut: e.target.value })}>
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmée</option>
                        <option value="cancelled">Annulée</option>
                      </select>
                    </div>
                  </>
                )}

                {showModal === 'presentateur' && (
                  <>
                    <div className="form-group">
                      <label>Webinaire *</label>
                      <select required value={formData.webinaire_id || selectedWebinaire || ''} onChange={(e) => setFormData({ ...formData, webinaire_id: e.target.value })} disabled={!!selectedWebinaire}>
                        <option value="">Sélectionner...</option>
                        {webinaires.map((w) => (
                          <option key={w.id} value={w.id}>{w.titre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input type="text" required value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Nom *</label>
                      <input type="text" required value={formData.nom || ''} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Biographie</label>
                      <textarea value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows="3" />
                    </div>
                    <div className="form-group">
                      <label>Photo URL</label>
                      <input type="url" value={formData.photo_url || ''} onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>LinkedIn</label>
                      <input type="url" value={formData.linkedin || ''} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'En cours...' : editingId ? 'Mettre à jour' : 'Créer'}
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
                  {admin?.is_master
                    ? 'Superadmin global'
                    : admin?.role_type === 'superadmin'
                      ? 'Superadmin'
                      : 'Admin'}
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
          {activeModule === 'members' && <MembersContent />}
          {activeModule === 'adhesions' && <AdhesionContent />}
          {activeModule === 'formations' && <FormationsContent />}
          {activeModule === 'webinaires' && <WebinairesContent />}
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

export default AdminDashboard
