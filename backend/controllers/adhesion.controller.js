// backend/controllers/adhesion.controller.js
import {
  getAllMembers,
  getPendingMembers,
  approveMember,
  rejectMember,
  getAdhesionStats,
  updateMember,
  deleteMember,
} from '../services/adhesion.service.js'
import { validateId, validatePagination, isValidEmail } from '../utils/validators.js'
import { logError, logInfo, logWarning } from '../utils/logger.js'
import { notifyMemberEmail } from '../services/notifications.service.js'
import { logAction, ACTION_TYPES, ENTITY_TYPES } from '../services/audit.service.js'
import { supabaseAdhesion } from '../config/supabase.js'

/**
 * GET /api/adhesion/members
 * Récupère tous les membres avec pagination et filtres
 */
export async function listMembersController(req, res) {
  try {
    const pagination = validatePagination(req.query)
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: pagination.errors,
      })
    }

    const result = await getAllMembers({
      ...pagination.data,
      search: req.query.search || '',
      status: req.query.status || '',
    })

    return res.json({
      success: true,
      data: result.members,
      pagination: result.pagination,
    })
  } catch (err) {
    logError('listMembersController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des membres',
    })
  }
}

/**
 * GET /api/adhesion/members/pending
 * Récupère les membres en attente de validation
 */
export async function getPendingMembersController(req, res) {
  try {
    const members = await getPendingMembers()
    return res.json({
      success: true,
      data: members,
    })
  } catch (err) {
    logError('getPendingMembersController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des membres en attente',
    })
  }
}

/**
 * POST /api/adhesion/members/:id/approve
 * Approuve un membre
 */
export async function approveMemberController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    const member = await approveMember(req.params.id, adminId)
    
    // Logger l'action dans l'audit log
    if (req.admin) {
      logAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        adminNom: req.admin.nom || `${req.admin.prenom || ''} ${req.admin.nom || ''}`.trim(),
        actionType: ACTION_TYPES.APPROVE,
        entityType: ENTITY_TYPES.MEMBER,
        entityId: req.params.id,
        entityName: `${member.prenom || ''} ${member.nom || ''}`.trim() || member.email,
        module: 'adhesions',
        metadata: { email: member.email },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      }).catch(err => console.error('Erreur audit log (non bloquant):', err))
    }
    
    return res.json({
      success: true,
      message: 'Membre approuvé avec succès',
      data: member,
    })
  } catch (err) {
    logError('approveMemberController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la validation du membre',
    })
  }
}

/**
 * POST /api/adhesion/members/:id/reject
 * Rejette un membre
 */
export async function rejectMemberController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    const member = await rejectMember(req.params.id, adminId)
    
    // Logger l'action dans l'audit log
    if (req.admin) {
      logAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        adminNom: req.admin.nom || `${req.admin.prenom || ''} ${req.admin.nom || ''}`.trim(),
        actionType: ACTION_TYPES.REJECT,
        entityType: ENTITY_TYPES.MEMBER,
        entityId: req.params.id,
        entityName: `${member.prenom || ''} ${member.nom || ''}`.trim() || member.email,
        module: 'adhesions',
        metadata: { email: member.email },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      }).catch(err => console.error('Erreur audit log (non bloquant):', err))
    }
    
    return res.json({
      success: true,
      message: 'Membre rejeté avec succès',
      data: member,
    })
  } catch (err) {
    logError('rejectMemberController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors du rejet du membre',
    })
  }
}

/**
 * GET /api/adhesion/stats
 * Récupère les statistiques d'adhésion
 */
export async function getAdhesionStatsController(req, res) {
  try {
    const stats = await getAdhesionStats()
    return res.json({
      success: true,
      data: stats,
    })
  } catch (err) {
    logError('getAdhesionStatsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des statistiques',
    })
  }
}

/**
 * POST /api/adhesion/members/email
 * Envoie un email à un ou plusieurs membres
 */
