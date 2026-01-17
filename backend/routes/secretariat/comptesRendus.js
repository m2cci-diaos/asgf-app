// backend/routes/secretariat/comptesRendus.js
import { Router } from 'express'
import {
  getCompteRendu,
  saveCompteRendu,
  generateReunionPDF,
} from '../../controllers/secretariat.controller.js'
import { requireAuth, requireModule } from '../../middlewares/auth.js'
import { MODULES } from '../../config/constants.js'

const router = Router()

router.use(requireAuth)
router.use(requireModule(MODULES.SECRETARIAT))

router.get('/reunions/:id/compte-rendu', getCompteRendu)
router.post('/', saveCompteRendu)
router.post('/reunions/:id/pdf', generateReunionPDF)

export default router








