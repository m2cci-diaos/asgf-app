// backend/services/webinaire.service.js
import { supabaseWebinaire, supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Récupère toutes les webinaires avec pagination et filtres
 */
export async function getAllWebinaires({ page = 1, limit = 20, search = '', theme = '', statut = '' }) {
  try {
    let query = supabaseWebinaire
      .from('webinaires')
      .select('*', { count: 'exact' })
      .order('date_webinaire', { ascending: false })

    // Recherche par titre ou slug
    if (search) {
      query = query.or(`titre.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    // Filtre par thème
    if (theme) {
      query = query.eq('theme', theme)
    }

    // Filtre par statut (is_active)
    if (statut === 'active') {
      query = query.eq('is_active', true)
    } else if (statut === 'inactive') {
      query = query.eq('is_active', false)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getAllWebinaires error', error)
      throw new Error('Erreur lors de la récupération des webinaires')
    }

    // Pour chaque webinaire, récupérer le nombre d'inscriptions et les stats
    const webinairesWithStats = await Promise.all(
      (data || []).map(async (webinaire) => {
        const { count: inscriptionsCount } = await supabaseWebinaire
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('webinaire_id', webinaire.id)

        const { data: statsData } = await supabaseWebinaire
          .from('stats')
          .select('*')
          .eq('webinaire_id', webinaire.id)
          .maybeSingle()

        return {
          ...webinaire,
          inscriptions_count: inscriptionsCount || 0,
          places_restantes: webinaire.capacite_max ? webinaire.capacite_max - (inscriptionsCount || 0) : null,
          taux_occupation: webinaire.capacite_max && webinaire.capacite_max > 0
            ? Math.round(((inscriptionsCount || 0) / webinaire.capacite_max) * 100)
            : null,
          stats: statsData || null,
        }
      })
    )

    return {
      webinaires: webinairesWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllWebinaires exception', err)
    throw err
  }
}

/**
 * Récupère un webinaire par son ID avec ses inscriptions et statistiques
 */
export async function getWebinaireById(webinaireId) {
  try {
    // Récupérer le webinaire
    const { data: webinaire, error: webinaireError } = await supabaseWebinaire
      .from('webinaires')
      .select('*')
      .eq('id', webinaireId)
      .maybeSingle()

    if (webinaireError) {
      logError('getWebinaireById error', webinaireError)
      throw new Error('Erreur lors de la récupération du webinaire')
    }

    if (!webinaire) {
      return null
    }

    // Récupérer les présentateurs
    const { data: presentateurs, error: presentateursError } = await supabaseWebinaire
      .from('presentateurs')
      .select('*')
      .eq('webinaire_id', webinaireId)

    if (presentateursError) {
      logError('getWebinaireById presentateurs error', presentateursError)
    }

    // Statistiques des inscriptions
    const { count: totalInscriptions } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('webinaire_id', webinaireId)

    const { count: confirmesInscriptions } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('webinaire_id', webinaireId)
      .eq('statut', 'confirmed')

    const { data: statsData } = await supabaseWebinaire
      .from('stats')
      .select('*')
      .eq('webinaire_id', webinaireId)
      .maybeSingle()

    return {
      ...webinaire,
      presentateurs: presentateurs || [],
      stats: {
        total_inscriptions: totalInscriptions || 0,
        confirmes: confirmesInscriptions || 0,
        ...(statsData || {}),
        places_restantes: webinaire.capacite_max ? webinaire.capacite_max - (totalInscriptions || 0) : null,
        taux_occupation: webinaire.capacite_max && webinaire.capacite_max > 0
          ? Math.round(((totalInscriptions || 0) / webinaire.capacite_max) * 100)
          : null,
      },
    }
  } catch (err) {
    logError('getWebinaireById exception', err)
    throw err
  }
}

/**
 * Crée un nouveau webinaire
 */
export async function createWebinaire(webinaireData) {
  try {
    const {
      slug,
      titre,
      theme,
      resume,
      description_longue,
      date_webinaire,
      heure_debut,
      heure_fin,
      mode,
      lien_webinaire,
      image_url,
      formateur_id,
      capacite_max,
    } = webinaireData

    // Vérifier si le slug existe déjà
    const { data: existing, error: checkError } = await supabaseWebinaire
      .from('webinaires')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (checkError) {
      logError('createWebinaire check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (existing) {
      throw new Error('Un webinaire avec ce slug existe déjà')
    }

    // Créer le webinaire
    const { data: webinaire, error: createError } = await supabaseWebinaire
      .from('webinaires')
      .insert({
        slug,
        titre,
        theme,
        resume: resume || null,
        description_longue: description_longue || null,
        date_webinaire,
        heure_debut,
        heure_fin: heure_fin || null,
        mode: mode || 'En ligne',
        lien_webinaire: lien_webinaire || null,
        image_url: image_url || null,
        formateur_id: formateur_id || null,
        capacite_max: capacite_max ? parseInt(capacite_max) : null,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      logError('createWebinaire error', createError)
      throw new Error('Erreur lors de la création du webinaire')
    }

    // Créer l'entrée stats initiale
    await supabaseWebinaire
      .from('stats')
      .insert({
        webinaire_id: webinaire.id,
        nb_inscrits: 0,
        nb_confirmes: 0,
        nb_presents: 0,
        taux_presence: 0,
      })

    logInfo('Webinaire créé', { id: webinaire.id, slug })
    return webinaire
  } catch (err) {
    logError('createWebinaire exception', err)
    throw err
  }
}

/**
 * Met à jour un webinaire
 */
export async function updateWebinaire(webinaireId, updateData) {
  try {
    // Vérifier que le webinaire existe
    const { data: existing, error: checkError } = await supabaseWebinaire
      .from('webinaires')
      .select('id')
      .eq('id', webinaireId)
      .maybeSingle()

    if (checkError) {
      logError('updateWebinaire check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (!existing) {
      throw new Error('Webinaire introuvable')
    }

    // Vérifier le slug si modifié
    if (updateData.slug && updateData.slug !== existing.slug) {
      const { data: slugExists, error: slugError } = await supabaseWebinaire
        .from('webinaires')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', webinaireId)
        .maybeSingle()

      if (slugError) {
        logError('updateWebinaire slug check error', slugError)
        throw new Error('Erreur lors de la vérification du slug')
      }

      if (slugExists) {
        throw new Error('Ce slug est déjà utilisé par un autre webinaire')
      }
    }

    // Préparer les données de mise à jour
    const updateObj = {}
    if (updateData.titre !== undefined) updateObj.titre = updateData.titre
    if (updateData.slug !== undefined) updateObj.slug = updateData.slug
    if (updateData.theme !== undefined) updateObj.theme = updateData.theme
    if (updateData.resume !== undefined) updateObj.resume = updateData.resume
    if (updateData.description_longue !== undefined) updateObj.description_longue = updateData.description_longue
    if (updateData.date_webinaire !== undefined) updateObj.date_webinaire = updateData.date_webinaire
    if (updateData.heure_debut !== undefined) updateObj.heure_debut = updateData.heure_debut
    if (updateData.heure_fin !== undefined) updateObj.heure_fin = updateData.heure_fin
    if (updateData.mode !== undefined) updateObj.mode = updateData.mode
    if (updateData.lien_webinaire !== undefined) updateObj.lien_webinaire = updateData.lien_webinaire
    if (updateData.image_url !== undefined) updateObj.image_url = updateData.image_url
    if (updateData.formateur_id !== undefined) updateObj.formateur_id = updateData.formateur_id
    if (updateData.capacite_max !== undefined) updateObj.capacite_max = updateData.capacite_max ? parseInt(updateData.capacite_max) : null
    if (updateData.is_active !== undefined) updateObj.is_active = updateData.is_active

    // Mettre à jour
    const { data: webinaire, error: updateError } = await supabaseWebinaire
      .from('webinaires')
      .update(updateObj)
      .eq('id', webinaireId)
      .select()
      .single()

    if (updateError) {
      logError('updateWebinaire error', updateError)
      throw new Error('Erreur lors de la mise à jour du webinaire')
    }

    logInfo('Webinaire mis à jour', { id: webinaireId })
    return webinaire
  } catch (err) {
    logError('updateWebinaire exception', err)
    throw err
  }
}

/**
 * Supprime un webinaire (seulement si aucun inscrit)
 */
export async function deleteWebinaire(webinaireId) {
  try {
    // Vérifier s'il y a des inscriptions
    const { count: inscriptionsCount } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('webinaire_id', webinaireId)

    if (inscriptionsCount && inscriptionsCount > 0) {
      throw new Error('Impossible de supprimer un webinaire avec des inscriptions')
    }

    // Supprimer les stats associées
    await supabaseWebinaire
      .from('stats')
      .delete()
      .eq('webinaire_id', webinaireId)

    // Supprimer les présentateurs associés
    await supabaseWebinaire
      .from('presentateurs')
      .delete()
      .eq('webinaire_id', webinaireId)

    // Supprimer le webinaire
    const { error } = await supabaseWebinaire
      .from('webinaires')
      .delete()
      .eq('id', webinaireId)

    if (error) {
      logError('deleteWebinaire error', error)
      throw new Error('Erreur lors de la suppression du webinaire')
    }

    logInfo('Webinaire supprimé', { id: webinaireId })
    return { success: true, message: 'Webinaire supprimé avec succès' }
  } catch (err) {
    logError('deleteWebinaire exception', err)
    throw err
  }
}

/**
 * Récupère toutes les inscriptions avec pagination
 */
export async function getAllInscriptions({ page = 1, limit = 20, webinaire_id = '', statut = '' }) {
  try {
    let query = supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (webinaire_id) {
      query = query.eq('webinaire_id', webinaire_id)
    }

    if (statut) {
      query = query.eq('statut', statut)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getAllInscriptions error', error)
      throw new Error('Erreur lors de la récupération des inscriptions')
    }

    // Enrichir avec les données de webinaire et membre
    const inscriptionsEnriched = await Promise.all(
      (data || []).map(async (inscription) => {
        const [webinaire, membre] = await Promise.all([
          supabaseWebinaire
            .from('webinaires')
            .select('titre, slug, date_webinaire')
            .eq('id', inscription.webinaire_id)
            .maybeSingle(),
          inscription.membre_id
            ? supabaseAdhesion
                .from('members')
                .select('prenom, nom, email, numero_membre')
                .eq('id', inscription.membre_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        return {
          ...inscription,
          webinaire: webinaire?.data || null,
          membre: membre?.data || null,
        }
      })
    )

    return {
      inscriptions: inscriptionsEnriched,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllInscriptions exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle inscription
 */
export async function createInscription(inscriptionData) {
  try {
    const {
      webinaire_id,
      prenom,
      nom,
      email,
      whatsapp,
      pays,
      membre_id,
      source,
      statut,
    } = inscriptionData

    if (!webinaire_id || !prenom || !nom || !email) {
      throw new Error('webinaire_id, prenom, nom et email sont requis')
    }

    // Vérifier la capacité
    const { data: webinaire } = await supabaseWebinaire
      .from('webinaires')
      .select('capacite_max')
      .eq('id', webinaire_id)
      .maybeSingle()

    if (webinaire && webinaire.capacite_max) {
      const { count: currentInscriptions } = await supabaseWebinaire
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('webinaire_id', webinaire_id)

      if ((currentInscriptions || 0) >= webinaire.capacite_max) {
        throw new Error('La capacité maximale du webinaire est atteinte')
      }
    }

    const { data: inscription, error } = await supabaseWebinaire
      .from('inscriptions')
      .insert({
        webinaire_id,
        prenom,
        nom,
        email,
        whatsapp: whatsapp || null,
        pays: pays || 'France',
        membre_id: membre_id || null,
        source: source || 'site web',
        statut: statut || 'pending',
      })
      .select()
      .single()

    if (error) {
      logError('createInscription error', error)
      throw new Error('Erreur lors de la création de l\'inscription')
    }

    // Mettre à jour les stats
    await updateWebinaireStats(webinaire_id)

    logInfo('Inscription créée', { id: inscription.id, email })
    return inscription
  } catch (err) {
    logError('createInscription exception', err)
    throw err
  }
}

/**
 * Met à jour une inscription
 */
export async function updateInscription(inscriptionId, updateData) {
  try {
    const updateObj = {}
    if (updateData.prenom !== undefined) updateObj.prenom = updateData.prenom
    if (updateData.nom !== undefined) updateObj.nom = updateData.nom
    if (updateData.email !== undefined) updateObj.email = updateData.email
    if (updateData.whatsapp !== undefined) updateObj.whatsapp = updateData.whatsapp
    if (updateData.pays !== undefined) updateObj.pays = updateData.pays
    if (updateData.statut !== undefined) updateObj.statut = updateData.statut
    if (updateData.presence !== undefined) updateObj.presence = updateData.presence

    const { data, error } = await supabaseWebinaire
      .from('inscriptions')
      .update(updateObj)
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

    // Mettre à jour les stats
    if (data.webinaire_id) {
      await updateWebinaireStats(data.webinaire_id)
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
    // Récupérer le webinaire_id avant suppression
    const { data: inscription } = await supabaseWebinaire
      .from('inscriptions')
      .select('webinaire_id')
      .eq('id', inscriptionId)
      .maybeSingle()

    const { error } = await supabaseWebinaire
      .from('inscriptions')
      .delete()
      .eq('id', inscriptionId)

    if (error) {
      logError('deleteInscription error', error)
      throw new Error('Erreur lors de la suppression de l\'inscription')
    }

    // Mettre à jour les stats
    if (inscription?.webinaire_id) {
      await updateWebinaireStats(inscription.webinaire_id)
    }

    logInfo('Inscription supprimée', { id: inscriptionId })
    return { success: true, message: 'Inscription supprimée avec succès' }
  } catch (err) {
    logError('deleteInscription exception', err)
    throw err
  }
}

/**
 * Met à jour les statistiques d'un webinaire
 */
async function updateWebinaireStats(webinaireId) {
  try {
    const { count: nb_inscrits } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('webinaire_id', webinaireId)

    const { count: nb_confirmes } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('webinaire_id', webinaireId)
      .eq('statut', 'confirmed')

    const { count: nb_presents } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('webinaire_id', webinaireId)
      .eq('presence', 'present')

    const taux_presence = nb_confirmes && nb_confirmes > 0
      ? Math.round((nb_presents / nb_confirmes) * 100 * 100) / 100
      : 0

    await supabaseWebinaire
      .from('stats')
      .upsert({
        webinaire_id: webinaireId,
        nb_inscrits: nb_inscrits || 0,
        nb_confirmes: nb_confirmes || 0,
        nb_presents: nb_presents || 0,
        taux_presence,
      })
  } catch (err) {
    logError('updateWebinaireStats error', err)
  }
}

/**
 * Récupère tous les présentateurs d'un webinaire
 */
export async function getPresentateursByWebinaire(webinaireId) {
  try {
    const { data, error } = await supabaseWebinaire
      .from('presentateurs')
      .select('*')
      .eq('webinaire_id', webinaireId)
      .order('created_at', { ascending: true })

    if (error) {
      logError('getPresentateursByWebinaire error', error)
      throw new Error('Erreur lors de la récupération des présentateurs')
    }

    return data || []
  } catch (err) {
    logError('getPresentateursByWebinaire exception', err)
    throw err
  }
}

/**
 * Crée un présentateur
 */
export async function createPresentateur(presentateurData) {
  try {
    const { webinaire_id, nom, prenom, bio, photo_url, linkedin } = presentateurData

    if (!webinaire_id || !nom || !prenom) {
      throw new Error('webinaire_id, nom et prenom sont requis')
    }

    const { data: presentateur, error } = await supabaseWebinaire
      .from('presentateurs')
      .insert({
        webinaire_id,
        nom,
        prenom,
        bio: bio || null,
        photo_url: photo_url || null,
        linkedin: linkedin || null,
      })
      .select()
      .single()

    if (error) {
      logError('createPresentateur error', error)
      throw new Error('Erreur lors de la création du présentateur')
    }

    logInfo('Présentateur créé', { id: presentateur.id, webinaire_id })
    return presentateur
  } catch (err) {
    logError('createPresentateur exception', err)
    throw err
  }
}

/**
 * Met à jour un présentateur
 */
export async function updatePresentateur(presentateurId, updateData) {
  try {
    const updateObj = {}
    if (updateData.nom !== undefined) updateObj.nom = updateData.nom
    if (updateData.prenom !== undefined) updateObj.prenom = updateData.prenom
    if (updateData.bio !== undefined) updateObj.bio = updateData.bio
    if (updateData.photo_url !== undefined) updateObj.photo_url = updateData.photo_url
    if (updateData.linkedin !== undefined) updateObj.linkedin = updateData.linkedin

    const { data, error } = await supabaseWebinaire
      .from('presentateurs')
      .update(updateObj)
      .eq('id', presentateurId)
      .select()
      .single()

    if (error) {
      logError('updatePresentateur error', error)
      throw new Error('Erreur lors de la mise à jour du présentateur')
    }

    if (!data) {
      throw new Error('Présentateur introuvable')
    }

    logInfo('Présentateur mis à jour', { id: presentateurId })
    return data
  } catch (err) {
    logError('updatePresentateur exception', err)
    throw err
  }
}

/**
 * Supprime un présentateur
 */
export async function deletePresentateur(presentateurId) {
  try {
    const { error } = await supabaseWebinaire
      .from('presentateurs')
      .delete()
      .eq('id', presentateurId)

    if (error) {
      logError('deletePresentateur error', error)
      throw new Error('Erreur lors de la suppression du présentateur')
    }

    logInfo('Présentateur supprimé', { id: presentateurId })
    return { success: true, message: 'Présentateur supprimé avec succès' }
  } catch (err) {
    logError('deletePresentateur exception', err)
    throw err
  }
}

/**
 * Récupère les statistiques globales des webinaires
 */
export async function getWebinaireStats() {
  try {
    // Total webinaires actifs
    const { count: totalWebinaires } = await supabaseWebinaire
      .from('webinaires')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Webinaires à venir
    const today = new Date().toISOString().split('T')[0]
    const { count: upcomingWebinaires } = await supabaseWebinaire
      .from('webinaires')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('date_webinaire', today)

    // Total inscriptions
    const { count: totalInscriptions } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })

    // Inscriptions confirmées
    const { count: confirmedInscriptions } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'confirmed')

    // Inscriptions en attente
    const { count: pendingInscriptions } = await supabaseWebinaire
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'pending')

    // Répartition par thème
    const { data: webinairesByTheme } = await supabaseWebinaire
      .from('webinaires')
      .select('theme')
      .eq('is_active', true)

    const themeStats = {}
    webinairesByTheme?.forEach((w) => {
      themeStats[w.theme] = (themeStats[w.theme] || 0) + 1
    })

    // Taux moyen de participation (depuis stats)
    const { data: allStats } = await supabaseWebinaire
      .from('stats')
      .select('taux_presence')

    const tauxMoyen = allStats && allStats.length > 0
      ? Math.round((allStats.reduce((sum, s) => sum + (s.taux_presence || 0), 0) / allStats.length) * 100) / 100
      : 0

    return {
      total_webinaires: totalWebinaires || 0,
      upcoming_webinaires: upcomingWebinaires || 0,
      total_inscriptions: totalInscriptions || 0,
      confirmed_inscriptions: confirmedInscriptions || 0,
      pending_inscriptions: pendingInscriptions || 0,
      taux_moyen_participation: tauxMoyen,
      themes: themeStats,
    }
  } catch (err) {
    logError('getWebinaireStats exception', err)
    throw err
  }
}
