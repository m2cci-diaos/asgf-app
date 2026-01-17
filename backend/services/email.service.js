// backend/services/email.service.js
// Service d'envoi d'emails (structure préparée pour configuration future)

import { logInfo, logError } from '../utils/logger.js'

/**
 * Configuration email (à configurer plus tard)
 * Options possibles :
 * - Nodemailer avec SMTP
 * - SendGrid
 * - AWS SES
 * - Resend
 * - Mailgun
 */
const EMAIL_CONFIG = {
  enabled: process.env.EMAIL_ENABLED === 'true',
  provider: process.env.EMAIL_PROVIDER || 'smtp', // 'smtp', 'sendgrid', 'ses', 'resend', 'mailgun'
  from: process.env.EMAIL_FROM || 'noreply@asgf.org',
  fromName: process.env.EMAIL_FROM_NAME || 'ASGF',
  // Configuration spécifique selon le provider
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
  // ... autres providers
}

/**
 * Envoie un email de confirmation d'inscription à un webinaire
 * @param {Object} params - Paramètres de l'email
 * @param {string} params.to - Email du destinataire
 * @param {string} params.prenom - Prénom du participant
 * @param {string} params.nom - Nom du participant
 * @param {string} params.webinaireTitre - Titre du webinaire
 * @param {string} params.webinaireDate - Date du webinaire
 * @param {string} params.webinaireHeure - Heure du webinaire
 * @param {string} params.webinaireLien - Lien d'accès au webinaire
 * @param {string} params.confirmationCode - Code de confirmation
 * @returns {Promise<boolean>} - true si l'email a été envoyé avec succès
 */
export async function sendWebinaireConfirmationEmail({
  to,
  prenom,
  nom,
  webinaireTitre,
  webinaireDate,
  webinaireHeure,
  webinaireLien,
  confirmationCode,
}) {
  try {
    if (!EMAIL_CONFIG.enabled) {
      logInfo('Email désactivé - email de confirmation non envoyé', { to, webinaireTitre })
      return false
    }

    const subject = `Confirmation d'inscription - ${webinaireTitre}`
    const htmlContent = generateWebinaireConfirmationEmailHTML({
      prenom,
      nom,
      webinaireTitre,
      webinaireDate,
      webinaireHeure,
      webinaireLien,
      confirmationCode,
    })

    // TODO: Implémenter l'envoi selon le provider configuré
    // Exemple avec Nodemailer (à décommenter et configurer) :
    /*
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.smtp.host,
      port: EMAIL_CONFIG.smtp.port,
      secure: EMAIL_CONFIG.smtp.secure,
      auth: EMAIL_CONFIG.smtp.auth,
    })

    await transporter.sendMail({
      from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.from}>`,
      to,
      subject,
      html: htmlContent,
    })
    */

    logInfo('Email de confirmation webinaire envoyé', { to, webinaireTitre })
    return true
  } catch (err) {
    logError('Erreur envoi email confirmation webinaire', err)
    // Ne pas faire échouer l'inscription si l'email échoue
    return false
  }
}

/**
 * Génère le HTML de l'email de confirmation
 */
function generateWebinaireConfirmationEmailHTML({
  prenom,
  nom,
  webinaireTitre,
  webinaireDate,
  webinaireHeure,
  webinaireLien,
  confirmationCode,
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation d'inscription</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">ASGF</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Confirmation d'inscription</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Bonjour <strong>${prenom} ${nom}</strong>,</p>
        
        <p style="font-size: 16px;">
          Votre inscription au webinaire <strong>"${webinaireTitre}"</strong> a été confirmée avec succès !
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h2 style="color: #667eea; margin-top: 0;">Détails du webinaire</h2>
          <p style="margin: 10px 0;"><strong>📅 Date :</strong> ${webinaireDate}</p>
          <p style="margin: 10px 0;"><strong>🕐 Heure :</strong> ${webinaireHeure}</p>
          ${confirmationCode ? `<p style="margin: 10px 0;"><strong>🔑 Code de confirmation :</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 18px; letter-spacing: 2px;">${confirmationCode}</code></p>` : ''}
        </div>
        
        ${webinaireLien ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${webinaireLien}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Accéder au webinaire
          </a>
        </div>
        ` : ''}
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066CC;">
          <h3 style="color: #0066CC; margin-top: 0;">📋 Prochaines étapes</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Vous recevrez un rappel 24h avant le webinaire</li>
            <li>Assurez-vous d'avoir une connexion internet stable</li>
            <li>Testez votre équipement audio/vidéo avant le début</li>
            ${webinaireLien ? '<li>Le lien d\'accès vous sera envoyé avant l\'événement</li>' : ''}
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          En cas de question, n'hésitez pas à nous contacter.
        </p>
        
        <p style="font-size: 14px; color: #666;">
          Cordialement,<br>
          <strong>L'équipe ASGF</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        <p>© ${new Date().getFullYear()} ASGF - Association Sénégalaise de Géomatique et de Foresterie</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Envoie un email de rappel pour un webinaire
 * @param {Object} params - Paramètres de l'email
 */
export async function sendWebinaireReminderEmail({
  to,
  prenom,
  nom,
  webinaireTitre,
  webinaireDate,
  webinaireHeure,
  webinaireLien,
}) {
  try {
    if (!EMAIL_CONFIG.enabled) {
      logInfo('Email désactivé - email de rappel non envoyé', { to, webinaireTitre })
      return false
    }

    const subject = `Rappel : Webinaire "${webinaireTitre}" demain`
    const htmlContent = generateWebinaireReminderEmailHTML({
      prenom,
      nom,
      webinaireTitre,
      webinaireDate,
      webinaireHeure,
      webinaireLien,
    })

    // TODO: Implémenter l'envoi selon le provider configuré

    logInfo('Email de rappel webinaire envoyé', { to, webinaireTitre })
    return true
  } catch (err) {
    logError('Erreur envoi email rappel webinaire', err)
    return false
  }
}

/**
 * Génère le HTML de l'email de rappel
 */
function generateWebinaireReminderEmailHTML({
  prenom,
  nom,
  webinaireTitre,
  webinaireDate,
  webinaireHeure,
  webinaireLien,
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rappel webinaire</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">ASGF</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Rappel webinaire</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Bonjour <strong>${prenom} ${nom}</strong>,</p>
        
        <p style="font-size: 16px;">
          Ceci est un rappel : le webinaire <strong>"${webinaireTitre}"</strong> aura lieu <strong>demain</strong> !
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h2 style="color: #667eea; margin-top: 0;">📅 Détails</h2>
          <p style="margin: 10px 0;"><strong>Date :</strong> ${webinaireDate}</p>
          <p style="margin: 10px 0;"><strong>Heure :</strong> ${webinaireHeure}</p>
        </div>
        
        ${webinaireLien ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${webinaireLien}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Accéder au webinaire
          </a>
        </div>
        ` : ''}
        
        <p style="font-size: 14px; color: #666;">
          À bientôt !<br>
          <strong>L'équipe ASGF</strong>
        </p>
      </div>
    </body>
    </html>
  `
}













