// backend/services/projets-admin.service.js
import { supabasePublic } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Récupère tous les projets
 * @param {boolean} activeOnly - Si true, ne retourne que les projets actifs (pour la page publique)
 */
export async function getAllProjets(activeOnly = false) {
  try {
    let query = supabasePublic
      .from('projets')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      logError('getAllProjets error', error)
      throw new Error('Erreur lors de la récupération des projets')
    }

    return data || []
  } catch (err) {
    logError('getAllProjets exception', err)
    throw err
  }
}

/**
 * Récupère un projet par ID
 */
export async function getProjetById(projetId) {
  try {
    const { data, error } = await supabasePublic
      .from('projets')
      .select('*')
      .eq('projet_id', projetId)
      .single()

    if (error) {
      logError('getProjetById error', error)
      throw new Error('Projet introuvable')
    }

    return data
  } catch (err) {
    logError('getProjetById exception', err)
    throw err
  }
}

/**
 * Crée un nouveau projet
 */
export async function createProjet(payload) {
  try {
    const { projet_id, titre, description, icon, color, is_active } = payload

    if (!projet_id || !titre) {
      throw new Error('projet_id et titre sont requis')
    }

    // Vérifier si le projet_id existe déjà
    const { data: existing } = await supabasePublic
      .from('projets')
      .select('id')
      .eq('projet_id', projet_id)
      .single()

    if (existing) {
      throw new Error('Un projet avec cet ID existe déjà')
    }

    const { data, error } = await supabasePublic
      .from('projets')
      .insert({
        projet_id: projet_id.trim(),
        titre: titre.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        color: color?.trim() || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      logError('createProjet error', error)
      throw new Error("Impossible de créer le projet")
    }

    logInfo('Projet créé', { id: data.id, projet_id: data.projet_id })
    return data
  } catch (err) {
    logError('createProjet exception', err)
    throw err
  }
}

/**
 * Met à jour un projet
 */
export async function updateProjet(projetId, payload) {
  try {
    const { titre, description, icon, color, is_active } = payload

    const updateData = {}
    if (titre !== undefined) updateData.titre = titre.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (icon !== undefined) updateData.icon = icon?.trim() || null
    if (color !== undefined) updateData.color = color?.trim() || null
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabasePublic
      .from('projets')
      .update(updateData)
      .eq('projet_id', projetId)
      .select()
      .single()

    if (error) {
      logError('updateProjet error', error)
      throw new Error('Erreur lors de la mise à jour du projet')
    }

    if (!data) {
      throw new Error('Projet introuvable')
    }

    logInfo('Projet mis à jour', { projet_id: projetId })
    return data
  } catch (err) {
    logError('updateProjet exception', err)
    throw err
  }
}

/**
 * Supprime un projet
 */
export async function deleteProjet(projetId) {
  try {
    const { error } = await supabasePublic
      .from('projets')
      .delete()
      .eq('projet_id', projetId)

    if (error) {
      logError('deleteProjet error', error)
      throw new Error('Erreur lors de la suppression du projet')
    }

    logInfo('Projet supprimé', { projet_id: projetId })
    return { success: true }
  } catch (err) {
    logError('deleteProjet exception', err)
    throw err
  }
}

/**
 * Récupère une inscription par ID
 */
export async function getInscriptionById(inscriptionId) {
  try {
    const { data, error } = await supabasePublic
      .from('projets_inscriptions')
      .select('*')
      .eq('id', inscriptionId)
      .single()

    if (error) {
      logError('getInscriptionById error', error)
      throw new Error('Inscription introuvable')
    }

    return data
  } catch (err) {
    logError('getInscriptionById exception', err)
    throw err
  }
}

/**
 * Met à jour une inscription
 */
export async function updateInscription(inscriptionId, payload) {
  try {
    const updateData = {}
    if (payload.prenom !== undefined) updateData.prenom = payload.prenom.trim()
    if (payload.nom !== undefined) updateData.nom = payload.nom.trim()
    if (payload.email !== undefined) updateData.email = payload.email.trim().toLowerCase()
    if (payload.telephone !== undefined) updateData.telephone = payload.telephone?.trim() || null
    if (payload.numero_membre !== undefined) updateData.numero_membre = payload.numero_membre?.trim() || null
    if (payload.statut_pro !== undefined) updateData.statut_pro = payload.statut_pro?.trim() || null
    if (payload.motivation !== undefined) updateData.motivation = payload.motivation?.trim() || null
    if (payload.competences !== undefined) updateData.competences = payload.competences?.trim() || null
    if (payload.statut !== undefined) updateData.statut = payload.statut

    const { data, error } = await supabasePublic
      .from('projets_inscriptions')
      .update(updateData)
      .eq('id', inscriptionId)
      .select()
      .single()

    if (error) {
      logError('updateInscription error', error)
      throw new Error('Erreur lors de la mise à jour de l\'inscription')
    }

    if (!data) {
      throw new Error('Inscription introuvable')
    }

    logInfo('Inscription mise à jour', { id: inscriptionId })
    return data
  } catch (err) {
    logError('updateInscription exception', err)
    throw err
  }
}

/**
 * Supprime une inscription
 */
export async function deleteInscription(inscriptionId) {
  try {
    const { error } = await supabasePublic
      .from('projets_inscriptions')
      .delete()
      .eq('id', inscriptionId)

    if (error) {
      logError('deleteInscription error', error)
      throw new Error('Erreur lors de la suppression de l\'inscription')
    }

    logInfo('Inscription supprimée', { id: inscriptionId })
    return { success: true }
  } catch (err) {
    logError('deleteInscription exception', err)
    throw err
  }
}

