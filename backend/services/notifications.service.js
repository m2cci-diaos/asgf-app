// backend/services/notifications.service.js
import fetch from 'node-fetch'
import { logError, logInfo, logWarning } from '../utils/logger.js'

const APPSCRIPT_WEBHOOK_URL = process.env.APPSCRIPT_CONTACT_WEBHOOK_URL || ''
const APPSCRIPT_WEBHOOK_TOKEN = process.env.APPSCRIPT_CONTACT_TOKEN || ''

const EVENT_TYPES = {
  CONTACT_MESSAGE: 'contact_message',
  FORMATION_INSCRIPTION: 'formation_inscription',
  FORMATION_STATUS: 'formation_status',
  FORMATION_INVITATION: 'formation_invitation',
  FORMATION_REMINDER: 'formation_reminder',
  WEBINAIRE_INVITATION: 'webinaire_invitation',
  WEBINAIRE_REMINDER: 'webinaire_reminder',
  MEMBER_EMAIL: 'member_email',
}

async function sendAppsScriptEvent(payload, logContext = '') {
  if (!APPSCRIPT_WEBHOOK_URL) {
    logWarning('Apps Script webhook non configuré, envoi ignoré', { logContext })
    return {
      success: false,
      message: 'Apps Script webhook non configuré',
      errors: []
    }
  }

  try {
    const requestBody = {
      ...payload,
      token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
    }

    const jsonBody = JSON.stringify(requestBody)
    const bodySizeKB = (jsonBody.length / 1024).toFixed(2)
    
    logInfo('sendAppsScriptEvent: Préparation requête', {
      logContext,
      url: APPSCRIPT_WEBHOOK_URL,
      payloadSize: `${bodySizeKB} KB`,
      payloadKeys: Object.keys(payload),
      attachmentsCount: payload.attachments?.length || 0,
      attachmentsTotalSize: payload.attachments?.reduce((sum, a) => sum + (a.data?.length || 0), 0) || 0,
    })

    const response = await fetch(APPSCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(APPSCRIPT_WEBHOOK_TOKEN && { 'x-contact-token': APPSCRIPT_WEBHOOK_TOKEN }),
      },
      body: jsonBody,
    })

    // Lire la réponse (texte ou JSON)
    const responseText = await response.text()
    
    if (!response.ok) {
      logError('Apps Script webhook a renvoyé une erreur', {
        status: response.status,
        body: responseText,
        logContext,
      })
      return {
        success: false,
        message: `Erreur HTTP ${response.status} lors de l'appel au script Google Apps Script`,
        errors: [responseText.substring(0, 200)]
      }
    }

    // Essayer de parser la réponse en JSON
    try {
      const responseData = JSON.parse(responseText)
      logInfo('Notification Apps Script envoyée', { 
        logContext,
        success: responseData.success,
        message: responseData.message,
        successCount: responseData.successCount,
        errorCount: responseData.errorCount,
        attachmentsProcessed: responseData.attachmentsProcessed,
        totalRecipients: responseData.totalRecipients
      })
      
      if (!responseData.success) {
        logWarning('Apps Script a renvoyé success=false', {
          logContext,
          message: responseData.message,
          errors: responseData.errors
        })
        // Retourner un objet avec les informations d'erreur
        return {
          success: false,
          message: responseData.message || "Erreur lors de l'envoi via Google Apps Script",
          errors: responseData.errors || []
        }
      }
    } catch (parseErr) {
      // Réponse non-JSON, loguer le texte
      logInfo('Notification Apps Script envoyée (réponse non-JSON)', { 
        logContext,
        responseText: responseText.substring(0, 200)
      })
      // Si la réponse n'est pas JSON mais que le statut HTTP est OK, considérer comme succès
      return {
        success: true,
        message: 'Notification envoyée (réponse non-JSON)'
      }
    }
    
    return {
      success: true,
      message: 'Notification envoyée avec succès'
    }
  } catch (err) {
    logError('Erreur lors de la notification Apps Script', { err, logContext })
    return {
      success: false,
      message: err.message || 'Erreur lors de la communication avec Google Apps Script',
      errors: [err.message || 'Erreur inconnue']
    }
  }
}

export async function notifyContactMessage(data) {
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.CONTACT_MESSAGE,
      ...data,
    },
    'contact_message'
  )
}

export async function notifyFormationInscription(data) {
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.FORMATION_INSCRIPTION,
      ...data,
    },
    'formation_inscription'
  )
}

export async function notifyFormationStatus(data) {
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.FORMATION_STATUS,
      ...data,
    },
    `formation_status_${data.status || 'unknown'}`
  )
}

export async function notifyFormationInvitation(data) {
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.FORMATION_INVITATION,
      ...data,
    },
    'formation_invitation'
  )
}

export async function notifyFormationReminder(data) {
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.FORMATION_REMINDER,
      ...data,
    },
    `formation_reminder_${data.kind || 'generic'}`
  )
}

export async function notifyWebinaireInvitation(data) {
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.WEBINAIRE_INVITATION,
      ...data,
    },
    'webinaire_invitation'
  )
}

export async function notifyWebinaireReminder(data) {
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.WEBINAIRE_REMINDER,
      ...data,
    },
    `webinaire_reminder_${data.kind || 'generic'}`
  )
}

export async function notifyMemberEmail(data) {
  // Les attachments sont déjà dans data, on les transmet tels quels
  return sendAppsScriptEvent(
    {
      type: EVENT_TYPES.MEMBER_EMAIL,
      ...data,
    },
    'member_email'
  )
}


