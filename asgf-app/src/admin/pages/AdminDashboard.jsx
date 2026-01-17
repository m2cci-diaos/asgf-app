// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { useOutletContext } from "react-router-dom"
import { updateLastActivity, getStoredActiveModule, setStoredActiveModule } from "../utils/auth"
import {
  fetchPendingMembers,
  approveMember,
  rejectMember,
  updateMember,
  deleteMember,
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
  closeRelation,
  fetchObjectifsByRelation,
  fetchRendezVousByRelation,
  fetchCotisations,
  createCotisation,
  fetchPaiements,
  createPaiement,
  updatePaiement,
  createRelance,
  generateMonthlyCotisations,
  updateOverdueCotisations,
  cleanDuplicateCotisations,
  createMissingCotisations,
  createCarteMembre,
  geocodeMemberAddress,
  fetchCarteMembreByNumero,
  listCartesMembres,
  updateCarteMembre,
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
  fetchTresorerieStats,
  fetchReunions,
  createReunion,
  addParticipant,
  createAction,
  saveCompteRendu,
  createDocument,
  fetchGroupesTravail,
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
  toggleFormationInscriptions,
  fetchWebinaireStats,
  fetchAllDashboardStats,
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
  sendInscriptionInvitation,
  sendPendingInscriptionsEmails,
  sendSessionReminder,
  sendWebinaireInscriptionInvitation,
  sendWebinaireReminder,
  sendMemberEmails,
} from "../services/api"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import L from "leaflet"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import {
  exportFormationsToExcel,
  exportInscriptionsToExcel,
  exportFormationsToPDF,
  exportFormateursToExcel
} from "../utils/formationExports"
import {
  exportMembersToExcel,
  exportMembersToPDF
} from "../utils/memberExports"
import StudioContent from "../components/StudioContent"
import CarteMembreGenerator from "../components/CarteMembreGenerator"
import SecretariatDashboard from "./SecretariatDashboard"
import RecrutementDashboard from "./RecrutementDashboard"
import AuditLogContent from "../components/AuditLogContent"
import CalendarContent from "../components/CalendarContent"
import ProjetsContent from "../components/ProjetsContent"
import RelationDrawer from "../components/mentorat/RelationDrawer"
import "leaflet/dist/leaflet.css"
import AdminSettingsPanel from "../components/AdminSettingsPanel"
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

