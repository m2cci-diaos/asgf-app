// backend/services/admin.service.js
import { supabase } from '../config/supabase.js'
import { hashPassword } from '../utils/hashPassword.js'
import { ALL_MODULES } from '../config/constants.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Récupère tous les admins avec pagination et recherche
 */
export async function getAllAdmins({ page = 1, limit = 20, search = '' }) {
  try {
    let query = supabase
      .from('admins')
      .select('id, numero_membre, email, role_global, is_master, is_active, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Recherche par email ou numéro membre
    if (search) {
      query = query.or(`email.ilike.%${search}%,numero_membre.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('getAllAdmins error', error)
      throw new Error('Erreur lors de la récupération des admins')
    }

    return {
      admins: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllAdmins exception', err)
    throw err
  }
}

/**
 * Récupère un admin par son ID avec ses modules
 */
export async function getAdminById(adminId) {
  try {
    // Récupérer l'admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, numero_membre, email, role_global, is_master, is_active, created_at')
      .eq('id', adminId)
      .maybeSingle()

    if (adminError) {
      logError('getAdminById error', adminError)
      throw new Error('Erreur lors de la récupération de l\'admin')
    }

    if (!admin) {
      return null
    }

    // Récupérer les modules de l'admin
    const { data: modules, error: modulesError } = await supabase
      .from('admins_modules')
      .select('module')
      .eq('admin_id', adminId)

    if (modulesError) {
      logError('getAdminById modules error', modulesError)
    }

    return {
      ...admin,
      modules: (modules || []).map((m) => m.module),
    }
  } catch (err) {
    logError('getAdminById exception', err)
    throw err
  }
}

/**
 * Crée un nouvel admin
 */
export async function createAdmin(adminData) {
  try {
    const { numero_membre, email, password, role_global = 'admin', is_master = false, is_active = true, modules = [] } = adminData

    // Vérifier si l'email ou le numéro membre existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('admins')
      .select('id')
      .or(`email.eq.${email},numero_membre.eq.${numero_membre}`)
      .limit(1)

    if (checkError) {
      logError('createAdmin check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (existing && existing.length > 0) {
      throw new Error('Un admin avec cet email ou numéro membre existe déjà')
    }

    // Hasher le mot de passe
    const password_hash = await hashPassword(password)

    // Créer l'admin
    const { data: admin, error: createError } = await supabase
      .from('admins')
      .insert({
        numero_membre,
        email,
        password_hash,
        role_global,
        is_master,
        is_active,
      })
      .select('id, numero_membre, email, role_global, is_master, is_active, created_at')
      .single()

    if (createError) {
      logError('createAdmin error', createError)
      throw new Error('Erreur lors de la création de l\'admin')
    }

    // Ajouter les modules si fournis
    if (modules.length > 0) {
      await updateAdminModules(admin.id, modules)
    }

    // Récupérer l'admin avec ses modules
    const adminWithModules = await getAdminById(admin.id)

    logInfo('Admin créé', { id: admin.id, email })
    return adminWithModules
  } catch (err) {
    logError('createAdmin exception', err)
    throw err
  }
}

/**
 * Met à jour un admin
 */
export async function updateAdmin(adminId, updateData) {
  try {
    const { email, role_global, is_master, is_active } = updateData

    // Vérifier si l'admin existe
    const { data: existing, error: checkError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .maybeSingle()

    if (checkError) {
      logError('updateAdmin check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (!existing) {
      throw new Error('Admin introuvable')
    }

    // Vérifier si l'email existe déjà pour un autre admin
    if (email) {
      const { data: emailExists, error: emailError } = await supabase
        .from('admins')
        .select('id')
        .eq('email', email)
        .neq('id', adminId)
        .maybeSingle()

      if (emailError) {
        logError('updateAdmin email check error', emailError)
        throw new Error('Erreur lors de la vérification de l\'email')
      }

      if (emailExists) {
        throw new Error('Cet email est déjà utilisé par un autre admin')
      }
    }

    // Construire l'objet de mise à jour
    const updateObj = {}
    if (email !== undefined) updateObj.email = email
    if (role_global !== undefined) updateObj.role_global = role_global
    if (is_master !== undefined) updateObj.is_master = is_master
    if (is_active !== undefined) updateObj.is_active = is_active

    // Mettre à jour l'admin
    const { data: admin, error: updateError } = await supabase
      .from('admins')
      .update(updateObj)
      .eq('id', adminId)
      .select('id, numero_membre, email, role_global, is_master, is_active, created_at')
      .single()

    if (updateError) {
      logError('updateAdmin error', updateError)
      throw new Error('Erreur lors de la mise à jour de l\'admin')
    }

    // Récupérer l'admin avec ses modules
    const adminWithModules = await getAdminById(admin.id)

    logInfo('Admin mis à jour', { id: admin.id })
    return adminWithModules
  } catch (err) {
    logError('updateAdmin exception', err)
    throw err
  }
}

/**
 * Désactive un admin (soft delete)
 */
export async function deactivateAdmin(adminId) {
  try {
    const { data, error } = await supabase
      .from('admins')
      .update({ is_active: false })
      .eq('id', adminId)
      .select('id')
      .single()

    if (error) {
      logError('deactivateAdmin error', error)
      throw new Error('Erreur lors de la désactivation de l\'admin')
    }

    if (!data) {
      throw new Error('Admin introuvable')
    }

    logInfo('Admin désactivé', { id: adminId })
    return { success: true, message: 'Admin désactivé avec succès' }
  } catch (err) {
    logError('deactivateAdmin exception', err)
    throw err
  }
}

/**
 * Récupère les modules d'un admin
 */
export async function getAdminModules(adminId) {
  try {
    const { data, error } = await supabase
      .from('admins_modules')
      .select('module')
      .eq('admin_id', adminId)

    if (error) {
      logError('getAdminModules error', error)
      throw new Error('Erreur lors de la récupération des modules')
    }

    return (data || []).map((m) => m.module)
  } catch (err) {
    logError('getAdminModules exception', err)
    throw err
  }
}

/**
 * Met à jour les modules d'un admin
 */
export async function updateAdminModules(adminId, modules) {
  try {
    // Vérifier que l'admin existe
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, is_master')
      .eq('id', adminId)
      .maybeSingle()

    if (adminError) {
      logError('updateAdminModules check error', adminError)
      throw new Error('Erreur lors de la vérification')
    }

    if (!admin) {
      throw new Error('Admin introuvable')
    }

    // Si c'est un master, on ne modifie pas les modules (ils ont accès à tout)
    if (admin.is_master) {
      return ALL_MODULES
    }

    // Valider les modules
    const validModules = modules.filter((m) => ALL_MODULES.includes(m))
    if (validModules.length !== modules.length) {
      throw new Error('Certains modules sont invalides')
    }

    // Supprimer tous les modules existants
    const { error: deleteError } = await supabase
      .from('admins_modules')
      .delete()
      .eq('admin_id', adminId)

    if (deleteError) {
      logError('updateAdminModules delete error', deleteError)
      throw new Error('Erreur lors de la suppression des modules')
    }

    // Ajouter les nouveaux modules
    if (validModules.length > 0) {
      const modulesToInsert = validModules.map((module) => ({
        admin_id: adminId,
        module,
      }))

      const { error: insertError } = await supabase
        .from('admins_modules')
        .insert(modulesToInsert)

      if (insertError) {
        logError('updateAdminModules insert error', insertError)
        throw new Error('Erreur lors de l\'ajout des modules')
      }
    }

    logInfo('Modules admin mis à jour', { id: adminId, modules: validModules })
    return validModules
  } catch (err) {
    logError('updateAdminModules exception', err)
    throw err
  }
}

/**
 * Récupère la liste de tous les modules disponibles
 */
export function getAvailableModules() {
  return ALL_MODULES
}

/**
 * Récupère les statistiques globales
 */
export async function getAdminStats() {
  try {
    // Compter les admins actifs
    const { count: activeCount, error: activeError } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeError) {
      logError('getAdminStats active error', activeError)
    }

    // Compter les admins inactifs
    const { count: inactiveCount, error: inactiveError } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false)

    if (inactiveError) {
      logError('getAdminStats inactive error', inactiveError)
    }

    // Compter les masters
    const { count: masterCount, error: masterError } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true })
      .eq('is_master', true)
      .eq('is_active', true)

    if (masterError) {
      logError('getAdminStats master error', masterError)
    }

    return {
      total: (activeCount || 0) + (inactiveCount || 0),
      active: activeCount || 0,
      inactive: inactiveCount || 0,
      masters: masterCount || 0,
      modules: ALL_MODULES.length,
    }
  } catch (err) {
    logError('getAdminStats exception', err)
    throw err
  }
}
