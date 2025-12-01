// backend/services/secretariat.rapports.service.js
import { supabaseSecretariat, supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo, logWarning } from '../utils/logger.js'
import PDFDocument from 'pdfkit'

/**
 * Génère un rapport pour la présidence (mensuel ou annuel)
 */
export async function generateRapportPresidence({
  periode_type,
  periode_debut,
  periode_fin,
  options = {},
  genere_par,
}) {
  try {
    logInfo('Génération rapport présidence', { periode_type, periode_debut, periode_fin })

    // Calculer les statistiques
    const stats = await calculateRapportStats(periode_debut, periode_fin, options)

    // Générer le PDF
    const pdfBuffer = await generateRapportPDF(stats, {
      periode_type,
      periode_debut,
      periode_fin,
      options,
    })

    // Uploader sur Supabase Storage (ou Google Drive selon votre config)
    const lienPdf = await uploadRapportPDF(pdfBuffer, periode_type, periode_debut, periode_fin)

    // Enregistrer dans la base de données
    const { data, error } = await supabaseSecretariat
      .from('rapports_presidence')
      .insert({
        periode_type,
        periode_debut,
        periode_fin,
        resume: stats.resume,
        lien_pdf: lienPdf,
        genere_par,
      })
      .select()
      .single()

    if (error) {
      logError('Erreur sauvegarde rapport', error)
      throw new Error('Erreur lors de la sauvegarde du rapport')
    }

    logInfo('Rapport présidence généré avec succès', { id: data.id, lienPdf })

    return {
      ...data,
      stats,
    }
  } catch (err) {
    logError('generateRapportPresidence exception', err)
    throw err
  }
}

/**
 * Calcule les statistiques pour le rapport
 */
async function calculateRapportStats(periode_debut, periode_fin, options) {
  const stats = {
    nb_reunions: 0,
    reunions_par_type: {},
    taux_participation: 0,
    actions_en_cours: 0,
    actions_terminees: 0,
    actions_en_retard: 0,
    documents_ajoutes: 0,
    resume: '',
  }

  try {
    // Réunions dans la période
    const { data: reunions, error: reunionsError } = await supabaseSecretariat
      .from('reunions')
      .select('*')
      .gte('date_reunion', periode_debut)
      .lte('date_reunion', periode_fin)

    if (!reunionsError && reunions) {
      stats.nb_reunions = reunions.length

      // Répartition par type
      reunions.forEach(r => {
        const type = r.type_reunion || 'autre'
        stats.reunions_par_type[type] = (stats.reunions_par_type[type] || 0) + 1
      })
    }

    // Participants et taux de participation
    if (options.include_participation && reunions) {
      const reunionIds = reunions.map(r => r.id)
      if (reunionIds.length > 0) {
        const { data: participants } = await supabaseSecretariat
          .from('participants_reunion')
          .select('presence')
          .in('reunion_id', reunionIds)

        if (participants) {
          const totalInvites = participants.length
          const presents = participants.filter(p => p.presence === 'present').length
          stats.taux_participation = totalInvites > 0 
            ? Math.round((presents / totalInvites) * 100) 
            : 0
        }
      }
    }

    // Actions
    if (options.include_actions) {
      const { data: actions } = await supabaseSecretariat
        .from('actions')
        .select('statut, deadline')
        .gte('created_at', periode_debut)
        .lte('created_at', periode_fin)

      if (actions) {
        const today = new Date().toISOString().split('T')[0]
        actions.forEach(action => {
          if (action.statut === 'termine') {
            stats.actions_terminees++
          } else if (action.statut === 'en_cours') {
            stats.actions_en_cours++
            if (action.deadline && action.deadline < today) {
              stats.actions_en_retard++
            }
          }
        })
      }
    }

    // Documents
    if (options.include_documents) {
      const { count } = await supabaseSecretariat
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', periode_debut)
        .lte('created_at', periode_fin)

      stats.documents_ajoutes = count || 0
    }

    // Générer résumé textuel
    stats.resume = generateResumeText(stats, periode_debut, periode_fin)

    return stats
  } catch (err) {
    logError('Erreur calcul statistiques rapport', err)
    throw err
  }
}

/**
 * Génère le texte de résumé
 */
function generateResumeText(stats, periode_debut, periode_fin) {
  const lines = []
  lines.push(`Rapport de la période du ${new Date(periode_debut).toLocaleDateString('fr-FR')} au ${new Date(periode_fin).toLocaleDateString('fr-FR')}`)
  lines.push('')
  lines.push(`Nombre de réunions: ${stats.nb_reunions}`)
  if (stats.taux_participation > 0) {
    lines.push(`Taux de participation moyen: ${stats.taux_participation}%`)
  }
  if (stats.actions_en_cours > 0) {
    lines.push(`Actions en cours: ${stats.actions_en_cours}`)
  }
  if (stats.actions_terminees > 0) {
    lines.push(`Actions terminées: ${stats.actions_terminees}`)
  }
  if (stats.actions_en_retard > 0) {
    lines.push(`Actions en retard: ${stats.actions_en_retard}`)
  }
  if (stats.documents_ajoutes > 0) {
    lines.push(`Documents ajoutés: ${stats.documents_ajoutes}`)
  }
  return lines.join('\n')
}

