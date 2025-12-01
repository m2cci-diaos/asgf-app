// backend/routes/dashboard.routes.js
import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { getAllDashboardStatsController } from '../controllers/dashboard.controller.js'

const router = Router()

// Toutes les routes nécessitent l'authentification
// Mais pas requireModule car le dashboard est accessible à tous les admins
router.use(requireAuth)

router.get('/stats', getAllDashboardStatsController)

export default router

