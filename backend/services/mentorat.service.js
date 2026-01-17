// backend/services/mentorat.service.js
import { supabaseMentorat, supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo } from '../utils/logger.js'

// ========== MENTORS ==========

/**
 * Récupère tous les mentors avec leurs informations de membre
 */
export async function getAllMentors({ page = 1, limit = 20, search = '', domaine = '', status = '' }) {
  try {
    logInfo('getAllMentors: Requête initiale', { page, limit, search, domaine, status })
    let query = supabaseMentorat
      .from('mentors')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Recherche par domaine ou compétences
    if (search) {
      query = query.or(`domaine.ilike.%${search}%,competences.ilike.%${search}%,biographie.ilike.%${search}%`)
    }

    // Filtre par domaine
    if (domaine) {
      query = query.eq('domaine', domaine)
    }

    // Filtre par statut
    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: mentors, error, count } = await query

    if (error) {
      logError('getAllMentors error', error)
      throw new Error('Erreur lors de la récupération des mentors')
    }

    logInfo('getAllMentors: Mentors récupérés', { count: mentors?.length || 0, total: count || 0 })

    if (!mentors || mentors.length === 0) {
      return {
        mentors: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir avec les données des membres
    const mentorsWithMembers = await Promise.all(
      mentors.map(async (mentor) => {
        let membre = null
        if (mentor.membre_id) {
          try {
            const { data: membreData } = await supabaseAdhesion
              .from('members')
              .select('id, prenom, nom, email, numero_membre')
              .eq('id', mentor.membre_id)
              .maybeSingle()
            membre = membreData
          } catch (err) {
            logError(`Error fetching member for mentor ${mentor.id}: ${err.message}`)
          }
        }
        return {
          ...mentor,
          membre: membre,
        }
      })
    )

    return {
      mentors: mentorsWithMembers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllMentors exception', err)
    throw err
  }
}

/**
 * Récupère un mentor par son ID
 */
export async function getMentorById(mentorId) {
  try {
    const { data: mentor, error } = await supabaseMentorat
      .from('mentors')
      .select('*')
      .eq('id', mentorId)
      .maybeSingle()

    if (error) {
      logError('getMentorById error', error)
      throw new Error('Erreur lors de la récupération du mentor')
    }

    if (!mentor) {
      return null
    }

    // Enrichir avec les données du membre
    let membre = null
    if (mentor.membre_id) {
      try {
        const { data: membreData } = await supabaseAdhesion
          .from('members')
          .select('id, prenom, nom, email, numero_membre')
          .eq('id', mentor.membre_id)
          .maybeSingle()
        membre = membreData
      } catch (err) {
        logError(`Error fetching member for mentor ${mentorId}: ${err.message}`)
      }
    }

    return {
      ...mentor,
      membre: membre,
    }
  } catch (err) {
    logError('getMentorById exception', err)
    throw err
  }
}

/**
 * Crée un nouveau mentor
 * Gestion des doublons: vérifie si un mentor existe déjà pour ce membre_id
 */
export async function createMentor(mentorData) {
  try {
    // 🔒 VÉRIFICATION DOUBLONS AVANT INSERTION (optionnel, mais améliore l'UX)
    const { data: existing, error: checkError } = await supabaseMentorat
      .from('mentors')
      .select('id')
      .eq('membre_id', mentorData.membre_id)
      .maybeSingle()

    if (checkError) {
      logError('createMentor check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (existing) {
      throw new Error('Ce membre est déjà enregistré comme mentor. Un membre ne peut être mentor qu\'une seule fois.')
    }

    const { data, error } = await supabaseMentorat
      .from('mentors')
      .insert({
        membre_id: mentorData.membre_id,
        domaine: mentorData.domaine,
        biographie: mentorData.biographie || null,
        competences: mentorData.competences || null,
        linkedin: mentorData.linkedin || null,
        disponibilite: mentorData.disponibilite || null,
        status: mentorData.status || 'active',
      })
      .select()
      .single()

    if (error) {
      logError('createMentor error', error)
      
      // 🔒 GESTION ERREUR DOUBLON (code PostgreSQL 23505 = duplicate key)
      const errorMessage = error.message || ''
      if (
        error.code === '23505' ||
        errorMessage.includes('mentors_unique_membre') ||
        errorMessage.toLowerCase().includes('duplicate key value') ||
        errorMessage.toLowerCase().includes('unique constraint')
      ) {
        throw new Error('Ce membre est déjà enregistré comme mentor. Un membre ne peut être mentor qu\'une seule fois.')
      }

      throw new Error('Erreur lors de la création du mentor')
    }

    logInfo('Mentor créé', { id: data.id })
    return data
  } catch (err) {
    logError('createMentor exception', err)
    throw err
  }
}

/**
 * Met à jour un mentor
 */
export async function updateMentor(mentorId, updates) {
  try {
    const { data, error } = await supabaseMentorat
      .from('mentors')
      .update(updates)
      .eq('id', mentorId)
      .select()
      .single()

    if (error) {
      logError('updateMentor error', error)
      throw new Error('Erreur lors de la mise à jour du mentor')
    }

    logInfo('Mentor mis à jour', { id: mentorId })
    return data
  } catch (err) {
    logError('updateMentor exception', err)
    throw err
  }
}

// ========== MENTEES ==========

/**
 * Récupère tous les mentorés avec leurs informations de membre
 */
export async function getAllMentees({ page = 1, limit = 20, search = '', domaine = '', status = '' }) {
  try {
    logInfo('getAllMentees: Requête initiale', { page, limit, search, domaine, status })
    let query = supabaseMentorat
      .from('mentees')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Recherche par domaine ou objectif
    if (search) {
      query = query.or(`domaine_souhaite.ilike.%${search}%,objectif_general.ilike.%${search}%`)
    }

    // Filtre par domaine
    if (domaine) {
      query = query.eq('domaine_souhaite', domaine)
    }

    // Filtre par statut
    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: mentees, error, count } = await query

    if (error) {
      logError('getAllMentees error', error)
      throw new Error('Erreur lors de la récupération des mentorés')
    }

    logInfo('getAllMentees: Mentees récupérés', { count: mentees?.length || 0, total: count || 0 })

    if (!mentees || mentees.length === 0) {
      return {
        mentees: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir avec les données des membres
    const menteesWithMembers = await Promise.all(
      mentees.map(async (mentee) => {
        let membre = null
        if (mentee.membre_id) {
          try {
            const { data: membreData } = await supabaseAdhesion
              .from('members')
              .select('id, prenom, nom, email, numero_membre')
              .eq('id', mentee.membre_id)
              .maybeSingle()
            membre = membreData
          } catch (err) {
            logError(`Error fetching member for mentee ${mentee.id}: ${err.message}`)
          }
        }
        return {
          ...mentee,
          membre: membre,
        }
      })
    )

    return {
      mentees: menteesWithMembers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllMentees exception', err)
    throw err
  }
}

/**
 * Récupère un mentoré par son ID
 */
export async function getMenteeById(menteeId) {
  try {
    const { data: mentee, error } = await supabaseMentorat
      .from('mentees')
      .select('*')
      .eq('id', menteeId)
      .maybeSingle()

    if (error) {
      logError('getMenteeById error', error)
      throw new Error('Erreur lors de la récupération du mentoré')
    }

    if (!mentee) {
      return null
    }

    // Enrichir avec les données du membre
    let membre = null
    if (mentee.membre_id) {
      try {
        const { data: membreData } = await supabaseAdhesion
          .from('members')
          .select('id, prenom, nom, email, numero_membre')
          .eq('id', mentee.membre_id)
          .maybeSingle()
        membre = membreData
      } catch (err) {
        logError(`Error fetching member for mentee ${menteeId}: ${err.message}`)
      }
    }

    return {
      ...mentee,
      membre: membre,
    }
  } catch (err) {
    logError('getMenteeById exception', err)
    throw err
  }
}

/**
 * Crée un nouveau mentoré
 * Gestion des doublons: vérifie si un mentee existe déjà pour ce membre_id
 */
export async function createMentee(menteeData) {
  try {
    // 🔒 VÉRIFICATION DOUBLONS AVANT INSERTION (optionnel, mais améliore l'UX)
    const { data: existing, error: checkError } = await supabaseMentorat
      .from('mentees')
      .select('id')
      .eq('membre_id', menteeData.membre_id)
      .maybeSingle()

    if (checkError) {
      logError('createMentee check error', checkError)
      throw new Error('Erreur lors de la vérification')
    }

    if (existing) {
      throw new Error('Ce membre est déjà enregistré comme mentoré. Un membre ne peut être mentoré qu\'une seule fois.')
    }

    const { data, error } = await supabaseMentorat
      .from('mentees')
      .insert({
        membre_id: menteeData.membre_id,
        domaine_souhaite: menteeData.domaine_souhaite,
        objectif_general: menteeData.objectif_general || null,
        niveau: menteeData.niveau || null,
        status: menteeData.status || 'en recherche',
      })
      .select()
      .single()

    if (error) {
      logError('createMentee error', error)
      
      // 🔒 GESTION ERREUR DOUBLON (code PostgreSQL 23505 = duplicate key)
      const errorMessage = error.message || ''
      if (
        error.code === '23505' ||
        errorMessage.includes('mentees_unique_membre') ||
        errorMessage.toLowerCase().includes('duplicate key value') ||
        errorMessage.toLowerCase().includes('unique constraint')
      ) {
        throw new Error('Ce membre est déjà enregistré comme mentoré. Un membre ne peut être mentoré qu\'une seule fois.')
      }

      throw new Error('Erreur lors de la création du mentoré')
    }

    logInfo('Mentoré créé', { id: data.id })
    return data
  } catch (err) {
    logError('createMentee exception', err)
    throw err
  }
}

/**
 * Met à jour un mentoré
 */
export async function updateMentee(menteeId, updates) {
  try {
    const { data, error } = await supabaseMentorat
      .from('mentees')
      .update(updates)
      .eq('id', menteeId)
      .select()
      .single()

    if (error) {
      logError('updateMentee error', error)
      throw new Error('Erreur lors de la mise à jour du mentoré')
    }

    logInfo('Mentoré mis à jour', { id: menteeId })
    return data
  } catch (err) {
    logError('updateMentee exception', err)
    throw err
  }
}

// ========== RELATIONS (BINÔMES) ==========

/**
 * Récupère toutes les relations mentor/mentoré
 */
export async function getAllRelations({ page = 1, limit = 20, status = '' }) {
  try {
    let query = supabaseMentorat
      .from('relations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    logInfo('getAllRelations: Requête initiale', { page, limit, status })

    // Filtre par statut
    if (status) {
      query = query.eq('statut_relation', status)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: relations, error, count } = await query

    if (error) {
      logError('getAllRelations error', { error, details: error.message, code: error.code, hint: error.hint })
      throw new Error(`Erreur lors de la récupération des relations: ${error.message || 'Erreur inconnue'}`)
    }

    logInfo('getAllRelations: Relations récupérées', { count: relations?.length || 0, total: count || 0 })

    if (!relations || relations.length === 0) {
      return {
        relations: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir les relations avec les données des mentors et mentorés
    const enrichedRelations = await Promise.all(
      relations.map(async (relation) => {
        try {
          // Récupérer le mentor
          const { data: mentor, error: mentorError } = await supabaseMentorat
            .from('mentors')
            .select('*')
            .eq('id', relation.mentor_id)
            .maybeSingle()

          if (mentorError) {
            logError('getAllRelations: Erreur récupération mentor', { relationId: relation.id, error: mentorError })
          }

          // Récupérer le mentoré
          const { data: mentee, error: menteeError } = await supabaseMentorat
            .from('mentees')
            .select('*')
            .eq('id', relation.mentee_id)
            .maybeSingle()

          if (menteeError) {
            logError('getAllRelations: Erreur récupération mentee', { relationId: relation.id, error: menteeError })
          }

          // Récupérer les membres si les mentors/mentees existent
          let mentorMembre = null
          let menteeMembre = null

          if (mentor?.membre_id) {
            try {
              const { data: membre, error: membreError } = await supabaseAdhesion
                .from('members')
                .select('id, prenom, nom, email, numero_membre')
                .eq('id', mentor.membre_id)
                .maybeSingle()
              
              if (membreError) {
                logError('getAllRelations: Erreur récupération membre mentor', { membreId: mentor.membre_id, error: membreError })
              } else {
                mentorMembre = membre
              }
            } catch (err) {
              logError('getAllRelations: Exception récupération membre mentor', err)
            }
          }

          if (mentee?.membre_id) {
            try {
              const { data: membre, error: membreError } = await supabaseAdhesion
                .from('members')
                .select('id, prenom, nom, email, numero_membre')
                .eq('id', mentee.membre_id)
                .maybeSingle()
              
              if (membreError) {
                logError('getAllRelations: Erreur récupération membre mentee', { membreId: mentee.membre_id, error: membreError })
              } else {
                menteeMembre = membre
              }
            } catch (err) {
              logError('getAllRelations: Exception récupération membre mentee', err)
            }
          }

          return {
            ...relation,
            mentor: mentor ? { ...mentor, membre: mentorMembre } : null,
            mentee: mentee ? { ...mentee, membre: menteeMembre } : null,
          }
        } catch (err) {
          logError('getAllRelations: Erreur enrichissement relation', { relationId: relation.id, error: err })
          // Retourner la relation sans enrichissement en cas d'erreur
          return {
            ...relation,
            mentor: null,
            mentee: null,
          }
        }
      })
    )

    return {
      relations: enrichedRelations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllRelations exception', err)
    throw err
  }
}

/**
 * Récupère une relation par son ID avec tous ses détails
 */
export async function getRelationById(relationId) {
  try {
    const { data: relation, error } = await supabaseMentorat
      .from('relations')
      .select('*')
      .eq('id', relationId)
      .maybeSingle()

    if (error) {
      logError('getRelationById error', error)
      throw new Error('Erreur lors de la récupération de la relation')
    }

    if (!relation) {
      return null
    }

    // Récupérer le mentor
    const { data: mentor } = await supabaseMentorat
      .from('mentors')
      .select('*')
      .eq('id', relation.mentor_id)
      .maybeSingle()

    // Récupérer le mentoré
    const { data: mentee } = await supabaseMentorat
      .from('mentees')
      .select('*')
      .eq('id', relation.mentee_id)
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
      ...relation,
      mentor: mentor ? { ...mentor, membre: mentorMembre } : null,
      mentee: mentee ? { ...mentee, membre: menteeMembre } : null,
    }
  } catch (err) {
    logError('getRelationById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle relation mentor/mentoré
 * Gestion des doublons: vérifie s'il existe déjà une relation ACTIVE pour ce duo
 */
export async function createRelation(relationData) {
  try {
    const statutRelation = relationData.statut_relation || 'active'
    
    // 🔒 VÉRIFICATION DOUBLONS: ne pas autoriser deux relations ACTIVES avec le même pair mentor_id + mentee_id
    if (statutRelation === 'active') {
      const { data: existingActive, error: checkError } = await supabaseMentorat
        .from('relations')
        .select('id')
        .eq('mentor_id', relationData.mentor_id)
        .eq('mentee_id', relationData.mentee_id)
        .eq('statut_relation', 'active')
        .maybeSingle()

      if (checkError) {
        logError('createRelation check error', checkError)
        throw new Error('Erreur lors de la vérification')
      }

      if (existingActive) {
        throw new Error('Une relation active existe déjà entre ce mentor et ce mentoré. Veuillez clôturer la relation existante avant d\'en créer une nouvelle.')
      }
    }

    const { data, error } = await supabaseMentorat
      .from('relations')
      .insert({
        mentor_id: relationData.mentor_id,
        mentee_id: relationData.mentee_id,
        date_debut: relationData.date_debut || new Date().toISOString().split('T')[0],
        date_fin: relationData.date_fin || null,
        statut_relation: statutRelation,
        commentaire_admin: relationData.commentaire_admin || null,
      })
      .select()
      .single()

    if (error) {
      logError('createRelation error', error)
      
      // 🔒 GESTION ERREUR DOUBLON (code PostgreSQL 23505 = duplicate key)
      const errorMessage = error.message || ''
      if (
        error.code === '23505' ||
        errorMessage.includes('idx_relations_unique_active') ||
        errorMessage.toLowerCase().includes('duplicate key value') ||
        errorMessage.toLowerCase().includes('unique constraint')
      ) {
        throw new Error('Une relation active existe déjà entre ce mentor et ce mentoré. Veuillez clôturer la relation existante avant d\'en créer une nouvelle.')
      }

      throw new Error('Erreur lors de la création de la relation')
    }

    logInfo('Relation créée', { id: data.id })
    return data
  } catch (err) {
    logError('createRelation exception', err)
    throw err
  }
}

/**
 * Met à jour une relation
 */
export async function updateRelation(relationId, updates) {
  try {
    const { data, error } = await supabaseMentorat
      .from('relations')
      .update(updates)
      .eq('id', relationId)
      .select()
      .single()

    if (error) {
      logError('updateRelation error', error)
      throw new Error('Erreur lors de la mise à jour de la relation')
    }

    logInfo('Relation mise à jour', { id: relationId })
    return data
  } catch (err) {
    logError('updateRelation exception', err)
    throw err
  }
}

/**
 * Clôture une relation (passe le statut à 'terminée' et ajoute la date de fin)
 */
export async function closeRelation(relationId, commentaire = null) {
  try {
    const { data, error } = await supabaseMentorat
      .from('relations')
      .update({
        statut_relation: 'terminee',
        date_fin: new Date().toISOString().split('T')[0],
        commentaire_admin: commentaire || null,
      })
      .eq('id', relationId)
      .select()
      .single()

    if (error) {
      logError('closeRelation error', error)
      throw new Error('Erreur lors de la clôture de la relation')
    }

    logInfo('Relation clôturée', { id: relationId })
    return data
  } catch (err) {
    logError('closeRelation exception', err)
    throw err
  }
}

// ========== OBJECTIFS ==========

/**
 * Récupère tous les objectifs d'une relation
 */
export async function getObjectifsByRelation(relationId) {
  try {
    const { data, error } = await supabaseMentorat
      .from('objectifs')
      .select('*')
      .eq('relation_id', relationId)
      .order('created_at', { ascending: false })

    if (error) {
      logError('getObjectifsByRelation error', error)
      throw new Error('Erreur lors de la récupération des objectifs')
    }

    return data || []
  } catch (err) {
    logError('getObjectifsByRelation exception', err)
    throw err
  }
}

/**
 * Crée un nouvel objectif
 */
export async function createObjectif(objectifData) {
  try {
    const { data, error } = await supabaseMentorat
      .from('objectifs')
      .insert({
        relation_id: objectifData.relation_id,
        titre: objectifData.titre,
        description: objectifData.description || null,
        statut: objectifData.statut || 'en cours',
        deadline: objectifData.deadline || null,
      })
      .select()
      .single()

    if (error) {
      logError('createObjectif error', error)
      throw new Error('Erreur lors de la création de l\'objectif')
    }

    logInfo('Objectif créé', { id: data.id })
    return data
  } catch (err) {
    logError('createObjectif exception', err)
    throw err
  }
}

/**
 * Met à jour un objectif
 */
export async function updateObjectif(objectifId, updates) {
  try {
    const { data, error } = await supabaseMentorat
      .from('objectifs')
      .update(updates)
      .eq('id', objectifId)
      .select()
      .single()

    if (error) {
      logError('updateObjectif error', error)
      throw new Error('Erreur lors de la mise à jour de l\'objectif')
    }

    logInfo('Objectif mis à jour', { id: objectifId })
    return data
  } catch (err) {
    logError('updateObjectif exception', err)
    throw err
  }
}

// ========== RENDEZ-VOUS ==========

/**
 * Récupère tous les rendez-vous d'une relation
 */
export async function getRendezVousByRelation(relationId) {
  try {
    const { data, error } = await supabaseMentorat
      .from('rendezvous')
      .select('*')
      .eq('relation_id', relationId)
      .order('date_rdv', { ascending: false })

    if (error) {
      logError('getRendezVousByRelation error', error)
      throw new Error('Erreur lors de la récupération des rendez-vous')
    }

    return data || []
  } catch (err) {
    logError('getRendezVousByRelation exception', err)
    throw err
  }
}

/**
 * Crée un nouveau rendez-vous
 * Gestion des doublons: vérifie s'il existe déjà un rendez-vous au même moment pour cette relation
 */
export async function createRendezVous(rdvData) {
  try {
    const { data, error } = await supabaseMentorat
      .from('rendezvous')
      .insert({
        relation_id: rdvData.relation_id,
        date_rdv: rdvData.date_rdv,
        type: rdvData.type,
        notes_rdv: rdvData.notes_rdv || null,
        prochaine_action: rdvData.prochaine_action || null,
      })
      .select()
      .single()

    if (error) {
      logError('createRendezVous error', error)
      
      // 🔒 GESTION ERREUR DOUBLON (code PostgreSQL 23505 = duplicate key)
      const errorMessage = error.message || ''
      if (
        error.code === '23505' ||
        errorMessage.includes('idx_rdv_unique_relation_datetime') ||
        errorMessage.toLowerCase().includes('duplicate key value') ||
        errorMessage.toLowerCase().includes('unique constraint')
      ) {
        throw new Error('Un rendez-vous existe déjà à cette date et heure pour cette relation. Veuillez choisir un autre créneau.')
      }

      throw new Error('Erreur lors de la création du rendez-vous')
    }

    logInfo('Rendez-vous créé', { id: data.id })
    return data
  } catch (err) {
    logError('createRendezVous exception', err)
    throw err
  }
}

/**
 * Met à jour un rendez-vous
 */
export async function updateRendezVous(rdvId, updates) {
  try {
    const { data, error } = await supabaseMentorat
      .from('rendezvous')
      .update(updates)
      .eq('id', rdvId)
      .select()
      .single()

    if (error) {
      logError('updateRendezVous error', error)
      throw new Error('Erreur lors de la mise à jour du rendez-vous')
    }

    logInfo('Rendez-vous mis à jour', { id: rdvId })
    return data
  } catch (err) {
    logError('updateRendezVous exception', err)
    throw err
  }
}

// ========== STATISTIQUES ==========

/**
 * Récupère les statistiques du module mentorat
 */
export async function getMentoratStats() {
  try {
    // Nombre de mentors actifs
    const { count: mentorsCount } = await supabaseMentorat
      .from('mentors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Nombre de mentorés en recherche
    const { count: menteesCount } = await supabaseMentorat
      .from('mentees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'en recherche')

    // Nombre de relations actives
    const { count: relationsCount } = await supabaseMentorat
      .from('relations')
      .select('*', { count: 'exact', head: true })
      .eq('statut_relation', 'active')

    // Nombre total de rendez-vous
    const { count: rdvCount } = await supabaseMentorat
      .from('rendezvous')
      .select('*', { count: 'exact', head: true })

    // Répartition par domaine (mentors)
    const { data: domainesData } = await supabaseMentorat
      .from('mentors')
      .select('domaine')
      .eq('status', 'active')

    const domainesRepartition = {}
    ;(domainesData || []).forEach((m) => {
      domainesRepartition[m.domaine] = (domainesRepartition[m.domaine] || 0) + 1
    })

    // Objectifs par statut
    const { data: objectifsData } = await supabaseMentorat
      .from('objectifs')
      .select('statut')

    const objectifsRepartition = {}
    ;(objectifsData || []).forEach((o) => {
      objectifsRepartition[o.statut] = (objectifsRepartition[o.statut] || 0) + 1
    })

    return {
      mentors_actifs: mentorsCount || 0,
      mentees_en_recherche: menteesCount || 0,
      relations_actives: relationsCount || 0,
      total_rendezvous: rdvCount || 0,
      repartition_domaines: domainesRepartition,
      repartition_objectifs: objectifsRepartition,
    }
  } catch (err) {
    logError('getMentoratStats exception', err)
    throw err
  }
}
