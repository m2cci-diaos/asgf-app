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

async function listMembers(supabaseAdhesion: any, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  
  // Support du filtrage par IDs (pour l'envoi d'emails)
  let ids: string[] | null = null
  const idsParam = searchParams.get("ids")
  if (idsParam) {
    try {
      ids = JSON.parse(idsParam)
      if (!Array.isArray(ids)) {
        ids = null
      }
    } catch {
      // Si ce n'est pas du JSON, essayer comme une liste séparée par des virgules
      ids = idsParam.split(",").map((id) => id.trim()).filter((id) => id)
      if (ids.length === 0) {
        ids = null
      }
    }
  }

  let query = supabaseAdhesion
    .from("members")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })

  // Filtre par IDs (prioritaire si fourni)
  if (ids && Array.isArray(ids) && ids.length > 0) {
    query = query.in("id", ids)
  } else {
    // Recherche par nom, prénom, email ou numéro de membre (seulement si pas de filtrage par IDs)
    if (search) {
      query = query.or(
        `prenom.ilike.%${search}%,nom.ilike.%${search}%,email.ilike.%${search}%,numero_membre.ilike.%${search}%`,
      )
    }

    // Filtre par statut
    if (status) {
      query = query.eq("status", status)
    }

    // Pagination (seulement si pas de filtrage par IDs)
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query
  if (error) {
    console.error("listMembers error", error)
    throw new Error("Erreur lors de la récupération des membres")
  }

  return {
    members: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }
}

async function getMemberById(supabaseAdhesion: any, id: string) {
  const { data, error } = await supabaseAdhesion
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("getMemberById error", error)
    throw new Error("Erreur lors de la récupération du membre")
  }
  return data
}

async function approveMember(supabaseAdhesion: any, id: string, adminId: string) {
  const { data, error } = await supabaseAdhesion
    .from("members")
    .update({
      status: "approved",
      validated_at: new Date().toISOString(),
      validated_by: adminId,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("approveMember error", error)
    throw new Error("Erreur lors de la validation du membre")
  }
  if (!data) {
    throw new Error("Membre introuvable")
  }
  return data
}

async function rejectMember(supabaseAdhesion: any, id: string, adminId: string) {
  const { data, error } = await supabaseAdhesion
    .from("members")
    .update({
      status: "rejected",
      validated_at: new Date().toISOString(),
      validated_by: adminId,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("rejectMember error", error)
    throw new Error("Erreur lors du rejet du membre")
  }
  if (!data) {
    throw new Error("Membre introuvable")
  }
  return data
}

async function updateMember(
  supabaseAdhesion: any,
  id: string,
  memberData: Record<string, unknown>,
) {
  const allowedColumns = [
    "prenom",
    "nom",
    "email",
    "telephone",
    "date_naissance",
    "universite",
    "niveau_etudes",
    "annee_universitaire",
    "specialite",
    "interets",
    "motivation",
    "competences",
    "is_newsletter_subscribed",
    "is_active",
    "adresse",
    "ville",
    "pays",
    "status",
    "statut_pro",
    "domaine",
    "date_adhesion",
  ]

  const rawData: Record<string, unknown> = {}
  allowedColumns.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(memberData, key)) {
      rawData[key] = memberData[key]
    }
  })

  const updateData: Record<string, unknown> = {}
  allowedColumns.forEach((key) => {
    const value = rawData[key]
    if (value === undefined) return

    if (key === "interets") {
      if (!value || value === "") {
        updateData[key] = null
      } else if (Array.isArray(value)) {
        updateData[key] = value.length > 0 ? value : null
      } else if (typeof value === "string") {
        const interests = value.split(",").map((i) => i.trim()).filter((i) => i)
        updateData[key] = interests.length > 0 ? interests : null
      } else {
        updateData[key] = null
      }
    } else if (key === "is_newsletter_subscribed" || key === "is_active") {
      updateData[key] = Boolean(value)
    } else if (key === "date_naissance" || key === "date_adhesion") {
      updateData[key] = value && value !== "" ? value : null
    } else if (key === "prenom" || key === "nom" || key === "email") {
      updateData[key] = value || ""
    } else {
      updateData[key] = value && value !== "" ? value : null
    }
  })

  if (!updateData.prenom || !updateData.nom || !updateData.email) {
    throw new Error("Les champs prénom, nom et email sont requis")
  }

  const { data, error } = await supabaseAdhesion
    .from("members")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("updateMember error", error)
    throw new Error(error.message || "Erreur lors de la mise à jour du membre")
  }
  if (!data) {
    throw new Error("Membre introuvable")
  }
  return data
}

