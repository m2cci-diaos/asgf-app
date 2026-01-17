import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers || {})
  headers.set("Content-Type", "application/json")
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(JSON.stringify(body), { ...init, headers })
}

async function verifyJwt(req: Request, jwtSecret: string) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Token manquant")
  }
  const token = authHeader.substring(7)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )
  await verify(token, key)
}

function parseUrl(url: string) {
  const u = new URL(url)
  return {
    pathname: u.pathname,
    searchParams: u.searchParams,
  }
}

// Helper functions
const MEMBER_FIELDS = "id, prenom, nom, email, numero_membre, pays"
const SENEGAL_KEYWORDS = ["senegal", "sénégal"]
const CFA_TO_EUR_RATE = 1 / 655.957
const CFA_CURRENCIES = ["XOF", "CFA", "FCFA"]

function normalizeCountry(pays = "") {
  try {
    return pays
      ? pays
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
      : ""
  } catch {
    return pays?.toLowerCase().trim() || ""
  }
}

function getTarifInfoForCountry(pays = "") {
  const normalized = normalizeCountry(pays)
  if (SENEGAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { montant: 2000, devise: "XOF", symbol: "FCFA", isSenegal: true }
  }
  return { montant: 10, devise: "EUR", symbol: "€", isSenegal: false }
}

function convertToEuro(amount = 0, tarifInfo: any) {
  const parsed = parseFloat(String(amount || 0))
  if (!parsed) return 0
  if (tarifInfo.isSenegal) {
    return parsed * CFA_TO_EUR_RATE
  }
  return parsed
}

function convertCurrencyToEuro(amount = 0, devise = "EUR") {
  const parsed = parseFloat(String(amount || 0))
  if (!parsed) return 0
  const normalized = (devise || "").toUpperCase()
  if (CFA_CURRENCIES.includes(normalized)) {
    return parsed * CFA_TO_EUR_RATE
  }
  return parsed
}

function resolvePeriode({
  periode_mois,
  periode_annee,
  referenceDate = new Date(),
}: any) {
  const refDate = referenceDate ? new Date(referenceDate) : new Date()
  let month = parseInt(String(periode_mois || ""), 10)
  let year = parseInt(String(periode_annee || ""), 10)

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

// Helper function to upload PDF to Supabase Storage as fallback
async function uploadCartePDFToSupabaseStorage(
  supabaseClient: any,
  pdfBase64: string,
  numeroMembre: string,
): Promise<string | null> {
  try {
    const fileName = `CARTE-${numeroMembre}.pdf`
    const filePath = `cartes-membres/${fileName}`

    // Convertir base64 en blob/buffer
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))

    console.log(`Tentative upload PDF vers Supabase Storage: ${filePath}`)

    // Vérifier si le bucket existe, sinon le créer (ou gérer l'erreur)
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("cartes-membres")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true, // Remplacer si existe déjà
      })

    if (uploadError) {
      // Si le bucket n'existe pas, essayer de créer un bucket public temporaire
      if (uploadError.message?.includes("Bucket not found")) {
        console.warn(`Bucket "cartes-membres" n'existe pas, création impossible depuis Edge Function`)
        console.warn(`Veuillez créer le bucket "cartes-membres" dans Supabase Dashboard > Storage`)
        return null
      }
      console.error("Erreur upload PDF vers Supabase Storage", uploadError)
      return null
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabaseClient.storage
      .from("cartes-membres")
      .getPublicUrl(filePath)

    console.log(`PDF uploadé avec succès sur Supabase Storage: ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error("Exception upload PDF vers Supabase Storage", err)
    return null
  }
}

// Helper function to upload PDF to Google Drive via Apps Script webhook
// Falls back to Supabase Storage if Google Drive fails
async function uploadCartePDFToDrive(
  pdfBase64: string,
  numeroMembre: string,
  supabaseClient?: any,
): Promise<string | null> {
  const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
  const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""
  const GOOGLE_DRIVE_FOLDER_ID = "1iSFImqsc4AeDFeTesNpDl8uIsi1ocdx6"

  // Essayer d'abord Google Drive si le webhook est configuré
  if (APPSCRIPT_WEBHOOK_URL) {
    try {
      const fileName = `CARTE-${numeroMembre}.pdf`

      const payload = {
        type: "upload_pdf",
        folderId: GOOGLE_DRIVE_FOLDER_ID,
        fileName: fileName,
        fileData: pdfBase64,
        mimeType: "application/pdf",
        token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
      }

      console.log(`Tentative upload PDF vers Google Drive: ${fileName}`)

      // Ajouter un timeout de 10 secondes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(APPSCRIPT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(APPSCRIPT_WEBHOOK_TOKEN && { "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN }),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const responseData = await response.json()

        if (responseData.success && responseData.fileUrl) {
          console.log(`✅ PDF uploadé avec succès sur Google Drive: ${responseData.fileUrl}`)
          return responseData.fileUrl
        }
      }

      const errorText = await response.text()
      console.warn(`⚠️ Upload PDF vers Google Drive échoué (${response.status}): ${errorText.substring(0, 200)}`)
      console.warn(`🔄 Tentative de secours vers Supabase Storage...`)
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn(`⏱️ Timeout lors de l'upload vers Google Drive (>10s)`)
      } else {
        console.warn(`⚠️ Exception upload PDF vers Google Drive: ${(err as Error).message}`)
      }
      console.warn(`🔄 Tentative de secours vers Supabase Storage...`)
    }
  } else {
    console.warn("Apps Script webhook non configuré, utilisation de Supabase Storage directement")
  }

  // Fallback: utiliser Supabase Storage si Google Drive échoue ou n'est pas configuré
  if (supabaseClient) {
    const storageUrl = await uploadCartePDFToSupabaseStorage(supabaseClient, pdfBase64, numeroMembre)
    if (storageUrl) {
      console.log(`✅ PDF stocké dans Supabase Storage (solution de secours)`)
      return storageUrl
    }
  }

  console.error(`❌ Échec complet: Impossible d'uploader le PDF ni vers Google Drive ni vers Supabase Storage`)
  return null
}

async function fetchMemberById(
  supabaseAdhesion: any,
  memberId: string,
): Promise<any> {
  if (!memberId) return null
  const { data, error } = await supabaseAdhesion
    .from("members")
    .select(MEMBER_FIELDS)
    .eq("id", memberId)
    .maybeSingle()
  if (error) {
    console.error("fetchMemberById error", error)
    return null
  }
  return data
}

async function logHistoriqueAction(
  supabaseTresorerie: any,
  action: string,
  data: any,
) {
  try {
    await supabaseTresorerie.from("historique").insert({
      action,
      membre_id: data.membre_id || null,
      montant: data.montant || null,
      description: data.description || null,
      admin_id: data.admin_id || null,
    })
  } catch (err) {
    console.error(`logHistoriqueAction ${action} error`, err)
  }
}

function buildPeriodLabel(periode_mois: number | null, periode_annee: number | null, fallbackDate?: string | Date) {
  if (periode_mois && periode_annee) {
    return `${periode_mois.toString().padStart(2, "0")}/${periode_annee}`
  }
  if (fallbackDate) {
    const date = new Date(fallbackDate)
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
  }
  return "N/A"
}

function formatCurrency(amount: number | null = 0, symbol = "€") {
  if (amount === null || amount === undefined) return "—"
  return `${Number(amount).toFixed(2)} ${symbol}`
}

function formatDateLabel(value: string | Date | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleDateString("fr-FR")
}

function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv(rows: any[], columns: { key: string; label: string }[]): string {
  const header = columns.map((col) => escapeCsvValue(col.label)).join(",")
  const csvRows = rows.map((row) =>
    columns.map((col) => escapeCsvValue(row[col.key] || "")).join(",")
  )
  return [header, ...csvRows].join("\n")
}

async function fetchMembersMap(supabaseAdhesion: any, memberIds: string[]) {
  const unique = Array.from(new Set(memberIds.filter(Boolean)))
  if (!unique.length) {
    return new Map()
  }
  const { data, error } = await supabaseAdhesion
    .from("members")
    .select(MEMBER_FIELDS)
    .in("id", unique)

  if (error) {
    console.error("fetchMembersMap error", error)
    return new Map()
  }

  const map = new Map()
  data?.forEach((m: any) => {
    map.set(m.id, m)
  })
  return map
}

function applyPeriodFilters(query: any, filters: any) {
  if (filters.periode_mois) {
    query = query.eq("periode_mois", filters.periode_mois)
  }
  if (filters.periode_annee) {
    query = query.eq("periode_annee", filters.periode_annee)
  }
  if (filters.membre_id) {
    query = query.eq("membre_id", filters.membre_id)
  }
  return query
}

