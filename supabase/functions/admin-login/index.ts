import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import bcrypt from "npm:bcryptjs@2.4.3"
import {
  create,
  getNumericDate,
  type Header,
  type Payload,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers || {})
  headers.set("Content-Type", "application/json")
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(JSON.stringify(body), { ...init, headers })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Méthode non autorisée" }, {
      status: 405,
    })
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

  // Schéma "admin" comme dans le backend Node (tables admin.admins, admin.admins_modules)
  const supabaseAdmin = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    db: { schema: "admin" },
  })

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return jsonResponse(
        {
          success: false,
          message: "Corps de requête invalide",
        },
        { status: 400 },
      )
    }

    const { email, password, numero_membre } = body as Record<string, unknown>

    if (
      typeof password !== "string" ||
      (!email && !numero_membre) ||
      (email && typeof email !== "string") ||
      (numero_membre && typeof numero_membre !== "string")
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Mot de passe + email ou numero_membre requis",
        },
        { status: 400 },
      )
    }

    let query = supabaseAdmin
      .from("admins")
      .select(
        "id, numero_membre, role_type, super_scope, is_master, is_active, password_hash, email, disabled_until, disabled_reason",
      )
      .limit(1)

    if (email && typeof email === "string") {
      query = query.eq("email", email)
    } else if (numero_membre && typeof numero_membre === "string") {
      query = query.eq("numero_membre", numero_membre)
    }

    const { data: admins, error } = await query
    if (error) {
      console.error("admin-login erreur requête admins", error)
      return jsonResponse(
        { success: false, message: "Erreur serveur" },
        { status: 500 },
      )
    }

    const admin = admins?.[0]
    if (!admin) {
      return jsonResponse(
        { success: false, message: "Compte introuvable" },
        { status: 401 },
      )
    }

    if (!admin.is_active) {
      return jsonResponse(
        { success: false, message: "Compte désactivé par un superadmin" },
        { status: 401 },
      )
    }

    if (admin.disabled_until) {
      const disabledUntilDate = new Date(admin.disabled_until as string)
      const now = new Date()
      if (disabledUntilDate > now) {
        return jsonResponse(
          {
            success: false,
            message: `Compte suspendu jusqu'au ${disabledUntilDate.toLocaleString(
              "fr-FR",
            )}`,
          },
          { status: 423 },
        )
      }

      await supabaseAdmin
        .from("admins")
        .update({ disabled_until: null, disabled_reason: null })
        .eq("id", admin.id)
    }

    const hash = (admin.password_hash as string | null) || null
    if (!hash) {
      return jsonResponse(
        { success: false, message: "Identifiants invalides" },
        { status: 401 },
      )
    }

    const ok = await bcrypt.compare(password, hash)
    if (!ok) {
      return jsonResponse(
        { success: false, message: "Identifiants invalides" },
        { status: 401 },
      )
    }

    const header: Header = { alg: "HS256", typ: "JWT" }
    const payload: Payload = {
      id: admin.id,
      numero_membre: admin.numero_membre,
      role_type: admin.role_type,
      super_scope: admin.super_scope || [],
      is_master: admin.is_master,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60 * 24 * 7), // 7 jours
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )

    const token = await create(header, payload, key)

    const { data: modules, error: modError } = await supabaseAdmin
      .from("admins_modules")
      .select("module")
      .eq("admin_id", admin.id)

    if (modError) {
      console.error("admin-login erreur chargement modules", modError)
    }

    return jsonResponse({
      success: true,
      message: "Connexion réussie",
      data: {
        token,
        admin: {
          id: admin.id,
          numero_membre: admin.numero_membre,
          role_type: admin.role_type,
          is_master: admin.is_master,
          super_scope: admin.super_scope || [],
          email: admin.email,
          disabled_reason: admin.disabled_reason,
          disabled_until: admin.disabled_until,
          modules: (modules || []).map((m: any) => m.module),
        },
      },
    })
  } catch (err) {
    console.error("admin-login exception", err)
    return jsonResponse(
      { success: false, message: "Erreur serveur" },
      { status: 500 },
    )
  }
})