async function deleteMember(
  supabaseAdhesion: any,
  supabaseTresorerie: any,
  id: string,
) {
  const { data: member, error: fetchError } = await supabaseAdhesion
    .from("members")
    .select("id, numero_membre")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) {
    console.error("deleteMember fetch error", fetchError)
    throw new Error("Erreur lors de la récupération du membre")
  }

  if (!member) {
    throw new Error("Membre introuvable")
  }

  const { data: cartes } = await supabaseTresorerie
    .from("cartes_membres")
    .select("id")
    .eq("numero_membre", member.numero_membre)

  if (cartes && cartes.length > 0) {
    const { error: deleteCartesError } = await supabaseTresorerie
      .from("cartes_membres")
      .delete()
      .eq("numero_membre", member.numero_membre)

    if (deleteCartesError) {
      console.error("Erreur suppression cartes membres", deleteCartesError)
      throw new Error(
        "Impossible de supprimer les cartes membres associées",
      )
    }
  }

  const { data: cotisations } = await supabaseTresorerie
    .from("cotisations")
    .select("id")
    .eq("membre_id", id)

  if (cotisations && cotisations.length > 0) {
    const { error: deleteCotisationsError } = await supabaseTresorerie
      .from("cotisations")
      .delete()
      .eq("membre_id", id)

    if (deleteCotisationsError) {
      console.error("Erreur suppression cotisations", deleteCotisationsError)
      throw new Error("Impossible de supprimer les cotisations associées")
    }
  }

  const { data, error } = await supabaseAdhesion
    .from("members")
    .delete()
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("deleteMember error", error)
    if ((error as any).code === "23503") {
      throw new Error(
        "Ce membre ne peut pas être supprimé car il est référencé dans d'autres tables.",
      )
    }
    throw new Error("Erreur lors de la suppression du membre")
  }
  if (!data) {
    throw new Error("Membre introuvable")
  }
  return data
}

async function getPendingMembers(supabaseAdhesion: any) {
  const { data, error } = await supabaseAdhesion
    .from("members")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getPendingMembers error", error)
    throw new Error("Erreur lors de la récupération des membres en attente")
  }

  return data || []
}

