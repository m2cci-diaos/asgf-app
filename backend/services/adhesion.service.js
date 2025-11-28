// backend/services/adhesion.service.js
import { supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Récupère tous les membres avec pagination et filtres
 */
export async function getAllMembers({ page = 1, limit = 20, search = '', status = '', ids = null }) {
  try {
    logInfo('getAllMembers: Requête initiale', { page, limit, search, status, ids: ids?.length || 0 })
    let query = supabaseAdhesion
      .from('members')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtre par IDs (prioritaire si fourni)
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids)
    } else {
      // Recherche par nom, prénom, email ou numéro de membre (seulement si pas de filtrage par IDs)
      if (search) {
        query = query.or(`prenom.ilike.%${search}%,nom.ilike.%${search}%,email.ilike.%${search}%,numero_membre.ilike.%${search}%`)
      }

      // Filtre par statut
      if (status) {
        query = query.eq('status', status)
      }

      // Pagination (seulement si pas de filtrage par IDs)
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      logError('getAllMembers error', error)
      throw new Error('Erreur lors de la récupération des membres')
    }

    logInfo('getAllMembers: Membres récupérés', { count: data?.length || 0, total: count || 0, ids: ids?.length || 0 })

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

/**
 * Récupère les statistiques d'adhésion
 */
export async function getAdhesionStats() {
  try {
    // Total des membres
    const { count: totalMembers, error: totalError } = await supabaseAdhesion
      .from('members')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      logError('getAdhesionStats totalMembers error', totalError)
    }

    // Membres par statut
    const { data: statusData, error: statusError } = await supabaseAdhesion
      .from('members')
      .select('status')

    if (statusError) {
      logError('getAdhesionStats statusData error', statusError)
    }

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
    }

    if (statusData) {
      statusData.forEach((m) => {
        if (m.status === 'pending') statusCounts.pending++
        else if (m.status === 'approved') statusCounts.approved++
        else if (m.status === 'rejected') statusCounts.rejected++
      })
    }

    // Membres actifs
    const { count: activeCount, error: activeError } = await supabaseAdhesion
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeError) {
      logError('getAdhesionStats activeCount error', activeError)
    }

    // Répartition par pays
    const { data: countryData, error: countryError } = await supabaseAdhesion
      .from('members')
      .select('pays')
      .not('pays', 'is', null)

    if (countryError) {
      logError('getAdhesionStats countryData error', countryError)
    }

    const countryDistribution = {}
    if (countryData) {
      countryData.forEach((m) => {
        const country = m.pays || 'Non renseigné'
        countryDistribution[country] = (countryDistribution[country] || 0) + 1
      })
    }

    // Évolution mensuelle (adhésions par mois)
    const { data: monthlyData, error: monthlyError } = await supabaseAdhesion
      .from('members')
      .select('created_at, status')
      .order('created_at', { ascending: true })

    if (monthlyError) {
      logError('getAdhesionStats monthlyData error', monthlyError)
    }

    const monthlyEvolution = {}
    if (monthlyData) {
      monthlyData.forEach((m) => {
        const date = new Date(m.created_at)
        const month = String(date.getMonth() + 1)
        const key = `${date.getFullYear()}-${month.length === 1 ? '0' + month : month}`
        if (!monthlyEvolution[key]) {
          monthlyEvolution[key] = { total: 0, approved: 0, pending: 0, rejected: 0 }
        }
        monthlyEvolution[key].total++
        if (m.status === 'approved') monthlyEvolution[key].approved++
        else if (m.status === 'pending') monthlyEvolution[key].pending++
        else if (m.status === 'rejected') monthlyEvolution[key].rejected++
      })
    }

    // Répartition par niveau d'études
    const { data: levelData, error: levelError } = await supabaseAdhesion
      .from('members')
      .select('niveau_etudes')
      .not('niveau_etudes', 'is', null)

    if (levelError) {
      logError('getAdhesionStats levelData error', levelError)
    }

    const levelDistribution = {}
    if (levelData) {
      levelData.forEach((m) => {
        const level = m.niveau_etudes || 'Non renseigné'
        levelDistribution[level] = (levelDistribution[level] || 0) + 1
      })
    }

    // Répartition par université
    const { data: universityData, error: universityError } = await supabaseAdhesion
      .from('members')
      .select('universite')
      .not('universite', 'is', null)

    if (universityError) {
      logError('getAdhesionStats universityData error', universityError)
    }

    const universityDistribution = {}
    if (universityData) {
      universityData.forEach((m) => {
        const university = m.universite || 'Non renseigné'
        universityDistribution[university] = (universityDistribution[university] || 0) + 1
      })
    }

    // Taux de croissance (adhésions ce mois vs mois précédent)
    const now = new Date()
    const currentMonthNum = String(now.getMonth() + 1)
    const currentMonth = `${now.getFullYear()}-${currentMonthNum.length === 1 ? '0' + currentMonthNum : currentMonthNum}`
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthNum = String(lastMonth.getMonth() + 1)
    const lastMonthKey = `${lastMonth.getFullYear()}-${lastMonthNum.length === 1 ? '0' + lastMonthNum : lastMonthNum}`

    const currentMonthCount = monthlyEvolution[currentMonth]?.total || 0
    const lastMonthCount = monthlyEvolution[lastMonthKey]?.total || 0
    const growthRate = lastMonthCount > 0 
      ? ((currentMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1)
      : currentMonthCount > 0 ? '100.0' : '0.0'

    return {
      total_members: totalMembers || 0,
      active_members: activeCount || 0,
      pending_members: statusCounts.pending,
      approved_members: statusCounts.approved,
      rejected_members: statusCounts.rejected,
      country_distribution: countryDistribution,
      monthly_evolution: monthlyEvolution,
      level_distribution: levelDistribution,
      university_distribution: universityDistribution,
      growth_rate: parseFloat(growthRate),
      current_month_count: currentMonthCount,
      last_month_count: lastMonthCount,
    }
  } catch (err) {
    logError('getAdhesionStats exception', err)
    throw err
  }
}