/**
 * Génère le PDF du rapport
 */
async function generateRapportPDF(stats, { periode_type, periode_debut, periode_fin, options }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50
    })
    
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    doc.on('error', reject)

    // En-tête
    doc.fontSize(24)
      .fillColor('#0d47a1')
      .font('Helvetica-Bold')
      .text('RAPPORT PRÉSIDENCE', { align: 'center' })
    
    doc.moveDown(0.5)
    doc.fontSize(14)
      .fillColor('#475569')
      .font('Helvetica')
      .text(
        `Période: ${new Date(periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periode_fin).toLocaleDateString('fr-FR')}`,
        { align: 'center' }
      )
    
    doc.moveDown(1.5)

    // Statistiques réunions
    if (options.include_statistiques_reunions) {
      doc.fontSize(16)
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .text('Réunions', { underline: true })
      
      doc.moveDown(0.5)
      doc.fontSize(12)
        .font('Helvetica')
        .text(`Nombre total de réunions: ${stats.nb_reunions}`)
      
      if (Object.keys(stats.reunions_par_type).length > 0) {
        doc.moveDown(0.3)
        doc.text('Répartition par type:')
        Object.entries(stats.reunions_par_type).forEach(([type, count]) => {
          doc.text(`  • ${type}: ${count}`, { indent: 20 })
        })
      }
      
      doc.moveDown(1)
    }

    // Participation
    if (options.include_participation && stats.taux_participation > 0) {
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text('Participation', { underline: true })
      
      doc.moveDown(0.5)
      doc.fontSize(12)
        .font('Helvetica')
        .text(`Taux de participation moyen: ${stats.taux_participation}%`)
      
      doc.moveDown(1)
    }

    // Actions
    if (options.include_actions) {
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text('Actions', { underline: true })
      
      doc.moveDown(0.5)
      doc.fontSize(12)
        .font('Helvetica')
        .text(`Actions en cours: ${stats.actions_en_cours}`)
        .text(`Actions terminées: ${stats.actions_terminees}`)
      if (stats.actions_en_retard > 0) {
        doc.fillColor('#dc2626')
          .text(`Actions en retard: ${stats.actions_en_retard}`)
        doc.fillColor('#1e293b')
      }
      
      doc.moveDown(1)
    }

    // Documents
    if (options.include_documents && stats.documents_ajoutes > 0) {
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text('Documents', { underline: true })
      
      doc.moveDown(0.5)
      doc.fontSize(12)
        .font('Helvetica')
        .text(`Documents ajoutés: ${stats.documents_ajoutes}`)
      
      doc.moveDown(1)
    }

    // Résumé
    if (stats.resume) {
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text('Résumé', { underline: true })
      
      doc.moveDown(0.5)
      doc.fontSize(11)
        .font('Helvetica')
        .text(stats.resume, { align: 'left' })
    }

    // Pied de page
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(8)
        .fillColor('#666666')
        .font('Helvetica')
        .text(
          `Page ${i + 1} sur ${pageCount} - ASGF - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        )
    }

    doc.end()
  })
}

/**
 * Upload le PDF du rapport (à adapter selon votre système de stockage)
 */
async function uploadRapportPDF(pdfBuffer, periode_type, periode_debut, periode_fin) {
  // TODO: Implémenter l'upload vers Supabase Storage ou Google Drive
  // Pour l'instant, retourner une URL temporaire
  logWarning('Upload rapport PDF non implémenté, retour URL temporaire')
  
  // En production, utiliser Supabase Storage:
  // const fileName = `rapport-presidence-${periode_type}-${periode_debut}-${periode_fin}.pdf`
  // const { data, error } = await supabaseStorage
  //   .from('rapports')
  //   .upload(fileName, pdfBuffer, { contentType: 'application/pdf' })
  
  return `https://example.com/rapports/${Date.now()}.pdf`
}

/**
 * Récupère les rapports présidence
 */
export async function getRapportsPresidence({ page = 1, limit = 20 } = {}) {
  try {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabaseSecretariat
      .from('rapports_presidence')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      logError('getRapportsPresidence error', error)
      throw new Error('Erreur lors de la récupération des rapports')
    }

    return {
      rapports: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getRapportsPresidence exception', err)
    throw err
  }
}





