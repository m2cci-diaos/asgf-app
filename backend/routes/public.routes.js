// backend/routes/public.routes.js
import { Router } from 'express'
import { rateLimiter } from '../middlewares/rateLimiter.js'
import { publicCreateFormationInscription } from '../controllers/public.controller.js'

const router = Router()

router.post(
  '/formation/inscriptions',
  rateLimiter(10, 60 * 1000),
  publicCreateFormationInscription
)

export default router



