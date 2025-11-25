// frontend/src/services/api.js

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Fonction utilitaire pour récupérer le token
function getAuthToken() {
  return localStorage.getItem('asgf_admin_token') || ''
}

// Fonction utilitaire pour les headers avec auth
function getAuthHeaders() {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value)
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

async function downloadBinaryResource(endpoint, params = {}) {
  const query = buildQueryString(params)
  const res = await fetch(`${API_URL}${endpoint}${query}`, {
    headers: {
      ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
    },
  })

  if (!res.ok) {
    const errorPayload = await res.json().catch(() => null)
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(errorPayload?.message || 'Erreur lors du téléchargement')
  }

  const blob = await res.blob()
  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const filename = match ? match[1] : 'export-asgf.dat'
  return { blob, filename }
}

async function sendJsonRequest(endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: getAuthHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la requête')
  }

  return data?.data !== undefined ? data.data : data
}

// 🔐 Login admin (numéro de membre + mot de passe)
export async function loginAdminApi({ numeroMembre, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      numero_membre: numeroMembre,
      password,
    }),
  })

  const response = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(response?.message || 'Erreur de connexion')
  }

  // Le backend retourne : { success: true, data: { token, admin } }
  // On extrait data pour avoir { token, admin }
  const data = response?.data || response
  
  // Vérification que le token et admin sont présents
  if (!data?.token) {
    console.error('Token manquant dans la réponse:', response)
    throw new Error('Token manquant dans la réponse du serveur')
  }
  
  if (!data?.admin) {
    console.error('Admin manquant dans la réponse:', response)
    throw new Error('Données admin manquantes dans la réponse du serveur')
  }
  
  console.log('Login réussi - Token présent:', !!data.token, 'Admin présent:', !!data.admin)
  
  return data // { token, admin }
}

// ───── Adhésions (dashboard admin) ─────

export async function fetchPendingMembers() {
  const token = getAuthToken()
  
  if (!token) {
    throw new Error('Token manquant. Veuillez vous reconnecter.')
  }

  const res = await fetch(`${API_URL}/admin/members/pending`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // Si 401, le token est invalide ou expiré
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(
      data?.message || 'Erreur lors du chargement des membres en attente'
    )
  }

  // Gérer le nouveau format { success: true, data: [...] } ou l'ancien format (tableau direct)
  return data?.data || data || []
}

export async function approveMember(memberId) {
  const token = getAuthToken()
  
  if (!token) {
    throw new Error('Token manquant. Veuillez vous reconnecter.')
  }

  const res = await fetch(`${API_URL}/admin/members/${memberId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(
      data?.message || 'Erreur lors de la validation du membre'
    )
  }

  return data?.data || data
}

export async function rejectMember(memberId) {
  const token = getAuthToken()
  
  if (!token) {
    throw new Error('Token manquant. Veuillez vous reconnecter.')
  }

  const res = await fetch(`${API_URL}/admin/members/${memberId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(
      data?.message || 'Erreur lors du rejet du membre'
    )
  }

  return data?.data || data
}

// ───── Mentorat ─────

export async function fetchMentors(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.search && { search: params.search }),
    ...(params.domaine && { domaine: params.domaine }),
    ...(params.status && { status: params.status }),
  }).toString()

  const res = await fetch(`${API_URL}/api/mentorat/mentors?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des mentors')
  }

  return data?.data || []
}

export async function fetchMentees(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.search && { search: params.search }),
    ...(params.domaine && { domaine: params.domaine }),
    ...(params.status && { status: params.status }),
  }).toString()

  const res = await fetch(`${API_URL}/api/mentorat/mentees?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des mentorés')
  }

  return data?.data || []
}

export async function createMentor(mentorData) {
  const res = await fetch(`${API_URL}/api/mentorat/mentors`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mentorData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du mentor')
  }

  return data?.data || data
}

export async function createMentee(menteeData) {
  const res = await fetch(`${API_URL}/api/mentorat/mentees`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(menteeData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du mentoré')
  }

  return data?.data || data
}

export async function fetchRelations(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.status && { status: params.status }),
  }).toString()

  const res = await fetch(`${API_URL}/api/mentorat/relations?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des relations')
  }

  // Le backend retourne { success: true, data: { relations: [...], pagination: {...} } }
  // ou directement { success: true, data: [...] }
  if (data?.data?.relations) {
    return data.data
  }
  return data?.data || []
}

export async function createRelation(relationData) {
  const res = await fetch(`${API_URL}/api/mentorat/relations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(relationData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la relation')
  }

  return data?.data || data
}

