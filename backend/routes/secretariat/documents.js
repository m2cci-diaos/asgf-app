// backend/routes/secretariat/documents.js
import { Router } from 'express'
import {
  listDocuments,
  createDocument,
  updateDocument,
} from '../../controllers/secretariat.controller.js'
import { requireAuth, requireModule } from '../../middlewares/auth.js'
import { MODULES } from '../../config/constants.js'

const router = Router()

router.use(requireAuth)
router.use(requireModule(MODULES.SECRETARIAT))

router.get('/', listDocuments)
router.post('/', createDocument)
router.put('/:id', updateDocument)

export default router