export async function sendMemberEmailController(req, res) {
  try {
    const { member_ids: memberIds = [], subject, body, attachments = [] } = req.body || {}

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Sujet et contenu du message sont requis',
      })
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun membre sélectionné pour lenvoi',
      })
    }

    // Récupérer les membres concernés via le service
    logInfo('sendMemberEmailController: IDs reçus', { memberIds, count: memberIds.length })
    
    const { members } = await getAllMembers({
      page: 1,
      limit: memberIds.length * 2, // Limite plus large pour être sûr
      search: '',
      status: '',
      ids: memberIds,
    })

    logInfo('sendMemberEmailController: Membres récupérés', { 
      count: members?.length || 0,
      emails: members?.map(m => m.email) || []
    })

    const recipients = (members || [])
      .filter((m) => {
        if (!m.email) {
          logWarning('Membre sans email ignoré', { id: m.id, prenom: m.prenom, nom: m.nom })
          return false
        }
        return true
      })
      .map((m) => ({
        email: m.email,
        prenom: m.prenom || '',
        nom: m.nom || '',
        numero_membre: m.numero_membre || '',
        pays: m.pays || '',
      }))

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'Aucun des membres sélectionnés ne possède une adresse email',
      })
    }

    logInfo('sendMemberEmailController: Destinataires finaux', { 
      count: recipients.length,
      emails: recipients.map(r => r.email)
    })

    // Valider et nettoyer les pièces jointes
    const validAttachments = (attachments || []).filter((att) => {
      if (!att.name || !att.data || !att.type) {
        logWarning('Pièce jointe invalide ignorée', { att })
        return false
      }
      // Vérifier que les données base64 sont valides (pas vides, pas trop grandes)
      if (att.data.length === 0 || att.data.length > 10 * 1024 * 1024) { // Max 10MB en base64
        logWarning('Pièce jointe avec données invalides ignorée', { name: att.name, dataLength: att.data.length })
        return false
      }
      return true
    }).map((att) => ({
      name: att.name,
      data: att.data,
      type: att.type,
    }))

    logInfo('sendMemberEmailController: Pièces jointes validées', {
      count: validAttachments.length,
      totalDataSize: validAttachments.reduce((sum, a) => sum + (a.data?.length || 0), 0),
      attachments: validAttachments.map(a => ({ 
        name: a.name, 
        type: a.type, 
        dataLength: a.data?.length || 0,
        dataPreview: a.data ? a.data.substring(0, 30) + '...' : 'MANQUANT'
      }))
    })

    const payload = {
      recipients,
      subject,
      bodyTemplate: body,
      attachments: validAttachments,
    }

    logInfo('sendMemberEmailController: Payload préparé pour Apps Script', {
      recipientsCount: payload.recipients.length,
      subject: payload.subject,
      bodyTemplateLength: payload.bodyTemplate.length,
      attachmentsCount: payload.attachments.length,
      payloadSize: JSON.stringify(payload).length,
    })

    const emailResult = await notifyMemberEmail(payload)
    
    // notifyMemberEmail retourne maintenant un objet { success, message, errors? }
    if (!emailResult || !emailResult.success) {
      // Extraire les erreurs d'autorisation si présentes
      const errorMessage = emailResult?.message || "Erreur lors de l'envoi des emails via Google Apps Script"
      const errors = emailResult?.errors || []
      
      // Construire un message d'erreur détaillé
      let detailedMessage = errorMessage
      if (errors.length > 0) {
        const authErrors = errors.filter(e => 
          e.includes('autorisation') || 
          e.includes('authorization') || 
          e.includes('MailApp.sendEmail') || 
          e.includes('script.send_mail')
        )
        if (authErrors.length > 0) {
          detailedMessage = `Erreur d'autorisation Google Apps Script : ${authErrors[0]}`
        } else {
          detailedMessage = `${errorMessage}\n\nDétails : ${errors.join(', ')}`
        }
      }
      
      return res.status(500).json({
        success: false,
        message: detailedMessage,
        errors: errors
      })
    }

    return res.json({
      success: true,
      message: emailResult.message || `Email envoyé à ${recipients.length} membre(s)`,
    })
  } catch (err) {
    logError('sendMemberEmailController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || "Erreur lors de l'envoi des emails membres",
    })
  }
}

/**
 * PUT /api/adhesion/members/:id
 * Met à jour un membre
 */
export async function updateMemberController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    const memberData = req.body || {}
    
    // Validation basique des données
    if (memberData.email && !isValidEmail(memberData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide',
      })
    }

    // Récupérer les données avant modification pour le log
    const { data: oldMember, error: fetchError } = await supabaseAdhesion
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .single()
    
    if (fetchError) {
      logWarning('Impossible de récupérer le membre avant modification', { id: req.params.id, error: fetchError })
    }
    
    const member = await updateMember(req.params.id, memberData)
    
    // Logger l'action dans l'audit log
    if (req.admin) {
      logAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        adminNom: req.admin.nom || `${req.admin.prenom || ''} ${req.admin.nom || ''}`.trim(),
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.MEMBER,
        entityId: req.params.id,
        entityName: `${member.prenom || ''} ${member.nom || ''}`.trim() || member.email,
        module: 'members',
        changes: oldMember ? { before: oldMember, after: member } : null,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      }).catch(err => console.error('Erreur audit log (non bloquant):', err))
    }
    
    return res.json({
      success: true,
      message: 'Membre mis à jour avec succès',
      data: member,
    })
  } catch (err) {
    logError('updateMemberController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la mise à jour du membre',
    })
  }
}

/**
 * DELETE /api/adhesion/members/:id
 * Supprime un membre
 */
export async function deleteMemberController(req, res) {
  try {
    const idValidation = validateId(req.params.id)
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: idValidation.errors,
      })
    }

    const adminId = req.admin?.id
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      })
    }

    // Récupérer les données avant suppression pour le log
    const { data: oldMember, error: fetchError } = await supabaseAdhesion
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .single()
    
    if (fetchError) {
      logWarning('Impossible de récupérer le membre avant suppression', { id: req.params.id, error: fetchError })
    }
    
    const member = await deleteMember(req.params.id)
    
    // Logger l'action dans l'audit log
    if (req.admin) {
      logAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        adminNom: req.admin.nom || `${req.admin.prenom || ''} ${req.admin.nom || ''}`.trim(),
        actionType: ACTION_TYPES.DELETE,
        entityType: ENTITY_TYPES.MEMBER,
        entityId: req.params.id,
        entityName: oldMember ? `${oldMember.prenom || ''} ${oldMember.nom || ''}`.trim() || oldMember.email : 'Membre supprimé',
        module: 'members',
        changes: oldMember ? { deleted: oldMember } : null,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      }).catch(err => console.error('Erreur audit log (non bloquant):', err))
    }
    
    return res.json({
      success: true,
      message: 'Membre supprimé avec succès',
      data: member,
    })
  } catch (err) {
    logError('deleteMemberController error', err)
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression du membre',
    })
  }
}
