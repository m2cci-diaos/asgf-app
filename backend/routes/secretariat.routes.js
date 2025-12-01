// backend/routes/secretariat.routes.js
import { Router } from 'express'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'
import { getStats, findMemberByEmail } from '../controllers/secretariat.controller.js'
import { listMembersController } from '../controllers/adhesion.controller.js'

// Import des routes modulaires
import reunionsRoutes from './secretariat/reunions.js'
import participantsRoutes from './secretariat/participants.js'
import comptesRendusRoutes from './secretariat/comptesRendus.js'
import actionsRoutes from './secretariat/actions.js'
import documentsRoutes from './secretariat/documents.js'
import rapportsRoutes from './secretariat/rapports.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Vérifier l'accès au module Secrétariat
router.use(requireModule(MODULES.SECRETARIAT))

// Routes modulaires
router.use('/reunions', reunionsRoutes)
router.use('/participants', participantsRoutes)
router.use('/comptes-rendus', comptesRendusRoutes)
router.use('/actions', actionsRoutes)
router.use('/documents', documentsRoutes)
router.use('/rapports', rapportsRoutes)

// Route pour les statistiques
router.get('/stats', getStats)

// Route pour trouver un membre par email
router.get('/members/by-email', findMemberByEmail)

// Route pour lister les membres (accessible depuis secretariat pour ajouter des participants)
// Utilise le même contrôleur que adhesion mais avec les permissions de secretariat
router.get('/members', listMembersController)

export default router
