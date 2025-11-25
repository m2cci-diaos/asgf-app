// backend/services/adhesion.service.js
import { supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Récupère tous les membres avec pagination et filtres
 */
export async function getAllMembers({ page = 1, limit = 20, search = '', status = '' }) {
  try {
    logInfo('getAllMembers: Requête initiale', { page, limit, search, status })
    let query = supabaseAdhesion
      .from('members')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Recherche par nom, prénom, email ou numéro de membre
    if (search) {
      query = query.or(`prenom.ilike.%${search}%,nom.ilike.%${search}%,email.ilike.%${search}%,numero_membre.ilike.%${search}%`)
    }

    // Filtre par statut
    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getAllMembers error', error)
      throw new Error('Erreur lors de la récupération des membres')
    }

    logInfo('getAllMembers: Membres récupérés', { count: data?.length || 0, total: count || 0 })

    return {
      members: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllMembers exception', err)
    throw err
  }
}

/**
 * Récupère les membres en attente de validation
 */
export async function getPendingMembers() {
  try {
    const { data, error } = await supabaseAdhesion
      .from('members')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      logError('getPendingMembers error', error)
      throw new Error('Erreur lors de la récupération des membres en attente')
    }

    return data || []
  } catch (err) {
    logError('getPendingMembers exception', err)
    throw err
  }
}

/**
 * Approuve un membre (change le statut)
 */
export async function approveMember(memberId, adminId) {
  try {
    const { data, error } = await supabaseAdhesion
      .from('members')
      .update({ 
        status: 'approved',
        validated_at: new Date().toISOString(),
        validated_by: adminId,
      })
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      logError('approveMember error', error)
      throw new Error('Erreur lors de la validation du membre')
    }

    if (!data) {
      throw new Error('Membre introuvable')
    }

    logInfo('Membre approuvé', { id: memberId, adminId })
    return data
  } catch (err) {
    logError('approveMember exception', err)
    throw err
  }
}

/**
 * Rejette un membre (change le statut)
 */
export async function rejectMember(memberId, adminId) {
  try {
    const { data, error } = await supabaseAdhesion
      .from('members')
      .update({ 
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validated_by: adminId,
      })
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      logError('rejectMember error', error)
      throw new Error('Erreur lors du rejet du membre')
    }

    if (!data) {
      throw new Error('Membre introuvable')
    }

    logInfo('Membre rejeté', { id: memberId, adminId })
    return data
  } catch (err) {
    logError('rejectMember exception', err)
    throw err
  }
}
