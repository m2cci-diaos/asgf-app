// backend/services/recrutement.service.js
import { supabaseRecrutement, supabaseAdhesion, supabaseMentorat } from '../config/supabase.js'
import { createClient } from '@supabase/supabase-js'
import { logError, logInfo, logWarning } from '../utils/logger.js'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// Client Supabase pour le Storage (sans schéma spécifique car le storage est global)
// Utiliser le même client que supabaseRecrutement mais sans spécifier de schéma pour le storage
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE
const supabaseStorage = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// ========== CANDIDATURES ==========

/**
 * Récupère toutes les candidatures avec pagination et filtres
 */
export async function getAllCandidatures({ page = 1, limit = 20, search = '', statut = '', type_contrat = '' }) {
  try {
    let query = supabaseRecrutement
      .from('candidatures')
      .select('*', { count: 'exact' })
      .order('date_candidature', { ascending: false })

    // Recherche par titre de poste ou entreprise
    if (search) {
      query = query.or(`titre_poste.ilike.%${search}%,entreprise.ilike.%${search}%`)
    }

    // Filtre par statut
    if (statut) {
      query = query.eq('statut', statut)
    }

    // Filtre par type de contrat
    if (type_contrat) {
      query = query.eq('type_contrat', type_contrat)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: candidatures, error, count } = await query

    if (error) {
      logError('getAllCandidatures error', { error, details: error.message, code: error.code, hint: error.hint })
      throw new Error(`Erreur lors de la récupération des candidatures: ${error.message || 'Erreur inconnue'}`)
    }

    logInfo('getAllCandidatures: Candidatures récupérées', { count: candidatures?.length || 0, total: count || 0 })

    if (!candidatures || candidatures.length === 0) {
      return {
        candidatures: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir les candidatures avec les données des membres et le nombre de suivis
    const candidaturesWithStats = await Promise.all(
      candidatures.map(async (candidature) => {
        try {
          // Récupérer le membre
          let membre = null
          if (candidature.membre_id) {
            try {
              const { data: membreData, error: membreError } = await supabaseAdhesion
                .from('members')
                .select('id, prenom, nom, email, telephone, numero_membre')
                .eq('id', candidature.membre_id)
                .maybeSingle()
              
              if (membreError) {
                logError('getAllCandidatures: Erreur récupération membre', { candidatureId: candidature.id, membreId: candidature.membre_id, error: membreError })
              } else {
                membre = membreData
              }
            } catch (err) {
              logError('getAllCandidatures: Exception récupération membre', { candidatureId: candidature.id, error: err })
            }
          }

          // Récupérer le nombre de suivis
          let suivisCount = 0
          try {
            const { count, error: suivisError } = await supabaseRecrutement
              .from('suivi_candidatures')
              .select('*', { count: 'exact', head: true })
              .eq('candidature_id', candidature.id)
            
            if (suivisError) {
              logError('getAllCandidatures: Erreur récupération suivis', { candidatureId: candidature.id, error: suivisError })
            } else {
              suivisCount = count || 0
            }
          } catch (err) {
            logError('getAllCandidatures: Exception récupération suivis', { candidatureId: candidature.id, error: err })
          }

          return {
            ...candidature,
            membre: membre,
            suivis_count: suivisCount,
          }
        } catch (err) {
          logError('getAllCandidatures: Erreur enrichissement candidature', { candidatureId: candidature.id, error: err })
          // Retourner la candidature sans enrichissement en cas d'erreur
          return {
            ...candidature,
            membre: null,
            suivis_count: 0,
          }
        }
      })
    )

    return {
      candidatures: candidaturesWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllCandidatures exception', err)
    throw err
  }
}

/**
 * Récupère une candidature par son ID avec tous ses suivis
 */
export async function getCandidatureById(candidatureId) {
  try {
    const { data: candidature, error } = await supabaseRecrutement
      .from('candidatures')
      .select('*')
      .eq('id', candidatureId)
      .maybeSingle()

    if (error) {
      logError('getCandidatureById error', error)
      throw new Error('Erreur lors de la récupération de la candidature')
    }

    if (!candidature) {
      return null
    }

    // Récupérer le membre
    let membre = null
    if (candidature.membre_id) {
      const { data: membreData } = await supabaseAdhesion
        .from('members')
        .select('id, prenom, nom, email, telephone, numero_membre')
        .eq('id', candidature.membre_id)
        .maybeSingle()
      membre = membreData
    }

    // Récupérer les suivis
    const { data: suivis } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('*')
      .eq('candidature_id', candidatureId)
      .order('date_event', { ascending: false })

    return {
      ...candidature,
      membre: membre,
      suivis: suivis || [],
    }
  } catch (err) {
    logError('getCandidatureById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle candidature
 * Vérifie les doublons évidents (même membre, même entreprise, même poste, dans ±7 jours)
 */
export async function createCandidature(candidatureData) {
  try {
    // Vérifier les doublons évidents
    const dateCandidature = candidatureData.date_candidature
      ? new Date(candidatureData.date_candidature)
      : new Date()
    const dateDebut = new Date(dateCandidature)
    dateDebut.setDate(dateDebut.getDate() - 7)
    const dateFin = new Date(dateCandidature)
    dateFin.setDate(dateFin.getDate() + 7)

    const { data: existingCandidatures, error: checkError } = await supabaseRecrutement
      .from('candidatures')
      .select('id, date_candidature, titre_poste, entreprise')
      .eq('membre_id', candidatureData.membre_id)
      .eq('entreprise', candidatureData.entreprise)
      .eq('titre_poste', candidatureData.titre_poste)
      .gte('date_candidature', dateDebut.toISOString().split('T')[0])
      .lte('date_candidature', dateFin.toISOString().split('T')[0])

    if (checkError) {
      logError('createCandidature: Erreur vérification doublons', checkError)
    } else if (existingCandidatures && existingCandidatures.length > 0) {
      const duplicateError = new Error('Une candidature similaire existe déjà pour ce membre. Vérifiez avant de continuer.')
      duplicateError.code = 'DUPLICATE_CANDIDATURE'
      throw duplicateError
    }

    const { data, error } = await supabaseRecrutement
      .from('candidatures')
      .insert({
        membre_id: candidatureData.membre_id,
        titre_poste: candidatureData.titre_poste,
        entreprise: candidatureData.entreprise,
        type_contrat: candidatureData.type_contrat,
        statut: candidatureData.statut || 'envoye',
        cv_url: candidatureData.cv_url || null,
        lm_url: candidatureData.lm_url || null,
        portfolio_url: candidatureData.portfolio_url || null,
        date_candidature: candidatureData.date_candidature || new Date().toISOString().split('T')[0],
        commentaire_mentor: candidatureData.commentaire_mentor || null,
      })
      .select()
      .single()

    if (error) {
      logError('createCandidature error', error)
      throw new Error('Erreur lors de la création de la candidature')
    }

    logInfo('Candidature créée', { id: data.id })
    return data
  } catch (err) {
    logError('createCandidature exception', err)
    throw err
  }
}

/**
 * Met à jour une candidature
 */
export async function updateCandidature(candidatureId, updates) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('candidatures')
      .update(updates)
      .eq('id', candidatureId)
      .select()
      .single()

    if (error) {
      logError('updateCandidature error', error)
      throw new Error('Erreur lors de la mise à jour de la candidature')
    }

    logInfo('Candidature mise à jour', { id: candidatureId })
    return data
  } catch (err) {
    logError('updateCandidature exception', err)
    throw err
  }
}

// ========== SUIVI CANDIDATURES ==========

/**
 * Récupère tous les suivis d'une candidature
 */
export async function getSuivisByCandidature(candidatureId) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('*')
      .eq('candidature_id', candidatureId)
      .order('date_event', { ascending: false })

    if (error) {
      logError('getSuivisByCandidature error', error)
      throw new Error('Erreur lors de la récupération des suivis')
    }

    return data || []
  } catch (err) {
    logError('getSuivisByCandidature exception', err)
    throw err
  }
}

/**
 * Crée un nouveau suivi pour une candidature
 * Gère les erreurs de doublon (index unique partiel)
 */
export async function createSuiviCandidature(suiviData) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .insert({
        candidature_id: suiviData.candidature_id,
        date_event: suiviData.date_event,
        type_event: suiviData.type_event,
        notes: suiviData.notes || null,
      })
      .select()
      .single()

    if (error) {
      // Erreur de violation de contrainte unique (code 23505)
      if (error.code === '23505') {
        const duplicateError = new Error('Un suivi identique existe déjà pour cette candidature.')
        duplicateError.code = 'DUPLICATE_SUIVI'
        throw duplicateError
      }
      logError('createSuiviCandidature error', error)
      throw new Error('Erreur lors de la création du suivi')
    }

    logInfo('Suivi créé', { id: data.id })
    return data
  } catch (err) {
    logError('createSuiviCandidature exception', err)
    throw err
  }
}

