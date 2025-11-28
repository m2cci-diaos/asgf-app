// backend/routes/webinaire.routes.js
import { Router } from 'express'
import {
  listWebinaires,
  getWebinaire,
  createWebinaireController,
  updateWebinaireController,
  deleteWebinaireController,
  listInscriptions,
  createInscriptionController,
  updateInscriptionController,
  deleteInscriptionController,
  getPresentateurs,
  createPresentateurController,
  updatePresentateurController,
  deletePresentateurController,
  getStats,
  sendWebinaireInvitationController,
  sendWebinaireReminderController,
} from '../controllers/webinaire.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Webinaire
router.use(requireModule(MODULES.WEBINAIRE))

// Routes pour les webinaires
router.get('/webinaires', listWebinaires)
router.get('/webinaires/:id', getWebinaire)
router.post('/webinaires', createWebinaireController)
router.put('/webinaires/:id', updateWebinaireController)
router.delete('/webinaires/:id', deleteWebinaireController)

// Routes pour les inscriptions
router.get('/inscriptions', listInscriptions)
router.post('/inscriptions', createInscriptionController)
router.put('/inscriptions/:id', updateInscriptionController)
router.delete('/inscriptions/:id', deleteInscriptionController)
router.post('/inscriptions/:id/invitation', sendWebinaireInvitationController)

// Routes pour les présentateurs
router.get('/webinaires/:id/presentateurs', getPresentateurs)
router.post('/presentateurs', createPresentateurController)
router.put('/presentateurs/:id', updatePresentateurController)
router.delete('/presentateurs/:id', deletePresentateurController)

// Route pour les statistiques
router.get('/stats', getStats)

// Rappel pour un webinaire (toutes les inscriptions confirmées)
router.post('/webinaires/:id/reminder', sendWebinaireReminderController)

export default router