function resolveDateRange(filters: any) {
  if (!filters.periode_mois || !filters.periode_annee) {
    return {}
  }
  const start = new Date(filters.periode_annee, filters.periode_mois - 1, 1)
  const end = new Date(filters.periode_annee, filters.periode_mois, 1)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

function buildFileName(prefix: string, format: string, filters: any = {}) {
  const today = new Date()
  let suffix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  if (filters.periode_annee) {
    suffix = `${filters.periode_annee}${filters.periode_mois ? "-" + String(filters.periode_mois).padStart(2, "0") : ""}`
  }
  return `${prefix}-${suffix}.${format}`
}

// ========== COTISATIONS ==========

async function listCotisations(
  supabaseTresorerie: any,
  supabaseAdhesion: any,
  searchParams: URLSearchParams,
) {
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
  const annee = searchParams.get("annee") || ""
  const statut_paiement = searchParams.get("statut_paiement") || ""

  let query = supabaseTresorerie
    .from("cotisations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })

  if (annee) {
    query = query.eq("annee", parseInt(annee))
  }

  if (statut_paiement) {
    query = query.eq("statut_paiement", statut_paiement)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data: cotisations, error, count } = await query

  if (error) {
    console.error("listCotisations error", error)
    throw new Error("Erreur lors de la récupération des cotisations")
  }

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
    cotisations.map(async (cotisation: any) => {
      let membre = null
      if (cotisation.membre_id) {
        membre = await fetchMemberById(supabaseAdhesion, cotisation.membre_id)
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
    }),
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
}

async function getCotisationById(
  supabaseTresorerie: any,
  supabaseAdhesion: any,
  cotisationId: string,
) {
  const { data: cotisation, error } = await supabaseTresorerie
    .from("cotisations")
    .select("*")
    .eq("id", cotisationId)
    .maybeSingle()

  if (error) {
    console.error("getCotisationById error", error)
    throw new Error("Erreur lors de la récupération de la cotisation")
  }

  if (!cotisation) {
    return null
  }

  let membre = null
  if (cotisation.membre_id) {
    membre = await fetchMemberById(supabaseAdhesion, cotisation.membre_id)
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
}

async function createCotisation(
  supabaseTresorerie: any,
  supabaseAdhesion: any,
  cotisationData: any,
) {
  const membre = await fetchMemberById(supabaseAdhesion, cotisationData.membre_id)
  if (!membre) {
    throw new Error("Membre introuvable pour cette cotisation")
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
    .from("cotisations")
    .insert({
      membre_id: cotisationData.membre_id,
      annee,
      periode_mois: periode.periode_mois,
      periode_annee: periode.periode_annee,
      montant: montantCalcule,
      statut_paiement: cotisationData.statut_paiement || "en_attente",
      mode_paiement: cotisationData.mode_paiement || null,
      date_paiement: cotisationData.date_paiement || null,
      preuve_url: cotisationData.preuve_url || null,
    })
    .select()
    .single()

  if (error) {
    console.error("createCotisation error", error)
    throw new Error("Erreur lors de la création de la cotisation")
  }

  await logHistoriqueAction(supabaseTresorerie, "cotisation_created", {
    membre_id: data.membre_id,
    montant: data.montant,
    description: `Cotisation ${annee}`,
  })

  return {
    ...data,
    devise: tarifInfo.devise,
    currencySymbol: tarifInfo.symbol,
    montant_eur: convertToEuro(data.montant, tarifInfo),
  }
}

async function updateCotisation(
  supabaseTresorerie: any,
  supabaseAdhesion: any,
  cotisationId: string,
  updates: any,
) {
  let payload: any = { ...updates }

  if (updates.membre_id) {
    const membre = await fetchMemberById(supabaseAdhesion, updates.membre_id)
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
    .from("cotisations")
    .update(payload)
    .eq("id", cotisationId)
    .select()
    .single()

  if (error) {
    console.error("updateCotisation error", error)
    throw new Error("Erreur lors de la mise à jour de la cotisation")
  }

  return data
}

async function validateCotisation(
  supabaseTresorerie: any,
  supabaseAdhesion: any,
  cotisationId: string,
  adminId: string | null,
  datePaiement: string | null,
) {
  const effectiveDate = datePaiement || new Date().toISOString().split("T")[0]
  const periode = resolvePeriode({
    periode_mois: null,
    periode_annee: null,
    referenceDate: effectiveDate,
  })

  const { data, error } = await supabaseTresorerie
    .from("cotisations")
    .update({
      statut_paiement: "paye",
      date_paiement: effectiveDate,
      periode_mois: periode.periode_mois,
      periode_annee: periode.periode_annee,
    })
    .eq("id", cotisationId)
    .select()
    .single()

  if (error) {
    console.error("validateCotisation error", error)
    throw new Error("Impossible de valider la cotisation")
  }

  if (!data) {
    return null
  }

  await logHistoriqueAction(supabaseTresorerie, "cotisation_validated", {
    membre_id: data.membre_id,
    montant: data.montant,
    description: `Cotisation validée ${data.periode_mois}/${data.periode_annee}`,
    admin_id: adminId,
  })

  return data
}

async function deleteCotisation(
  supabaseTresorerie: any,
  cotisationId: string,
) {
  const { data, error } = await supabaseTresorerie
    .from("cotisations")
    .delete()
    .eq("id", cotisationId)
    .select()
    .single()

  if (error) {
    console.error("deleteCotisation error", error)
    throw new Error("Erreur lors de la suppression de la cotisation")
  }

  return data
}

// ========== PAIEMENTS ==========

async function listPaiements(
  supabaseTresorerie: any,
  supabaseAdhesion: any,
  searchParams: URLSearchParams,
) {
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
  const type_paiement = searchParams.get("type_paiement") || ""
  const statut = searchParams.get("statut") || ""

  let query = supabaseTresorerie
    .from("paiements")
    .select("*", { count: "exact" })
    .order("date_paiement", { ascending: false })

  if (type_paiement) {
    query = query.eq("type_paiement", type_paiement)
  }

  if (statut) {
    query = query.eq("statut", statut)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data: paiements, error, count } = await query

  if (error) {
    console.error("listPaiements error", error)
    throw new Error("Erreur lors de la récupération des paiements")
  }

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

  const paiementsWithMembers = await Promise.all(
    paiements.map(async (paiement: any) => {
      let membre = null
      if (paiement.membre_id) {
        membre = await fetchMemberById(supabaseAdhesion, paiement.membre_id)
      }
      return {
        ...paiement,
        membre,
      }
    }),
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
}

async function createPaiement(
  supabaseTresorerie: any,
  paiementData: any,
) {
  const periode = resolvePeriode({
    periode_mois: paiementData.periode_mois,
    periode_annee: paiementData.periode_annee,
    referenceDate: paiementData.date_paiement,
  })

  const { data, error } = await supabaseTresorerie
    .from("paiements")
    .insert({
      membre_id: paiementData.membre_id || null,
      type_paiement: paiementData.type_paiement,
      montant: paiementData.montant,
      mode_paiement: paiementData.mode_paiement || null,
      statut: paiementData.statut || "valide",
      date_paiement: paiementData.date_paiement || new Date().toISOString().split("T")[0],
      periode_mois: periode.periode_mois,
      periode_annee: periode.periode_annee,
      details: paiementData.details || null,
    })
    .select()
    .single()

  if (error) {
    console.error("createPaiement error", error)
    throw new Error("Erreur lors de la création du paiement")
  }

  await logHistoriqueAction(supabaseTresorerie, "paiement_created", {
    membre_id: data.membre_id,
    montant: data.montant,
    description: `Paiement ${data.type_paiement || ""}`,
  })

  return data
}

async function updatePaiement(
  supabaseTresorerie: any,
  paiementId: string,
  updates: any,
) {
  const payload: any = { ...updates }

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
    .from("paiements")
    .update(payload)
    .eq("id", paiementId)
    .select()
    .single()

  if (error) {
    console.error("updatePaiement error", error)
    throw new Error("Erreur lors de la mise à jour du paiement")
  }

  return data
}

async function validatePaiement(
  supabaseTresorerie: any,
  paiementId: string,
  adminId: string | null,
  datePaiement: string | null,
) {
  const effectiveDate = datePaiement || new Date().toISOString().split("T")[0]
  const periode = resolvePeriode({
    periode_mois: null,
    periode_annee: null,
    referenceDate: effectiveDate,
  })

  const { data, error } = await supabaseTresorerie
    .from("paiements")
    .update({
      statut: "valide",
      date_paiement: effectiveDate,
      periode_mois: periode.periode_mois,
      periode_annee: periode.periode_annee,
    })
    .eq("id", paiementId)
    .select()
    .single()

  if (error) {
    console.error("validatePaiement error", error)
    throw new Error("Impossible de valider le paiement")
  }

  if (!data) {
    return null
  }

  await logHistoriqueAction(supabaseTresorerie, "paiement_validated", {
    membre_id: data.membre_id,
    montant: data.montant,
    description: `Paiement validé (${data.type_paiement || "N/A"})`,
    admin_id: adminId,
  })

  return data
}

// ========== STATS ==========

async function getTresorerieStats(
  supabaseTresorerie: any,
  supabaseAdhesion: any,
) {
  // Total cotisations
  const { count: totalCotisations } = await supabaseTresorerie
    .from("cotisations")
    .select("*", { count: "exact", head: true })

  // Cotisations payées
  const { count: cotisationsPayees } = await supabaseTresorerie
    .from("cotisations")
    .select("*", { count: "exact", head: true })
    .eq("statut_paiement", "paye")

  // Cotisations en attente
  const { count: cotisationsEnAttente } = await supabaseTresorerie
    .from("cotisations")
    .select("*", { count: "exact", head: true })
    .eq("statut_paiement", "en_attente")

  // Total paiements
  const { count: totalPaiements } = await supabaseTresorerie
    .from("paiements")
    .select("*", { count: "exact", head: true })

  // Montant total des paiements validés
  const { data: paiementsData } = await supabaseTresorerie
    .from("paiements")
    .select("montant, statut")
    .eq("statut", "valide")

  let totalPaiementsDonsEur = 0
  ;(paiementsData || []).forEach((pai: any) => {
    totalPaiementsDonsEur += pai.montant || 0
  })

  // Montant total des cotisations payées
  const { data: cotisationsData } = await supabaseTresorerie
    .from("cotisations")
    .select("membre_id, montant")
    .eq("statut_paiement", "paye")

  let montantTotalEur = 0
  let montantSenegalEur = 0
  let montantInternationalEur = 0
  let cotisationsSenegal = 0
  let cotisationsInternationales = 0

  if (cotisationsData && cotisationsData.length > 0) {
    const memberIds = [
      ...new Set(cotisationsData.map((c: any) => c.membre_id).filter(Boolean)),
    ]

    let membersMap: Record<string, string> = {}
    if (memberIds.length > 0) {
      const { data: members } = await supabaseAdhesion
        .from("members")
        .select("id, pays")
        .in("id", memberIds)
      membersMap = Object.fromEntries(
        (members || []).map((m: any) => [m.id, m.pays || ""]),
      )
    }

    cotisationsData.forEach((cot: any) => {
      const pays = membersMap[cot.membre_id] || ""
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
    .from("depenses")
    .select("montant, devise, statut")

  let depensesTotalEur = 0
  let depensesValideesEur = 0
  let depensesValidees = 0

  ;(depensesData || []).forEach((dep: any) => {
    const montantEur = convertCurrencyToEuro(dep.montant, dep.devise)
    depensesTotalEur += montantEur
    if (dep.statut === "valide") {
      depensesValidees += 1
      depensesValideesEur += montantEur
    }
  })

  // Revenus des cartes membres
  const { data: cartesMembresData } = await supabaseTresorerie
    .from("cartes_membres")
    .select("pays, statut_paiement")
    .or("statut_paiement.eq.paye,statut_paiement.eq.oui")

  let revenusCartesMembresEur = 0
  let cartesPayees = 0
  if (cartesMembresData && cartesMembresData.length > 0) {
    cartesMembresData.forEach((carte: any) => {
      const tarifInfo = getTarifInfoForCountry(carte.pays)
      const montantEur = convertToEuro(tarifInfo.montant, tarifInfo)
      revenusCartesMembresEur += montantEur
      cartesPayees += 1
    })
  }

  // Total relances
  const { count: totalRelances } = await supabaseTresorerie
    .from("relances")
    .select("*", { count: "exact", head: true })

  // Répartition par année
  const { data: cotisationsByYear } = await supabaseTresorerie
    .from("cotisations")
    .select("annee, statut_paiement")

  const repartitionParAnnee: Record<string, any> = {}
  ;(cotisationsByYear || []).forEach((c: any) => {
    if (!repartitionParAnnee[c.annee]) {
      repartitionParAnnee[c.annee] = { total: 0, payees: 0, en_attente: 0 }
    }
    repartitionParAnnee[c.annee].total++
    if (c.statut_paiement === "paye") {
      repartitionParAnnee[c.annee].payees++
    } else if (c.statut_paiement === "en_attente") {
      repartitionParAnnee[c.annee].en_attente++
    }
  })

  // Calcul du solde total
  const recettesTotal = montantTotalEur + totalPaiementsDonsEur + revenusCartesMembresEur
  const soldeTotal = recettesTotal - depensesValideesEur

  return {
    total_cotisations: totalCotisations || 0,
    cotisations_payees: cotisationsPayees || 0,
    cotisations_en_attente: cotisationsEnAttente || 0,
    total_paiements: totalPaiements || 0,
    total_paiements_dons_eur: totalPaiementsDonsEur,
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
    revenus_cartes_membres_eur: revenusCartesMembresEur,
    cartes_membres_payees: cartesPayees,
    solde_total_eur: soldeTotal,
  }
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }

  const PROJECT_URL = Deno.env.get("PROJECT_URL")
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")
  const JWT_SECRET = Deno.env.get("JWT_SECRET")

  if (!PROJECT_URL || !SERVICE_ROLE_KEY || !JWT_SECRET) {
    console.error("PROJECT_URL, SERVICE_ROLE_KEY ou JWT_SECRET manquant")
    return jsonResponse(
      { success: false, message: "Configuration serveur incomplète" },
      { status: 500 },
    )
  }

  try {
    await verifyJwt(req, JWT_SECRET)
  } catch (err) {
    console.error("JWT invalide", err)
    return jsonResponse(
      { success: false, message: "Token invalide" },
      { status: 401 },
    )
  }

  // Décoder l'admin depuis le token
  let adminId: string | null = null
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : ""
    if (token) {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      )
      adminId = payload.id || null
    }
  } catch {
    // pas bloquant
  }

  // Clients Supabase
  const supabaseTresorerie = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "tresorerie" },
  })
  const supabaseAdhesion = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "adhesion" },
  })

  try {
    const { pathname, searchParams } = parseUrl(req.url)

    // Base path: /functions/v1/admin-tresorerie
    const base = "/functions/v1/admin-tresorerie"
    let relativePath = pathname

    // Extraire le chemin relatif
    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-tresorerie")) {
      relativePath = pathname.substring("/admin-tresorerie".length)
    }

    // Normaliser le chemin relatif
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // GET /stats
    if (req.method === "GET" && relativePath === "stats") {
      const stats = await getTresorerieStats(supabaseTresorerie, supabaseAdhesion)
      return jsonResponse({
        success: true,
        data: stats,
      })
    }

    // ========== COTISATIONS ==========

    // GET /cotisations
    if (req.method === "GET" && relativePath === "cotisations") {
      const result = await listCotisations(
        supabaseTresorerie,
        supabaseAdhesion,
        searchParams,
      )
      return jsonResponse({
        success: true,
        data: result.cotisations,
        pagination: result.pagination,
      })
    }

    // GET /cotisations/:id
    const cotisationIdMatch = relativePath.match(/^cotisations\/([0-9a-fA-F-]+)$/)
    if (cotisationIdMatch && req.method === "GET") {
      const id = cotisationIdMatch[1]
      const cotisation = await getCotisationById(
        supabaseTresorerie,
        supabaseAdhesion,
        id,
      )
      if (!cotisation) {
        return jsonResponse(
          { success: false, message: "Cotisation introuvable" },
          { status: 404 },
        )
      }
      return jsonResponse({
        success: true,
        data: cotisation,
      })
    }

    // POST /cotisations
    if (req.method === "POST" && relativePath === "cotisations") {
      const body = await req.json().catch(() => ({}))
      const cotisation = await createCotisation(
        supabaseTresorerie,
        supabaseAdhesion,
        body,
      )
      return jsonResponse({
        success: true,
        message: "Cotisation créée avec succès",
        data: cotisation,
      })
    }

    // PUT /cotisations/:id
    const cotisationUpdateMatch = relativePath.match(/^cotisations\/([0-9a-fA-F-]+)$/)
    if (cotisationUpdateMatch && req.method === "PUT") {
      const id = cotisationUpdateMatch[1]
      const body = await req.json().catch(() => ({}))
      const cotisation = await updateCotisation(
        supabaseTresorerie,
        supabaseAdhesion,
        id,
        body,
      )
      return jsonResponse({
        success: true,
        message: "Cotisation mise à jour avec succès",
        data: cotisation,
      })
    }

    // POST /cotisations/:id/validate
    const cotisationValidateMatch = relativePath.match(/^cotisations\/([0-9a-fA-F-]+)\/validate$/)
    if (cotisationValidateMatch && req.method === "POST") {
      const id = cotisationValidateMatch[1]
      const body = await req.json().catch(() => ({}))
      const cotisation = await validateCotisation(
        supabaseTresorerie,
        supabaseAdhesion,
        id,
        adminId,
        body.date_paiement || null,
      )
      return jsonResponse({
        success: true,
        message: "Cotisation validée avec succès",
        data: cotisation,
      })
    }

    // POST /cotisations/:id/reset
    const cotisationResetMatch = relativePath.match(/^cotisations\/([0-9a-fA-F-]+)\/reset$/)
    if (cotisationResetMatch && req.method === "POST") {
      const id = cotisationResetMatch[1]
      const { data, error } = await supabaseTresorerie
        .from("cotisations")
        .update({
          statut_paiement: "en_attente",
          date_paiement: null,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("resetCotisation error", error)
        throw new Error("Impossible de réinitialiser la cotisation")
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Cotisation introuvable" },
          { status: 404 },
        )
      }

      await logHistoriqueAction(supabaseTresorerie, "cotisation_reset", {
        membre_id: data.membre_id,
        montant: data.montant,
        description: "Cotisation remise en attente",
        admin_id: adminId,
      })

      return jsonResponse({
        success: true,
        message: "Cotisation réinitialisée avec succès",
        data,
      })
    }

    // DELETE /cotisations/:id
    const cotisationDeleteMatch = relativePath.match(/^cotisations\/([0-9a-fA-F-]+)$/)
    if (cotisationDeleteMatch && req.method === "DELETE") {
      const id = cotisationDeleteMatch[1]
      const cotisation = await deleteCotisation(supabaseTresorerie, id)
      return jsonResponse({
        success: true,
        message: "Cotisation supprimée avec succès",
        data: cotisation,
      })
    }

    // ========== PAIEMENTS ==========

    // GET /paiements
    if (req.method === "GET" && relativePath === "paiements") {
      const result = await listPaiements(
        supabaseTresorerie,
        supabaseAdhesion,
        searchParams,
      )
      return jsonResponse({
        success: true,
        data: result.paiements,
        pagination: result.pagination,
      })
    }

    // POST /paiements
    if (req.method === "POST" && relativePath === "paiements") {
      const body = await req.json().catch(() => ({}))
      const paiement = await createPaiement(supabaseTresorerie, body)
      return jsonResponse({
        success: true,
        message: "Paiement créé avec succès",
        data: paiement,
      })
    }

    // PUT /paiements/:id
    const paiementUpdateMatch = relativePath.match(/^paiements\/([0-9a-fA-F-]+)$/)
    if (paiementUpdateMatch && req.method === "PUT") {
      const id = paiementUpdateMatch[1]
      const body = await req.json().catch(() => ({}))
      const paiement = await updatePaiement(supabaseTresorerie, id, body)
      return jsonResponse({
        success: true,
        message: "Paiement mis à jour avec succès",
        data: paiement,
      })
    }

    // POST /paiements/:id/validate
    const paiementValidateMatch = relativePath.match(/^paiements\/([0-9a-fA-F-]+)\/validate$/)
    if (paiementValidateMatch && req.method === "POST") {
      const id = paiementValidateMatch[1]
      const body = await req.json().catch(() => ({}))
      const paiement = await validatePaiement(
        supabaseTresorerie,
        id,
        adminId,
        body.date_paiement || null,
      )
      return jsonResponse({
        success: true,
        message: "Paiement validé avec succès",
        data: paiement,
      })
    }

    // POST /paiements/:id/cancel
    const paiementCancelMatch = relativePath.match(/^paiements\/([0-9a-fA-F-]+)\/cancel$/)
    if (paiementCancelMatch && req.method === "POST") {
      const id = paiementCancelMatch[1]
      const body = await req.json().catch(() => ({}))
      const { data, error } = await supabaseTresorerie
        .from("paiements")
        .update({ statut: "annule" })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("cancelPaiement error", error)
        throw new Error("Impossible d'annuler le paiement")
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Paiement introuvable" },
          { status: 404 },
        )
      }

      await logHistoriqueAction(supabaseTresorerie, "paiement_cancelled", {
        membre_id: data.membre_id,
        montant: data.montant,
        description: body.reason
          ? `Paiement annulé (${body.reason})`
          : "Paiement annulé",
        admin_id: adminId,
      })

      return jsonResponse({
        success: true,
        message: "Paiement annulé avec succès",
        data,
      })
    }

    // DELETE /paiements/:id
    const paiementDeleteMatch = relativePath.match(/^paiements\/([0-9a-fA-F-]+)$/)
    if (paiementDeleteMatch && req.method === "DELETE") {
      const id = paiementDeleteMatch[1]
      const { data: existing } = await supabaseTresorerie
        .from("paiements")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (!existing) {
        return jsonResponse(
          { success: false, message: "Paiement introuvable" },
          { status: 404 },
        )
      }

      const { error } = await supabaseTresorerie.from("paiements").delete().eq("id", id)

      if (error) {
        console.error("deletePaiement error", error)
        throw new Error("Impossible de supprimer le paiement")
      }

      await logHistoriqueAction(supabaseTresorerie, "paiement_deleted", {
        membre_id: existing.membre_id,
        montant: existing.montant,
        description: `Suppression paiement ${existing.type_paiement || ""}`.trim(),
        admin_id: adminId,
      })

      return jsonResponse({
        success: true,
        message: "Paiement supprimé avec succès",
        data: existing,
      })
    }

    // ========== DEPENSES ==========

    // GET /depenses
    if (req.method === "GET" && relativePath === "depenses") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const statut = searchParams.get("statut") || ""
      const categorie = searchParams.get("categorie") || ""

      let query = supabaseTresorerie
        .from("depenses")
        .select("*", { count: "exact" })
        .order("date_depense", { ascending: false })

      if (statut) {
        query = query.eq("statut", statut)
      }

      if (categorie) {
        query = query.ilike("categorie", `%${categorie}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: depenses, error, count } = await query

      if (error) {
        console.error("listDepenses error", error)
        throw new Error("Erreur lors de la récupération des dépenses")
      }

      const depensesWithEuros = (depenses || []).map((depense: any) => ({
        ...depense,
        montant_eur: convertCurrencyToEuro(depense.montant, depense.devise),
      }))

      return jsonResponse({
        success: true,
        data: depensesWithEuros,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /depenses
    if (req.method === "POST" && relativePath === "depenses") {
      const body = await req.json().catch(() => ({}))
      const { data, error } = await supabaseTresorerie
        .from("depenses")
        .insert({
          titre: body.titre,
          description: body.description || null,
          montant: body.montant,
          devise: body.devise || "EUR",
          categorie: body.categorie || null,
          statut: body.statut || "planifie",
          date_depense: body.date_depense || new Date().toISOString().split("T")[0],
          justificatif_url: body.justificatif_url || null,
          cree_par: body.cree_par || null,
        })
        .select()
        .single()

      if (error) {
        console.error("createDepense error", error)
        throw new Error("Erreur lors de la création de la dépense")
      }

      await logHistoriqueAction(supabaseTresorerie, "depense_created", {
        montant: data.montant,
        description: data.titre,
      })

      return jsonResponse({
        success: true,
        message: "Dépense créée avec succès",
        data: {
          ...data,
          montant_eur: convertCurrencyToEuro(data.montant, data.devise),
        },
      })
    }

    // PUT /depenses/:id
    const depenseUpdateMatch = relativePath.match(/^depenses\/([0-9a-fA-F-]+)$/)
    if (depenseUpdateMatch && req.method === "PUT") {
      const id = depenseUpdateMatch[1]
      const body = await req.json().catch(() => ({}))
      const { data, error } = await supabaseTresorerie
        .from("depenses")
        .update(body)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("updateDepense error", error)
        throw new Error("Erreur lors de la mise à jour de la dépense")
      }

      return jsonResponse({
        success: true,
        message: "Dépense mise à jour avec succès",
        data: {
          ...data,
          montant_eur: convertCurrencyToEuro(data.montant, data.devise),
        },
      })
    }

    // POST /depenses/:id/validate
    const depenseValidateMatch = relativePath.match(/^depenses\/([0-9a-fA-F-]+)\/validate$/)
    if (depenseValidateMatch && req.method === "POST") {
      const id = depenseValidateMatch[1]
      const { data, error } = await supabaseTresorerie
        .from("depenses")
        .update({ statut: "valide" })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("validateDepense error", error)
        throw new Error("Impossible de valider la dépense")
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Dépense introuvable" },
          { status: 404 },
        )
      }

      await logHistoriqueAction(supabaseTresorerie, "depense_validated", {
        montant: data.montant,
        description: `Dépense validée: ${data.titre}`,
        admin_id: adminId,
      })

      return jsonResponse({
        success: true,
        message: "Dépense validée avec succès",
        data: {
          ...data,
          montant_eur: convertCurrencyToEuro(data.montant, data.devise),
        },
      })
    }

    // POST /depenses/:id/reject
    const depenseRejectMatch = relativePath.match(/^depenses\/([0-9a-fA-F-]+)\/reject$/)
    if (depenseRejectMatch && req.method === "POST") {
      const id = depenseRejectMatch[1]
      const body = await req.json().catch(() => ({}))
      const { data, error } = await supabaseTresorerie
        .from("depenses")
        .update({ statut: "rejete" })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("rejectDepense error", error)
        throw new Error("Impossible de rejeter la dépense")
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Dépense introuvable" },
          { status: 404 },
        )
      }

      await logHistoriqueAction(supabaseTresorerie, "depense_rejected", {
        montant: data.montant,
        description: body.reason
          ? `Rejet dépense: ${data.titre} (${body.reason})`
          : `Rejet dépense: ${data.titre}`,
        admin_id: adminId,
      })

      return jsonResponse({
        success: true,
        message: "Dépense rejetée avec succès",
        data: {
          ...data,
          montant_eur: convertCurrencyToEuro(data.montant, data.devise),
        },
      })
    }

    // DELETE /depenses/:id
    const depenseDeleteMatch = relativePath.match(/^depenses\/([0-9a-fA-F-]+)$/)
    if (depenseDeleteMatch && req.method === "DELETE") {
      const id = depenseDeleteMatch[1]
      const { data: existing } = await supabaseTresorerie
        .from("depenses")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (!existing) {
        return jsonResponse(
          { success: false, message: "Dépense introuvable" },
          { status: 404 },
        )
      }

      const { error } = await supabaseTresorerie.from("depenses").delete().eq("id", id)

      if (error) {
        console.error("deleteDepense error", error)
        throw new Error("Impossible de supprimer la dépense")
      }

      await logHistoriqueAction(supabaseTresorerie, "depense_deleted", {
        montant: existing.montant,
        description: `Suppression dépense: ${existing.titre}`,
        admin_id: adminId,
      })

      return jsonResponse({
        success: true,
        message: "Dépense supprimée avec succès",
        data: existing,
      })
    }

    // ========== RELANCES ==========

    // GET /relances
    if (req.method === "GET" && relativePath === "relances") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const annee = searchParams.get("annee") || ""
      const type_relance = searchParams.get("type_relance") || ""
      const statut = searchParams.get("statut") || ""

      let query = supabaseTresorerie
        .from("relances")
        .select("*", { count: "exact" })
        .order("date_relance", { ascending: false })

      if (annee) {
        query = query.eq("annee", parseInt(annee))
      }

      if (type_relance) {
        query = query.eq("type_relance", type_relance)
      }

      if (statut) {
        query = query.eq("statut", statut)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: relances, error, count } = await query

      if (error) {
        console.error("listRelances error", error)
        throw new Error("Erreur lors de la récupération des relances")
      }

      if (!relances || relances.length === 0) {
        return jsonResponse({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        })
      }

      const relancesWithMembers = await Promise.all(
        relances.map(async (relance: any) => {
          let membre = null
          if (relance.membre_id) {
            membre = await fetchMemberById(supabaseAdhesion, relance.membre_id)
          }
          return {
            ...relance,
            membre,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: relancesWithMembers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /relances
    if (req.method === "POST" && relativePath === "relances") {
      const body = await req.json().catch(() => ({}))
      
      // Récupérer le membre
      let membre = null
      if (body.membre_id) {
        membre = await fetchMemberById(supabaseAdhesion, body.membre_id)
      }

      // Créer la relance
      const { data: relance, error } = await supabaseTresorerie
        .from("relances")
        .insert({
          membre_id: body.membre_id,
          annee: body.annee,
          type_relance: body.type_relance,
          statut: body.statut || "envoyee",
          commentaire: body.commentaire || null,
        })
        .select()
        .single()

      if (error) {
        console.error("createRelance error", error)
        throw new Error("Erreur lors de la création de la relance")
      }

      // Envoyer un email si membre disponible
      if (membre && membre.email && body.send_email !== false) {
        try {
          const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
          const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

          if (APPSCRIPT_WEBHOOK_URL) {
            let subject = "Rappel ASGF"
            let messageBody = ""

            if (body.type_relance === "cotisation") {
              subject = `Rappel : Cotisation ASGF - ${body.annee || new Date().getFullYear()}`
              const tarifInfo = getTarifInfoForCountry(membre.pays)
              const tarifAffiche = `${tarifInfo.montant} ${tarifInfo.symbol}`
              messageBody = `Bonjour {{prenom}} {{nom}},

Votre cotisation ASGF pour l'année ${body.annee || new Date().getFullYear()} est en attente de paiement (${tarifAffiche}).

Cordialement,
L'équipe ASGF`
            } else if (body.type_relance === "carte_membre") {
              subject = "Rappel : Paiement de votre carte membre ASGF"
              const tarifInfo = getTarifInfoForCountry(membre.pays)
              const tarifAffiche = `${tarifInfo.montant} ${tarifInfo.symbol}`
              messageBody = `Bonjour {{prenom}} {{nom}},

Votre carte membre ASGF ({{numero_membre}}) est en attente de paiement (${tarifAffiche}).

Cordialement,
L'équipe ASGF`
            } else {
              messageBody = `Bonjour {{prenom}} {{nom}},

${body.commentaire || "Rappel important de l'ASGF."}

Cordialement,
L'équipe ASGF`
            }

            const htmlMessage = messageBody.replace(/\n/g, "<br>")

            const payload = {
              type: "member_email",
              recipients: [{
                email: membre.email,
                prenom: membre.prenom,
                nom: membre.nom,
                numero_membre: membre.numero_membre || "",
                pays: membre.pays || "",
              }],
              subject,
              bodyTemplate: htmlMessage,
              token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
            }

            await fetch(APPSCRIPT_WEBHOOK_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(APPSCRIPT_WEBHOOK_TOKEN && {
                  "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
                }),
              },
              body: JSON.stringify(payload),
            })
          }
        } catch (emailErr) {
          console.error("Erreur envoi email relance", emailErr)
          // Ne pas faire échouer la création de relance si l'email échoue
        }
      }

      return jsonResponse({
        success: true,
        message: "Relance créée avec succès",
        data: relance,
      })
    }

    // ========== CARTES MEMBRES ==========

    // GET /cartes
    if (req.method === "GET" && relativePath === "cartes") {
      const search = searchParams.get("search") || ""
      const statut_carte = searchParams.get("statut_carte") || ""
      const statut_paiement = searchParams.get("statut_paiement") || ""

      let query = supabaseTresorerie
        .from("cartes_membres")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (statut_carte) {
        query = query.eq("statut_carte", statut_carte)
      }

      if (statut_paiement) {
        query = query.eq("statut_paiement", statut_paiement)
      }

      if (search) {
        query = query.ilike("numero_membre", `%${search}%`)
      }

      const { data: cartes, error, count } = await query

      if (error) {
        console.error("listCartes error", error)
        throw new Error("Erreur lors de la récupération des cartes membres")
      }

      const cartesWithMembers = await Promise.all(
        (cartes || []).map(async (carte: any) => {
          const info = getTarifInfoForCountry(carte.pays)
          let membreInfo = null
          if (carte.numero_membre) {
            const { data: membre } = await supabaseAdhesion
              .from("members")
              .select("id, prenom, nom, email, numero_membre, pays")
              .eq("numero_membre", carte.numero_membre)
              .maybeSingle()
            membreInfo = membre
          }
          return {
            ...carte,
            devise: info.devise,
            currencySymbol: info.symbol,
            membre: membreInfo,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: cartesWithMembers,
        pagination: {
          page: 1,
          limit: count || 0,
          total: count || 0,
          totalPages: 1,
        },
      })
    }

    // GET /cartes/numero/:numero
    const carteNumeroMatch = relativePath.match(/^cartes\/numero\/(.+)$/)
    if (carteNumeroMatch && req.method === "GET") {
      const numero = carteNumeroMatch[1]
      const { data, error } = await supabaseTresorerie
        .from("cartes_membres")
        .select("*")
        .eq("numero_membre", numero)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("getCarteByNumero error", error)
        throw new Error("Erreur lors de la récupération de la carte membre")
      }

      if (!data) {
        return jsonResponse(
          { success: false, message: "Carte introuvable" },
          { status: 404 },
        )
      }

      const tarifInfo = getTarifInfoForCountry(data.pays)
      return jsonResponse({
        success: true,
        data: {
          ...data,
          devise: tarifInfo.devise,
          currencySymbol: tarifInfo.symbol,
        },
      })
    }

    // POST /cartes
    if (req.method === "POST" && relativePath === "cartes") {
      const body = await req.json().catch(() => ({}))
      
      let membre = null
      const numeroMembre = body.numero_membre || body.membre_id

      if (body.membre_id) {
        membre = await fetchMemberById(supabaseAdhesion, body.membre_id)
      } else if (body.numero_membre) {
        const { data } = await supabaseAdhesion
          .from("members")
          .select("*")
          .eq("numero_membre", body.numero_membre)
          .maybeSingle()
        membre = data
      }

      if (!numeroMembre) {
        throw new Error("Le numéro de membre est obligatoire pour créer une carte")
      }

      const pays = body.pays || membre?.pays || null
      const tarifInfo = getTarifInfoForCountry(pays)

      // Upload PDF vers Google Drive si fourni (avec fallback vers Supabase Storage)
      let lienPdf = body.lien_pdf || null
      if (body.pdf_base64) {
        console.log(`Génération PDF détectée pour ${numeroMembre}`)
        try {
          // Créer un client Supabase pour le storage (utilise le même projet mais sans schéma spécifique)
          const supabaseStorage = createClient(PROJECT_URL, SERVICE_ROLE_KEY)
          lienPdf = await uploadCartePDFToDrive(body.pdf_base64, numeroMembre, supabaseStorage)
          if (lienPdf) {
            console.log(`PDF uploadé avec succès, lien: ${lienPdf}`)
          } else {
            console.warn("⚠️ Échec upload PDF - ni Google Drive ni Supabase Storage n'ont fonctionné")
          }
        } catch (uploadErr) {
          console.error("Erreur upload PDF", uploadErr)
          // Ne pas bloquer la création de la carte si l'upload échoue
        }
      }

      // Vérifier si la carte existe déjà
      const { data: existingCarte } = await supabaseTresorerie
        .from("cartes_membres")
        .select("*")
        .eq("numero_membre", numeroMembre)
        .maybeSingle()

      let data
      let error
      let isUpdate = false

      if (existingCarte) {
        // Carte existe déjà - Mettre à jour
        isUpdate = true
        console.log(`Carte existante trouvée pour ${numeroMembre}, mise à jour au lieu de création`)
        const updateData: any = {}
        if (body.date_emission) updateData.date_emission = body.date_emission
        if (body.date_validite) updateData.date_validite = body.date_validite
        if (pays) updateData.pays = pays
        if (body.statut_carte) updateData.statut_carte = body.statut_carte
        if (body.statut_paiement !== undefined)
          updateData.statut_paiement = body.statut_paiement
        if (lienPdf) updateData.lien_pdf = lienPdf

        const result = await supabaseTresorerie
          .from("cartes_membres")
          .update(updateData)
          .eq("id", existingCarte.id)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        // Créer une nouvelle carte
        const result = await supabaseTresorerie
          .from("cartes_membres")
          .insert({
            numero_membre: numeroMembre,
            date_emission: body.date_emission || null,
            date_validite: body.date_validite || null,
            pays,
            statut_carte: body.statut_carte || null,
            statut_paiement: body.statut_paiement || null,
            lien_pdf: lienPdf || null,
          })
          .select()
          .single()
        data = result.data
        error = result.error
        
        // Si erreur de contrainte unique (doublon créé entre-temps), essayer de récupérer la carte existante
        if (error && (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint'))) {
          console.log(`Erreur contrainte unique détectée pour ${numeroMembre}, récupération de la carte existante`)
          const { data: duplicateCarte } = await supabaseTresorerie
            .from("cartes_membres")
            .select("*")
            .eq("numero_membre", numeroMembre)
            .maybeSingle()
          
          if (duplicateCarte) {
            // La carte existe maintenant, mettre à jour
            isUpdate = true
            const updateData: any = {}
            if (body.date_emission) updateData.date_emission = body.date_emission
            if (body.date_validite) updateData.date_validite = body.date_validite
            if (pays) updateData.pays = pays
            if (body.statut_carte) updateData.statut_carte = body.statut_carte
            if (body.statut_paiement !== undefined)
              updateData.statut_paiement = body.statut_paiement
            if (lienPdf) updateData.lien_pdf = lienPdf

            const updateResult = await supabaseTresorerie
              .from("cartes_membres")
              .update(updateData)
              .eq("id", duplicateCarte.id)
              .select()
              .single()
            data = updateResult.data
            error = updateResult.error
            console.log(`Carte mise à jour après détection de doublon pour ${numeroMembre}`)
          } else {
            // Erreur inattendue
            throw new Error(`Une carte avec le numéro ${numeroMembre} existe déjà. Veuillez utiliser la mise à jour.`)
          }
        }
      }

      if (error) {
        console.error("createCarte error", error)
        throw new Error(`Erreur lors de la ${isUpdate ? 'mise à jour' : 'création'} de la carte membre: ${error.message}`)
      }

      return jsonResponse({
        success: true,
        message: isUpdate 
          ? `La carte membre ${numeroMembre} existe déjà et a été mise à jour.` 
          : "Carte créée avec succès",
        data: {
          ...data,
          devise: tarifInfo.devise,
          currencySymbol: tarifInfo.symbol,
        },
      })
    }

    // PUT /cartes/:id
    const carteUpdateMatch = relativePath.match(/^cartes\/([0-9a-fA-F-]+)$/)
    if (carteUpdateMatch && req.method === "PUT") {
      const id = carteUpdateMatch[1]
      const body = await req.json().catch(() => ({}))
      const { data, error } = await supabaseTresorerie
        .from("cartes_membres")
        .update(body)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("updateCarte error", error)
        throw new Error("Erreur lors de la mise à jour de la carte membre")
      }

      const tarifInfo = getTarifInfoForCountry(data.pays)
      return jsonResponse({
        success: true,
        message: "Carte mise à jour avec succès",
        data: {
          ...data,
          devise: tarifInfo.devise,
          currencySymbol: tarifInfo.symbol,
        },
      })
    }

    // ========== HISTORIQUE ==========

    // GET /historique
    if (req.method === "GET" && relativePath === "historique") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const action = searchParams.get("action") || ""

      let query = supabaseTresorerie
        .from("historique")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (action) {
        query = query.eq("action", action)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: historique, error, count } = await query

      if (error) {
        console.error("listHistorique error", error)
        throw new Error("Erreur lors de la récupération de l'historique")
      }

      return jsonResponse({
        success: true,
        data: historique || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /historique
    if (req.method === "POST" && relativePath === "historique") {
      const body = await req.json().catch(() => ({}))
      const { data, error } = await supabaseTresorerie
        .from("historique")
        .insert({
          action: body.action,
          membre_id: body.membre_id || null,
          montant: body.montant || null,
          description: body.description || null,
          admin_id: body.admin_id || adminId || null,
        })
        .select()
        .single()

      if (error) {
        console.error("createHistorique error", error)
        throw new Error("Erreur lors de la création de l'entrée d'historique")
      }

      return jsonResponse({
        success: true,
        message: "Entrée d'historique créée avec succès",
        data,
      })
    }

    // ========== GÉNÉRATION AUTOMATIQUE ==========

    // POST /cotisations/generate-monthly
    if (req.method === "POST" && relativePath === "cotisations/generate-monthly") {
      const body = await req.json().catch(() => ({}))
      const mois = parseInt(String(body.mois || ""), 10)
      const annee = parseInt(String(body.annee || ""), 10)

      if (!mois || !annee || mois < 1 || mois > 12) {
        return jsonResponse(
          { success: false, message: "mois (1-12) et annee sont requis" },
          { status: 400 },
        )
      }

      // Récupérer tous les membres approuvés
      const { data: membres, error: membresError } = await supabaseAdhesion
        .from("members")
        .select(MEMBER_FIELDS)
        .eq("status", "approved")

      if (membresError || !membres || membres.length === 0) {
        return jsonResponse({
          success: true,
          message: "Aucun membre approuvé trouvé",
          data: { created: 0, skipped: 0 },
        })
      }

      let created = 0
      let skipped = 0

      for (const membre of membres) {
        // Vérifier si une cotisation existe déjà
        const { data: existing } = await supabaseTresorerie
          .from("cotisations")
          .select("id")
          .eq("membre_id", membre.id)
          .eq("periode_mois", mois)
          .eq("periode_annee", annee)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        // Créer la cotisation
        const tarifInfo = getTarifInfoForCountry(membre.pays)
        const { error: insertError } = await supabaseTresorerie
          .from("cotisations")
          .insert({
            membre_id: membre.id,
            periode_mois: mois,
            periode_annee: annee,
            montant: tarifInfo.montant,
            devise: tarifInfo.devise,
            statut_paiement: "en_attente",
            date_creation: new Date().toISOString(),
          })

        if (!insertError) {
          created++
        } else {
          skipped++
        }
      }

      return jsonResponse({
        success: true,
        message: `${created} cotisation(s) générée(s), ${skipped} ignorée(s)`,
        data: { created, skipped },
      })
    }

    // POST /cotisations/update-overdue
    if (req.method === "POST" && relativePath === "cotisations/update-overdue") {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      // Cotisations de l'année précédente
      const { data: oldYear } = await supabaseTresorerie
        .from("cotisations")
        .select("id")
        .eq("statut_paiement", "en_attente")
        .lt("periode_annee", currentYear)

      // Cotisations de l'année courante mais mois dépassé
      const { data: currentYearCotisations } = await supabaseTresorerie
        .from("cotisations")
        .select("id")
        .eq("statut_paiement", "en_attente")
        .eq("periode_annee", currentYear)
        .lt("periode_mois", currentMonth)

      const ids = [
        ...(oldYear || []).map((c) => c.id),
        ...(currentYearCotisations || []).map((c) => c.id),
      ]

      if (ids.length === 0) {
        return jsonResponse({
          success: true,
          message: "Aucune cotisation en retard trouvée",
          data: { updated: 0 },
        })
      }

      const { error } = await supabaseTresorerie
        .from("cotisations")
        .update({ statut_paiement: "non_paye" })
        .in("id", ids)

      if (error) {
        throw new Error("Erreur lors de la mise à jour des cotisations")
      }

      return jsonResponse({
        success: true,
        message: `${ids.length} cotisation(s) mise(s) à jour`,
        data: { updated: ids.length },
      })
    }

    // POST /cotisations/clean-duplicates
    if (req.method === "POST" && relativePath === "cotisations/clean-duplicates") {
      const { data: allCotisations, error } = await supabaseTresorerie
        .from("cotisations")
        .select("id, membre_id, periode_mois, periode_annee, created_at")
        .order("created_at", { ascending: false })

      if (error || !allCotisations || allCotisations.length === 0) {
        return jsonResponse({
          success: true,
          message: "Aucune cotisation à nettoyer",
          data: { removed: 0 },
        })
      }

      // Grouper par membre_id + periode_mois + periode_annee
      const groups: Record<string, any[]> = {}
      allCotisations.forEach((cot) => {
        const key = `${cot.membre_id}_${cot.periode_mois}_${cot.periode_annee}`
        if (!groups[key]) groups[key] = []
        groups[key].push(cot)
      })

      const idsToRemove: string[] = []
      Object.values(groups).forEach((group) => {
        if (group.length > 1) {
          group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          group.slice(1).forEach((dup) => idsToRemove.push(dup.id))
        }
      })

      if (idsToRemove.length > 0) {
        const { error: deleteError } = await supabaseTresorerie
          .from("cotisations")
          .delete()
          .in("id", idsToRemove)

        if (deleteError) {
          throw new Error("Erreur lors de la suppression des doublons")
        }
      }

      return jsonResponse({
        success: true,
        message: `${idsToRemove.length} doublon(s) supprimé(s)`,
        data: { removed: idsToRemove.length },
      })
    }

    // POST /cotisations/create-missing
    if (req.method === "POST" && relativePath === "cotisations/create-missing") {
      const body = await req.json().catch(() => ({}))
      const currentYear = body.annee || new Date().getFullYear()
      const currentMonth = body.mois || new Date().getMonth() + 1

      const { data: membres, error: membresError } = await supabaseAdhesion
        .from("members")
        .select(MEMBER_FIELDS)
        .eq("status", "approved")

      if (membresError || !membres || membres.length === 0) {
        return jsonResponse({
          success: true,
          message: "Aucun membre approuvé trouvé",
          data: { created: 0, skipped: 0, total: 0 },
        })
      }

      let created = 0
      let skipped = 0

      for (const membre of membres) {
        const { data: existing } = await supabaseTresorerie
          .from("cotisations")
          .select("id")
          .eq("membre_id", membre.id)
          .limit(1)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        const tarifInfo = getTarifInfoForCountry(membre.pays)
        const { error: insertError } = await supabaseTresorerie
          .from("cotisations")
          .insert({
            membre_id: membre.id,
            periode_mois: currentMonth,
            periode_annee: currentYear,
            montant: tarifInfo.montant,
            devise: tarifInfo.devise,
            statut_paiement: "en_attente",
            date_creation: new Date().toISOString(),
          })

        if (!insertError) {
          created++
        } else {
          skipped++
        }
      }

      return jsonResponse({
        success: true,
        message: `${created} cotisation(s) manquante(s) créée(s)`,
        data: { created, skipped, total: membres.length },
      })
    }

    // POST /cartes/:id/generate-pdf
    const carteGeneratePdfMatch = relativePath.match(/^cartes\/([0-9a-fA-F-]+)\/generate-pdf$/)
    if (req.method === "POST" && carteGeneratePdfMatch) {
      const carteId = carteGeneratePdfMatch[1]
      return jsonResponse({
        success: false,
        message:
          "La génération de PDF pour les cartes membres nécessite le backend Express (images, logos, design complexe). Pour l'instant, utilisez l'interface admin pour générer les cartes via le backend Express local.",
      })
    }

    // POST /cartes/generate-missing-pdfs
    if (req.method === "POST" && relativePath === "cartes/generate-missing-pdfs") {
      return jsonResponse({
        success: false,
        message:
          "La génération de PDF en masse pour les cartes membres nécessite le backend Express (images, logos, design complexe). Pour l'instant, utilisez l'interface admin pour générer les cartes via le backend Express local.",
      })
    }

    // GET /exports/cotisations
    if (req.method === "GET" && relativePath === "exports/cotisations") {
      const format = searchParams.get("format") || "csv"
      const periode_mois = searchParams.get("periode_mois")
      const periode_annee = searchParams.get("periode_annee")
      const statut = searchParams.get("statut")

      const filters: any = {}
      if (periode_mois) filters.periode_mois = parseInt(periode_mois, 10)
      if (periode_annee) filters.periode_annee = parseInt(periode_annee, 10)
      if (statut) filters.statut = statut

      let query = supabaseTresorerie
        .from("cotisations")
        .select("*")
        .order("periode_annee", { ascending: false })
        .order("periode_mois", { ascending: false })

      query = applyPeriodFilters(query, filters)
      if (filters.statut) {
        query = query.eq("statut_paiement", filters.statut)
      }

      const { data: cotisations, error } = await query

      if (error) {
        throw new Error("Impossible de récupérer les cotisations pour export")
      }

      const memberIds = cotisations?.map((c: any) => c.membre_id).filter(Boolean) || []
      const membresMap = await fetchMembersMap(supabaseAdhesion, memberIds)

      const rows = (cotisations || []).map((item: any) => {
        const membre = membresMap.get(item.membre_id) || null
        const tarifInfo = getTarifInfoForCountry(membre?.pays)
        return {
          periode: buildPeriodLabel(item.periode_mois, item.periode_annee, item.date_paiement),
          membre: membre ? `${membre.prenom || ""} ${membre.nom || ""}`.trim() : "—",
          email: membre?.email || "",
          pays: membre?.pays || "",
          montant_brut: formatCurrency(item.montant, tarifInfo.symbol || "€"),
          montant_eur: formatCurrency(convertToEuro(item.montant, tarifInfo)),
          statut: item.statut_paiement || "en_attente",
          mode_paiement: item.mode_paiement || "",
          date_paiement: formatDateLabel(item.date_paiement),
        }
      })

      const columns = [
        { key: "periode", label: "Période" },
        { key: "membre", label: "Membre" },
        { key: "email", label: "Email" },
        { key: "pays", label: "Pays" },
        { key: "montant_brut", label: "Montant (origine)" },
        { key: "montant_eur", label: "Montant (EUR)" },
        { key: "statut", label: "Statut" },
        { key: "mode_paiement", label: "Mode paiement" },
        { key: "date_paiement", label: "Date paiement" },
      ]

      const csv = buildCsv(rows, columns)
      const fileName = buildFileName("cotisations", "csv", filters)

      const headers = new Headers(CORS_HEADERS)
      headers.set("Content-Type", "text/csv; charset=utf-8")
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

      return new Response(csv, { headers })
    }

    // GET /exports/paiements
    if (req.method === "GET" && relativePath === "exports/paiements") {
      const format = searchParams.get("format") || "csv"
      const periode_mois = searchParams.get("periode_mois")
      const periode_annee = searchParams.get("periode_annee")
      const type_paiement = searchParams.get("type_paiement")
      const statut = searchParams.get("statut")

      const filters: any = {}
      if (periode_mois) filters.periode_mois = parseInt(periode_mois, 10)
      if (periode_annee) filters.periode_annee = parseInt(periode_annee, 10)
      if (type_paiement) filters.type_paiement = type_paiement
      if (statut) filters.statut = statut

      let query = supabaseTresorerie
        .from("paiements")
        .select("*")
        .order("date_paiement", { ascending: false })

      query = applyPeriodFilters(query, filters)
      if (filters.type_paiement) {
        query = query.eq("type_paiement", filters.type_paiement)
      }
      if (filters.statut) {
        query = query.eq("statut", filters.statut)
      }

      const { data: paiements, error } = await query

      if (error) {
        throw new Error("Impossible de récupérer les paiements pour export")
      }

      const memberIds = paiements?.map((p: any) => p.membre_id).filter(Boolean) || []
      const membresMap = await fetchMembersMap(supabaseAdhesion, memberIds)

      const rows = (paiements || []).map((item: any) => {
        const membre = membresMap.get(item.membre_id) || null
        return {
          periode: buildPeriodLabel(item.periode_mois, item.periode_annee, item.date_paiement),
          membre: membre ? `${membre.prenom || ""} ${membre.nom || ""}`.trim() : "—",
          type_paiement: item.type_paiement || "",
          statut: item.statut || "",
          montant_eur: formatCurrency(item.montant || 0),
          mode_paiement: item.mode_paiement || "",
          date_paiement: formatDateLabel(item.date_paiement),
          details: item.details || "",
        }
      })

      const columns = [
        { key: "periode", label: "Période" },
        { key: "membre", label: "Membre" },
        { key: "type_paiement", label: "Type" },
        { key: "statut", label: "Statut" },
        { key: "montant_eur", label: "Montant (EUR)" },
        { key: "mode_paiement", label: "Mode" },
        { key: "date_paiement", label: "Date paiement" },
        { key: "details", label: "Commentaires" },
      ]

      const csv = buildCsv(rows, columns)
      const fileName = buildFileName("paiements", "csv", filters)

      const headers = new Headers(CORS_HEADERS)
      headers.set("Content-Type", "text/csv; charset=utf-8")
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

      return new Response(csv, { headers })
    }

    // GET /exports/depenses
    if (req.method === "GET" && relativePath === "exports/depenses") {
      const format = searchParams.get("format") || "csv"
      const periode_mois = searchParams.get("periode_mois")
      const periode_annee = searchParams.get("periode_annee")
      const statut = searchParams.get("statut")

      const filters: any = {}
      if (periode_mois) filters.periode_mois = parseInt(periode_mois, 10)
      if (periode_annee) filters.periode_annee = parseInt(periode_annee, 10)
      if (statut) filters.statut = statut

      let query = supabaseTresorerie
        .from("depenses")
        .select("*")
        .order("date_depense", { ascending: false })

      if (filters.statut) {
        query = query.eq("statut", filters.statut)
      }

      const { start, end } = resolveDateRange(filters)
      if (start) {
        query = query.gte("date_depense", start)
      }
      if (end) {
        query = query.lt("date_depense", end)
      }

      const { data: depenses, error } = await query

      if (error) {
        throw new Error("Impossible de récupérer les dépenses pour export")
      }

      const rows = (depenses || []).map((item: any) => ({
        periode: buildPeriodLabel(filters.periode_mois, filters.periode_annee, item.date_depense),
        titre: item.titre,
        categorie: item.categorie || "",
        statut: item.statut || "",
        montant: formatCurrency(item.montant, item.devise || "EUR"),
        montant_eur: formatCurrency(convertCurrencyToEuro(item.montant, item.devise)),
        date_depense: formatDateLabel(item.date_depense),
        justificatif: item.justificatif_url || "",
      }))

      const columns = [
        { key: "periode", label: "Période" },
        { key: "titre", label: "Titre" },
        { key: "categorie", label: "Catégorie" },
        { key: "statut", label: "Statut" },
        { key: "montant", label: "Montant (origine)" },
        { key: "montant_eur", label: "Montant (EUR)" },
        { key: "date_depense", label: "Date" },
        { key: "justificatif", label: "Justificatif" },
      ]

      const csv = buildCsv(rows, columns)
      const fileName = buildFileName("depenses", "csv", filters)

      const headers = new Headers(CORS_HEADERS)
      headers.set("Content-Type", "text/csv; charset=utf-8")
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

      return new Response(csv, { headers })
    }

    // GET /exports/rapport
    if (req.method === "GET" && relativePath === "exports/rapport") {
      const periode_mois = searchParams.get("periode_mois")
      const periode_annee = searchParams.get("periode_annee")

      const filters: any = {}
      if (periode_mois) filters.periode_mois = parseInt(periode_mois, 10)
      if (periode_annee) filters.periode_annee = parseInt(periode_annee, 10)

      // Récupérer les données pour le rapport
      let queryCotisations = supabaseTresorerie
        .from("cotisations")
        .select("*")
        .order("periode_annee", { ascending: false })
        .order("periode_mois", { ascending: false })

      queryCotisations = applyPeriodFilters(queryCotisations, filters)

      let queryPaiements = supabaseTresorerie
        .from("paiements")
        .select("*")
        .order("date_paiement", { ascending: false })

      queryPaiements = applyPeriodFilters(queryPaiements, filters)

      let queryDepenses = supabaseTresorerie
        .from("depenses")
        .select("*")
        .order("date_depense", { ascending: false })

      if (filters.statut) {
        queryDepenses = queryDepenses.eq("statut", filters.statut)
      }

      const { start, end } = resolveDateRange(filters)
      if (start) {
        queryDepenses = queryDepenses.gte("date_depense", start)
      }
      if (end) {
        queryDepenses = queryDepenses.lt("date_depense", end)
      }

      const [{ data: cotisations, error: cotErr }, { data: paiements, error: paiErr }, { data: depenses, error: depErr }] = await Promise.all([
        queryCotisations,
        queryPaiements,
        queryDepenses,
      ])

      if (cotErr || paiErr || depErr) {
        throw new Error("Impossible de récupérer les données pour le rapport")
      }

      const memberIds = [
        ...(cotisations?.map((c: any) => c.membre_id) || []),
        ...(paiements?.map((p: any) => p.membre_id) || []),
      ].filter(Boolean)
      const membresMap = await fetchMembersMap(supabaseAdhesion, memberIds)

      // Calculer les totaux
      const totalCotisations = (cotisations || []).reduce((acc: number, item: any) => {
        const membre = membresMap.get(item.membre_id)
        const tarifInfo = getTarifInfoForCountry(membre?.pays)
        return acc + (convertToEuro(item.montant, tarifInfo) || 0)
      }, 0)

      const totalPaiements = (paiements || []).reduce((acc: number, item: any) => acc + (item.montant || 0), 0)

      const totalDepenses = (depenses || []).reduce((acc: number, item: any) => acc + (convertCurrencyToEuro(item.montant, item.devise) || 0), 0)

      const solde = totalCotisations + totalPaiements - totalDepenses

      // Générer le PDF avec pdf-lib
      try {
        const { PDFDocument, StandardFonts } = await import("pdf-lib")

        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([595, 842]) // A4
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        let y = 800
        const pageWidth = page.getWidth()
        const margin = 50
        const lineHeight = 20

        // Titre
        page.drawText("Rapport Trésorerie", {
          x: margin,
          y,
          size: 20,
          font: fontBold,
        })
        y -= 30

        const periodLabel = buildPeriodLabel(filters.periode_mois, filters.periode_annee, new Date())
        page.drawText(`Période: ${periodLabel}`, {
          x: margin,
          y,
          size: 12,
          font: font,
        })
        y -= 15

        page.drawText(`Généré le: ${new Date().toLocaleDateString("fr-FR")}`, {
          x: margin,
          y,
          size: 12,
          font: font,
        })
        y -= 30

        // Synthèse financière
        page.drawText("Synthèse financière", {
          x: margin,
          y,
          size: 14,
          font: fontBold,
        })
        y -= 25

        page.drawText(`Total cotisations (EUR): ${formatCurrency(totalCotisations)}`, {
          x: margin,
          y,
          size: 12,
          font: font,
        })
        y -= lineHeight

        page.drawText(`Total paiements (EUR): ${formatCurrency(totalPaiements)}`, {
          x: margin,
          y,
          size: 12,
          font: font,
        })
        y -= lineHeight

        page.drawText(`Total dépenses (EUR): ${formatCurrency(totalDepenses)}`, {
          x: margin,
          y,
          size: 12,
          font: font,
        })
        y -= lineHeight

        page.drawText(`Solde net: ${formatCurrency(solde)}`, {
          x: margin,
          y,
          size: 12,
          font: fontBold,
        })
        y -= 30

        // Top cotisations
        const topCotisations = (cotisations || []).slice(0, 5)
        if (topCotisations.length > 0) {
          page.drawText("Top cotisations", {
            x: margin,
            y,
            size: 14,
            font: fontBold,
          })
          y -= 25

          topCotisations.forEach((item: any, index: number) => {
            const membre = membresMap.get(item.membre_id)
            const membreNom = membre ? `${membre.prenom || ""} ${membre.nom || ""}`.trim() : "—"
            const tarifInfo = getTarifInfoForCountry(membre?.pays)
            const montantEur = convertToEuro(item.montant, tarifInfo)

            page.drawText(`${index + 1}. ${membreNom} • ${buildPeriodLabel(item.periode_mois, item.periode_annee, item.date_paiement)} • ${formatCurrency(montantEur)}`, {
              x: margin,
              y,
              size: 11,
              font: font,
            })
            y -= lineHeight
          })
          y -= 15
        }

        // Top dépenses
        const topDepenses = (depenses || []).slice(0, 5)
        if (topDepenses.length > 0) {
          page.drawText("Principales dépenses", {
            x: margin,
            y,
            size: 14,
            font: fontBold,
          })
          y -= 25

          topDepenses.forEach((item: any, index: number) => {
            const montantEur = convertCurrencyToEuro(item.montant, item.devise)
            page.drawText(`${index + 1}. ${item.titre} • ${formatDateLabel(item.date_depense)} • ${formatCurrency(montantEur)}`, {
              x: margin,
              y,
              size: 11,
              font: font,
            })
            y -= lineHeight
          })
        }

        const pdfBytes = await pdfDoc.save()

        const fileName = buildFileName("rapport-tresorerie", "pdf", filters)

        const headers = new Headers(CORS_HEADERS)
        headers.set("Content-Type", "application/pdf")
        headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

        return new Response(pdfBytes, { headers })
      } catch (pdfError) {
        console.error("Erreur génération PDF", pdfError)
        return jsonResponse({
          success: false,
          message: `Erreur lors de la génération du PDF: ${(pdfError as Error).message}`,
        })
      }
    }

    // Route non trouvée
    console.log("Route non trouvée - relativePath:", relativePath, "method:", req.method)
    return jsonResponse(
      { success: false, message: `Route non trouvée: ${req.method} /${relativePath}` },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-tresorerie exception", err)
    return jsonResponse(
      { success: false, message: (err as Error).message || "Erreur serveur" },
      { status: 500 },
    )
  }
})
