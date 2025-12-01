import { Router } from 'express'
import { geocodeAddress } from '../controllers/geocode.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/search', geocodeAddress)

export default router















