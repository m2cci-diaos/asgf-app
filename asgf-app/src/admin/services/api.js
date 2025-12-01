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

async function downloadBinaryResource(endpoint, params = {}, fallbackName = 'export-asgf.dat') {
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
  const filename = match ? match[1] : fallbackName
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

export async function fetchAdhesionStats() {
  const res = await fetch(`${API_URL}/api/adhesion/stats`, {
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

export async function updateMember(memberId, memberData) {
  const token = getAuthToken()
  
  if (!token) {
    throw new Error('Token manquant. Veuillez vous reconnecter.')
  }

  const res = await fetch(`${API_URL}/api/adhesion/members/${memberId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(memberData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    // Améliorer le message d'erreur pour inclure les détails de validation
    const errorMessage = data?.message || data?.errors?.[0]?.message || 'Erreur lors de la mise à jour du membre'
    const errorDetails = data?.errors ? ` (${data.errors.map(e => e.message || e.field).join(', ')})` : ''
    throw new Error(errorMessage + errorDetails)
  }

  return data?.data || data
}

export async function deleteMember(memberId) {
  const token = getAuthToken()
  
  if (!token) {
    throw new Error('Token manquant. Veuillez vous reconnecter.')
  }

  const res = await fetch(`${API_URL}/api/adhesion/members/${memberId}`, {
    method: 'DELETE',
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
      data?.message || 'Erreur lors de la suppression du membre'
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

export async function getRelation(relationId) {
  const res = await fetch(`${API_URL}/api/mentorat/relations/${relationId}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement de la relation')
  }

  return data?.data || data
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

export async function closeRelation(relationId, commentaire = null) {
  const res = await fetch(`${API_URL}/api/mentorat/relations/${relationId}/close`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ commentaire }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la clôture de la relation')
  }

  return data?.data || data
}

export async function fetchObjectifsByRelation(relationId) {
  const res = await fetch(`${API_URL}/api/mentorat/relations/${relationId}/objectifs`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des objectifs')
  }

  return data?.data || []
}

export async function fetchRendezVousByRelation(relationId) {
  const res = await fetch(`${API_URL}/api/mentorat/relations/${relationId}/rendezvous`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des rendez-vous')
  }

  return data?.data || []
}

export async function createObjectif(objectifData) {
  const res = await fetch(`${API_URL}/api/mentorat/objectifs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(objectifData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de l\'objectif')
  }

  return data?.data || data
}

export async function updateObjectif(objectifId, objectifData) {
  const res = await fetch(`${API_URL}/api/mentorat/objectifs/${objectifId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(objectifData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la mise à jour de l\'objectif')
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

  // Le backend retourne { success: true, data: [...], pagination: {...} }
  // où data est directement le tableau de candidatures
  if (data?.success && Array.isArray(data.data)) {
    return {
      candidatures: data.data,
      pagination: data.pagination || {},
    }
  }
  // Fallback pour compatibilité
  if (data?.data?.candidatures) {
    return data.data
  }
  if (Array.isArray(data?.data)) {
    return {
      candidatures: data.data,
      pagination: data.pagination || {},
    }
  }
  return { candidatures: [], pagination: {} }
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
    // Gérer les erreurs de doublon
    if (data?.code === 'DUPLICATE_CANDIDATURE') {
      throw new Error('Une candidature similaire existe déjà pour ce membre. Vérifiez avant de continuer.')
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
    // Gérer les erreurs de doublon
    if (data?.code === 'DUPLICATE_RECOMMANDATION') {
      throw new Error('Une recommandation existe déjà pour ce binôme mentor/mentoré.')
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
    // Gérer les erreurs de doublon
    if (data?.code === 'DUPLICATE_SUIVI') {
      throw new Error('Un suivi identique existe déjà pour cette candidature.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du suivi')
  }

  return data?.data || data
}

export async function updateCandidature(candidatureId, updates) {
  const res = await fetch(`${API_URL}/api/recrutement/candidatures/${candidatureId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour de la candidature')
  }

  return data?.data || data
}

export async function fetchRecommandationsByMentee(menteeId) {
  const res = await fetch(`${API_URL}/api/recrutement/recommandations?mentee_id=${menteeId}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des recommandations')
  }

  return data?.data || data?.recommandations || []
}

// Fonction pour récupérer tous les membres (pour les sélecteurs)
export async function fetchAllMembers(params = {}) {
  const maxLimit = 500; // Maximum limit allowed by backend
  let allMembers = [];
  let currentPage = params.page || 1;
  let hasMore = true;
  let baseRoute = '/api/adhesion/members'; // Route par défaut

  // Déterminer quelle route utiliser (adhesion ou secretariat)
  // Essayer d'abord adhesion
  const testQueryParams = new URLSearchParams({
    page: 1,
    limit: 1,
  }).toString();
  
  let testRes = await fetch(`${API_URL}/api/adhesion/members?${testQueryParams}`, {
    headers: getAuthHeaders(),
  });

  // Si accès refusé (403), utiliser la route secretariat
  if (testRes.status === 403) {
    baseRoute = '/api/secretariat/members';
  }

  while (hasMore) {
    const queryParams = new URLSearchParams({
      page: currentPage,
      limit: maxLimit,
      ...(params.search && { search: params.search }),
      ...(params.status && { status: params.status }),
    }).toString();

    const res = await fetch(`${API_URL}${baseRoute}?${queryParams}`, {
      headers: getAuthHeaders(),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('asgf_admin_token');
        localStorage.removeItem('asgf_admin_info');
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      const errorMessage = data?.message || data?.errors?.[0]?.message || 'Erreur lors du chargement des membres';
      throw new Error(errorMessage);
    }

    const membersData = Array.isArray(data.data) ? data.data : [];
    allMembers.push(...membersData);
    
    // Check if there are more pages
    if (data.pagination && data.pagination.totalPages > currentPage) {
      currentPage++;
    } else {
      hasMore = false;
    }
  }
  
  return allMembers;
}

export async function sendMemberEmails({ memberIds, subject, body, attachments = [] }) {
  const res = await fetch(`${API_URL}/api/adhesion/members/email`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      member_ids: memberIds,
      subject,
      body,
      attachments: attachments.map(att => ({
        name: att.name,
        data: att.data,
        type: att.type,
      })),
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    // Retourner l'objet d'erreur complet pour que le frontend puisse l'utiliser
    const errorMessage = data?.message || "Erreur lors de l'envoi des emails membres"
    const error = new Error(errorMessage)
    error.responseData = data
    throw error
  }

  // Retourner les données avec le statut success
  return data
}

// ───── Trésorerie ─────

// Récupère toutes les stats du dashboard en une seule requête
// Accessible à tous les admins authentifiés, même sans accès aux modules individuels
export async function fetchAllDashboardStats() {
  try {
    const res = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
      headers: getAuthHeaders(),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('asgf_admin_token')
        localStorage.removeItem('asgf_admin_info')
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }
      throw new Error(data?.message || 'Erreur lors du chargement des statistiques du dashboard')
    }

    return data?.data || {}
  } catch (err) {
    console.error('Erreur fetchAllDashboardStats:', err)
    throw err
  }
}

export async function fetchTresorerieStats() {
  try {
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
      console.error('❌ Erreur fetchTresorerieStats:', res.status, data)
      throw new Error(data?.message || 'Erreur lors du chargement des statistiques')
    }

    // Debug: vérifier la structure des données
    console.log('📥 fetchTresorerieStats response complète:', data)
    console.log('📊 fetchTresorerieStats data.data:', data?.data)
    console.log('💰 Propriétés trésorerie:', data?.data ? Object.keys(data.data) : 'aucune donnée')

    const stats = data?.data || {}
    console.log('💵 Stats retournées:', {
      solde_total_eur: stats.solde_total_eur,
      montant_total_eur: stats.montant_total_eur,
      total_paiements_dons_eur: stats.total_paiements_dons_eur,
      depenses_validees_eur: stats.depenses_validees_eur,
    })

    return stats
  } catch (err) {
    console.error('❌ Exception fetchTresorerieStats:', err)
    throw err
  }
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

export async function updatePaiement(paiementId, updates) {
  const res = await fetch(`${API_URL}/api/tresorerie/paiements/${paiementId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour du paiement')
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

export async function generateMonthlyCotisations(mois, annee) {
  const res = await fetch(`${API_URL}/api/tresorerie/cotisations/generate-monthly`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ mois, annee }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la génération des cotisations')
  }

  return data?.data || data
}

export async function updateOverdueCotisations() {
  const res = await fetch(`${API_URL}/api/tresorerie/cotisations/update-overdue`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour des cotisations')
  }

  return data?.data || data
}

export async function cleanDuplicateCotisations() {
  const res = await fetch(`${API_URL}/api/tresorerie/cotisations/clean-duplicates`, {
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
    throw new Error(data?.message || 'Erreur lors du nettoyage des doublons')
  }

  return data?.data || data
}

export async function createMissingCotisations(annee = null, mois = null) {
  const res = await fetch(`${API_URL}/api/tresorerie/cotisations/create-missing`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ annee, mois }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création des cotisations manquantes')
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

export async function geocodeMemberAddress({ adresse = '', ville = '', pays = '' } = {}) {
  const query = buildQueryString({ adresse, ville, pays })
  return sendJsonRequest(`/api/geocode/search${query}`)
}

export async function generateCartePDF(carteId) {
  const res = await fetch(`${API_URL}/api/tresorerie/cartes/${carteId}/generate-pdf`, {
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
    throw new Error(data?.message || 'Erreur lors de la génération du PDF')
  }

  return data?.data || data
}

export async function generateMissingPDFs() {
  const res = await fetch(`${API_URL}/api/tresorerie/cartes/generate-missing-pdfs`, {
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
    throw new Error(data?.message || 'Erreur lors de la génération des PDF manquants')
  }

  return data?.data || data
}

export async function listCartesMembres(filters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.statut_paiement) queryParams.append('statut_paiement', filters.statut_paiement)
  if (filters.pays) queryParams.append('pays', filters.pays)
  
  const res = await fetch(`${API_URL}/api/tresorerie/cartes?${queryParams.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la récupération des cartes membres')
  }

  return data?.data || data
}

export async function updateCarteMembre(carteId, carteData) {
  const res = await fetch(`${API_URL}/api/tresorerie/cartes/${carteId}`, {
    method: 'PUT',
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour de la carte membre')
  }

  return data?.data || data
}

export async function fetchCarteMembreByNumero(numeroMembre) {
  const res = await fetch(`${API_URL}/api/tresorerie/cartes/numero/${encodeURIComponent(numeroMembre)}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    if (res.status === 404) {
      return null // Pas de carte membre trouvée
    }
    throw new Error(data?.message || 'Erreur lors de la récupération de la carte membre')
  }

  return data?.data || null
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

export async function fetchRelances(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.annee && { annee: params.annee }),
    ...(params.type_relance && { type_relance: params.type_relance }),
    ...(params.statut && { statut: params.statut }),
  }).toString()

  const res = await fetch(`${API_URL}/api/tresorerie/relances?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des relances')
  }

  if (data?.data?.relances) {
    return data.data.relances
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
  return downloadBinaryResource('/api/tresorerie/exports/cotisations', params, 'cotisations.csv')
}

export function downloadPaiementsExport(params = {}) {
  return downloadBinaryResource('/api/tresorerie/exports/paiements', params, 'paiements.csv')
}

export function downloadDepensesExport(params = {}) {
  return downloadBinaryResource('/api/tresorerie/exports/depenses', params, 'depenses.csv')
}

export function downloadTresorerieReport(params = {}) {
  return downloadBinaryResource('/api/tresorerie/reports/mensuel', params, 'rapport-tresorerie.pdf')
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

export async function updateReunion(reunionId, reunionData) {
  // Nettoyer les données : convertir les chaînes vides en null pour les champs optionnels uniquement
  const cleanedData = {
    titre: reunionData.titre,
    type_reunion: reunionData.type_reunion,
    date_reunion: reunionData.date_reunion,
    heure_debut: reunionData.heure_debut,
    description: reunionData.description || null,
    heure_fin: reunionData.heure_fin || null,
    pole: reunionData.pole || null,
    lien_visio: reunionData.lien_visio || null,
    ordre_du_jour: reunionData.ordre_du_jour || null,
  }

  const res = await fetch(`${API_URL}/api/secretariat/reunions/${reunionId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(cleanedData),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    const errorMessage = data?.message || data?.error?.message || 'Erreur lors de la mise à jour de la réunion'
    throw new Error(errorMessage)
  }

  return data?.data || data
}

export async function fetchReunion(reunionId) {
  const res = await fetch(`${API_URL}/api/secretariat/reunions/${reunionId}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement de la réunion')
  }

  return data?.data || data
}

export async function fetchParticipants(reunionId) {
  const res = await fetch(`${API_URL}/api/secretariat/reunions/${reunionId}/participants`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des participants')
  }

  return data?.data || []
}

export async function fetchActions(params = {}) {
  if (params.reunionId) {
    const res = await fetch(`${API_URL}/api/secretariat/reunions/${params.reunionId}/actions`, {
      headers: getAuthHeaders(),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('asgf_admin_token')
        localStorage.removeItem('asgf_admin_info')
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }
      throw new Error(data?.message || 'Erreur lors du chargement des actions')
    }

    return data?.data || []
  }

  const queryParams = new URLSearchParams({
    ...(params.assigne_a && { assigne_a: params.assigne_a }),
    ...(params.statut && { statut: params.statut }),
    ...(params.limit && { limit: params.limit }),
  }).toString()

  const res = await fetch(`${API_URL}/api/secretariat/actions?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des actions')
  }

  return data?.data || []
}

export async function fetchDocuments(params = {}) {
  const queryParams = new URLSearchParams({
    ...(params.limit && { limit: params.limit }),
    ...(params.categorie && { categorie: params.categorie }),
  }).toString()

  const res = await fetch(`${API_URL}/api/secretariat/documents?${queryParams}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des documents')
  }

  return data?.data || []
}

export async function getCompteRendu(reunionId) {
  const res = await fetch(`${API_URL}/api/secretariat/reunions/${reunionId}/compte-rendu`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    if (res.status === 404) {
      return null
    }
    throw new Error(data?.message || 'Erreur lors du chargement du compte-rendu')
  }

  return data?.data || null
}

export async function updateParticipant(participantId, updates) {
  const res = await fetch(`${API_URL}/api/secretariat/participants/${participantId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour du participant')
  }

  return data?.data || data
}

export async function updateAction(actionId, updates) {
  const res = await fetch(`${API_URL}/api/secretariat/actions/${actionId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour de l\'action')
  }

  return data?.data || data
}

export async function deleteAction(actionId) {
  const res = await fetch(`${API_URL}/api/secretariat/actions/${actionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression de l\'action')
  }

  return data
}

export async function generateReunionPDF(reunionId) {
  const res = await fetch(`${API_URL}/api/secretariat/reunions/${reunionId}/generate-pdf`, {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || 'Erreur lors de la génération du PDF')
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reunion-${reunionId}.pdf`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

/**
 * Trouve un membre par email dans adhesion.members
 */
export async function findMemberByEmail(email) {
  const res = await fetch(`${API_URL}/api/secretariat/members/by-email?email=${encodeURIComponent(email)}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la recherche du membre')
  }

  return data?.data || null
}

// ============================================
// MODULE FORMATION
// ============================================

export async function fetchFormationStats() {
  const res = await fetch(`${API_URL}/api/formation/stats`, {
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

export async function fetchFormations({ page = 1, limit = 20, search = '', categorie = '', statut = '' }) {
  const params = { page, limit }
  if (search) params.search = search
  if (categorie) params.categorie = categorie
  if (statut) params.statut = statut

  const res = await fetch(`${API_URL}/api/formation/formations${buildQueryString(params)}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des formations')
  }
  return data?.data || []
}

export async function fetchFormationById(formationId) {
  const res = await fetch(`${API_URL}/api/formation/formations/${formationId}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement de la formation')
  }
  return data?.data || null
}

export async function createFormation(formationData) {
  const res = await fetch(`${API_URL}/api/formation/formations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(formationData),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la formation')
  }
  return data?.data || data
}

export async function updateFormation(formationId, updates) {
  const res = await fetch(`${API_URL}/api/formation/formations/${formationId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour de la formation')
  }
  return data?.data || data
}

export async function deleteFormation(formationId) {
  const res = await fetch(`${API_URL}/api/formation/formations/${formationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression de la formation')
  }
  return data
}

export async function fetchSessions({ page = 1, limit = 20, formation_id = '', statut = '' }) {
  const params = { page, limit }
  if (formation_id) params.formation_id = formation_id
  if (statut) params.statut = statut

  const res = await fetch(`${API_URL}/api/formation/sessions${buildQueryString(params)}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des sessions')
  }
  return data?.data || []
}

export async function createSession(sessionData) {
  const res = await fetch(`${API_URL}/api/formation/sessions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(sessionData),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de la session')
  }
  return data?.data || data
}

export async function updateSession(sessionId, updates) {
  const res = await fetch(`${API_URL}/api/formation/sessions/${sessionId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour de la session')
  }
  return data?.data || data
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_URL}/api/formation/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression de la session')
  }
  return data
}

export async function fetchInscriptions({ page = 1, limit = 20, formation_id = '', session_id = '', status = '' }) {
  const params = { page, limit }
  if (formation_id) params.formation_id = formation_id
  if (session_id) params.session_id = session_id
  if (status) params.status = status

  const res = await fetch(`${API_URL}/api/formation/inscriptions${buildQueryString(params)}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des inscriptions')
  }
  return data?.data || []
}

export async function createInscription(inscriptionData) {
  const res = await fetch(`${API_URL}/api/formation/inscriptions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(inscriptionData),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de l\'inscription')
  }
  return data?.data || data
}

export async function updateInscription(inscriptionId, updates) {
  const res = await fetch(`${API_URL}/api/formation/inscriptions/${inscriptionId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour de l\'inscription')
  }
  return data?.data || data
}

export async function deleteInscription(inscriptionId) {
  const res = await fetch(`${API_URL}/api/formation/inscriptions/${inscriptionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression de l\'inscription')
  }
  return data
}

export async function confirmInscription(inscriptionId) {
  const res = await fetch(`${API_URL}/api/formation/inscriptions/${inscriptionId}/confirm`, {
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
    throw new Error(data?.message || 'Erreur lors de la confirmation de l\'inscription')
  }
  return data?.data || data
}

export async function rejectInscription(inscriptionId) {
  const res = await fetch(`${API_URL}/api/formation/inscriptions/${inscriptionId}/reject`, {
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
    throw new Error(data?.message || 'Erreur lors du rejet de l\'inscription')
  }
  return data?.data || data
}

export async function sendInscriptionInvitation(inscriptionId, accessLink) {
  const res = await fetch(`${API_URL}/api/formation/inscriptions/${inscriptionId}/invitation`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ access_link: accessLink }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || "Erreur lors de l'envoi de l'invitation")
  }
  return data
}

export async function sendSessionReminder(sessionId, { kind, accessLink }) {
  const res = await fetch(`${API_URL}/api/formation/sessions/${sessionId}/reminder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ kind, access_link: accessLink }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de lenvoi du rappel')
  }
  return data
}

export async function fetchFormateurs() {
  const res = await fetch(`${API_URL}/api/formation/formateurs`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des formateurs')
  }
  return data?.data || []
}

export async function createFormateur(formateurData) {
  const res = await fetch(`${API_URL}/api/formation/formateurs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(formateurData),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du formateur')
  }
  return data?.data || data
}

export async function updateFormateur(formateurId, updates) {
  const res = await fetch(`${API_URL}/api/formation/formateurs/${formateurId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour du formateur')
  }
  return data?.data || data
}

export async function deleteFormateur(formateurId) {
  const res = await fetch(`${API_URL}/api/formation/formateurs/${formateurId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression du formateur')
  }
  return data
}

// ============================================
// PARAMÈTRES ADMIN / GESTION DES ACCÈS
// ============================================

export async function fetchAdminsList({ page = 1, limit = 20, search = '' } = {}) {
  const query = buildQueryString({ page, limit, search })
  const res = await fetch(`${API_URL}/api/admin/admins${query}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des administrateurs')
  }
  return {
    admins: data?.data || [],
    pagination: data?.pagination || { page, limit, total: 0, totalPages: 1 },
  }
}

export async function createAdminAccount(payload) {
  const res = await fetch(`${API_URL}/api/admin/admins`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de l\'administrateur')
  }
  return data?.data || data
}

export async function updateAdminAccount(adminId, payload) {
  const res = await fetch(`${API_URL}/api/admin/admins/${adminId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la mise à jour de l\'administrateur')
  }
  return data?.data || data
}

export async function updateAdminAccess(adminId, modules) {
  const res = await fetch(`${API_URL}/api/admin/admins/${adminId}/modules`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ modules }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la mise à jour des modules')
  }
  return data?.data || data
}

export async function suspendAdminAccount(adminId, { reason, disabledUntil } = {}) {
  const res = await fetch(`${API_URL}/api/admin/admins/${adminId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      reason,
      disabled_until: disabledUntil || null,
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la désactivation de l\'administrateur')
  }
  return data
}

export async function fetchAdminModulesCatalog() {
  const res = await fetch(`${API_URL}/api/admin/modules`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des modules disponibles')
  }
  return data?.data || []
}

// ============================================
// MODULE WEBINAIRE
// ============================================

export async function fetchWebinaireStats() {
  const res = await fetch(`${API_URL}/api/webinaire/stats`, {
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

export async function fetchWebinaires({ page = 1, limit = 20, search = '', theme = '', statut = '' }) {
  const params = { page, limit }
  if (search) params.search = search
  if (theme) params.theme = theme
  if (statut) params.statut = statut

  const res = await fetch(`${API_URL}/api/webinaire/webinaires${buildQueryString(params)}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des webinaires')
  }
  return data?.data || []
}

export async function fetchWebinaireById(webinaireId) {
  const res = await fetch(`${API_URL}/api/webinaire/webinaires/${webinaireId}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement du webinaire')
  }
  return data?.data || null
}

export async function createWebinaire(webinaireData) {
  const res = await fetch(`${API_URL}/api/webinaire/webinaires`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(webinaireData),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du webinaire')
  }
  return data?.data || data
}

export async function updateWebinaire(webinaireId, updates) {
  const res = await fetch(`${API_URL}/api/webinaire/webinaires/${webinaireId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour du webinaire')
  }
  return data?.data || data
}

export async function deleteWebinaire(webinaireId) {
  const res = await fetch(`${API_URL}/api/webinaire/webinaires/${webinaireId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression du webinaire')
  }
  return data
}

export async function fetchWebinaireInscriptions({ page = 1, limit = 20, webinaire_id = '', statut = '' }) {
  const params = { page, limit }
  if (webinaire_id) params.webinaire_id = webinaire_id
  if (statut) params.statut = statut

  const res = await fetch(`${API_URL}/api/webinaire/inscriptions${buildQueryString(params)}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des inscriptions')
  }
  return data?.data || []
}

export async function createWebinaireInscription(inscriptionData) {
  const res = await fetch(`${API_URL}/api/webinaire/inscriptions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(inscriptionData),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création de l\'inscription')
  }
  return data?.data || data
}

export async function updateWebinaireInscription(inscriptionId, updates) {
  const res = await fetch(`${API_URL}/api/webinaire/inscriptions/${inscriptionId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour de l\'inscription')
  }
  return data?.data || data
}

export async function deleteWebinaireInscription(inscriptionId) {
  const res = await fetch(`${API_URL}/api/webinaire/inscriptions/${inscriptionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression de l\'inscription')
  }
  return data
}

export async function sendWebinaireInscriptionInvitation(inscriptionId, accessLink) {
  const res = await fetch(`${API_URL}/api/webinaire/inscriptions/${inscriptionId}/invitation`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ access_link: accessLink }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || "Erreur lors de l'envoi de l'invitation webinaire")
  }
  return data
}

export async function sendWebinaireReminder(webinaireId, { kind, accessLink }) {
  const res = await fetch(`${API_URL}/api/webinaire/webinaires/${webinaireId}/reminder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ kind, access_link: accessLink }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de lenvoi du rappel webinaire')
  }
  return data
}

export async function fetchPresentateurs(webinaireId) {
  const res = await fetch(`${API_URL}/api/webinaire/webinaires/${webinaireId}/presentateurs`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors du chargement des présentateurs')
  }
  return data?.data || []
}

export async function createPresentateur(presentateurData) {
  const res = await fetch(`${API_URL}/api/webinaire/presentateurs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(presentateurData),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du présentateur')
  }
  return data?.data || data
}

export async function updatePresentateur(presentateurId, updates) {
  const res = await fetch(`${API_URL}/api/webinaire/presentateurs/${presentateurId}`, {
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
    throw new Error(data?.message || 'Erreur lors de la mise à jour du présentateur')
  }
  return data?.data || data
}

export async function deletePresentateur(presentateurId) {
  const res = await fetch(`${API_URL}/api/webinaire/presentateurs/${presentateurId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression du présentateur')
  }
  return data
}

// ============================================
// BUREAU - Gestion des membres du bureau
// ============================================

// GET /api/bureau - Récupérer les membres du bureau (public)
export async function fetchBureauMembers() {
  const res = await fetch(`${API_URL}/api/bureau`)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || 'Erreur lors du chargement des membres du bureau')
  }
  return data
}

// GET /api/admin/bureau - Récupérer tous les membres (admin, y compris inactifs)
export async function fetchAllBureauMembers() {
  return sendJsonRequest('/api/admin/bureau')
}

// POST /api/admin/bureau - Créer un membre du bureau
export async function createBureauMember(memberData) {
  return sendJsonRequest('/api/admin/bureau', {
    method: 'POST',
    body: memberData,
  })
}

// PUT /api/admin/bureau/:id - Mettre à jour un membre du bureau
export async function updateBureauMember(memberId, updates) {
  return sendJsonRequest(`/api/admin/bureau/${memberId}`, {
    method: 'PUT',
    body: updates,
  })
}

// DELETE /api/admin/bureau/:id - Désactiver un membre (soft delete)
export async function deleteBureauMember(memberId) {
  return sendJsonRequest(`/api/admin/bureau/${memberId}`, {
    method: 'DELETE',
  })
}

// POST /api/admin/bureau/:id/photo - Upload une photo pour un membre
export async function uploadBureauMemberPhoto(memberId, fileBase64, fileName) {
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
  const res = await fetch(`${API_URL}/api/admin/bureau/${memberId}/photo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      file: fileBase64,
      fileName: fileName,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de l\'upload de la photo')
  }

  // Retourner l'objet complet pour avoir accès à success et data
  return data
}

// ==================== AUDIT LOG ====================

/**
 * Récupère l'historique des actions (audit log)
 */
export async function fetchAuditLogs(params = {}) {
  const query = buildQueryString({
    page: params.page || 1,
    limit: params.limit || 50,
    ...(params.adminId && { adminId: params.adminId }),
    ...(params.actionType && { actionType: params.actionType }),
    ...(params.entityType && { entityType: params.entityType }),
    ...(params.module && { module: params.module }),
    ...(params.search && { search: params.search }),
    ...(params.startDate && { startDate: params.startDate }),
    ...(params.endDate && { endDate: params.endDate }),
  })

  const res = await fetch(`${API_URL}/api/admin/audit/logs${query}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la récupération des logs')
  }

  return {
    data: data?.data || [],
    pagination: data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 },
  }
}

/**
 * Récupère les statistiques d'audit
 */
export async function fetchAuditStats() {
  const res = await fetch(`${API_URL}/api/admin/audit/stats`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la récupération des statistiques')
  }

  return data?.data || {}
}

// ==================== CALENDRIER ====================

/**
 * Récupère tous les événements pour le calendrier (formations, webinaires, réunions)
 */
export async function fetchCalendarEvents(params = {}) {
  const { startDate, endDate } = params

  try {
    // Utiliser la route dédiée calendar qui est accessible à tous les admins
    const queryParams = buildQueryString({ startDate, endDate })
    const res = await fetch(`${API_URL}/api/admin/calendar/events${queryParams}`, {
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('asgf_admin_token')
        localStorage.removeItem('asgf_admin_info')
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData?.message || 'Erreur lors de la récupération des événements')
    }

    const data = await res.json().catch(() => null)
    const events = data?.data || []

    // Transformer en format attendu par le composant CalendarContent
    const transformedEvents = events.map(event => {
      const start = new Date(event.start)
      const end = event.end ? new Date(event.end) : start

      return {
        id: event.id,
        title: event.title,
        start: start.toISOString(),
        end: end.toISOString(),
        type: event.type,
        color: event.type === 'formation' ? '#4f46e5' : event.type === 'webinaire' ? '#06b6d4' : '#10b981',
        data: event,
      }
    })

    return transformedEvents
  } catch (err) {
    console.error('Erreur récupération événements calendrier:', err)
    throw err
  }
}

// ==================== PROJETS ====================

/**
 * Récupère tous les projets
 */
export async function fetchProjets() {
  const res = await fetch(`${API_URL}/api/public/projets/projets`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la récupération des projets')
  }

  return data?.data || []
}

/**
 * Crée un projet
 */
export async function createProjet(projetData) {
  const res = await fetch(`${API_URL}/api/public/projets/projets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(projetData),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la création du projet')
  }

  return data?.data
}

/**
 * Met à jour un projet
 */
export async function updateProjet(projetId, projetData) {
  const res = await fetch(`${API_URL}/api/public/projets/projets/${projetId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(projetData),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la mise à jour du projet')
  }

  return data?.data
}

/**
 * Supprime un projet
 */
export async function deleteProjet(projetId) {
  const res = await fetch(`${API_URL}/api/public/projets/projets/${projetId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression du projet')
  }

  return data
}

/**
 * Récupère les inscriptions aux projets
 */
export async function fetchProjetInscriptions(params = {}) {
  const query = buildQueryString(params)
  const res = await fetch(`${API_URL}/api/public/projets/inscriptions${query}`, {
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la récupération des inscriptions')
  }

  return {
    inscriptions: data?.inscriptions || [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  }
}

/**
 * Met à jour le statut d'une inscription
 */
export async function updateProjetInscriptionStatus(inscriptionId, statut) {
  const res = await fetch(`${API_URL}/api/public/projets/inscriptions/${inscriptionId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ statut }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la mise à jour du statut')
  }

  return data?.data
}

/**
 * Met à jour une inscription
 */
export async function updateProjetInscription(inscriptionId, inscriptionData) {
  const res = await fetch(`${API_URL}/api/public/projets/inscriptions/${inscriptionId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(inscriptionData),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la mise à jour de l\'inscription')
  }

  return data?.data
}

/**
 * Supprime une inscription
 */
export async function deleteProjetInscription(inscriptionId) {
  const res = await fetch(`${API_URL}/api/public/projets/inscriptions/${inscriptionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('asgf_admin_token')
      localStorage.removeItem('asgf_admin_info')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    throw new Error(data?.message || 'Erreur lors de la suppression de l\'inscription')
  }

  return data
}
