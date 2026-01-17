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
    const supabaseWebinaire = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "webinaire" },
    })
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-webinaire"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-webinaire")) {
      relativePath = pathname.substring("/admin-webinaire".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // Helper function pour mettre à jour les stats d'un webinaire
    async function updateWebinaireStats(webinaireId: string) {
      try {
        const [
          { count: nb_inscrits },
          { count: nb_confirmes },
          { count: nb_presents },
        ] = await Promise.all([
          supabaseWebinaire
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("webinaire_id", webinaireId),
          supabaseWebinaire
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("webinaire_id", webinaireId)
            .eq("statut", "confirmed"),
          supabaseWebinaire
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("webinaire_id", webinaireId)
            .eq("presence", "present"),
        ])

        const taux_presence =
          nb_confirmes && nb_confirmes > 0
            ? Math.round(((nb_presents || 0) / nb_confirmes) * 100 * 100) / 100
            : 0

        await supabaseWebinaire.from("stats").upsert({
          webinaire_id: webinaireId,
          nb_inscrits: nb_inscrits || 0,
          nb_confirmes: nb_confirmes || 0,
          nb_presents: nb_presents || 0,
          taux_presence,
        })
      } catch (err) {
        console.error("updateWebinaireStats error", err)
      }
    }

    // ========== STATISTIQUES ==========

    // GET /stats - Statistiques globales
    if (req.method === "GET" && relativePath === "stats") {
      const [
        { count: totalWebinaires },
        { count: upcomingWebinaires },
        { count: totalInscriptions },
        { count: confirmedInscriptions },
        { count: pendingInscriptions },
        { data: webinairesByTheme },
        { data: allStats },
      ] = await Promise.all([
        supabaseWebinaire
          .from("webinaires")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabaseWebinaire
          .from("webinaires")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("date_webinaire", new Date().toISOString().split("T")[0]),
        supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true }),
        supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("statut", "confirmed"),
        supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("statut", "pending"),
        supabaseWebinaire
          .from("webinaires")
          .select("theme")
          .eq("is_active", true),
        supabaseWebinaire.from("stats").select("taux_presence"),
      ])

      const themeStats: Record<string, number> = {}
      webinairesByTheme?.forEach((w: any) => {
        themeStats[w.theme] = (themeStats[w.theme] || 0) + 1
      })

      const tauxMoyen =
        allStats && allStats.length > 0
          ? Math.round(
              (allStats.reduce((sum: number, s: any) => sum + (s.taux_presence || 0), 0) /
                allStats.length) *
                100,
            ) / 100
          : 0

      return jsonResponse({
        success: true,
        data: {
          total_webinaires: totalWebinaires || 0,
          upcoming_webinaires: upcomingWebinaires || 0,
          total_inscriptions: totalInscriptions || 0,
          confirmed_inscriptions: confirmedInscriptions || 0,
          pending_inscriptions: pendingInscriptions || 0,
          taux_moyen_participation: tauxMoyen,
          themes: themeStats,
        },
      })
    }

    // ========== WEBINAIRES ==========

    // GET /webinaires - Liste des webinaires avec pagination
    if (req.method === "GET" && relativePath === "webinaires") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""
      const theme = searchParams.get("theme") || ""
      const statut = searchParams.get("statut") || ""

      let query = supabaseWebinaire
        .from("webinaires")
        .select("*", { count: "exact" })
        .order("date_webinaire", { ascending: false })

      if (search) {
        query = query.or(`titre.ilike.%${search}%,slug.ilike.%${search}%`)
      }
      if (theme) {
        query = query.eq("theme", theme)
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
        console.error("getAllWebinaires error", error)
        throw new Error("Erreur lors de la récupération des webinaires")
      }

      // Enrichir avec les stats
      const webinairesWithStats = await Promise.all(
        (data || []).map(async (webinaire: any) => {
          const [
            { count: inscriptionsCount },
            { data: statsData },
          ] = await Promise.all([
            supabaseWebinaire
              .from("inscriptions")
              .select("*", { count: "exact", head: true })
              .eq("webinaire_id", webinaire.id),
            supabaseWebinaire
              .from("stats")
              .select("*")
              .eq("webinaire_id", webinaire.id)
              .maybeSingle(),
          ])

          return {
            ...webinaire,
            inscriptions_count: inscriptionsCount || 0,
            places_restantes: webinaire.capacite_max
              ? webinaire.capacite_max - (inscriptionsCount || 0)
              : null,
            taux_occupation:
              webinaire.capacite_max && webinaire.capacite_max > 0
                ? Math.round(((inscriptionsCount || 0) / webinaire.capacite_max) * 100)
                : null,
            stats: statsData || null,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: webinairesWithStats,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /webinaires - Créer un webinaire
    if (req.method === "POST" && relativePath === "webinaires") {
      const body = await req.json().catch(() => ({}))
      const {
        slug,
        titre,
        theme,
        resume,
        description_longue,
        date_webinaire,
        heure_debut,
        heure_fin,
        mode,
        lien_webinaire,
        image_url,
        formateur_id,
        capacite_max,
      } = body

      if (!slug || !titre || !theme || !date_webinaire || !heure_debut) {
        return jsonResponse(
          {
            success: false,
            message: "Slug, titre, thème, date_webinaire et heure_debut sont requis",
          },
          { status: 400 },
        )
      }

      // Vérifier si le slug existe déjà
      const { data: existing } = await supabaseWebinaire
        .from("webinaires")
        .select("id")
        .eq("slug", slug)
        .maybeSingle()

      if (existing) {
        return jsonResponse(
          { success: false, message: "Un webinaire avec ce slug existe déjà" },
          { status: 400 },
        )
      }

      // Créer le webinaire
      const { data: webinaire, error: createError } = await supabaseWebinaire
        .from("webinaires")
        .insert({
          slug,
          titre,
          theme,
          resume: resume || null,
          description_longue: description_longue || null,
          date_webinaire,
          heure_debut,
          heure_fin: heure_fin || null,
          mode: mode || "En ligne",
          lien_webinaire: lien_webinaire || null,
          image_url: image_url || null,
          formateur_id: formateur_id || null,
          capacite_max: capacite_max ? parseInt(capacite_max) : null,
          is_active: true,
        })
        .select()
        .single()

      if (createError) {
        console.error("createWebinaire error", createError)
        throw new Error("Erreur lors de la création du webinaire")
      }

      // Créer l'entrée stats initiale
      await supabaseWebinaire.from("stats").insert({
        webinaire_id: webinaire.id,
        nb_inscrits: 0,
        nb_confirmes: 0,
        nb_presents: 0,
        taux_presence: 0,
      })

      return jsonResponse({
        success: true,
        message: "Webinaire créé avec succès",
        data: webinaire,
      })
    }

    // Routes avec ID de webinaire
    const webinaireIdMatch = relativePath.match(/^webinaires\/([0-9a-fA-F-]+)(?:\/(.*))?$/)
    if (webinaireIdMatch) {
      const webinaireId = webinaireIdMatch[1]
      const subPath = webinaireIdMatch[2] || ""

      // GET /webinaires/:id - Détails d'un webinaire
      if (req.method === "GET" && subPath === "") {
        const { data: webinaire, error } = await supabaseWebinaire
          .from("webinaires")
          .select("*")
          .eq("id", webinaireId)
          .maybeSingle()

        if (error) {
          console.error("getWebinaireById error", error)
          throw new Error("Erreur lors de la récupération du webinaire")
        }

        if (!webinaire) {
          return jsonResponse(
            { success: false, message: "Webinaire introuvable" },
            { status: 404 },
          )
        }

        // Récupérer les présentateurs
        const { data: presentateurs } = await supabaseWebinaire
          .from("presentateurs")
          .select("*")
          .eq("webinaire_id", webinaireId)

        // Statistiques
        const [
          { count: totalInscriptions },
          { count: confirmesInscriptions },
          { data: statsData },
        ] = await Promise.all([
          supabaseWebinaire
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("webinaire_id", webinaireId),
          supabaseWebinaire
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("webinaire_id", webinaireId)
            .eq("statut", "confirmed"),
          supabaseWebinaire
            .from("stats")
            .select("*")
            .eq("webinaire_id", webinaireId)
            .maybeSingle(),
        ])

        return jsonResponse({
          success: true,
          data: {
            ...webinaire,
            presentateurs: presentateurs || [],
            stats: {
              total_inscriptions: totalInscriptions || 0,
              confirmes: confirmesInscriptions || 0,
              ...(statsData || {}),
              places_restantes: webinaire.capacite_max
                ? webinaire.capacite_max - (totalInscriptions || 0)
                : null,
              taux_occupation:
                webinaire.capacite_max && webinaire.capacite_max > 0
                  ? Math.round(((totalInscriptions || 0) / webinaire.capacite_max) * 100)
                  : null,
            },
          },
        })
      }

      // PUT /webinaires/:id - Mettre à jour un webinaire
      if (req.method === "PUT" && subPath === "") {
        const body = await req.json().catch(() => ({}))

        // Vérifier que le webinaire existe
        const { data: existing } = await supabaseWebinaire
          .from("webinaires")
          .select("id, slug")
          .eq("id", webinaireId)
          .maybeSingle()

        if (!existing) {
          return jsonResponse(
            { success: false, message: "Webinaire introuvable" },
            { status: 404 },
          )
        }

        // Vérifier le slug si modifié
        if (body.slug && body.slug !== existing.slug) {
          const { data: slugExists } = await supabaseWebinaire
            .from("webinaires")
            .select("id")
            .eq("slug", body.slug)
            .neq("id", webinaireId)
            .maybeSingle()

          if (slugExists) {
            return jsonResponse(
              { success: false, message: "Ce slug est déjà utilisé par un autre webinaire" },
              { status: 400 },
            )
          }
        }

        const updateObj: any = {}
        if (body.titre !== undefined) updateObj.titre = body.titre
        if (body.slug !== undefined) updateObj.slug = body.slug
        if (body.theme !== undefined) updateObj.theme = body.theme
        if (body.resume !== undefined) updateObj.resume = body.resume
        if (body.description_longue !== undefined) updateObj.description_longue = body.description_longue
        if (body.date_webinaire !== undefined) updateObj.date_webinaire = body.date_webinaire
        if (body.heure_debut !== undefined) updateObj.heure_debut = body.heure_debut
        if (body.heure_fin !== undefined) updateObj.heure_fin = body.heure_fin
        if (body.mode !== undefined) updateObj.mode = body.mode
        if (body.lien_webinaire !== undefined) updateObj.lien_webinaire = body.lien_webinaire
        if (body.image_url !== undefined) updateObj.image_url = body.image_url
        if (body.formateur_id !== undefined) updateObj.formateur_id = body.formateur_id
        if (body.capacite_max !== undefined) updateObj.capacite_max = body.capacite_max ? parseInt(body.capacite_max) : null
        if (body.is_active !== undefined) updateObj.is_active = body.is_active

        const { data: webinaire, error: updateError } = await supabaseWebinaire
          .from("webinaires")
          .update(updateObj)
          .eq("id", webinaireId)
          .select()
          .single()

        if (updateError) {
          console.error("updateWebinaire error", updateError)
          throw new Error("Erreur lors de la mise à jour du webinaire")
        }

        return jsonResponse({
          success: true,
          message: "Webinaire mis à jour avec succès",
          data: webinaire,
        })
      }

      // DELETE /webinaires/:id - Supprimer un webinaire
      if (req.method === "DELETE" && subPath === "") {
        // Vérifier s'il y a des inscriptions
        const { count: inscriptionsCount } = await supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("webinaire_id", webinaireId)

        if (inscriptionsCount && inscriptionsCount > 0) {
          return jsonResponse(
            { success: false, message: "Impossible de supprimer un webinaire avec des inscriptions" },
            { status: 400 },
          )
        }

        // Supprimer les stats associées
        await supabaseWebinaire.from("stats").delete().eq("webinaire_id", webinaireId)

        // Supprimer les présentateurs associés
        await supabaseWebinaire.from("presentateurs").delete().eq("webinaire_id", webinaireId)

        // Supprimer le webinaire
        const { error } = await supabaseWebinaire
          .from("webinaires")
          .delete()
          .eq("id", webinaireId)

        if (error) {
          console.error("deleteWebinaire error", error)
          throw new Error("Erreur lors de la suppression du webinaire")
        }

        return jsonResponse({
          success: true,
          message: "Webinaire supprimé avec succès",
        })
      }

      // GET /webinaires/:id/presentateurs - Liste des présentateurs
      if (req.method === "GET" && subPath === "presentateurs") {
        const { data, error } = await supabaseWebinaire
          .from("presentateurs")
          .select("*")
          .eq("webinaire_id", webinaireId)
          .order("created_at", { ascending: true })

        if (error) {
          console.error("getPresentateursByWebinaire error", error)
          throw new Error("Erreur lors de la récupération des présentateurs")
        }

        return jsonResponse({
          success: true,
          data: data || [],
        })
      }

      // POST /webinaires/:id/reminder - Envoyer rappel
      if (req.method === "POST" && subPath === "reminder") {
        const body = await req.json().catch(() => ({}))
        const { kind = "generic", access_link } = body

        const { data: inscriptions, error: inscriptionsError } = await supabaseWebinaire
          .from("inscriptions")
          .select("*")
          .eq("webinaire_id", webinaireId)
          .eq("statut", "confirmed")

        if (inscriptionsError) {
          throw new Error("Erreur lors de la récupération des inscriptions")
        }

        if (!inscriptions || inscriptions.length === 0) {
          return jsonResponse({
            success: true,
            message: "Aucune inscription confirmée pour ce webinaire",
          })
        }

        const { data: webinaire } = await supabaseWebinaire
          .from("webinaires")
          .select("titre, date_webinaire, heure_debut")
          .eq("id", webinaireId)
          .maybeSingle()

        // Envoyer les rappels via webhook (simplifié - notification async)
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
                  event_type: "webinaire_reminder",
                  kind,
                  email: inscription.email,
                  prenom: inscription.prenom,
                  nom: inscription.nom,
                  webinaire_title: webinaire?.titre || "Webinaire ASGF",
                  webinaire_date: webinaire?.date_webinaire || "",
                  webinaire_time: webinaire?.heure_debut ? webinaire.heure_debut.substring(0, 5) : "",
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
          message: "Rappel webinaire envoyé aux participants",
        })
      }
    }

    // ========== INSCRIPTIONS ==========

    // GET /inscriptions - Liste des inscriptions
    if (req.method === "GET" && relativePath === "inscriptions") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const webinaire_id = searchParams.get("webinaire_id") || ""
      const statut = searchParams.get("statut") || ""

      let query = supabaseWebinaire
        .from("inscriptions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (webinaire_id) {
        query = query.eq("webinaire_id", webinaire_id)
      }
      if (statut) {
        query = query.eq("statut", statut)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error("getAllInscriptions error", error)
        throw new Error("Erreur lors de la récupération des inscriptions")
      }

      // Enrichir avec les données de webinaire et membre
      const inscriptionsEnriched = await Promise.all(
        (data || []).map(async (inscription: any) => {
          const [webinaireResult, membreResult] = await Promise.all([
            supabaseWebinaire
              .from("webinaires")
              .select("titre, slug, date_webinaire")
              .eq("id", inscription.webinaire_id)
              .maybeSingle(),
            inscription.membre_id
              ? supabaseAdhesion
                  .from("members")
                  .select("prenom, nom, email, numero_membre")
                  .eq("id", inscription.membre_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ])

          return {
            ...inscription,
            webinaire: webinaireResult?.data || null,
            membre: membreResult?.data || null,
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
        webinaire_id,
        prenom,
        nom,
        email,
        whatsapp,
        pays,
        membre_id,
        source,
        statut,
      } = body

      if (!webinaire_id || !prenom || !nom || !email) {
        return jsonResponse(
          {
            success: false,
            message: "webinaire_id, prenom, nom et email sont requis",
          },
          { status: 400 },
        )
      }

      // Vérifier la capacité
      const { data: webinaire } = await supabaseWebinaire
        .from("webinaires")
        .select("capacite_max")
        .eq("id", webinaire_id)
        .maybeSingle()

      if (webinaire && webinaire.capacite_max) {
        const { count: currentInscriptions } = await supabaseWebinaire
          .from("inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("webinaire_id", webinaire_id)

        if ((currentInscriptions || 0) >= webinaire.capacite_max) {
          return jsonResponse(
            { success: false, message: "La capacité maximale du webinaire est atteinte" },
            { status: 400 },
          )
        }
      }

      const { data: inscription, error } = await supabaseWebinaire
        .from("inscriptions")
        .insert({
          webinaire_id,
          prenom,
          nom,
          email,
          whatsapp: whatsapp || null,
          pays: pays || "France",
          membre_id: membre_id || null,
          source: source || "site web",
          statut: statut || "pending",
        })
        .select()
        .single()

      if (error) {
        console.error("createInscription error", error)
        throw new Error("Erreur lors de la création de l'inscription")
      }

      // Mettre à jour les stats
      await updateWebinaireStats(webinaire_id)

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
        if (body.whatsapp !== undefined) updateObj.whatsapp = body.whatsapp
        if (body.pays !== undefined) updateObj.pays = body.pays
        if (body.statut !== undefined) updateObj.statut = body.statut
        if (body.presence !== undefined) updateObj.presence = body.presence

        // Récupérer l'inscription actuelle pour obtenir webinaire_id
        const { data: currentInscription } = await supabaseWebinaire
          .from("inscriptions")
          .select("webinaire_id")
          .eq("id", inscriptionId)
          .maybeSingle()

        const { data, error } = await supabaseWebinaire
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

        // Mettre à jour les stats
        if (data.webinaire_id) {
          await updateWebinaireStats(data.webinaire_id)
        }

        return jsonResponse({
          success: true,
          message: "Inscription mise à jour avec succès",
          data,
        })
      }

      // DELETE /inscriptions/:id - Supprimer une inscription
      if (req.method === "DELETE" && subPath === "") {
        // Récupérer le webinaire_id avant suppression
        const { data: inscription } = await supabaseWebinaire
          .from("inscriptions")
          .select("webinaire_id")
          .eq("id", inscriptionId)
          .maybeSingle()

        const { error } = await supabaseWebinaire
          .from("inscriptions")
          .delete()
          .eq("id", inscriptionId)

        if (error) {
          console.error("deleteInscription error", error)
          throw new Error("Erreur lors de la suppression de l'inscription")
        }

        // Mettre à jour les stats
        if (inscription?.webinaire_id) {
          await updateWebinaireStats(inscription.webinaire_id)
        }

        return jsonResponse({
          success: true,
          message: "Inscription supprimée avec succès",
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

        const { data: inscription, error: inscriptionError } = await supabaseWebinaire
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

        const { data: webinaire } = await supabaseWebinaire
          .from("webinaires")
          .select("titre, date_webinaire, heure_debut")
          .eq("id", inscription.webinaire_id)
          .maybeSingle()

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
                event_type: "webinaire_invitation",
                email: inscription.email,
                prenom: inscription.prenom,
                nom: inscription.nom,
                webinaire_title: webinaire?.titre || "Webinaire ASGF",
                webinaire_date: webinaire?.date_webinaire || "",
                webinaire_time: webinaire?.heure_debut ? webinaire.heure_debut.substring(0, 5) : "",
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
          message: "Invitation webinaire envoyée avec succès",
        })
      }
    }

    // ========== PRÉSENTATEURS ==========

    // POST /presentateurs - Créer un présentateur
    if (req.method === "POST" && relativePath === "presentateurs") {
      const body = await req.json().catch(() => ({}))
      const { webinaire_id, nom, prenom, bio, photo_url, linkedin } = body

      if (!webinaire_id || !nom || !prenom) {
        return jsonResponse(
          { success: false, message: "webinaire_id, nom et prenom sont requis" },
          { status: 400 },
        )
      }

      const { data: presentateur, error } = await supabaseWebinaire
        .from("presentateurs")
        .insert({
          webinaire_id,
          nom,
          prenom,
          bio: bio || null,
          photo_url: photo_url || null,
          linkedin: linkedin || null,
        })
        .select()
        .single()

      if (error) {
        console.error("createPresentateur error", error)
        throw new Error("Erreur lors de la création du présentateur")
      }

      return jsonResponse({
        success: true,
        message: "Présentateur créé avec succès",
        data: presentateur,
      })
    }

    // Routes avec ID de présentateur
    const presentateurIdMatch = relativePath.match(/^presentateurs\/([0-9a-fA-F-]+)$/)
    if (presentateurIdMatch) {
      const presentateurId = presentateurIdMatch[1]

      // PUT /presentateurs/:id - Mettre à jour un présentateur
      if (req.method === "PUT") {
        const body = await req.json().catch(() => ({}))

        const updateObj: any = {}
        if (body.nom !== undefined) updateObj.nom = body.nom
        if (body.prenom !== undefined) updateObj.prenom = body.prenom
        if (body.bio !== undefined) updateObj.bio = body.bio
        if (body.photo_url !== undefined) updateObj.photo_url = body.photo_url
        if (body.linkedin !== undefined) updateObj.linkedin = body.linkedin

        const { data, error } = await supabaseWebinaire
          .from("presentateurs")
          .update(updateObj)
          .eq("id", presentateurId)
          .select()
          .single()

        if (error) {
          console.error("updatePresentateur error", error)
          throw new Error("Erreur lors de la mise à jour du présentateur")
        }

        if (!data) {
          return jsonResponse(
            { success: false, message: "Présentateur introuvable" },
            { status: 404 },
          )
        }

        return jsonResponse({
          success: true,
          message: "Présentateur mis à jour avec succès",
          data,
        })
      }

      // DELETE /presentateurs/:id - Supprimer un présentateur
      if (req.method === "DELETE") {
        const { error } = await supabaseWebinaire
          .from("presentateurs")
          .delete()
          .eq("id", presentateurId)

        if (error) {
          console.error("deletePresentateur error", error)
          throw new Error("Erreur lors de la suppression du présentateur")
        }

        return jsonResponse({
          success: true,
          message: "Présentateur supprimé avec succès",
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
    console.error("admin-webinaire exception", err)
    return jsonResponse(
      { success: false, message: (err as Error).message || "Erreur serveur" },
      { status: 500 },
    )
  }
})

