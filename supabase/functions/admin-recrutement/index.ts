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

Deno.serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight) en premier
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }

  try {
    // Variables d'environnement
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const jwtSecret = Deno.env.get("JWT_SECRET") || ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(
        { success: false, message: "Configuration Supabase manquante" },
        { status: 500 },
      )
    }

    // Vérifier JWT si secret fourni
    if (jwtSecret) {
      try {
        await verifyJwt(req, jwtSecret)
      } catch (jwtError) {
        return jsonResponse(
          { success: false, message: "Token invalide" },
          { status: 401 },
        )
      }
    }

    // Créer les clients Supabase
    const supabaseRecrutement = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "recrutement" },
    })
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })
    const supabaseMentorat = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "mentorat" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-recrutement"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-recrutement")) {
      relativePath = pathname.substring("/admin-recrutement".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // Helper pour enrichir avec les données membres
    async function enrichWithMember(data: any, membreId: string | null) {
      if (!membreId) return null
      try {
        const { data: membre } = await supabaseAdhesion
          .from("members")
          .select("id, prenom, nom, email, telephone, numero_membre")
          .eq("id", membreId)
          .maybeSingle()
        return membre
      } catch (err) {
        console.error("Error fetching member", err)
        return null
      }
    }

    // ========== STATISTIQUES ==========

    // GET /stats
    if (req.method === "GET" && relativePath === "stats") {
      const [
        { count: totalCandidatures },
        { data: candidaturesData },
        { data: contratsData },
        { count: totalSuivis },
        { count: totalRecommandations },
        { data: suivisData },
      ] = await Promise.all([
        supabaseRecrutement
          .from("candidatures")
          .select("*", { count: "exact", head: true }),
        supabaseRecrutement
          .from("candidatures")
          .select("statut"),
        supabaseRecrutement
          .from("candidatures")
          .select("type_contrat"),
        supabaseRecrutement
          .from("suivi_candidatures")
          .select("*", { count: "exact", head: true }),
        supabaseRecrutement
          .from("recommandations")
          .select("*", { count: "exact", head: true }),
        supabaseRecrutement
          .from("suivi_candidatures")
          .select("type_event"),
      ])

      const candidaturesParStatut: Record<string, number> = {}
      ;(candidaturesData || []).forEach((c: any) => {
        candidaturesParStatut[c.statut] = (candidaturesParStatut[c.statut] || 0) + 1
      })

      const candidaturesParContrat: Record<string, number> = {}
      ;(contratsData || []).forEach((c: any) => {
        candidaturesParContrat[c.type_contrat] = (candidaturesParContrat[c.type_contrat] || 0) + 1
      })

      const suivisParType: Record<string, number> = {}
      ;(suivisData || []).forEach((s: any) => {
        suivisParType[s.type_event] = (suivisParType[s.type_event] || 0) + 1
      })

      return jsonResponse({
        success: true,
        data: {
          total_candidatures: totalCandidatures || 0,
          candidatures_par_statut: candidaturesParStatut,
          candidatures_par_contrat: candidaturesParContrat,
          total_suivis: totalSuivis || 0,
          total_recommandations: totalRecommandations || 0,
          suivis_par_type: suivisParType,
        },
      })
    }

    // ========== CANDIDATURES ==========

    // GET /candidatures
    if (req.method === "GET" && relativePath === "candidatures") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""
      const statut = searchParams.get("statut") || ""
      const type_contrat = searchParams.get("type_contrat") || ""

      let query = supabaseRecrutement
        .from("candidatures")
        .select("*", { count: "exact" })
        .order("date_candidature", { ascending: false })

      if (search) {
        query = query.or(`titre_poste.ilike.%${search}%,entreprise.ilike.%${search}%`)
      }
      if (statut) {
        query = query.eq("statut", statut)
      }
      if (type_contrat) {
        query = query.eq("type_contrat", type_contrat)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: candidatures, error, count } = await query

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la récupération des candidatures" },
          { status: 500 },
        )
      }

      const candidaturesWithStats = await Promise.all(
        (candidatures || []).map(async (candidature: any) => {
          const membre = await enrichWithMember(candidature, candidature.membre_id)
          const { count: suivisCount } = await supabaseRecrutement
            .from("suivi_candidatures")
            .select("*", { count: "exact", head: true })
            .eq("candidature_id", candidature.id)

          return {
            ...candidature,
            membre,
            suivis_count: suivisCount || 0,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: candidaturesWithStats,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // GET /candidatures/:id
    const candidatureMatch = relativePath.match(/^candidatures\/(.+)$/)
    if (req.method === "GET" && candidatureMatch) {
      const candidatureId = candidatureMatch[1]
      const { data: candidature, error } = await supabaseRecrutement
        .from("candidatures")
        .select("*")
        .eq("id", candidatureId)
        .maybeSingle()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération de la candidature" },
          { status: 500 },
        )
      }

      if (!candidature) {
        return jsonResponse(
          { success: false, message: "Candidature introuvable" },
          { status: 404 },
        )
      }

      const membre = await enrichWithMember(candidature, candidature.membre_id)
      const { data: suivis } = await supabaseRecrutement
        .from("suivi_candidatures")
        .select("*")
        .eq("candidature_id", candidatureId)
        .order("date_event", { ascending: false })

      return jsonResponse({
        success: true,
        data: {
          ...candidature,
          membre,
          suivis: suivis || [],
        },
      })
    }

    // POST /candidatures
    if (req.method === "POST" && relativePath === "candidatures") {
      const body = await req.json()
      
      // Vérifier les doublons évidents (même membre, même entreprise, même poste, dans ±7 jours)
      const dateCandidature = body.date_candidature
        ? new Date(body.date_candidature)
        : new Date()
      const dateDebut = new Date(dateCandidature)
      dateDebut.setDate(dateDebut.getDate() - 7)
      const dateFin = new Date(dateCandidature)
      dateFin.setDate(dateFin.getDate() + 7)

      const { data: existingCandidatures } = await supabaseRecrutement
        .from("candidatures")
        .select("id, date_candidature, titre_poste, entreprise")
        .eq("membre_id", body.membre_id)
        .eq("entreprise", body.entreprise)
        .eq("titre_poste", body.titre_poste)
        .gte("date_candidature", dateDebut.toISOString().split("T")[0])
        .lte("date_candidature", dateFin.toISOString().split("T")[0])

      if (existingCandidatures && existingCandidatures.length > 0) {
        return jsonResponse(
          { success: false, message: "Une candidature similaire existe déjà pour ce membre", code: "DUPLICATE_CANDIDATURE" },
          { status: 409 },
        )
      }

      const { data, error } = await supabaseRecrutement
        .from("candidatures")
        .insert({
          membre_id: body.membre_id,
          titre_poste: body.titre_poste,
          entreprise: body.entreprise,
          type_contrat: body.type_contrat,
          statut: body.statut || "envoye",
          cv_url: body.cv_url || null,
          lm_url: body.lm_url || null,
          portfolio_url: body.portfolio_url || null,
          date_candidature: body.date_candidature || new Date().toISOString().split("T")[0],
          commentaire_mentor: body.commentaire_mentor || null,
        })
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création de la candidature" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Candidature créée avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /candidatures/:id
    if (req.method === "PUT" && candidatureMatch) {
      const candidatureId = candidatureMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseRecrutement
        .from("candidatures")
        .update(body)
        .eq("id", candidatureId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour de la candidature" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Candidature mise à jour avec succès",
        data,
      })
    }

    // ========== SUIVIS ==========

    // GET /candidatures/:id/suivis
    const candidatureSuivisMatch = relativePath.match(/^candidatures\/(.+)\/suivis$/)
    if (req.method === "GET" && candidatureSuivisMatch) {
      const candidatureId = candidatureSuivisMatch[1]
      const { data, error } = await supabaseRecrutement
        .from("suivi_candidatures")
        .select("*")
        .eq("candidature_id", candidatureId)
        .order("date_event", { ascending: false })

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération des suivis" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        data: data || [],
      })
    }

    // POST /suivis
    if (req.method === "POST" && relativePath === "suivis") {
      const body = await req.json()
      const { data, error } = await supabaseRecrutement
        .from("suivi_candidatures")
        .insert({
          candidature_id: body.candidature_id,
          date_event: body.date_event,
          type_event: body.type_event,
          notes: body.notes || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          return jsonResponse(
            { success: false, message: "Un suivi identique existe déjà pour cette candidature", code: "DUPLICATE_SUIVI" },
            { status: 409 },
          )
        }
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création du suivi" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Suivi créé avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /suivis/:id
    const suiviMatch = relativePath.match(/^suivis\/(.+)$/)
    if (req.method === "PUT" && suiviMatch) {
      const suiviId = suiviMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseRecrutement
        .from("suivi_candidatures")
        .update(body)
        .eq("id", suiviId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour du suivi" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Suivi mis à jour avec succès",
        data,
      })
    }

    // DELETE /suivis/:id
    if (req.method === "DELETE" && suiviMatch) {
      const suiviId = suiviMatch[1]
      const { error } = await supabaseRecrutement
        .from("suivi_candidatures")
        .delete()
        .eq("id", suiviId)

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la suppression du suivi" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Suivi supprimé avec succès",
      })
    }

    // ========== RECOMMANDATIONS ==========

    // GET /recommandations
    if (req.method === "GET" && relativePath === "recommandations") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const menteeId = searchParams.get("mentee_id") || ""

      let query = supabaseRecrutement
        .from("recommandations")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (menteeId) {
        query = query.eq("mentee_id", menteeId)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: recommandations, error, count } = await query

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération des recommandations" },
          { status: 500 },
        )
      }

      const enrichedRecommandations = await Promise.all(
        (recommandations || []).map(async (reco: any) => {
          const [mentorData, menteeData] = await Promise.all([
            supabaseMentorat.from("mentors").select("*").eq("id", reco.mentor_id).maybeSingle(),
            supabaseMentorat.from("mentees").select("*").eq("id", reco.mentee_id).maybeSingle(),
          ])

          const mentorMembre = await enrichWithMember(mentorData.data, mentorData.data?.membre_id)
          const menteeMembre = await enrichWithMember(menteeData.data, menteeData.data?.membre_id)

          return {
            ...reco,
            mentor: mentorData.data ? { ...mentorData.data, membre: mentorMembre } : null,
            mentee: menteeData.data ? { ...menteeData.data, membre: menteeMembre } : null,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: enrichedRecommandations,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // GET /recommandations/:id
    const recommandationMatch = relativePath.match(/^recommandations\/(.+)$/)
    if (req.method === "GET" && recommandationMatch) {
      const recommandationId = recommandationMatch[1]
      const { data: recommandation, error } = await supabaseRecrutement
        .from("recommandations")
        .select("*")
        .eq("id", recommandationId)
        .maybeSingle()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération de la recommandation" },
          { status: 500 },
        )
      }

      if (!recommandation) {
        return jsonResponse(
          { success: false, message: "Recommandation introuvable" },
          { status: 404 },
        )
      }

      const [mentorData, menteeData] = await Promise.all([
        supabaseMentorat.from("mentors").select("*").eq("id", recommandation.mentor_id).maybeSingle(),
        supabaseMentorat.from("mentees").select("*").eq("id", recommandation.mentee_id).maybeSingle(),
      ])

      const mentorMembre = await enrichWithMember(mentorData.data, mentorData.data?.membre_id)
      const menteeMembre = await enrichWithMember(menteeData.data, menteeData.data?.membre_id)

      return jsonResponse({
        success: true,
        data: {
          ...recommandation,
          mentor: mentorData.data ? { ...mentorData.data, membre: mentorMembre } : null,
          mentee: menteeData.data ? { ...menteeData.data, membre: menteeMembre } : null,
        },
      })
    }

    // POST /recommandations
    if (req.method === "POST" && relativePath === "recommandations") {
      const body = await req.json()
      const { data, error } = await supabaseRecrutement
        .from("recommandations")
        .insert({
          mentor_id: body.mentor_id,
          mentee_id: body.mentee_id,
          texte: body.texte,
          lien_pdf: body.lien_pdf || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          return jsonResponse(
            { success: false, message: "Une recommandation existe déjà pour ce binôme mentor/mentoré", code: "DUPLICATE_RECOMMANDATION" },
            { status: 409 },
          )
        }
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création de la recommandation" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Recommandation créée avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /recommandations/:id
    if (req.method === "PUT" && recommandationMatch) {
      const recommandationId = recommandationMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseRecrutement
        .from("recommandations")
        .update(body)
        .eq("id", recommandationId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour de la recommandation" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Recommandation mise à jour avec succès",
        data,
      })
    }

    // DELETE /recommandations/:id
    if (req.method === "DELETE" && recommandationMatch) {
      const recommandationId = recommandationMatch[1]
      const { error } = await supabaseRecrutement
        .from("recommandations")
        .delete()
        .eq("id", recommandationId)

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la suppression de la recommandation" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Recommandation supprimée avec succès",
      })
    }

    // Route non trouvée
    return jsonResponse(
      { success: false, message: "Route non trouvée" },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-recrutement exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})