function AdminDashboard({ admin: adminProp, onLogout: onLogoutProp }) {
  const outletContext = typeof useOutletContext === "function" ? useOutletContext() : {}
  const admin = adminProp || outletContext?.admin || null
  const onLogout = onLogoutProp || outletContext?.onLogout || (() => {})
  const [pendingMembers, setPendingMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeModule, setActiveModule] = useState(() => {
    // Restaurer le module actif depuis localStorage
    return getStoredActiveModule()
  })
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })
  const [accessDeniedInfo, setAccessDeniedInfo] = useState(null)

  const MODULE_PERMISSION_KEYS = useMemo(
    () => ({
      dashboard: null,
      adhesions: 'adhesion',
      members: 'adhesion', // Dépend de adhesion
      formations: 'formation',
      webinaires: 'webinaire',
      studio: 'secretariat', // Dépend de secretariat
      mentorat: 'mentorat',
      recrutement: 'recrutement',
      tresorerie: 'tresorerie',
      secretariat: 'secretariat',
      projets: 'projets',
      calendar: null, // Accessible à tous
      settings: '__settings__',
    }),
    []
  )

  // Définir les dépendances entre modules
  // Si un admin a accès au module parent, il a automatiquement accès au module enfant
  const MODULE_DEPENDENCIES = useMemo(
    () => ({
      members: ['adhesion'], // members dépend de adhesion
      studio: ['secretariat'], // studio dépend de secretariat
      // Le secrétariat a besoin d'accéder aux membres pour ajouter des participants
      // Cette dépendance est gérée côté backend dans requireModule
    }),
    []
  )

  // Fonction pour vérifier si un admin peut accéder à un module (y compris via dépendances)
  const hasModuleAccess = useCallback(
    (moduleKey) => {
      if (!moduleKey) return true
      if (admin?.is_master) return true
      
      const grantedModules = Array.isArray(admin?.modules) ? admin.modules : []
      
      // Vérifier l'accès direct
      if (grantedModules.includes(moduleKey)) return true
      
      // Vérifier les dépendances inverses : si secretariat a besoin de adhesion
      // et que l'admin a secretariat, il peut accéder à adhesion pour certaines opérations
      if (moduleKey === 'adhesion') {
        // Si l'admin a accès à secretariat, il peut lire les membres pour ajouter des participants
        if (grantedModules.includes('secretariat')) return true
      }
      
      // Pour les superadmins scoped
      if (admin?.role_type === 'superadmin') {
        const scopeList = Array.isArray(admin?.super_scope) ? admin.super_scope : []
        if (scopeList.length === 0 || scopeList.includes(moduleKey)) return true
        // Vérifier aussi les dépendances inverses pour superadmins
        if (moduleKey === 'adhesion' && (scopeList.length === 0 || scopeList.includes('secretariat'))) {
          return true
        }
      }
      
      return false
    },
    [admin]
  )

  const MODULE_LABELS = useMemo(
    () => ({
      dashboard: 'Tableau de bord',
      audit: 'Historique',
      calendar: 'Calendrier',
      adhesions: 'Adhésions',
      members: 'Membres',
      formations: 'Formations',
      webinaires: 'Webinaires',
      studio: 'Studio',
      mentorat: 'Mentorat',
      recrutement: 'Recrutement',
      tresorerie: 'Trésorerie',
      secretariat: 'Secrétariat',
      projets: 'Projets',
      settings: 'Paramètres',
    }),
    []
  )

  const adminDisplayName = useMemo(() => {
    const prenom = (admin?.prenom || '').trim()
    const nom = (admin?.nom || '').trim()
    const fullName = `${prenom} ${nom}`.trim()
    return fullName || admin?.numero_membre || 'Admin'
  }, [admin])

  const adminRoleLabel = useMemo(() => {
    if (admin?.is_master) return 'Superadmin global'
    if (admin?.role_type === 'superadmin') return 'Superadmin'
    return admin?.role_name || 'Admin'
  }, [admin])

  const canAccessModule = useCallback(
    (module) => {
      if (!module) return true
      
      // Dashboard : accessible à tous les admins authentifiés
      if (module === 'dashboard') {
        return true
      }
      
      // Audit (Historique) : uniquement superadmins
      if (module === 'audit') {
        return Boolean(admin?.is_master || admin?.role_type === 'superadmin')
      }
      
      // Calendar (Agenda) : accessible à tous les admins
      if (module === 'calendar') {
        return true
      }
      
      // Settings : uniquement superadmins
      if (module === 'settings') {
        return Boolean(admin?.is_master || admin?.role_type === 'superadmin')
      }

      const permissionKey = MODULE_PERMISSION_KEYS[module]
      if (!permissionKey) return true

      // Superadmins masters ont accès à tout
      if (admin?.is_master) return true

      const grantedModules = Array.isArray(admin?.modules) ? admin.modules : []
      
      // Vérifier l'accès direct au module
      const hasDirectAccess = grantedModules.includes(permissionKey)
      if (hasDirectAccess) return true

      // Vérifier les dépendances : si le module dépend d'un autre, vérifier l'accès au module parent
      const dependencies = MODULE_DEPENDENCIES[module] || []
      for (const parentModule of dependencies) {
        if (grantedModules.includes(parentModule)) {
          return true // Accès via dépendance
        }
      }

      // Pour les superadmins scoped, vérifier aussi dans super_scope
      if (admin?.role_type === 'superadmin') {
        const scopeList = Array.isArray(admin?.super_scope) ? admin.super_scope : []
        if (scopeList.length === 0 || scopeList.includes(permissionKey)) {
          return true
        }
        
        // Vérifier aussi les dépendances dans super_scope
        for (const parentModule of dependencies) {
          if (scopeList.length === 0 || scopeList.includes(parentModule)) {
            return true
          }
        }
      }

      return false
    },
    [admin, MODULE_PERMISSION_KEYS, MODULE_DEPENDENCIES]
  )

  const hasAccessToActiveModule = useMemo(() => canAccessModule(activeModule), [activeModule, canAccessModule])

  const handleModuleSelect = useCallback(
    (module) => {
      const allowed = canAccessModule(module)
      setActiveModule(module)
      // Sauvegarder le module actif dans localStorage
      setStoredActiveModule(module)
      // Mettre à jour l'activité lors du changement de module
      updateLastActivity()
      if (!allowed) {
        setAccessDeniedInfo({
          module,
          label: MODULE_LABELS[module] || 'ce module',
        })
      } else {
        setAccessDeniedInfo(null)
      }
    },
    [canAccessModule, MODULE_LABELS]
  )

  useEffect(() => {
    if (accessDeniedInfo && canAccessModule(accessDeniedInfo.module) && canAccessModule(activeModule)) {
      setAccessDeniedInfo(null)
    }
  }, [accessDeniedInfo, activeModule, canAccessModule])

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
    
    // Initialiser l'activité
    updateLastActivity()
    
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  // États pour les stats de toutes les sections
  const [allStats, setAllStats] = useState({
    adhesion: null,
    formation: null,
    webinaire: null,
    tresorerie: null,
    secretariat: null,
    mentorat: null,
    recrutement: null,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Charger toutes les stats pour tous les admins (même sans accès aux modules)
  const loadAllStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      // Utiliser la nouvelle route qui charge toutes les stats en une seule requête
      // Accessible à tous les admins authentifiés
      const statsData = await fetchAllDashboardStats()

      // Debug: vérifier les stats de trésorerie
      if (statsData.tresorerie) {
        console.log('✅ Stats trésorerie chargées:', statsData.tresorerie)
        console.log('📊 Détails trésorerie:', {
          solde_total_eur: statsData.tresorerie?.solde_total_eur,
          montant_total_eur: statsData.tresorerie?.montant_total_eur,
          total_paiements_dons_eur: statsData.tresorerie?.total_paiements_dons_eur,
          depenses_validees_eur: statsData.tresorerie?.depenses_validees_eur,
          toutes_les_proprietes: Object.keys(statsData.tresorerie || {})
        })
      }

      // Debug: vérifier les stats d'adhésion
      console.log('📊 Stats dashboard chargées:', {
        adhesion: statsData.adhesion,
        adhesion_keys: statsData.adhesion ? Object.keys(statsData.adhesion) : [],
        total_membres: statsData.adhesion?.total_membres,
        membres_approuves: statsData.adhesion?.membres_approuves,
        membres_en_attente: statsData.adhesion?.membres_en_attente,
      })

      setAllStats(statsData)
    } catch (err) {
      console.warn('Erreur lors du chargement des stats:', err)
      // En cas d'erreur, initialiser avec des valeurs null
      setAllStats({
        adhesion: null,
        formation: null,
        webinaire: null,
        tresorerie: null,
        secretariat: null,
        mentorat: null,
        recrutement: null,
      })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllStats()
  }, [loadAllStats])

  // Stats calculées pour compatibilité
  const stats = {
    totalMembers: allStats.adhesion?.total_membres || 0,
    pendingAdhesions: pendingMembers.length,
    activeFormations: allStats.formation?.total_formations || 0,
    cardsGenerated: 0, // Supprimé - pas utile
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
      studio: { title: 'Studio', breadcrumb: 'Admin / Studio' },
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
    const [selectedRelation, setSelectedRelation] = useState(null) // Pour ouvrir le drawer

    const loadData = async () => {
      setLoading(true)
      try {
        const [statsData, relationsData] = await Promise.all([
          fetchMentoratStats(),
          fetchRelations({ limit: 100 }), // Charger plus de relations pour voir toutes
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
        // 🔒 VÉRIFICATIONS DE DOUBLONS AVANT SOUMISSION (FRONTEND)
        if (showModal === 'mentor') {
          // Vérifier si ce membre est déjà mentor
          const existingMentor = mentors.find(m => m.membre_id === formData.membre_id)
          if (existingMentor) {
            alert('Ce membre est déjà enregistré comme mentor. Un membre ne peut être mentor qu\'une seule fois.')
            setSubmitting(false)
            return
          }
          await createMentor(formData)
          alert('Mentor créé avec succès !')
        } else if (showModal === 'mentee') {
          // Vérifier si ce membre est déjà mentoré
          const existingMentee = mentees.find(m => m.membre_id === formData.membre_id)
          if (existingMentee) {
            alert('Ce membre est déjà enregistré comme mentoré. Un membre ne peut être mentoré qu\'une seule fois.')
            setSubmitting(false)
            return
          }
          await createMentee(formData)
          alert('Mentoré créé avec succès !')
        } else if (showModal === 'relation') {
          // Vérifier s'il existe déjà une relation ACTIVE pour ce duo
          if (formData.statut_relation === 'active' || !formData.statut_relation) {
            const existingActive = relations.find(r => 
              r.mentor_id === formData.mentor_id && 
              r.mentee_id === formData.mentee_id && 
              r.statut_relation === 'active'
            )
            if (existingActive) {
              alert('Une relation active existe déjà entre ce mentor et ce mentoré. Veuillez clôturer la relation existante avant d\'en créer une nouvelle.')
              setSubmitting(false)
              return
            }
          }
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
                  {loading ? 'Chargement...' : `${relations.length} relation${relations.length > 1 ? 's' : ''}`}
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
                <p>Aucune relation</p>
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
                        const getStatutBadgeClass = (statut) => {
                          switch (statut) {
                            case 'active': return 'approved' // vert
                            case 'terminee': return 'warning' // orange
                            case 'suspendue': return 'pending' // gris
                            default: return 'pending'
                          }
                        }
                        return (
                          <tr 
                            key={rel.id}
                            onClick={() => setSelectedRelation(rel)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
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
                              <span className={`status-badge ${getStatutBadgeClass(rel.statut_relation || 'active')}`}>
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
                        <option value="visio">Visio</option>
                        <option value="presentiel">Présentiel</option>
                        <option value="telephone">Téléphone</option>
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

        {/* Drawer pour les détails de relation */}
        {selectedRelation && (
          <RelationDrawer
            relation={selectedRelation}
            onClose={() => setSelectedRelation(null)}
            onUpdate={() => {
              setSelectedRelation(null)
              loadData()
            }}
          />
        )}
      </div>
    )
  }

  // Composant pour le contenu Recrutement - Utilise le dashboard dédié
  const RecrutementContent = () => {
    return <RecrutementDashboard />
  }
  
  // Ancien composant RecrutementContent (remplacé par RecrutementDashboard)
  const RecrutementContent_OLD = () => {
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
    const [showCarteGenerator, setShowCarteGenerator] = useState(false)
    const [selectedMemberForCarte, setSelectedMemberForCarte] = useState(null)
    const [selectedMemberIds, setSelectedMemberIds] = useState([])
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [emailSending, setEmailSending] = useState(false)
    const [emailAttachments, setEmailAttachments] = useState([]) // [{ name, data, type, size }]
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
      console.log('🔍 Membre sélectionné:', member)
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

    const allVisibleMembersSelected =
      paginatedMembers.length > 0 &&
      paginatedMembers.every((m) => selectedMemberIds.includes(m.id))

    const toggleSelectMember = (id) => {
      setSelectedMemberIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    }

    const toggleSelectAllVisibleMembers = () => {
      if (allVisibleMembersSelected) {
        setSelectedMemberIds((prev) =>
          prev.filter((id) => !paginatedMembers.some((m) => m.id === id))
        )
      } else {
        setSelectedMemberIds((prev) => {
          const allIds = [...prev, ...paginatedMembers.map((m) => m.id)]
          return Array.from(new Set(allIds))
        })
      }
    }

    const handleAttachmentUpload = (event) => {
      const files = Array.from(event.target.files || [])
      if (files.length === 0) return

      const maxSize = 5 * 1024 * 1024 // 5MB par fichier
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
      ]

      const newAttachments = []

      files.forEach((file) => {
        if (file.size > maxSize) {
          alert(`Le fichier "${file.name}" dépasse la taille maximale de 5MB.`)
          return
        }

        if (!allowedTypes.includes(file.type)) {
          alert(`Le type de fichier "${file.name}" n'est pas autorisé. Formats acceptés : PDF, Word, Excel, Images.`)
          return
        }

        if (emailAttachments.length + newAttachments.length >= 3) {
          alert('Maximum 3 pièces jointes autorisées.')
          return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
          try {
            const result = reader.result
            if (!result || typeof result !== 'string') {
              throw new Error('Résultat de lecture invalide')
            }

            // Extraire les données base64 (enlever le préfixe data:type;base64,)
            const parts = result.split(',')
            if (parts.length !== 2) {
              throw new Error('Format base64 invalide')
            }

            const base64Data = parts[1]
            if (!base64Data || base64Data.length === 0) {
              throw new Error('Données base64 vides')
            }

            newAttachments.push({
              name: file.name,
              data: base64Data,
              type: file.type,
              size: file.size,
            })

            console.log(`✓ Fichier "${file.name}" converti en base64 (${(base64Data.length / 1024).toFixed(1)} KB)`, {
              type: file.type,
              originalSize: file.size,
              base64Length: base64Data.length,
            })

            // Vérifier si tous les fichiers sont traités
            if (newAttachments.length === files.length) {
              setEmailAttachments((prev) => {
                const updated = [...prev, ...newAttachments]
                console.log(`📎 ${updated.length} pièce(s) jointe(s) prête(s)`, updated.map(a => ({ name: a.name, type: a.type, size: a.size })))
                return updated
              })
            }
          } catch (err) {
            console.error(`Erreur traitement fichier "${file.name}":`, err)
            alert(`Erreur lors du traitement du fichier "${file.name}": ${err.message}`)
          }
        }
        reader.onerror = (err) => {
          console.error(`Erreur FileReader pour "${file.name}":`, err)
          alert(`Erreur lors de la lecture du fichier "${file.name}".`)
        }
        reader.readAsDataURL(file)
      })
    }

    const removeAttachment = (index) => {
      setEmailAttachments((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSendEmails = async () => {
      const memberIds = selectedMemberIds.length
        ? selectedMemberIds
        : filteredMembers.map((m) => m.id)

      if (!memberIds.length) {
        alert('Aucun membre trouvé pour lenvoi.')
        return
      }

      if (!emailSubject || !emailBody) {
        alert('Merci de renseigner un objet et un contenu pour le mail.')
        return
      }

      if (
        !window.confirm(
          `Envoyer cet email à ${memberIds.length} membre(s)${emailAttachments.length > 0 ? ` avec ${emailAttachments.length} pièce(s) jointe(s)` : ''} ?`
        )
      ) {
        return
      }

      try {
        setEmailSending(true)
        
        // Log pour debug
        const selectedMembers = selectedMemberIds.length 
          ? members.filter(m => selectedMemberIds.includes(m.id))
          : filteredMembers
        console.log('📧 Envoi email membres:', {
          memberIds,
          count: memberIds.length,
          attachments: emailAttachments.length,
          attachmentsDetails: emailAttachments.map(a => ({
            name: a.name,
            type: a.type,
            size: a.size,
            dataLength: a.data?.length || 0,
            hasData: !!a.data,
          })),
          selectedMembers: selectedMembers.map(m => ({ id: m.id, email: m.email, nom: `${m.prenom} ${m.nom}` }))
        })
        
        const result = await sendMemberEmails({
          memberIds,
          subject: emailSubject,
          body: emailBody,
          attachments: emailAttachments.map(a => ({
            name: a.name,
            data: a.data,
            type: a.type,
          })),
        })
        
        // Vérifier si le résultat contient des informations
        if (result?.success === false) {
          const message = result.message || "Erreur lors de l'envoi des emails"
          // Détecter les erreurs d'autorisation Google Apps Script
          if (message.includes('autorisation') || message.includes('authorization') || message.includes('MailApp.sendEmail') || message.includes('script.send_mail') || message.includes('Apps Script')) {
            alert(`⚠️ Erreur d'autorisation Google Apps Script\n\n${message}\n\nVeuillez vérifier que le script Google Apps Script a les autorisations nécessaires pour envoyer des emails (https://www.googleapis.com/auth/script.send_mail).`)
          } else {
            alert(`❌ Erreur lors de l'envoi :\n\n${message}`)
          }
        } else if (result?.success === true || result?.message) {
          const message = result.message || `Email envoyé avec succès à ${memberIds.length} membre(s)`
          alert(`✅ ${message}${emailAttachments.length > 0 ? ` avec ${emailAttachments.length} pièce(s) jointe(s)` : ''}`)
          setSelectedMemberIds([])
          setEmailAttachments([])
          setEmailSubject('')
          setEmailBody('')
        } else {
          alert(`✅ Email envoyé avec succès à ${memberIds.length} membre(s)${emailAttachments.length > 0 ? ` avec ${emailAttachments.length} pièce(s) jointe(s)` : ''}.`)
          setSelectedMemberIds([])
          setEmailAttachments([])
          setEmailSubject('')
          setEmailBody('')
        }
      } catch (err) {
        console.error('❌ Erreur envoi email membres:', err)
        
        // Utiliser responseData si disponible (contient les détails du backend)
        const errorData = err.responseData || {}
        const errorMessage = errorData.message || err.message || "Erreur lors de l'envoi des emails membres"
        const errors = errorData.errors || []
        
        // Construire un message d'erreur détaillé
        let detailedMessage = errorMessage
        if (errors.length > 0) {
          const errorDetails = errors.slice(0, 3).join('\n• ') // Limiter à 3 erreurs pour la lisibilité
          detailedMessage = `${errorMessage}\n\nDétails :\n• ${errorDetails}${errors.length > 3 ? `\n... et ${errors.length - 3} autre(s) erreur(s)` : ''}`
        }
        
        // Détecter les erreurs d'autorisation Google Apps Script
        if (errorMessage.includes('autorisation') || errorMessage.includes('authorization') || errorMessage.includes('MailApp.sendEmail') || errorMessage.includes('script.send_mail') || errorMessage.includes('Apps Script') || errors.some(e => e.includes('autorisation') || e.includes('authorization'))) {
          alert(`⚠️ Erreur d'autorisation Google Apps Script\n\n${detailedMessage}\n\nPour résoudre ce problème :\n1. Ouvrez le script Google Apps Script dans Google Drive\n2. Cliquez sur "Exécuter" (▶️) pour autoriser le script\n3. Acceptez les autorisations demandées (notamment l'autorisation d'envoyer des emails)\n4. Réessayez l'envoi`)
        } else {
          alert(`❌ Erreur lors de l'envoi :\n\n${detailedMessage}`)
        }
      } finally {
        setEmailSending(false)
      }
    }

    if (showCarteGenerator) {
      return (
        <CarteMembreGenerator
          memberData={selectedMemberForCarte}
          onClose={() => {
            setShowCarteGenerator(false)
            setSelectedMemberForCarte(null)
          }}
        />
      )
    }

    return (
      <div className="module-content">
        <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <h2>Gestion des Membres</h2>
            <p className="module-subtitle">Fiches, carte, emailing ciblé de la communauté ASGF</p>
          </div>
          <button
            onClick={() => setShowCarteGenerator(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Générer une carte membre
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="search-bar" style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Rechercher par nom, email ou numéro de membre..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="search-input"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '999px',
              border: '2px solid #0066CC',
              fontSize: '0.95rem',
              background: 'white',
              color: '#212529',
              fontWeight: '500',
              width: '100%',
              maxWidth: '500px',
            }}
          />
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
              <strong>{filteredMembers.length}</strong> membre{filteredMembers.length !== 1 ? 's' : ''} trouvé{filteredMembers.length !== 1 ? 's' : ''}
            </p>
            {selectedMemberIds.length > 0 && (
              <p style={{ fontSize: '0.9rem', color: '#0066CC', margin: 0, fontWeight: 600 }}>
                ✓ <strong>{selectedMemberIds.length}</strong> sélectionné{selectedMemberIds.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Console d'emailing membres - Design moderne */}
        <section className="card" style={{ marginBottom: '24px', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,102,204,0.12)', background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)', border: '2px solid #e0f2fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0066CC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Console d'Emailing Membres
              </h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                Envoyez des emails personnalisés aux membres sélectionnés ou à tous les membres filtrés
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={emailSending || (!emailSubject || !emailBody)}
              onClick={handleSendEmails}
              style={{
                background: selectedMemberIds.length > 0 || filteredMembers.length > 0
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : '#94a3b8',
                border: 'none',
                color: 'white',
                fontSize: '0.9rem',
                padding: '0.6rem 1.5rem',
                borderRadius: '999px',
                fontWeight: 600,
                cursor: (!emailSubject || !emailBody) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (emailSubject && emailBody) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 16px rgba(34,197,94,0.4)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(34,197,94,0.3)'
              }}
            >
              {emailSending ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                  </svg>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem' }}>
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Envoyer {selectedMemberIds.length > 0 ? `à ${selectedMemberIds.length} membre(s)` : `à tous (${filteredMembers.length})`}
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                Objet du message *
              </label>
              <input
                type="text"
                placeholder="Ex: Actualités ASGF, Relance cotisation, Invitation événement..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontSize: '0.95rem',
                  background: 'white',
                  color: '#0f172a',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0066CC'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,102,204,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                Message *
              </label>
              <textarea
                rows="5"
                placeholder="Écrivez votre message ici... Vous pouvez utiliser des variables pour personnaliser :
• {{prenom}} - Prénom du membre
• {{nom}} - Nom du membre
• {{numero_membre}} - Numéro de membre
• {{pays}} - Pays du membre

Exemple : Bonjour {{prenom}}, nous avons le plaisir de vous informer que..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontSize: '0.95rem',
                  background: 'white',
                  color: '#0f172a',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0066CC'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,102,204,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                💡 Astuce : Les variables seront automatiquement remplacées par les informations de chaque membre lors de l'envoi.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                Pièces jointes (optionnel)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  onChange={handleAttachmentUpload}
                  disabled={emailAttachments.length >= 3}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '2px dashed #cbd5e1',
                    fontSize: '0.9rem',
                    background: 'white',
                    cursor: emailAttachments.length >= 3 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (emailAttachments.length < 3) {
                      e.target.style.borderColor = '#0066CC'
                      e.target.style.background = '#f0f7ff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#cbd5e1'
                    e.target.style.background = 'white'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                  Formats acceptés : PDF, Word, Excel, Images (JPG, PNG, GIF) • Max 5MB par fichier • Maximum 3 fichiers
                </p>
                {emailAttachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {emailAttachments.map((att, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          background: '#f1f5f9',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: '#0066CC' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                          <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {att.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                            ({(att.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#dc2626'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ef4444'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

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
            {/* Barre d'actions groupées */}
            {selectedMemberIds.length > 0 && (
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                boxShadow: '0 4px 12px rgba(0,102,204,0.2)',
              }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                  <strong>{selectedMemberIds.length}</strong> membre{selectedMemberIds.length !== 1 ? 's' : ''} sélectionné{selectedMemberIds.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds([])}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255,255,255,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255,255,255,0.2)'
                    }}
                  >
                    Tout désélectionner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = filteredMembers.map((m) => m.id)
                      setSelectedMemberIds(allIds)
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255,255,255,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255,255,255,0.2)'
                    }}
                  >
                    Tout sélectionner ({filteredMembers.length})
                  </button>
                </div>
              </div>
            )}

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={allVisibleMembersSelected}
                        onChange={toggleSelectAllVisibleMembers}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    </th>
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
                      <tr key={member.id} style={{ cursor: 'pointer' }} onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                      }} onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(member.id)}
                            onChange={() => toggleSelectMember(member.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: '#0066CC' }}>{member.numero_membre || '-'}</td>
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                            <button
                              onClick={() => {
                                setSelectedMemberForCarte(member)
                                setShowCarteGenerator(true)
                              }}
                              className="action-btn"
                              title="Générer la carte membre"
                              style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                              Carte
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center py-4">
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
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.numero_membre || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Nom :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.nom || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Prénom :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.prenom || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email :</span>
                        <input 
                          type="email" 
                          className="info-value" 
                          value={selectedMember.email || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Téléphone :</span>
                        <input 
                          type="tel" 
                          className="info-value" 
                          value={selectedMember.telephone || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Date de naissance :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.date_naissance ? new Date(selectedMember.date_naissance).toLocaleDateString('fr-FR') : ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Statut :</span>
                        <span className={`status-badge ${(selectedMember.status || selectedMember.statut) === 'approved' || (selectedMember.status || selectedMember.statut) === 'approuvé' ? 'approved' : (selectedMember.status || selectedMember.statut) === 'pending' || (selectedMember.status || selectedMember.statut) === 'en_attente' ? 'pending' : 'rejected'}`}>
                          {(selectedMember.status || selectedMember.statut) === 'approved' || (selectedMember.status || selectedMember.statut) === 'approuvé' ? 'Approuvé' : (selectedMember.status || selectedMember.statut) === 'pending' || (selectedMember.status || selectedMember.statut) === 'en_attente' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Date d'adhésion :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.date_adhesion ? new Date(selectedMember.date_adhesion).toLocaleDateString('fr-FR') : ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                    </div>

                    <h4 style={{ marginTop: '30px', marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Informations Professionnelles
                    </h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Statut Pro :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.statut_pro || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Domaine :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.domaine || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                    </div>

                    <h4 style={{ marginTop: '30px', marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Informations Académiques
                    </h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Université :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.universite || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Niveau d'études :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.niveau_etudes || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Année universitaire :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.annee_universitaire || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Spécialité :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.specialite || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                    </div>

                    <h4 style={{ marginTop: '30px', marginBottom: '15px', color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
                      Adresse
                    </h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Adresse :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.adresse || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Ville :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.ville || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
                      </div>
                      <div className="info-item">
                        <span className="info-label">Pays :</span>
                        <input 
                          type="text" 
                          className="info-value" 
                          value={selectedMember.pays || ''} 
                          readOnly 
                          style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                        />
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
                            <input 
                              type="text" 
                              className="info-value" 
                              value={carteMembre.numero_membre || ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Date d'émission :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value={carteMembre.date_emission ? new Date(carteMembre.date_emission).toLocaleDateString('fr-FR') : ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Date de validité :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value={carteMembre.date_validite ? new Date(carteMembre.date_validite).toLocaleDateString('fr-FR') : ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Pays :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value={carteMembre.pays || ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Statut carte :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value={carteMembre.statut_carte || ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Statut paiement :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value={carteMembre.statut_paiement || ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
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
                      <div className="carte-membre-container">
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Numéro de membre :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value={selectedMember.numero_membre || ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Date d'émission :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value="" 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Date de validité :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value="" 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Pays :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value={selectedMember.pays || ''} 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Statut carte :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value="" 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                          <div className="info-item">
                            <span className="info-label">Statut paiement :</span>
                            <input 
                              type="text" 
                              className="info-value" 
                              value="" 
                              readOnly 
                              style={{ background: '#f8fafc', border: '1px solid #e4e7ec', padding: '8px', borderRadius: '6px', width: '100%', color: '#0f172a' }}
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Carte Membre PDF :</div>
                          <div style={{ 
                            width: '100%', 
                            height: '500px', 
                            border: '1px solid #ddd', 
                            borderRadius: '8px',
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                          }}>
                            Aucune carte membre disponible
                          </div>
                        </div>
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
    const [allMembers, setAllMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ search: '', status: '', pays: '' })
    const [editingMember, setEditingMember] = useState(null)
    const [memberFormData, setMemberFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [photoPreview, setPhotoPreview] = useState(null)
    const [exporting, setExporting] = useState(false)

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const [statsData, pendingData] = await Promise.all([
          fetchAdhesionStats(),
          fetchPendingMembers(),
        ])
        setStats(statsData || {})
        const pending = Array.isArray(pendingData) ? pendingData : []
        setPendingMembers(pending)
        
        // Charger tous les membres avec pagination (limite max 500)
        let allMembersList = []
        let currentPage = 1
        let hasMore = true
        const maxLimit = 500
        
        while (hasMore) {
          try {
            const members = await fetchAllMembers({ page: currentPage, limit: maxLimit })
            if (!Array.isArray(members)) {
              console.warn('Format de données inattendu pour les membres')
              hasMore = false
              break
            }
            
            allMembersList = [...allMembersList, ...members]
            
            // Si on a moins de membres que la limite, on a tout récupéré
            if (members.length < maxLimit) {
              hasMore = false
            } else {
              currentPage++
            }
          } catch (err) {
            console.warn('Erreur lors du chargement des membres (page ' + currentPage + '):', err)
            hasMore = false
          }
        }
        
        setAllMembers(allMembersList)
        setMembers(allMembersList)
      } catch (err) {
        console.error('Erreur chargement adhésion:', err)
        setStats({})
        setPendingMembers([])
        setAllMembers([])
        setMembers([])
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      loadData()
    }, [loadData])

    // Filtrer les membres localement
    const filteredMembers = useMemo(() => {
      let filtered = [...allMembers]
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(m => 
          (m.prenom && m.prenom.toLowerCase().includes(searchLower)) ||
          (m.nom && m.nom.toLowerCase().includes(searchLower)) ||
          (m.email && m.email.toLowerCase().includes(searchLower)) ||
          (m.numero_membre && m.numero_membre.toLowerCase().includes(searchLower))
        )
      }
      
      if (filters.status) {
        filtered = filtered.filter(m => {
          const status = m.status || 'pending'
          if (filters.status === 'pending') return status === 'pending' || status === 'en_attente'
          if (filters.status === 'approved') return status === 'approved' || status === 'approuvé'
          if (filters.status === 'rejected') return status === 'rejected' || status === 'rejeté'
          return true
        })
      }
      
      if (filters.pays) {
        const paysLower = filters.pays.toLowerCase()
        filtered = filtered.filter(m => 
          m.pays && m.pays.toLowerCase().includes(paysLower)
        )
      }
      
      return filtered
    }, [allMembers, filters])

    // Filtrer les membres en attente
    const filteredPendingMembers = useMemo(() => {
      let filtered = [...pendingMembers]
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(m => 
          (m.prenom && m.prenom.toLowerCase().includes(searchLower)) ||
          (m.nom && m.nom.toLowerCase().includes(searchLower)) ||
          (m.email && m.email.toLowerCase().includes(searchLower)) ||
          (m.numero_membre && m.numero_membre.toLowerCase().includes(searchLower))
        )
      }
      
      if (filters.pays) {
        const paysLower = filters.pays.toLowerCase()
        filtered = filtered.filter(m => 
          m.pays && m.pays.toLowerCase().includes(paysLower)
        )
      }
      
      return filtered
    }, [pendingMembers, filters])

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

    const handleEdit = (member) => {
      setEditingMember(member)
      setMemberFormData({
        prenom: member.prenom || '',
        nom: member.nom || '',
        email: member.email || '',
        telephone: member.telephone || '',
        date_naissance: member.date_naissance || '',
        universite: member.universite || '',
        niveau_etudes: member.niveau_etudes || '',
        annee_universitaire: member.annee_universitaire || '',
        specialite: member.specialite || '',
        interets: Array.isArray(member.interets) ? member.interets.join(', ') : (member.interets || ''),
        motivation: member.motivation || '',
        competences: member.competences || '',
        is_newsletter_subscribed: member.is_newsletter_subscribed || false,
        is_active: member.is_active || false,
        adresse: member.adresse || '',
        ville: member.ville || '',
        pays: member.pays || '',
        status: member.status || 'pending',
        statut_pro: member.statut_pro || '',
        domaine: member.domaine || '',
        date_adhesion: member.date_adhesion || '',
        photo_url: member.photo_url || '',
      })
      setPhotoPreview(member.photo_url || null)
    }

    // Fonction pour uploader une photo de membre
    const handleMemberPhotoUpload = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image')
        return
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB')
        return
      }

      try {
        setUploadingPhoto(true)
        
        // Créer un nom de fichier unique
        const fileExt = file.name.split('.').pop()
        const fileName = `members/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        // Importer le client Supabase
        const { supabaseAdhesion } = await import('../../public/config/supabase.config')
        
        // Essayer d'uploader vers Supabase Storage
        let uploadSuccess = false
        try {
          const { data: uploadData, error: uploadError } = await supabaseAdhesion.storage
            .from('adhesion') // Nom du bucket (à créer dans Supabase)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (!uploadError && uploadData) {
            // Upload réussi vers Supabase Storage
            const { data: { publicUrl } } = supabaseAdhesion.storage
              .from('adhesion')
              .getPublicUrl(fileName)

            setPhotoPreview(publicUrl)
            setMemberFormData({ ...memberFormData, photo_url: publicUrl })
            uploadSuccess = true
          }
        } catch (storageError) {
          // Erreur silencieuse - le bucket n'existe probablement pas
          // On utilisera le fallback base64
        }

        // Si l'upload vers Supabase Storage a échoué, utiliser le fallback base64
        if (!uploadSuccess) {
          const reader = new FileReader()
          reader.onloadend = () => {
            setPhotoPreview(reader.result)
            setMemberFormData({ ...memberFormData, photo_url: reader.result })
            setUploadingPhoto(false)
            // Photo stockée en base64 (fonctionne mais moins optimal)
          }
          reader.onerror = () => {
            setUploadingPhoto(false)
            alert('Erreur lors de la lecture du fichier')
          }
          reader.readAsDataURL(file)
        } else {
          setUploadingPhoto(false)
        }
      } catch (err) {
        console.error('Erreur upload photo:', err)
        alert('Erreur lors de l\'upload de la photo: ' + err.message)
        setUploadingPhoto(false)
      }
    }

    const handleUpdate = async (e) => {
      e.preventDefault()
      if (!editingMember) return
      
      setSubmitting(true)
      try {
        // Validation des champs requis
        if (!memberFormData.prenom || !memberFormData.prenom.trim()) {
          alert('Le prénom est requis')
          setSubmitting(false)
          return
        }
        if (!memberFormData.nom || !memberFormData.nom.trim()) {
          alert('Le nom est requis')
          setSubmitting(false)
          return
        }
        if (!memberFormData.email || !memberFormData.email.trim()) {
          alert('L\'email est requis')
          setSubmitting(false)
          return
        }
        
        // Nettoyer les données avant envoi
        const cleanedData = { ...memberFormData }
        
        // Convertir les chaînes vides en null pour les dates
        if (cleanedData.date_naissance === '') cleanedData.date_naissance = null
        if (cleanedData.date_adhesion === '') cleanedData.date_adhesion = null
        
        // Convertir les chaînes vides en null pour les champs texte optionnels
        const optionalTextFields = ['telephone', 'universite', 'niveau_etudes', 'annee_universitaire', 
          'specialite', 'motivation', 'competences', 'adresse', 'ville', 'pays', 'statut_pro', 'domaine']
        optionalTextFields.forEach(field => {
          if (cleanedData[field] === '') cleanedData[field] = null
        })
        
        // Gérer les intérêts (convertir chaîne vide en null)
        if (cleanedData.interets === '') {
          cleanedData.interets = null
        } else if (typeof cleanedData.interets === 'string' && cleanedData.interets.trim() !== '') {
          // Le backend convertira la chaîne en tableau
        }
        
        // S'assurer que les booléens sont bien des booléens
        cleanedData.is_newsletter_subscribed = Boolean(cleanedData.is_newsletter_subscribed)
        cleanedData.is_active = Boolean(cleanedData.is_active)
        
        await updateMember(editingMember.id, cleanedData)
        await loadData()
        setEditingMember(null)
        setMemberFormData({})
        alert('Membre mis à jour avec succès !')
      } catch (err) {
        console.error('Erreur mise à jour membre:', err)
        alert('Erreur : ' + err.message)
      } finally {
        setSubmitting(false)
      }
    }

    const handleDelete = async (id) => {
      if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible.')) {
        return
      }
      try {
        await deleteMember(id)
        await loadData()
        alert('Membre supprimé avec succès.')
      } catch (err) {
        alert('Erreur : ' + err.message)
      }
    }

    const handleExportExcel = () => {
      setExporting(true)
      try {
        exportMembersToExcel(filteredMembers)
        alert('Export Excel généré avec succès !')
      } catch (err) {
        alert('Erreur lors de l\'export : ' + err.message)
      } finally {
        setExporting(false)
      }
    }

    const handleExportPDF = () => {
      setExporting(true)
      try {
        exportMembersToPDF(filteredMembers)
        alert('Export PDF généré avec succès !')
      } catch (err) {
        alert('Erreur lors de l\'export : ' + err.message)
      } finally {
        setExporting(false)
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
            <h3>Événements</h3>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="empty-state small">
                <p>Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="chart-events-container">
                {(() => {
                  const maxTotal = Math.max(...monthlyData.map(m => m.total || 0), 1)
                  return monthlyData.slice(-6).map((item, idx) => (
                    <div key={idx} className="chart-events-bar">
                      <div>
                        <div className="chart-events-segment chart-events-approved" style={{ width: `${((item.approved || 0) / maxTotal) * 100}%` }} title={`Approuvés: ${item.approved || 0}`}></div>
                        <div className="chart-events-segment chart-events-pending" style={{ width: `${((item.pending || 0) / maxTotal) * 100}%` }} title={`En attente: ${item.pending || 0}`}></div>
                        <div className="chart-events-segment chart-events-rejected" style={{ width: `${((item.rejected || 0) / maxTotal) * 100}%` }} title={`Rejetés: ${item.rejected || 0}`}></div>
                      </div>
                      <span className="chart-events-label">{item.label}</span>
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
              <div className="chart-country-container">
                {countryData.slice(0, 8).map((item, idx) => {
                  const total = countryData.reduce((sum, c) => sum + c.value, 0)
                  const percentage = ((item.value / total) * 100).toFixed(1)
                  return (
                    <div key={idx} className="chart-country-item">
                      <div className="chart-country-header">
                        <span className="chart-country-name">{item.name}</span>
                        <span className="chart-country-value">{item.value} ({percentage}%)</span>
                      </div>
                      <div className="chart-country-bar-wrapper">
                        <div className="chart-country-bar" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Pending Members Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Adhésions en attente de validation</h3>
                <p className="card-subtitle">{filteredPendingMembers.length} demande{filteredPendingMembers.length !== 1 ? 's' : ''} en attente</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement...</p>
              </div>
            ) : filteredPendingMembers.length === 0 ? (
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
                    {filteredPendingMembers.map((membre) => (
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
                            <button
                              onClick={() => handleEdit(membre)}
                              className="action-btn view"
                              title="Modifier"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(membre.id)}
                              className="action-btn reject"
                              title="Supprimer"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

        {/* Filters */}
        <section className="module-toolbar" style={{ marginTop: '2.5rem' }}>
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
          <div className="toolbar-actions">
            <button 
              className="btn-primary" 
              onClick={handleExportExcel}
              disabled={exporting || filteredMembers.length === 0}
            >
              {exporting ? 'Export...' : '📥 Excel'}
            </button>
            <button 
              className="btn-primary" 
              onClick={handleExportPDF}
              disabled={exporting || filteredMembers.length === 0}
            >
              {exporting ? 'Export...' : '📄 PDF'}
            </button>
          </div>
        </section>

        {/* All Members Table */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Tous les membres</h3>
                <p className="card-subtitle">{filteredMembers.length} membre{filteredMembers.length !== 1 ? 's' : ''} trouvé{filteredMembers.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="empty-state">
                <p>Aucun membre trouvé</p>
              </div>
            ) : (
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
                    {filteredMembers.map((membre) => (
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
                          <span className={`status-badge ${
                            membre.status === 'approved' || membre.status === 'approuvé' ? 'approved' :
                            membre.status === 'rejected' || membre.status === 'rejeté' ? 'rejected' :
                            'pending'
                          }`}>
                            {membre.status === 'approved' || membre.status === 'approuvé' ? 'Approuvé' :
                             membre.status === 'rejected' || membre.status === 'rejeté' ? 'Rejeté' :
                             'En attente'}
                          </span>
                        </td>
                        <td>
                          {membre.created_at 
                            ? new Date(membre.created_at).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              onClick={() => handleEdit(membre)}
                              className="action-btn view"
                              title="Modifier"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(membre.id)}
                              className="action-btn reject"
                              title="Supprimer"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

        {/* Edit Member Modal */}
        {editingMember && createPortal(
          <div className="modal-overlay" onClick={() => setEditingMember(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Modifier le membre</h2>
                <button className="modal-close" onClick={() => setEditingMember(null)}>×</button>
              </div>
              <form className="modal-form" onSubmit={handleUpdate} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input
                      type="text"
                      value={memberFormData.prenom}
                      onChange={(e) => setMemberFormData({ ...memberFormData, prenom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      value={memberFormData.nom}
                      onChange={(e) => setMemberFormData({ ...memberFormData, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={memberFormData.email}
                      onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input
                      type="tel"
                      value={memberFormData.telephone}
                      onChange={(e) => setMemberFormData({ ...memberFormData, telephone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date de naissance</label>
                    <input
                      type="date"
                      value={memberFormData.date_naissance}
                      onChange={(e) => setMemberFormData({ ...memberFormData, date_naissance: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date d'adhésion</label>
                    <input
                      type="date"
                      value={memberFormData.date_adhesion}
                      onChange={(e) => setMemberFormData({ ...memberFormData, date_adhesion: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Statut *</label>
                    <select
                      value={memberFormData.status}
                      onChange={(e) => setMemberFormData({ ...memberFormData, status: e.target.value })}
                      required
                    >
                      <option value="pending">En attente</option>
                      <option value="approved">Approuvé</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Statut professionnel</label>
                    <input
                      type="text"
                      value={memberFormData.statut_pro}
                      onChange={(e) => setMemberFormData({ ...memberFormData, statut_pro: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pays</label>
                    <input
                      type="text"
                      value={memberFormData.pays}
                      onChange={(e) => setMemberFormData({ ...memberFormData, pays: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ville</label>
                    <input
                      type="text"
                      value={memberFormData.ville}
                      onChange={(e) => setMemberFormData({ ...memberFormData, ville: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Adresse</label>
                    <textarea
                      value={memberFormData.adresse}
                      onChange={(e) => setMemberFormData({ ...memberFormData, adresse: e.target.value })}
                      rows="2"
                    />
                  </div>
                  <div className="form-group">
                    <label>Université</label>
                    <input
                      type="text"
                      value={memberFormData.universite}
                      onChange={(e) => setMemberFormData({ ...memberFormData, universite: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Niveau d'études</label>
                    <input
                      type="text"
                      value={memberFormData.niveau_etudes}
                      onChange={(e) => setMemberFormData({ ...memberFormData, niveau_etudes: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Année universitaire</label>
                    <input
                      type="text"
                      value={memberFormData.annee_universitaire}
                      onChange={(e) => setMemberFormData({ ...memberFormData, annee_universitaire: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Spécialité</label>
                    <input
                      type="text"
                      value={memberFormData.specialite}
                      onChange={(e) => setMemberFormData({ ...memberFormData, specialite: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Domaine</label>
                    <input
                      type="text"
                      value={memberFormData.domaine}
                      onChange={(e) => setMemberFormData({ ...memberFormData, domaine: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Intérêts (séparés par des virgules)</label>
                    <input
                      type="text"
                      value={memberFormData.interets}
                      onChange={(e) => setMemberFormData({ ...memberFormData, interets: e.target.value })}
                      placeholder="ex: SIG, télédétection, cartographie"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Motivation</label>
                    <textarea
                      value={memberFormData.motivation}
                      onChange={(e) => setMemberFormData({ ...memberFormData, motivation: e.target.value })}
                      rows="3"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Compétences</label>
                    <textarea
                      value={memberFormData.competences}
                      onChange={(e) => setMemberFormData({ ...memberFormData, competences: e.target.value })}
                      rows="3"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Photo du membre</label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      {/* Preview de la photo */}
                      {(photoPreview || memberFormData.photo_url) && 
                       !(photoPreview || memberFormData.photo_url)?.startsWith('file://') && (
                        <div style={{ position: 'relative', width: '120px', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e4e7ec' }}>
                          <img
                            src={photoPreview || memberFormData.photo_url}
                            alt="Photo membre"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8fafc; color: #64748b; font-size: 12px;">Erreur image</div>'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoPreview(null)
                              setMemberFormData({ ...memberFormData, photo_url: '' })
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0, 0, 0, 0.6)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                            }}
                            title="Supprimer la photo"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMemberPhotoUpload}
                          disabled={uploadingPhoto}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #e4e7ec',
                            borderRadius: '6px',
                            background: uploadingPhoto ? '#f8fafc' : '#ffffff',
                            cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                          }}
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                          {uploadingPhoto ? 'Upload en cours...' : 'Formats acceptés : JPG, PNG, GIF • Max 5MB'}
                        </div>
                        {memberFormData.photo_url && (
                          <input
                            type="text"
                            value={memberFormData.photo_url}
                            onChange={(e) => {
                              const url = e.target.value
                              if (url.startsWith('file://')) {
                                alert('Les chemins de fichiers locaux ne sont pas supportés. Veuillez utiliser une URL publique ou uploader une image.')
                                return
                              }
                              setMemberFormData({ ...memberFormData, photo_url: url })
                              if (url) {
                                setPhotoPreview(url)
                              }
                            }}
                            placeholder="Ou entrez une URL de photo"
                            style={{
                              width: '100%',
                              marginTop: '8px',
                              padding: '8px',
                              border: '1px solid #e4e7ec',
                              borderRadius: '6px',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={memberFormData.is_newsletter_subscribed}
                        onChange={(e) => setMemberFormData({ ...memberFormData, is_newsletter_subscribed: e.target.checked })}
                      />
                      Abonné à la newsletter
                    </label>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={memberFormData.is_active}
                        onChange={(e) => setMemberFormData({ ...memberFormData, is_active: e.target.checked })}
                      />
                      Membre actif
                    </label>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setEditingMember(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Enregistrement...' : 'Enregistrer'}
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
    const [cotisationsData, setCotisationsData] = useState([])
    const [paiementsData, setPaiementsData] = useState([])
    const [depensesData, setDepensesData] = useState([])
    const [historique, setHistorique] = useState([])
    const [relances, setRelances] = useState([])
    const [cartesMembres, setCartesMembres] = useState([])
    const [selectedCartes, setSelectedCartes] = useState([])
    const [searchCartes, setSearchCartes] = useState('')
    const [filterStatutPaiement, setFilterStatutPaiement] = useState('')
    const [pageCotisations, setPageCotisations] = useState(1)
    const [pagePaiements, setPagePaiements] = useState(1)
    const [pageDepenses, setPageDepenses] = useState(1)
    const [pageCartes, setPageCartes] = useState(1)
    const [filterCotisationsMois, setFilterCotisationsMois] = useState('')
    const [filterCotisationsAnnee, setFilterCotisationsAnnee] = useState('')
    const [filterCotisationsStatut, setFilterCotisationsStatut] = useState('')
    const [searchCotisations, setSearchCotisations] = useState('')
    const [filterPaiementsType, setFilterPaiementsType] = useState('')
    const [filterDepensesStatut, setFilterDepensesStatut] = useState('')
    const [editingPaiement, setEditingPaiement] = useState(null)
    const [editingDepense, setEditingDepense] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(null) // 'cotisation', 'paiement', 'relance', 'achat_carte', 'depense'
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
        const [cotisationsResult, paiementsResult, depensesResult, historiqueData, relancesData, cartesData] = await Promise.all([
          fetchAllPages(fetchCotisations, buildCotisationParams),
          fetchAllPages(fetchPaiements, buildPaiementParams),
          fetchAllPages(fetchDepenses, buildDepenseParams),
          fetchHistorique({ limit: 10 }),
          fetchRelances({ limit: 50 }),
          listCartesMembres().catch(() => []),
        ])
        setCotisationsData(cotisationsResult)
        setPaiementsData(paiementsResult)
        setDepensesData(depensesResult)
        setHistorique(Array.isArray(historiqueData) ? historiqueData : [])
        setRelances(Array.isArray(relancesData) ? relancesData : [])
        setCartesMembres(Array.isArray(cartesData) ? cartesData : [])
      } catch (err) {
        console.error('Erreur chargement trésorerie:', err)
        setCotisationsData([])
        setPaiementsData([])
        setDepensesData([])
        setHistorique([])
        setCartesMembres([])
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
    // Filtrage par recherche spécifique aux cotisations
    const filteredCotisationsBySearch = useMemo(
      () => filterByMemberQuery(cotisationsData, searchCotisations),
      [cotisationsData, searchCotisations]
    )
    const filteredCotisations = useMemo(
      () => filterByMemberQuery(filteredCotisationsBySearch, memberQuery),
      [filteredCotisationsBySearch, memberQuery]
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

    // Pagination - 15 éléments par page
    const ITEMS_PER_PAGE = 15
    
    // Filtrage supplémentaire pour les cotisations (par mois)
    const filteredCotisationsByMonth = useMemo(() => {
      let filtered = [...filteredCotisations]
      
      if (filterCotisationsMois) {
        filtered = filtered.filter(cot => {
          if (cot.periode_mois) {
            return cot.periode_mois.toString() === filterCotisationsMois
          }
          if (cot.date_paiement) {
            const date = new Date(cot.date_paiement)
            return (date.getMonth() + 1).toString() === filterCotisationsMois
          }
          return false
        })
      }
      
      if (filterCotisationsAnnee) {
        filtered = filtered.filter(cot => {
          if (cot.periode_annee) {
            return cot.periode_annee.toString() === filterCotisationsAnnee
          }
          if (cot.date_paiement) {
            const date = new Date(cot.date_paiement)
            return date.getFullYear().toString() === filterCotisationsAnnee
          }
          return false
        })
      }
      
      if (filterCotisationsStatut) {
        filtered = filtered.filter(cot => {
          if (filterCotisationsStatut === 'paye') {
            return cot.statut_paiement === 'paye' || cot.statut_paiement === 'valide'
          }
          if (filterCotisationsStatut === 'non_paye') {
            return cot.statut_paiement === 'pending' || cot.statut_paiement === 'en_attente' || !cot.statut_paiement
          }
          return true
        })
      }
      
      return filtered
    }, [filteredCotisations, filterCotisationsMois, filterCotisationsAnnee, filterCotisationsStatut])
    
    // Filtrage supplémentaire pour les paiements (dons/subventions)
    const filteredPaiementsByType = useMemo(() => {
      let filtered = [...filteredPaiements]
      
      if (filterPaiementsType) {
        filtered = filtered.filter(p => p.type_paiement === filterPaiementsType)
      }
      
      return filtered
    }, [filteredPaiements, filterPaiementsType])
    
    // Filtrage supplémentaire pour les dépenses
    const filteredDepensesByStatut = useMemo(() => {
      let filtered = [...filteredDepenses]
      
      if (filterDepensesStatut) {
        filtered = filtered.filter(d => d.statut === filterDepensesStatut)
      }
      
      return filtered
    }, [filteredDepenses, filterDepensesStatut])
    
    // Pagination des cotisations
    const totalPagesCotisations = Math.ceil(filteredCotisationsByMonth.length / ITEMS_PER_PAGE)
    const cotisations = useMemo(() => {
      const start = (pageCotisations - 1) * ITEMS_PER_PAGE
      return filteredCotisationsByMonth.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredCotisationsByMonth, pageCotisations])
    
    // Pagination des paiements
    const totalPagesPaiements = Math.ceil(filteredPaiementsByType.length / ITEMS_PER_PAGE)
    const paiements = useMemo(() => {
      const start = (pagePaiements - 1) * ITEMS_PER_PAGE
      return filteredPaiementsByType.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredPaiementsByType, pagePaiements])
    
    // Pagination des dépenses
    const totalPagesDepenses = Math.ceil(filteredDepensesByStatut.length / ITEMS_PER_PAGE)
    const depenses = useMemo(() => {
      const start = (pageDepenses - 1) * ITEMS_PER_PAGE
      return filteredDepensesByStatut.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredDepensesByStatut, pageDepenses])
    
    // Filtrage des cartes membres
    const filteredCartesMembres = useMemo(() => {
      let filtered = [...cartesMembres]
      
      // Filtre par recherche (nom, prénom, numéro membre)
      if (searchCartes.trim()) {
        const searchLower = searchCartes.toLowerCase().trim()
        filtered = filtered.filter(carte => {
          const numeroMembre = (carte.numero_membre || '').toLowerCase()
          const prenom = (carte.membre?.prenom || '').toLowerCase()
          const nom = (carte.membre?.nom || '').toLowerCase()
          const pays = (carte.pays || '').toLowerCase()
          return numeroMembre.includes(searchLower) || 
                 prenom.includes(searchLower) || 
                 nom.includes(searchLower) ||
                 pays.includes(searchLower) ||
                 `${prenom} ${nom}`.includes(searchLower)
        })
      }
      
      // Filtre par statut de paiement
      if (filterStatutPaiement) {
        if (filterStatutPaiement === 'paye') {
          filtered = filtered.filter(c => c.statut_paiement === 'oui')
        } else if (filterStatutPaiement === 'non_paye') {
          filtered = filtered.filter(c => c.statut_paiement === null || c.statut_paiement === '')
        } else if (filterStatutPaiement === 'en_attente') {
          filtered = filtered.filter(c => c.statut_paiement && c.statut_paiement !== 'oui' && c.statut_paiement !== null)
        }
      }
      
      return filtered
    }, [cartesMembres, searchCartes, filterStatutPaiement])
    
    // Pagination des cartes membres
    const totalPagesCartes = Math.ceil(filteredCartesMembres.length / ITEMS_PER_PAGE)
    const cartesPaginated = useMemo(() => {
      const start = (pageCartes - 1) * ITEMS_PER_PAGE
      return filteredCartesMembres.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredCartesMembres, pageCartes])

    const analyticsData = useMemo(
      () => buildAnalyticsData(filteredCotisations, filteredPaiements, filteredDepenses),
      [filteredCotisations, filteredPaiements, filteredDepenses]
    )
    const kpis = useMemo(
      () => computeKpis(filteredCotisations, filteredPaiements, filteredDepenses),
      [filteredCotisations, filteredPaiements, filteredDepenses]
    )
    
    // KPI pour les cartes membres
    const cartesKpis = useMemo(() => {
      const cartesPayees = cartesMembres.filter(c => c.statut_paiement === 'oui')
      const cartesNonPayees = cartesMembres.filter(c => c.statut_paiement === null || c.statut_paiement === '')
      const cartesEnAttente = cartesMembres.filter(c => c.statut_paiement && c.statut_paiement !== 'oui' && c.statut_paiement !== null)
      
      // Calculer les revenus des cartes
      let revenusCartesEUR = 0
      let revenusCartesFCFA = 0
      
      cartesPayees.forEach(carte => {
        const pays = carte.pays || ''
        if (pays.toLowerCase() === 'sénégal' || pays.toLowerCase() === 'senegal') {
          revenusCartesFCFA += 2000
        } else {
          revenusCartesEUR += 10
        }
      })
      
      // Convertir FCFA en EUR (taux approximatif : 1 EUR = 655 FCFA)
      const revenusCartesTotalEUR = revenusCartesEUR + (revenusCartesFCFA / 655)
      
      return {
        total: cartesMembres.length,
        payees: cartesPayees.length,
        nonPayees: cartesNonPayees.length,
        enAttente: cartesEnAttente.length,
        revenusEUR: revenusCartesEUR,
        revenusFCFA: revenusCartesFCFA,
        revenusTotalEUR: revenusCartesTotalEUR,
      }
    }, [cartesMembres])
    
    // KPI solde total ASGF
    const soldeTotal = useMemo(() => {
      // Revenus : cotisations + dons/subventions + cartes membres
      const revenusCotisations = kpis.montant_total_eur || 0
      const revenusCartes = cartesKpis.revenusTotalEUR || 0
      const revenusDons = kpis.total_paiements_dons_eur || 0 // Dons et subventions
      const totalRevenus = revenusCotisations + revenusCartes + revenusDons
      
      // Dépenses
      const totalDepenses = filteredDepenses
        .filter(d => d.statut === 'valide')
        .reduce((sum, d) => {
          const montant = d.montant || 0
          if (d.devise === 'FCFA') {
            return sum + (montant / 655) // Convertir FCFA en EUR
          }
          return sum + montant
        }, 0)
      
      return {
        revenus: totalRevenus,
        depenses: totalDepenses,
        solde: totalRevenus - totalDepenses,
      }
    }, [kpis, cartesKpis, filteredDepenses])
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
      if (!updated) {
        console.warn('updateCotisationState: Aucune donnée fournie', updated)
        return
      }
      console.log('🔄 Mise à jour état cotisation:', { id: updated.id, statut_paiement: updated.statut_paiement })
      setCotisationsData((prev) => {
        const updatedList = prev.map((item) => {
          if (item.id === updated.id) {
            const merged = { ...item, ...updated }
            console.log('✅ Cotisation mise à jour dans l\'état:', { 
              id: merged.id, 
              ancien_statut: item.statut_paiement, 
              nouveau_statut: merged.statut_paiement 
            })
            return merged
          }
          return item
        })
        return updatedList
      })
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
          console.log('🔄 Validation cotisation:', cot.id, cot.statut_paiement)
          const updated = await validateCotisation(cot.id, { date_paiement: new Date().toISOString().split('T')[0] })
          console.log('✅ Réponse validation:', updated)
          if (updated) {
            console.log('📊 Statut après validation:', updated.statut_paiement)
            updateCotisationState(updated)
            alert('✅ Cotisation validée avec succès !')
            // Recharger les données pour s'assurer que tout est à jour
            await loadData()
          } else {
            alert('⚠️ Erreur : La cotisation n\'a pas pu être validée')
          }
        } else if (action === 'reset') {
          const updated = await resetCotisation(cot.id)
          if (updated) {
            updateCotisationState(updated)
            alert('✅ Cotisation repassée en attente !')
            await loadData()
          } else {
            alert('⚠️ Erreur : La cotisation n\'a pas pu être réinitialisée')
          }
        } else if (action === 'delete') {
          if (!window.confirm('Supprimer définitivement cette cotisation ?')) {
            return
          }
          await deleteCotisation(cot.id)
          removeCotisationState(cot.id)
          alert('✅ Cotisation supprimée !')
          await loadData()
        }
      } catch (err) {
        console.error('Erreur action cotisation:', err)
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
        } else if (showModal === 'depense') {
          if (editingDepense) {
            await updateDepense(editingDepense.id, formData)
            alert('Dépense modifiée avec succès !')
            setEditingDepense(null)
            setFormData({})
          } else {
            await createDepense(formData)
            alert('Dépense créée avec succès !')
          }
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
              <p className="kpi-label">Nombre total de cotisations</p>
              <p className="kpi-value">{kpis.total_cotisations}</p>
              <p className="card-subtitle">Toutes les cotisations enregistrées</p>
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
              <p className="card-subtitle">Membres à jour de cotisation</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations en attente</p>
              <p className="kpi-value">{kpis.cotisations_en_attente}</p>
              <p className="card-subtitle">En attente de paiement</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon yellow">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Montant total cotisations</p>
              <p className="kpi-value">{kpis.montant_total_eur.toFixed(2)} €</p>
              <p className="card-subtitle">Somme de toutes les cotisations</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon teal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations Sénégal</p>
              <p className="kpi-value">{kpis.montant_senegal_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{senegalCotisations} membres du Sénégal</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Cotisations Internationales</p>
              <p className="kpi-value">{kpis.montant_international_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{internationalCotisations} membres internationaux</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon slate">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0 0H6m6 0h6M6 12h12" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Dons & Subventions reçus</p>
              <p className="kpi-value">{kpis.total_paiements_dons_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{kpis.paiements_dons_count} dons/subventions</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon red">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0 0h6m-6 0H6M5 12h14" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Dépenses validées</p>
              <p className="kpi-value">{kpis.depenses_validees_eur.toFixed(2)} €</p>
              <p className="card-subtitle">{kpis.depenses_validees} dépenses approuvées</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Revenus cartes membres</p>
              <p className="kpi-value">{cartesKpis.revenusTotalEUR.toFixed(2)} €</p>
              <p className="card-subtitle">{cartesKpis.payees} cartes payées</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Solde total ASGF</p>
              <p className="kpi-value" style={{ color: soldeTotal.solde >= 0 ? '#10b981' : '#ef4444' }}>
                {soldeTotal.solde >= 0 ? '+' : ''}{soldeTotal.solde.toFixed(2)} €
              </p>
              <p className="card-subtitle">Revenus: {soldeTotal.revenus.toFixed(2)} € | Dépenses: {soldeTotal.depenses.toFixed(2)} €</p>
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

        {/* Section Cotisations */}
        <section className="table-section">
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Cotisations</h3>
                <p className="card-subtitle">
                  {filteredCotisationsByMonth.length} cotisation(s) • Page {pageCotisations}/{totalPagesCotisations || 1}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => setShowModal('cotisation')}>
                  + Ajouter Cotisation
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={async () => {
                    const mois = prompt('Entrez le mois (1-12) :', new Date().getMonth() + 1)
                    const annee = prompt('Entrez l\'année :', new Date().getFullYear())
                    if (mois && annee) {
                      try {
                        const result = await generateMonthlyCotisations(parseInt(mois), parseInt(annee))
                        alert(`✅ ${result.created} cotisation(s) générée(s), ${result.skipped} ignorée(s)`)
                        await loadData()
                      } catch (err) {
                        alert('Erreur : ' + err.message)
                      }
                    }
                  }}
                  style={{ fontSize: '14px' }}
                >
                  🔄 Générer cotisations mensuelles
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={async () => {
                    if (!window.confirm('Mettre à jour les cotisations en retard ?')) return
                    try {
                      const result = await updateOverdueCotisations()
                      alert(`✅ ${result.updated} cotisation(s) mise(s) à jour`)
                      await loadData()
                    } catch (err) {
                      alert('Erreur : ' + err.message)
                    }
                  }}
                  style={{ fontSize: '14px' }}
                >
                  ⚠️ Mettre à jour cotisations en retard
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={async () => {
                    if (!window.confirm('Nettoyer les doublons de cotisations ? Cette action est irréversible.')) return
                    try {
                      const result = await cleanDuplicateCotisations()
                      alert(`✅ ${result.removed} doublon(s) supprimé(s)`)
                      await loadData()
                    } catch (err) {
                      alert('Erreur : ' + err.message)
                    }
                  }}
                  style={{ fontSize: '14px', background: '#f59e0b', color: 'white' }}
                >
                  🧹 Nettoyer les doublons
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={async () => {
                    if (!window.confirm('Créer les cotisations manquantes pour tous les membres approuvés qui n\'en ont pas ?')) return
                    try {
                      const result = await createMissingCotisations()
                      alert(`✅ ${result.created} cotisation(s) manquante(s) créée(s) pour ${result.total} membre(s)`)
                      await loadData()
                    } catch (err) {
                      alert('Erreur : ' + err.message)
                    }
                  }}
                  style={{ fontSize: '14px', background: '#10b981', color: 'white' }}
                >
                  ➕ Créer cotisations manquantes
                </button>
              </div>
            </div>
            
            {/* Filtres cotisations */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e4e7ec'
            }}>
              <div style={{ minWidth: '250px', flex: '1' }}>
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou numéro membre..."
                  value={searchCotisations}
                  onChange={(e) => {
                    setSearchCotisations(e.target.value)
                    setPageCotisations(1)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: '500'
                  }}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <select
                  value={filterCotisationsMois}
                  onChange={(e) => {
                    setFilterCotisationsMois(e.target.value)
                    setPageCotisations(1)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: '500'
                  }}
                >
                  <option value="">Tous les mois</option>
                  {MONTH_OPTIONS.map((mois, idx) => (
                    <option key={idx} value={idx + 1}>{mois.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: '120px' }}>
                <input
                  type="number"
                  placeholder="Année (ex: 2025)"
                  value={filterCotisationsAnnee}
                  onChange={(e) => {
                    setFilterCotisationsAnnee(e.target.value)
                    setPageCotisations(1)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: '500'
                  }}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <select
                  value={filterCotisationsStatut}
                  onChange={(e) => {
                    setFilterCotisationsStatut(e.target.value)
                    setPageCotisations(1)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: '500'
                  }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="paye">Payé</option>
                  <option value="non_paye">Non payé</option>
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : cotisations.length === 0 ? (
              <div className="empty-state">
                <p>{searchCotisations || filterCotisationsMois || filterCotisationsAnnee || filterCotisationsStatut ? 'Aucune cotisation ne correspond aux filtres' : 'Aucune cotisation'}</p>
              </div>
            ) : (
              <>
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
                      {cotisations.map((cot) => {
                        const isNonPaye = cot.statut_paiement !== 'paye' && cot.statut_paiement !== 'valide'
                        return (
                          <tr key={cot.id}>
                            <td>{cot.membre?.prenom || '—'} {cot.membre?.nom || '—'}</td>
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
                              <span className={`status-badge ${cot.statut_paiement === 'paye' || cot.statut_paiement === 'valide' ? 'approved' : 'pending'}`}>
                                {cot.statut_paiement === 'paye' || cot.statut_paiement === 'valide' ? 'Payé' : 'En attente'}
                              </span>
                            </td>
                            <td>{cot.date_paiement ? new Date(cot.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                            <td>
                              <div className="table-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {isNonPaye && (
                                  <button 
                                    type="button" 
                                    className="btn-link" 
                                    onClick={async () => {
                                      try {
                                        await createRelance({
                                          membre_id: cot.membre_id,
                                          type_relance: 'cotisation',
                                          annee: cot.periode_annee || new Date().getFullYear(),
                                          commentaire: `Rappel: Votre cotisation pour ${formatPeriod(cot.periode_mois, cot.periode_annee, cot.date_paiement)} est en attente de paiement.`,
                                        })
                                        alert('Relance envoyée avec succès !')
                                      } catch (err) {
                                        alert('Erreur : ' + err.message)
                                      }
                                    }}
                                    style={{ color: '#f59e0b', fontSize: '12px' }}
                                  >
                                    📧 Relancer
                                  </button>
                                )}
                                {cot.statut_paiement !== 'paye' && cot.statut_paiement !== 'valide' && (
                                  <button type="button" className="btn-link" onClick={() => handleCotisationAction(cot, 'validate')}>
                                    Valider
                                  </button>
                                )}
                                {(cot.statut_paiement === 'paye' || cot.statut_paiement === 'valide') && (
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPagesCotisations > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '20px',
                    padding: '16px',
                    borderTop: '1px solid #e4e7ec'
                  }}>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      Page {pageCotisations} sur {totalPagesCotisations}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setPageCotisations(p => Math.max(1, p - 1))}
                        disabled={pageCotisations === 1}
                        className="btn-secondary"
                        style={{ 
                          padding: '8px 16px',
                          opacity: pageCotisations === 1 ? 0.5 : 1,
                          cursor: pageCotisations === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ← Précédent
                      </button>
                      <button
                        onClick={() => setPageCotisations(p => Math.min(totalPagesCotisations, p + 1))}
                        disabled={pageCotisations >= totalPagesCotisations}
                        className="btn-primary"
                        style={{ 
                          padding: '8px 16px',
                          opacity: pageCotisations >= totalPagesCotisations ? 0.5 : 1,
                          cursor: pageCotisations >= totalPagesCotisations ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Section Dons & Subventions */}
        <section className="table-section" style={{ marginTop: '2rem' }}>
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Dons & Subventions</h3>
                <p className="card-subtitle">
                  {filteredPaiementsByType.length} don(s)/subvention(s) • Page {pagePaiements}/{totalPagesPaiements || 1}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => {
                  setEditingPaiement(null)
                  setFormData({})
                  setShowModal('paiement')
                }}>
                  + Ajouter don/subvention
                </button>
              </div>
            </div>
            
            {/* Filtres dons/subventions */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e4e7ec'
            }}>
              <div style={{ minWidth: '180px' }}>
                <select
                  value={filterPaiementsType}
                  onChange={(e) => {
                    setFilterPaiementsType(e.target.value)
                    setPagePaiements(1)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                >
                  <option value="">Tous les types</option>
                  <option value="don">Don</option>
                  <option value="subvention">Subvention</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : paiements.length === 0 ? (
              <div className="empty-state">
                <p>{filterPaiementsType ? 'Aucun don/subvention ne correspond aux filtres' : 'Aucun don/subvention'}</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Période</th>
                        <th>Montant</th>
                        <th>Description</th>
                        <th>Date paiement</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paiements.map((pai) => (
                        <tr key={pai.id}>
                          <td>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              background: pai.type_paiement === 'don' ? '#dbeafe' : pai.type_paiement === 'subvention' ? '#fef3c7' : '#f3e8ff',
                              color: pai.type_paiement === 'don' ? '#1e40af' : pai.type_paiement === 'subvention' ? '#92400e' : '#6b21a8',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}>
                              {pai.type_paiement === 'don' ? 'Don' : pai.type_paiement === 'subvention' ? 'Subvention' : 'Autre'}
                            </span>
                          </td>
                          <td>{formatPeriod(pai.periode_mois, pai.periode_annee, pai.date_paiement)}</td>
                          <td>
                            {pai.montant_eur ? `${pai.montant_eur.toFixed(2)} €` : `${pai.montant || 0} ${pai.currencySymbol || '€'}`}
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pai.description || '—'}
                          </td>
                          <td>{pai.date_paiement ? new Date(pai.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                          <td>
                            <div className="table-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button 
                                type="button" 
                                className="btn-link" 
                                onClick={() => {
                                  setEditingPaiement(pai)
                                  setFormData({
                                    periode_mois: pai.periode_mois,
                                    periode_annee: pai.periode_annee,
                                    type_paiement: pai.type_paiement,
                                    montant: pai.montant,
                                    mode_paiement: pai.mode_paiement,
                                    date_paiement: pai.date_paiement ? new Date(pai.date_paiement).toISOString().split('T')[0] : '',
                                    description: pai.description,
                                  })
                                  setShowModal('paiement')
                                }}
                              >
                                Modifier
                              </button>
                              <button 
                                type="button" 
                                className="btn-link danger" 
                                onClick={async () => {
                                  if (!window.confirm('Supprimer définitivement ce don/subvention ?')) return
                                  try {
                                    await deletePaiement(pai.id)
                                    alert('Don/subvention supprimé avec succès !')
                                    await loadData()
                                  } catch (err) {
                                    alert('Erreur : ' + err.message)
                                  }
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPagesPaiements > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '20px',
                    padding: '16px',
                    borderTop: '1px solid #e4e7ec'
                  }}>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      Page {pagePaiements} sur {totalPagesPaiements}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setPagePaiements(p => Math.max(1, p - 1))}
                        disabled={pagePaiements === 1}
                        className="btn-secondary"
                        style={{ 
                          padding: '8px 16px',
                          opacity: pagePaiements === 1 ? 0.5 : 1,
                          cursor: pagePaiements === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ← Précédent
                      </button>
                      <button
                        onClick={() => setPagePaiements(p => Math.min(totalPagesPaiements, p + 1))}
                        disabled={pagePaiements >= totalPagesPaiements}
                        className="btn-primary"
                        style={{ 
                          padding: '8px 16px',
                          opacity: pagePaiements >= totalPagesPaiements ? 0.5 : 1,
                          cursor: pagePaiements >= totalPagesPaiements ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Modal pour créer Cotisation/Paiement/Relance */}
        {showModal && typeof document !== 'undefined' && createPortal(
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showModal === 'cotisation' && 'Ajouter une Cotisation'}
                  {showModal === 'paiement' && (editingPaiement ? 'Modifier don/subvention' : 'Ajouter don/subvention')}
                  {showModal === 'relance' && 'Créer une Relance'}
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

                {showModal === 'achat_carte' && (
                  <>
                    <div className="form-group">
                      <label>Carte membre *</label>
                      <select
                        required
                        value={formData.carte_id || ''}
                        onChange={(e) => {
                          const carteId = e.target.value
                          const carte = cartesMembres.find(c => c.id === carteId)
                          setFormData({ 
                            ...formData, 
                            carte_id: carteId,
                            numero_membre: carte?.numero_membre || '',
                            prenom: carte?.membre?.prenom || '',
                            nom: carte?.membre?.nom || '',
                          })
                        }}
                      >
                        <option value="">Sélectionner une carte</option>
                        {cartesMembres.map((carte) => {
                          const membreNom = carte.membre ? `${carte.membre.prenom || ''} ${carte.membre.nom || ''}`.trim() : ''
                          const membreDisplay = membreNom || 'Membre non trouvé'
                          const statutPaiement = carte.statut_paiement === 'oui' ? 'Payé' : carte.statut_paiement === null ? 'Non payé' : 'En attente'
                          return (
                            <option key={carte.id} value={carte.id}>
                              {carte.numero_membre} - {membreDisplay} - {carte.pays || 'N/A'} - {statutPaiement}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    {formData.numero_membre && (
                      <>
                        <div className="form-group">
                          <label>Prénom</label>
                          <input
                            type="text"
                            value={formData.prenom || ''}
                            readOnly
                            style={{ background: '#f8fafc', color: '#64748b' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Nom</label>
                          <input
                            type="text"
                            value={formData.nom || ''}
                            readOnly
                            style={{ background: '#f8fafc', color: '#64748b' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Numéro de membre</label>
                          <input
                            type="text"
                            value={formData.numero_membre}
                            readOnly
                            style={{ background: '#f8fafc', color: '#64748b' }}
                          />
                        </div>
                      </>
                    )}
                    <div className="form-group">
                      <label>Statut de paiement *</label>
                      <select
                        required
                        value={formData.statut_paiement || ''}
                        onChange={(e) => setFormData({ ...formData, statut_paiement: e.target.value || null })}
                      >
                        <option value="">Non payé</option>
                        <option value="oui">Payé</option>
                      </select>
                    </div>
                    <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '6px', fontSize: '14px', color: '#0369a1' }}>
                      💡 <strong>Tarif carte membre :</strong> {formData.numero_membre ? (
                        (() => {
                          const carte = cartesMembres.find(c => c.numero_membre === formData.numero_membre)
                          const pays = carte?.pays || ''
                          if (pays.toLowerCase() === 'sénégal' || pays.toLowerCase() === 'senegal') {
                            return '2000 FCFA'
                          }
                          return '10 €'
                        })()
                      ) : 'Sélectionnez une carte'}
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'En cours...' : showModal === 'achat_carte' ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Section Dépenses */}
        <section className="table-section" style={{ marginTop: '2rem' }}>
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Dépenses</h3>
                <p className="card-subtitle">
                  {filteredDepensesByStatut.length} dépense(s) • Page {pageDepenses}/{totalPagesDepenses || 1}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => {
                  setEditingDepense(null)
                  setFormData({})
                  setShowModal('depense')
                }}>
                  + Ajouter Dépense
                </button>
              </div>
            </div>
            
            {/* Filtres dépenses */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e4e7ec'
            }}>
              <div style={{ minWidth: '180px' }}>
                <select
                  value={filterDepensesStatut}
                  onChange={(e) => {
                    setFilterDepensesStatut(e.target.value)
                    setPageDepenses(1)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="planifie">Planifiée</option>
                  <option value="valide">Validée</option>
                  <option value="rejete">Rejetée</option>
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des données...</p>
              </div>
            ) : depenses.length === 0 ? (
              <div className="empty-state">
                <p>{filterDepensesStatut ? 'Aucune dépense ne correspond aux filtres' : 'Aucune dépense'}</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        <th>Montant</th>
                        <th>Date</th>
                        <th>Statut</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depenses.map((dep) => {
                        const montantEUR = dep.devise === 'FCFA' ? (dep.montant / 655) : dep.montant
                        return (
                          <tr key={dep.id}>
                            <td>{dep.categorie || '—'}</td>
                            <td>
                              {montantEUR.toFixed(2)} €
                              {dep.devise === 'FCFA' && (
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>
                                  ({dep.montant} FCFA)
                                </span>
                              )}
                            </td>
                            <td>{dep.date_depense ? new Date(dep.date_depense).toLocaleDateString('fr-FR') : '—'}</td>
                            <td>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                background: dep.statut === 'valide' ? '#d1fae5' : dep.statut === 'rejete' ? '#fee2e2' : '#fef3c7',
                                color: dep.statut === 'valide' ? '#065f46' : dep.statut === 'rejete' ? '#991b1b' : '#92400e',
                                fontWeight: '600',
                                fontSize: '12px'
                              }}>
                                {dep.statut === 'valide' ? 'Validée' : dep.statut === 'rejete' ? 'Rejetée' : 'Planifiée'}
                              </span>
                            </td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dep.description || '—'}
                            </td>
                            <td>
                              <div className="table-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {dep.statut !== 'valide' && (
                                  <button 
                                    type="button" 
                                    className="btn-link" 
                                    onClick={async () => {
                                      try {
                                        await updateDepense(dep.id, { statut: 'valide' })
                                        alert('Dépense validée avec succès !')
                                        await loadData()
                                      } catch (err) {
                                        alert('Erreur : ' + err.message)
                                      }
                                    }}
                                    style={{ color: '#10b981', fontSize: '12px' }}
                                  >
                                    ✓ Valider
                                  </button>
                                )}
                                <button 
                                  type="button" 
                                  className="btn-link" 
                                  onClick={() => {
                                    setEditingDepense(dep)
                                    setFormData({
                                      categorie: dep.categorie,
                                      montant: dep.montant,
                                      devise: dep.devise,
                                      date_depense: dep.date_depense ? new Date(dep.date_depense).toISOString().split('T')[0] : '',
                                      statut: dep.statut,
                                      justificatif_url: dep.justificatif_url,
                                      description: dep.description,
                                    })
                                    setShowModal('depense')
                                  }}
                                >
                                  Modifier
                                </button>
                                <button 
                                  type="button" 
                                  className="btn-link danger" 
                                  onClick={async () => {
                                    if (!window.confirm('Supprimer définitivement cette dépense ?')) return
                                    try {
                                      await deleteDepense(dep.id)
                                      alert('Dépense supprimée avec succès !')
                                      await loadData()
                                    } catch (err) {
                                      alert('Erreur : ' + err.message)
                                    }
                                  }}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPagesDepenses > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '20px',
                    padding: '16px',
                    borderTop: '1px solid #e4e7ec'
                  }}>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      Page {pageDepenses} sur {totalPagesDepenses}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setPageDepenses(p => Math.max(1, p - 1))}
                        disabled={pageDepenses === 1}
                        className="btn-secondary"
                        style={{ 
                          padding: '8px 16px',
                          opacity: pageDepenses === 1 ? 0.5 : 1,
                          cursor: pageDepenses === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ← Précédent
                      </button>
                      <button
                        onClick={() => setPageDepenses(p => Math.min(totalPagesDepenses, p + 1))}
                        disabled={pageDepenses >= totalPagesDepenses}
                        className="btn-primary"
                        style={{ 
                          padding: '8px 16px',
                          opacity: pageDepenses >= totalPagesDepenses ? 0.5 : 1,
                          cursor: pageDepenses >= totalPagesDepenses ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Liste des cartes membres */}
        <section className="table-section" style={{ marginTop: '2rem' }}>
          <div className="table-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Cartes membres</h3>
                <p className="card-subtitle">
                  {cartesKpis.payees} payées • {cartesKpis.nonPayees} non payées • {cartesKpis.enAttente} en attente
                </p>
              </div>
            </div>
            
            {/* Barre de recherche et filtres */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              alignItems: 'center',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e4e7ec'
            }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, numéro membre ou pays..."
                  value={searchCartes}
                  onChange={(e) => setSearchCartes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
              </div>
              <div style={{ minWidth: '180px' }}>
                <select
                  value={filterStatutPaiement}
                  onChange={(e) => setFilterStatutPaiement(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e4e7ec',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="paye">Payé</option>
                  <option value="non_paye">Non payé</option>
                  <option value="en_attente">En attente</option>
                </select>
              </div>
              {selectedCartes.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#475467', fontWeight: '600' }}>
                    {selectedCartes.length} sélectionnée(s)
                  </span>
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      if (!window.confirm(`Marquer ${selectedCartes.length} carte(s) comme payée(s) ?`)) return
                      try {
                        setSubmitting(true)
                        await Promise.all(
                          selectedCartes.map(carteId => 
                            updateCarteMembre(carteId, { statut_paiement: 'oui' })
                          )
                        )
                        alert(`${selectedCartes.length} carte(s) marquée(s) comme payée(s) !`)
                        setSelectedCartes([])
                        await loadData()
                      } catch (err) {
                        alert('Erreur : ' + err.message)
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                    disabled={submitting}
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '14px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ✓ Marquer payé
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      if (!window.confirm(`Marquer ${selectedCartes.length} carte(s) comme non payée(s) ?`)) return
                      try {
                        setSubmitting(true)
                        await Promise.all(
                          selectedCartes.map(carteId => 
                            updateCarteMembre(carteId, { statut_paiement: null })
                          )
                        )
                        alert(`${selectedCartes.length} carte(s) marquée(s) comme non payée(s) !`)
                        setSelectedCartes([])
                        await loadData()
                      } catch (err) {
                        alert('Erreur : ' + err.message)
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                    disabled={submitting}
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '14px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ✗ Marquer non payé
                  </button>
                  <button
                    onClick={() => setSelectedCartes([])}
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#475467',
                      border: '1px solid #e4e7ec',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Annuler sélection
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des cartes...</p>
              </div>
            ) : cartesPaginated.length === 0 ? (
              <div className="empty-state">
                <p>{searchCartes || filterStatutPaiement ? 'Aucune carte ne correspond aux filtres' : 'Aucune carte membre'}</p>
              </div>
            ) : (
              <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedCartes.length === cartesPaginated.length && cartesPaginated.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCartes(cartesPaginated.map(c => c.id))
                            } else {
                              setSelectedCartes([])
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th>Prénom</th>
                      <th>Nom</th>
                      <th>Numéro membre</th>
                      <th>Pays</th>
                      <th>Date émission</th>
                      <th>Date validité</th>
                      <th>Statut carte</th>
                      <th>Statut paiement</th>
                      <th>Tarif</th>
                        <th>PDF / Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartesPaginated.map((carte) => {
                      const tarif = carte.pays && (carte.pays.toLowerCase() === 'sénégal' || carte.pays.toLowerCase() === 'senegal') ? '2000 FCFA' : '10 €'
                      const statutPaiement = carte.statut_paiement === 'oui' ? 'Payé' : carte.statut_paiement === null ? 'Non payé' : 'En attente'
                      const statutPaiementColor = carte.statut_paiement === 'oui' ? '#10b981' : carte.statut_paiement === null ? '#ef4444' : '#f59e0b'
                      const isSelected = selectedCartes.includes(carte.id)
                      const isNonPaye = carte.statut_paiement !== 'oui'
                      
                      return (
                        <tr key={carte.id} style={{ background: isSelected ? '#f0f9ff' : 'transparent' }}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCartes([...selectedCartes, carte.id])
                                } else {
                                  setSelectedCartes(selectedCartes.filter(id => id !== carte.id))
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td>{carte.membre?.prenom || '—'}</td>
                          <td>{carte.membre?.nom || '—'}</td>
                          <td>{carte.numero_membre || '—'}</td>
                          <td>{carte.pays || '—'}</td>
                          <td>{carte.date_emission ? new Date(carte.date_emission).toLocaleDateString('fr-FR') : '—'}</td>
                          <td>{carte.date_validite ? new Date(carte.date_validite).toLocaleDateString('fr-FR') : '—'}</td>
                          <td>{carte.statut_carte || '—'}</td>
                          <td>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              background: statutPaiementColor + '20',
                              color: statutPaiementColor,
                              fontWeight: '600',
                              fontSize: '12px'
                            }}>
                              {statutPaiement}
                            </span>
                          </td>
                          <td>{tarif}</td>
                          <td>
                            {carte.lien_pdf ? (
                              <a 
                                href={carte.lien_pdf} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#2563eb', textDecoration: 'underline' }}
                              >
                                Voir PDF
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                            {isNonPaye && (
                              <button 
                                type="button" 
                                className="btn-link" 
                                onClick={async () => {
                                  try {
                                    if (!carte.membre?.id) {
                                      alert('Erreur : Impossible de trouver le membre associé à cette carte.')
                                      return
                                    }
                                    await createRelance({
                                      membre_id: carte.membre.id,
                                      type_relance: 'carte_membre',
                                      annee: new Date().getFullYear(),
                                      // Ne pas envoyer de commentaire personnalisé, laisser le backend générer le message propre
                                    })
                                    alert('Relance envoyée avec succès !')
                                  } catch (err) {
                                    alert('Erreur : ' + err.message)
                                  }
                                }}
                                style={{ 
                                  color: '#f59e0b', 
                                  fontSize: '12px',
                                  display: 'block',
                                  marginTop: '4px'
                                }}
                              >
                                📧 Relancer
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPagesCartes > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginTop: '20px',
                  padding: '16px',
                  borderTop: '1px solid #e4e7ec'
                }}>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Page {pageCartes} sur {totalPagesCartes}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPageCartes(p => Math.max(1, p - 1))}
                      disabled={pageCartes === 1}
                      className="btn-secondary"
                      style={{ 
                        padding: '8px 16px',
                        opacity: pageCartes === 1 ? 0.5 : 1,
                        cursor: pageCartes === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Précédent
                    </button>
                    <button
                      onClick={() => setPageCartes(p => Math.min(totalPagesCartes, p + 1))}
                      disabled={pageCartes >= totalPagesCartes}
                      className="btn-primary"
                      style={{ 
                        padding: '8px 16px',
                        opacity: pageCartes >= totalPagesCartes ? 0.5 : 1,
                        cursor: pageCartes >= totalPagesCartes ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              )}
            </>
            )}
          </div>
        </section>
      </div>
    )
  }

  // Composant de sélection multiple de membres avec recherche
  const MemberMultiSelect = ({ members, selectedIds, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const filteredMembers = members.filter(m => {
      const fullName = `${m.prenom} ${m.nom} ${m.numero_membre}`.toLowerCase()
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
      <div style={{ position: 'relative' }}>
        {/* Input de recherche et affichage des sélectionnés */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white',
            cursor: 'pointer',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.25rem'
          }}
        >
          {selectedMembers.length > 0 ? (
            selectedMembers.map(m => (
              <span
                key={m.id}
                style={{
                  backgroundColor: '#3b82f6',
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
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Barre de recherche */}
            <div style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="Rechercher un membre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                autoFocus
              />
            </div>

            {/* Liste des membres avec checkboxes */}
            <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
              {filteredMembers.length > 0 ? (
                filteredMembers.map(m => {
                  const isSelected = selectedIds.includes(m.id)
                  return (
                    <label
                      key={m.id}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.75rem',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#eff6ff' : 'white',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'white'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(m.id)}
                        style={{
                          marginRight: '0.75rem',
                          width: '1rem',
                          height: '1rem',
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>
                          {m.prenom} {m.nom}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {m.numero_membre}
                        </div>
                      </div>
                    </label>
                  )
                })
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun membre trouvé
                </div>
              )}
            </div>

            {/* Footer avec compteur */}
            {selectedIds.length > 0 && (
              <div style={{
                padding: '0.5rem',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '0.75rem',
                color: '#3b82f6',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                {selectedIds.length} membre(s) sélectionné(s)
              </div>
            )}
          </div>
        )}

        {/* Overlay pour fermer le dropdown */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
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
    const [groupesTravail, setGroupesTravail] = useState([])
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const loadData = async () => {
      setLoading(true)
      try {
        const [statsData, reunionsData, groupesData] = await Promise.all([
          fetchSecretariatStats(),
          fetchReunions({ limit: 10 }),
          fetchGroupesTravail(),
        ])
        setSecretariatStats(statsData || {})
        setReunions(Array.isArray(reunionsData) ? reunionsData : [])
        setGroupesTravail(Array.isArray(groupesData) ? groupesData : [])
      } catch (err) {
        console.error('Erreur chargement secrétariat:', err)
        setReunions([])
        setSecretariatStats({})
        setGroupesTravail([])
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      loadData()
    }, [])

    useEffect(() => {
      if (showModal) {
        // Initialiser formData selon le type de modal
        if (showModal === 'action') {
          setFormData({
            intitule: '',
            reunion_id: null,
            assignees: [],
            statut: 'en cours',
            deadline: null,
          })
        } else if (showModal === 'document') {
          setFormData({
            titre: '',
            categorie: '',
            description: '',
            lien_pdf: '',
            reunion_id: null,
            type_document: '',
          })
        } else {
          setFormData({})
        }
        
        const loadSelectData = async () => {
          try {
            // Le secrétariat peut accéder aux membres pour ajouter des participants
            // même sans permission explicite sur adhesion (géré par la dépendance)
            const membersData = await fetchAllMembers({ limit: 100 })
            setMembers(Array.isArray(membersData) ? membersData : [])
          } catch (err) {
            console.error('Erreur chargement données sélecteurs:', err)
            // Si l'erreur est due à une permission, afficher un message clair
            if (err.message?.includes('403') || err.message?.includes('Accès refusé')) {
              console.warn('Accès aux membres refusé. Vérifiez les permissions du module adhesion ou secretariat.')
            }
            setMembers([])
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
          // Formater les données pour correspondre au schéma DB
          const actionData = {
            intitule: formData.intitule,
            reunion_id: formData.reunion_id || null,
            groupe_travail_id: formData.groupe_travail_id || null,
            assignees: Array.isArray(formData.assignees) ? formData.assignees : [],
            statut: formData.statut || 'en cours',
            deadline: formData.deadline || null,
          }
          await createAction(actionData)
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
                      <label>Groupe de travail (optionnel)</label>
                      <select
                        value={formData.groupe_travail_id || ''}
                        onChange={(e) => setFormData({ ...formData, groupe_travail_id: e.target.value || null })}
                      >
                        <option value="">Aucun groupe (réunion indépendante)</option>
                        {groupesTravail.map((groupe) => (
                          <option key={groupe.id} value={groupe.id}>
                            {groupe.nom} - {groupe.projet?.titre || ''}
                          </option>
                        ))}
                      </select>
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
                      <label>Lier à une réunion (optionnel)</label>
                      <select
                        value={formData.reunion_id || ''}
                        onChange={(e) => setFormData({ ...formData, reunion_id: e.target.value || null })}
                      >
                        <option value="">Aucune réunion (action indépendante)</option>
                        {reunions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.titre} - {r.date_reunion ? new Date(r.date_reunion).toLocaleDateString('fr-FR') : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Groupe de travail (optionnel)</label>
                      <select
                        value={formData.groupe_travail_id || ''}
                        onChange={(e) => setFormData({ ...formData, groupe_travail_id: e.target.value || null })}
                      >
                        <option value="">Aucun groupe (action indépendante)</option>
                        {groupesTravail.map((groupe) => (
                          <option key={groupe.id} value={groupe.id}>
                            {groupe.nom} - {groupe.projet?.titre || ''}
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
                      <label>Assigné(s) à (optionnel)</label>
                      <MemberMultiSelect
                        members={members}
                        selectedIds={formData.assignees || []}
                        onChange={(selectedIds) => setFormData({ ...formData, assignees: selectedIds })}
                      />
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
                      <label>Deadline (optionnel)</label>
                      <input
                        type="date"
                        value={formData.deadline || ''}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value || null })}
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
                        <option value="Procès-verbal">Procès-verbal</option>
                        <option value="Compte rendu">Compte rendu</option>
                        <option value="Rapport">Rapport</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description du document (optionnel)"
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
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Lier à une réunion (optionnel)</label>
                      <select
                        value={formData.reunion_id || ''}
                        onChange={(e) => setFormData({ ...formData, reunion_id: e.target.value || null })}
                      >
                        <option value="">Aucune (document indépendant)</option>
                        {reunions && reunions.length > 0 ? (
                          reunions.map((reunion) => (
                            <option key={reunion.id} value={reunion.id}>
                              {reunion.titre} - {reunion.date_reunion ? new Date(reunion.date_reunion).toLocaleDateString('fr-FR') : ''}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Chargement des réunions...</option>
                        )}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Type de document (optionnel)</label>
                      <input
                        type="text"
                        value={formData.type_document || ''}
                        onChange={(e) => setFormData({ ...formData, type_document: e.target.value })}
                        placeholder="Ex: PDF, Word, Excel..."
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
    const [selectedFormateurs, setSelectedFormateurs] = useState([]) // Formateurs sélectionnés pour la formation
    const [selectedFormationsForFormateur, setSelectedFormationsForFormateur] = useState([]) // Formations sélectionnées pour le formateur
    const [editingId, setEditingId] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [filters, setFilters] = useState({ search: '', categorie: '', statut: '' })
    const [formateurSearch, setFormateurSearch] = useState('') // Recherche de formateurs
    const [activeTab, setActiveTab] = useState('formations') // 'formations', 'sessions', 'inscriptions', 'formateurs'
    const [exporting, setExporting] = useState(false)
    const [selectedInscriptionIds, setSelectedInscriptionIds] = useState([])
    const [inscriptionsPage, setInscriptionsPage] = useState(1)
    const [inscriptionsPagination, setInscriptionsPagination] = useState({ total: 0, totalPages: 1, limit: 50 })
    const [inscriptionsSearch, setInscriptionsSearch] = useState('')
    const [inscriptionsSortBy, setInscriptionsSortBy] = useState('')
    const [inscriptionsSortOrder, setInscriptionsSortOrder] = useState('asc')
    const [inscriptionsFilterMembre, setInscriptionsFilterMembre] = useState('') // 'all', 'member', 'non-member'
    const [inscriptionsFilterFormation, setInscriptionsFilterFormation] = useState('') // formation_id
    
    // États pour les actions optimistes et loading
    const [loadingActions, setLoadingActions] = useState({})
    const [loadingInscriptions, setLoadingInscriptions] = useState(false)
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
    
    // Fonction pour afficher un toast
    const showToast = useCallback((message, type = 'success') => {
      setToast({ show: true, message, type })
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
    }, [])

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const [statsData, formationsData, sessionsData, inscriptionsResult, formateursData] = await Promise.all([
          fetchFormationStats(),
          fetchFormations({ page: 1, limit: 50 }),
          fetchSessions({ page: 1, limit: 50 }),
          fetchInscriptions({ page: 1, limit: 50 }), // Toujours charger la page 1 au début
          fetchFormateurs(),
        ])
        setStats(statsData || {})
        setFormations(Array.isArray(formationsData) ? formationsData : [])
        setSessions(Array.isArray(sessionsData) ? sessionsData : [])
        // Handle both array and object with pagination
        if (inscriptionsResult && typeof inscriptionsResult === 'object' && inscriptionsResult.inscriptions) {
          setInscriptions(Array.isArray(inscriptionsResult.inscriptions) ? inscriptionsResult.inscriptions : [])
          setInscriptionsPagination(inscriptionsResult.pagination || { total: 0, totalPages: 1, limit: 50 })
        } else {
          setInscriptions(Array.isArray(inscriptionsResult) ? inscriptionsResult : [])
          // Si c'est un array, on peut estimer la pagination (mais ce n'est pas idéal)
          if (Array.isArray(inscriptionsResult) && inscriptionsResult.length === 50) {
            setInscriptionsPagination({ total: 50, totalPages: 1, limit: 50 })
          }
        }
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

    // Charger les inscriptions lorsque la page change ou quand on active l'onglet inscriptions
    const loadInscriptions = useCallback(async () => {
      setLoadingInscriptions(true)
      try {
        // Toujours utiliser une limite fixe (50) - la pagination se fait côté serveur
        // Le tri et la recherche sont appliqués AVANT la pagination côté serveur
        const limit = 50
        const inscriptionsResult = await fetchInscriptions({ 
          page: inscriptionsPage, 
          limit,
          search: inscriptionsSearch,
          sortBy: inscriptionsSortBy,
          sortOrder: inscriptionsSortOrder,
          formation_id: inscriptionsFilterFormation || '',
          is_member: inscriptionsFilterMembre === 'member' ? true : inscriptionsFilterMembre === 'non-member' ? false : undefined
        })
        console.log('🔍 Filtres envoyés:', { 
          formation_id: inscriptionsFilterFormation || '', 
          is_member: inscriptionsFilterMembre === 'member' ? true : inscriptionsFilterMembre === 'non-member' ? false : undefined,
          filterMembre: inscriptionsFilterMembre
        })
        if (inscriptionsResult && typeof inscriptionsResult === 'object' && inscriptionsResult.inscriptions) {
          setInscriptions(Array.isArray(inscriptionsResult.inscriptions) ? inscriptionsResult.inscriptions : [])
          setInscriptionsPagination(inscriptionsResult.pagination || { total: 0, totalPages: 1, limit })
        } else {
          setInscriptions(Array.isArray(inscriptionsResult) ? inscriptionsResult : [])
        }
      } catch (err) {
        console.error('Erreur chargement inscriptions:', err)
        setInscriptions([])
      } finally {
        setLoadingInscriptions(false)
      }
    }, [inscriptionsPage, inscriptionsSearch, inscriptionsSortBy, inscriptionsSortOrder, inscriptionsFilterMembre, inscriptionsFilterFormation])

    // Réinitialiser la page à 1 quand la recherche ou le tri change
    useEffect(() => {
      if (activeTab === 'inscriptions' && (inscriptionsSearch || inscriptionsSortBy || inscriptionsFilterMembre || inscriptionsFilterFormation)) {
        setInscriptionsPage(1)
      }
    }, [activeTab, inscriptionsSearch, inscriptionsSortBy, inscriptionsFilterMembre, inscriptionsFilterFormation])

    useEffect(() => {
      if (activeTab === 'inscriptions') {
        // Toujours recharger quand on change de page, recherche, tri ou onglet
        // Le backend applique WHERE + ORDER BY avant LIMIT/OFFSET
        loadInscriptions()
      }
    }, [activeTab, inscriptionsPage, inscriptionsSearch, inscriptionsSortBy, inscriptionsSortOrder, loadInscriptions])

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        if (showModal === 'formation') {
          // Validation : maximum 2 formateurs
          if (selectedFormateurs.length > 2) {
            alert('Vous ne pouvez sélectionner que 2 formateurs maximum par formation.')
            setSubmitting(false)
            return
          }
          
          // Validation : au moins 1 formateur requis
          if (selectedFormateurs.length === 0) {
            alert('Veuillez sélectionner au moins un formateur pour cette formation.')
            setSubmitting(false)
            return
          }
          
          let formationId
          if (editingId) {
            await updateFormation(editingId, formData)
            formationId = editingId
            alert('Formation mise à jour avec succès !')
          } else {
            const newFormation = await createFormation(formData)
            formationId = newFormation?.id || newFormation?.data?.id
            alert('Formation créée avec succès !')
          }
          
          // Gérer les associations formateurs (many-to-many)
          if (formationId && selectedFormateurs.length > 0) {
            try {
              // Importer supabaseFormation depuis le config
              const { supabaseFormation } = await import('../../public/config/supabase.config')
              
              // Supprimer toutes les associations existantes pour cette formation
              const { error: deleteError } = await supabaseFormation
                .from('formation_formateurs')
                .delete()
                .eq('formation_id', formationId)
              
              if (deleteError) {
                console.error('Erreur lors de la suppression des associations existantes:', deleteError)
                // On continue quand même pour essayer d'insérer
              }
              
              // Créer les nouvelles associations
              const associations = selectedFormateurs.map((formateurId, index) => ({
                formation_id: formationId,
                formateur_id: formateurId,
                role: index === 0 ? 'Formateur principal' : 'Formateur',
                ordre: index + 1
              }))
              
              console.log('Tentative d\'insertion des associations:', associations)
              
              const { data: insertData, error: assocError } = await supabaseFormation
                .from('formation_formateurs')
                .insert(associations)
                .select()
              
              if (assocError) {
                console.error('Erreur détaillée lors de l\'association des formateurs:', {
                  error: assocError,
                  code: assocError.code,
                  message: assocError.message,
                  details: assocError.details,
                  hint: assocError.hint,
                  associations: associations
                })
                alert(`Formation enregistrée mais erreur lors de l'association des formateurs:\n${assocError.message || assocError.code || 'Erreur inconnue'}\n\nVérifiez que les politiques RLS sont configurées (script sql_rls_formation_formateurs.sql)`)
              } else {
                console.log('Associations créées avec succès:', insertData)
              }
            } catch (err) {
              console.error('Erreur lors de la gestion des formateurs:', err)
              alert(`Formation enregistrée mais erreur lors de l'association des formateurs:\n${err.message || 'Erreur inconnue'}`)
            }
          } else if (formationId) {
            // Si aucun formateur sélectionné, supprimer toutes les associations
            try {
              const { supabaseFormation } = await import('../../public/config/supabase.config')
              await supabaseFormation
                .from('formation_formateurs')
                .delete()
                .eq('formation_id', formationId)
            } catch (err) {
              console.error('Erreur lors de la suppression des associations:', err)
            }
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
          let formateurId
          if (editingId) {
            await updateFormateur(editingId, formData)
            formateurId = editingId
            alert('Formateur mis à jour avec succès !')
          } else {
            const newFormateur = await createFormateur(formData)
            formateurId = newFormateur?.id || newFormateur?.data?.id
            alert('Formateur créé avec succès !')
          }
          
          // Gérer les associations formations (many-to-many)
          if (formateurId && selectedFormationsForFormateur.length > 0) {
            try {
              const { supabaseFormation } = await import('../../public/config/supabase.config')
              
              // Supprimer toutes les associations existantes pour ce formateur
              const { error: deleteError } = await supabaseFormation
                .from('formation_formateurs')
                .delete()
                .eq('formateur_id', formateurId)
              
              if (deleteError) {
                console.error('Erreur lors de la suppression des associations existantes:', deleteError)
                // On continue quand même pour essayer d'insérer
              }
              
              // Créer les nouvelles associations
              const associations = selectedFormationsForFormateur.map((formationId, index) => ({
                formation_id: formationId,
                formateur_id: formateurId,
                role: index === 0 ? 'Formateur principal' : 'Formateur',
                ordre: index + 1
              }))
              
              console.log('Tentative d\'insertion des associations:', associations)
              
              const { data: insertData, error: assocError } = await supabaseFormation
                .from('formation_formateurs')
                .insert(associations)
                .select()
              
              if (assocError) {
                console.error('Erreur détaillée lors de l\'association des formations:', {
                  error: assocError,
                  code: assocError.code,
                  message: assocError.message,
                  details: assocError.details,
                  hint: assocError.hint,
                  associations: associations
                })
                alert(`Formateur enregistré mais erreur lors de l'association des formations:\n${assocError.message || assocError.code || 'Erreur inconnue'}\n\nVérifiez que les politiques RLS sont configurées (script sql_rls_formation_formateurs.sql)`)
              } else {
                console.log('Associations créées avec succès:', insertData)
              }
            } catch (err) {
              console.error('Erreur lors de la gestion des formations:', err)
              alert(`Formateur enregistré mais erreur lors de l'association des formations:\n${err.message || 'Erreur inconnue'}`)
            }
          } else if (formateurId) {
            // Si aucune formation sélectionnée, supprimer toutes les associations
            try {
              const { supabaseFormation } = await import('../../public/config/supabase.config')
              await supabaseFormation
                .from('formation_formateurs')
                .delete()
                .eq('formateur_id', formateurId)
            } catch (err) {
              console.error('Erreur lors de la suppression des associations:', err)
            }
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
      
      if (type === 'inscription') {
        const actionKey = `delete-${id}`
        const inscription = inscriptions.find(i => i.id === id)
        if (!inscription) return
        
        // Sauvegarder pour rollback
        const previousInscriptions = [...inscriptions]
        
        // Optimistic update
        setInscriptions(prev => prev.filter(i => i.id !== id))
        setSelectedInscriptionIds(prev => prev.filter(selectedId => selectedId !== id))
        setLoadingActions(prev => ({ ...prev, [actionKey]: true }))
        
        try {
          await deleteInscription(id)
          showToast('Inscription supprimée avec succès !', 'success')
          // Mettre à jour le total de pagination
          setInscriptionsPagination(prev => ({
            ...prev,
            total: Math.max(0, (prev.total || 0) - 1),
            totalPages: Math.ceil(Math.max(0, (prev.total || 0) - 1) / prev.limit)
          }))
        } catch (err) {
          // Rollback
          setInscriptions(previousInscriptions)
          showToast(err.message || 'Erreur lors de la suppression', 'error')
        } finally {
          setLoadingActions(prev => {
            const next = { ...prev }
            delete next[actionKey]
            return next
          })
        }
      } else {
        // Pour les autres types, garder le comportement actuel
        try {
          if (type === 'formation') await deleteFormation(id)
          else if (type === 'session') await deleteSession(id)
          else if (type === 'formateur') await deleteFormateur(id)
          showToast('Élément supprimé avec succès !', 'success')
          await loadData()
        } catch (err) {
          showToast(err.message || 'Erreur lors de la suppression', 'error')
        }
      }
    }

    const handleConfirmInscription = async (id) => {
      const actionKey = `confirm-${id}`
      const inscription = inscriptions.find(i => i.id === id)
      if (!inscription) return
      
      // Sauvegarder l'état précédent pour rollback
      const previousState = { ...inscription }
      
      // Optimistic update
      setInscriptions(prev => prev.map(i => 
        i.id === id ? { ...i, status: 'confirmed' } : i
      ))
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }))
      
      try {
        await confirmInscription(id)
        showToast('Inscription confirmée avec succès !', 'success')
        // Recharger silencieusement (sans loading global) pour avoir les données à jour
        const limit = 50
        const inscriptionsResult = await fetchInscriptions({ 
          page: inscriptionsPage, 
          limit,
          search: inscriptionsSearch,
          sortBy: inscriptionsSortBy,
          sortOrder: inscriptionsSortOrder
        })
        if (inscriptionsResult && typeof inscriptionsResult === 'object' && inscriptionsResult.inscriptions) {
          setInscriptions(Array.isArray(inscriptionsResult.inscriptions) ? inscriptionsResult.inscriptions : [])
          setInscriptionsPagination(inscriptionsResult.pagination || { total: 0, totalPages: 1, limit })
        }
      } catch (err) {
        // Rollback en cas d'erreur
        setInscriptions(prev => prev.map(i => 
          i.id === id ? previousState : i
        ))
        showToast(err.message || 'Erreur lors de la confirmation', 'error')
      } finally {
        setLoadingActions(prev => {
          const next = { ...prev }
          delete next[actionKey]
          return next
        })
      }
    }

    const handleRejectInscription = async (id) => {
      const actionKey = `reject-${id}`
      const inscription = inscriptions.find(i => i.id === id)
      if (!inscription) return
      
      // Sauvegarder l'état précédent pour rollback
      const previousState = { ...inscription }
      
      // Optimistic update
      setInscriptions(prev => prev.map(i => 
        i.id === id ? { ...i, status: 'cancelled' } : i
      ))
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }))
      
      try {
        await rejectInscription(id)
        showToast('Inscription rejetée avec succès !', 'success')
        // Recharger silencieusement (sans loading global)
        const limit = 50
        const inscriptionsResult = await fetchInscriptions({ 
          page: inscriptionsPage, 
          limit,
          search: inscriptionsSearch,
          sortBy: inscriptionsSortBy,
          sortOrder: inscriptionsSortOrder
        })
        if (inscriptionsResult && typeof inscriptionsResult === 'object' && inscriptionsResult.inscriptions) {
          setInscriptions(Array.isArray(inscriptionsResult.inscriptions) ? inscriptionsResult.inscriptions : [])
          setInscriptionsPagination(inscriptionsResult.pagination || { total: 0, totalPages: 1, limit })
        }
      } catch (err) {
        // Rollback en cas d'erreur
        setInscriptions(prev => prev.map(i => 
          i.id === id ? previousState : i
        ))
        showToast(err.message || 'Erreur lors du rejet', 'error')
      } finally {
        setLoadingActions(prev => {
          const next = { ...prev }
          delete next[actionKey]
          return next
        })
      }
    }

    const handleSendInvitation = async (id) => {
      const accessLink = window.prompt(
        "Lien d'accès au cours (Zoom, Teams, Meet...) :",
        ''
      )
      if (!accessLink) return
      
      const actionKey = `invite-${id}`
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }))
      
      try {
        await sendInscriptionInvitation(id, accessLink)
        showToast("Invitation envoyée avec succès à l'inscrit.", 'success')
      } catch (err) {
        showToast(err.message || "Erreur lors de l'envoi de l'invitation", 'error')
      } finally {
        setLoadingActions(prev => {
          const next = { ...prev }
          delete next[actionKey]
          return next
        })
      }
    }

    // Plus besoin de filteredInscriptions côté client car la recherche est côté serveur
    const filteredInscriptions = inscriptions

    const allVisibleSelected =
      filteredInscriptions.length > 0 &&
      filteredInscriptions.every((i) => selectedInscriptionIds.includes(i.id))

    const toggleSelectInscription = (id) => {
      setSelectedInscriptionIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    }

    const toggleSelectAllVisible = () => {
      if (allVisibleSelected) {
        // Désélectionner seulement les visibles
        setSelectedInscriptionIds((prev) =>
          prev.filter((id) => !filteredInscriptions.some((i) => i.id === id))
        )
      } else {
        // Ajouter toutes les visibles
        setSelectedInscriptionIds((prev) => {
          const allIds = [...prev, ...filteredInscriptions.map((i) => i.id)]
          return Array.from(new Set(allIds))
        })
      }
    }

    const handleBulkInscriptionsAction = async (action) => {
      if (selectedInscriptionIds.length === 0) {
        showToast('Sélectionnez au moins une inscription.', 'error')
        return
      }

      if (
        action === 'delete' &&
        !window.confirm(
          `Supprimer définitivement ${selectedInscriptionIds.length} inscription(s) ?`
        )
      ) {
        return
      }

      const actionKey = `bulk-${action}`
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }))
      
      // Sauvegarder les états précédents pour rollback
      const previousStates = selectedInscriptionIds.map(id => {
        const ins = inscriptions.find(i => i.id === id)
        return ins ? { id, state: { ...ins } } : null
      }).filter(Boolean)

      try {
        if (action === 'invite') {
          // Ne garder que les inscriptions confirmées
          const confirmedIds = selectedInscriptionIds.filter((id) => {
            const ins = inscriptions.find((i) => i.id === id)
            return ins && ins.status === 'confirmed'
          })

          if (confirmedIds.length === 0) {
            showToast('Aucune des inscriptions sélectionnées n\'est confirmée.', 'error')
            return
          }

          const accessLink = window.prompt(
            "Lien d'accès (Zoom, Teams, etc.) à envoyer à tous les participants confirmés :",
            ''
          )
          if (!accessLink) return

          // Envoyer les invitations en parallèle
          await Promise.all(
            confirmedIds.map(id => sendInscriptionInvitation(id, accessLink))
          )

          showToast(`Invitations envoyées avec succès à ${confirmedIds.length} participant(s).`, 'success')
          setSelectedInscriptionIds([])
          return
        }

        // Actions bulk : confirm, reject, delete
        // Optimistic updates
        if (action === 'confirm') {
          setInscriptions(prev => prev.map(i => 
            selectedInscriptionIds.includes(i.id) ? { ...i, status: 'confirmed' } : i
          ))
        } else if (action === 'reject') {
          setInscriptions(prev => prev.map(i => 
            selectedInscriptionIds.includes(i.id) ? { ...i, status: 'rejected' } : i
          ))
        } else if (action === 'delete') {
          setInscriptions(prev => prev.filter(i => !selectedInscriptionIds.includes(i.id)))
          setInscriptionsPagination(prev => ({
            ...prev,
            total: Math.max(0, (prev.total || 0) - selectedInscriptionIds.length),
            totalPages: Math.ceil(Math.max(0, (prev.total || 0) - selectedInscriptionIds.length) / prev.limit)
          }))
        }

        // Exécuter les actions en parallèle
        await Promise.all(
          selectedInscriptionIds.map(id => {
            if (action === 'confirm') return confirmInscription(id)
            else if (action === 'reject') return rejectInscription(id)
            else if (action === 'delete') return deleteInscription(id)
          })
        )

        const message =
          action === 'confirm'
            ? `${selectedInscriptionIds.length} inscription(s) confirmée(s) avec succès !`
            : action === 'reject'
            ? `${selectedInscriptionIds.length} inscription(s) rejetée(s) avec succès !`
            : `${selectedInscriptionIds.length} inscription(s) supprimée(s) avec succès !`

        showToast(message, 'success')
        setSelectedInscriptionIds([])
        
        // Recharger silencieusement (sans loading global) pour avoir les données à jour
        const limit = 50
        const inscriptionsResult = await fetchInscriptions({ 
          page: inscriptionsPage, 
          limit,
          search: inscriptionsSearch,
          sortBy: inscriptionsSortBy,
          sortOrder: inscriptionsSortOrder
        })
        if (inscriptionsResult && typeof inscriptionsResult === 'object' && inscriptionsResult.inscriptions) {
          setInscriptions(Array.isArray(inscriptionsResult.inscriptions) ? inscriptionsResult.inscriptions : [])
          setInscriptionsPagination(inscriptionsResult.pagination || { total: 0, totalPages: 1, limit })
        }
      } catch (err) {
        // Rollback en cas d'erreur
        if (action === 'confirm' || action === 'reject') {
          setInscriptions(prev => prev.map(i => {
            const previous = previousStates.find(p => p?.id === i.id)
            return previous ? previous.state : i
          }))
        } else if (action === 'delete') {
          setInscriptions(prev => {
            const restored = [...prev]
            previousStates.forEach(p => {
              if (p && !restored.find(i => i.id === p.id)) {
                restored.push(p.state)
              }
            })
            return restored
          })
          setInscriptionsPagination(prev => ({
            ...prev,
            total: (prev.total || 0) + selectedInscriptionIds.length,
            totalPages: Math.ceil((prev.total || 0) + selectedInscriptionIds.length / prev.limit)
          }))
        }
        showToast(err.message || 'Erreur lors du traitement des inscriptions sélectionnées', 'error')
      } finally {
        setLoadingActions(prev => {
          const next = { ...prev }
          delete next[actionKey]
          return next
        })
      }
    }

    // Calculer les KPI avancés
    const calculatedStats = useMemo(() => {
      const confirmedInscriptions = inscriptions.filter(i => i.status === 'confirmed')
      const totalRevenus = confirmedInscriptions.reduce((sum, i) => {
        const formation = formations.find(f => f.id === i.formation_id)
        return sum + (formation?.prix || 0)
      }, 0)
      
      const tauxRemplissage = formations.length > 0 ? formations.reduce((sum, f) => {
        const formationInscriptions = inscriptions.filter(i => i.formation_id === f.id && i.status === 'confirmed')
        const max = f.participants_max || 0
        if (max === 0) return sum
        return sum + (formationInscriptions.length / max * 100)
      }, 0) / formations.length : 0

      const inscriptionsParFormation = formations.map(f => {
        const formationInscriptions = inscriptions.filter(i => i.formation_id === f.id)
        return {
          formation: f.titre,
          total: formationInscriptions.length,
          confirmed: formationInscriptions.filter(i => i.status === 'confirmed').length,
          pending: formationInscriptions.filter(i => i.status === 'pending').length
        }
      })

      return {
        totalRevenus,
        tauxRemplissage,
        inscriptionsParFormation,
        formateursActifs: formateurs.length,
        formationsAvecFormateurs: formations.filter(f => 
          f.formateurs_list?.length > 0 || f.formateur_id
        ).length
      }
    }, [formations, inscriptions, formateurs])

    // Handlers d'export
    const handleExportFormations = () => {
      try {
        setExporting(true)
        exportFormationsToExcel(formations, sessions, inscriptions, formateurs)
      } catch (err) {
        alert('Erreur lors de l\'export : ' + err.message)
      } finally {
        setExporting(false)
      }
    }

    const handleExportInscriptions = async () => {
      try {
        setExporting(true)
        // Récupérer TOUTES les inscriptions pour l'export (sans limite de pagination)
        const allInscriptions = []
        let currentPage = 1
        let hasMore = true
        const limit = 500 // Limite maximale par page
        
        while (hasMore) {
          try {
            const result = await fetchInscriptions({ 
              page: currentPage, 
              limit,
              formation_id: inscriptionsFilterFormation || '',
              status: '',
              search: '',
              sortBy: '',
              sortOrder: 'asc'
            })
            
            const inscriptionsData = Array.isArray(result) ? result : (result?.inscriptions || [])
            allInscriptions.push(...inscriptionsData)
            
            const pagination = result?.pagination || {}
            if (pagination.totalPages && currentPage < pagination.totalPages) {
              currentPage++
            } else {
              hasMore = false
            }
          } catch (err) {
            console.warn('Erreur lors du chargement des inscriptions (page ' + currentPage + '):', err)
            hasMore = false
          }
        }
        
        exportInscriptionsToExcel(allInscriptions, formations)
      } catch (err) {
        alert('Erreur lors de l\'export : ' + err.message)
      } finally {
        setExporting(false)
      }
    }

    const handleExportFormateurs = () => {
      try {
        setExporting(true)
        exportFormateursToExcel(formateurs, formations, inscriptions)
      } catch (err) {
        alert('Erreur lors de l\'export : ' + err.message)
      } finally {
        setExporting(false)
      }
    }

    const handleExportPDF = (period = 'month') => {
      try {
        setExporting(true)
        exportFormationsToPDF(formations, sessions, inscriptions, formateurs, period)
      } catch (err) {
        alert('Erreur lors de l\'export PDF : ' + err.message)
      } finally {
        setExporting(false)
      }
    }

    useEffect(() => {
      if (!showModal) {
        setFormData({})
        setSelectedFormateurs([])
        setSelectedFormationsForFormateur([])
        setEditingId(null)
        setFormateurSearch('') // Réinitialiser la recherche
      }
    }, [showModal])
    
    // Charger les formateurs associés lors de l'édition d'une formation
    useEffect(() => {
      const loadFormationFormateurs = async () => {
        if (showModal === 'formation' && editingId) {
          try {
            const { supabaseFormation } = await import('../../public/config/supabase.config')
            const { data: associations, error } = await supabaseFormation
              .from('formation_formateurs')
              .select('formateur_id')
              .eq('formation_id', editingId)
              .order('ordre', { ascending: true })
            
            if (!error && associations) {
              setSelectedFormateurs(associations.map(a => a.formateur_id))
            } else {
              // Fallback : utiliser formateur_id si la table de liaison n'existe pas encore
              if (formData.formateur_id) {
                setSelectedFormateurs([formData.formateur_id])
              }
            }
          } catch (err) {
            console.error('Erreur lors du chargement des formateurs:', err)
            // Fallback
            if (formData.formateur_id) {
              setSelectedFormateurs([formData.formateur_id])
            }
          }
        } else if (showModal === 'formation' && !editingId) {
          // Nouvelle formation : réinitialiser
          setSelectedFormateurs([])
        }
      }
      
      loadFormationFormateurs()
    }, [showModal, editingId, formData.formateur_id])
    
    // Charger les formations associées lors de l'édition d'un formateur
    useEffect(() => {
      const loadFormateurFormations = async () => {
        if (showModal === 'formateur' && editingId) {
          try {
            const { supabaseFormation } = await import('../../public/config/supabase.config')
            const { data: associations, error } = await supabaseFormation
              .from('formation_formateurs')
              .select('formation_id')
              .eq('formateur_id', editingId)
              .order('ordre', { ascending: true })
            
            if (!error && associations) {
              setSelectedFormationsForFormateur(associations.map(a => a.formation_id))
            }
          } catch (err) {
            console.error('Erreur lors du chargement des formations du formateur:', err)
          }
        } else if (showModal === 'formateur' && !editingId) {
          // Nouveau formateur : réinitialiser
          setSelectedFormationsForFormateur([])
        }
      }
      
      loadFormateurFormations()
    }, [showModal, editingId])

    // Ne plus bloquer tout le composant - afficher les KPI et les sections même pendant le chargement initial
    // Seulement afficher un loading discret pour les inscriptions si nécessaire

    return (
      <div className="module-content">
        {/* KPI Section Améliorée */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Formations actives</p>
              <p className="kpi-value">{formations.filter(f => f.is_active).length}</p>
              <p className="card-subtitle">{formations.length} au total</p>
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
              <p className="card-subtitle">{stats.confirmed_inscriptions || 0} confirmées</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Revenus estimés</p>
              <p className="kpi-value">{calculatedStats.totalRevenus.toFixed(0)} €</p>
              <p className="card-subtitle">Inscriptions confirmées</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Taux de remplissage</p>
              <p className="kpi-value">{calculatedStats.tauxRemplissage.toFixed(1)}%</p>
              <p className="card-subtitle">Moyenne toutes formations</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon teal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Formateurs actifs</p>
              <p className="kpi-value">{calculatedStats.formateursActifs}</p>
              <p className="card-subtitle">{calculatedStats.formationsAvecFormateurs} formations avec formateurs</p>
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
              <p className="card-subtitle">À valider</p>
            </div>
          </div>
        </section>

        {/* Barre d'actions avec exports */}
        <section style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              onClick={() => { setShowModal('formation'); setEditingId(null); setFormData({}) }}
            >
              + Formation
            </button>
            <button 
              className="btn-primary" 
              onClick={() => { setShowModal('session'); setEditingId(null); setFormData({}) }}
            >
              + Session
            </button>
            <button 
              className="btn-primary" 
              onClick={() => { setShowModal('formateur'); setEditingId(null); setFormData({}) }}
            >
              + Formateur
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-secondary" 
              onClick={handleExportFormations}
              disabled={exporting}
              title="Exporter les formations en Excel"
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                if (!exporting) e.target.style.background = '#218838'
              }}
              onMouseLeave={(e) => {
                if (!exporting) e.target.style.background = '#28a745'
              }}
            >
              📊 Excel Formations
            </button>
            <button 
              className="btn-secondary" 
              onClick={handleExportInscriptions}
              disabled={exporting}
              title="Exporter les inscriptions en Excel"
              style={{
                background: '#ffc107',
                color: '#212529',
                border: 'none',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                if (!exporting) e.target.style.background = '#e0a800'
              }}
              onMouseLeave={(e) => {
                if (!exporting) e.target.style.background = '#ffc107'
              }}
            >
              📋 Excel Inscriptions
            </button>
            <button 
              className="btn-secondary" 
              onClick={handleExportFormateurs}
              disabled={exporting}
              title="Exporter les formateurs en Excel"
              style={{
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                if (!exporting) e.target.style.background = '#5a32a3'
              }}
              onMouseLeave={(e) => {
                if (!exporting) e.target.style.background = '#6f42c1'
              }}
            >
              👤 Excel Formateurs
            </button>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                className="btn-secondary" 
                disabled={exporting}
                title="Exporter un rapport PDF"
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => {
                  if (!exporting) {
                    e.target.style.background = '#c82333'
                    const dropdown = e.currentTarget.nextElementSibling
                    if (dropdown) dropdown.style.display = 'block'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!exporting) {
                    e.target.style.background = '#dc3545'
                    const dropdown = e.currentTarget.nextElementSibling
                    if (dropdown) {
                      setTimeout(() => {
                        if (!dropdown.matches(':hover')) {
                          dropdown.style.display = 'none'
                        }
                      }, 100)
                    }
                  }
                }}
              >
                📄 PDF Rapport
              </button>
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.25rem',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'none',
                  zIndex: 1000,
                  minWidth: '150px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.display = 'block'}
                onMouseLeave={(e) => e.currentTarget.style.display = 'none'}
              >
                <button
                  type="button"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#212529',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e9ecef'
                    e.target.style.color = '#0066CC'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.color = '#212529'
                  }}
                  onClick={(e) => { 
                    handleExportPDF('month')
                    e.currentTarget.closest('div').style.display = 'none'
                  }}
                >
                  📅 Mensuel
                </button>
                <button
                  type="button"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    borderTop: '1px solid #dee2e6',
                    color: '#212529',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e9ecef'
                    e.target.style.color = '#0066CC'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.color = '#212529'
                  }}
                  onClick={(e) => { 
                    handleExportPDF('year')
                    e.currentTarget.closest('div').style.display = 'none'
                  }}
                >
                  📆 Annuel
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Onglets */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '2px solid #e0e0e0',
            marginBottom: '1.5rem'
          }}>
            {[
              { id: 'formations', label: '📚 Formations', count: formations.length },
              { id: 'sessions', label: '📅 Sessions', count: sessions.length },
              { id: 'inscriptions', label: '👥 Inscriptions', count: stats.total_inscriptions || inscriptions.length },
              { id: 'formateurs', label: '👨‍🏫 Formateurs', count: formateurs.length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: activeTab === tab.id ? 'rgba(0,102,204,0.1)' : 'transparent',
                  borderBottom: activeTab === tab.id ? '3px solid #0066CC' : '3px solid transparent',
                  color: activeTab === tab.id ? '#0066CC' : '#495057',
                  fontWeight: activeTab === tab.id ? '700' : '500',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  position: 'relative',
                  bottom: '-2px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#0066CC'
                    e.target.style.background = 'rgba(0,102,204,0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#495057'
                    e.target.style.background = 'transparent'
                  }
                }}
              >
                {tab.label} <span style={{ 
                  marginLeft: '0.5rem',
                  padding: '0.2rem 0.5rem',
                  background: activeTab === tab.id ? '#0066CC' : '#e0e0e0',
                  color: activeTab === tab.id ? 'white' : '#666',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>{tab.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Contenu conditionnel selon l'onglet */}
        {activeTab === 'formations' && (
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">📚 Formations</h3>
                  <p className="card-subtitle">{formations.length} formation{formations.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #0066CC',
                      borderRadius: '5px',
                      fontSize: '0.9rem',
                      background: 'white',
                      color: '#212529',
                      fontWeight: '500',
                      minWidth: '200px'
                    }}
                  />
                  <select
                    value={filters.categorie}
                    onChange={(e) => setFilters({ ...filters, categorie: e.target.value })}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #0066CC',
                      borderRadius: '5px',
                      fontSize: '0.9rem',
                      background: 'white',
                      color: '#212529',
                      fontWeight: '500',
                      minWidth: '200px'
                    }}
                  >
                    <option value="">Toutes les catégories</option>
                    {[...new Set(formations.map(f => f.categorie).filter(Boolean))].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Catégorie</th>
                      <th>Formateurs</th>
                      <th>Mode</th>
                      <th>Prix</th>
                      <th>Inscriptions</th>
                      <th>Revenus</th>
                      <th>Inscriptions</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formations
                      .filter(f => {
                        const searchMatch = !filters.search || 
                          f.titre?.toLowerCase().includes(filters.search.toLowerCase()) ||
                          f.categorie?.toLowerCase().includes(filters.search.toLowerCase())
                        const categorieMatch = !filters.categorie || f.categorie === filters.categorie
                        return searchMatch && categorieMatch
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>Aucune formation</td>
                      </tr>
                    ) : (
                      formations
                        .filter(f => {
                          const searchMatch = !filters.search || 
                            f.titre?.toLowerCase().includes(filters.search.toLowerCase()) ||
                            f.categorie?.toLowerCase().includes(filters.search.toLowerCase())
                          const categorieMatch = !filters.categorie || f.categorie === filters.categorie
                          return searchMatch && categorieMatch
                        })
                        .map((formation) => {
                          const formationFormateurs = formateurs.filter(f => 
                            formation.formateurs_list?.some(ff => ff.id === f.id) || 
                            formation.formateur_id === f.id
                          )
                          // Utiliser les stats de la base de données si disponibles, sinon calculer depuis les inscriptions chargées
                          const confirmedCount = formation.confirmed_count !== undefined ? formation.confirmed_count : inscriptions.filter(i => i.formation_id === formation.id && i.status === 'confirmed').length
                          const totalInscriptions = formation.inscriptions_count !== undefined ? formation.inscriptions_count : inscriptions.filter(i => i.formation_id === formation.id).length
                          const revenus = confirmedCount * (formation.prix || 0)
                          
                          return (
                            <tr key={formation.id}>
                              <td style={{ fontWeight: '600' }}>{formation.titre || '—'}</td>
                              <td>{formation.categorie || '—'}</td>
                              <td>
                                {formationFormateurs.length > 0 ? (
                                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    {formationFormateurs.slice(0, 2).map(f => (
                                      <span key={f.id} style={{
                                        padding: '0.2rem 0.5rem',
                                        background: '#e7f3ff',
                                        borderRadius: '12px',
                                        fontSize: '0.8rem'
                                      }}>
                                        {f.prenom} {f.nom}
                                      </span>
                                    ))}
                                    {formationFormateurs.length > 2 && (
                                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                        +{formationFormateurs.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#999', fontSize: '0.85rem' }}>Aucun</span>
                                )}
                              </td>
                              <td>{formation.mode || '—'}</td>
                              <td>{formation.prix ? `${formation.prix} €` : 'Gratuit'}</td>
                              <td>
                                <span style={{ fontWeight: '600' }}>
                                  {confirmedCount}
                                </span>
                                {' / '}
                                {formation.participants_max || '∞'}
                                {formation.participants_max && (
                                  <span style={{ 
                                    marginLeft: '0.5rem',
                                    fontSize: '0.8rem',
                                    color: confirmedCount / formation.participants_max >= 0.8 ? '#28a745' : '#666'
                                  }}>
                                    ({Math.round(confirmedCount / formation.participants_max * 100)}%)
                                  </span>
                                )}
                              </td>
                              <td style={{ fontWeight: '600', color: '#28a745' }}>
                                {revenus > 0 ? `${revenus.toFixed(0)} €` : '—'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <label style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  cursor: loadingActions[`toggle-inscriptions-${formation.id}`] ? 'not-allowed' : 'pointer',
                                  opacity: loadingActions[`toggle-inscriptions-${formation.id}`] ? 0.6 : 1
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={formation.inscriptions_ouvertes !== false}
                                    onChange={async () => {
                                      const actionKey = `toggle-inscriptions-${formation.id}`
                                      const previousValue = formation.inscriptions_ouvertes !== false
                                      
                                      // Optimistic update
                                      setFormations(prev => prev.map(f => 
                                        f.id === formation.id ? { ...f, inscriptions_ouvertes: !previousValue } : f
                                      ))
                                      setLoadingActions(prev => ({ ...prev, [actionKey]: true }))
                                      
                                      try {
                                        await toggleFormationInscriptions(formation.id)
                                        showToast(`Inscriptions ${!previousValue ? 'ouvertes' : 'fermées'} avec succès`, 'success')
                                      } catch (err) {
                                        // Rollback
                                        setFormations(prev => prev.map(f => 
                                          f.id === formation.id ? { ...f, inscriptions_ouvertes: previousValue } : f
                                        ))
                                        showToast(err.message || 'Erreur lors de la mise à jour', 'error')
                                      } finally {
                                        setLoadingActions(prev => {
                                          const next = { ...prev }
                                          delete next[actionKey]
                                          return next
                                        })
                                      }
                                    }}
                                    disabled={loadingActions[`toggle-inscriptions-${formation.id}`]}
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      cursor: loadingActions[`toggle-inscriptions-${formation.id}`] ? 'not-allowed' : 'pointer',
                                      marginRight: '8px'
                                    }}
                                  />
                                  <span style={{ fontSize: '0.85rem', color: formation.inscriptions_ouvertes !== false ? '#28a745' : '#dc3545', fontWeight: '500' }}>
                                    {formation.inscriptions_ouvertes !== false ? 'Ouvertes' : 'Fermées'}
                                  </span>
                                </label>
                              </td>
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
                          )
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'sessions' && (
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">📅 Sessions</h3>
                  <p className="card-subtitle">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Vous pouvez envoyer un rappel 48h ou 2h avant le début à tous les inscrits confirmés.
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
                      sessions.map((session) => {
                        const formation = formations.find(f => f.id === session.formation_id)
                        return (
                          <tr key={session.id}>
                            <td style={{ fontWeight: '600' }}>{formation?.titre || '—'}</td>
                            <td>{session.date_debut ? new Date(session.date_debut).toLocaleDateString('fr-FR') : '—'}</td>
                            <td>{session.date_fin ? new Date(session.date_fin).toLocaleDateString('fr-FR') : '—'}</td>
                            <td>
                              {session.inscriptions_count || 0} / {session.capacite_max || '∞'}
                            </td>
                            <td>
                              <span className={`status-badge ${session.statut === 'ouverte' ? 'approved' : session.statut === 'fermee' ? 'rejected' : 'pending'}`}>
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
                                {session.statut === 'ouverte' && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-link"
                                      onClick={async () => {
                                        const accessLink = window.prompt(
                                          "Lien d'accès (facultatif, laisser vide si déjà envoyé dans un mail précédent) :",
                                          ''
                                        )
                                        try {
                                          await sendSessionReminder(session.id, {
                                            kind: '48h',
                                            accessLink,
                                          })
                                          alert('Rappel 48h envoyé aux participants confirmés.')
                                        } catch (err) {
                                          alert(err.message || 'Erreur lors de l\'envoi du rappel 48h')
                                        }
                                      }}
                                    >
                                      Rappel 48h
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-link"
                                      onClick={async () => {
                                        const accessLink = window.prompt(
                                          "Lien d'accès (facultatif, laisser vide si déjà envoyé dans un mail précédent) :",
                                          ''
                                        )
                                        try {
                                          await sendSessionReminder(session.id, {
                                            kind: '2h',
                                            accessLink,
                                          })
                                          alert('Rappel 2h envoyé aux participants confirmés.')
                                        } catch (err) {
                                          alert(err.message || 'Erreur lors de l\'envoi du rappel 2h')
                                        }
                                      }}
                                    >
                                      Rappel 2h
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'inscriptions' && (
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">👥 Inscriptions</h3>
                  <p className="card-subtitle">
                    {inscriptionsSearch 
                      ? `${inscriptionsPagination.total || inscriptions.length} résultat${(inscriptionsPagination.total || inscriptions.length) !== 1 ? 's' : ''} trouvé${(inscriptionsPagination.total || inscriptions.length) !== 1 ? 's' : ''} (page ${inscriptionsPage} sur ${inscriptionsPagination.totalPages})`
                      : `${inscriptionsPagination.total || inscriptions.length} inscription${(inscriptionsPagination.total || inscriptions.length) !== 1 ? 's' : ''}`}
                    {selectedInscriptionIds.length > 0 &&
                      ` • ${selectedInscriptionIds.length} sélectionnée${
                        selectedInscriptionIds.length > 1 ? 's' : ''
                      }`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher (nom, email, formation, niveau)..."
                    value={inscriptionsSearch}
                    onChange={(e) => {
                      setInscriptionsSearch(e.target.value)
                      // La recherche déclenchera loadInscriptions via useEffect
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #0066CC',
                      borderRadius: '5px',
                      fontSize: '0.9rem',
                      background: 'white',
                      color: '#212529',
                      fontWeight: '500',
                      minWidth: '250px',
                    }}
                  />
                  <select
                    value={inscriptionsFilterFormation}
                    onChange={(e) => {
                      setInscriptionsFilterFormation(e.target.value)
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #0066CC',
                      borderRadius: '5px',
                      fontSize: '0.9rem',
                      background: 'white',
                      color: '#212529',
                      fontWeight: '500',
                      minWidth: '200px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Toutes les formations</option>
                    {formations.map(f => (
                      <option key={f.id} value={f.id}>{f.titre}</option>
                    ))}
                  </select>
                  <select
                    value={inscriptionsFilterMembre}
                    onChange={(e) => {
                      setInscriptionsFilterMembre(e.target.value)
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #0066CC',
                      borderRadius: '5px',
                      fontSize: '0.9rem',
                      background: 'white',
                      color: '#212529',
                      fontWeight: '500',
                      minWidth: '150px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Tous</option>
                    <option value="member">Membre</option>
                    <option value="non-member">Non membre</option>
                  </select>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Bouton pour envoyer aux inscrits en attente (tous ou sélectionnés) */}
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.8rem',
                        backgroundColor: '#8b5cf6',
                        borderColor: '#8b5cf6',
                        color: 'white',
                      }}
                      onClick={async () => {
                        const pendingInscriptions = inscriptions.filter(i => i.status === 'pending')
                        const idsToSend = selectedInscriptionIds.length > 0
                          ? selectedInscriptionIds.filter(id => {
                              const ins = inscriptions.find(i => i.id === id)
                              return ins && ins.status === 'pending'
                            })
                          : pendingInscriptions.map(i => i.id)
                        
                        if (idsToSend.length === 0) {
                          alert('Aucune inscription en attente à sélectionner.')
                          return
                        }

                        const message = window.prompt(
                          `Envoyer un email à ${idsToSend.length} inscrit(s) en attente.\n\nMessage optionnel (laisser vide pour utiliser le message par défaut) :`,
                          ''
                        )
                        
                        if (message === null) return // Annulé

                        try {
                          setLoadingInscriptions(true)
                          const result = await sendPendingInscriptionsEmails(idsToSend, message || '')
                          showToast(`✅ ${result?.sent || idsToSend.length} email(s) envoyé(s) avec succès${result?.errors > 0 ? `, ${result.errors} erreur(s)` : ''}`, 'success')
                        } catch (err) {
                          showToast(err.message || 'Erreur lors de l\'envoi des emails', 'error')
                        } finally {
                          setLoadingInscriptions(false)
                        }
                      }}
                    >
                      📧 Envoyer aux en attente
                    </button>

                    {selectedInscriptionIds.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ 
                            padding: '0.4rem 0.75rem', 
                            fontSize: '0.8rem',
                            opacity: loadingActions['bulk-confirm'] ? 0.6 : 1,
                            cursor: loadingActions['bulk-confirm'] ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => handleBulkInscriptionsAction('confirm')}
                          disabled={loadingActions['bulk-confirm']}
                        >
                          {loadingActions['bulk-confirm'] ? '⏳' : ''} Confirmer la sélection
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#f97316',
                            borderColor: '#f97316',
                            opacity: loadingActions['bulk-reject'] ? 0.6 : 1,
                            cursor: loadingActions['bulk-reject'] ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => handleBulkInscriptionsAction('reject')}
                          disabled={loadingActions['bulk-reject']}
                        >
                          {loadingActions['bulk-reject'] ? '⏳' : ''} Rejeter la sélection
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#dc2626',
                            borderColor: '#dc2626',
                            opacity: loadingActions['bulk-delete'] ? 0.6 : 1,
                            cursor: loadingActions['bulk-delete'] ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => handleBulkInscriptionsAction('delete')}
                          disabled={loadingActions['bulk-delete']}
                        >
                          {loadingActions['bulk-delete'] ? '⏳' : ''} Supprimer la sélection
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            opacity: loadingActions['bulk-invite'] ? 0.6 : 1,
                            cursor: loadingActions['bulk-invite'] ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => handleBulkInscriptionsAction('invite')}
                          disabled={loadingActions['bulk-invite']}
                        >
                          {loadingActions['bulk-invite'] ? '⏳' : ''} Envoyer les invitations
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                        />
                      </th>
                      <th>
                        <button
                          type="button"
                          onClick={() => {
                            if (inscriptionsSortBy === 'ordre_attente') {
                              setInscriptionsSortOrder(inscriptionsSortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setInscriptionsSortBy('ordre_attente')
                              setInscriptionsSortOrder('asc')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: inscriptionsSortBy === 'ordre_attente' ? '600' : '400',
                            color: inscriptionsSortBy === 'ordre_attente' ? '#0066CC' : '#212529',
                            borderRadius: '4px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (inscriptionsSortBy !== 'ordre_attente') {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (inscriptionsSortBy !== 'ordre_attente') {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          Ordre d'attente
                          {inscriptionsSortBy === 'ordre_attente' && (inscriptionsSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          onClick={() => {
                            if (inscriptionsSortBy === 'nom') {
                              setInscriptionsSortOrder(inscriptionsSortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setInscriptionsSortBy('nom')
                              setInscriptionsSortOrder('asc')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: inscriptionsSortBy === 'nom' ? '600' : '400',
                            color: inscriptionsSortBy === 'nom' ? '#0066CC' : '#212529',
                            borderRadius: '4px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (inscriptionsSortBy !== 'nom') {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (inscriptionsSortBy !== 'nom') {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          Nom
                          {inscriptionsSortBy === 'nom' && (inscriptionsSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          onClick={() => {
                            if (inscriptionsSortBy === 'email') {
                              setInscriptionsSortOrder(inscriptionsSortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setInscriptionsSortBy('email')
                              setInscriptionsSortOrder('asc')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: inscriptionsSortBy === 'email' ? '600' : '400',
                            color: inscriptionsSortBy === 'email' ? '#0066CC' : '#212529',
                            borderRadius: '4px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (inscriptionsSortBy !== 'email') {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (inscriptionsSortBy !== 'email') {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          Email
                          {inscriptionsSortBy === 'email' && (inscriptionsSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                      <th>Membre</th>
                      <th>Formation</th>
                      <th>
                        <button
                          type="button"
                          onClick={() => {
                            if (inscriptionsSortBy === 'niveau') {
                              setInscriptionsSortOrder(inscriptionsSortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setInscriptionsSortBy('niveau')
                              setInscriptionsSortOrder('asc')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: inscriptionsSortBy === 'niveau' ? '600' : '400',
                            color: inscriptionsSortBy === 'niveau' ? '#0066CC' : '#212529',
                            borderRadius: '4px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (inscriptionsSortBy !== 'niveau') {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (inscriptionsSortBy !== 'niveau') {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          Niveau
                          {inscriptionsSortBy === 'niveau' && (inscriptionsSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          onClick={() => {
                            if (inscriptionsSortBy === 'status') {
                              setInscriptionsSortOrder(inscriptionsSortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setInscriptionsSortBy('status')
                              setInscriptionsSortOrder('asc')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: inscriptionsSortBy === 'status' ? '600' : '400',
                            color: inscriptionsSortBy === 'status' ? '#0066CC' : '#212529',
                            borderRadius: '4px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (inscriptionsSortBy !== 'status') {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (inscriptionsSortBy !== 'status') {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          Statut
                          {inscriptionsSortBy === 'status' && (inscriptionsSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          onClick={() => {
                            if (inscriptionsSortBy === 'paiement_status') {
                              setInscriptionsSortOrder(inscriptionsSortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setInscriptionsSortBy('paiement_status')
                              setInscriptionsSortOrder('asc')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: inscriptionsSortBy === 'paiement_status' ? '600' : '400',
                            color: inscriptionsSortBy === 'paiement_status' ? '#0066CC' : '#212529',
                            borderRadius: '4px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (inscriptionsSortBy !== 'paiement_status') {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (inscriptionsSortBy !== 'paiement_status') {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          Paiement
                          {inscriptionsSortBy === 'paiement_status' && (inscriptionsSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          onClick={() => {
                            if (inscriptionsSortBy === 'date') {
                              setInscriptionsSortOrder(inscriptionsSortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setInscriptionsSortBy('date')
                              setInscriptionsSortOrder('desc')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: inscriptionsSortBy === 'date' ? '600' : '400',
                            color: inscriptionsSortBy === 'date' ? '#0066CC' : '#212529',
                            borderRadius: '4px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (inscriptionsSortBy !== 'date') {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (inscriptionsSortBy !== 'date') {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          Date
                          {inscriptionsSortBy === 'date' && (inscriptionsSortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInscriptions && inscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <div style={{ 
                              width: '16px', 
                              height: '16px', 
                              border: '2px solid #e4e7ec', 
                              borderTopColor: '#0066CC', 
                              borderRadius: '50%', 
                              animation: 'spin 0.8s linear infinite' 
                            }}></div>
                            Chargement des inscriptions...
                          </div>
                        </td>
                      </tr>
                    ) : filteredInscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>
                          Aucune inscription
                        </td>
                      </tr>
                    ) : (
                      filteredInscriptions.map((inscription) => {
                        const formation = formations.find(
                          (f) => f.id === inscription.formation_id
                        )
                        const isSelected = selectedInscriptionIds.includes(inscription.id)
                        const isMember = inscription.is_member || !!inscription.membre_id
                        return (
                          <tr key={inscription.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectInscription(inscription.id)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {inscription.status === 'pending' && inscription.ordre_attente ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  background: '#f3f4f6',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  color: '#374151',
                                  fontSize: '0.875rem'
                                }}>
                                  #{inscription.ordre_attente}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td style={{ fontWeight: '600' }}>
                              {inscription.prenom} {inscription.nom}
                            </td>
                            <td>{inscription.email || '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              {isMember ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  ✓ Membre
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  background: '#f3f4f6',
                                  color: '#6b7280',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem'
                                }}>
                                  Non membre
                                </span>
                              )}
                            </td>
                            <td>{formation?.titre || '—'}</td>
                            <td>{inscription.niveau || '—'}</td>
                            <td>
                              <span
                                className={`status-badge ${
                                  inscription.status === 'confirmed'
                                    ? 'approved'
                                    : inscription.status === 'pending'
                                    ? 'pending'
                                    : inscription.status === 'cancelled'
                                    ? 'rejected'
                                    : 'rejected'
                                }`}
                              >
                                {inscription.status === 'confirmed'
                                  ? 'Confirmée'
                                  : inscription.status === 'pending'
                                  ? 'En attente'
                                  : inscription.status === 'cancelled'
                                  ? 'Annulée'
                                  : 'Annulée'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-badge ${
                                  inscription.paiement_status === 'payé'
                                    ? 'approved'
                                    : inscription.paiement_status === 'en attente'
                                    ? 'pending'
                                    : 'rejected'
                                }`}
                              >
                                {inscription.paiement_status || 'non payé'}
                              </span>
                            </td>
                            <td>
                              {inscription.created_at
                                ? new Date(inscription.created_at).toLocaleDateString('fr-FR')
                                : '—'}
                            </td>
                            <td>
                              <div className="table-actions">
                                {inscription.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-link"
                                      onClick={() => handleConfirmInscription(inscription.id)}
                                      disabled={loadingActions[`confirm-${inscription.id}`]}
                                      style={{ 
                                        opacity: loadingActions[`confirm-${inscription.id}`] ? 0.6 : 1,
                                        cursor: loadingActions[`confirm-${inscription.id}`] ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      {loadingActions[`confirm-${inscription.id}`] ? '⏳' : ''} Confirmer
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-link danger"
                                      onClick={() => handleRejectInscription(inscription.id)}
                                      disabled={loadingActions[`reject-${inscription.id}`]}
                                      style={{ 
                                        opacity: loadingActions[`reject-${inscription.id}`] ? 0.6 : 1,
                                        cursor: loadingActions[`reject-${inscription.id}`] ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      {loadingActions[`reject-${inscription.id}`] ? '⏳' : ''} Rejeter
                                    </button>
                                  </>
                                )}
                                {inscription.status === 'confirmed' && (
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleSendInvitation(inscription.id)}
                                    disabled={loadingActions[`invite-${inscription.id}`]}
                                    style={{ 
                                      opacity: loadingActions[`invite-${inscription.id}`] ? 0.6 : 1,
                                      cursor: loadingActions[`invite-${inscription.id}`] ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    {loadingActions[`invite-${inscription.id}`] ? '⏳' : ''} Envoyer invitation
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-link"
                                  onClick={() => {
                                    setShowModal('inscription')
                                    setEditingId(inscription.id)
                                    setFormData(inscription)
                                  }}
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  className="btn-link danger"
                                  onClick={() => handleDelete('inscription', inscription.id)}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {inscriptionsPagination.totalPages > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginTop: '20px',
                  padding: '16px',
                  borderTop: '1px solid #e4e7ec'
                }}>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Page {inscriptionsPage} sur {inscriptionsPagination.totalPages} • 
                    {(inscriptionsPage - 1) * inscriptionsPagination.limit + 1} - {Math.min(inscriptionsPage * inscriptionsPagination.limit, inscriptionsPagination.total)} sur {inscriptionsPagination.total}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setInscriptionsPage(p => Math.max(1, p - 1))}
                      disabled={inscriptionsPage === 1 || loadingInscriptions}
                      className="btn-secondary"
                      style={{ 
                        padding: '8px 16px',
                        opacity: inscriptionsPage === 1 || loadingInscriptions ? 0.5 : 1,
                        cursor: inscriptionsPage === 1 || loadingInscriptions ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Précédent
                    </button>
                    <button
                      onClick={() => setInscriptionsPage(p => Math.min(inscriptionsPagination.totalPages, p + 1))}
                      disabled={inscriptionsPage >= inscriptionsPagination.totalPages || loadingInscriptions}
                      className="btn-primary"
                      style={{ 
                        padding: '8px 16px',
                        opacity: inscriptionsPage >= inscriptionsPagination.totalPages || loadingInscriptions ? 0.5 : 1,
                        cursor: inscriptionsPage >= inscriptionsPagination.totalPages || loadingInscriptions ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Toast Notification */}
        {toast.show && (
          <div
            style={{
              position: 'fixed',
              right: '24px',
              bottom: '24px',
              background: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: 'white',
              padding: '14px 20px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 10000,
              animation: 'fadeInSlide 0.3s ease',
              fontSize: '14px',
              fontWeight: '500',
              minWidth: '250px',
              maxWidth: '400px'
            }}
          >
            <span style={{ fontSize: '18px' }}>
              {toast.type === 'success' ? '✓' : '✕'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}
        
        <style>{`
          @keyframes fadeInSlide {
            from {
              opacity: 0;
              transform: translateX(100px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        {activeTab === 'formateurs' && (
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">👨‍🏫 Formateurs</h3>
                  <p className="card-subtitle">{formateurs.length} formateur{formateurs.length !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher un formateur..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #0066CC',
                      borderRadius: '5px',
                      fontSize: '0.9rem',
                      background: 'white',
                      color: '#212529',
                      fontWeight: '500',
                      minWidth: '200px'
                    }}
                  />
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Statut</th>
                      <th>Formations</th>
                      <th>Inscriptions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formateurs
                      .filter(f => {
                        if (!filters.search) return true
                        const search = filters.search.toLowerCase()
                        return f.prenom?.toLowerCase().includes(search) ||
                          f.nom?.toLowerCase().includes(search) ||
                          f.email?.toLowerCase().includes(search)
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Aucun formateur</td>
                      </tr>
                    ) : (
                      formateurs
                        .filter(f => {
                          if (!filters.search) return true
                          const search = filters.search.toLowerCase()
                          return f.prenom?.toLowerCase().includes(search) ||
                            f.nom?.toLowerCase().includes(search) ||
                            f.email?.toLowerCase().includes(search)
                        })
                        .map((formateur) => {
                          // Utiliser les stats du backend si disponibles, sinon calculer depuis les données chargées
                          const formationsCount = formateur.formations_count !== undefined 
                            ? formateur.formations_count 
                            : formations.filter(f => 
                                f.formateurs_list?.some(ff => ff.id === formateur.id) || 
                                f.formateur_id === formateur.id
                              ).length
                          
                          const inscriptionsCount = formateur.inscriptions_count !== undefined
                            ? formateur.inscriptions_count
                            : (() => {
                                const formateurFormations = formations.filter(f => 
                                  f.formateurs_list?.some(ff => ff.id === formateur.id) || 
                                  f.formateur_id === formateur.id
                                )
                                return inscriptions.filter(i => 
                                  formateurFormations.some(f => f.id === i.formation_id)
                                ).length
                              })()
                          
                          const confirmedInscriptionsCount = formateur.confirmed_inscriptions_count !== undefined
                            ? formateur.confirmed_inscriptions_count
                            : (() => {
                                const formateurFormations = formations.filter(f => 
                                  f.formateurs_list?.some(ff => ff.id === formateur.id) || 
                                  f.formateur_id === formateur.id
                                )
                                return inscriptions.filter(i => 
                                  formateurFormations.some(f => f.id === i.formation_id) && i.status === 'confirmed'
                                ).length
                              })()
                          
                          return (
                            <tr key={formateur.id}>
                              <td>
                                {formateur.photo_url ? (
                                  <img
                                    src={formateur.photo_url}
                                    alt={`${formateur.prenom} ${formateur.nom}`}
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '2px solid #ddd'
                                    }}
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      const fallback = e.target.nextElementSibling
                                      if (fallback) fallback.style.display = 'flex'
                                    }}
                                  />
                                ) : null}
                                <div
                                  style={{
                                    display: formateur.photo_url ? 'none' : 'flex',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  {(formateur.prenom?.[0] || '').toUpperCase()}{(formateur.nom?.[0] || '').toUpperCase()}
                                </div>
                              </td>
                              <td style={{ fontWeight: '600' }}>{formateur.prenom} {formateur.nom}</td>
                              <td>{formateur.email || '—'}</td>
                              <td>
                                <span style={{
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem',
                                  fontWeight: '500',
                                  background: formateur.statut === 'membre' ? '#e7f3ff' : '#fff3cd',
                                  color: formateur.statut === 'membre' ? '#0066CC' : '#856404'
                                }}>
                                  {formateur.statut === 'membre' ? '👤 Membre ASGF' : '🌐 Externe'}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: '600', color: '#0066CC' }}>
                                  {formationsCount}
                                </span>
                                {formationsCount > 0 && (() => {
                                  const formateurFormations = formations.filter(f => 
                                    f.formateurs_list?.some(ff => ff.id === formateur.id) || 
                                    f.formateur_id === formateur.id
                                  )
                                  return (
                                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                                      {formateurFormations.slice(0, 2).map(f => f.titre).join(', ')}
                                      {formateurFormations.length > 2 && ` +${formateurFormations.length - 2}`}
                                    </div>
                                  )
                                })()}
                              </td>
                              <td>
                                <span style={{ fontWeight: '600' }}>
                                  {inscriptionsCount}
                                </span>
                                {' '}
                                {confirmedInscriptionsCount > 0 && (
                                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                    ({confirmedInscriptionsCount} confirmées)
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button type="button" className="btn-link" onClick={() => { setShowModal('formateur'); setEditingId(formateur.id); setFormData(formateur) }}>
                                    Modifier
                                  </button>
                                  <button type="button" className="btn-link danger" onClick={() => handleDelete('formateur', formateur.id)}>
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}


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
                      <input type="text" required value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="ex: formation-qgis-debutant" />
                      <small style={{ color: '#666', fontSize: '0.85rem' }}>Identifiant unique pour l'URL (sans espaces, en minuscules)</small>
                    </div>
                    <div className="form-group">
                      <label>Titre *</label>
                      <input type="text" required value={formData.titre || ''} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Catégorie *</label>
                      <input type="text" required value={formData.categorie || ''} onChange={(e) => setFormData({ ...formData, categorie: e.target.value })} placeholder="ex: SIG, Télédétection, Programmation" />
                    </div>
                    <div className="form-group">
                      <label>Niveau *</label>
                      <select required value={formData.niveau || ''} onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}>
                        <option value="">Sélectionner...</option>
                        <option value="Débutant">Débutant</option>
                        <option value="Intermédiaire">Intermédiaire</option>
                        <option value="Avancé">Avancé</option>
                        <option value="Débutant/Intermédiaire">Débutant/Intermédiaire</option>
                        <option value="Intermédiaire/Avancé">Intermédiaire/Avancé</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Résumé *</label>
                      <textarea required value={formData.resume || ''} onChange={(e) => setFormData({ ...formData, resume: e.target.value })} rows="3" placeholder="Description courte de la formation (affichée sur les cartes)"></textarea>
                    </div>
                    <div className="form-group">
                      <label>Description longue</label>
                      <textarea value={formData.description_longue || ''} onChange={(e) => setFormData({ ...formData, description_longue: e.target.value })} rows="5" placeholder="Description détaillée de la formation"></textarea>
                    </div>
                    <div className="form-group">
                      <label>Durée (heures)</label>
                      <input type="number" value={formData.duree_heures || ''} onChange={(e) => setFormData({ ...formData, duree_heures: e.target.value })} placeholder="ex: 20" />
                    </div>
                    <div className="form-group">
                      <label>Mode</label>
                      <select value={formData.mode || ''} onChange={(e) => setFormData({ ...formData, mode: e.target.value })}>
                        <option value="">Sélectionner...</option>
                        <option value="En ligne">En ligne</option>
                        <option value="Présentiel">Présentiel</option>
                        <option value="Hybride">Hybride</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Participants max</label>
                      <input type="number" value={formData.participants_max || ''} onChange={(e) => setFormData({ ...formData, participants_max: e.target.value })} placeholder="ex: 20" />
                    </div>
                    <div className="form-group">
                      <label>Prix (€)</label>
                      <input type="number" step="0.01" value={formData.prix || ''} onChange={(e) => setFormData({ ...formData, prix: e.target.value })} placeholder="ex: 150.00" />
                    </div>
                    <div className="form-group">
                      <label>Image URL</label>
                      <input 
                        type="url" 
                        value={formData.image_url || ''} 
                        onChange={(e) => {
                          const url = e.target.value
                          // Filtrer les URLs file://
                          if (url && url.startsWith('file://')) {
                            alert('Les chemins de fichiers locaux ne sont pas supportés. Veuillez utiliser une URL publique.')
                            return
                          }
                          setFormData({ ...formData, image_url: url })
                        }} 
                        placeholder="https://..." 
                        style={{
                          border: formData.image_url && formData.image_url.startsWith('file://') ? '2px solid #ffc107' : undefined
                        }}
                      />
                      {formData.image_url && formData.image_url.startsWith('file://') && (
                        <small style={{ color: '#856404', display: 'block', marginTop: '0.25rem' }}>
                          ⚠️ Les chemins de fichiers locaux ne sont pas supportés.
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Badge</label>
                      <input type="text" value={formData.badge || ''} onChange={(e) => setFormData({ ...formData, badge: e.target.value })} placeholder="ex: Nouveau, Populaire" />
                    </div>
                    <div className="form-group">
                      <label>Formateurs *</label>
                      <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginBottom: '0.75rem' }}>
                        Sélectionnez 1 ou 2 formateurs maximum pour cette formation. Le premier sélectionné sera le formateur principal.
                      </small>
                      
                      {/* Recherche de formateurs */}
                      {formateurs.length > 5 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <input
                            type="text"
                            placeholder="🔍 Rechercher un formateur (nom, prénom, email)..."
                            value={formateurSearch}
                            onChange={(e) => setFormateurSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '0.95rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {/* Formateurs sélectionnés (affichés en premier) */}
                      {selectedFormateurs.length > 0 && (
                        <div style={{ 
                          marginBottom: '1rem',
                          padding: '1rem',
                          background: 'linear-gradient(135deg, #e7f3ff 0%, #d6e9ff 100%)',
                          borderRadius: '10px',
                          border: '2px solid #0066CC'
                        }}>
                          <div style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: '600', 
                            color: '#0066CC',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span>✓</span>
                            <span>Formateurs sélectionnés ({selectedFormateurs.length}/2)</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {selectedFormateurs.map((formateurId, index) => {
                              const formateur = formateurs.find(f => f.id === formateurId)
                              if (!formateur) return null
                              const isPrincipal = index === 0
                              return (
                                <div
                                  key={formateurId}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.75rem',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: isPrincipal ? '2px solid #0066CC' : '1px solid #ddd',
                                    boxShadow: isPrincipal ? '0 2px 8px rgba(0,102,204,0.2)' : '0 1px 3px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {/* Photo ou initiales */}
                                  {formateur.photo_url ? (
                                    <img
                                      src={formateur.photo_url}
                                      alt={`${formateur.prenom} ${formateur.nom}`}
                                      style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid #0066CC',
                                        flexShrink: 0
                                      }}
                                      onError={(e) => {
                                        e.target.style.display = 'none'
                                        const fallback = e.target.nextElementSibling
                                        if (fallback) fallback.style.display = 'flex'
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    style={{
                                      display: formateur.photo_url ? 'none' : 'flex',
                                      width: '50px',
                                      height: '50px',
                                      borderRadius: '50%',
                                      background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontWeight: 'bold',
                                      fontSize: '1.1rem',
                                      flexShrink: 0
                                    }}
                                  >
                                    {(formateur.prenom?.[0] || '').toUpperCase()}{(formateur.nom?.[0] || '').toUpperCase()}
                                  </div>
                                  
                                  {/* Infos formateur */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                      fontSize: '1rem', 
                                      fontWeight: '600', 
                                      color: '#2d2d2d',
                                      marginBottom: '0.25rem'
                                    }}>
                                      {formateur.prenom} {formateur.nom}
                                    </div>
                                    <div style={{ 
                                      fontSize: '0.85rem', 
                                      color: '#666',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      flexWrap: 'wrap'
                                    }}>
                                      <span>{formateur.email}</span>
                                      {formateur.statut && (
                                        <span style={{
                                          padding: '0.2rem 0.5rem',
                                          borderRadius: '12px',
                                          background: formateur.statut === 'membre' ? '#e7f3ff' : '#fff3cd',
                                          color: formateur.statut === 'membre' ? '#0066CC' : '#856404',
                                          fontSize: '0.75rem',
                                          fontWeight: '500'
                                        }}>
                                          {formateur.statut === 'membre' ? '👤 Membre ASGF' : '🌐 Externe'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Badge Principal */}
                                  {isPrincipal && (
                                    <div style={{
                                      padding: '0.4rem 0.8rem',
                                      background: '#0066CC',
                                      color: 'white',
                                      borderRadius: '20px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      ⭐ Principal
                                    </div>
                                  )}
                                  
                                  {/* Bouton retirer */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedFormateurs(selectedFormateurs.filter(id => id !== formateurId))
                                    }}
                                    style={{
                                      padding: '0.5rem',
                                      background: '#ff4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      fontSize: '1rem',
                                      lineHeight: 1,
                                      flexShrink: 0
                                    }}
                                    title="Retirer ce formateur"
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Liste des formateurs disponibles */}
                      {formateurs.length > 0 ? (
                        <div style={{ 
                          border: '1px solid #ddd', 
                          borderRadius: '10px', 
                          padding: '1rem', 
                          maxHeight: '400px', 
                          overflowY: 'auto',
                          background: '#f9f9f9'
                        }}>
                          {/* Compteur */}
                          <div style={{ 
                            marginBottom: '1rem',
                            padding: '0.5rem',
                            background: '#f0f0f0',
                            borderRadius: '5px',
                            fontSize: '0.85rem',
                            color: '#666',
                            textAlign: 'center'
                          }}>
                            {formateurs.filter(f => {
                              const searchLower = formateurSearch.toLowerCase()
                              return !formateurSearch || 
                                f.nom?.toLowerCase().includes(searchLower) ||
                                f.prenom?.toLowerCase().includes(searchLower) ||
                                f.email?.toLowerCase().includes(searchLower)
                            }).length} formateur{formateurs.length > 1 ? 's' : ''} disponible{formateurs.length > 1 ? 's' : ''}
                            {selectedFormateurs.length >= 2 && (
                              <span style={{ 
                                marginLeft: '0.5rem', 
                                color: '#ff4444', 
                                fontWeight: '600' 
                              }}>
                                (Maximum atteint)
                              </span>
                            )}
                          </div>

                          {/* Grille de formateurs */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '0.75rem'
                          }}>
                            {formateurs
                              .filter(f => {
                                // Filtrer les formateurs déjà sélectionnés
                                if (selectedFormateurs.includes(f.id)) return false
                                // Filtrer par recherche
                                const searchLower = formateurSearch.toLowerCase()
                                return !formateurSearch || 
                                  f.nom?.toLowerCase().includes(searchLower) ||
                                  f.prenom?.toLowerCase().includes(searchLower) ||
                                  f.email?.toLowerCase().includes(searchLower)
                              })
                              .map((f) => {
                                const isDisabled = selectedFormateurs.length >= 2
                                return (
                                  <label
                                    key={f.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.75rem',
                                      padding: '0.75rem',
                                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                                      borderRadius: '8px',
                                      background: 'white',
                                      border: '1px solid #ddd',
                                      transition: 'all 0.2s',
                                      opacity: isDisabled ? 0.6 : 1,
                                      position: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isDisabled) {
                                        e.currentTarget.style.background = '#f0f7ff'
                                        e.currentTarget.style.borderColor = '#0066CC'
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,102,204,0.15)'
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isDisabled) {
                                        e.currentTarget.style.background = 'white'
                                        e.currentTarget.style.borderColor = '#ddd'
                                        e.currentTarget.style.boxShadow = 'none'
                                      }
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={false}
                                      disabled={isDisabled}
                                      onChange={(e) => {
                                        if (e.target.checked && selectedFormateurs.length < 2) {
                                          setSelectedFormateurs([...selectedFormateurs, f.id])
                                        }
                                      }}
                                      style={{ 
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        width: '18px',
                                        height: '18px',
                                        flexShrink: 0
                                      }}
                                    />
                                    
                                    {/* Photo ou initiales */}
                                    {f.photo_url ? (
                                      <img
                                        src={f.photo_url}
                                        alt={`${f.prenom} ${f.nom}`}
                                        style={{
                                          width: '45px',
                                          height: '45px',
                                          borderRadius: '50%',
                                          objectFit: 'cover',
                                          border: '2px solid #ddd',
                                          flexShrink: 0
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none'
                                          const fallback = e.target.nextElementSibling
                                          if (fallback) fallback.style.display = 'flex'
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      style={{
                                        display: f.photo_url ? 'none' : 'flex',
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        flexShrink: 0
                                      }}
                                    >
                                      {(f.prenom?.[0] || '').toUpperCase()}{(f.nom?.[0] || '').toUpperCase()}
                                    </div>
                                    
                                    {/* Infos */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontSize: '0.95rem', 
                                        fontWeight: '600', 
                                        color: '#2d2d2d',
                                        marginBottom: '0.2rem'
                                      }}>
                                        {f.prenom} {f.nom}
                                      </div>
                                      <div style={{ 
                                        fontSize: '0.8rem', 
                                        color: '#666',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {f.email}
                                      </div>
                                      {f.statut && (
                                        <div style={{ marginTop: '0.25rem' }}>
                                          <span style={{
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '10px',
                                            background: f.statut === 'membre' ? '#e7f3ff' : '#fff3cd',
                                            color: f.statut === 'membre' ? '#0066CC' : '#856404',
                                            fontSize: '0.7rem',
                                            fontWeight: '500'
                                          }}>
                                            {f.statut === 'membre' ? '👤 Membre' : '🌐 Externe'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                )
                              })}
                          </div>

                          {/* Message si aucun résultat de recherche */}
                          {formateurs.filter(f => {
                            if (selectedFormateurs.includes(f.id)) return false
                            const searchLower = formateurSearch.toLowerCase()
                            return !formateurSearch || 
                              f.nom?.toLowerCase().includes(searchLower) ||
                              f.prenom?.toLowerCase().includes(searchLower) ||
                              f.email?.toLowerCase().includes(searchLower)
                          }).length === 0 && formateurSearch && (
                            <div style={{
                              padding: '2rem',
                              textAlign: 'center',
                              color: '#999',
                              fontSize: '0.9rem'
                            }}>
                              Aucun formateur trouvé pour "{formateurSearch}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ 
                          padding: '1.5rem', 
                          background: '#fff3cd', 
                          border: '1px solid #ffc107', 
                          borderRadius: '10px',
                          color: '#856404',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Aucun formateur créé</div>
                          <div style={{ fontSize: '0.9rem' }}>
                            Créez d'abord un formateur dans l'onglet "Formateurs" avant d'associer une formation.
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Active</label>
                      <input type="checkbox" checked={formData.is_active !== false} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                      <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>Seules les formations actives sont visibles sur le site public</small>
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
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>Prénom *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.prenom || ''} 
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} 
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>Nom *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.nom || ''} 
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })} 
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>Email *</label>
                      <input 
                        type="email" 
                        required 
                        value={formData.email || ''} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '2px solid #0066CC' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#0066CC', fontSize: '1rem' }}>
                        Statut * <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <select 
                        required 
                        value={formData.statut || ''} 
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })} 
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          border: '2px solid #0066CC', 
                          borderRadius: '4px', 
                          fontSize: '1rem',
                          background: 'white',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Sélectionnez le statut --</option>
                        <option value="membre">✅ Membre de l'ASGF</option>
                        <option value="externe">🌍 Personne extérieure</option>
                      </select>
                      <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.75rem', lineHeight: '1.5' }}>
                        <strong>💡 Information :</strong> Indiquez si le formateur est membre de l'association ASGF ou une personne extérieure à l'association.
                      </small>
                      {formData.statut && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.75rem', 
                          background: formData.statut === 'membre' ? '#d4edda' : '#fff3cd', 
                          borderRadius: '4px',
                          border: `1px solid ${formData.statut === 'membre' ? '#28a745' : '#ffc107'}`,
                          color: formData.statut === 'membre' ? '#155724' : '#856404',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}>
                          {formData.statut === 'membre' ? '✅ Membre de l\'ASGF sélectionné' : '🌍 Personne extérieure sélectionnée'}
                        </div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#333', fontSize: '1rem' }}>
                        📚 Formations enseignées
                      </label>
                      <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginBottom: '1rem', lineHeight: '1.5' }}>
                        Sélectionnez les formations que ce formateur enseigne (optionnel). Vous pouvez en sélectionner plusieurs.
                      </small>
                      {formations.length > 0 ? (
                        <div style={{ 
                          border: '2px solid #0066CC', 
                          borderRadius: '8px', 
                          padding: '1rem', 
                          maxHeight: '250px', 
                          overflowY: 'auto',
                          background: 'white',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {formations.map((f) => (
                            <label 
                              key={f.id} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem', 
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderRadius: '5px',
                                transition: 'all 0.2s',
                                marginBottom: '0.25rem',
                                background: selectedFormationsForFormateur.includes(f.id) ? '#e7f3ff' : 'transparent',
                                border: selectedFormationsForFormateur.includes(f.id) ? '1px solid #0066CC' : '1px solid transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (!selectedFormationsForFormateur.includes(f.id)) {
                                  e.currentTarget.style.background = '#f0f0f0'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!selectedFormationsForFormateur.includes(f.id)) {
                                  e.currentTarget.style.background = 'transparent'
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedFormationsForFormateur.includes(f.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFormationsForFormateur([...selectedFormationsForFormateur, f.id])
                                  } else {
                                    setSelectedFormationsForFormateur(selectedFormationsForFormateur.filter(id => id !== f.id))
                                  }
                                }}
                                style={{ 
                                  cursor: 'pointer',
                                  width: '18px',
                                  height: '18px',
                                  accentColor: '#0066CC'
                                }}
                              />
                              <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: selectedFormationsForFormateur.includes(f.id) ? '600' : '400', color: '#333' }}>
                                {f.titre}
                              </span>
                              {selectedFormationsForFormateur.includes(f.id) && (
                                <span style={{ color: '#0066CC', fontSize: '1.2rem' }}>✓</span>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div style={{ 
                          padding: '1.5rem', 
                          background: '#fff3cd', 
                          border: '2px solid #ffc107', 
                          borderRadius: '8px',
                          color: '#856404',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                          <strong>Aucune formation créée</strong>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Créez d'abord des formations avant de les associer à un formateur.</p>
                        </div>
                      )}
                      {selectedFormationsForFormateur.length > 0 && (
                        <div style={{ 
                          marginTop: '1rem', 
                          padding: '0.75rem 1rem', 
                          background: 'linear-gradient(135deg, #0066CC, #0052A3)', 
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: 'white',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span>✓</span>
                          <span>{selectedFormationsForFormateur.length} formation{selectedFormationsForFormateur.length > 1 ? 's' : ''} sélectionnée{selectedFormationsForFormateur.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>📷 Photo URL</label>
                      <input 
                        type="url" 
                        value={formData.photo_url || ''} 
                        onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })} 
                        placeholder="https://exemple.com/photo.jpg" 
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                        URL complète de la photo du formateur (optionnel)
                      </small>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>📝 Biographie</label>
                      <textarea 
                        value={formData.bio || ''} 
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                        rows="4" 
                        placeholder="Présentation du formateur, ses compétences, son parcours professionnel, ses spécialités..." 
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px', 
                          fontSize: '1rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '100px'
                        }}
                      />
                      <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                        Description du formateur qui sera affichée sur le site (optionnel)
                      </small>
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
    const [allPresentateurs, setAllPresentateurs] = useState([])
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [photoPreview, setPhotoPreview] = useState(null)
    const [activeTab, setActiveTab] = useState('webinaires') // 'webinaires', 'inscriptions', 'presentateurs'
    const [selectedInscriptionIds, setSelectedInscriptionIds] = useState([])

    const loadData = useCallback(async () => {
      setLoading(true)
      try {
        const [statsData, webinairesData, inscriptionsData] = await Promise.all([
          fetchWebinaireStats(),
          fetchWebinaires({ page: 1, limit: 50 }),
          fetchWebinaireInscriptions({ page: 1, limit: 50 }),
        ])
        setStats(statsData || {})
        const webinairesList = Array.isArray(webinairesData) ? webinairesData : []
        setWebinaires(webinairesList)
        setInscriptions(Array.isArray(inscriptionsData) ? inscriptionsData : [])
        
        // Charger tous les présentateurs de tous les webinaires
        try {
          const allPresentateursPromises = webinairesList.map(w => fetchPresentateurs(w.id))
          const allPresentateursResults = await Promise.allSettled(allPresentateursPromises)
          const allPresentateursList = allPresentateursResults
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value || [])
          setAllPresentateurs(allPresentateursList)
        } catch (err) {
          console.error('Erreur chargement tous les présentateurs:', err)
          setAllPresentateurs([])
        }
      } catch (err) {
        console.error('Erreur chargement webinaires:', err)
        setStats({})
        setWebinaires([])
        setInscriptions([])
        setAllPresentateurs([])
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
        // Recharger toutes les données après modification
        await loadData()
        setShowModal(null)
        setFormData({})
        setEditingId(null)
      } catch (err) {
        alert(err.message || 'Erreur lors de l\'opération')
      } finally {
        setSubmitting(false)
      }
    }

    const handleValidateWebinaireInscription = async (inscriptionId) => {
      try {
        await updateWebinaireInscription(inscriptionId, { statut: 'confirmed' })
        alert('Inscription validée avec succès.')
        await loadData()
      } catch (err) {
        alert(err.message || "Erreur lors de la validation de l'inscription")
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

    // Fonction pour uploader une photo de présentateur
    const handlePhotoUpload = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image')
        return
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB')
        return
      }

      try {
        setUploadingPhoto(true)
        
        // Créer un nom de fichier unique
        const fileExt = file.name.split('.').pop()
        const fileName = `presentateurs/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        // Importer le client Supabase
        const { supabaseWebinaire } = await import('../../public/config/supabase.config')
        
        // Essayer d'uploader vers Supabase Storage
        let uploadSuccess = false
        try {
          const { data: uploadData, error: uploadError } = await supabaseWebinaire.storage
            .from('webinaires') // Nom du bucket (à créer dans Supabase)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (!uploadError && uploadData) {
            // Upload réussi vers Supabase Storage
            const { data: { publicUrl } } = supabaseWebinaire.storage
              .from('webinaires')
              .getPublicUrl(fileName)

            setPhotoPreview(publicUrl)
            setFormData({ ...formData, photo_url: publicUrl })
            uploadSuccess = true
            // Pas besoin d'alerte, le preview suffit
          }
        } catch (storageError) {
          // Erreur silencieuse - le bucket n'existe probablement pas
          // On utilisera le fallback base64
        }

        // Si l'upload vers Supabase Storage a échoué, utiliser le fallback base64
        if (!uploadSuccess) {
          const reader = new FileReader()
          reader.onloadend = () => {
            setPhotoPreview(reader.result)
            setFormData({ ...formData, photo_url: reader.result })
            setUploadingPhoto(false)
            // Photo stockée en base64 (fonctionne mais moins optimal)
          }
          reader.onerror = () => {
            setUploadingPhoto(false)
            alert('Erreur lors de la lecture du fichier')
          }
          reader.readAsDataURL(file)
        } else {
          setUploadingPhoto(false)
        }
      } catch (err) {
        console.error('Erreur upload photo:', err)
        alert('Erreur lors de l\'upload de la photo: ' + err.message)
        setUploadingPhoto(false)
      }
    }

    // Calculer les KPI avancés
    const calculatedStats = useMemo(() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      
      const upcomingWebinaires = webinaires.filter(w => {
        const webinaireDate = new Date(w.date_webinaire)
        webinaireDate.setHours(0, 0, 0, 0)
        return webinaireDate >= now && w.is_active
      })
      
      const confirmedInscriptions = inscriptions.filter(i => i.statut === 'confirmed')
      const presentInscriptions = inscriptions.filter(i => i.presence === 'present')
      
      const tauxPresence = confirmedInscriptions.length > 0
        ? (presentInscriptions.length / confirmedInscriptions.length * 100)
        : 0

      // Compter les présentateurs uniques (par ID)
      const uniquePresentateurs = new Set()
      allPresentateurs.forEach(p => {
        if (p.id) {
          uniquePresentateurs.add(p.id)
        }
      })

      return {
        upcomingCount: upcomingWebinaires.length,
        confirmedInscriptions: confirmedInscriptions.length,
        presentInscriptions: presentInscriptions.length,
        tauxPresence,
        totalPresentateurs: uniquePresentateurs.size
      }
    }, [webinaires, inscriptions, allPresentateurs])

    useEffect(() => {
      if (!showModal) {
        setFormData({})
        setEditingId(null)
        setPhotoPreview(null)
      }
    }, [showModal])

    const handleSendWebinaireInvitation = async (inscription) => {
      if (inscription.statut !== 'confirmed') {
        alert("Vous ne pouvez envoyer l'invitation qu'aux inscriptions confirmées.")
        return
      }
      const accessLink = window.prompt(
        "Lien d'accès (Zoom, Teams, etc.) pour ce webinaire :",
        ''
      )
      if (!accessLink) return
      try {
        await sendWebinaireInscriptionInvitation(inscription.id, accessLink)
        alert('Invitation webinaire envoyée avec succès.')
      } catch (err) {
        alert(err.message || "Erreur lors de l'envoi de l'invitation webinaire")
      }
    }

    const handleSendWebinaireReminder = async (webinaire, kind) => {
      const accessLink = window.prompt(
        "Lien d'accès (Zoom, Teams, etc.) à rappeler aux participants :",
        webinaire.lien_webinaire || ''
      )
      if (!accessLink) return
      try {
        await sendWebinaireReminder(webinaire.id, { kind, accessLink })
        alert('Rappel webinaire envoyé avec succès.')
      } catch (err) {
        alert(err.message || 'Erreur lors de lenvoi du rappel webinaire')
      }
    }

    const filteredInscriptions = useMemo(
      () =>
        inscriptions.filter((i) => {
          if (!filters.search) return true
          const search = filters.search.toLowerCase()
          const webinaireTitle =
            webinaires.find((w) => w.id === i.webinaire_id)?.titre?.toLowerCase() || ''
          return (
            i.prenom?.toLowerCase().includes(search) ||
            i.nom?.toLowerCase().includes(search) ||
            i.email?.toLowerCase().includes(search) ||
            webinaireTitle.includes(search)
          )
        }),
      [inscriptions, filters.search, webinaires]
    )

    const allWebinaireInscriptionsSelected =
      filteredInscriptions.length > 0 &&
      filteredInscriptions.every((i) => selectedInscriptionIds.includes(i.id))

    const toggleSelectWebinaireInscription = (id) => {
      setSelectedInscriptionIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    }

    const toggleSelectAllWebinaireInscriptions = () => {
      if (allWebinaireInscriptionsSelected) {
        // Désélectionner seulement les visibles
        setSelectedInscriptionIds((prev) =>
          prev.filter((id) => !filteredInscriptions.some((i) => i.id === id))
        )
      } else {
        // Ajouter toutes les visibles
        setSelectedInscriptionIds((prev) => {
          const allIds = [...prev, ...filteredInscriptions.map((i) => i.id)]
          return Array.from(new Set(allIds))
        })
      }
    }

    const handleBulkWebinaireInscriptionsAction = async (action) => {
      if (selectedInscriptionIds.length === 0) {
        alert('Sélectionnez au moins une inscription.')
        return
      }

      if (
        action === 'delete' &&
        !window.confirm(
          `Supprimer définitivement ${selectedInscriptionIds.length} inscription(s) ?`
        )
      ) {
        return
      }

      try {
        if (action === 'invite') {
          const confirmedIds = selectedInscriptionIds.filter((id) => {
            const ins = inscriptions.find((i) => i.id === id)
            return ins && ins.statut === 'confirmed'
          })

          if (confirmedIds.length === 0) {
            alert("Aucune des inscriptions sélectionnées n'est confirmée.")
            return
          }

          const accessLink = window.prompt(
            "Lien d'accès (Zoom, Teams, etc.) à envoyer aux participants confirmés :",
            ''
          )
          if (!accessLink) return

          for (const id of confirmedIds) {
            await sendWebinaireInscriptionInvitation(id, accessLink)
          }

          alert('Invitations webinaire envoyées avec succès aux inscriptions confirmées sélectionnées.')
          setSelectedInscriptionIds([])
          await loadData()
          return
        }

        for (const id of selectedInscriptionIds) {
          if (action === 'confirm') {
            await updateWebinaireInscription(id, { statut: 'confirmed' })
          } else if (action === 'delete') {
            await deleteWebinaireInscription(id)
          }
        }

        const message =
          action === 'confirm'
            ? 'Inscriptions validées avec succès !'
            : 'Inscriptions supprimées avec succès !'

        alert(message)
        setSelectedInscriptionIds([])
        await loadData()
      } catch (err) {
        alert(err.message || 'Erreur lors du traitement des inscriptions sélectionnées')
      }
    }

    if (loading) {
      return <div className="module-content"><p>Chargement...</p></div>
    }

    return (
      <div className="module-content">
        {/* KPI Section Améliorée */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Webinaires actifs</p>
              <p className="kpi-value">{webinaires.filter(w => w.is_active).length}</p>
              <p className="card-subtitle">{webinaires.length} au total</p>
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
              <p className="kpi-value">{calculatedStats.upcomingCount}</p>
              <p className="card-subtitle">Prochainement</p>
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
              <p className="kpi-value">{inscriptions.length}</p>
              <p className="card-subtitle">{calculatedStats.confirmedInscriptions} confirmées</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Taux de présence</p>
              <p className="kpi-value">{calculatedStats.tauxPresence.toFixed(1)}%</p>
              <p className="card-subtitle">{calculatedStats.presentInscriptions} présents</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon teal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="kpi-content">
              <p className="kpi-label">Présentateurs</p>
              <p className="kpi-value">{calculatedStats.totalPresentateurs}</p>
              <p className="card-subtitle">Actifs</p>
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
              <p className="kpi-value">{inscriptions.filter(i => i.statut === 'pending').length}</p>
              <p className="card-subtitle">À valider</p>
            </div>
          </div>
        </section>

        {/* Barre d'actions */}
        <section style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              onClick={() => { setShowModal('webinaire'); setEditingId(null); setFormData({}) }}
            >
              + Webinaire
            </button>
            <button 
              className="btn-primary" 
              onClick={() => { setShowModal('inscription'); setEditingId(null); setFormData({}) }}
            >
              + Inscription
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{
                padding: '0.5rem 0.75rem',
                border: '2px solid #0066CC',
                borderRadius: '5px',
                fontSize: '0.9rem',
                background: 'white',
                color: '#212529',
                fontWeight: '500',
                minWidth: '200px'
              }}
            />
            <select
              value={filters.theme}
              onChange={(e) => setFilters({ ...filters, theme: e.target.value })}
              style={{
                padding: '0.5rem 0.75rem',
                border: '2px solid #0066CC',
                borderRadius: '5px',
                fontSize: '0.9rem',
                background: 'white',
                color: '#212529',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <option value="">Tous les thèmes</option>
              {[...new Set(webinaires.map(w => w.theme).filter(Boolean))].map((theme) => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Onglets */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '2px solid #e0e0e0',
            marginBottom: '1.5rem'
          }}>
            {[
              { id: 'webinaires', label: '📹 Webinaires', count: webinaires.length },
              { id: 'inscriptions', label: '👥 Inscriptions', count: inscriptions.length },
              { id: 'presentateurs', label: '👨‍🏫 Présentateurs', count: calculatedStats.totalPresentateurs }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'presentateurs' && selectedWebinaire) {
                    loadPresentateurs(selectedWebinaire)
                  }
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: activeTab === tab.id ? 'rgba(0,102,204,0.1)' : 'transparent',
                  borderBottom: activeTab === tab.id ? '3px solid #0066CC' : '3px solid transparent',
                  color: activeTab === tab.id ? '#0066CC' : '#495057',
                  fontWeight: activeTab === tab.id ? '700' : '500',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  position: 'relative',
                  bottom: '-2px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#0066CC'
                    e.target.style.background = 'rgba(0,102,204,0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#495057'
                    e.target.style.background = 'transparent'
                  }
                }}
              >
                {tab.label} <span style={{ 
                  marginLeft: '0.5rem',
                  padding: '0.2rem 0.5rem',
                  background: activeTab === tab.id ? '#0066CC' : '#e0e0e0',
                  color: activeTab === tab.id ? 'white' : '#666',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>{tab.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Contenu conditionnel selon l'onglet */}
        {activeTab === 'webinaires' && (
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">📹 Webinaires</h3>
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
                      <th>Présentateurs</th>
                      <th>Inscriptions</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webinaires
                      .filter(w => {
                        const searchMatch = !filters.search || 
                          w.titre?.toLowerCase().includes(filters.search.toLowerCase()) ||
                          w.theme?.toLowerCase().includes(filters.search.toLowerCase())
                        const themeMatch = !filters.theme || w.theme === filters.theme
                        return searchMatch && themeMatch
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Aucun webinaire</td>
                      </tr>
                    ) : (
                      webinaires
                        .filter(w => {
                          const searchMatch = !filters.search || 
                            w.titre?.toLowerCase().includes(filters.search.toLowerCase()) ||
                            w.theme?.toLowerCase().includes(filters.search.toLowerCase())
                          const themeMatch = !filters.theme || w.theme === filters.theme
                          return searchMatch && themeMatch
                        })
                        .map((webinaire) => {
                          const webinaireInscriptions = inscriptions.filter(i => i.webinaire_id === webinaire.id)
                          const webinairePresentateursCount = allPresentateurs.filter(p => p.webinaire_id === webinaire.id).length
                          return (
                            <tr key={webinaire.id}>
                              <td style={{ fontWeight: '600' }}>{webinaire.titre || '—'}</td>
                              <td>
                                <span style={{
                                  padding: '0.3rem 0.6rem',
                                  background: '#e7f3ff',
                                  color: '#0066CC',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem',
                                  fontWeight: '500'
                                }}>
                                  {webinaire.theme || '—'}
                                </span>
                              </td>
                              <td>{webinaire.date_webinaire ? new Date(webinaire.date_webinaire).toLocaleDateString('fr-FR') : '—'}</td>
                              <td>{webinaire.heure_debut ? webinaire.heure_debut.substring(0, 5) : '—'}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-link"
                                  onClick={() => {
                                    setSelectedWebinaire(webinaire.id)
                                    setActiveTab('presentateurs')
                                    loadPresentateurs(webinaire.id)
                                  }}
                                  style={{ fontWeight: '600', color: '#0066CC' }}
                                >
                                  {webinairePresentateursCount} présentateur{webinairePresentateursCount > 1 ? 's' : ''}
                                </button>
                              </td>
                              <td>
                                <span style={{ fontWeight: '600' }}>
                                  {webinaireInscriptions.filter(i => i.statut === 'confirmed').length}
                                </span>
                                {' / '}
                                {webinaire.capacite_max || '∞'}
                                {webinaire.capacite_max && (
                                  <span style={{ 
                                    marginLeft: '0.5rem',
                                    fontSize: '0.8rem',
                                    color: webinaireInscriptions.filter(i => i.statut === 'confirmed').length / webinaire.capacite_max >= 0.8 ? '#28a745' : '#666'
                                  }}>
                                    ({Math.round(webinaireInscriptions.filter(i => i.statut === 'confirmed').length / webinaire.capacite_max * 100)}%)
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`status-badge ${webinaire.is_active ? 'approved' : 'rejected'}`}>
                                  {webinaire.is_active ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button type="button" className="btn-link" onClick={() => { 
                                    setSelectedWebinaire(webinaire.id)
                                    setActiveTab('presentateurs')
                                    loadPresentateurs(webinaire.id)
                                  }}>
                                    Présentateurs
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleSendWebinaireReminder(webinaire, '48h')}
                                  >
                                    Rappel 48h
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleSendWebinaireReminder(webinaire, '2h')}
                                  >
                                    Rappel 2h
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
                          )
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'inscriptions' && (
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">👥 Inscriptions</h3>
                  <p className="card-subtitle">
                    {inscriptions.length} inscription
                    {inscriptions.length !== 1 ? 's' : ''} •{' '}
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {inscriptions.filter((i) => i.statut === 'confirmed').length} validée(s)
                    </span>{' '}
                    •{' '}
                    <span style={{ color: '#f97316', fontWeight: 600 }}>
                      {inscriptions.filter((i) => i.statut === 'pending').length} en attente
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #0066CC',
                      borderRadius: '999px',
                      fontSize: '0.9rem',
                      background: 'white',
                      color: '#212529',
                      fontWeight: '500',
                      minWidth: '220px',
                    }}
                  />
                  {selectedInscriptionIds.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                        onClick={() => handleBulkWebinaireInscriptionsAction('confirm')}
                      >
                        Valider la sélection
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.7rem',
                          fontSize: '0.8rem',
                        }}
                        onClick={() => handleBulkWebinaireInscriptionsAction('invite')}
                      >
                        Envoyer les invitations
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.7rem',
                          fontSize: '0.8rem',
                          backgroundColor: '#dc2626',
                          borderColor: '#dc2626',
                        }}
                        onClick={() => handleBulkWebinaireInscriptionsAction('delete')}
                      >
                        Supprimer la sélection
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={allWebinaireInscriptionsSelected}
                          onChange={toggleSelectAllWebinaireInscriptions}
                        />
                      </th>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Pays</th>
                      <th>Webinaire</th>
                      <th>Membre</th>
                      <th>Statut</th>
                      <th>Présence</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>Aucune inscription</td>
                      </tr>
                    ) : (
                      filteredInscriptions.map((inscription) => {
                          const webinaire = webinaires.find(w => w.id === inscription.webinaire_id)
                          return (
                            <tr key={inscription.id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedInscriptionIds.includes(inscription.id)}
                                  onChange={() => toggleSelectWebinaireInscription(inscription.id)}
                                />
                              </td>
                              <td style={{ fontWeight: '600' }}>{inscription.prenom} {inscription.nom}</td>
                              <td>{inscription.email || '—'}</td>
                              <td>{inscription.pays || '—'}</td>
                              <td>{webinaire?.titre || '—'}</td>
                              <td>
                                {inscription.membre_id ? (
                                  <span style={{ color: '#28a745', fontWeight: '600' }}>✓ Oui</span>
                                ) : (
                                  <span style={{ color: '#999' }}>Non</span>
                                )}
                              </td>
                              <td>
                                <span className={`status-badge ${
                                  inscription.statut === 'confirmed' ? 'approved' : 
                                  inscription.statut === 'pending' ? 'pending' : 
                                  'rejected'
                                }`}>
                                  {inscription.statut === 'confirmed' ? 'Confirmée' : 
                                   inscription.statut === 'pending' ? 'En attente' : 
                                   'Annulée'}
                                </span>
                              </td>
                              <td>
                                {inscription.presence ? (
                                  <span className={`status-badge ${inscription.presence === 'present' ? 'approved' : 'rejected'}`}>
                                    {inscription.presence === 'present' ? 'Présent' : 'Absent'}
                                  </span>
                                ) : (
                                  <span style={{ color: '#999', fontSize: '0.85rem' }}>—</span>
                                )}
                              </td>
                              <td>{inscription.created_at ? new Date(inscription.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                              <td>
                                <div className="table-actions">
                                  <button type="button" className="btn-link" onClick={() => { setShowModal('inscription'); setEditingId(inscription.id); setFormData(inscription) }}>
                                    Modifier
                                  </button>
                                  {inscription.statut === 'pending' && (
                                    <button
                                      type="button"
                                      className="btn-link"
                                      onClick={() => handleValidateWebinaireInscription(inscription.id)}
                                      style={{ color: '#16a34a' }}
                                    >
                                      Valider
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleSendWebinaireInvitation(inscription)}
                                  >
                                    Envoyer l'invitation
                                  </button>
                                  <button type="button" className="btn-link danger" onClick={() => handleDelete('inscription', inscription.id)}>
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'presentateurs' && (
          <section className="table-section">
            <div className="table-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">👨‍🏫 Présentateurs</h3>
                  <p className="card-subtitle">
                    {selectedWebinaire 
                      ? `${presentateurs.length} présentateur${presentateurs.length !== 1 ? 's' : ''} pour "${webinaires.find(w => w.id === selectedWebinaire)?.titre || 'ce webinaire'}"`
                      : `${presentateurs.length} présentateur${presentateurs.length !== 1 ? 's' : ''} au total`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {selectedWebinaire && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setSelectedWebinaire(null)
                        setPresentateurs([])
                      }}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    >
                      Voir tous
                    </button>
                  )}
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setShowModal('presentateur')
                      setEditingId(null)
                      setFormData({ webinaire_id: selectedWebinaire || '' })
                    }}
                  >
                    + Ajouter Présentateur
                  </button>
                </div>
              </div>
              <div className="table-container">
                {selectedWebinaire ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Nom</th>
                        <th>Biographie</th>
                        <th>LinkedIn</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presentateurs.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                            Aucun présentateur pour ce webinaire
                            <div style={{ marginTop: '1rem' }}>
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setShowModal('presentateur')
                                  setEditingId(null)
                                  setFormData({ webinaire_id: selectedWebinaire })
                                }}
                              >
                                + Ajouter le premier présentateur
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        presentateurs.map((presentateur) => (
                          <tr key={presentateur.id}>
                            <td>
                              {presentateur.photo_url ? (
                                <img
                                  src={presentateur.photo_url}
                                  alt={`${presentateur.prenom} ${presentateur.nom}`}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid #0066CC'
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    const fallback = e.target.nextElementSibling
                                    if (fallback) fallback.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div
                                style={{
                                  display: presentateur.photo_url ? 'none' : 'flex',
                                  width: '50px',
                                  height: '50px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '1.1rem'
                                }}
                              >
                                {(presentateur.prenom?.[0] || '').toUpperCase()}{(presentateur.nom?.[0] || '').toUpperCase()}
                              </div>
                            </td>
                            <td style={{ fontWeight: '600' }}>{presentateur.prenom} {presentateur.nom}</td>
                            <td>
                              <div style={{
                                maxWidth: '300px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {presentateur.bio || '—'}
                              </div>
                            </td>
                            <td>
                              {presentateur.linkedin ? (
                                <a
                                  href={presentateur.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#0066CC', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                  </svg>
                                  LinkedIn
                                </a>
                              ) : (
                                <span style={{ color: '#999' }}>—</span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button type="button" className="btn-link" onClick={() => { 
                                  setShowModal('presentateur')
                                  setEditingId(presentateur.id)
                                  setFormData(presentateur)
                                  setPhotoPreview(presentateur.photo_url)
                                }}>
                                  Modifier
                                </button>
                                <button type="button" className="btn-link danger" onClick={() => handleDelete('presentateur', presentateur.id)}>
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍🏫</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Sélectionnez un webinaire</h3>
                    <p style={{ marginBottom: '1.5rem' }}>
                      Cliquez sur "Présentateurs" dans la liste des webinaires pour voir et gérer les présentateurs d'un webinaire spécifique.
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '1rem',
                      marginTop: '2rem'
                    }}>
                      {webinaires.map(webinaire => (
                        <button
                          key={webinaire.id}
                          type="button"
                          onClick={() => {
                            setSelectedWebinaire(webinaire.id)
                            loadPresentateurs(webinaire.id)
                          }}
                          style={{
                            padding: '1.5rem',
                            background: 'white',
                            border: '2px solid #0066CC',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#f0f7ff'
                            e.target.style.transform = 'translateY(-2px)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white'
                            e.target.style.transform = 'translateY(0)'
                          }}
                        >
                          <div style={{ fontWeight: '600', color: '#0066CC', marginBottom: '0.5rem' }}>
                            {webinaire.titre}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            {webinaire.date_webinaire ? new Date(webinaire.date_webinaire).toLocaleDateString('fr-FR') : '—'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

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
                      <label>Image URL</label>
                      <input 
                        type="url" 
                        value={formData.image_url || ''} 
                        onChange={(e) => {
                          const url = e.target.value
                          if (url && url.startsWith('file://')) {
                            alert('Les chemins de fichiers locaux ne sont pas supportés. Veuillez utiliser une URL publique.')
                            return
                          }
                          setFormData({ ...formData, image_url: url })
                        }} 
                        placeholder="https://..." 
                        style={{
                          border: formData.image_url && formData.image_url.startsWith('file://') ? '2px solid #ffc107' : undefined
                        }}
                      />
                      {formData.image_url && formData.image_url.startsWith('file://') && (
                        <small style={{ color: '#856404', display: 'block', marginTop: '0.25rem' }}>
                          ⚠️ Les chemins de fichiers locaux ne sont pas supportés.
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Lien webinaire</label>
                      <input 
                        type="url" 
                        value={formData.lien_webinaire || ''} 
                        onChange={(e) => {
                          const url = e.target.value
                          if (url && url.startsWith('file://')) {
                            alert('Les chemins de fichiers locaux ne sont pas supportés. Veuillez utiliser une URL publique.')
                            return
                          }
                          setFormData({ ...formData, lien_webinaire: url })
                        }}
                        style={{
                          border: formData.lien_webinaire && formData.lien_webinaire.startsWith('file://') ? '2px solid #ffc107' : undefined
                        }}
                      />
                      {formData.lien_webinaire && formData.lien_webinaire.startsWith('file://') && (
                        <small style={{ color: '#856404', display: 'block', marginTop: '0.25rem' }}>
                          ⚠️ Les chemins de fichiers locaux ne sont pas supportés.
                        </small>
                      )}
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
                      <textarea value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows="3" placeholder="Présentation du présentateur..." />
                    </div>
                    <div className="form-group">
                      <label>Photo du présentateur</label>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        {/* Preview de la photo */}
                        {(photoPreview || formData.photo_url) && 
                         !(photoPreview || formData.photo_url)?.startsWith('file://') && (
                          <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '2px solid #0066CC',
                            position: 'relative',
                            background: '#f8f9fa'
                          }}>
                            <img
                              src={photoPreview || formData.photo_url}
                              alt="Preview"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none'
                                const fallback = e.target.nextElementSibling
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                            <div
                              style={{
                                display: (!photoPreview && !formData.photo_url) || (photoPreview || formData.photo_url)?.startsWith('file://') ? 'flex' : 'none',
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, #0066CC, #0052A3)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '2rem'
                              }}
                            >
                              {(formData.prenom?.[0] || '').toUpperCase()}{(formData.nom?.[0] || '').toUpperCase()}
                            </div>
                            {(photoPreview || formData.photo_url) && !(photoPreview || formData.photo_url)?.startsWith('file://') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoPreview(null)
                                  setFormData({ ...formData, photo_url: '' })
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '0.5rem',
                                  right: '0.5rem',
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '30px',
                                  height: '30px',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}
                                title="Supprimer la photo"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Input file */}
                        <div style={{
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}>
                          <label
                            style={{
                              padding: '0.75rem 1.5rem',
                              background: uploadingPhoto ? '#ccc' : '#0066CC',
                              color: 'white',
                              borderRadius: '8px',
                              cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              fontSize: '0.9rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s',
                              border: 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!uploadingPhoto) {
                                e.target.style.background = '#0052A3'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!uploadingPhoto) {
                                e.target.style.background = '#0066CC'
                              }
                            }}
                          >
                            {uploadingPhoto ? (
                              <>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  border: '2px solid white',
                                  borderTop: '2px solid transparent',
                                  borderRadius: '50%',
                                  animation: 'spin 0.8s linear infinite'
                                }}></div>
                                Upload en cours...
                              </>
                            ) : (
                              <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="17 8 12 3 7 8"></polyline>
                                  <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                {photoPreview || formData.photo_url ? 'Changer la photo' : 'Uploader une photo'}
                              </>
                            )}
                            <style>{`
                              @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                              }
                            `}</style>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              disabled={uploadingPhoto}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <small style={{ color: '#666', fontSize: '0.85rem' }}>
                            Formats acceptés: JPG, PNG, GIF (max 5MB)
                          </small>
                        </div>
                        
                        {/* URL manuelle (fallback) */}
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #dee2e6'
                        }}>
                          <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', display: 'block' }}>
                            Ou entrer une URL manuellement :
                          </label>
                          <input
                            type="url"
                            value={formData.photo_url || ''}
                            onChange={(e) => {
                              const url = e.target.value
                              // Filtrer les URLs file://
                              if (url && url.startsWith('file://')) {
                                alert('Les chemins de fichiers locaux ne sont pas supportés. Veuillez utiliser une URL publique ou uploader une image.')
                                return
                              }
                              setFormData({ ...formData, photo_url: url })
                              if (url && !url.startsWith('file://')) {
                                setPhotoPreview(url)
                              }
                            }}
                            placeholder="https://exemple.com/photo.jpg"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: formData.photo_url && formData.photo_url.startsWith('file://') ? '2px solid #ffc107' : '1px solid #ddd',
                              borderRadius: '5px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>LinkedIn</label>
                      <input 
                        type="url" 
                        value={formData.linkedin || ''} 
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} 
                        placeholder="https://linkedin.com/in/..."
                      />
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
          <div className="sidebar-brand">
            <img src={logoASGF} alt="ASGF" className="sidebar-logo" />
            <div>
              <p className="sidebar-title">ASGF Admin</p>
              <span className="sidebar-subtitle">Gestion centrale</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Fermer le menu"
            onClick={() => setSidebarOpen(false)}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">{getInitials(admin)}</div>
          <div className="sidebar-profile-info">
            <p className="sidebar-name">{adminDisplayName}</p>
            <span className="sidebar-role">{adminRoleLabel}</span>
          </div>
        </div>

        <div className="sidebar-menu-heading">
          <span>Navigation</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleModuleSelect('dashboard')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'adhesions' ? 'active' : ''} ${!canAccessModule('adhesions') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('adhesions')}
            aria-disabled={!canAccessModule('adhesions')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Adhésions</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'members' ? 'active' : ''} ${!canAccessModule('members') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('members')}
            aria-disabled={!canAccessModule('members')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Membres</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'formations' ? 'active' : ''} ${!canAccessModule('formations') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('formations')}
            aria-disabled={!canAccessModule('formations')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Formations</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'webinaires' ? 'active' : ''} ${!canAccessModule('webinaires') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('webinaires')}
            aria-disabled={!canAccessModule('webinaires')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Webinaires</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'studio' ? 'active' : ''} ${!canAccessModule('studio') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('studio')}
            aria-disabled={!canAccessModule('studio')}
            style={{
              background: activeModule === 'studio' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: activeModule === 'studio' ? 'white' : '#666',
              borderLeft: activeModule === 'studio' ? '3px solid #764ba2' : '3px solid transparent'
            }}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Studio</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'tresorerie' ? 'active' : ''} ${!canAccessModule('tresorerie') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('tresorerie')}
            aria-disabled={!canAccessModule('tresorerie')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Trésorerie</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'secretariat' ? 'active' : ''} ${!canAccessModule('secretariat') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('secretariat')}
            aria-disabled={!canAccessModule('secretariat')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Secrétariat</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'mentorat' ? 'active' : ''} ${!canAccessModule('mentorat') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('mentorat')}
            aria-disabled={!canAccessModule('mentorat')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Mentorat</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'recrutement' ? 'active' : ''} ${!canAccessModule('recrutement') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('recrutement')}
            aria-disabled={!canAccessModule('recrutement')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Recrutement</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'projets' ? 'active' : ''} ${!canAccessModule('projets') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('projets')}
            aria-disabled={!canAccessModule('projets')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Projets</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'settings' ? 'active' : ''} ${!canAccessModule('settings') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('settings')}
            aria-disabled={!canAccessModule('settings')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Paramètres</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'audit' ? 'active' : ''} ${!canAccessModule('audit') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('audit')}
            aria-disabled={!canAccessModule('audit')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Historique</span>
          </button>

          <button
            className={`nav-item ${activeModule === 'calendar' ? 'active' : ''} ${!canAccessModule('calendar') ? 'restricted' : ''}`}
            onClick={() => handleModuleSelect('calendar')}
            aria-disabled={!canAccessModule('calendar')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Calendrier</span>
          </button>
        </nav>

        <button className="sidebar-logout" onClick={onLogout}>
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </aside>

      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={sidebarOpen ? 'false' : 'true'}
      />

      {/* Main Content */}
      <div className="admin-main-content">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Ouvrir le menu"
              aria-pressed={sidebarOpen}
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
                <span className="admin-name">{adminDisplayName}</span>
                <span className="admin-role">{adminRoleLabel}</span>
              </div>
              <div className="admin-avatar">
                {getInitials(admin)}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="admin-content page-transition">
          {accessDeniedInfo && !hasAccessToActiveModule && activeModule !== 'dashboard' ? (
            <div className="access-denied-overlay">
              <div className="access-denied-card">
                <h3>Accès refusé</h3>
                <p>
                  Vous n'avez pas les autorisations nécessaires pour consulter <strong>{accessDeniedInfo.label}</strong>.
                </p>
                <p>Désolé, veuillez contacter le Président Serigne Omar.</p>
                <div className="access-denied-actions">
                  <button className="btn-primary" onClick={() => handleModuleSelect('dashboard')}>
                    Retour au tableau de bord
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Dashboard toujours accessible */}
              {activeModule === 'dashboard' && (
                <>
                  {/* Vue d'ensemble de l'activité de l'association */}
                  <section className="dashboard-overview">
                    <h2 className="section-title">Vue d'ensemble de l'activité</h2>
                    {statsLoading ? (
                      <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Chargement des statistiques...</p>
                      </div>
                    ) : (
                      <div className="modules-grid">
                        {/* Adhésions */}
                        <div className={`module-card ${!canAccessModule('adhesions') ? 'disabled' : ''}`} onClick={() => canAccessModule('adhesions') && handleModuleSelect('adhesions')}>
                          <div className="module-header">
                            <div className="module-icon blue">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <h3 className="module-title">Adhésions</h3>
                          </div>
                          <div className="module-stats">
                            <div className="stat-item">
                              <span className="stat-label">Membres totaux</span>
                              <span className="stat-value">{allStats.adhesion?.total_membres || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">En attente</span>
                              <span className="stat-value orange">{allStats.adhesion?.membres_en_attente || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Approuvés</span>
                              <span className="stat-value green">{allStats.adhesion?.membres_approuves || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Formations */}
                        <div className={`module-card ${!canAccessModule('formations') ? 'disabled' : ''}`} onClick={() => canAccessModule('formations') && handleModuleSelect('formations')}>
                          <div className="module-header">
                            <div className="module-icon green">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <h3 className="module-title">Formations</h3>
                          </div>
                          <div className="module-stats">
                            <div className="stat-item">
                              <span className="stat-label">Formations actives</span>
                              <span className="stat-value">{allStats.formation?.total_formations || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Sessions</span>
                              <span className="stat-value">{allStats.formation?.total_sessions || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Inscriptions</span>
                              <span className="stat-value">{allStats.formation?.total_inscriptions || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Webinaires */}
                        <div className={`module-card ${!canAccessModule('webinaires') ? 'disabled' : ''}`} onClick={() => canAccessModule('webinaires') && handleModuleSelect('webinaires')}>
                          <div className="module-header">
                            <div className="module-icon purple">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h3 className="module-title">Webinaires</h3>
                          </div>
                          <div className="module-stats">
                            <div className="stat-item">
                              <span className="stat-label">Webinaires</span>
                              <span className="stat-value">{allStats.webinaire?.total_webinaires || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Inscriptions</span>
                              <span className="stat-value">{allStats.webinaire?.total_inscriptions || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Présentateurs</span>
                              <span className="stat-value">{allStats.webinaire?.total_presentateurs || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Trésorerie */}
                        <div className={`module-card ${!canAccessModule('tresorerie') ? 'disabled' : ''}`} onClick={() => canAccessModule('tresorerie') && handleModuleSelect('tresorerie')}>
                          <div className="module-header">
                            <div className="module-icon yellow">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="module-title">Trésorerie</h3>
                          </div>
                          <div className="module-stats">
                            <div className="stat-item">
                              <span className="stat-label">Solde total</span>
                              <span className="stat-value" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#22c55e' }}>
                                {(() => {
                                  const tresorerie = allStats.tresorerie || {}
                                  const solde = tresorerie.solde_total_eur ?? tresorerie.solde_total ?? 0
                                  return typeof solde === 'number' && !isNaN(solde) 
                                    ? solde.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' 
                                    : '0,00 €'
                                })()}
                              </span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Recettes (cotisations + dons + cartes)</span>
                              <span className="stat-value green">
                                {(() => {
                                  const tresorerie = allStats.tresorerie || {}
                                  const cotisations = tresorerie.montant_total_eur ?? tresorerie.montant_total ?? 0
                                  const dons = tresorerie.total_paiements_dons_eur ?? 0
                                  const cartes = tresorerie.revenus_cartes_membres_eur ?? 0
                                  const total = (typeof cotisations === 'number' && !isNaN(cotisations) ? cotisations : 0) + 
                                               (typeof dons === 'number' && !isNaN(dons) ? dons : 0) +
                                               (typeof cartes === 'number' && !isNaN(cartes) ? cartes : 0)
                                  return total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
                                })()}
                              </span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Dépenses validées</span>
                              <span className="stat-value orange">
                                {(() => {
                                  const tresorerie = allStats.tresorerie || {}
                                  const depenses = tresorerie.depenses_validees_eur ?? 0
                                  return (typeof depenses === 'number' && !isNaN(depenses) ? depenses : 0).toLocaleString('fr-FR') + ' €'
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Secrétariat */}
                        <div className={`module-card ${!canAccessModule('secretariat') ? 'disabled' : ''}`} onClick={() => canAccessModule('secretariat') && handleModuleSelect('secretariat')}>
                          <div className="module-header">
                            <div className="module-icon teal">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="module-title">Secrétariat</h3>
                          </div>
                          <div className="module-stats">
                            <div className="stat-item">
                              <span className="stat-label">Réunions</span>
                              <span className="stat-value">{allStats.secretariat?.total_reunions || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Actions</span>
                              <span className="stat-value">{allStats.secretariat?.total_actions || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Documents</span>
                              <span className="stat-value">{allStats.secretariat?.total_documents || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Mentorat */}
                        <div className={`module-card ${!canAccessModule('mentorat') ? 'disabled' : ''}`} onClick={() => canAccessModule('mentorat') && handleModuleSelect('mentorat')}>
                          <div className="module-header">
                            <div className="module-icon indigo">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <h3 className="module-title">Mentorat</h3>
                          </div>
                          <div className="module-stats">
                            <div className="stat-item">
                              <span className="stat-label">Relations actives</span>
                              <span className="stat-value">{allStats.mentorat?.relations_actives || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Mentors</span>
                              <span className="stat-value">{allStats.mentorat?.total_mentors || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Mentés</span>
                              <span className="stat-value">{allStats.mentorat?.total_mentees || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recrutement */}
                        <div className={`module-card ${!canAccessModule('recrutement') ? 'disabled' : ''}`} onClick={() => canAccessModule('recrutement') && handleModuleSelect('recrutement')}>
                          <div className="module-header">
                            <div className="module-icon red">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h3 className="module-title">Recrutement</h3>
                          </div>
                          <div className="module-stats">
                            <div className="stat-item">
                              <span className="stat-label">Candidatures</span>
                              <span className="stat-value">{allStats.recrutement?.total_candidatures || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">En cours</span>
                              <span className="stat-value orange">{allStats.recrutement?.candidatures_en_cours || 0}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Acceptées</span>
                              <span className="stat-value green">{allStats.recrutement?.candidatures_acceptees || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
              {/* Autres modules - seulement si accès autorisé */}
              {activeModule === 'members' && hasAccessToActiveModule && <MembersContent />}
              {activeModule === 'adhesions' && hasAccessToActiveModule && <AdhesionContent />}
              {activeModule === 'formations' && hasAccessToActiveModule && <FormationsContent />}
              {activeModule === 'webinaires' && hasAccessToActiveModule && <WebinairesContent />}
              {activeModule === 'studio' && hasAccessToActiveModule && <StudioContent />}
              {activeModule === 'mentorat' && hasAccessToActiveModule && <MentoratContent />}
              {activeModule === 'recrutement' && hasAccessToActiveModule && <RecrutementContent />}
              {activeModule === 'tresorerie' && hasAccessToActiveModule && <TresorerieContent />}
              {activeModule === 'secretariat' && hasAccessToActiveModule && <SecretariatDashboard currentUser={admin} />}
              {activeModule === 'projets' && hasAccessToActiveModule && <ProjetsContent />}
              {activeModule === 'audit' && hasAccessToActiveModule && <AuditLogContent />}
              {activeModule === 'calendar' && hasAccessToActiveModule && <CalendarContent />}
              {activeModule === 'settings' && hasAccessToActiveModule && <AdminSettingsPanel currentAdmin={admin} />}
            </>
          )}
      </main>
      </div>
    </div>
  )
}

export default AdminDashboard
