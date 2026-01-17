// backend/controllers/public.controller.js
import { createInscription } from '../services/formation.service.js'
import { notifyFormationInscription } from '../services/notifications.service.js'
import { createInscription as createWebinaireInscription } from '../services/webinaire.service.js'
import { logError } from '../utils/logger.js'
import { getFormationEmailContext } from '../utils/formationEmailContext.js'

export async function publicCreateFormationInscription(req, res) {
  try {
    const { prenom, nom, email, formation_id, niveau } = req.body || {}

    if (!prenom || !nom || !email || !formation_id || !niveau) {
      return res.status(400).json({
        success: false,
        message: 'prenom, nom, email, formation_id et niveau sont requis',
      })
    }

    const inscription = await createInscription(req.body)

    const context = await getFormationEmailContext(
      inscription.formation_id,
      inscription.session_id
    )

    await notifyFormationInscription({
      prenom: inscription.prenom,
      nom: inscription.nom,
      email: inscription.email,
      formation_title: context.formationTitle,
      formation_mode: context.formationMode,
      formation_slug: context.formationSlug,
      session_date: context.sessionDate,
      niveau: inscription.niveau,
    })

    return res.status(201).json({
      success: true,
      message: 'Inscription enregistrée. Vous recevrez une confirmation par email.',
      data: inscription,
    })
  } catch (err) {
    logError('publicCreateFormationInscription error', err)
    return res.status(400).json({
      success: false,
      message: err.message || "Impossible d'enregistrer l'inscription",
    })
  }
}

export async function publicCreateWebinaireInscription(req, res) {
  try {
    const { prenom, nom, email, webinaire_id, pays, whatsapp } = req.body || {}

    if (!prenom || !nom || !email || !webinaire_id) {
      return res.status(400).json({
        success: false,
        message: 'prenom, nom, email et webinaire_id sont requis',
      })
    }

    const inscription = await createWebinaireInscription({
      prenom,
      nom,
      email,
      webinaire_id,
      pays: pays || 'France',
      whatsapp: whatsapp || null,
      statut: 'pending',
      source: 'site web',
    })

    return res.status(201).json({
      success: true,
      message: 'Inscription enregistrée. Vous recevrez une confirmation par email.',
      data: inscription,
    })
  } catch (err) {
    logError('publicCreateWebinaireInscription error', err)
    return res.status(400).json({
      success: false,
      message: err.message || "Impossible d'enregistrer l'inscription",
    })
  }
}

