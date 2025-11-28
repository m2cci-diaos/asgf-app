// backend/services/admin.service.js
import { supabase } from '../config/supabase.js'
import { hashPassword } from '../utils/hashPassword.js'
import { ALL_MODULES, ROLE_TYPES, MODULE_DROITS } from '../config/constants.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Récupère tous les admins avec pagination et recherche
 */
export async function getAllAdmins({ page = 1, limit = 20, search = '' }) {
  try {
    let query = supabase
      .from('admins')
      .select('id, numero_membre, email, role_type, super_scope, is_master, is_active, disabled_until, disabled_reason, created_at, admins_modules(module, droit, scope_ids)', { count: 'exact' })
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

    const admins = (data || []).map(({ admins_modules = [], ...admin }) => ({
      ...admin,
      modules: admins_modules.map((m) => ({
        module: m.module,
        droit: m.droit,
        scope_ids: m.scope_ids || [],
      })),
    }))

    return {
      admins,
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
      .select('id, numero_membre, email, role_type, super_scope, is_master, is_active, disabled_until, disabled_reason, created_at, admins_modules(module, droit, scope_ids)')
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
    const modules = (admin.admins_modules || []).map((m) => ({
      module: m.module,
      droit: m.droit,
      scope_ids: m.scope_ids || [],
    }))

    const { admins_modules, ...rest } = admin

    return {
      ...rest,
      modules,
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
    const {
      numero_membre,
      email,
      password,
      role_type = ROLE_TYPES.ADMIN,
      is_master = false,
      is_active = true,
      modules = [],
      super_scope = [],
      membre_id = null,
      disabled_until = null,
      disabled_reason = null,
    } = adminData

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
        role_type: is_master ? ROLE_TYPES.SUPERADMIN : role_type,
        super_scope: is_master ? ALL_MODULES : super_scope,
        is_master,
        is_active,
        membre_id,
        disabled_until,
        disabled_reason,
      })
      .select('id, numero_membre, email, role_type, super_scope, is_master, is_active, created_at, disabled_until, disabled_reason')
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
    const { email } = updateData

    // Vérifier si l'admin existe
    const { data: existing, error: checkError } = await supabase
      .from('admins')
      .select('id, is_master, role_type, super_scope')
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
    if (updateData.numero_membre !== undefined) updateObj.numero_membre = updateData.numero_membre
    if (updateData.membre_id !== undefined) updateObj.membre_id = updateData.membre_id
    if (updateData.is_active !== undefined) updateObj.is_active = updateData.is_active
    if (updateData.disabled_reason !== undefined) updateObj.disabled_reason = updateData.disabled_reason || null
    if (updateData.disabled_until !== undefined) updateObj.disabled_until = updateData.disabled_until

    let nextIsMaster = existing.is_master
    if (updateData.is_master !== undefined) {
      nextIsMaster = updateData.is_master
      updateObj.is_master = nextIsMaster
    }

    let nextRoleType = existing.role_type
    if (updateData.role_type) {
      nextRoleType = updateData.role_type
    }
    if (nextIsMaster) {
      nextRoleType = ROLE_TYPES.SUPERADMIN
      updateObj.super_scope = ALL_MODULES
    } else if (updateData.super_scope !== undefined) {
      updateObj.super_scope = updateData.super_scope
    }
    updateObj.role_type = nextRoleType

    if (updateData.password) {
      updateObj.password_hash = await hashPassword(updateData.password)
    }

    // Réactivation : on nettoie les champs de suspension
    if (updateData.is_active === true || (updateData.disabled_until !== undefined && !updateData.disabled_until)) {
      updateObj.disabled_until = null
      if (updateData.disabled_reason === undefined) {
        updateObj.disabled_reason = null
      }
    }

    // Mettre à jour l'admin
    const { data: admin, error: updateError } = await supabase
      .from('admins')
      .update(updateObj)
      .eq('id', adminId)
      .select('id, numero_membre, email, role_type, super_scope, is_master, is_active, created_at, disabled_until, disabled_reason')
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
export async function deactivateAdmin(adminId, options = {}) {
  try {
    const { reason = 'Compte désactivé par un superadmin', disabled_until = null } = options
    const updatePayload = {
      disabled_reason: reason,
    }

    if (disabled_until) {
      updatePayload.disabled_until = disabled_until
      updatePayload.is_active = true
    } else {
      updatePayload.is_active = false
      updatePayload.disabled_until = null
    }

    const { data, error } = await supabase
      .from('admins')
      .update(updatePayload)
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

    logInfo('Admin désactivé', { id: adminId, disabled_until })
    const message = disabled_until
      ? `Admin suspendu jusqu'au ${new Date(disabled_until).toLocaleString('fr-FR')}`
      : 'Admin désactivé avec succès'
    return { success: true, message }
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
      .select('module, droit, scope_ids')
      .eq('admin_id', adminId)

    if (error) {
      logError('getAdminModules error', error)
      throw new Error('Erreur lors de la récupération des modules')
    }

    return (data || []).map((m) => ({
      module: m.module,
      droit: m.droit,
      scope_ids: m.scope_ids || [],
    }))
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

    // Normaliser et valider la charge utile
    const normalizedModules = modules.map((entry) => {
      if (typeof entry === 'string') {
        return { module: entry, droit: MODULE_DROITS.FULL, scope_ids: [] }
      }
      return {
        module: entry.module,
        droit: entry.droit || MODULE_DROITS.FULL,
        scope_ids: entry.scope_ids || [],
      }
    })

    const invalidModule = normalizedModules.find((m) => !ALL_MODULES.includes(m.module))
    if (invalidModule) {
      throw new Error(`Module invalide: ${invalidModule.module}`)
    }

    const invalidDroit = normalizedModules.find((m) => !Object.values(MODULE_DROITS).includes(m.droit))
    if (invalidDroit) {
      throw new Error(`Droit invalide pour ${invalidDroit.module}`)
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
    if (normalizedModules.length > 0) {
      const modulesToInsert = normalizedModules.map((module) => ({
        admin_id: adminId,
        module: module.module,
        droit: module.droit,
        scope_ids: module.scope_ids,
      }))

      const { error: insertError } = await supabase
        .from('admins_modules')
        .insert(modulesToInsert)

      if (insertError) {
        logError('updateAdminModules insert error', insertError)
        throw new Error('Erreur lors de l\'ajout des modules')
      }
    }

    const formatted = normalizedModules.map((m) => m.module)
    logInfo('Modules admin mis à jour', { id: adminId, modules: formatted })
    return normalizedModules
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
