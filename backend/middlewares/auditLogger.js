// backend/middlewares/auditLogger.js
import { logAction, ACTION_TYPES } from '../services/audit.service.js'

/**
 * Middleware pour logger automatiquement les actions
 * Utilisation: router.post('/path', auditLogger('CREATE', 'member', 'members'), controller)
 */
export function auditLogger(actionType, entityType, module = null) {
  return async (req, res, next) => {
    // Sauvegarder la fonction originale de res.json
    const originalJson = res.json.bind(res)

    // Intercepter res.json pour logger après la réponse
    res.json = async function (data) {
      // Si l'action a réussi (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const admin = req.admin
          if (admin) {
            // Extraire l'ID de l'entité depuis la réponse ou les params
            const entityId = data?.data?.id || req.params?.id || null
            const entityName = data?.data?.nom || data?.data?.titre || data?.data?.name || null

            // Pour UPDATE, extraire les changements si disponibles
            let changes = null
            if (actionType === ACTION_TYPES.UPDATE && req.body) {
              // Comparer avec les données existantes si disponibles
              changes = {
                before: req.body.originalData || null,
                after: req.body,
              }
            }

            // Logger l'action de manière asynchrone (ne bloque pas la réponse)
            logAction({
              adminId: admin.id,
              adminEmail: admin.email,
              adminNom: admin.nom || `${admin.prenom || ''} ${admin.nom || ''}`.trim(),
              actionType,
              entityType,
              entityId,
              entityName,
              module,
              changes,
              metadata: {
                method: req.method,
                path: req.path,
                params: req.params,
                query: req.query,
              },
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.get('user-agent'),
            }).catch((err) => {
              // Ne pas faire échouer la requête si le log échoue
              console.error('Erreur audit log (non bloquant):', err)
            })
          }
        } catch (err) {
          // Ne pas faire échouer la requête si le log échoue
          console.error('Erreur audit log (non bloquant):', err)
        }
      }

      // Appeler la fonction originale
      return originalJson(data)
    }

    next()
  }
}

/**
 * Helper pour logger les connexions/déconnexions
 */
export async function logAuthAction(req, actionType, success = true, error = null) {
  try {
    const admin = req.admin || req.body
    if (admin) {
      await logAction({
        adminId: admin.id || null,
        adminEmail: admin.email || null,
        adminNom: admin.nom || `${admin.prenom || ''} ${admin.nom || ''}`.trim() || null,
        actionType,
        entityType: 'admin',
        module: 'auth',
        metadata: {
          success,
          error: error?.message || null,
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      })
    }
  } catch (err) {
    console.error('Erreur audit log auth (non bloquant):', err)
  }
}


