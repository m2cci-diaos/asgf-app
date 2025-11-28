// backend/services/tresorerie.service.js
import { supabaseTresorerie, supabaseAdhesion } from '../config/supabase.js'
import { logError, logInfo, logWarning } from '../utils/logger.js'
import { Parser as Json2CsvParser } from 'json2csv'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

const MEMBER_FIELDS = 'id, prenom, nom, email, numero_membre, pays'
const SENEGAL_KEYWORDS = ['senegal', 'sénégal']
const CFA_TO_EUR_RATE = 1 / 655.957 // taux fixe CFA → EUR
const CFA_CURRENCIES = ['XOF', 'CFA', 'FCFA']

function normalizeCountry(pays = '') {
  try {
    return pays
      ? pays
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
      : ''
  } catch {
    return pays?.toLowerCase().trim() || ''
  }
}

function getTarifInfoForCountry(pays = '') {
  const normalized = normalizeCountry(pays)
  if (SENEGAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { montant: 2000, devise: 'XOF', symbol: 'FCFA', isSenegal: true }
  }
  return { montant: 10, devise: 'EUR', symbol: '€', isSenegal: false }
}

function convertToEuro(amount = 0, tarifInfo = {}) {
  const parsed = parseFloat(amount || 0)
  if (!parsed) return 0
  if (tarifInfo.isSenegal) {
    return parsed * CFA_TO_EUR_RATE
  }
  return parsed
}

function convertCurrencyToEuro(amount = 0, devise = 'EUR') {
  const parsed = parseFloat(amount || 0)
  if (!parsed) return 0
  const normalized = (devise || '').toUpperCase()
  if (CFA_CURRENCIES.includes(normalized)) {
    return parsed * CFA_TO_EUR_RATE
  }
  return parsed
}

function resolvePeriode({ periode_mois, periode_annee, referenceDate = new Date() }) {
  const refDate = referenceDate ? new Date(referenceDate) : new Date()
  let month = parseInt(periode_mois, 10)
  let year = parseInt(periode_annee, 10)

  if (isNaN(month) || month < 1 || month > 12) {
    month = refDate.getMonth() + 1
  }

  if (isNaN(year)) {
    year = refDate.getFullYear()
  }

  return {
    periode_mois: month,
    periode_annee: year,
  }
}

function buildPeriodLabel(periode_mois, periode_annee, fallbackDate) {
  if (periode_mois && periode_annee) {
    return `${periode_mois.toString().padStart(2, '0')}/${periode_annee}`
  }
  if (fallbackDate) {
    const date = new Date(fallbackDate)
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
  }
  return 'N/A'
}

function formatCurrency(amount = 0, symbol = '€') {
  if (amount === null || amount === undefined) return '—'
  return `${Number(amount).toFixed(2)} ${symbol}`
}

function formatDateLabel(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleDateString('fr-FR')
}

async function fetchMembersMap(memberIds = []) {
  const unique = Array.from(new Set(memberIds.filter(Boolean)))
  if (!unique.length) {
    return new Map()
  }
  const { data, error } = await supabaseAdhesion
    .from('members')
    .select(MEMBER_FIELDS)
    .in('id', unique)

  if (error) {
    logError('fetchMembersMap error', error)
    return new Map()
  }

  const map = new Map()
  data.forEach((m) => {
    map.set(m.id, m)
  })
  return map
}

async function logHistoriqueAction(action, { membre_id = null, montant = null, description = null, admin_id = null } = {}) {
  try {
    await supabaseTresorerie.from('historique').insert({
      action,
      membre_id,
      montant,
      description,
      admin_id,
    })
  } catch (err) {
    logError(`logHistoriqueAction ${action} error`, err)
  }
}

async function fetchMemberById(memberId) {
  if (!memberId) {
    return null
  }

  const { data, error } = await supabaseAdhesion
    .from('members')
    .select(MEMBER_FIELDS)
    .eq('id', memberId)
    .maybeSingle()

  if (error) {
    logError('fetchMemberById error', error)
    throw new Error("Impossible de récupérer le membre associé à la cotisation")
  }

  return data
}

async function fetchMemberByNumero(numero) {
  if (!numero) {
    return null
  }

  const { data, error } = await supabaseAdhesion
    .from('members')
    .select(MEMBER_FIELDS)
    .eq('numero_membre', numero)
    .maybeSingle()

  if (error) {
    logError('fetchMemberByNumero error', error)
    throw new Error("Impossible de récupérer le membre associé à la carte")
  }

  return data
}

// ========== COTISATIONS ==========

/**
 * Récupère toutes les cotisations avec pagination et filtres
 */
