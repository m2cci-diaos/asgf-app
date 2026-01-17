// backend/controllers/projets-admin.controller.js
import { logError } from '../utils/logger.js'
import {
  getAllProjets,
  getProjetById,
  createProjet,
  updateProjet,
  deleteProjet,
  getInscriptionById,
  updateInscription,
  deleteInscription,
} from '../services/projets-admin.service.js'
import { getProjetInscriptions } from '../services/projets.service.js'

/**
 * Liste tous les projets
 * Si pas authentifié, retourne seulement les projets actifs
 */
export async function listProjetsController(req, res) {
  try {
    // Si l'utilisateur n'est pas authentifié, retourner seulement les projets actifs
    const activeOnly = !req.admin
    const projets = await getAllProjets(activeOnly)
    return res.json({
      success: true,
      data: projets,
    })
  } catch (err) {
    logError('listProjetsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des projets',
    })
  }
}

/**
 * Récupère un projet par ID
 */
export async function getProjetController(req, res) {
  try {
    const { id } = req.params
    const projet = await getProjetById(id)
    return res.json({
      success: true,
      data: projet,
    })
  } catch (err) {
    logError('getProjetController error', err)
    return res.status(404).json({
      success: false,
      message: err.message || 'Projet introuvable',
    })
  }
}

/**
 * Crée un nouveau projet
 */
export async function createProjetController(req, res) {
  try {
    const projet = await createProjet(req.body)
    return res.status(201).json({
      success: true,
      message: 'Projet créé avec succès',
      data: projet,
    })
  } catch (err) {
    logError('createProjetController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la création du projet',
    })
  }
}

/**
 * Met à jour un projet
 */
export async function updateProjetController(req, res) {
  try {
    const { id } = req.params
    const projet = await updateProjet(id, req.body)
    return res.json({
      success: true,
      message: 'Projet mis à jour',
      data: projet,
    })
  } catch (err) {
    logError('updateProjetController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du projet',
    })
  }
}

/**
 * Supprime un projet
 */
export async function deleteProjetController(req, res) {
  try {
    const { id } = req.params
    await deleteProjet(id)
    return res.json({
      success: true,
      message: 'Projet supprimé',
    })
  } catch (err) {
    logError('deleteProjetController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression du projet',
    })
  }
}

/**
 * Liste les inscriptions avec filtres
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
 * Récupère une inscription par ID
 */
export async function getInscriptionController(req, res) {
  try {
    const { id } = req.params
    const inscription = await getInscriptionById(id)
    return res.json({
      success: true,
      data: inscription,
    })
  } catch (err) {
    logError('getInscriptionController error', err)
    return res.status(404).json({
      success: false,
      message: err.message || 'Inscription introuvable',
    })
  }
}

/**
 * Met à jour une inscription
 */
export async function updateInscriptionController(req, res) {
  try {
    const { id } = req.params
    const inscription = await updateInscription(id, req.body)
    return res.json({
      success: true,
      message: 'Inscription mise à jour',
      data: inscription,
    })
  } catch (err) {
    logError('updateInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour de l\'inscription',
    })
  }
}

/**
 * Supprime une inscription
 */
export async function deleteInscriptionController(req, res) {
  try {
    const { id } = req.params
    await deleteInscription(id)
    return res.json({
      success: true,
      message: 'Inscription supprimée',
    })
  } catch (err) {
    logError('deleteInscriptionController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression de l\'inscription',
    })
  }
}

