// backend/services/projets.service.js
import { supabasePublic, supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

const ALLOWED_PROJET_IDS = ['mobilite-intelligente', 'dashboard-energie']

/**
 * Crée une inscription à un projet
 */
export async function createProjetInscription(payload = {}) {
  try {
    const { projet_id, prenom, nom, email, telephone, numero_membre, statut_pro, motivation, competences } = payload

    // Validation
    if (!projet_id || !prenom || !nom || !email) {
      throw new Error('projet_id, prenom, nom et email sont requis')
    }

    if (!ALLOWED_PROJET_IDS.includes(projet_id)) {
      throw new Error('projet_id invalide')
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Email invalide')
    }

    const emailNormalized = email.trim().toLowerCase()

    // CONTRAINTE : Les projets sont réservés aux membres ASGF (peu importe le statut d'adhésion)
    // Vérifier que le membre existe par email
    const { data: membre, error: membreError } = await supabaseAdhesion
      .from('members')
      .select('id, numero_membre, status, email')
      .eq('email', emailNormalized)
      .single()

    if (membreError || !membre) {
      // Erreur spéciale pour rediriger vers la page d'adhésion
      const error = new Error('Vous n\'êtes pas encore membre de l\'ASGF. Ces projets sont réservés exclusivement aux membres.')
      error.code = 'NOT_MEMBER'
      error.redirectTo = '/adhesion'
      throw error
    }

    // Utiliser le numéro de membre du membre trouvé (même si un autre a été fourni)
    const membre_id = membre.id
    const numero_membre_final = membre.numero_membre || numero_membre?.trim() || null

    // Vérifier si une inscription existe déjà pour cet email et ce projet
    const { data: existing, error: checkError } = await supabasePublic
      .from('projets_inscriptions')
      .select('id')
      .eq('projet_id', projet_id)
      .eq('email', email.trim().toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (normal si pas d'inscription existante)
      logError('createProjetInscription check existing error', checkError)
    }

    if (existing) {
      throw new Error('Vous êtes déjà inscrit à ce projet avec cet email')
    }

    // Créer l'inscription
    const { data, error } = await supabasePublic
      .from('projets_inscriptions')
      .insert({
        projet_id: projet_id.trim(),
        membre_id,
        email: emailNormalized,
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone?.trim() || null,
        numero_membre: numero_membre_final,
        statut_pro: statut_pro?.trim() || null,
        motivation: motivation?.trim() || null,
        competences: competences?.trim() || null,
        statut: 'pending',
      })
      .select()
      .single()

    if (error) {
      logError('createProjetInscription error', error)
      throw new Error("Impossible d'enregistrer votre inscription pour le moment")
    }

    logInfo('Nouvelle inscription projet enregistrée', { id: data.id, projet_id, email: data.email })

    return data
  } catch (err) {
    logError('createProjetInscription exception', err)
    throw err
  }
}

/**
 * Récupère les inscriptions à un projet (admin)
 */
export async function getProjetInscriptions({ projet_id, statut, search, page = 1, limit = 20 } = {}) {
  try {
    let query = supabasePublic
      .from('projets_inscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (projet_id) {
      query = query.eq('projet_id', projet_id)
    }

    if (statut) {
      query = query.eq('statut', statut)
    }

    if (search) {
      query = query.or(`prenom.ilike.%${search}%,nom.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getProjetInscriptions error', error)
      throw new Error('Erreur lors de la récupération des inscriptions')
    }

    return {
      inscriptions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getProjetInscriptions exception', err)
    throw err
  }
}

/**
 * Met à jour le statut d'une inscription (admin)
 */
export async function updateProjetInscriptionStatus(inscriptionId, statut, adminId) {
  try {
    if (!['pending', 'approved', 'rejected'].includes(statut)) {
      throw new Error('Statut invalide')
    }

    const { data, error } = await supabasePublic
      .from('projets_inscriptions')
      .update({ statut })
      .eq('id', inscriptionId)
      .select()
      .single()

    if (error) {
      logError('updateProjetInscriptionStatus error', error)
      throw new Error('Erreur lors de la mise à jour du statut')
    }

    if (!data) {
      throw new Error('Inscription introuvable')
    }

    logInfo('Statut inscription projet mis à jour', { id: inscriptionId, statut, adminId })

    return data
  } catch (err) {
    logError('updateProjetInscriptionStatus exception', err)
    throw err
  }
}

