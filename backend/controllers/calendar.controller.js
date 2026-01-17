// backend/controllers/calendar.controller.js
import { logError, logInfo } from '../utils/logger.js'
import { supabaseFormation } from '../config/supabase.js'
import { supabaseSecretariat } from '../config/supabase.js'
import { supabaseWebinaire } from '../config/supabase.js'

/**
 * GET /api/admin/calendar/events
 * Récupère tous les événements (formations, webinaires, réunions) pour le calendrier
 * Accessible à tous les admins authentifiés
 */
export async function getCalendarEventsController(req, res) {
  try {
    const { startDate, endDate } = req.query

    const events = []

    // 1. Récupérer les sessions de formations
    try {
      let formationsQuery = supabaseFormation
        .from('sessions')
        .select(`
          id,
          date_debut,
          date_fin,
          statut,
          formations (
            id,
            titre,
            slug,
            categorie
          )
        `)
        .eq('statut', 'ouverte')
        .order('date_debut', { ascending: true })
        .limit(100)

      if (startDate) {
        formationsQuery = formationsQuery.gte('date_debut', startDate)
      }
      if (endDate) {
        formationsQuery = formationsQuery.lte('date_debut', endDate)
      }

      const { data: sessions, error: sessionsError } = await formationsQuery

      if (!sessionsError && sessions) {
        sessions.forEach((session) => {
          if (session.formations) {
            events.push({
              id: `formation-${session.id}`,
              type: 'formation',
              title: session.formations.titre || 'Formation',
              start: session.date_debut,
              end: session.date_fin || session.date_debut,
              formation_id: session.formations.id,
              session_id: session.id,
              statut: session.statut,
            })
          }
        })
      }
    } catch (err) {
      logError('Erreur récupération formations pour calendrier', err)
    }

    // 2. Récupérer les webinaires
    try {
      let webinairesQuery = supabaseWebinaire
        .from('webinaires')
        .select('id, titre, date_webinaire, heure_debut, heure_fin, statut')
        .eq('is_active', true)
        .order('date_webinaire', { ascending: true })
        .limit(100)

      if (startDate) {
        webinairesQuery = webinairesQuery.gte('date_webinaire', startDate)
      }
      if (endDate) {
        webinairesQuery = webinairesQuery.lte('date_webinaire', endDate)
      }

      const { data: webinaires, error: webinairesError } = await webinairesQuery

      if (!webinairesError && webinaires) {
        webinaires.forEach((webinaire) => {
          if (webinaire.date_webinaire) {
            // Construire la date de début complète
            const startDateTime = webinaire.date_webinaire + (webinaire.heure_debut ? `T${webinaire.heure_debut}` : 'T00:00:00')
            // Construire la date de fin (même jour si pas d'heure de fin)
            const endDateTime = webinaire.heure_fin 
              ? webinaire.date_webinaire + `T${webinaire.heure_fin}`
              : webinaire.date_webinaire + (webinaire.heure_debut ? `T${webinaire.heure_debut}` : 'T23:59:59')
            
            events.push({
              id: `webinaire-${webinaire.id}`,
              type: 'webinaire',
              title: webinaire.titre || 'Webinaire',
              start: startDateTime,
              end: endDateTime,
              webinaire_id: webinaire.id,
              statut: webinaire.statut,
            })
          }
        })
      }
    } catch (err) {
      logError('Erreur récupération webinaires pour calendrier', err)
    }

    // 3. Récupérer les réunions
    try {
      let reunionsQuery = supabaseSecretariat
        .from('reunions')
        .select('id, titre, date_reunion, heure_debut, heure_fin, statut')
        .eq('is_active', true)
        .order('date_reunion', { ascending: true })
        .limit(100)

      if (startDate) {
        reunionsQuery = reunionsQuery.gte('date_reunion', startDate)
      }
      if (endDate) {
        reunionsQuery = reunionsQuery.lte('date_reunion', endDate)
      }

      const { data: reunions, error: reunionsError } = await reunionsQuery

      if (!reunionsError && reunions) {
        reunions.forEach((reunion) => {
          if (reunion.date_reunion) {
            // Construire la date de début complète
            const startDateTime = reunion.date_reunion + (reunion.heure_debut ? `T${reunion.heure_debut}` : 'T00:00:00')
            // Construire la date de fin (même jour si pas d'heure de fin)
            const endDateTime = reunion.heure_fin 
              ? reunion.date_reunion + `T${reunion.heure_fin}`
              : reunion.date_reunion + (reunion.heure_debut ? `T${reunion.heure_debut}` : 'T23:59:59')
            
            events.push({
              id: `reunion-${reunion.id}`,
              type: 'reunion',
              title: reunion.titre || 'Réunion',
              start: startDateTime,
              end: endDateTime,
              reunion_id: reunion.id,
              statut: reunion.statut,
            })
          }
        })
      }
    } catch (err) {
      logError('Erreur récupération réunions pour calendrier', err)
    }

    logInfo('Événements calendrier récupérés', { count: events.length })

    return res.json({
      success: true,
      data: events,
    })
  } catch (err) {
    logError('getCalendarEventsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des événements',
    })
  }
}

