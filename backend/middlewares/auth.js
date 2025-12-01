// backend/middlewares/auth.js
import { verifyToken } from '../utils/jwt.js'
import { supabase } from '../config/supabase.js'
import { logError } from '../utils/logger.js'
import { ROLE_TYPES } from '../config/constants.js'

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Token manquant' 
      })
    }

    const token = header.split(' ')[1]
    
    // Vérifier que le token n'est pas vide
    if (!token || token.trim() === '') {
      return res.status(401).json({ 
        success: false,
        message: 'Token invalide' 
      })
    }

    // Vérifier le token
    let payload
    try {
      payload = verifyToken(token)
    } catch (err) {
      if (err.message === 'Token expiré') {
        return res.status(401).json({ 
          success: false,
          message: 'Session expirée. Veuillez vous reconnecter.' 
        })
      }
      throw err
    }

    // Vérifier que l'admin existe toujours et est actif
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, numero_membre, role_type, super_scope, is_master, is_active, disabled_until')
      .eq('id', payload.id)
      .single()

    if (error || !admin) {
      logError('requireAuth: Admin introuvable', { adminId: payload.id, error })
      return res.status(401).json({ 
        success: false,
        message: 'Compte introuvable' 
      })
    }

    // Vérifier que le compte est actif
    if (!admin.is_active) {
      return res.status(401).json({ 
        success: false,
        message: 'Compte désactivé' 
      })
    }

    // Vérifier la suspension temporaire
    if (admin.disabled_until) {
      const disabledUntilDate = new Date(admin.disabled_until)
      const now = new Date()
      if (disabledUntilDate > now) {
        return res.status(423).json({
          success: false,
          message: `Compte suspendu jusqu'au ${disabledUntilDate.toLocaleString('fr-FR')}`,
        })
      }
    }

    // Ajouter les informations complètes de l'admin à la requête
    req.admin = {
      ...payload,
      ...admin,
    }
    
    next()
  } catch (err) {
    logError('Auth error', { message: err.message, stack: err.stack })
    return res.status(401).json({ 
      success: false,
      message: err.message || 'Token invalide ou expiré' 
    })
  }
}

// Dépendances entre modules : si un admin a accès au module parent, il a accès au module enfant
const MODULE_DEPENDENCIES = {
  // members dépend de adhesion (les membres sont gérés dans le module adhesion)
  // Note: members n'est pas un module séparé dans la BD, c'est une vue du module adhesion
}

// Vérifie que l'admin a accès à un module donné
export function requireModule(moduleName) {
  return async (req, res, next) => {
    try {
      const adminId = req.admin?.id
      if (!adminId) {
        return res.status(401).json({ message: 'Non authentifié' })
      }

      // Calendar : accessible à tous les admins authentifiés
      if (moduleName === 'calendar') {
        return next()
      }

      // Audit : uniquement superadmins (masters ou scoped)
      if (moduleName === 'audit') {
        if (req.admin.is_master) {
          return next()
        }
        if (req.admin.role_type === ROLE_TYPES.SUPERADMIN) {
          const scopedModules = Array.isArray(req.admin.super_scope) ? req.admin.super_scope : []
          // Si super_scope est vide, accès complet. Sinon, vérifier si audit est dans le scope
          if (scopedModules.length === 0 || scopedModules.includes(moduleName)) {
            return next()
          }
        }
        logError('requireModule: Accès refusé à audit', { adminId, moduleName, ip: req.ip })
        return res.status(403).json({ 
          success: false,
          message: 'Accès refusé : Historique réservé aux superadmins' 
        })
      }

      // Les superadmins masters ont accès à tout
      if (req.admin.is_master) {
        return next()
      }

      // Superadmins scoped
      if (req.admin.role_type === ROLE_TYPES.SUPERADMIN) {
        const scopedModules = Array.isArray(req.admin.super_scope) ? req.admin.super_scope : []
        if (scopedModules.length === 0 || scopedModules.includes(moduleName)) {
          return next()
        }
      }

      // Vérifier l'accès direct au module
      const { data: directAccess, error: directError } = await supabase
        .from('admins_modules')
        .select('id')
        .eq('admin_id', adminId)
        .eq('module', moduleName)
        .maybeSingle()

      if (directError) {
        logError('requireModule error', directError)
        return res.status(500).json({ 
          success: false,
          message: 'Erreur serveur' 
        })
      }

      if (directAccess) {
        return next()
      }

      // Vérifier les dépendances : si le module dépend d'un autre, vérifier l'accès au module parent
      // Exemple: si un admin a accès à 'adhesion', il a automatiquement accès aux fonctionnalités membres
      const dependencies = MODULE_DEPENDENCIES[moduleName] || []
      for (const parentModule of dependencies) {
        const { data: parentAccess, error: parentError } = await supabase
          .from('admins_modules')
          .select('id')
          .eq('admin_id', adminId)
          .eq('module', parentModule)
          .maybeSingle()

        if (!parentError && parentAccess) {
          return next() // Accès via dépendance
        }
      }

      // Dépendances inverses : certains modules ont besoin d'accéder à d'autres modules
      // Exemple: secretariat a besoin d'accéder à adhesion (membres) pour ajouter des participants
      if (moduleName === 'adhesion') {
        // Vérifier si l'admin a accès à secretariat (il peut alors lire les membres)
        const { data: secretariatAccess, error: secretariatError } = await supabase
          .from('admins_modules')
          .select('id')
          .eq('admin_id', adminId)
          .eq('module', 'secretariat')
          .maybeSingle()

        if (!secretariatError && secretariatAccess) {
          // L'admin a secretariat, il peut lire les membres (mais pas modifier)
          // On vérifie la méthode HTTP : GET = lecture seule autorisée
          if (req.method === 'GET') {
            return next() // Lecture autorisée pour secretariat
          }
          // Pour les autres méthodes (POST, PUT, DELETE), on continue la vérification normale
        }
      }

      logError('requireModule: Accès refusé', { adminId, moduleName, ip: req.ip })
      return res.status(403).json({ 
        success: false,
        message: `Accès refusé au module ${moduleName}` 
      })
    } catch (err) {
      logError('requireModule exception', err)
      return res.status(500).json({ 
        success: false,
        message: 'Erreur serveur' 
      })
    }
  }
}
