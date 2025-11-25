// backend/controllers/adhesion.controller.js
import {
  getAllMembers,
  getPendingMembers,
  approveMember,
  rejectMember,
  getAdhesionStats,
} from '../services/adhesion.service.js'
import { validateId, validatePagination } from '../utils/validators.js'
import { logError } from '../utils/logger.js'

/**
 * GET /api/adhesion/members
 * Récupère tous les membres avec pagination et filtres
 */
export async function listMembersController(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getAllMembers({
      ...pagination.data,
      search: req.query.search || '',
      status: req.query.status || '',
    })

    return res.json({
      success: true,
      data: result.members,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listMembersController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des membres',
    })
  }
}

/**
 * GET /api/adhesion/members/pending
 * Récupère les membres en attente de validation
 */
export async function getPendingMembersController(req, res) {
  try {
    const members = await getPendingMembers()
    return res.json({
      success: true,
      data: members,
    })
  } catch (err) {
    logError('getPendingMembersController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des membres en attente',
    })
  }
}

/**
 * POST /api/adhesion/members/:id/approve
 * Approuve un membre
 */
export async function approveMemberController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    const member = await approveMember(req.params.id, adminId)
    return res.json({
      success: true,
      message: 'Membre approuvé avec succès',
      data: member,
    })
  } catch (err) {
    logError('approveMemberController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la validation du membre',
    })
  }
}

/**
 * POST /api/adhesion/members/:id/reject
 * Rejette un membre
 */
export async function rejectMemberController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    const member = await rejectMember(req.params.id, adminId)
    return res.json({
      success: true,
      message: 'Membre rejeté avec succès',
      data: member,
    })
  } catch (err) {
    logError('rejectMemberController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors du rejet du membre',
    })
  }
}

/**
 * GET /api/adhesion/stats
 * Récupère les statistiques d'adhésion
 */
export async function getAdhesionStatsController(req, res) {
  try {
    const stats = await getAdhesionStats()
    return res.json({
      success: true,
      data: stats,
    })
  } catch (err) {
    logError('getAdhesionStatsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des statistiques',
    })
  }
}
