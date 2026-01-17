// backend/routes/public.routes.js
import { Router } from 'express'
import { rateLimiter } from '../middlewares/rateLimiter.js'
import { 
  publicCreateFormationInscription,
  publicCreateWebinaireInscription 
} from '../controllers/public.controller.js'

const router = Router()

router.post(
  '/formation/inscriptions',
  rateLimiter(10, 60 * 1000),
  publicCreateFormationInscription
)

router.post(
  '/webinaire/inscriptions',
  rateLimiter(10, 60 * 1000),
  publicCreateWebinaireInscription
)

export default router







