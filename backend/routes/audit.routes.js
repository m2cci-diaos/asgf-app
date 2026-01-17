// backend/routes/audit.routes.js
import { Router } from 'express'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'
import {
  getAuditLogsController,
  getAuditStatsController,
} from '../controllers/audit.controller.js'

const router = Router()

// Toutes les routes nécessitent l'authentification et l'accès au module AUDIT
router.use(requireAuth, requireModule(MODULES.AUDIT || 'audit'))

router.get('/logs', getAuditLogsController)
router.get('/stats', getAuditStatsController)

export default router