async function getAdhesionStats(supabaseAdhesion: any) {
  // Total des membres
  const { count: totalMembers, error: totalError } = await supabaseAdhesion
    .from("members")
    .select("*", { count: "exact", head: true })

  if (totalError) {
    console.error("getAdhesionStats totalMembers error", totalError)
  }

  // Membres par statut
  const { data: statusData, error: statusError } = await supabaseAdhesion
    .from("members")
    .select("status")

  if (statusError) {
    console.error("getAdhesionStats statusData error", statusError)
  }

  const statusCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
  }

  if (statusData) {
    statusData.forEach((m: any) => {
      if (m.status === "pending") statusCounts.pending++
      else if (m.status === "approved") statusCounts.approved++
      else if (m.status === "rejected") statusCounts.rejected++
    })
  }

  // Membres actifs
  const { count: activeCount, error: activeError } = await supabaseAdhesion
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  if (activeError) {
    console.error("getAdhesionStats activeCount error", activeError)
  }

  // Répartition par pays
  const { data: countryData, error: countryError } = await supabaseAdhesion
    .from("members")
    .select("pays")
    .not("pays", "is", null)

  if (countryError) {
    console.error("getAdhesionStats countryData error", countryError)
  }

  const countryDistribution: Record<string, number> = {}
  if (countryData) {
    countryData.forEach((m: any) => {
      const country = m.pays || "Non renseigné"
      countryDistribution[country] = (countryDistribution[country] || 0) + 1
    })
  }

  // Évolution mensuelle (adhésions par mois)
  const { data: monthlyData, error: monthlyError } = await supabaseAdhesion
    .from("members")
    .select("created_at, status")
    .order("created_at", { ascending: true })

  if (monthlyError) {
    console.error("getAdhesionStats monthlyData error", monthlyError)
  }

  const monthlyEvolution: Record<
    string,
    { total: number; approved: number; pending: number; rejected: number }
  > = {}
  if (monthlyData) {
    monthlyData.forEach((m: any) => {
      const date = new Date(m.created_at)
      const month = String(date.getMonth() + 1)
      const key = `${date.getFullYear()}-${month.length === 1 ? "0" + month : month}`
      if (!monthlyEvolution[key]) {
        monthlyEvolution[key] = { total: 0, approved: 0, pending: 0, rejected: 0 }
      }
      monthlyEvolution[key].total++
      if (m.status === "approved") monthlyEvolution[key].approved++
      else if (m.status === "pending") monthlyEvolution[key].pending++
      else if (m.status === "rejected") monthlyEvolution[key].rejected++
    })
  }

  // Répartition par niveau d'études
  const { data: levelData, error: levelError } = await supabaseAdhesion
    .from("members")
    .select("niveau_etudes")
    .not("niveau_etudes", "is", null)

  if (levelError) {
    console.error("getAdhesionStats levelData error", levelError)
  }

  const levelDistribution: Record<string, number> = {}
  if (levelData) {
    levelData.forEach((m: any) => {
      const level = m.niveau_etudes || "Non renseigné"
      levelDistribution[level] = (levelDistribution[level] || 0) + 1
    })
  }

  // Répartition par université
  const { data: universityData, error: universityError } = await supabaseAdhesion
    .from("members")
    .select("universite")
    .not("universite", "is", null)

  if (universityError) {
    console.error("getAdhesionStats universityData error", universityError)
  }

  const universityDistribution: Record<string, number> = {}
  if (universityData) {
    universityData.forEach((m: any) => {
      const university = m.universite || "Non renseigné"
      universityDistribution[university] = (universityDistribution[university] || 0) + 1
    })
  }

  // Taux de croissance (adhésions ce mois vs mois précédent)
  const now = new Date()
  const currentMonthNum = String(now.getMonth() + 1)
  const currentMonth = `${now.getFullYear()}-${currentMonthNum.length === 1 ? "0" + currentMonthNum : currentMonthNum}`
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthNum = String(lastMonth.getMonth() + 1)
  const lastMonthKey = `${lastMonth.getFullYear()}-${lastMonthNum.length === 1 ? "0" + lastMonthNum : lastMonthNum}`

  const currentMonthCount = monthlyEvolution[currentMonth]?.total || 0
  const lastMonthCount = monthlyEvolution[lastMonthKey]?.total || 0
  const growthRate = lastMonthCount > 0
    ? ((currentMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1)
    : currentMonthCount > 0 ? "100.0" : "0.0"

  return {
    total_membres: totalMembers || 0,
    membres_actifs: activeCount || 0,
    membres_en_attente: statusCounts.pending,
    membres_approuves: statusCounts.approved,
    membres_rejetes: statusCounts.rejected,
    repartition_pays: countryDistribution,
    evolution_mensuelle: monthlyEvolution,
    repartition_niveau: levelDistribution,
    repartition_universite: universityDistribution,
    taux_croissance: parseFloat(growthRate),
    nombre_mois_courant: currentMonthCount,
    nombre_mois_precedent: lastMonthCount,
    // Alias pour compatibilité
    total_members: totalMembers || 0,
    active_members: activeCount || 0,
    pending_members: statusCounts.pending,
    approved_members: statusCounts.approved,
    rejected_members: statusCounts.rejected,
    // Alias pour les graphiques frontend
    country_distribution: countryDistribution,
    monthly_evolution: monthlyEvolution,
    level_distribution: levelDistribution,
  }
}

async function sendMemberEmail(
  supabaseAdhesion: any,
  memberIds: string[],
  subject: string,
  body: string,
  attachments: any[],
) {
  // Récupérer les membres concernés
  const { data: members, error: fetchError } = await supabaseAdhesion
    .from("members")
    .select("id, email, prenom, nom, numero_membre, pays")
    .in("id", memberIds)

  if (fetchError) {
    console.error("sendMemberEmail fetch error", fetchError)
    throw new Error("Erreur lors de la récupération des membres")
  }

  if (!members || members.length === 0) {
    throw new Error("Aucun membre trouvé avec les IDs fournis")
  }

  // Filtrer les membres avec email
  const recipients = (members || [])
    .filter((m: any) => {
      if (!m.email) {
        console.warn("Membre sans email ignoré", { id: m.id, prenom: m.prenom, nom: m.nom })
        return false
      }
      return true
    })
    .map((m: any) => ({
      email: m.email,
      prenom: m.prenom || "",
      nom: m.nom || "",
      numero_membre: m.numero_membre || "",
      pays: m.pays || "",
    }))

  if (!recipients.length) {
    throw new Error("Aucun des membres sélectionnés ne possède une adresse email")
  }

  // Valider les pièces jointes
  const validAttachments = (attachments || [])
    .filter((att: any) => {
      if (!att.name || !att.data || !att.type) {
        console.warn("Pièce jointe invalide ignorée", { att })
        return false
      }
      if (att.data.length === 0 || att.data.length > 10 * 1024 * 1024) {
        console.warn("Pièce jointe avec données invalides ignorée", {
          name: att.name,
          dataLength: att.data.length,
        })
        return false
      }
      return true
    })
    .map((att: any) => ({
      name: att.name,
      data: att.data,
      type: att.type,
    }))

  // Préparer le payload pour Google Apps Script
  const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
  const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

  if (!APPSCRIPT_WEBHOOK_URL) {
    throw new Error("Apps Script webhook non configuré")
  }

  const payload = {
    type: "member_email",
    recipients,
    subject,
    bodyTemplate: body,
    attachments: validAttachments,
    token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
  }

  // Appeler le webhook Google Apps Script
  const response = await fetch(APPSCRIPT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(APPSCRIPT_WEBHOOK_TOKEN && { "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN }),
    },
    body: JSON.stringify(payload),
  })

  const responseText = await response.text()

  if (!response.ok) {
    console.error("Apps Script webhook error", {
      status: response.status,
      body: responseText.substring(0, 500),
    })
    throw new Error(`Erreur HTTP ${response.status} lors de l'appel au script Google Apps Script`)
  }

  // Parser la réponse
  try {
    const responseData = JSON.parse(responseText)
    if (!responseData.success) {
      throw new Error(responseData.message || "Erreur lors de l'envoi via Google Apps Script")
    }
    return {
      success: true,
      message: responseData.message || `Email envoyé à ${recipients.length} membre(s)`,
    }
  } catch (parseErr) {
    // Réponse non-JSON mais statut OK
    return {
      success: true,
      message: `Email envoyé à ${recipients.length} membre(s)`,
    }
  }
}