export async function fetchMentoratStats() {
  const res = await fetch(`${API_URL}/api/mentorat/stats`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des statistiques')
  }

  return data?.data || {}
}

export async function createRendezVous(rdvData) {
  const res = await fetch(`${API_URL}/api/mentorat/rendezvous`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(rdvData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du rendez-vous')
  }

  return data?.data || data
}

// ───── Recrutement ─────

export async function fetchCandidatures(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.search && { search: params.search }),
    ...(params.statut && { statut: params.statut }),
    ...(params.type_contrat && { type_contrat: params.type_contrat }),
  }).toString()

  const res = await fetch(`${API_URL}/api/recrutement/candidatures?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des candidatures')
  }

  // Le backend retourne { success: true, data: { candidatures: [...], pagination: {...} } }
  // ou directement { success: true, data: [...] }
  if (data?.data?.candidatures) {
    return data.data
  }
  return data?.data || []
}

export async function fetchRecrutementStats() {
  const res = await fetch(`${API_URL}/api/recrutement/stats`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des statistiques')
  }

  return data?.data || {}
}

export async function createCandidature(candidatureData) {
  const res = await fetch(`${API_URL}/api/recrutement/candidatures`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(candidatureData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la candidature')
  }

  return data?.data || data
}

export async function createRecommandation(recommandationData) {
  const res = await fetch(`${API_URL}/api/recrutement/recommandations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(recommandationData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la recommandation')
  }

  return data?.data || data
}

export async function createSuivi(suiviData) {
  const res = await fetch(`${API_URL}/api/recrutement/suivis`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(suiviData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du suivi')
  }

  return data?.data || data
}

// Fonction pour récupérer tous les membres (pour les sélecteurs)
export async function fetchAllMembers(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 100,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status }),
  }).toString()

  const res = await fetch(`${API_URL}/api/adhesion/members?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des membres')
  }

  return data?.data || []
}

// ───── Trésorerie ─────

export async function fetchTresorerieStats() {
  const res = await fetch(`${API_URL}/api/tresorerie/stats`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des statistiques')
  }

  return data?.data || {}
}

export async function fetchCotisations(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.annee && { annee: params.annee }),
    ...(params.periode_mois && { periode_mois: params.periode_mois }),
    ...(params.periode_annee && { periode_annee: params.periode_annee }),
    ...(params.statut_paiement && { statut_paiement: params.statut_paiement }),
  }).toString()

  const res = await fetch(`${API_URL}/api/tresorerie/cotisations?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des cotisations')
  }

  return data?.data || []
}

export async function createCotisation(cotisationData) {
  const res = await fetch(`${API_URL}/api/tresorerie/cotisations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(cotisationData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la cotisation')
  }

  return data?.data || data
}

export async function fetchPaiements(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.periode_mois && { periode_mois: params.periode_mois }),
    ...(params.periode_annee && { periode_annee: params.periode_annee }),
    ...(params.type_paiement && { type_paiement: params.type_paiement }),
    ...(params.statut && { statut: params.statut }),
  }).toString()

  const res = await fetch(`${API_URL}/api/tresorerie/paiements?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des paiements')
  }

  return data?.data || []
}

