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

// Route pour les statistiques
router.get('/stats', getStats)

export default router
