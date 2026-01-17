// backend/routes/adhesion.routes.js
import { Router } from 'express'
import {
  listMembersController,
  getPendingMembersController,
  approveMemberController,
  rejectMemberController,
  getAdhesionStatsController,
  sendMemberEmailController,
  updateMemberController,
  deleteMemberController,
} from '../controllers/adhesion.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Adhésion
router.use(requireModule(MODULES.ADHESION))

// Routes pour les membres
router.get('/members', listMembersController)
router.get('/members/pending', getPendingMembersController)
router.post('/members/:id/approve', approveMemberController)
router.post('/members/:id/reject', rejectMemberController)
router.put('/members/:id', updateMemberController)
router.delete('/members/:id', deleteMemberController)
router.post('/members/email', sendMemberEmailController)

// Route pour les statistiques
router.get('/stats', getAdhesionStatsController)

export default router
