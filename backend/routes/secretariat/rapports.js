// backend/routes/secretariat/rapports.js
import { Router } from 'express'
import {
  generateRapportPresidence,
  getRapportsPresidence,
} from '../../controllers/secretariat.controller.js'
import { requireAuth, requireModule } from '../../middlewares/auth.js'
import { MODULES } from '../../config/constants.js'

const router = Router()

router.use(requireAuth)
router.use(requireModule(MODULES.SECRETARIAT))

router.post('/presidence', generateRapportPresidence)
router.get('/presidence', getRapportsPresidence)

export default router