export async function getAllCotisations({ page = 1, limit = 20, search = '', annee = '', statut_paiement = '' }) {
  try {
    logInfo('getAllCotisations: Requête initiale', { page, limit, search, annee, statut_paiement })
    let query = supabaseTresorerie
      .from('cotisations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (annee) {
      query = query.eq('annee', parseInt(annee))
    }

    if (statut_paiement) {
      query = query.eq('statut_paiement', statut_paiement)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: cotisations, error, count } = await query

    if (error) {
      logError('getAllCotisations error', error)
      throw new Error('Erreur lors de la récupération des cotisations')
    }

    logInfo('getAllCotisations: Cotisations récupérées', { count: cotisations?.length || 0, total: count || 0 })

    if (!cotisations || cotisations.length === 0) {
      return {
        cotisations: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir avec les données des membres
    const cotisationsWithMembers = await Promise.all(
      cotisations.map(async (cotisation) => {
        let membre = null
        if (cotisation.membre_id) {
          try {
            const { data: membreData } = await supabaseAdhesion
              .from('members')
              .select(MEMBER_FIELDS)
              .eq('id', cotisation.membre_id)
              .maybeSingle()
            membre = membreData
          } catch (err) {
            logError(`Error fetching member for cotisation ${cotisation.id}: ${err.message}`)
          }
        }

        const tarifInfo = getTarifInfoForCountry(membre?.pays)

        const montantEur = convertToEuro(cotisation.montant, tarifInfo)
        return {
          ...cotisation,
          membre,
          devise: tarifInfo.devise,
          currencySymbol: tarifInfo.symbol,
          montant_eur: montantEur,
        }
      })
    )

    return {
      cotisations: cotisationsWithMembers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllCotisations exception', err)
    throw err
  }
}

/**
 * Récupère une cotisation par son ID
 */
export async function getCotisationById(cotisationId) {
  try {
    const { data: cotisation, error } = await supabaseTresorerie
      .from('cotisations')
      .select('*')
      .eq('id', cotisationId)
      .maybeSingle()

    if (error) {
      logError('getCotisationById error', error)
      throw new Error('Erreur lors de la récupération de la cotisation')
    }

    if (!cotisation) {
      return null
    }

    // Enrichir avec les données du membre
    let membre = null
    if (cotisation.membre_id) {
      try {
        const { data: membreData } = await supabaseAdhesion
          .from('members')
          .select(MEMBER_FIELDS)
          .eq('id', cotisation.membre_id)
          .maybeSingle()
        membre = membreData
      } catch (err) {
        logError(`Error fetching member for cotisation ${cotisationId}: ${err.message}`)
      }
    }

    const tarifInfo = getTarifInfoForCountry(membre?.pays)

    const montantEur = convertToEuro(cotisation.montant, tarifInfo)

    return {
      ...cotisation,
      membre,
      devise: tarifInfo.devise,
      currencySymbol: tarifInfo.symbol,
      montant_eur: montantEur,
    }
  } catch (err) {
    logError('getCotisationById exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle cotisation
 */
export async function createCotisation(cotisationData) {
  try {
    const membre = await fetchMemberById(cotisationData.membre_id)
    if (!membre) {
      throw new Error('Membre introuvable pour cette cotisation')
    }

    const tarifInfo = getTarifInfoForCountry(membre.pays)

    const montantCalcule = tarifInfo.montant
    const annee = cotisationData.annee || new Date().getFullYear()
    const periode = resolvePeriode({
      periode_mois: cotisationData.periode_mois,
      periode_annee: cotisationData.periode_annee || cotisationData.annee,
      referenceDate: cotisationData.date_paiement,
    })

    const { data, error } = await supabaseTresorerie
      .from('cotisations')
      .insert({
        membre_id: cotisationData.membre_id,
        annee,
        periode_mois: periode.periode_mois,
        periode_annee: periode.periode_annee,
        montant: montantCalcule,
        statut_paiement: cotisationData.statut_paiement || 'en_attente',
        mode_paiement: cotisationData.mode_paiement || null,
        date_paiement: cotisationData.date_paiement || null,
        preuve_url: cotisationData.preuve_url || null,
      })
      .select()
      .single()

    if (error) {
      logError('createCotisation error', error)
      throw new Error('Erreur lors de la création de la cotisation')
    }

    logInfo('Cotisation créée', { id: data.id })
    const response = {
      ...data,
      devise: tarifInfo.devise,
      currencySymbol: tarifInfo.symbol,
      montant_eur: convertToEuro(data.montant, tarifInfo),
    }
    await logHistoriqueAction('cotisation_created', {
      membre_id: data.membre_id,
      montant: data.montant,
      description: `Cotisation ${annee}`,
    })
    return response
  } catch (err) {
    logError('createCotisation exception', err)
    throw err
  }
}

/**
 * Met à jour une cotisation
 */
export async function updateCotisation(cotisationId, updates) {
  try {
    let payload = { ...updates }
    if (updates.membre_id) {
      const membre = await fetchMemberById(updates.membre_id)
      const tarifInfo = getTarifInfoForCountry(membre?.pays)
      payload.montant = tarifInfo.montant
    }

    if (updates.periode_mois || updates.periode_annee || updates.date_paiement) {
      const periode = resolvePeriode({
        periode_mois: updates.periode_mois,
        periode_annee: updates.periode_annee,
        referenceDate: updates.date_paiement,
      })
      payload.periode_mois = periode.periode_mois
      payload.periode_annee = periode.periode_annee
    }

    const { data, error } = await supabaseTresorerie
      .from('cotisations')
      .update(payload)
      .eq('id', cotisationId)
      .select()
      .single()

    if (error) {
      logError('updateCotisation error', error)
      throw new Error('Erreur lors de la mise à jour de la cotisation')
    }

    logInfo('Cotisation mise à jour', { id: cotisationId })
    return data
  } catch (err) {
    logError('updateCotisation exception', err)
    throw err
  }
}

export async function validateCotisation(cotisationId, { date_paiement = null, admin_id = null } = {}) {
  try {
    const effectiveDate = date_paiement || new Date().toISOString().split('T')[0]
    const periode = resolvePeriode({
      periode_mois: null,
      periode_annee: null,
      referenceDate: effectiveDate,
    })

    const { data, error } = await supabaseTresorerie
      .from('cotisations')
      .update({
        statut_paiement: 'paye',
        date_paiement: effectiveDate,
        periode_mois: periode.periode_mois,
        periode_annee: periode.periode_annee,
      })
      .eq('id', cotisationId)
      .select()
      .single()

    if (error) {
      logError('validateCotisation error', error)
      throw new Error('Impossible de valider la cotisation')
    }

    if (!data) {
      return null
    }

    await logHistoriqueAction('cotisation_validated', {
      membre_id: data.membre_id,
      montant: data.montant,
      description: `Cotisation validée ${buildPeriodLabel(data.periode_mois, data.periode_annee, data.date_paiement)}`,
      admin_id,
    })

    return data
  } catch (err) {
    logError('validateCotisation exception', err)
    throw err
  }
}

export async function resetCotisation(cotisationId, { admin_id = null } = {}) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('cotisations')
      .update({
        statut_paiement: 'en_attente',
        date_paiement: null,
      })
      .eq('id', cotisationId)
      .select()
      .single()

    if (error) {
      logError('resetCotisation error', error)
      throw new Error('Impossible de réinitialiser la cotisation')
    }

    if (!data) {
      return null
    }

    await logHistoriqueAction('cotisation_reset', {
      membre_id: data.membre_id,
      montant: data.montant,
      description: `Cotisation remise en attente`,
      admin_id,
    })

    return data
  } catch (err) {
    logError('resetCotisation exception', err)
    throw err
  }
}

export async function deleteCotisation(cotisationId, { admin_id = null } = {}) {
  try {
    const { data: existing, error: fetchError } = await supabaseTresorerie
      .from('cotisations')
      .select('*')
      .eq('id', cotisationId)
      .maybeSingle()

    if (fetchError) {
      logError('deleteCotisation fetch error', fetchError)
      throw new Error('Impossible de récupérer la cotisation')
    }

    if (!existing) {
      return null
    }

    const { error: deleteError } = await supabaseTresorerie.from('cotisations').delete().eq('id', cotisationId)

    if (deleteError) {
      logError('deleteCotisation error', deleteError)
      throw new Error('Impossible de supprimer la cotisation')
    }

    await logHistoriqueAction('cotisation_deleted', {
      membre_id: existing.membre_id,
      montant: existing.montant,
      description: `Suppression cotisation ${buildPeriodLabel(
        existing.periode_mois,
        existing.periode_annee,
        existing.date_paiement
      )}`,
      admin_id,
    })

    return existing
  } catch (err) {
    logError('deleteCotisation exception', err)
    throw err
  }
}

// ========== PAIEMENTS ==========

/**
 * Récupère tous les paiements avec pagination et filtres
 */
export async function getAllPaiements({ page = 1, limit = 20, search = '', type_paiement = '', statut = '' }) {
  try {
    logInfo('getAllPaiements: Requête initiale', { page, limit, search, type_paiement, statut })
    let query = supabaseTresorerie
      .from('paiements')
      .select('*', { count: 'exact' })
      .order('date_paiement', { ascending: false })

    if (type_paiement) {
      query = query.eq('type_paiement', type_paiement)
    }

    if (statut) {
      query = query.eq('statut', statut)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: paiements, error, count } = await query

    if (error) {
      logError('getAllPaiements error', error)
      throw new Error('Erreur lors de la récupération des paiements')
    }

    logInfo('getAllPaiements: Paiements récupérés', { count: paiements?.length || 0, total: count || 0 })

    if (!paiements || paiements.length === 0) {
      return {
        paiements: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir avec les données des membres
    const paiementsWithMembers = await Promise.all(
      paiements.map(async (paiement) => {
        let membre = null
        if (paiement.membre_id) {
          try {
            const { data: membreData } = await supabaseAdhesion
              .from('members')
              .select('id, prenom, nom, email, numero_membre')
              .eq('id', paiement.membre_id)
              .maybeSingle()
            membre = membreData
          } catch (err) {
            logError(`Error fetching member for paiement ${paiement.id}: ${err.message}`)
          }
        }
        return {
          ...paiement,
          membre: membre,
        }
      })
    )

    return {
      paiements: paiementsWithMembers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllPaiements exception', err)
    throw err
  }
}

/**
 * Crée un nouveau paiement
 */
export async function createPaiement(paiementData) {
  try {
    const periode = resolvePeriode({
      periode_mois: paiementData.periode_mois,
      periode_annee: paiementData.periode_annee,
      referenceDate: paiementData.date_paiement,
    })

    const { data, error } = await supabaseTresorerie
      .from('paiements')
      .insert({
        membre_id: paiementData.membre_id || null,
        type_paiement: paiementData.type_paiement,
        montant: paiementData.montant,
        mode_paiement: paiementData.mode_paiement || null,
        statut: paiementData.statut || 'valide',
        date_paiement: paiementData.date_paiement || new Date().toISOString().split('T')[0],
        periode_mois: periode.periode_mois,
        periode_annee: periode.periode_annee,
        details: paiementData.details || null,
      })
      .select()
      .single()

    if (error) {
      logError('createPaiement error', error)
      throw new Error('Erreur lors de la création du paiement')
    }

    logInfo('Paiement créé', { id: data.id })
    await logHistoriqueAction('paiement_created', {
      membre_id: data.membre_id,
      montant: data.montant,
      description: `Paiement ${data.type_paiement || ''}`.trim(),
    })
    return data
  } catch (err) {
    logError('createPaiement exception', err)
    throw err
  }
}

/**
 * Met à jour un paiement
 */
export async function updatePaiement(paiementId, updates) {
  try {
    const payload = { ...updates }
    if (updates.periode_mois || updates.periode_annee || updates.date_paiement) {
      const periode = resolvePeriode({
        periode_mois: updates.periode_mois,
        periode_annee: updates.periode_annee,
        referenceDate: updates.date_paiement,
      })
      payload.periode_mois = periode.periode_mois
      payload.periode_annee = periode.periode_annee
    }

    const { data, error } = await supabaseTresorerie
      .from('paiements')
      .update(payload)
      .eq('id', paiementId)
      .select()
      .single()

    if (error) {
      logError('updatePaiement error', error)
      throw new Error('Erreur lors de la mise à jour du paiement')
    }

    logInfo('Paiement mis à jour', { id: paiementId })
    return data
  } catch (err) {
    logError('updatePaiement exception', err)
    throw err
  }
}

export async function validatePaiement(paiementId, { date_paiement = null, admin_id = null } = {}) {
  try {
    const effectiveDate = date_paiement || new Date().toISOString().split('T')[0]
    const periode = resolvePeriode({
      periode_mois: null,
      periode_annee: null,
      referenceDate: effectiveDate,
    })

    const { data, error } = await supabaseTresorerie
      .from('paiements')
      .update({
        statut: 'valide',
        date_paiement: effectiveDate,
        periode_mois: periode.periode_mois,
        periode_annee: periode.periode_annee,
      })
      .eq('id', paiementId)
      .select()
      .single()

    if (error) {
      logError('validatePaiement error', error)
      throw new Error('Impossible de valider le paiement')
    }

    if (!data) {
      return null
    }

    await logHistoriqueAction('paiement_validated', {
      membre_id: data.membre_id,
      montant: data.montant,
      description: `Paiement validé (${data.type_paiement || 'N/A'})`,
      admin_id,
    })

    return data
  } catch (err) {
    logError('validatePaiement exception', err)
    throw err
  }
}

export async function cancelPaiement(paiementId, { admin_id = null, reason = '' } = {}) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('paiements')
      .update({
        statut: 'annule',
      })
      .eq('id', paiementId)
      .select()
      .single()

    if (error) {
      logError('cancelPaiement error', error)
      throw new Error('Impossible d’annuler le paiement')
    }

    if (!data) {
      return null
    }

    await logHistoriqueAction('paiement_cancelled', {
      membre_id: data.membre_id,
      montant: data.montant,
      description: reason ? `Paiement annulé (${reason})` : 'Paiement annulé',
      admin_id,
    })

    return data
  } catch (err) {
    logError('cancelPaiement exception', err)
    throw err
  }
}

export async function deletePaiement(paiementId, { admin_id = null } = {}) {
  try {
    const { data: existing, error: fetchError } = await supabaseTresorerie
      .from('paiements')
      .select('*')
      .eq('id', paiementId)
      .maybeSingle()

    if (fetchError) {
      logError('deletePaiement fetch error', fetchError)
      throw new Error('Impossible de récupérer le paiement')
    }

    if (!existing) {
      return null
    }

    const { error: deleteError } = await supabaseTresorerie.from('paiements').delete().eq('id', paiementId)

    if (deleteError) {
      logError('deletePaiement error', deleteError)
      throw new Error('Impossible de supprimer le paiement')
    }

    await logHistoriqueAction('paiement_deleted', {
      membre_id: existing.membre_id,
      montant: existing.montant,
      description: `Suppression paiement ${existing.type_paiement || ''}`.trim(),
      admin_id,
    })

    return existing
  } catch (err) {
    logError('deletePaiement exception', err)
    throw err
  }
}

// ========== DEPENSES ==========

export async function getAllDepenses({ page = 1, limit = 20, statut = '', categorie = '' }) {
  try {
    logInfo('getAllDepenses: Requête initiale', { page, limit, statut, categorie })
    let query = supabaseTresorerie
      .from('depenses')
      .select('*', { count: 'exact' })
      .order('date_depense', { ascending: false })

    if (statut) {
      query = query.eq('statut', statut)
    }

    if (categorie) {
      query = query.ilike('categorie', `%${categorie}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: depenses, error, count } = await query

    if (error) {
      logError('getAllDepenses error', error)
      throw new Error('Erreur lors de la récupération des dépenses')
    }

    const depensesWithEuros = (depenses || []).map((depense) => ({
      ...depense,
      montant_eur: convertCurrencyToEuro(depense.montant, depense.devise),
    }))

    return {
      depenses: depensesWithEuros,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllDepenses exception', err)
    throw err
  }
}

export async function createDepense(depenseData) {
  try {
    const payload = {
      titre: depenseData.titre,
      description: depenseData.description || null,
      montant: depenseData.montant,
      devise: depenseData.devise || 'EUR',
      categorie: depenseData.categorie || null,
      statut: depenseData.statut || 'planifie',
      date_depense: depenseData.date_depense || new Date().toISOString().split('T')[0],
      justificatif_url: depenseData.justificatif_url || null,
      cree_par: depenseData.cree_par || null,
    }

    const { data, error } = await supabaseTresorerie
      .from('depenses')
      .insert(payload)
      .select()
      .single()

    if (error) {
      logError('createDepense error', error)
      throw new Error('Erreur lors de la création de la dépense')
    }

    logInfo('Dépense créée', { id: data.id })
    await logHistoriqueAction('depense_created', {
      montant: data.montant,
      description: data.titre,
    })
    return {
      ...data,
      montant_eur: convertCurrencyToEuro(data.montant, data.devise),
    }
  } catch (err) {
    logError('createDepense exception', err)
    throw err
  }
}

export async function updateDepense(depenseId, updates) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('depenses')
      .update(updates)
      .eq('id', depenseId)
      .select()
      .single()

    if (error) {
      logError('updateDepense error', error)
      throw new Error('Erreur lors de la mise à jour de la dépense')
    }

    logInfo('Dépense mise à jour', { id: depenseId })
    if (updates.statut && updates.statut === 'valide') {
      await logHistoriqueAction('depense_validated', {
        montant: data.montant,
        description: `Dépense validée: ${data.titre}`,
      })
    }
    return {
      ...data,
      montant_eur: convertCurrencyToEuro(data.montant, data.devise),
    }
  } catch (err) {
    logError('updateDepense exception', err)
    throw err
  }
}

export async function validateDepense(depenseId, { admin_id = null } = {}) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('depenses')
      .update({
        statut: 'valide',
      })
      .eq('id', depenseId)
      .select()
      .single()

    if (error) {
      logError('validateDepense error', error)
      throw new Error('Impossible de valider la dépense')
    }

    if (!data) {
      return null
    }

    await logHistoriqueAction('depense_validated', {
      montant: data.montant,
      description: `Dépense validée: ${data.titre}`,
      admin_id,
    })

    return {
      ...data,
      montant_eur: convertCurrencyToEuro(data.montant, data.devise),
    }
  } catch (err) {
    logError('validateDepense exception', err)
    throw err
  }
}

export async function rejectDepense(depenseId, { admin_id = null, reason = '' } = {}) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('depenses')
      .update({
        statut: 'rejete',
      })
      .eq('id', depenseId)
      .select()
      .single()

    if (error) {
      logError('rejectDepense error', error)
      throw new Error('Impossible de rejeter la dépense')
    }

    if (!data) {
      return null
    }

    await logHistoriqueAction('depense_rejected', {
      montant: data.montant,
      description: reason ? `Rejet dépense: ${data.titre} (${reason})` : `Rejet dépense: ${data.titre}`,
      admin_id,
    })

    return {
      ...data,
      montant_eur: convertCurrencyToEuro(data.montant, data.devise),
    }
  } catch (err) {
    logError('rejectDepense exception', err)
    throw err
  }
}

export async function deleteDepense(depenseId, { admin_id = null } = {}) {
  try {
    const { data: existing, error: fetchError } = await supabaseTresorerie
      .from('depenses')
      .select('*')
      .eq('id', depenseId)
      .maybeSingle()

    if (fetchError) {
      logError('deleteDepense fetch error', fetchError)
      throw new Error('Impossible de récupérer la dépense')
    }

    if (!existing) {
      return null
    }

    const { error: deleteError } = await supabaseTresorerie.from('depenses').delete().eq('id', depenseId)

    if (deleteError) {
      logError('deleteDepense error', deleteError)
      throw new Error('Impossible de supprimer la dépense')
    }

    await logHistoriqueAction('depense_deleted', {
      montant: existing.montant,
      description: `Suppression dépense: ${existing.titre}`,
      admin_id,
    })

    return existing
  } catch (err) {
    logError('deleteDepense exception', err)
    throw err
  }
}

// ========== HISTORIQUE ==========

export async function getHistorique({ page = 1, limit = 20, action = '' }) {
  try {
    logInfo('getHistorique: Requête initiale', { page, limit, action })
    let query = supabaseTresorerie
      .from('historique')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (action) {
      query = query.eq('action', action)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: historique, error, count } = await query

    if (error) {
      logError('getHistorique error', error)
      throw new Error('Erreur lors de la récupération de l’historique')
    }

    return {
      historique: historique || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getHistorique exception', err)
    throw err
  }
}

export async function createHistoriqueEntry(entryData) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('historique')
      .insert({
        action: entryData.action,
        membre_id: entryData.membre_id || null,
        montant: entryData.montant || null,
        description: entryData.description || null,
        admin_id: entryData.admin_id || null,
      })
      .select()
      .single()

    if (error) {
      logError('createHistoriqueEntry error', error)
      throw new Error('Erreur lors de la création de l’entrée d’historique')
    }

    logInfo('Historique ajouté', { id: data.id })
    return data
  } catch (err) {
    logError('createHistoriqueEntry exception', err)
    throw err
  }
}

// ========== RELANCES ==========

/**
 * Récupère toutes les relances avec pagination et filtres
 */
export async function getAllRelances({ page = 1, limit = 20, annee = '', type_relance = '', statut = '' }) {
  try {
    logInfo('getAllRelances: Requête initiale', { page, limit, annee, type_relance, statut })
    let query = supabaseTresorerie
      .from('relances')
      .select('*', { count: 'exact' })
      .order('date_relance', { ascending: false })

    if (annee) {
      query = query.eq('annee', parseInt(annee))
    }

    if (type_relance) {
      query = query.eq('type_relance', type_relance)
    }

    if (statut) {
      query = query.eq('statut', statut)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: relances, error, count } = await query

    if (error) {
      logError('getAllRelances error', error)
      throw new Error('Erreur lors de la récupération des relances')
    }

    logInfo('getAllRelances: Relances récupérées', { count: relances?.length || 0, total: count || 0 })

    if (!relances || relances.length === 0) {
      return {
        relances: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }

    // Enrichir avec les données des membres
    const relancesWithMembers = await Promise.all(
      relances.map(async (relance) => {
        let membre = null
        if (relance.membre_id) {
          try {
            const { data: membreData } = await supabaseAdhesion
              .from('members')
              .select('id, prenom, nom, email, numero_membre')
              .eq('id', relance.membre_id)
              .maybeSingle()
            membre = membreData
          } catch (err) {
            logError(`Error fetching member for relance ${relance.id}: ${err.message}`)
          }
        }
        return {
          ...relance,
          membre: membre,
        }
      })
    )

    return {
      relances: relancesWithMembers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (err) {
    logError('getAllRelances exception', err)
    throw err
  }
}

/**
 * Crée une nouvelle relance
 */
export async function createRelance(relanceData) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('relances')
      .insert({
        membre_id: relanceData.membre_id,
        annee: relanceData.annee,
        type_relance: relanceData.type_relance,
        statut: relanceData.statut || 'envoyee',
        commentaire: relanceData.commentaire || null,
      })
      .select()
      .single()

    if (error) {
      logError('createRelance error', error)
      throw new Error('Erreur lors de la création de la relance')
    }

    logInfo('Relance créée', { id: data.id })
    return data
  } catch (err) {
    logError('createRelance exception', err)
    throw err
  }
}

// ========== CARTES MEMBRES ==========

/**
 * Récupère toutes les cartes membres avec pagination et filtres
 */
export async function getAllCartesMembres({ page = 1, limit = 1000, search = '', statut_carte = '', statut_paiement = '' }) {
  try {
    logInfo('getAllCartesMembres: Requête initiale', { page, limit, search, statut_carte, statut_paiement })
    
    // Récupérer toutes les cartes sans limite de pagination pour avoir tous les membres
    let query = supabaseTresorerie
      .from('cartes_membres')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statut_carte) {
      query = query.eq('statut_carte', statut_carte)
    }

    if (statut_paiement) {
      query = query.eq('statut_paiement', statut_paiement)
    }

    if (search) {
      query = query.ilike('numero_membre', `%${search}%`)
    }

    // Ne pas utiliser .range() pour récupérer tous les membres
    const { data: cartes, error, count } = await query

    if (error) {
      logError('getAllCartesMembres error', error)
      throw new Error('Erreur lors de la récupération des cartes membres')
    }

    logInfo('getAllCartesMembres: Cartes récupérées', { count: cartes?.length || 0, total: count || 0 })

    // Récupérer les informations des membres pour chaque carte
    const cartesWithMembers = await Promise.all(
      (cartes || []).map(async (carte) => {
        const info = getTarifInfoForCountry(carte.pays)
        
        // Récupérer les informations du membre depuis la table members
        let membreInfo = null
        if (carte.numero_membre) {
          try {
            const { data: membre, error: membreError } = await supabaseAdhesion
              .from('members')
              .select('id, prenom, nom, email')
              .eq('numero_membre', carte.numero_membre)
              .maybeSingle()
            
            if (!membreError && membre) {
              membreInfo = {
                prenom: membre.prenom || '',
                nom: membre.nom || '',
                email: membre.email || '',
              }
            }
          } catch (membreErr) {
            logWarning('Erreur récupération membre pour carte', {
              numeroMembre: carte.numero_membre,
              error: membreErr.message,
            })
          }
        }

        return {
          ...carte,
          devise: info.devise,
          currencySymbol: info.symbol,
          membre: membreInfo,
        }
      })
    )

    return {
      cartes: cartesWithMembers,
      pagination: {
        page: 1,
        limit: count || 0,
        total: count || 0,
        totalPages: 1,
      },
    }
  } catch (err) {
    logError('getAllCartesMembres exception', err)
    throw err
  }
}

/**
 * Génère le PDF de la carte membre
 */
async function generateCarteMembrePDF(membre, carteData) {
  // Format A4 paysage (comme dans CarteMembreGenerator)
  // A4 = 297mm x 210mm en paysage
  const doc = new PDFDocument({ 
    size: 'A4',
    layout: 'landscape',
    margin: 0
  })
  
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))

  // Dimensions de la page en points
  const pageWidth = doc.page.width
  const pageHeight = doc.page.height

  // Couleurs
  const primaryColor = '#0d47a1' // Bleu ASGF
  const accentColor = '#e53935' // Rouge ASGF
  const textColor = '#020617'
  const lightGray = '#f8fafc'
  const borderGray = '#e2e8f0'

  // Fond blanc
  doc.rect(0, 0, pageWidth, pageHeight)
    .fill('#ffffff')

  // Dégradé de fond (simulé)
  doc.rect(0, 0, pageWidth, pageHeight)
    .fillOpacity(0.1)
    .fill('#3b82f6')

  // En-tête
  const headerHeight = 80
  doc.rect(0, 0, pageWidth, headerHeight)
    .fill('#ffffff')
  
  doc.fontSize(18)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text('Association des Sénégalais Géomaticiens de France', 30, 24, { width: pageWidth - 60 })
  
  doc.fontSize(12)
    .fillColor('#475569')
    .font('Helvetica')
    .text('Carte de membre officielle', 30, 50, { width: pageWidth - 60 })

  // Zone de contenu principale
  const contentTop = headerHeight + 20
  const contentHeight = pageHeight - contentTop - 60
  const photoWidth = 200
  const photoHeight = (photoWidth * 4) / 3 // Ratio 3:4
  const contentLeft = 30
  const infoLeft = contentLeft + photoWidth + 30

  // Photo du membre (à gauche)
  const photoTop = contentTop + 20
  const photoLeft = contentLeft
  
  // Cadre photo
  doc.rect(photoLeft, photoTop, photoWidth, photoHeight)
    .stroke(borderGray)
    .fill(lightGray)

  // Télécharger et inclure la photo si disponible
  const photoUrl = carteData.photo_url || membre?.photo_url || null
  if (photoUrl) {
    try {
      let photoBuffer = null
      let imageType = 'JPEG'

      // Vérifier si c'est une data URL (base64)
      if (photoUrl.startsWith('data:image/')) {
        logInfo('Photo en format base64 détectée')
        // Extraire le type et les données base64
        const matches = photoUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (matches) {
          imageType = matches[1].toUpperCase()
          const base64Data = matches[2]
          photoBuffer = Buffer.from(base64Data, 'base64')
          logInfo('Photo base64 décodée', { imageType, size: photoBuffer.length })
        }
      } else {
        // C'est une URL, télécharger l'image
        logInfo('Téléchargement photo membre depuis URL', { photoUrl: photoUrl.substring(0, 100) })
        const fetch = (await import('node-fetch')).default
        const photoResponse = await fetch(photoUrl)
        
        if (photoResponse.ok) {
          photoBuffer = await photoResponse.buffer()
          // Détecter le type d'image depuis l'URL ou le buffer
          if (photoUrl.includes('.png') || photoBuffer[0] === 0x89) {
            imageType = 'PNG'
          } else if (photoUrl.includes('.gif') || photoBuffer[0] === 0x47) {
            imageType = 'GIF'
          } else if (photoUrl.includes('.webp')) {
            imageType = 'WEBP'
          }
          logInfo('Photo téléchargée depuis URL', { imageType, size: photoBuffer.length })
        } else {
          logWarning('Impossible de télécharger la photo', { status: photoResponse.status })
        }
      }

      // Ajouter l'image au PDF si disponible
      if (photoBuffer) {
        try {
          doc.image(photoBuffer, photoLeft + 10, photoTop + 10, {
            width: photoWidth - 20,
            height: photoHeight - 20,
            fit: [photoWidth - 20, photoHeight - 20],
            align: 'center',
            valign: 'center',
          })
          logInfo('Photo incluse dans le PDF avec succès', { imageType })
        } catch (imageErr) {
          logWarning('Erreur ajout image au PDF', { error: imageErr.message })
          // Continuer sans photo
        }
      }
    } catch (photoErr) {
      logWarning('Erreur traitement photo', { error: photoErr.message })
      // Continuer sans photo
    }
  } else {
    logInfo('Aucune photo fournie pour la carte membre')
  }

  // Numéro de membre sous la photo
  doc.fontSize(10)
    .fillColor('#475569')
    .font('Helvetica')
    .text('Matricule', photoLeft, photoTop + photoHeight + 10, { 
      width: photoWidth, 
      align: 'center' 
    })
  
  doc.fontSize(16)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(carteData.numero_membre || membre?.numero_membre || 'XXXX-000', photoLeft, photoTop + photoHeight + 25, { 
      width: photoWidth, 
      align: 'center' 
    })

  // Informations du membre (à droite)
  const prenom = membre?.prenom || carteData.prenom || ''
  const nom = membre?.nom || carteData.nom || ''
  const numeroMembre = carteData.numero_membre || membre?.numero_membre || ''
  const dateEmission = carteData.date_emission || new Date().toISOString().split('T')[0]
  const dateValidite = carteData.date_validite || null
  const statutCarte = carteData.statut_carte || 'Membre actif'
  const fonction = carteData.fonction || membre?.fonction || ''
  const pays = carteData.pays || membre?.pays || ''
  const ville = carteData.ville || membre?.ville || ''
  const section = pays ? `${pays}${ville ? ` / ${ville}` : ''}` : 'France'

  // Nom du membre (grand)
  doc.fontSize(40)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(`${prenom} ${nom.toUpperCase()}`, infoLeft, contentTop + 20, { 
      width: pageWidth - infoLeft - 30 
    })

  // Fonction
  if (fonction) {
    doc.fontSize(20)
      .fillColor('#3b82f6')
      .font('Helvetica')
      .text(fonction, infoLeft, contentTop + 70, { 
        width: pageWidth - infoLeft - 30 
      })
  }

  // Informations détaillées
  let infoY = contentTop + 120

  // Statut
  doc.fontSize(10)
    .fillColor('#475569')
    .font('Helvetica')
    .text('STATUT', infoLeft, infoY, { width: 150 })
  
  doc.fontSize(16)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(statutCarte, infoLeft, infoY + 15, { width: 150 })

  // Section
  doc.fontSize(10)
    .fillColor('#475569')
    .font('Helvetica')
    .text('SECTION', infoLeft + 200, infoY, { width: 150 })
  
  doc.fontSize(16)
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(section, infoLeft + 200, infoY + 15, { width: 150 })

  // Validité
  infoY += 60
  doc.fontSize(10)
    .fillColor('#475569')
    .font('Helvetica')
    .text('VALIDITÉ', infoLeft, infoY, { width: pageWidth - infoLeft - 30 })
  
  if (dateEmission && dateValidite) {
    const dateEmissionFR = new Date(dateEmission + 'T00:00:00').toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    const dateValiditeFR = new Date(dateValidite + 'T00:00:00').toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    doc.fontSize(16)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(`Du ${dateEmissionFR} au ${dateValiditeFR}`, infoLeft, infoY + 15, { 
        width: pageWidth - infoLeft - 30 
      })
  }

  // Signature et date en bas
  const footerY = pageHeight - 80
  doc.fontSize(10)
    .fillColor('#475569')
    .font('Helvetica')
    .text('Émis le', infoLeft, footerY, { width: 200 })
  
  if (dateEmission) {
    const dateEmissionFR = new Date(dateEmission + 'T00:00:00').toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    doc.fontSize(12)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(dateEmissionFR, infoLeft, footerY + 15, { width: 200 })
  }

  // Barre de couleur en bas
  doc.rect(0, pageHeight - 10, pageWidth, 10)
    .fill('#3b82f6')

  doc.end()

  const buffer = await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  return buffer
}

/**
 * Upload le PDF sur Google Drive via Google Apps Script
 */
async function uploadCartePDFToDrive(pdfBuffer, numeroMembre) {
  const APPSCRIPT_WEBHOOK_URL = process.env.APPSCRIPT_CONTACT_WEBHOOK_URL || ''
  const APPSCRIPT_WEBHOOK_TOKEN = process.env.APPSCRIPT_CONTACT_TOKEN || ''
  const GOOGLE_DRIVE_FOLDER_ID = '1iSFImqsc4AeDFeTesNpDl8uIsi1ocdx6'

  if (!APPSCRIPT_WEBHOOK_URL) {
    logWarning('Apps Script webhook non configuré, upload PDF ignoré')
    return null
  }

  try {
    // Convertir le buffer en base64
    const pdfBase64 = pdfBuffer.toString('base64')
    const fileName = `CARTE-${numeroMembre}.pdf`

    const payload = {
      type: 'upload_pdf',
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      fileName: fileName,
      fileData: pdfBase64,
      mimeType: 'application/pdf',
      token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
    }

    logInfo('Upload PDF carte membre vers Google Drive', {
      fileName,
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
      webhookUrl: APPSCRIPT_WEBHOOK_URL ? 'Configuré' : 'Non configuré',
      hasToken: !!APPSCRIPT_WEBHOOK_TOKEN,
      payloadSize: `${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`,
    })

    if (!APPSCRIPT_WEBHOOK_URL) {
      logError('APPSCRIPT_WEBHOOK_URL non configuré - Impossible d\'uploader le PDF')
      return null
    }

    const fetch = (await import('node-fetch')).default
    
    logInfo('Envoi requête vers Google Apps Script', {
      url: APPSCRIPT_WEBHOOK_URL.substring(0, 50) + '...',
      method: 'POST',
      hasToken: !!APPSCRIPT_WEBHOOK_TOKEN,
    })
    
    const response = await fetch(APPSCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(APPSCRIPT_WEBHOOK_TOKEN && { 'x-contact-token': APPSCRIPT_WEBHOOK_TOKEN }),
      },
      body: JSON.stringify(payload),
    })

    logInfo('Réponse reçue de Google Apps Script', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      logError('Erreur upload PDF vers Google Drive', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500),
      })
      return null
    }

    try {
      logInfo('Parsing réponse Google Apps Script', {
        responseLength: responseText.length,
        preview: responseText.substring(0, 200),
      })
      
      const responseData = JSON.parse(responseText)
      
      logInfo('Réponse parsée', {
        success: responseData.success,
        hasFileUrl: !!responseData.fileUrl,
        message: responseData.message,
        error: responseData.error,
      })
      
      if (responseData.success && responseData.fileUrl) {
        logInfo('PDF uploadé avec succès sur Google Drive', {
          fileName,
          fileUrl: responseData.fileUrl,
          fileId: responseData.fileId,
          folderId: responseData.folderId,
        })
        return responseData.fileUrl
      } else {
        logWarning('Upload PDF échoué - Réponse indique échec', {
          message: responseData.message,
          error: responseData.error,
          success: responseData.success,
        })
        return null
      }
    } catch (parseErr) {
      logError('Erreur parsing réponse upload PDF', {
        error: parseErr.message,
        responseText: responseText.substring(0, 500),
        responseLength: responseText.length,
      })
      return null
    }
  } catch (err) {
    logError('Exception upload PDF vers Google Drive', err)
    return null
  }
}

/**
 * Crée une nouvelle carte membre
 */
export async function createCarteMembre(carteData) {
  try {
    logInfo('createCarteMembre appelé', { 
      carteDataKeys: Object.keys(carteData),
      membre_id: carteData.membre_id,
      numero_membre: carteData.numero_membre,
    })
    
    let membre = null
    if (carteData.membre_id) {
      // Récupérer toutes les informations du membre pour la carte
      logInfo('Récupération membre par ID', { membre_id: carteData.membre_id })
      const { data, error } = await supabaseAdhesion
        .from('members')
        .select('*')
        .eq('id', carteData.membre_id)
        .maybeSingle()
      if (error) {
        logError('fetchMemberById error', error)
        throw new Error("Impossible de récupérer le membre associé à la carte")
      }
      membre = data
      logInfo('Membre récupéré par ID', { 
        membreId: membre?.id, 
        numeroMembre: membre?.numero_membre,
        nom: membre?.nom,
        prenom: membre?.prenom,
      })
    } else if (carteData.numero_membre) {
      // Récupérer toutes les informations du membre pour la carte
      logInfo('Récupération membre par numéro', { numero_membre: carteData.numero_membre })
      const { data, error } = await supabaseAdhesion
        .from('members')
        .select('*')
        .eq('numero_membre', carteData.numero_membre)
        .maybeSingle()
      if (error) {
        logError('fetchMemberByNumero error', error)
        throw new Error("Impossible de récupérer le membre associé à la carte")
      }
      membre = data
      logInfo('Membre récupéré par numéro', { 
        membreId: membre?.id, 
        numeroMembre: membre?.numero_membre,
        nom: membre?.nom,
        prenom: membre?.prenom,
      })
    } else {
      logWarning('Aucun membre_id ni numero_membre fourni dans carteData', { carteData })
    }

    const numeroMembre = carteData.numero_membre || membre?.numero_membre
    if (!numeroMembre) {
      logError('Numéro de membre manquant', { 
        carteData,
        membre,
        membreId: membre?.id,
      })
      throw new Error('Le numéro de membre est obligatoire pour créer une carte')
    }
    
    logInfo('Numéro de membre trouvé', { numeroMembre })

    const pays = carteData.pays || membre?.pays || null
    const tarifInfo = getTarifInfoForCountry(pays)

    // Générer le PDF de la carte
    let lienPdf = null
    try {
      logInfo('Génération PDF carte membre', { numeroMembre, membreId: membre?.id })
      const pdfBuffer = await generateCarteMembrePDF(membre, carteData)
      logInfo('PDF généré avec succès', { 
        numeroMembre, 
        size: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
      })
      
      lienPdf = await uploadCartePDFToDrive(pdfBuffer, numeroMembre)
      
      if (!lienPdf) {
        logWarning('PDF non uploadé, carte créée sans lien PDF', { 
          numeroMembre,
          note: 'Vérifiez les logs pour plus de détails sur l\'erreur d\'upload'
        })
      } else {
        logInfo('PDF uploadé avec succès', { numeroMembre, lienPdf })
      }
    } catch (pdfErr) {
      logError('Erreur génération/upload PDF carte membre', {
        numeroMembre,
        error: pdfErr.message,
        stack: pdfErr.stack,
      })
      // Ne pas bloquer la création de la carte si le PDF échoue
      // mais logger l'erreur pour diagnostic
    }

    logInfo('Sauvegarde carte membre dans la base de données', {
      numeroMembre,
      lienPdf,
      hasLienPdf: !!lienPdf,
    })

    // Vérifier si la carte existe déjà
    const { data: existingCarte } = await supabaseTresorerie
      .from('cartes_membres')
      .select('*')
      .eq('numero_membre', numeroMembre)
      .maybeSingle()

    let data
    let error

    if (existingCarte) {
      // Mettre à jour la carte existante
      logInfo('Carte existante trouvée, mise à jour', {
        carteId: existingCarte.id,
        numeroMembre,
        existingLienPdf: existingCarte.lien_pdf,
        newLienPdf: lienPdf,
      })
      
      const updateData = {
        ...(carteData.date_emission && { date_emission: carteData.date_emission }),
        ...(carteData.date_validite && { date_validite: carteData.date_validite }),
        ...(pays && { pays }),
        ...(carteData.statut_carte && { statut_carte: carteData.statut_carte }),
        ...(carteData.statut_paiement !== undefined && { statut_paiement: carteData.statut_paiement }),
        ...(lienPdf && { lien_pdf: lienPdf }), // Mettre à jour le lien PDF si généré
      }

      const result = await supabaseTresorerie
        .from('cartes_membres')
        .update(updateData)
        .eq('id', existingCarte.id)
        .select()
        .single()

      data = result.data
      error = result.error
    } else {
      // Créer une nouvelle carte
      const result = await supabaseTresorerie
        .from('cartes_membres')
        .insert({
          numero_membre: numeroMembre,
          date_emission: carteData.date_emission || null,
          date_validite: carteData.date_validite || null,
          pays,
          statut_carte: carteData.statut_carte || null,
          statut_paiement: carteData.statut_paiement || null,
          lien_pdf: lienPdf || carteData.lien_pdf || null,
        })
        .select()
        .single()

      data = result.data
      error = result.error
    }

    if (error) {
      logError('createCarteMembre error - Erreur insertion/mise à jour base de données', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        numeroMembre,
        lienPdf,
        isUpdate: !!existingCarte,
      })
      
      // Si c'est une erreur de contrainte unique, c'est que la carte existe déjà
      if (error.code === '23505') {
        logWarning('Carte existe déjà, tentative de mise à jour', { numeroMembre })
        // Essayer de mettre à jour la carte existante
        try {
          const updateResult = await supabaseTresorerie
            .from('cartes_membres')
            .update({
              ...(carteData.date_emission && { date_emission: carteData.date_emission }),
              ...(carteData.date_validite && { date_validite: carteData.date_validite }),
              ...(pays && { pays }),
              ...(carteData.statut_carte && { statut_carte: carteData.statut_carte }),
              ...(carteData.statut_paiement !== undefined && { statut_paiement: carteData.statut_paiement }),
              ...(lienPdf && { lien_pdf: lienPdf }),
            })
            .eq('numero_membre', numeroMembre)
            .select()
            .single()
          
          if (updateResult.error) {
            throw updateResult.error
          }
          
          data = updateResult.data
          error = null
          logInfo('Carte mise à jour avec succès après erreur de contrainte', { numeroMembre, carteId: data.id })
        } catch (updateErr) {
          logError('Erreur lors de la mise à jour après contrainte unique', { error: updateErr })
          throw new Error(`Erreur lors de la création/mise à jour de la carte membre: ${error.message}`)
        }
      } else {
        throw new Error(`Erreur lors de la création/mise à jour de la carte membre: ${error.message}`)
      }
    }

    logInfo('Carte membre créée avec succès', { 
      id: data.id, 
      numeroMembre: data.numero_membre,
      lienPdf: data.lien_pdf,
      lienPdfSaved: !!data.lien_pdf,
    })
    
    // Vérifier que le lien PDF a bien été sauvegardé
    if (lienPdf && !data.lien_pdf) {
      logError('ATTENTION: lienPdf généré mais non sauvegardé dans la base de données', {
        lienPdf,
        savedLienPdf: data.lien_pdf,
        carteId: data.id,
      })
    }
    return {
      ...data,
      devise: tarifInfo.devise,
      currencySymbol: tarifInfo.symbol,
    }
  } catch (err) {
    logError('createCarteMembre exception', err)
    throw err
  }
}

/**
 * Met à jour le lien PDF d'une carte en cherchant le fichier sur Google Drive
 */
export async function updateCartePDFLink(numeroMembre) {
  try {
    logInfo('Mise à jour lien PDF pour carte', { numeroMembre })
    
    // Récupérer la carte
    const { data: carte, error: carteError } = await supabaseTresorerie
      .from('cartes_membres')
      .select('*')
      .eq('numero_membre', numeroMembre)
      .maybeSingle()

    if (carteError) {
      logError('Erreur récupération carte', { numeroMembre, error: carteError })
      throw new Error('Erreur lors de la récupération de la carte')
    }

    if (!carte) {
      throw new Error('Carte non trouvée')
    }

    // Le fichier devrait être sur Google Drive avec le nom CARTE-{numeroMembre}.pdf
    // On ne peut pas le récupérer directement depuis le backend, mais on peut
    // demander à Google Apps Script de le chercher et retourner le lien
    const APPSCRIPT_WEBHOOK_URL = process.env.APPSCRIPT_CONTACT_WEBHOOK_URL || ''
    const APPSCRIPT_WEBHOOK_TOKEN = process.env.APPSCRIPT_CONTACT_TOKEN || ''
    const GOOGLE_DRIVE_FOLDER_ID = '1iSFImqsc4AeDFeTesNpDl8uIsi1ocdx6'

    if (!APPSCRIPT_WEBHOOK_URL) {
      throw new Error('APPSCRIPT_WEBHOOK_URL non configuré')
    }

    const fileName = `CARTE-${numeroMembre}.pdf`
    const payload = {
      type: 'find_pdf_file',
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      fileName: fileName,
      token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
    }

    logInfo('Recherche fichier PDF sur Google Drive', { fileName, folderId: GOOGLE_DRIVE_FOLDER_ID })

    const fetch = (await import('node-fetch')).default
    const response = await fetch(APPSCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      logError('Erreur recherche PDF sur Google Drive', {
        status: response.status,
        body: responseText,
      })
      throw new Error('Erreur lors de la recherche du PDF sur Google Drive')
    }

    try {
      const responseData = JSON.parse(responseText)
      if (responseData.success && responseData.fileUrl) {
        // Mettre à jour la carte avec le lien
        const { data: updatedCarte, error: updateError } = await supabaseTresorerie
          .from('cartes_membres')
          .update({ lien_pdf: responseData.fileUrl })
          .eq('id', carte.id)
          .select()
          .single()

        if (updateError) {
          logError('Erreur mise à jour carte avec lien PDF', { carteId: carte.id, error: updateError })
          throw new Error('Erreur lors de la mise à jour de la carte')
        }

        logInfo('Lien PDF mis à jour avec succès', { 
          carteId: carte.id, 
          numeroMembre,
          lienPdf: responseData.fileUrl,
        })

        return updatedCarte
      } else {
        throw new Error(responseData.message || 'PDF non trouvé sur Google Drive')
      }
    } catch (parseErr) {
      logError('Erreur parsing réponse recherche PDF', {
        error: parseErr.message,
        responseText: responseText.substring(0, 500),
      })
      throw new Error('Erreur lors de la recherche du PDF')
    }
  } catch (err) {
    logError('updateCartePDFLink exception', err)
    throw err
  }
}

/**
 * Génère le PDF pour une carte existante qui n'a pas de PDF
 */
export async function generatePDFForCarte(carteId) {
  try {
    logInfo('Génération PDF pour carte existante', { carteId })
    
    // Récupérer la carte
    const { data: carte, error: carteError } = await supabaseTresorerie
      .from('cartes_membres')
      .select('*')
      .eq('id', carteId)
      .single()

    if (carteError || !carte) {
      logError('Carte non trouvée', { carteId, error: carteError })
      throw new Error('Carte non trouvée')
    }

    // Récupérer le membre
    const { data: membre, error: membreError } = await supabaseAdhesion
      .from('members')
      .select('*')
      .eq('numero_membre', carte.numero_membre)
      .maybeSingle()

    if (membreError) {
      logError('Erreur récupération membre', { numeroMembre: carte.numero_membre, error: membreError })
      throw new Error('Impossible de récupérer le membre')
    }

    if (!membre) {
      logError('Membre non trouvé', { numeroMembre: carte.numero_membre })
      throw new Error('Membre non trouvé')
    }

    // Générer le PDF
    logInfo('Génération PDF', { numeroMembre: carte.numero_membre })
    const pdfBuffer = await generateCarteMembrePDF(membre, carte)
    logInfo('PDF généré', { 
      numeroMembre: carte.numero_membre, 
      size: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
    })

    // Uploader le PDF
    const lienPdf = await uploadCartePDFToDrive(pdfBuffer, carte.numero_membre)

    if (!lienPdf) {
      logWarning('PDF non uploadé', { numeroMembre: carte.numero_membre })
      throw new Error('Échec de l\'upload du PDF')
    }

    // Mettre à jour la carte avec le lien PDF
    const { data: updatedCarte, error: updateError } = await supabaseTresorerie
      .from('cartes_membres')
      .update({ lien_pdf: lienPdf })
      .eq('id', carteId)
      .select()
      .single()

    if (updateError) {
      logError('Erreur mise à jour carte avec lien PDF', { carteId, error: updateError })
      throw new Error('Erreur lors de la mise à jour de la carte')
    }

    logInfo('PDF généré et enregistré avec succès', { 
      carteId, 
      numeroMembre: carte.numero_membre,
      lienPdf 
    })

    return updatedCarte
  } catch (err) {
    logError('generatePDFForCarte exception', err)
    throw err
  }
}

/**
 * Génère les PDF pour toutes les cartes qui n'ont pas de PDF
 */
export async function generateMissingPDFs() {
  try {
    logInfo('Génération PDF manquants - Début')
    
    // Récupérer toutes les cartes sans PDF
    const { data: cartes, error } = await supabaseTresorerie
      .from('cartes_membres')
      .select('*')
      .is('lien_pdf', null)

    if (error) {
      logError('Erreur récupération cartes sans PDF', error)
      throw new Error('Erreur lors de la récupération des cartes')
    }

    logInfo(`Trouvé ${cartes?.length || 0} cartes sans PDF`)

    const results = {
      success: 0,
      errors: 0,
      details: [],
    }

    for (const carte of cartes || []) {
      try {
        await generatePDFForCarte(carte.id)
        results.success++
        results.details.push({
          carteId: carte.id,
          numeroMembre: carte.numero_membre,
          status: 'success',
        })
      } catch (err) {
        results.errors++
        results.details.push({
          carteId: carte.id,
          numeroMembre: carte.numero_membre,
          status: 'error',
          error: err.message,
        })
        logError('Erreur génération PDF pour carte', {
          carteId: carte.id,
          numeroMembre: carte.numero_membre,
          error: err.message,
        })
      }
    }

    logInfo('Génération PDF manquants - Terminé', results)
    return results
  } catch (err) {
    logError('generateMissingPDFs exception', err)
    throw err
  }
}

/**
 * Met à jour une carte membre
 */
export async function updateCarteMembre(carteId, updates) {
  try {
    const { data, error } = await supabaseTresorerie
      .from('cartes_membres')
      .update(updates)
      .eq('id', carteId)
      .select()
      .single()

    if (error) {
      logError('updateCarteMembre error', error)
      throw new Error('Erreur lors de la mise à jour de la carte membre')
    }

    logInfo('Carte membre mise à jour', { id: carteId })
    return data
  } catch (err) {
    logError('updateCarteMembre exception', err)
    throw err
  }
}

/**
 * Récupère la carte membre par numero_membre
 */
export async function getCarteMembreByNumero(numeroMembre) {
  try {
    if (!numeroMembre) {
      return null
    }

    const { data, error } = await supabaseTresorerie
      .from('cartes_membres')
      .select('*')
      .eq('numero_membre', numeroMembre)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logError('getCarteMembreByNumero error', error)
      throw new Error('Erreur lors de la récupération de la carte membre')
    }

    if (!data) {
      return null
    }

    const tarifInfo = getTarifInfoForCountry(data.pays)
    return {
      ...data,
      devise: tarifInfo.devise,
      currencySymbol: tarifInfo.symbol,
    }
  } catch (err) {
    logError('getCarteMembreByNumero exception', err)
    throw err
  }
}

// ========== STATISTIQUES ==========

/**
 * Récupère les statistiques du module trésorerie
 */
export async function getTresorerieStats() {
  try {
    // Total cotisations
    const { count: totalCotisations } = await supabaseTresorerie
      .from('cotisations')
      .select('*', { count: 'exact', head: true })

    // Cotisations payées
    const { count: cotisationsPayees } = await supabaseTresorerie
      .from('cotisations')
      .select('*', { count: 'exact', head: true })
      .eq('statut_paiement', 'paye')

    // Cotisations en attente
    const { count: cotisationsEnAttente } = await supabaseTresorerie
      .from('cotisations')
      .select('*', { count: 'exact', head: true })
      .eq('statut_paiement', 'en_attente')

    // Total paiements
    const { count: totalPaiements } = await supabaseTresorerie
      .from('paiements')
      .select('*', { count: 'exact', head: true })

    // Montant total des cotisations payées (conversion en EUR + breakdown)
    const { data: cotisationsData } = await supabaseTresorerie
      .from('cotisations')
      .select('membre_id, montant')
      .eq('statut_paiement', 'paye')

    let montantTotalEur = 0
    let montantSenegalEur = 0
    let montantInternationalEur = 0
    let cotisationsSenegal = 0
    let cotisationsInternationales = 0

    if (cotisationsData && cotisationsData.length > 0) {
      const memberIds = [
        ...new Set(cotisationsData.map((c) => c.membre_id).filter(Boolean)),
      ]

      let membersMap = {}
      if (memberIds.length > 0) {
        const { data: members } = await supabaseAdhesion
          .from('members')
          .select('id, pays')
          .in('id', memberIds)
        membersMap = Object.fromEntries((members || []).map((m) => [m.id, m.pays || '']))
      }

      cotisationsData.forEach((cot) => {
        const pays = membersMap[cot.membre_id] || ''
        const tarifInfo = getTarifInfoForCountry(pays)
        const montantEur = convertToEuro(cot.montant, tarifInfo)
        montantTotalEur += montantEur
        if (tarifInfo.isSenegal) {
          montantSenegalEur += montantEur
          cotisationsSenegal += 1
        } else {
          montantInternationalEur += montantEur
          cotisationsInternationales += 1
        }
      })
    }

    // Dépenses
    const { data: depensesData } = await supabaseTresorerie
      .from('depenses')
      .select('montant, devise, statut')

    let depensesTotalEur = 0
    let depensesValideesEur = 0
    let depensesValidees = 0

    ;(depensesData || []).forEach((dep) => {
      const montantEur = convertCurrencyToEuro(dep.montant, dep.devise)
      depensesTotalEur += montantEur
      if (dep.statut === 'valide') {
        depensesValidees += 1
        depensesValideesEur += montantEur
      }
    })

    // Total relances
    const { count: totalRelances } = await supabaseTresorerie
      .from('relances')
      .select('*', { count: 'exact', head: true })

    // Répartition par année
    const { data: cotisationsByYear } = await supabaseTresorerie
      .from('cotisations')
      .select('annee, statut_paiement')

    const repartitionParAnnee = {}
    ;(cotisationsByYear || []).forEach((c) => {
      if (!repartitionParAnnee[c.annee]) {
        repartitionParAnnee[c.annee] = { total: 0, payees: 0, en_attente: 0 }
      }
      repartitionParAnnee[c.annee].total++
      if (c.statut_paiement === 'paye') {
        repartitionParAnnee[c.annee].payees++
      } else if (c.statut_paiement === 'en_attente') {
        repartitionParAnnee[c.annee].en_attente++
      }
    })

    return {
      total_cotisations: totalCotisations || 0,
      cotisations_payees: cotisationsPayees || 0,
      cotisations_en_attente: cotisationsEnAttente || 0,
      total_paiements: totalPaiements || 0,
      montant_total: montantTotalEur,
      montant_total_eur: montantTotalEur,
      montant_senegal_eur: montantSenegalEur,
      montant_international_eur: montantInternationalEur,
      cotisations_senegal: cotisationsSenegal,
      cotisations_internationales: cotisationsInternationales,
      taux_cfa_eur: CFA_TO_EUR_RATE,
      depenses_total_eur: depensesTotalEur,
      depenses_validees_eur: depensesValideesEur,
      depenses_validees: depensesValidees,
      total_relances: totalRelances || 0,
      repartition_par_annee: repartitionParAnnee,
    }
  } catch (err) {
    logError('getTresorerieStats exception', err)
    throw err
  }
}

function applyPeriodFilters(query, filters = {}) {
  if (filters.periode_mois) {
    query = query.eq('periode_mois', filters.periode_mois)
  }
  if (filters.periode_annee) {
    query = query.eq('periode_annee', filters.periode_annee)
  }
  if (filters.membre_id) {
    query = query.eq('membre_id', filters.membre_id)
  }
  return query
}

function resolveDateRange(filters = {}) {
  if (!filters.periode_mois || !filters.periode_annee) {
    return {}
  }
  const start = new Date(filters.periode_annee, filters.periode_mois - 1, 1)
  const end = new Date(filters.periode_annee, filters.periode_mois, 1)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

async function fetchCotisationsForExport(filters = {}) {
  let query = supabaseTresorerie
    .from('cotisations')
    .select('*')
    .order('periode_annee', { ascending: false })
    .order('periode_mois', { ascending: false })

  query = applyPeriodFilters(query, filters)
  if (filters.statut) {
    query = query.eq('statut_paiement', filters.statut)
  }

  const { data, error } = await query

  if (error) {
    logError('fetchCotisationsForExport error', error)
    throw new Error('Impossible de récupérer les cotisations pour export')
  }

  const membres = await fetchMembersMap(data.map((item) => item.membre_id))

  return data.map((item) => {
    const membre = membres.get(item.membre_id) || null
    const tarifInfo = getTarifInfoForCountry(membre?.pays)
    return {
      ...item,
      membre,
      periode_label: buildPeriodLabel(item.periode_mois, item.periode_annee, item.date_paiement),
      montant_eur: convertToEuro(item.montant, tarifInfo),
      currencySymbol: tarifInfo?.symbol || '€',
    }
  })
}

async function fetchPaiementsForExport(filters = {}) {
  let query = supabaseTresorerie
    .from('paiements')
    .select('*')
    .order('date_paiement', { ascending: false })

  query = applyPeriodFilters(query, filters)

  if (filters.type_paiement) {
    query = query.eq('type_paiement', filters.type_paiement)
  }

  if (filters.statut) {
    query = query.eq('statut', filters.statut)
  }

  const { data, error } = await query

  if (error) {
    logError('fetchPaiementsForExport error', error)
    throw new Error('Impossible de récupérer les paiements pour export')
  }

  const membres = await fetchMembersMap(data.map((item) => item.membre_id))

  return data.map((item) => ({
    ...item,
    membre: membres.get(item.membre_id) || null,
    periode_label: buildPeriodLabel(item.periode_mois, item.periode_annee, item.date_paiement),
  }))
}

async function fetchDepensesForExport(filters = {}) {
  let query = supabaseTresorerie
    .from('depenses')
    .select('*')
    .order('date_depense', { ascending: false })

  if (filters.statut) {
    query = query.eq('statut', filters.statut)
  }

  const { start, end } = resolveDateRange(filters)
  if (start) {
    query = query.gte('date_depense', start)
  }
  if (end) {
    query = query.lt('date_depense', end)
  }

  const { data, error } = await query

  if (error) {
    logError('fetchDepensesForExport error', error)
    throw new Error('Impossible de récupérer les dépenses pour export')
  }

  return data.map((item) => ({
    ...item,
    periode_label: buildPeriodLabel(filters.periode_mois, filters.periode_annee, item.date_depense),
    montant_eur: convertCurrencyToEuro(item.montant, item.devise),
  }))
}

function buildFileName(prefix, format, filters = {}) {
  const today = new Date()
  let suffix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (filters.periode_annee) {
    suffix = `${filters.periode_annee}${filters.periode_mois ? '-' + String(filters.periode_mois).padStart(2, '0') : ''}`
  }
  return `${prefix}-${suffix}.${format}`
}

async function buildTabularExport({ rows, columns, format = 'csv', prefix, filters = {} }) {
  const normalizedFormat = (format || 'csv').toLowerCase()
  if (!['csv', 'xlsx'].includes(normalizedFormat)) {
    throw new Error('Format d’export non supporté (csv, xlsx)')
  }

  if (normalizedFormat === 'csv') {
    const parser = new Json2CsvParser({
      fields: columns.map((col) => ({ label: col.label, value: col.key })),
    })
    const csv = parser.parse(rows)
    return {
      buffer: Buffer.from(csv, 'utf8'),
      mimeType: 'text/csv; charset=utf-8',
      fileName: buildFileName(prefix, 'csv', filters),
    }
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Export')
  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: col.width || 20,
  }))
  rows.forEach((row) => sheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  return {
    buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: buildFileName(prefix, 'xlsx', filters),
  }
}

export async function generateCotisationsExport({ format = 'csv', filters = {} }) {
  const data = await fetchCotisationsForExport(filters)
  const rows = data.map((item) => ({
    periode: item.periode_label,
    membre: item.membre ? `${item.membre.prenom || ''} ${item.membre.nom || ''}`.trim() : '—',
    email: item.membre?.email || '',
    pays: item.membre?.pays || '',
    montant_brut: formatCurrency(item.montant, item.currencySymbol || '€'),
    montant_eur: formatCurrency(item.montant_eur || 0),
    statut: item.statut_paiement || 'en_attente',
    mode_paiement: item.mode_paiement || '',
    date_paiement: formatDateLabel(item.date_paiement),
  }))

  const columns = [
    { key: 'periode', label: 'Période' },
    { key: 'membre', label: 'Membre' },
    { key: 'email', label: 'Email' },
    { key: 'pays', label: 'Pays' },
    { key: 'montant_brut', label: 'Montant (origine)' },
    { key: 'montant_eur', label: 'Montant (EUR)' },
    { key: 'statut', label: 'Statut' },
    { key: 'mode_paiement', label: 'Mode paiement' },
    { key: 'date_paiement', label: 'Date paiement' },
  ]

  return buildTabularExport({
    rows,
    columns,
    format,
    prefix: 'cotisations',
    filters,
  })
}

export async function generatePaiementsExport({ format = 'csv', filters = {} }) {
  const data = await fetchPaiementsForExport(filters)
  const rows = data.map((item) => ({
    periode: item.periode_label,
    membre: item.membre ? `${item.membre.prenom || ''} ${item.membre.nom || ''}`.trim() : '—',
    type_paiement: item.type_paiement || '',
    statut: item.statut || '',
    montant_eur: formatCurrency(item.montant || 0),
    mode_paiement: item.mode_paiement || '',
    date_paiement: formatDateLabel(item.date_paiement),
    details: item.details || '',
  }))

  const columns = [
    { key: 'periode', label: 'Période' },
    { key: 'membre', label: 'Membre' },
    { key: 'type_paiement', label: 'Type' },
    { key: 'statut', label: 'Statut' },
    { key: 'montant_eur', label: 'Montant (EUR)' },
    { key: 'mode_paiement', label: 'Mode' },
    { key: 'date_paiement', label: 'Date paiement' },
    { key: 'details', label: 'Commentaires' },
  ]

  return buildTabularExport({
    rows,
    columns,
    format,
    prefix: 'paiements',
    filters,
  })
}

export async function generateDepensesExport({ format = 'csv', filters = {} }) {
  const data = await fetchDepensesForExport(filters)
  const rows = data.map((item) => ({
    periode: item.periode_label,
    titre: item.titre,
    categorie: item.categorie || '',
    statut: item.statut || '',
    montant: formatCurrency(item.montant, item.devise || 'EUR'),
    montant_eur: formatCurrency(item.montant_eur || 0),
    date_depense: formatDateLabel(item.date_depense),
    justificatif: item.justificatif_url || '',
  }))

  const columns = [
    { key: 'periode', label: 'Période' },
    { key: 'titre', label: 'Titre' },
    { key: 'categorie', label: 'Catégorie' },
    { key: 'statut', label: 'Statut' },
    { key: 'montant', label: 'Montant (origine)' },
    { key: 'montant_eur', label: 'Montant (EUR)' },
    { key: 'date_depense', label: 'Date' },
    { key: 'justificatif', label: 'Justificatif' },
  ]

  return buildTabularExport({
    rows,
    columns,
    format,
    prefix: 'depenses',
    filters,
  })
}

export async function generateMonthlyReportPdf(filters = {}) {
  const cotisations = await fetchCotisationsForExport(filters)
  const paiements = await fetchPaiementsForExport(filters)
  const depenses = await fetchDepensesForExport(filters)

  const totalCotisations = cotisations.reduce((acc, item) => acc + (item.montant_eur || 0), 0)
  const totalPaiements = paiements.reduce((acc, item) => acc + (item.montant || 0), 0)
  const totalDepenses = depenses.reduce((acc, item) => acc + (item.montant_eur || 0), 0)
  const solde = totalCotisations + totalPaiements - totalDepenses

  const doc = new PDFDocument({ margin: 40 })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))

  const periodLabel = buildPeriodLabel(filters.periode_mois, filters.periode_annee, new Date())

  doc.fontSize(20).text('Rapport Trésorerie', { align: 'left' })
  doc.moveDown(0.4)
  doc.fontSize(12).text(`Période: ${periodLabel}`)
  doc.text(`Généré le: ${formatDateLabel(new Date())}`)
  doc.moveDown()

  doc.fontSize(14).text('Synthèse financière', { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(12)
  doc.text(`Total cotisations (EUR): ${formatCurrency(totalCotisations)}`)
  doc.text(`Total paiements (EUR): ${formatCurrency(totalPaiements)}`)
  doc.text(`Total dépenses (EUR): ${formatCurrency(totalDepenses)}`)
  doc.text(`Solde net: ${formatCurrency(solde)}`)
  doc.moveDown()

  const topCotisations = cotisations.slice(0, 5)
  if (topCotisations.length > 0) {
    doc.fontSize(14).text('Top cotisations', { underline: true })
    doc.moveDown(0.2)
    topCotisations.forEach((item, index) => {
      const membre = item.membre ? `${item.membre.prenom || ''} ${item.membre.nom || ''}`.trim() : '—'
      doc.fontSize(11).text(
        `${index + 1}. ${membre} • ${item.periode_label} • ${formatCurrency(item.montant_eur)}`
      )
    })
    doc.moveDown()
  }

  const topDepenses = depenses.slice(0, 5)
  if (topDepenses.length > 0) {
    doc.fontSize(14).text('Principales dépenses', { underline: true })
    doc.moveDown(0.2)
    topDepenses.forEach((item, index) => {
      doc.fontSize(11).text(
        `${index + 1}. ${item.titre} • ${formatDateLabel(item.date_depense)} • ${formatCurrency(
          item.montant_eur
        )}`
      )
    })
  }

  doc.end()

  const buffer = await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  return {
    buffer,
    mimeType: 'application/pdf',
    fileName: buildFileName('rapport-tresorerie', 'pdf', filters),
  }
}

