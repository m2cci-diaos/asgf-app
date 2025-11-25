// backend/routes/formation.routes.js
import { Router } from 'express'
import {
  listFormations,
  getFormation,
  createFormationController,
  updateFormationController,
  deleteFormation,
  getInscriptions,
  confirmInscriptionController,
  rejectInscriptionController,
  getStats,
  listSessions,
  createSessionController,
  updateSessionController,
  deleteSessionController,
  listInscriptions,
  createInscriptionController,
  updateInscriptionController,
  deleteInscriptionController,
  listFormateurs,
  createFormateurController,
  updateFormateurController,
  deleteFormateurController,
} from '../controllers/formation.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Formation
router.use(requireModule(MODULES.FORMATION))

// Routes pour les formations
router.get('/formations', listFormations)
router.get('/formations/:id', getFormation)
router.post('/formations', createFormationController)
router.put('/formations/:id', updateFormationController)
router.delete('/formations/:id', deleteFormation)

// Routes pour les inscriptions
router.get('/formations/:id/inscriptions', getInscriptions)
router.post('/inscriptions/:id/confirm', confirmInscriptionController)
router.post('/inscriptions/:id/reject', rejectInscriptionController)
router.get('/inscriptions', listInscriptions)
router.post('/inscriptions', createInscriptionController)
router.put('/inscriptions/:id', updateInscriptionController)
router.delete('/inscriptions/:id', deleteInscriptionController)

// Routes pour les sessions
router.get('/sessions', listSessions)
router.post('/sessions', createSessionController)
router.put('/sessions/:id', updateSessionController)
router.delete('/sessions/:id', deleteSessionController)

// Routes pour les formateurs
router.get('/formateurs', listFormateurs)
router.post('/formateurs', createFormateurController)
router.put('/formateurs/:id', updateFormateurController)
router.delete('/formateurs/:id', deleteFormateurController)

// Route pour les statistiques
router.get('/stats', getStats)

export default router
