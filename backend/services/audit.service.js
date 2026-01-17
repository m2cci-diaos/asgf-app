// backend/services/audit.service.js
import { supabasePublic } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

/**
 * Types d'actions possibles
 */
export const ACTION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  VALIDATE: 'VALIDATE',
  CANCEL: 'CANCEL',
  RESET: 'RESET',
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD',
}

/**
 * Types d'entités
 */
export const ENTITY_TYPES = {
  MEMBER: 'member',
  FORMATION: 'formation',
  SESSION: 'session',
  INSCRIPTION: 'inscription',
  FORMATEUR: 'formateur',
  WEBINAIRE: 'webinaire',
  PRESENTATEUR: 'presentateur',
  COTISATION: 'cotisation',
  PAIEMENT: 'paiement',
  DEPENSE: 'depense',
  REUNION: 'reunion',
  MENTOR: 'mentor',
  MENTEE: 'mentee',
  RELATION: 'relation',
  CANDIDATURE: 'candidature',
  BUREAU_MEMBER: 'bureau_member',
  ADMIN: 'admin',
  CONTACT: 'contact',
}

/**
 * Crée une entrée dans l'audit log
 * @param {Object} params - Paramètres du log
 * @param {string} params.adminId - ID de l'admin
 * @param {string} params.adminEmail - Email de l'admin
 * @param {string} params.adminNom - Nom de l'admin
 * @param {string} params.actionType - Type d'action (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.entityType - Type d'entité (member, formation, etc.)
 * @param {string} params.entityId - ID de l'entité modifiée
 * @param {string} params.entityName - Nom/titre de l'entité
 * @param {string} params.module - Module concerné (adhesions, members, etc.)
 * @param {Object} params.changes - Détails des changements (before/after pour UPDATE)
 * @param {Object} params.metadata - Métadonnées supplémentaires
 * @param {string} params.ipAddress - Adresse IP
 * @param {string} params.userAgent - User agent
 */
export async function logAction({
  adminId,
  adminEmail,
  adminNom,
  actionType,
  entityType,
  entityId = null,
  entityName = null,
  module = null,
  changes = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    if (!adminId || !actionType || !entityType) {
      logError('Audit log: paramètres manquants', {
        adminId,
        actionType,
        entityType,
      })
      return null
    }

    const auditEntry = {
      admin_id: adminId,
      admin_email: adminEmail || null,
      admin_nom: adminNom || null,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      module: module || null,
      changes: changes || null,
      metadata: metadata || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    }

    const { data, error } = await supabasePublic
      .from('audit_log')
      .insert(auditEntry)
      .select()
      .single()

    if (error) {
      logError('Erreur lors de la création du log audit', error)
      return null
    }

    logInfo('Audit log créé', { id: data.id, actionType, entityType })
    return data
  } catch (err) {
    logError('Exception lors de la création du log audit', err)
    return null
  }
}

/**
 * Récupère l'historique des actions avec filtres
 * @param {Object} params - Paramètres de recherche
 * @param {number} params.page - Numéro de page
 * @param {number} params.limit - Nombre d'éléments par page
 * @param {string} params.adminId - Filtrer par admin
 * @param {string} params.actionType - Filtrer par type d'action
 * @param {string} params.entityType - Filtrer par type d'entité
 * @param {string} params.module - Filtrer par module
 * @param {string} params.search - Recherche textuelle
 * @param {string} params.startDate - Date de début
 * @param {string} params.endDate - Date de fin
 */
export async function getAuditLogs({
  page = 1,
  limit = 50,
  adminId = null,
  actionType = null,
  entityType = null,
  module = null,
  search = '',
  startDate = null,
  endDate = null,
} = {}) {
  try {
    let query = supabasePublic
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtres
    if (adminId) {
      query = query.eq('admin_id', adminId)
    }

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (module) {
      query = query.eq('module', module)
    }

    if (search) {
      query = query.or(
        `admin_email.ilike.%${search}%,admin_nom.ilike.%${search}%,entity_name.ilike.%${search}%`
      )
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logError('Erreur lors de la récupération des logs audit', error)
      throw error
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  } catch (err) {
    logError('Exception lors de la récupération des logs audit', err)
    throw err
  }
}

/**
 * Récupère les statistiques d'audit
 */
export async function getAuditStats() {
  try {
    // Récupérer tous les logs
    const { data: allLogs, error } = await supabasePublic
      .from('audit_log')
      .select('action_type, module, admin_id, admin_email, admin_nom')

    if (error) {
      logError('Erreur lors de la récupération des logs pour stats', error)
      throw error
    }

    // Actions par type
    const actionsByType = {}
    allLogs.forEach((log) => {
      actionsByType[log.action_type] = (actionsByType[log.action_type] || 0) + 1
    })

    // Actions par module
    const actionsByModule = {}
    allLogs.forEach((log) => {
      if (log.module) {
        actionsByModule[log.module] = (actionsByModule[log.module] || 0) + 1
      }
    })

    // Admins les plus actifs
    const adminCounts = {}
    allLogs.forEach((log) => {
      const key = log.admin_id
      if (key) {
        if (!adminCounts[key]) {
          adminCounts[key] = {
            admin_id: log.admin_id,
            admin_email: log.admin_email,
            admin_nom: log.admin_nom,
            count: 0,
          }
        }
        adminCounts[key].count++
      }
    })

    const activeAdmins = Object.values(adminCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      actionsByType,
      actionsByModule,
      activeAdmins,
    }
  } catch (err) {
    logError('Erreur lors de la récupération des stats audit', err)
    throw err
  }
}

