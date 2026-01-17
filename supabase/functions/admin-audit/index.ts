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

    // Créer le client Supabase pour le schéma public
    const supabasePublic = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "public" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-audit"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-audit")) {
      relativePath = pathname.substring("/admin-audit".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // ========== LOGS D'AUDIT ==========

    // GET /logs - Récupère l'historique des actions avec filtres
    if (req.method === "GET" && relativePath === "logs") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 500)
      const adminId = searchParams.get("adminId") || null
      const actionType = searchParams.get("actionType") || null
      const entityType = searchParams.get("entityType") || null
      const module = searchParams.get("module") || null
      const search = searchParams.get("search") || ""
      const startDate = searchParams.get("startDate") || null
      const endDate = searchParams.get("endDate") || null

      let query = supabasePublic
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      // Filtres
      if (adminId) {
        query = query.eq("admin_id", adminId)
      }

      if (actionType) {
        query = query.eq("action_type", actionType)
      }

      if (entityType) {
        query = query.eq("entity_type", entityType)
      }

      if (module) {
        query = query.eq("module", module)
      }

      if (search) {
        query = query.or(
          `admin_email.ilike.%${search}%,admin_nom.ilike.%${search}%,entity_name.ilike.%${search}%`
        )
      }

      if (startDate) {
        query = query.gte("created_at", startDate)
      }

      if (endDate) {
        query = query.lte("created_at", endDate)
      }

      // Pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error("Erreur lors de la récupération des logs audit", error)
        throw new Error("Erreur lors de la récupération des logs audit")
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

    // ========== STATISTIQUES D'AUDIT ==========

    // GET /stats - Récupère les statistiques d'audit
    if (req.method === "GET" && relativePath === "stats") {
      // Récupérer tous les logs
      const { data: allLogs, error } = await supabasePublic
        .from("audit_log")
        .select("action_type, module, admin_id, admin_email, admin_nom")

      if (error) {
        console.error("Erreur lors de la récupération des logs pour stats", error)
        throw new Error("Erreur lors de la récupération des statistiques")
      }

      // Actions par type
      const actionsByType: Record<string, number> = {}
      if (allLogs) {
        allLogs.forEach((log: any) => {
          const actionType = log.action_type || "UNKNOWN"
          actionsByType[actionType] = (actionsByType[actionType] || 0) + 1
        })
      }

      // Actions par module
      const actionsByModule: Record<string, number> = {}
      if (allLogs) {
        allLogs.forEach((log: any) => {
          if (log.module) {
            actionsByModule[log.module] = (actionsByModule[log.module] || 0) + 1
          }
        })
      }

      // Admins les plus actifs
      const adminCounts: Record<string, any> = {}
      if (allLogs) {
        allLogs.forEach((log: any) => {
          const key = log.admin_id
          if (key) {
            if (!adminCounts[key]) {
              adminCounts[key] = {
                admin_id: log.admin_id,
                admin_email: log.admin_email,
                admin_nom: log.admin_nom,
                count: 0,
              }
            }
            adminCounts[key].count++
          }
        })
      }

      const activeAdmins = Object.values(adminCounts)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10)

      return jsonResponse({
        success: true,
        data: {
          actionsByType,
          actionsByModule,
          activeAdmins,
        },
      })
    }

    // Route non trouvée
    return jsonResponse(
      { success: false, message: "Route non trouvée" },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-audit exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})


