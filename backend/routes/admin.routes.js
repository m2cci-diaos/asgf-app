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
import { MODULES, ROLE_TYPES } from '../config/constants.js'

const router = Router()

// Toutes les routes nécessitent une authentification
router.use(requireAuth)

// Seuls les masters peuvent gérer les admins
const isSuperAdmin = (admin) => admin?.is_master || admin?.role_type === ROLE_TYPES.SUPERADMIN

const requireSuperAdmin = (req, res, next) => {
  if (!isSuperAdmin(req.admin)) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Seuls les superadmins peuvent gérer les admins.',
    })
  }
  next()
}

// Routes pour la gestion des admins (réservées aux masters)
router.get('/admins', requireSuperAdmin, listAdmins)
router.get('/admins/:id', requireSuperAdmin, getAdmin)
router.post('/admins', requireSuperAdmin, createAdminController)
router.put('/admins/:id', requireSuperAdmin, updateAdminController)
router.delete('/admins/:id', requireSuperAdmin, deleteAdmin)

// Routes pour la gestion des modules d'un admin (réservées aux masters)
router.get('/admins/:id/modules', requireSuperAdmin, getAdminModulesController)
router.put('/admins/:id/modules', requireSuperAdmin, updateAdminModulesController)

// Route pour récupérer les modules disponibles (accessible à tous les admins authentifiés)
router.get('/modules', getModules)

// Route pour les statistiques (accessible à tous les admins authentifiés)
router.get('/stats', getStats)

export default router
