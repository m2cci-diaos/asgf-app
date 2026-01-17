import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    // Créer les clients Supabase pour les différents schémas
    const supabaseFormation = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "formation" },
    })
    const supabaseWebinaire = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "webinaire" },
    })
    const supabaseSecretariat = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "secretariat" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-calendrier"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-calendrier")) {
      relativePath = pathname.substring("/admin-calendrier".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // ========== ÉVÉNEMENTS CALENDRIER ==========

    // GET /events - Récupère tous les événements pour le calendrier
    if (req.method === "GET" && (relativePath === "events" || relativePath === "")) {
      const startDate = searchParams.get("startDate") || ""
      const endDate = searchParams.get("endDate") || ""

      const events: any[] = []

      // 1. Récupérer les sessions de formations
      try {
        let formationsQuery = supabaseFormation
          .from("sessions")
          .select(`
            id,
            date_debut,
            date_fin,
            statut,
            formations (
              id,
              titre,
              slug,
              categorie
            )
          `)
          .eq("statut", "ouverte")
          .order("date_debut", { ascending: true })
          .limit(100)

        if (startDate) {
          formationsQuery = formationsQuery.gte("date_debut", startDate)
        }
        if (endDate) {
          formationsQuery = formationsQuery.lte("date_debut", endDate)
        }

        const { data: sessions, error: sessionsError } = await formationsQuery

        if (sessionsError) {
          console.error("Erreur récupération formations:", sessionsError)
        } else {
          console.log(`Sessions formations récupérées: ${sessions?.length || 0}`)
          if (sessions && sessions.length > 0) {
            sessions.forEach((session: any) => {
              if (session.formations) {
                events.push({
                  id: `formation-${session.id}`,
                  type: "formation",
                  title: session.formations.titre || "Formation",
                  start: session.date_debut,
                  end: session.date_fin || session.date_debut,
                  formation_id: session.formations.id,
                  session_id: session.id,
                  statut: session.statut,
                })
              }
            })
          }
        }
      } catch (err) {
        console.error("Exception récupération formations pour calendrier", err)
      }

      // 2. Récupérer les webinaires
      try {
        console.log("Début récupération webinaires...")
        let webinairesQuery = supabaseWebinaire
          .from("webinaires")
          .select("id, titre, date_webinaire, heure_debut, heure_fin, is_active")
          .eq("is_active", true)
          .order("date_webinaire", { ascending: true })
          .limit(100)

        if (startDate) {
          webinairesQuery = webinairesQuery.gte("date_webinaire", startDate)
        }
        if (endDate) {
          webinairesQuery = webinairesQuery.lte("date_webinaire", endDate)
        }

        const { data: webinaires, error: webinairesError } = await webinairesQuery

        if (webinairesError) {
          console.error("Erreur récupération webinaires:", JSON.stringify(webinairesError))
        } else {
          console.log(`Webinaires récupérés (total): ${webinaires?.length || 0}`)
          if (webinaires && webinaires.length > 0) {
            webinaires.forEach((webinaire: any) => {
              if (webinaire.date_webinaire) {
                const startDateTime = webinaire.date_webinaire + (webinaire.heure_debut ? `T${webinaire.heure_debut}` : "T00:00:00")
                const endDateTime = webinaire.heure_fin
                  ? webinaire.date_webinaire + `T${webinaire.heure_fin}`
                  : webinaire.date_webinaire + (webinaire.heure_debut ? `T${webinaire.heure_debut}` : "T23:59:59")

                events.push({
                  id: `webinaire-${webinaire.id}`,
                  type: "webinaire",
                  title: webinaire.titre || "Webinaire",
                  start: startDateTime,
                  end: endDateTime,
                  webinaire_id: webinaire.id,
                })
              } else {
                console.log(`Webinaire ${webinaire.id} sans date_webinaire`)
              }
            })
          } else {
            console.log("Aucun webinaire trouvé dans la base de données")
          }
        }
      } catch (err) {
        console.error("Exception récupération webinaires pour calendrier", err)
      }

      // 3. Récupérer les réunions
      try {
        console.log("Début récupération réunions...")
        let reunionsQuery = supabaseSecretariat
          .from("reunions")
          .select("id, titre, date_reunion, heure_debut, heure_fin")
          .order("date_reunion", { ascending: true })
          .limit(100)

        if (startDate) {
          reunionsQuery = reunionsQuery.gte("date_reunion", startDate)
        }
        if (endDate) {
          reunionsQuery = reunionsQuery.lte("date_reunion", endDate)
        }

        const { data: reunions, error: reunionsError } = await reunionsQuery

        if (reunionsError) {
          console.error("Erreur récupération réunions:", JSON.stringify(reunionsError))
        } else {
          console.log(`Réunions récupérées (total): ${reunions?.length || 0}`)
          if (reunions && reunions.length > 0) {
            reunions.forEach((reunion: any) => {
              if (reunion.date_reunion) {
                const startDateTime = reunion.date_reunion + (reunion.heure_debut ? `T${reunion.heure_debut}` : "T00:00:00")
                const endDateTime = reunion.heure_fin
                  ? reunion.date_reunion + `T${reunion.heure_fin}`
                  : reunion.date_reunion + (reunion.heure_debut ? `T${reunion.heure_debut}` : "T23:59:59")

                events.push({
                  id: `reunion-${reunion.id}`,
                  type: "reunion",
                  title: reunion.titre || "Réunion",
                  start: startDateTime,
                  end: endDateTime,
                  reunion_id: reunion.id,
                })
              } else {
                console.log(`Réunion ${reunion.id} sans date_reunion`)
              }
            })
          } else {
            console.log("Aucune réunion trouvée dans la base de données")
          }
        }
      } catch (err) {
        console.error("Exception récupération réunions pour calendrier", err)
      }

      console.log(`Événements calendrier récupérés: ${events.length}`)

      return jsonResponse({
        success: true,
        data: events,
      })
    }

    // Route non trouvée
    return jsonResponse(
      { success: false, message: "Route non trouvée" },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-calendrier exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})