/**
 * Met à jour un membre
 */
export async function updateMember(memberId, memberData) {
  try {
    // Liste des colonnes autorisées dans la table members (selon le schéma)
    const allowedColumns = [
      'prenom', 'nom', 'email', 'telephone', 'date_naissance',
      'universite', 'niveau_etudes', 'annee_universitaire', 'specialite',
      'interets', 'motivation', 'competences',
      'is_newsletter_subscribed', 'is_active',
      'adresse', 'ville', 'pays',
      'status', 'statut_pro', 'domaine', 'date_adhesion'
    ]

    // Préparer les données à mettre à jour (uniquement les colonnes autorisées)
    const rawData = {
      prenom: memberData.prenom,
      nom: memberData.nom,
      email: memberData.email,
      telephone: memberData.telephone,
      date_naissance: memberData.date_naissance,
      universite: memberData.universite,
      niveau_etudes: memberData.niveau_etudes,
      annee_universitaire: memberData.annee_universitaire,
      specialite: memberData.specialite,
      interets: memberData.interets,
      motivation: memberData.motivation,
      competences: memberData.competences,
      is_newsletter_subscribed: memberData.is_newsletter_subscribed,
      is_active: memberData.is_active,
      adresse: memberData.adresse,
      ville: memberData.ville,
      pays: memberData.pays,
      status: memberData.status,
      statut_pro: memberData.statut_pro,
      domaine: memberData.domaine,
      date_adhesion: memberData.date_adhesion,
    }

    // Filtrer uniquement les colonnes autorisées et nettoyer les valeurs
    const updateData = {}
    allowedColumns.forEach(key => {
      if (rawData[key] !== undefined) {
        // Gérer les intérêts (convertir string en tableau)
        if (key === 'interets') {
          if (!rawData[key] || rawData[key] === '') {
            updateData[key] = null
          } else if (Array.isArray(rawData[key])) {
            updateData[key] = rawData[key].length > 0 ? rawData[key] : null
          } else if (typeof rawData[key] === 'string') {
            const interests = rawData[key].split(',').map(i => i.trim()).filter(i => i)
            updateData[key] = interests.length > 0 ? interests : null
          } else {
            updateData[key] = null
          }
        }
        // Gérer les booléens
        else if (key === 'is_newsletter_subscribed' || key === 'is_active') {
          updateData[key] = Boolean(rawData[key])
        }
        // Gérer les dates (chaînes vides → null)
        else if (key === 'date_naissance' || key === 'date_adhesion') {
          updateData[key] = rawData[key] && rawData[key] !== '' ? rawData[key] : null
        }
        // Gérer les champs texte optionnels (chaînes vides → null, sauf champs requis)
        else if (key === 'prenom' || key === 'nom' || key === 'email') {
          updateData[key] = rawData[key] || ''
        }
        // Autres champs texte optionnels
        else {
          updateData[key] = rawData[key] && rawData[key] !== '' ? rawData[key] : null
        }
      }
    })

    // S'assurer que les champs requis sont présents
    if (!updateData.prenom || !updateData.nom || !updateData.email) {
      throw new Error('Les champs prénom, nom et email sont requis')
    }

    // Logger les colonnes qui seront mises à jour (pour debug)
    logInfo('updateMember: Colonnes à mettre à jour', { 
      columns: Object.keys(updateData),
      memberId 
    })

    const { data, error } = await supabaseAdhesion
      .from('members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      logError('updateMember error', error)
      // Inclure le message d'erreur de Supabase pour plus de détails
      const errorMessage = error.message || 'Erreur lors de la mise à jour du membre'
      throw new Error(errorMessage)
    }

    if (!data) {
      throw new Error('Membre introuvable')
    }

    logInfo('Membre mis à jour', { id: memberId })
    return data
  } catch (err) {
    logError('updateMember exception', err)
    throw err
  }
}

/**
 * Supprime un membre
 */
export async function deleteMember(memberId) {
  try {
    const { data, error } = await supabaseAdhesion
      .from('members')
      .delete()
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      logError('deleteMember error', error)
      throw new Error('Erreur lors de la suppression du membre')
    }

    if (!data) {
      throw new Error('Membre introuvable')
    }

    logInfo('Membre supprimé', { id: memberId })
    return data
  } catch (err) {
    logError('deleteMember exception', err)
    throw err
  }
}
