// backend/controllers/dashboard.controller.js
import { logError, logInfo } from '../utils/logger.js'
import { getAdhesionStats } from '../services/adhesion.service.js'
import { getFormationStats } from '../services/formation.service.js'
import { getWebinaireStats } from '../services/webinaire.service.js'
import { getTresorerieStats } from '../services/tresorerie.service.js'
import { getSecretariatStats } from '../services/secretariat.service.js'
import { getMentoratStats } from '../services/mentorat.service.js'
import { getRecrutementStats } from '../services/recrutement.service.js'

/**
 * GET /api/admin/dashboard/stats
 * Récupère toutes les statistiques de tous les modules pour le dashboard
 * Accessible à tous les admins authentifiés (pas besoin d'accès aux modules individuels)
 */
export async function getAllDashboardStatsController(req, res) {
  try {
    const stats = {
      adhesion: null,
      formation: null,
      webinaire: null,
      tresorerie: null,
      secretariat: null,
      mentorat: null,
      recrutement: null,
    }

    // Charger toutes les stats en parallèle, même si certaines échouent
    const [
      adhesionStats,
      formationStats,
      webinaireStats,
      tresorerieStats,
      secretariatStats,
      mentoratStats,
      recrutementStats,
    ] = await Promise.allSettled([
      getAdhesionStats().catch((err) => {
        logError('Erreur chargement stats adhesion pour dashboard', err)
        return null
      }),
      getFormationStats().catch((err) => {
        logError('Erreur chargement stats formation pour dashboard', err)
        return null
      }),
      getWebinaireStats().catch((err) => {
        logError('Erreur chargement stats webinaire pour dashboard', err)
        return null
      }),
      getTresorerieStats().catch((err) => {
        logError('Erreur chargement stats tresorerie pour dashboard', err)
        return null
      }),
      getSecretariatStats().catch((err) => {
        logError('Erreur chargement stats secretariat pour dashboard', err)
        return null
      }),
      getMentoratStats().catch((err) => {
        logError('Erreur chargement stats mentorat pour dashboard', err)
        return null
      }),
      getRecrutementStats().catch((err) => {
        logError('Erreur chargement stats recrutement pour dashboard', err)
        return null
      }),
    ])

    // Extraire les valeurs des promesses résolues
    stats.adhesion = adhesionStats.status === 'fulfilled' ? adhesionStats.value : null
    stats.formation = formationStats.status === 'fulfilled' ? formationStats.value : null
    stats.webinaire = webinaireStats.status === 'fulfilled' ? webinaireStats.value : null
    stats.tresorerie = tresorerieStats.status === 'fulfilled' ? tresorerieStats.value : null
    stats.secretariat = secretariatStats.status === 'fulfilled' ? secretariatStats.value : null
    stats.mentorat = mentoratStats.status === 'fulfilled' ? mentoratStats.value : null
    stats.recrutement = recrutementStats.status === 'fulfilled' ? recrutementStats.value : null

    logInfo('Stats dashboard chargées', {
      adhesion: stats.adhesion !== null,
      formation: stats.formation !== null,
      webinaire: stats.webinaire !== null,
      tresorerie: stats.tresorerie !== null,
      secretariat: stats.secretariat !== null,
      mentorat: stats.mentorat !== null,
      recrutement: stats.recrutement !== null,
    })

    return res.json({
      success: true,
      data: stats,
    })
  } catch (err) {
    logError('getAllDashboardStatsController error', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération des statistiques',
    })
  }
}