/**
 * Met à jour un suivi
 */
export async function updateSuiviCandidature(suiviId, updates) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .update(updates)
      .eq('id', suiviId)
      .select()
      .single()

    if (error) {
      logError('updateSuiviCandidature error', error)
      throw new Error('Erreur lors de la mise à jour du suivi')
    }

    logInfo('Suivi mis à jour', { id: suiviId })
    return data
  } catch (err) {
    logError('updateSuiviCandidature exception', err)
    throw err
  }
}

/**
 * Supprime un suivi
 */
export async function deleteSuiviCandidature(suiviId) {
  try {
    const { error } = await supabaseRecrutement
      .from('suivi_candidatures')
      .delete()
      .eq('id', suiviId)

    if (error) {
      logError('deleteSuiviCandidature error', error)
      throw new Error('Erreur lors de la suppression du suivi')
    }

    logInfo('Suivi supprimé', { id: suiviId })
    return true
  } catch (err) {
    logError('deleteSuiviCandidature exception', err)
    throw err
  }
}

// ========== RECOMMANDATIONS ==========

/**
 * Récupère toutes les recommandations avec pagination
 */
export async function getAllRecommandations({ page = 1, limit = 20 }) {
  try {
    let query = supabaseRecrutement
      .from('recommandations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: recommandations, error, count } = await query

    if (error) {
      logError('getAllRecommandations error', error)
      throw new Error('Erreur lors de la récupération des recommandations')
    }

    if (!recommandations || recommandations.length === 0) {
      return {
        recommandations: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir les recommandations avec les données des mentors et mentorés
    const enrichedRecommandations = await Promise.all(
      recommandations.map(async (reco) => {
        // Récupérer le mentor
        const { data: mentor } = await supabaseMentorat
          .from('mentors')
          .select('*')
          .eq('id', reco.mentor_id)
          .maybeSingle()

        // Récupérer le mentoré
        const { data: mentee } = await supabaseMentorat
          .from('mentees')
          .select('*')
          .eq('id', reco.mentee_id)
          .maybeSingle()

        // Récupérer les membres
        let mentorMembre = null
        let menteeMembre = null

        if (mentor?.membre_id) {
          const { data: membre } = await supabaseAdhesion
            .from('members')
            .select('id, prenom, nom, email, numero_membre')
            .eq('id', mentor.membre_id)
            .maybeSingle()
          mentorMembre = membre
        }

        if (mentee?.membre_id) {
          const { data: membre } = await supabaseAdhesion
            .from('members')
            .select('id, prenom, nom, email, numero_membre')
            .eq('id', mentee.membre_id)
            .maybeSingle()
          menteeMembre = membre
        }

        return {
          ...reco,
          mentor: mentor ? { ...mentor, membre: mentorMembre } : null,
          mentee: mentee ? { ...mentee, membre: menteeMembre } : null,
        }
      })
    )

    return {
      recommandations: enrichedRecommandations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllRecommandations exception', err)
    throw err
  }
}

/**
 * Récupère une recommandation par son ID
 */
export async function getRecommandationById(recommandationId) {
  try {
    const { data: recommandation, error } = await supabaseRecrutement
      .from('recommandations')
      .select('*')
      .eq('id', recommandationId)
      .maybeSingle()

    if (error) {
      logError('getRecommandationById error', error)
      throw new Error('Erreur lors de la récupération de la recommandation')
    }

    if (!recommandation) {
      return null
    }

    // Récupérer le mentor
    const { data: mentor } = await supabaseMentorat
      .from('mentors')
      .select('*')
      .eq('id', recommandation.mentor_id)
      .maybeSingle()

    // Récupérer le mentoré
    const { data: mentee } = await supabaseMentorat
      .from('mentees')
      .select('*')
      .eq('id', recommandation.mentee_id)
      .maybeSingle()

    // Récupérer les membres
    let mentorMembre = null
    let menteeMembre = null

    if (mentor?.membre_id) {
      const { data: membre } = await supabaseAdhesion
        .from('members')
        .select('*')
        .eq('id', mentor.membre_id)
        .maybeSingle()
      mentorMembre = membre
    }

    if (mentee?.membre_id) {
      const { data: membre } = await supabaseAdhesion
        .from('members')
        .select('*')
        .eq('id', mentee.membre_id)
        .maybeSingle()
      menteeMembre = membre
    }

    return {
      ...recommandation,
      mentor: mentor ? { ...mentor, membre: mentorMembre } : null,
      mentee: mentee ? { ...mentee, membre: menteeMembre } : null,
    }
  } catch (err) {
    logError('getRecommandationById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle recommandation
 * Gère les doublons (contrainte unique mentor_id/mentee_id)
 * Génère le PDF si demandé
 */
export async function createRecommandation(recommandationData) {
  try {
    let lienPdf = recommandationData.lien_pdf || null

    // Générer le PDF si demandé
    if (recommandationData.generate_pdf && recommandationData.texte) {
      try {
        lienPdf = await generateRecommandationPDF(recommandationData)
        logInfo('PDF recommandation généré', { lienPdf })
      } catch (pdfErr) {
        logError('Erreur génération PDF recommandation', pdfErr)
        // Ne pas bloquer la création si le PDF échoue
      }
    }

    const { data, error } = await supabaseRecrutement
      .from('recommandations')
      .insert({
        mentor_id: recommandationData.mentor_id,
        mentee_id: recommandationData.mentee_id,
        texte: recommandationData.texte,
        lien_pdf: lienPdf,
      })
      .select()
      .single()

    if (error) {
      // Erreur de violation de contrainte unique (code 23505)
      if (error.code === '23505') {
        const duplicateError = new Error('Une recommandation existe déjà pour ce binôme mentor/mentoré.')
        duplicateError.code = 'DUPLICATE_RECOMMANDATION'
        throw duplicateError
      }
      logError('createRecommandation error', error)
      throw new Error('Erreur lors de la création de la recommandation')
    }

    logInfo('Recommandation créée', { id: data.id, lienPdf })
    return data
  } catch (err) {
    logError('createRecommandation exception', err)
    throw err
  }
}

/**
 * Génère un PDF pour une recommandation
 */
async function generateRecommandationPDF(recommandationData) {
  return new Promise(async (resolve, reject) => {
    try {
      // Récupérer les données du mentor et mentoré
      const { data: mentor } = await supabaseMentorat
        .from('mentors')
        .select('*')
        .eq('id', recommandationData.mentor_id)
        .maybeSingle()

      const { data: mentee } = await supabaseMentorat
        .from('mentees')
        .select('*')
        .eq('id', recommandationData.mentee_id)
        .maybeSingle()

      let mentorMembre = null
      let menteeMembre = null

      if (mentor?.membre_id) {
        const { data: membre } = await supabaseAdhesion
          .from('members')
          .select('id, prenom, nom, email, numero_membre')
          .eq('id', mentor.membre_id)
          .maybeSingle()
        mentorMembre = membre
      }

      if (mentee?.membre_id) {
        const { data: membre } = await supabaseAdhesion
          .from('members')
          .select('id, prenom, nom, email, numero_membre')
          .eq('id', mentee.membre_id)
          .maybeSingle()
        menteeMembre = membre
      }

      // Créer le PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      })

      const chunks = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        // Uploader dans Supabase Storage
        uploadRecommandationPDF(pdfBuffer, recommandationData.mentor_id, recommandationData.mentee_id)
          .then((url) => resolve(url))
          .catch((err) => reject(err))
      })

      // En-tête
      const logoPath = path.join(process.cwd(), 'asgf-app/public/assets/images/Logo_officiel_ASGF.png')
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 30, { width: 60, height: 60 })
        } catch (err) {
          logError('Erreur chargement logo', err)
        }
      }

      doc.fontSize(22)
        .fillColor('#0d47a1')
        .font('Helvetica-Bold')
        .text('RECOMMANDATION', 50, 100, { align: 'center' })

      doc.fontSize(12)
        .fillColor('#424242')
        .font('Helvetica')
        .text('Association des Sénégalais Géomaticiens en France (ASGF)', 50, 130, { align: 'center' })

      // Informations mentor
      doc.fontSize(14)
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        .text('Mentor:', 50, 180)
        .font('Helvetica')
        .text(
          mentorMembre
            ? `${mentorMembre.prenom} ${mentorMembre.nom}`
            : 'Mentor non identifié',
          50,
          200
        )

      // Informations mentoré
      doc.font('Helvetica-Bold')
        .text('Mentoré:', 50, 230)
        .font('Helvetica')
        .text(
          menteeMembre
            ? `${menteeMembre.prenom} ${menteeMembre.nom}`
            : 'Mentoré non identifié',
          50,
          250
        )

      // Date
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#666666')
        .text(
          `Date: ${new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`,
          50,
          280
        )

      // Texte de la recommandation
      doc.fontSize(11)
        .fillColor('#1a1a1a')
        .font('Helvetica')
        .text('Recommandation:', 50, 320)
        .font('Helvetica')
        .text(recommandationData.texte, 50, 340, {
          width: doc.page.width - 100,
          align: 'justify',
          lineGap: 5,
        })

      // Finaliser le PDF
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Upload le PDF de recommandation dans Supabase Storage
 */
async function uploadRecommandationPDF(pdfBuffer, mentorId, menteeId) {
  try {
    if (!supabaseStorage) {
      logWarning('Supabase Storage non configuré, upload PDF ignoré')
      return null
    }

    const fileName = `recommandations/recommandation-${mentorId}-${menteeId}-${Date.now()}.pdf`
    
    logInfo('Upload PDF recommandation vers Supabase Storage', {
      fileName,
      size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
      mentorId,
      menteeId,
    })

    const bucketName = 'recommandations'

    // Vérifier si le bucket existe, sinon essayer de le créer
    const { data: buckets, error: listError } = await supabaseStorage.storage.listBuckets()
    if (!listError) {
      const bucketExists = buckets?.some(b => b.name === bucketName)
      if (!bucketExists) {
        logWarning('Bucket "recommandations" n\'existe pas, tentative de création...')
        const { data: bucketData, error: createError } = await supabaseStorage.storage.createBucket(bucketName, {
          public: true, // Public pour simplifier l'accès (peut être sécurisé plus tard avec RLS)
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['application/pdf'],
        })
        if (createError) {
          logError('Impossible de créer le bucket "recommandations"', createError)
          throw new Error(`Le bucket "recommandations" n'existe pas et ne peut pas être créé automatiquement. Veuillez le créer dans Supabase Dashboard > Storage. Erreur: ${createError.message}`)
        }
        logInfo('Bucket "recommandations" créé avec succès')
      }
    }

    // Uploader le PDF
    const { data, error } = await supabaseStorage.storage
      .from(bucketName)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false, // Ne pas écraser si le fichier existe déjà
      })

    if (error) {
      // Si l'erreur indique que le bucket n'existe pas
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        logError('Bucket "recommandations" introuvable', error)
        throw new Error('Le bucket "recommandations" n\'existe pas dans Supabase Storage. Veuillez le créer dans Supabase Dashboard > Storage.')
      }
      logError('Erreur upload PDF recommandation vers Supabase Storage', error)
      throw new Error(`Erreur lors de l'upload du PDF: ${error.message}`)
    }

    // Obtenir l'URL publique du fichier
    const { data: urlData } = supabaseStorage.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      logError('Impossible d\'obtenir l\'URL publique du PDF', { fileName })
      throw new Error('Impossible d\'obtenir l\'URL publique du PDF')
    }

    logInfo('PDF recommandation uploadé avec succès', {
      fileName,
      publicUrl: urlData.publicUrl,
      size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
    })

    return urlData.publicUrl
  } catch (err) {
    logError('Erreur upload PDF recommandation', err)
    throw err
  }
}

/**
 * Met à jour une recommandation
 */
export async function updateRecommandation(recommandationId, updates) {
  try {
    const { data, error } = await supabaseRecrutement
      .from('recommandations')
      .update(updates)
      .eq('id', recommandationId)
      .select()
      .single()

    if (error) {
      logError('updateRecommandation error', error)
      throw new Error('Erreur lors de la mise à jour de la recommandation')
    }

    logInfo('Recommandation mise à jour', { id: recommandationId })
    return data
  } catch (err) {
    logError('updateRecommandation exception', err)
    throw err
  }
}

/**
 * Supprime une recommandation
 */
export async function deleteRecommandation(recommandationId) {
  try {
    const { error } = await supabaseRecrutement
      .from('recommandations')
      .delete()
      .eq('id', recommandationId)

    if (error) {
      logError('deleteRecommandation error', error)
      throw new Error('Erreur lors de la suppression de la recommandation')
    }

    logInfo('Recommandation supprimée', { id: recommandationId })
    return true
  } catch (err) {
    logError('deleteRecommandation exception', err)
    throw err
  }
}

// ========== STATISTIQUES ==========

/**
 * Récupère les statistiques du module recrutement
 */
export async function getRecrutementStats() {
  try {
    // Nombre total de candidatures
    const { count: totalCandidatures } = await supabaseRecrutement
      .from('candidatures')
      .select('*', { count: 'exact', head: true })

    // Candidatures par statut
    const { data: candidaturesData } = await supabaseRecrutement
      .from('candidatures')
      .select('statut')

    const candidaturesParStatut = {}
    ;(candidaturesData || []).forEach((c) => {
      candidaturesParStatut[c.statut] = (candidaturesParStatut[c.statut] || 0) + 1
    })

    // Candidatures par type de contrat
    const { data: contratsData } = await supabaseRecrutement
      .from('candidatures')
      .select('type_contrat')

    const candidaturesParContrat = {}
    ;(contratsData || []).forEach((c) => {
      candidaturesParContrat[c.type_contrat] = (candidaturesParContrat[c.type_contrat] || 0) + 1
    })

    // Nombre total de suivis
    const { count: totalSuivis } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('*', { count: 'exact', head: true })

    // Nombre total de recommandations
    const { count: totalRecommandations } = await supabaseRecrutement
      .from('recommandations')
      .select('*', { count: 'exact', head: true })

    // Répartition des types d'événements de suivi
    const { data: suivisData } = await supabaseRecrutement
      .from('suivi_candidatures')
      .select('type_event')

    const suivisParType = {}
    ;(suivisData || []).forEach((s) => {
      suivisParType[s.type_event] = (suivisParType[s.type_event] || 0) + 1
    })

    return {
      total_candidatures: totalCandidatures || 0,
      candidatures_par_statut: candidaturesParStatut,
      candidatures_par_contrat: candidaturesParContrat,
      total_suivis: totalSuivis || 0,
      total_recommandations: totalRecommandations || 0,
      suivis_par_type: suivisParType,
    }
  } catch (err) {
    logError('getRecrutementStats exception', err)
    throw err
  }
}
