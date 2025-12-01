// backend/controllers/audit.controller.js
import { getAuditLogs, getAuditStats } from '../services/audit.service.js'
import { logError } from '../utils/logger.js'

/**
 * GET /api/admin/audit/logs - Récupère l'historique des actions
 */
export async function getAuditLogsController(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      adminId,
      actionType,
      entityType,
      module,
      search = '',
      startDate,
      endDate,
    } = req.query

    const result = await getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      adminId: adminId || null,
      actionType: actionType || null,
      entityType: entityType || null,
      module: module || null,
      search: search || '',
      startDate: startDate || null,
      endDate: endDate || null,
    })

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (err) {
    logError('getAuditLogsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des logs',
    })
  }
}

/**
 * GET /api/admin/audit/stats - Récupère les statistiques d'audit
 */
export async function getAuditStatsController(req, res) {
  try {
    const stats = await getAuditStats()
    return res.json({
      success: true,
      data: stats,
    })
  } catch (err) {
    logError('getAuditStatsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des statistiques',
    })
  }
}


