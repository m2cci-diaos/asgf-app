// backend/controllers/projets.controller.js
import { logError } from '../utils/logger.js'
import {
  createProjetInscription,
  getProjetInscriptions,
  updateProjetInscriptionStatus,
} from '../services/projets.service.js'

/**
 * Crée une inscription à un projet (public)
 */
export async function createInscriptionController(req, res) {
  try {
    const inscription = await createProjetInscription(req.body)
    return res.status(201).json({
      success: true,
      message: 'Inscription envoyée avec succès',
      data: inscription,
    })
  } catch (err) {
    logError('createInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || "Impossible d'enregistrer votre inscription",
    })
  }
}

/**
 * Récupère les inscriptions (admin)
 */
export async function listInscriptionsController(req, res) {
  try {
    const { projet_id, statut, page, limit } = req.query
    const result = await getProjetInscriptions({
      projet_id,
      statut,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    })

    return res.json({
      success: true,
      ...result,
    })
  } catch (err) {
    logError('listInscriptionsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des inscriptions',
    })
  }
}

/**
 * Met à jour le statut d'une inscription (admin)
 */
export async function updateInscriptionStatusController(req, res) {
  try {
    const { id } = req.params
    const { statut } = req.body
    const adminId = req.admin?.id

    if (!statut) {
      return res.status(400).json({
        success: false,
        message: 'statut est requis',
      })
    }

    const inscription = await updateProjetInscriptionStatus(id, statut, adminId)

    return res.json({
      success: true,
      message: 'Statut mis à jour',
      data: inscription,
    })
  } catch (err) {
    logError('updateInscriptionStatusController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Impossible de mettre à jour le statut',
    })
  }
}