async function logAudit(
  supabasePublic: any,
  {
    adminId,
    adminEmail,
    adminNom,
    actionType,
    entityType,
    entityId,
    entityName,
    module,
    changes,
    metadata,
  }: {
    adminId: string
    adminEmail?: string
    adminNom?: string
    actionType: string
    entityType: string
    entityId?: string
    entityName?: string
    module?: string
    changes?: unknown
    metadata?: unknown
  },
) {
  try {
    await supabasePublic.from("audit_log").insert({
      admin_id: adminId,
      admin_email: adminEmail || null,
      admin_nom: adminNom || null,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      module: module || null,
      changes: changes || null,
      metadata: metadata || null,
    })
  } catch (err) {
    console.error("logAudit error (non bloquant)", err)
  }
}

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

  // Décoder l'admin depuis le token (optionnel pour l'audit)
  let adminId: string | null = null
  let adminEmail: string | undefined
  let adminNom: string | undefined
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
      adminEmail = payload.email
      adminNom = payload.nom
    }
  } catch {
    // pas bloquant
  }

  const supabaseAdhesion = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "adhesion" },
  })
  const supabaseTresorerie = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "tresorerie" },
  })
  const supabasePublic = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "public" },
  })

  try {
    const { pathname, searchParams } = parseUrl(req.url)

    // Dans Supabase Edge Functions, le pathname peut être:
    // - /functions/v1/admin-adhesion-members/pending
    // - /admin-adhesion-members/pending  
    // - /pending (si c'est une sous-route)
    
    // Base path: /functions/v1/admin-adhesion-members
    const base = "/functions/v1/admin-adhesion-members"
    let relativePath = pathname
    
    // Extraire le chemin relatif après le nom de la fonction
    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-adhesion-members")) {
      relativePath = pathname.substring("/admin-adhesion-members".length)
    }
    
    // Normaliser le chemin relatif (supprimer les slashes multiples et en début/fin)
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""
    
    // Log pour debug
    console.log("Request URL:", req.url)
    console.log("Request pathname:", pathname)
    console.log("Base path:", base)
    console.log("Relative path:", relativePath)

    // GET /admin-adhesion-members -> liste (route racine)
    if (req.method === "GET" && (relativePath === "" || relativePath === "/")) {
      const result = await listMembers(supabaseAdhesion, searchParams)
      return jsonResponse({
        success: true,
        data: result.members,
        pagination: result.pagination,
      })
    }

    // GET /pending -> membres en attente
    if (req.method === "GET" && relativePath === "pending") {
      const members = await getPendingMembers(supabaseAdhesion)
      return jsonResponse({
        success: true,
        data: members,
      })
    }

    // GET /stats -> statistiques d'adhésion
    if (req.method === "GET" && relativePath === "stats") {
      const stats = await getAdhesionStats(supabaseAdhesion)
      return jsonResponse({
        success: true,
        data: stats,
      })
    }

    // POST /email -> envoyer un email aux membres
    if (req.method === "POST" && relativePath === "email") {
      if (!adminId) {
        return jsonResponse(
          { success: false, message: "Non authentifié" },
          { status: 401 },
        )
      }

      const body = await req.json().catch(() => ({}))
      const { member_ids: memberIds = [], subject, body: emailBody, attachments = [] } = body as any

      if (!subject || !emailBody) {
        return jsonResponse(
          { success: false, message: "Sujet et contenu du message sont requis" },
          { status: 400 },
        )
      }

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return jsonResponse(
          { success: false, message: "Aucun membre sélectionné pour l'envoi" },
          { status: 400 },
        )
      }

      try {
        const result = await sendMemberEmail(
          supabaseAdhesion,
          memberIds,
          subject,
          emailBody,
          attachments || [],
        )
        return jsonResponse({
          success: true,
          message: result.message,
        })
      } catch (err) {
        console.error("sendMemberEmail error", err)
        return jsonResponse(
          {
            success: false,
            message: (err as Error).message || "Erreur lors de l'envoi des emails",
          },
          { status: 500 },
        )
      }
    }

    // Routes avec ID: /:id, /:id/approve, /:id/reject
    // Le chemin relatif est maintenant normalisé sans slashes au début/fin
    const idMatch = relativePath.match(
      /^([0-9a-fA-F-]+)(?:\/(approve|reject))?$/,
    )
    if (idMatch) {
      const id = idMatch[1]
      const action = idMatch[2] || null

      if (!id) {
        return jsonResponse(
          { success: false, message: "ID invalide" },
          { status: 400 },
        )
      }

      if (!adminId) {
        return jsonResponse(
          { success: false, message: "Non authentifié" },
          { status: 401 },
        )
      }

      if (action === "approve" && req.method === "POST") {
        const member = await approveMember(supabaseAdhesion, id, adminId)
        await logAudit(supabasePublic, {
          adminId,
          adminEmail,
          adminNom,
          actionType: "APPROVE",
          entityType: "member",
          entityId: id,
          entityName:
            `${member.prenom || ""} ${member.nom || ""}`.trim() ||
            member.email,
          module: "adhesions",
          metadata: { email: member.email },
        })
        return jsonResponse({
          success: true,
          message: "Membre approuvé avec succès",
          data: member,
        })
      }

      if (action === "reject" && req.method === "POST") {
        const member = await rejectMember(supabaseAdhesion, id, adminId)
        await logAudit(supabasePublic, {
          adminId,
          adminEmail,
          adminNom,
          actionType: "REJECT",
          entityType: "member",
          entityId: id,
          entityName:
            `${member.prenom || ""} ${member.nom || ""}`.trim() ||
            member.email,
          module: "adhesions",
          metadata: { email: member.email },
        })
        return jsonResponse({
          success: true,
          message: "Membre rejeté avec succès",
          data: member,
        })
      }

      if (req.method === "PUT") {
        const body = await req.json().catch(() => ({}))
        const before = await getMemberById(supabaseAdhesion, id)
        const member = await updateMember(supabaseAdhesion, id, body || {})
        await logAudit(supabasePublic, {
          adminId: adminId || "",
          adminEmail,
          adminNom,
          actionType: "UPDATE",
          entityType: "member",
          entityId: id,
          entityName:
            `${member.prenom || ""} ${member.nom || ""}`.trim() ||
            member.email,
          module: "members",
          changes: before ? { before, after: member } : null,
        })
        return jsonResponse({
          success: true,
          message: "Membre mis à jour avec succès",
          data: member,
        })
      }

      if (req.method === "DELETE") {
        const before = await getMemberById(supabaseAdhesion, id)
        const member = await deleteMember(
          supabaseAdhesion,
          supabaseTresorerie,
          id,
        )
        await logAudit(supabasePublic, {
          adminId: adminId || "",
          adminEmail,
          adminNom,
          actionType: "DELETE",
          entityType: "member",
          entityId: id,
          entityName: before
            ? `${before.prenom || ""} ${before.nom || ""}`.trim() ||
              before.email
            : "Membre supprimé",
          module: "members",
          changes: before ? { deleted: before } : null,
        })
        return jsonResponse({
          success: true,
          message: "Membre supprimé avec succès",
          data: member,
        })
      }
    }

    // Route non trouvée - log pour debug
    console.log("Route non trouvée - relativePath:", relativePath, "method:", req.method, "full pathname:", pathname)
    return jsonResponse(
      { success: false, message: `Route non trouvée: ${req.method} /${relativePath}` },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-adhesion-members exception", err)
    return jsonResponse(
      { success: false, message: (err as Error).message || "Erreur serveur" },
      { status: 500 },
    )
  }
})




