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
    const supabaseFormation = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "formation" },
    })
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-formation"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-formation")) {
      relativePath = pathname.substring("/admin-formation".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // Helper function pour obtenir le contexte email formation
    async function getFormationEmailContext(formationId: string, sessionId?: string) {
      const context: any = {
        formationTitle: "",
        formationMode: "",
        formationSlug: "",
        sessionDate: "",
      }

      if (formationId) {
        const { data: formation } = await supabaseFormation
          .from("formations")
          .select("titre, mode, slug")
          .eq("id", formationId)
          .maybeSingle()

        if (formation) {
          context.formationTitle = formation.titre || ""
          context.formationMode = formation.mode || ""
          context.formationSlug = formation.slug || ""
        }
      }

      if (sessionId) {
        const { data: session } = await supabaseFormation
          .from("sessions")
          .select("date_debut")
          .eq("id", sessionId)
          .maybeSingle()

        if (session?.date_debut) {
          context.sessionDate = session.date_debut
        }
      }

      return context
    }

    // ========== STATISTIQUES ==========

    // GET /stats - Statistiques globales
    if (req.method === "GET" && relativePath === "stats") {
      const today = new Date().toISOString().split("T")[0]

      const [
        { count: totalFormations },
        { count: totalInscriptions },
        { count: confirmedInscriptions },
        { count: pendingInscriptions },
        { count: totalSessions },
        { count: upcomingSessions },
        { data: formationsByCategory },
        { data: formationsByMode },
      ] = await Promise.all([
        supabaseFormation
          .from("formations")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabaseFormation
          .from("inscriptions")
          .select("*", { count: "exact", head: true }),
        supabaseFormation
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "confirmed"),
        supabaseFormation
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseFormation
          .from("sessions")
          .select("*", { count: "exact", head: true }),
        supabaseFormation
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .gte("date_debut", today),
        supabaseFormation
          .from("formations")
          .select("categorie")
          .eq("is_active", true),
        supabaseFormation
          .from("formations")
          .select("mode")
          .eq("is_active", true),
      ])

      const categoryStats: Record<string, number> = {}
      formationsByCategory?.forEach((f: any) => {
        categoryStats[f.categorie] = (categoryStats[f.categorie] || 0) + 1
      })

      const modeStats: Record<string, number> = {}
      formationsByMode?.forEach((f: any) => {
        const mode = f.mode || "Non spécifié"
        modeStats[mode] = (modeStats[mode] || 0) + 1
      })

      return jsonResponse({
        success: true,
        data: {
          total_formations: totalFormations || 0,
          total_inscriptions: totalInscriptions || 0,
          confirmed_inscriptions: confirmedInscriptions || 0,
          pending_inscriptions: pendingInscriptions || 0,
          rejected_inscriptions:
            (totalInscriptions || 0) - (confirmedInscriptions || 0) - (pendingInscriptions || 0),
          total_sessions: totalSessions || 0,
          upcoming_sessions: upcomingSessions || 0,
          categories: categoryStats,
          modes: modeStats,
        },
      })
    }

    // ========== FORMATIONS ==========

    // GET /formations - Liste des formations avec pagination
    if (req.method === "GET" && relativePath === "formations") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""
      const categorie = searchParams.get("categorie") || ""
      const statut = searchParams.get("statut") || ""

      let query = supabaseFormation
        .from("formations")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (search) {
        query = query.or(`titre.ilike.%${search}%,slug.ilike.%${search}%`)
      }
      if (categorie) {
        query = query.eq("categorie", categorie)
      }
      if (statut === "active") {
        query = query.eq("is_active", true)
      } else if (statut === "inactive") {
        query = query.eq("is_active", false)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error("getAllFormations error", error)
        throw new Error("Erreur lors de la récupération des formations")
      }

      // Enrichir avec les stats
      const formationsWithStats = await Promise.all(
        (data || []).map(async (formation: any) => {
          const [
            { count: inscriptionsCount },
            { count: confirmedCount },
          ] = await Promise.all([
            supabaseFormation
              .from("inscriptions")
              .select("*", { count: "exact", head: true })
              .eq("formation_id", formation.id),
            supabaseFormation
              .from("inscriptions")
              .select("*", { count: "exact", head: true })
              .eq("formation_id", formation.id)
              .eq("status", "confirmed"),
          ])

          return {
            ...formation,
            inscriptions_count: inscriptionsCount || 0,
            confirmed_count: confirmedCount || 0,
            places_restantes: formation.participants_max
              ? formation.participants_max - (confirmedCount || 0)
              : null,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: formationsWithStats,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /formations - Créer une formation
    if (req.method === "POST" && relativePath === "formations") {
      const body = await req.json().catch(() => ({}))
      const {
        slug,
        titre,
        categorie,
        niveau,
        badge,
        resume,
        duree_heures,
        nb_sessions,
        participants_max,
        mode,
        prochaine_session,
        description_longue,
        image_url,
        prix,
        formateur_id,
      } = body

      if (!slug || !titre || !categorie || !niveau) {
        return jsonResponse(
          {
            success: false,
            message: "Slug, titre, catégorie et niveau sont requis",
          },
          { status: 400 },
        )
      }

      // Vérifier si le slug existe déjà
      const { data: existing } = await supabaseFormation
        .from("formations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle()

      if (existing) {
        return jsonResponse(
          { success: false, message: "Une formation avec ce slug existe déjà" },
          { status: 400 },
        )
      }

      // Créer la formation
      const { data: formation, error: createError } = await supabaseFormation
        .from("formations")
        .insert({
          slug,
          titre,
          categorie,
          niveau,
          badge: badge || null,
          resume: resume || null,
          duree_heures: duree_heures ? parseInt(duree_heures) : null,
          nb_sessions: nb_sessions ? parseInt(nb_sessions) : null,
          participants_max: participants_max ? parseInt(participants_max) : null,
          mode: mode || null,
          prochaine_session: prochaine_session || null,
          description_longue: description_longue || null,
          image_url: image_url || null,
          prix: prix ? parseFloat(prix) : null,
          formateur_id: formateur_id || null,
          is_active: true,
        })
        .select()
        .single()

      if (createError) {
        console.error("createFormation error", createError)
        throw new Error("Erreur lors de la création de la formation")
      }

      return jsonResponse({
        success: true,
        message: "Formation créée avec succès",
        data: formation,
      })
    }

    // Routes avec ID de formation
    const formationIdMatch = relativePath.match(/^formations\/([0-9a-fA-F-]+)(?:\/(.*))?$/)
    if (formationIdMatch) {
      const formationId = formationIdMatch[1]
      const subPath = formationIdMatch[2] || ""

      // GET /formations/:id - Détails d'une formation
      if (req.method === "GET" && subPath === "") {
        const { data: formation, error } = await supabaseFormation
          .from("formations")
          .select("*")
          .eq("id", formationId)
          .maybeSingle()

        if (error) {
          console.error("getFormationById error", error)
          throw new Error("Erreur lors de la récupération de la formation")
        }

        if (!formation) {
          return jsonResponse(
            { success: false, message: "Formation introuvable" },
            { status: 404 },
          )
        }

        // Récupérer les sessions
        const { data: sessions } = await supabaseFormation
          .from("sessions")
          .select("*")
          .eq("formation_id", formationId)
          .order("date_debut", { ascending: true })

        // Statistiques des inscriptions
        const [
          { count: totalInscriptions },
          { count: confirmedInscriptions },
          { count: pendingInscriptions },
        ] = await Promise.all([
          supabaseFormation
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("formation_id", formationId),
          supabaseFormation
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("formation_id", formationId)
            .eq("status", "confirmed"),
          supabaseFormation
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("formation_id", formationId)
            .eq("status", "pending"),
        ])

        return jsonResponse({
          success: true,
          data: {
            ...formation,
            sessions: sessions || [],
            stats: {
              total_inscriptions: totalInscriptions || 0,
              confirmed: confirmedInscriptions || 0,
              pending: pendingInscriptions || 0,
              places_restantes: formation.participants_max
                ? formation.participants_max - (confirmedInscriptions || 0)
                : null,
              taux_occupation:
                formation.participants_max && formation.participants_max > 0
                  ? Math.round(((confirmedInscriptions || 0) / formation.participants_max) * 100)
                  : 0,
            },
          },
        })
      }

      // PUT /formations/:id - Mettre à jour une formation
      if (req.method === "PUT" && subPath === "") {
        const body = await req.json().catch(() => ({}))

        // Vérifier que la formation existe
        const { data: existing } = await supabaseFormation
          .from("formations")
          .select("id, slug")
          .eq("id", formationId)
          .maybeSingle()

        if (!existing) {
          return jsonResponse(
            { success: false, message: "Formation introuvable" },
            { status: 404 },
          )
        }

        // Vérifier le slug si modifié
        if (body.slug && body.slug !== existing.slug) {
          const { data: slugExists } = await supabaseFormation
            .from("formations")
            .select("id")
            .eq("slug", body.slug)
            .neq("id", formationId)
            .maybeSingle()

          if (slugExists) {
            return jsonResponse(
              { success: false, message: "Ce slug est déjà utilisé par une autre formation" },
              { status: 400 },
            )
          }
        }

        const updateObj: any = {}
        if (body.titre !== undefined) updateObj.titre = body.titre
        if (body.slug !== undefined) updateObj.slug = body.slug
        if (body.categorie !== undefined) updateObj.categorie = body.categorie
        if (body.niveau !== undefined) updateObj.niveau = body.niveau
        if (body.badge !== undefined) updateObj.badge = body.badge
        if (body.resume !== undefined) updateObj.resume = body.resume
        if (body.duree_heures !== undefined) updateObj.duree_heures = body.duree_heures ? parseInt(body.duree_heures) : null
        if (body.nb_sessions !== undefined) updateObj.nb_sessions = body.nb_sessions ? parseInt(body.nb_sessions) : null
        if (body.participants_max !== undefined) updateObj.participants_max = body.participants_max ? parseInt(body.participants_max) : null
        if (body.mode !== undefined) updateObj.mode = body.mode
        if (body.prochaine_session !== undefined) updateObj.prochaine_session = body.prochaine_session
        if (body.description_longue !== undefined) updateObj.description_longue = body.description_longue
        if (body.image_url !== undefined) updateObj.image_url = body.image_url
        if (body.prix !== undefined) updateObj.prix = body.prix ? parseFloat(body.prix) : null
        if (body.formateur_id !== undefined) updateObj.formateur_id = body.formateur_id
        if (body.is_active !== undefined) updateObj.is_active = body.is_active

        const { data: formation, error: updateError } = await supabaseFormation
          .from("formations")
          .update(updateObj)
          .eq("id", formationId)
          .select()
          .single()

        if (updateError) {
          console.error("updateFormation error", updateError)
          throw new Error("Erreur lors de la mise à jour de la formation")
        }

        return jsonResponse({
          success: true,
          message: "Formation mise à jour avec succès",
          data: formation,
        })
      }

      // DELETE /formations/:id - Désactiver une formation
      if (req.method === "DELETE" && subPath === "") {
        const { error } = await supabaseFormation
          .from("formations")
          .update({ is_active: false })
          .eq("id", formationId)

        if (error) {
          console.error("deleteFormation error", error)
          throw new Error("Erreur lors de la désactivation de la formation")
        }

        return jsonResponse({
          success: true,
          message: "Formation désactivée avec succès",
        })
      }

      // GET /formations/:id/inscriptions - Liste des inscriptions d'une formation
      if (req.method === "GET" && subPath === "inscriptions") {
        const page = parseInt(searchParams.get("page") || "1", 10)
        const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 500)
        const status = searchParams.get("status") || ""

        let query = supabaseFormation
          .from("inscriptions")
          .select("*", { count: "exact" })
          .eq("formation_id", formationId)
          .order("created_at", { ascending: false })

        if (status) {
          query = query.eq("status", status)
        }

        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
          console.error("getFormationInscriptions error", error)
          throw new Error("Erreur lors de la récupération des inscriptions")
        }

        return jsonResponse({
          success: true,
          data: data || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        })
      }
    }

    // ========== SESSIONS ==========

    // GET /sessions - Liste des sessions
    if (req.method === "GET" && relativePath === "sessions") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const formation_id = searchParams.get("formation_id") || ""
      const statut = searchParams.get("statut") || ""

      let query = supabaseFormation
        .from("sessions")
        .select("*", { count: "exact" })
        .order("date_debut", { ascending: true })

      if (formation_id) {
        query = query.eq("formation_id", formation_id)
      }
      if (statut) {
        query = query.eq("statut", statut)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error("getAllSessions error", error)
        throw new Error("Erreur lors de la récupération des sessions")
      }

      // Enrichir avec les données de formation et le nombre d'inscriptions
      const sessionsEnriched = await Promise.all(
        (data || []).map(async (session: any) => {
          const [
            { data: formation },
            { count: inscriptionsCount },
          ] = await Promise.all([
            supabaseFormation
              .from("formations")
              .select("titre, slug, participants_max")
              .eq("id", session.formation_id)
              .maybeSingle(),
            supabaseFormation
              .from("inscriptions")
              .select("*", { count: "exact", head: true })
              .eq("session_id", session.id)
              .eq("status", "confirmed"),
          ])

          return {
            ...session,
            formation: formation || null,
            inscriptions_count: inscriptionsCount || 0,
            places_restantes: session.capacite_max ? session.capacite_max - (inscriptionsCount || 0) : null,
            taux_occupation:
              session.capacite_max && session.capacite_max > 0
                ? Math.round(((inscriptionsCount || 0) / session.capacite_max) * 100)
                : null,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: sessionsEnriched,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /sessions - Créer une session
    if (req.method === "POST" && relativePath === "sessions") {
      const body = await req.json().catch(() => ({}))
      const { formation_id, date_debut, date_fin, capacite_max, statut } = body

      if (!formation_id || !date_debut) {
        return jsonResponse(
          {
            success: false,
            message: "formation_id et date_debut sont requis",
          },
          { status: 400 },
        )
      }

      const { data: session, error } = await supabaseFormation
        .from("sessions")
        .insert({
          formation_id,
          date_debut,
          date_fin: date_fin || null,
          capacite_max: capacite_max ? parseInt(capacite_max) : null,
          statut: statut || "ouverte",
        })
        .select()
        .single()

      if (error) {
        console.error("createSession error", error)
        throw new Error("Erreur lors de la création de la session")
      }

      return jsonResponse({
        success: true,
        message: "Session créée avec succès",
        data: session,
      })
    }

    // Routes avec ID de session
    const sessionIdMatch = relativePath.match(/^sessions\/([0-9a-fA-F-]+)(?:\/(.*))?$/)
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1]
      const subPath = sessionIdMatch[2] || ""

      // PUT /sessions/:id - Mettre à jour une session
      if (req.method === "PUT" && subPath === "") {
        const body = await req.json().catch(() => ({}))

        const updateObj: any = {}
        if (body.date_debut !== undefined) updateObj.date_debut = body.date_debut
        if (body.date_fin !== undefined) updateObj.date_fin = body.date_fin
        if (body.capacite_max !== undefined) updateObj.capacite_max = body.capacite_max ? parseInt(body.capacite_max) : null
        if (body.statut !== undefined) updateObj.statut = body.statut

        const { data, error } = await supabaseFormation
          .from("sessions")
          .update(updateObj)
          .eq("id", sessionId)
          .select()
          .single()

        if (error) {
          console.error("updateSession error", error)
          throw new Error("Erreur lors de la mise à jour de la session")
        }

        if (!data) {
          return jsonResponse(
            { success: false, message: "Session introuvable" },
            { status: 404 },
          )
        }

        return jsonResponse({
          success: true,
          message: "Session mise à jour avec succès",
          data,
        })
      }

      // DELETE /sessions/:id - Supprimer une session
      if (req.method === "DELETE" && subPath === "") {
        const { error } = await supabaseFormation
          .from("sessions")
          .delete()
          .eq("id", sessionId)

        if (error) {
          console.error("deleteSession error", error)
          throw new Error("Erreur lors de la suppression de la session")
        }

        return jsonResponse({
          success: true,
          message: "Session supprimée avec succès",
        })
      }

      // POST /sessions/:id/reminder - Envoyer rappel
      if (req.method === "POST" && subPath === "reminder") {
        const body = await req.json().catch(() => ({}))
        const { kind = "generic", access_link } = body

        const { data: inscriptions, error: inscriptionsError } = await supabaseFormation
          .from("inscriptions")
          .select("*")
          .eq("session_id", sessionId)
          .eq("status", "confirmed")

        if (inscriptionsError) {
          throw new Error("Erreur lors de la récupération des inscriptions")
        }

        if (!inscriptions || inscriptions.length === 0) {
          return jsonResponse({
            success: true,
            message: "Aucune inscription confirmée pour cette session",
          })
        }

        const session = inscriptions[0]
        const context = await getFormationEmailContext(
          session.formation_id,
          session.session_id
        )

        // Envoyer les rappels via webhook
        const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
        const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

        if (APPSCRIPT_WEBHOOK_URL) {
          for (const inscription of inscriptions) {
            try {
              await fetch(APPSCRIPT_WEBHOOK_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(APPSCRIPT_WEBHOOK_TOKEN && {
                    "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
                  }),
                },
                body: JSON.stringify({
                  event_type: "formation_reminder",
                  kind,
                  email: inscription.email,
                  prenom: inscription.prenom,
                  nom: inscription.nom,
                  formation_title: context.formationTitle,
                  session_date: context.sessionDate,
                  access_link,
                  token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
                }),
              })
            } catch (err) {
              console.error("Error sending reminder for", inscription.email, err)
            }
          }
        }

        return jsonResponse({
          success: true,
          message: "Rappel formation envoyé aux participants",
        })
      }
    }

    // ========== INSCRIPTIONS ==========

    // GET /inscriptions - Liste des inscriptions
    if (req.method === "GET" && relativePath === "inscriptions") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const formation_id = searchParams.get("formation_id") || ""
      const session_id = searchParams.get("session_id") || ""
      const status = searchParams.get("status") || ""

      let query = supabaseFormation
        .from("inscriptions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (formation_id) {
        query = query.eq("formation_id", formation_id)
      }
      if (session_id) {
        query = query.eq("session_id", session_id)
      }
      if (status) {
        query = query.eq("status", status)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error("getAllInscriptions error", error)
        throw new Error("Erreur lors de la récupération des inscriptions")
      }

      // Enrichir avec les données de formation et session
      const inscriptionsEnriched = await Promise.all(
        (data || []).map(async (inscription: any) => {
          const [formation, session] = await Promise.all([
            supabaseFormation
              .from("formations")
              .select("titre, slug")
              .eq("id", inscription.formation_id)
              .maybeSingle(),
            inscription.session_id
              ? supabaseFormation
                  .from("sessions")
                  .select("date_debut, date_fin")
                  .eq("id", inscription.session_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ])

          return {
            ...inscription,
            formation: formation?.data || null,
            session: session?.data || null,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: inscriptionsEnriched,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /inscriptions - Créer une inscription
    if (req.method === "POST" && relativePath === "inscriptions") {
      const body = await req.json().catch(() => ({}))
      const {
        prenom,
        nom,
        email,
        formation_id,
        session_id,
        niveau,
        niveau_etude,
        adresse,
        ville,
        pays,
        whatsapp,
        membre_id,
        paiement_status,
        source,
        notes_admin,
      } = body

      if (!prenom || !nom || !email || !formation_id || !niveau) {
        return jsonResponse(
          {
            success: false,
            message: "prenom, nom, email, formation_id et niveau sont requis",
          },
          { status: 400 },
        )
      }

      const { data: inscription, error } = await supabaseFormation
        .from("inscriptions")
        .insert({
          prenom,
          nom,
          email,
          formation_id,
          session_id: session_id || null,
          niveau,
          niveau_etude: niveau_etude || null,
          adresse: adresse || null,
          ville: ville || null,
          pays: pays || "France",
          whatsapp: whatsapp || null,
          membre_id: membre_id || null,
          paiement_status: paiement_status || "non payé",
          source: source || "site web",
          notes_admin: notes_admin || null,
          status: "pending",
        })
        .select()
        .single()

      if (error) {
        console.error("createInscription error", error)
        const message = error.message || ""
        if (
          error.code === "23505" ||
          message.includes("inscriptions_formation_email_unique") ||
          message.toLowerCase().includes("duplicate key value")
        ) {
          return jsonResponse(
            {
              success: false,
              message:
                "Cet email est déjà inscrit à cette formation. Utilisez une autre adresse ou contactez l'ASGF.",
            },
            { status: 400 },
          )
        }
        throw new Error("Erreur lors de la création de l'inscription")
      }

      return jsonResponse({
        success: true,
        message: "Inscription créée avec succès",
        data: inscription,
      })
    }

    // Routes avec ID d'inscription
    const inscriptionIdMatch = relativePath.match(/^inscriptions\/([0-9a-fA-F-]+)(?:\/(.*))?$/)
    if (inscriptionIdMatch) {
      const inscriptionId = inscriptionIdMatch[1]
      const subPath = inscriptionIdMatch[2] || ""

      // PUT /inscriptions/:id - Mettre à jour une inscription
      if (req.method === "PUT" && subPath === "") {
        const body = await req.json().catch(() => ({}))

        const updateObj: any = {}
        if (body.prenom !== undefined) updateObj.prenom = body.prenom
        if (body.nom !== undefined) updateObj.nom = body.nom
        if (body.email !== undefined) updateObj.email = body.email
        if (body.session_id !== undefined) updateObj.session_id = body.session_id || null
        if (body.niveau !== undefined) updateObj.niveau = body.niveau
        if (body.niveau_etude !== undefined) updateObj.niveau_etude = body.niveau_etude
        if (body.status !== undefined) updateObj.status = body.status
        if (body.paiement_status !== undefined) updateObj.paiement_status = body.paiement_status
        if (body.notes_admin !== undefined) updateObj.notes_admin = body.notes_admin
        if (body.status === "confirmed" && !body.confirmed_at) {
          updateObj.confirmed_at = new Date().toISOString()
        }

        const { data, error } = await supabaseFormation
          .from("inscriptions")
          .update(updateObj)
          .eq("id", inscriptionId)
          .select()
          .single()

        if (error) {
          console.error("updateInscription error", error)
          throw new Error("Erreur lors de la mise à jour de l'inscription")
        }

        if (!data) {
          return jsonResponse(
            { success: false, message: "Inscription introuvable" },
            { status: 404 },
          )
        }

        return jsonResponse({
          success: true,
          message: "Inscription mise à jour avec succès",
          data,
        })
      }

      // DELETE /inscriptions/:id - Supprimer une inscription
      if (req.method === "DELETE" && subPath === "") {
        const { error } = await supabaseFormation
          .from("inscriptions")
          .delete()
          .eq("id", inscriptionId)

        if (error) {
          console.error("deleteInscription error", error)
          throw new Error("Erreur lors de la suppression de l'inscription")
        }

        return jsonResponse({
          success: true,
          message: "Inscription supprimée avec succès",
        })
      }

      // POST /inscriptions/:id/confirm - Confirmer une inscription
      if (req.method === "POST" && subPath === "confirm") {
        // Vérifier que l'inscription existe
        const { data: inscription } = await supabaseFormation
          .from("inscriptions")
          .select("formation_id, status")
          .eq("id", inscriptionId)
          .maybeSingle()

        if (!inscription) {
          return jsonResponse(
            { success: false, message: "Inscription introuvable" },
            { status: 404 },
          )
        }

        // Vérifier la capacité de la formation
        const { data: formation } = await supabaseFormation
          .from("formations")
          .select("participants_max")
          .eq("id", inscription.formation_id)
          .maybeSingle()

        if (formation && formation.participants_max) {
          const { count: confirmedCount } = await supabaseFormation
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("formation_id", inscription.formation_id)
            .eq("status", "confirmed")

          if ((confirmedCount || 0) >= formation.participants_max) {
            return jsonResponse(
              { success: false, message: "La formation a atteint sa capacité maximale" },
              { status: 400 },
            )
          }
        }

        // Mettre à jour le statut
        const { data: updated, error } = await supabaseFormation
          .from("inscriptions")
          .update({
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", inscriptionId)
          .select()
          .single()

        if (error) {
          console.error("confirmInscription error", error)
          throw new Error("Erreur lors de la confirmation de l'inscription")
        }

        // Envoyer notification (via webhook)
        const context = await getFormationEmailContext(updated.formation_id, updated.session_id)
        const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
        const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

        if (APPSCRIPT_WEBHOOK_URL) {
          try {
            await fetch(APPSCRIPT_WEBHOOK_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(APPSCRIPT_WEBHOOK_TOKEN && {
                  "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
                }),
              },
              body: JSON.stringify({
                event_type: "formation_status",
                status: "confirmed",
                email: updated.email,
                prenom: updated.prenom,
                nom: updated.nom,
                formation_title: context.formationTitle,
                session_date: context.sessionDate,
                token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
              }),
            })
          } catch (err) {
            console.error("Error sending confirmation email", err)
          }
        }

        return jsonResponse({
          success: true,
          message: "Inscription confirmée avec succès",
          data: updated,
        })
      }

      // POST /inscriptions/:id/reject - Rejeter une inscription
      if (req.method === "POST" && subPath === "reject") {
        const { data, error } = await supabaseFormation
          .from("inscriptions")
          .update({ status: "rejected" })
          .eq("id", inscriptionId)
          .select()
          .single()

        if (error) {
          console.error("rejectInscription error", error)
          throw new Error("Erreur lors du rejet de l'inscription")
        }

        if (!data) {
          return jsonResponse(
            { success: false, message: "Inscription introuvable" },
            { status: 404 },
          )
        }

        // Envoyer notification (via webhook)
        const context = await getFormationEmailContext(data.formation_id, data.session_id)
        const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
        const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

        if (APPSCRIPT_WEBHOOK_URL) {
          try {
            await fetch(APPSCRIPT_WEBHOOK_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(APPSCRIPT_WEBHOOK_TOKEN && {
                  "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
                }),
              },
              body: JSON.stringify({
                event_type: "formation_status",
                status: "rejected",
                email: data.email,
                prenom: data.prenom,
                nom: data.nom,
                formation_title: context.formationTitle,
                session_date: context.sessionDate,
                token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
              }),
            })
          } catch (err) {
            console.error("Error sending rejection email", err)
          }
        }

        return jsonResponse({
          success: true,
          message: "Inscription rejetée avec succès",
          data,
        })
      }

      // POST /inscriptions/:id/invitation - Envoyer invitation
      if (req.method === "POST" && subPath === "invitation") {
        const body = await req.json().catch(() => ({}))
        const { access_link } = body

        if (!access_link) {
          return jsonResponse(
            { success: false, message: "Le lien d'accès (access_link) est requis" },
            { status: 400 },
          )
        }

        const { data: inscription, error: inscriptionError } = await supabaseFormation
          .from("inscriptions")
          .select("*")
          .eq("id", inscriptionId)
          .maybeSingle()

        if (inscriptionError || !inscription) {
          return jsonResponse(
            { success: false, message: "Inscription introuvable" },
            { status: 404 },
          )
        }

        const context = await getFormationEmailContext(inscription.formation_id, inscription.session_id)

        // Envoyer invitation via webhook
        const APPSCRIPT_WEBHOOK_URL = Deno.env.get("APPSCRIPT_CONTACT_WEBHOOK_URL") || ""
        const APPSCRIPT_WEBHOOK_TOKEN = Deno.env.get("APPSCRIPT_CONTACT_TOKEN") || ""

        if (APPSCRIPT_WEBHOOK_URL) {
          try {
            await fetch(APPSCRIPT_WEBHOOK_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(APPSCRIPT_WEBHOOK_TOKEN && {
                  "x-contact-token": APPSCRIPT_WEBHOOK_TOKEN,
                }),
              },
              body: JSON.stringify({
                event_type: "formation_invitation",
                email: inscription.email,
                prenom: inscription.prenom,
                nom: inscription.nom,
                formation_title: context.formationTitle,
                session_date: context.sessionDate,
                access_link,
                token: APPSCRIPT_WEBHOOK_TOKEN || undefined,
              }),
            })
          } catch (err) {
            console.error("Error sending invitation", err)
          }
        }

        return jsonResponse({
          success: true,
          message: "Invitation formation envoyée avec succès",
        })
      }
    }

    // ========== FORMATEURS ==========

    // GET /formateurs - Liste des formateurs
    if (req.method === "GET" && relativePath === "formateurs") {
      const { data, error } = await supabaseFormation
        .from("formateurs")
        .select("*")
        .order("nom", { ascending: true })

      if (error) {
        console.error("getAllFormateurs error", error)
        throw new Error("Erreur lors de la récupération des formateurs")
      }

      return jsonResponse({
        success: true,
        data: data || [],
      })
    }

    // POST /formateurs - Créer un formateur
    if (req.method === "POST" && relativePath === "formateurs") {
      const body = await req.json().catch(() => ({}))
      const { nom, prenom, email, photo_url, bio } = body

      if (!nom || !prenom || !email) {
        return jsonResponse(
          { success: false, message: "nom, prenom et email sont requis" },
          { status: 400 },
        )
      }

      // Vérifier si l'email existe déjà
      const { data: existing } = await supabaseFormation
        .from("formateurs")
        .select("id")
        .eq("email", email)
        .maybeSingle()

      if (existing) {
        return jsonResponse(
          { success: false, message: "Un formateur avec cet email existe déjà" },
          { status: 400 },
        )
      }

      const { data: formateur, error } = await supabaseFormation
        .from("formateurs")
        .insert({
          nom,
          prenom,
          email,
          photo_url: photo_url || null,
          bio: bio || null,
        })
        .select()
        .single()

      if (error) {
        console.error("createFormateur error", error)
        throw new Error("Erreur lors de la création du formateur")
      }

      return jsonResponse({
        success: true,
        message: "Formateur créé avec succès",
        data: formateur,
      })
    }

    // Routes avec ID de formateur
    const formateurIdMatch = relativePath.match(/^formateurs\/([0-9a-fA-F-]+)$/)
    if (formateurIdMatch) {
      const formateurId = formateurIdMatch[1]

      // PUT /formateurs/:id - Mettre à jour un formateur
      if (req.method === "PUT") {
        const body = await req.json().catch(() => ({}))

        // Vérifier l'email si modifié
        if (body.email) {
          const { data: existing } = await supabaseFormation
            .from("formateurs")
            .select("id")
            .eq("email", body.email)
            .neq("id", formateurId)
            .maybeSingle()

          if (existing) {
            return jsonResponse(
              { success: false, message: "Cet email est déjà utilisé par un autre formateur" },
              { status: 400 },
            )
          }
        }

        const updateObj: any = {}
        if (body.nom !== undefined) updateObj.nom = body.nom
        if (body.prenom !== undefined) updateObj.prenom = body.prenom
        if (body.email !== undefined) updateObj.email = body.email
        if (body.photo_url !== undefined) updateObj.photo_url = body.photo_url
        if (body.bio !== undefined) updateObj.bio = body.bio

        const { data, error } = await supabaseFormation
          .from("formateurs")
          .update(updateObj)
          .eq("id", formateurId)
          .select()
          .single()

        if (error) {
          console.error("updateFormateur error", error)
          throw new Error("Erreur lors de la mise à jour du formateur")
        }

        if (!data) {
          return jsonResponse(
            { success: false, message: "Formateur introuvable" },
            { status: 404 },
          )
        }

        return jsonResponse({
          success: true,
          message: "Formateur mis à jour avec succès",
          data,
        })
      }

      // DELETE /formateurs/:id - Supprimer un formateur
      if (req.method === "DELETE") {
        const { error } = await supabaseFormation
          .from("formateurs")
          .delete()
          .eq("id", formateurId)

        if (error) {
          console.error("deleteFormateur error", error)
          throw new Error("Erreur lors de la suppression du formateur")
        }

        return jsonResponse({
          success: true,
          message: "Formateur supprimé avec succès",
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
    console.error("admin-formation exception", err)
    return jsonResponse(
      { success: false, message: (err as Error).message || "Erreur serveur" },
      { status: 500 },
    )
  }
})