export async function createPaiement(paiementData) {
  const res = await fetch(`${API_URL}/api/tresorerie/paiements`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(paiementData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du paiement')
  }

  return data?.data || data
}

export async function createRelance(relanceData) {
  const res = await fetch(`${API_URL}/api/tresorerie/relances`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(relanceData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la relance')
  }

  return data?.data || data
}

export async function createCarteMembre(carteData) {
  const res = await fetch(`${API_URL}/api/tresorerie/cartes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(carteData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la carte membre')
  }

  return data?.data || data
}

export async function fetchDepenses(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.statut && { statut: params.statut }),
    ...(params.categorie && { categorie: params.categorie }),
    ...(params.periode_mois && { periode_mois: params.periode_mois }),
    ...(params.periode_annee && { periode_annee: params.periode_annee }),
  }).toString()

  const res = await fetch(`${API_URL}/api/tresorerie/depenses?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des dépenses')
  }

  return data?.data || []
}

export async function createDepense(depenseData) {
  const res = await fetch(`${API_URL}/api/tresorerie/depenses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(depenseData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la dépense')
  }

  return data?.data || data
}

export async function updateDepense(depenseId, updates) {
  const res = await fetch(`${API_URL}/api/tresorerie/depenses/${depenseId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la mise à jour de la dépense')
  }

  return data?.data || data
}

export async function fetchHistorique(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.action && { action: params.action }),
  }).toString()

  const res = await fetch(`${API_URL}/api/tresorerie/historique?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement de l’historique')
  }

  return data?.data || []
}

export function validateCotisation(cotisationId, payload = {}) {
  return sendJsonRequest(`/api/tresorerie/cotisations/${cotisationId}/validate`, {
    method: 'POST',
    body: payload,
  })
}

export function resetCotisation(cotisationId) {
  return sendJsonRequest(`/api/tresorerie/cotisations/${cotisationId}/reset`, {
    method: 'POST',
  })
}

export function deleteCotisation(cotisationId) {
  return sendJsonRequest(`/api/tresorerie/cotisations/${cotisationId}`, {
    method: 'DELETE',
  })
}

export function validatePaiement(paiementId, payload = {}) {
  return sendJsonRequest(`/api/tresorerie/paiements/${paiementId}/validate`, {
    method: 'POST',
    body: payload,
  })
}

export function cancelPaiement(paiementId, payload = {}) {
  return sendJsonRequest(`/api/tresorerie/paiements/${paiementId}/cancel`, {
    method: 'POST',
    body: payload,
  })
}

export function deletePaiement(paiementId) {
  return sendJsonRequest(`/api/tresorerie/paiements/${paiementId}`, {
    method: 'DELETE',
  })
}

export function validateDepense(depenseId) {
  return sendJsonRequest(`/api/tresorerie/depenses/${depenseId}/validate`, {
    method: 'POST',
  })
}

export function rejectDepense(depenseId, payload = {}) {
  return sendJsonRequest(`/api/tresorerie/depenses/${depenseId}/reject`, {
    method: 'POST',
    body: payload,
  })
}

export function deleteDepense(depenseId) {
  return sendJsonRequest(`/api/tresorerie/depenses/${depenseId}`, {
    method: 'DELETE',
  })
}

export function downloadCotisationsExport(params = {}) {
  return downloadBinaryResource('/api/tresorerie/exports/cotisations', params)
}

export function downloadPaiementsExport(params = {}) {
  return downloadBinaryResource('/api/tresorerie/exports/paiements', params)
}

export function downloadDepensesExport(params = {}) {
  return downloadBinaryResource('/api/tresorerie/exports/depenses', params)
}

export function downloadTresorerieReport(params = {}) {
  return downloadBinaryResource('/api/tresorerie/reports/mensuel', params)
}

// ───── Secrétariat ─────

export async function fetchSecretariatStats() {
  const res = await fetch(`${API_URL}/api/secretariat/stats`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des statistiques')
  }

  return data?.data || {}
}

export async function fetchReunions(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.type_reunion && { type_reunion: params.type_reunion }),
    ...(params.pole && { pole: params.pole }),
  }).toString()

  const res = await fetch(`${API_URL}/api/secretariat/reunions?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des réunions')
  }

  return data?.data || []
}

export async function createReunion(reunionData) {
  const res = await fetch(`${API_URL}/api/secretariat/reunions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(reunionData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la réunion')
  }

  return data?.data || data
}

export async function addParticipant(participantData) {
  const res = await fetch(`${API_URL}/api/secretariat/participants`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(participantData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de l\'ajout du participant')
  }

  return data?.data || data
}

export async function createAction(actionData) {
  const res = await fetch(`${API_URL}/api/secretariat/actions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(actionData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de l\'action')
  }

  return data?.data || data
}

export async function saveCompteRendu(compteRenduData) {
  const res = await fetch(`${API_URL}/api/secretariat/comptes-rendus`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(compteRenduData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la sauvegarde du compte rendu')
  }

  return data?.data || data
}

export async function createDocument(documentData) {
  const res = await fetch(`${API_URL}/api/secretariat/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(documentData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du document')
  }

  return data?.data || data
}
