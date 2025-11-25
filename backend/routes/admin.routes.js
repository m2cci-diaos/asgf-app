// backend/routes/admin.routes.js
import { Router } from 'express'
import {
  listAdmins,
  getAdmin,
  createAdminController,
  updateAdminController,
  deleteAdmin,
  getAdminModulesController,
  updateAdminModulesController,
  getModules,
  getStats,
} from '../controllers/admin.controller.js'
import { requireAuth, requireModule } from '../middlewares/auth.js'
import { MODULES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Seuls les masters peuvent gérer les admins
const requireMaster = (req, res, next) => {
  if (!req.admin?.is_master) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Seuls les superadmins peuvent gérer les admins.',
    })
  }
  next()
}

// Routes pour la gestion des admins (réservées aux masters)
router.get('/admins', requireMaster, listAdmins)
router.get('/admins/:id', requireMaster, getAdmin)
router.post('/admins', requireMaster, createAdminController)
router.put('/admins/:id', requireMaster, updateAdminController)
router.delete('/admins/:id', requireMaster, deleteAdmin)

// Routes pour la gestion des modules d'un admin (réservées aux masters)
router.get('/admins/:id/modules', requireMaster, getAdminModulesController)
router.put('/admins/:id/modules', requireMaster, updateAdminModulesController)

// Route pour récupérer les modules disponibles (accessible à tous les admins authentifiés)
router.get('/modules', getModules)

// Route pour les statistiques (accessible à tous les admins authentifiés)
router.get('/stats', getStats)

export default router
