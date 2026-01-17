import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts"
import bcrypt from "bcryptjs"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const ALL_MODULES = [
  "adhesion",
  "formation",
  "webinaire",
  "tresorerie",
  "secretariat",
  "mentorat",
  "recrutement",
  "contact",
  "audit",
  "calendar",
  "projets",
]

const ROLE_TYPES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
}

const MODULE_DROITS = {
  LECTURE: "lecture",
  GESTION: "gestion",
  FULL: "full",
}

const SALT_ROUNDS = 10

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

async function hashPassword(plainPassword: string): Promise<string> {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS)
}

// Vérifier si l'admin est superadmin
async function isSuperAdmin(supabaseAdmin: any, adminId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("is_master, role_type")
    .eq("id", adminId)
    .maybeSingle()

  if (error || !data) return false
  return data.is_master === true || data.role_type === ROLE_TYPES.SUPERADMIN
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
    let currentAdminId: string | null = null
    if (jwtSecret) {
      try {
        await verifyJwt(req, jwtSecret)
        // Extraire l'admin ID du token (à adapter selon votre structure de token)
        const authHeader = req.headers.get("authorization")
        if (authHeader) {
          const token = authHeader.substring(7)
          try {
            const payload = JSON.parse(atob(token.split(".")[1]))
            currentAdminId = payload.id || payload.admin_id || null
          } catch {
            // Ignorer si on ne peut pas parser le token
          }
        }
      } catch (jwtError) {
        return jsonResponse(
          { success: false, message: "Token invalide" },
          { status: 401 },
        )
      }
    }

    // Créer les clients Supabase
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "admin" },
    })
    const supabaseOrganisation = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "organisation" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-parametres"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-parametres")) {
      relativePath = pathname.substring("/admin-parametres".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // GET /modules - Liste des modules disponibles
    if (req.method === "GET" && relativePath === "modules") {
      return jsonResponse({
        success: true,
        data: ALL_MODULES,
      })
    }

    // GET /stats - Statistiques globales
    if (req.method === "GET" && relativePath === "stats") {
      const [
        { count: activeCount },
        { count: inactiveCount },
        { count: masterCount },
      ] = await Promise.all([
        supabaseAdmin.from("admins").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabaseAdmin.from("admins").select("*", { count: "exact", head: true }).eq("is_active", false),
        supabaseAdmin
          .from("admins")
          .select("*", { count: "exact", head: true })
          .eq("is_master", true)
          .eq("is_active", true),
      ])

      return jsonResponse({
        success: true,
        data: {
          total: (activeCount || 0) + (inactiveCount || 0),
          active: activeCount || 0,
          inactive: inactiveCount || 0,
          masters: masterCount || 0,
          modules: ALL_MODULES.length,
        },
      })
    }

    // ========== GESTION DES ADMINISTRATEURS ==========

    // GET /admins - Liste tous les admins avec pagination (accessible à tous les admins authentifiés)
    if (req.method === "GET" && relativePath === "admins") {
      if (!currentAdminId) {
        return jsonResponse(
          { success: false, message: "Authentification requise" },
          { status: 401 },
        )
      }
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""

      let query = supabaseAdmin
        .from("admins")
        .select("id, numero_membre, email, role_type, super_scope, is_master, is_active, disabled_until, disabled_reason, created_at, admins_modules(module, droit, scope_ids)", {
          count: "exact",
        })
        .order("created_at", { ascending: false })

      if (search) {
        query = query.or(`email.ilike.%${search}%,numero_membre.ilike.%${search}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error("getAllAdmins error", error)
        throw new Error("Erreur lors de la récupération des admins")
      }

      const admins = (data || []).map(({ admins_modules = [], ...admin }: any) => ({
        ...admin,
        modules: (admins_modules || []).map((m: any) => ({
          module: m.module,
          droit: m.droit,
          scope_ids: m.scope_ids || [],
        })),
      }))

      return jsonResponse({
        success: true,
        data: admins,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /admins - Créer un admin
    if (req.method === "POST" && relativePath === "admins") {
      // Vérifier superadmin
      if (!currentAdminId) {
        return jsonResponse(
          { success: false, message: "Authentification requise" },
          { status: 401 },
        )
      }
      const isSuper = await isSuperAdmin(supabaseAdmin, currentAdminId)
      if (!isSuper) {
        return jsonResponse(
          { success: false, message: "Accès refusé. Seuls les superadmins peuvent créer des admins." },
          { status: 403 },
        )
      }

      const body = await req.json().catch(() => ({}))
      const {
        numero_membre,
        email,
        password,
        role_type = ROLE_TYPES.ADMIN,
        is_master = false,
        is_active = true,
        modules = [],
        super_scope = [],
        membre_id = null,
        disabled_until = null,
        disabled_reason = null,
      } = body

      if (!numero_membre || !email || !password) {
        return jsonResponse(
          { success: false, message: "numero_membre, email et password sont requis" },
          { status: 400 },
        )
      }

      // Vérifier si l'email ou le numéro membre existe déjà
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("admins")
        .select("id")
        .or(`email.eq.${email},numero_membre.eq.${numero_membre}`)
        .limit(1)

      if (checkError) {
        console.error("createAdmin check error", checkError)
        throw new Error("Erreur lors de la vérification")
      }

      if (existing && existing.length > 0) {
        return jsonResponse(
          { success: false, message: "Un admin avec cet email ou numéro membre existe déjà" },
          { status: 400 },
        )
      }

      // Hasher le mot de passe
      const password_hash = await hashPassword(password)

      // Créer l'admin
      const { data: admin, error: createError } = await supabaseAdmin
        .from("admins")
        .insert({
          numero_membre,
          email,
          password_hash,
          role_type: is_master ? ROLE_TYPES.SUPERADMIN : role_type,
          super_scope: is_master ? ALL_MODULES : super_scope,
          is_master,
          is_active,
          membre_id,
          disabled_until,
          disabled_reason,
        })
        .select("id, numero_membre, email, role_type, super_scope, is_master, is_active, created_at, disabled_until, disabled_reason")
        .single()

      if (createError) {
        console.error("createAdmin error", createError)
        throw new Error("Erreur lors de la création de l'admin")
      }

      // Ajouter les modules si fournis
      if (modules.length > 0 && !is_master) {
        const normalizedModules = modules.map((entry: any) => {
          if (typeof entry === "string") {
            return { module: entry, droit: MODULE_DROITS.FULL, scope_ids: [] }
          }
          return {
            module: entry.module,
            droit: entry.droit || MODULE_DROITS.FULL,
            scope_ids: entry.scope_ids || [],
          }
        })

        if (normalizedModules.length > 0) {
          const modulesToInsert = normalizedModules.map((module: any) => ({
            admin_id: admin.id,
            module: module.module,
            droit: module.droit,
            scope_ids: module.scope_ids,
          }))

          await supabaseAdmin.from("admins_modules").insert(modulesToInsert)
        }
      }

      // Récupérer l'admin avec ses modules
      const { data: adminWithModules } = await supabaseAdmin
        .from("admins")
        .select("id, numero_membre, email, role_type, super_scope, is_master, is_active, created_at, disabled_until, disabled_reason, admins_modules(module, droit, scope_ids)")
        .eq("id", admin.id)
        .maybeSingle()

      const formattedModules = ((adminWithModules as any)?.admins_modules || []).map((m: any) => ({
        module: m.module,
        droit: m.droit,
        scope_ids: m.scope_ids || [],
      }))

      return jsonResponse({
        success: true,
        message: "Admin créé avec succès",
        data: {
          ...admin,
          modules: formattedModules,
        },
      })
    }

    // Routes avec ID d'admin
    const adminIdMatch = relativePath.match(/^admins\/([0-9a-fA-F-]+)(?:\/(.*))?$/)
    if (adminIdMatch) {
      const adminId = adminIdMatch[1]
      const subPath = adminIdMatch[2] || ""

      // Vérifier superadmin pour les routes avec ID (sauf GET)
      if (req.method !== "GET") {
        if (!currentAdminId) {
          return jsonResponse(
            { success: false, message: "Authentification requise" },
            { status: 401 },
          )
        }
        const isSuper = await isSuperAdmin(supabaseAdmin, currentAdminId)
        if (!isSuper) {
          return jsonResponse(
            { success: false, message: "Accès refusé. Seuls les superadmins peuvent gérer les admins." },
            { status: 403 },
          )
        }
      }

      // GET /admins/:id - Détails d'un admin
      if (req.method === "GET" && subPath === "") {
        const { data: admin, error } = await supabaseAdmin
          .from("admins")
          .select("id, numero_membre, email, role_type, super_scope, is_master, is_active, disabled_until, disabled_reason, created_at, admins_modules(module, droit, scope_ids)")
          .eq("id", adminId)
          .maybeSingle()

        if (error) {
          console.error("getAdminById error", error)
          throw new Error("Erreur lors de la récupération de l'admin")
        }

        if (!admin) {
          return jsonResponse({ success: false, message: "Admin introuvable" }, { status: 404 })
        }

        const modules = ((admin as any).admins_modules || []).map((m: any) => ({
          module: m.module,
          droit: m.droit,
          scope_ids: m.scope_ids || [],
        }))

        const { admins_modules, ...rest } = admin as any

        return jsonResponse({
          success: true,
          data: {
            ...rest,
            modules,
          },
        })
      }

      // PUT /admins/:id - Mettre à jour un admin
      if (req.method === "PUT" && subPath === "") {
        const body = await req.json().catch(() => ({}))

        // Empêcher la désactivation de soi-même
        if (body.is_active === false && currentAdminId === adminId) {
          return jsonResponse(
            { success: false, message: "Vous ne pouvez pas désactiver votre propre compte" },
            { status: 400 },
          )
        }

        // Vérifier si l'admin existe
        const { data: existing, error: checkError } = await supabaseAdmin
          .from("admins")
          .select("id, is_master, role_type, super_scope")
          .eq("id", adminId)
          .maybeSingle()

        if (checkError || !existing) {
          return jsonResponse({ success: false, message: "Admin introuvable" }, { status: 404 })
        }

        // Vérifier si l'email existe déjà pour un autre admin
        if (body.email) {
          const { data: emailExists } = await supabaseAdmin
            .from("admins")
            .select("id")
            .eq("email", body.email)
            .neq("id", adminId)
            .maybeSingle()

          if (emailExists) {
            return jsonResponse(
              { success: false, message: "Cet email est déjà utilisé par un autre admin" },
              { status: 400 },
            )
          }
        }

        const updateObj: any = {}
        if (body.email !== undefined) updateObj.email = body.email
        if (body.numero_membre !== undefined) updateObj.numero_membre = body.numero_membre
        if (body.membre_id !== undefined) updateObj.membre_id = body.membre_id
        if (body.is_active !== undefined) updateObj.is_active = body.is_active
        if (body.disabled_reason !== undefined) updateObj.disabled_reason = body.disabled_reason || null
        if (body.disabled_until !== undefined) updateObj.disabled_until = body.disabled_until

        let nextIsMaster = existing.is_master
        if (body.is_master !== undefined) {
          nextIsMaster = body.is_master
          updateObj.is_master = nextIsMaster
        }

        let nextRoleType = existing.role_type
        if (body.role_type) {
          nextRoleType = body.role_type
        }
        if (nextIsMaster) {
          nextRoleType = ROLE_TYPES.SUPERADMIN
          updateObj.super_scope = ALL_MODULES
        } else if (body.super_scope !== undefined) {
          updateObj.super_scope = body.super_scope
        }
        updateObj.role_type = nextRoleType

        if (body.password) {
          updateObj.password_hash = await hashPassword(body.password)
        }

        // Réactivation : nettoyer les champs de suspension
        if (
          body.is_active === true ||
          (body.disabled_until !== undefined && !body.disabled_until)
        ) {
          updateObj.disabled_until = null
          if (body.disabled_reason === undefined) {
            updateObj.disabled_reason = null
          }
        }

        const { data: admin, error: updateError } = await supabaseAdmin
          .from("admins")
          .update(updateObj)
          .eq("id", adminId)
          .select("id, numero_membre, email, role_type, super_scope, is_master, is_active, created_at, disabled_until, disabled_reason")
          .single()

        if (updateError) {
          console.error("updateAdmin error", updateError)
          throw new Error("Erreur lors de la mise à jour de l'admin")
        }

        // Récupérer l'admin avec ses modules
        const { data: adminWithModules } = await supabaseAdmin
          .from("admins")
          .select("id, numero_membre, email, role_type, super_scope, is_master, is_active, created_at, disabled_until, disabled_reason, admins_modules(module, droit, scope_ids)")
          .eq("id", adminId)
          .maybeSingle()

        const formattedModules = ((adminWithModules as any)?.admins_modules || []).map((m: any) => ({
          module: m.module,
          droit: m.droit,
          scope_ids: m.scope_ids || [],
        }))

        return jsonResponse({
          success: true,
          message: "Admin mis à jour avec succès",
          data: {
            ...admin,
            modules: formattedModules,
          },
        })
      }

      // DELETE /admins/:id - Désactiver un admin
      if (req.method === "DELETE" && subPath === "") {
        const body = await req.json().catch(() => ({}))

        // Empêcher la désactivation de soi-même
        if (currentAdminId === adminId) {
          return jsonResponse(
            { success: false, message: "Vous ne pouvez pas désactiver votre propre compte" },
            { status: 400 },
          )
        }

        const { reason = "Compte désactivé par un superadmin", disabled_until = null } = body
        const updatePayload: any = {
          disabled_reason: reason,
        }

        if (disabled_until) {
          updatePayload.disabled_until = disabled_until
          updatePayload.is_active = true
        } else {
          updatePayload.is_active = false
          updatePayload.disabled_until = null
        }

        const { error } = await supabaseAdmin
          .from("admins")
          .update(updatePayload)
          .eq("id", adminId)

        if (error) {
          console.error("deactivateAdmin error", error)
          throw new Error("Erreur lors de la désactivation de l'admin")
        }

        const message = disabled_until
          ? `Admin suspendu jusqu'au ${new Date(disabled_until).toLocaleString("fr-FR")}`
          : "Admin désactivé avec succès"

        return jsonResponse({
          success: true,
          message,
        })
      }

      // GET /admins/:id/modules - Récupère les modules d'un admin
      if (req.method === "GET" && subPath === "modules") {
        const { data, error } = await supabaseAdmin
          .from("admins_modules")
          .select("module, droit, scope_ids")
          .eq("admin_id", adminId)

        if (error) {
          console.error("getAdminModules error", error)
          throw new Error("Erreur lors de la récupération des modules")
        }

        return jsonResponse({
          success: true,
          data: (data || []).map((m: any) => ({
            module: m.module,
            droit: m.droit,
            scope_ids: m.scope_ids || [],
          })),
        })
      }

      // PUT /admins/:id/modules - Met à jour les modules d'un admin
      if (req.method === "PUT" && subPath === "modules") {
        const body = await req.json().catch(() => ({}))
        const { modules } = body

        if (!Array.isArray(modules)) {
          return jsonResponse(
            { success: false, message: "Le champ modules doit être un tableau" },
            { status: 400 },
          )
        }

        // Vérifier que l'admin existe et n'est pas master
        const { data: admin } = await supabaseAdmin
          .from("admins")
          .select("id, is_master")
          .eq("id", adminId)
          .maybeSingle()

        if (!admin) {
          return jsonResponse({ success: false, message: "Admin introuvable" }, { status: 404 })
        }

        if ((admin as any).is_master) {
          return jsonResponse({
            success: true,
            data: ALL_MODULES.map((m) => ({ module: m, droit: MODULE_DROITS.FULL, scope_ids: [] })),
          })
        }

        // Normaliser et valider la charge utile
        const normalizedModules = modules.map((entry: any) => {
          if (typeof entry === "string") {
            return { module: entry, droit: MODULE_DROITS.FULL, scope_ids: [] }
          }
          return {
            module: entry.module,
            droit: entry.droit || MODULE_DROITS.FULL,
            scope_ids: entry.scope_ids || [],
          }
        })

        const invalidModule = normalizedModules.find((m) => !ALL_MODULES.includes(m.module))
        if (invalidModule) {
          return jsonResponse(
            { success: false, message: `Module invalide: ${invalidModule.module}` },
            { status: 400 },
          )
        }

        // Supprimer tous les modules existants
        await supabaseAdmin.from("admins_modules").delete().eq("admin_id", adminId)

        // Ajouter les nouveaux modules
        if (normalizedModules.length > 0) {
          const modulesToInsert = normalizedModules.map((module: any) => ({
            admin_id: adminId,
            module: module.module,
            droit: module.droit,
            scope_ids: module.scope_ids,
          }))

          const { error: insertError } = await supabaseAdmin
            .from("admins_modules")
            .insert(modulesToInsert)

          if (insertError) {
            console.error("updateAdminModules insert error", insertError)
            throw new Error("Erreur lors de l'ajout des modules")
          }
        }

        return jsonResponse({
          success: true,
          message: "Modules mis à jour avec succès",
          data: normalizedModules,
        })
      }
    }

    // ========== GESTION DU BUREAU ==========

    // GET /bureau - Liste tous les membres (admin, y compris inactifs)
    if (req.method === "GET" && relativePath === "bureau") {
      if (!currentAdminId) {
        return jsonResponse(
          { success: false, message: "Authentification requise" },
          { status: 401 },
        )
      }

      const { data, error } = await supabaseOrganisation
        .from("bureau_members")
        .select("*")
        .order("categorie", { ascending: true })
        .order("ordre", { ascending: true })

      if (error) {
        console.error("getAllBureauMembers error", error)
        if (error.code === "42P01") {
          return jsonResponse({ success: true, data: [] })
        }
        throw new Error("Erreur lors de la récupération des membres du bureau")
      }

      return jsonResponse({
        success: true,
        data: data || [],
      })
    }

    // POST /bureau - Créer un membre du bureau
    if (req.method === "POST" && relativePath === "bureau") {
      if (!currentAdminId) {
        return jsonResponse(
          { success: false, message: "Authentification requise" },
          { status: 401 },
        )
      }

      const body = await req.json().catch(() => ({}))

      if (!body.prenom || !body.nom || !body.role_court || !body.role_long || !body.categorie) {
        return jsonResponse(
          { success: false, message: "Champs requis manquants" },
          { status: 400 },
        )
      }

      const { data, error } = await supabaseOrganisation
        .from("bureau_members")
        .insert([body])
        .select()
        .single()

      if (error) {
        console.error("createBureauMember error", error)
        throw new Error("Erreur lors de la création du membre")
      }

      return jsonResponse({
        success: true,
        message: "Membre du bureau créé avec succès",
        data,
      })
    }

    // Routes avec ID de membre du bureau
    const bureauMemberIdMatch = relativePath.match(/^bureau\/([0-9a-fA-F-]+)(?:\/(.*))?$/)
    if (bureauMemberIdMatch) {
      const memberId = bureauMemberIdMatch[1]
      const subPath = bureauMemberIdMatch[2] || ""

      if (!currentAdminId) {
        return jsonResponse(
          { success: false, message: "Authentification requise" },
          { status: 401 },
        )
      }

      // PUT /bureau/:id - Mettre à jour un membre
      if (req.method === "PUT" && subPath === "") {
        const body = await req.json().catch(() => ({}))

        const { data, error } = await supabaseOrganisation
          .from("bureau_members")
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq("id", memberId)
          .select()
          .single()

        if (error) {
          console.error("updateBureauMember error", error)
          throw new Error("Erreur lors de la mise à jour du membre")
        }

        if (!data) {
          return jsonResponse({ success: false, message: "Membre non trouvé" }, { status: 404 })
        }

        return jsonResponse({
          success: true,
          message: "Membre mis à jour avec succès",
          data,
        })
      }

      // DELETE /bureau/:id - Soft delete d'un membre
      if (req.method === "DELETE" && subPath === "") {
        const { error } = await supabaseOrganisation
          .from("bureau_members")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", memberId)

        if (error) {
          console.error("deleteBureauMember error", error)
          throw new Error("Erreur lors de la suppression du membre")
        }

        return jsonResponse({
          success: true,
          message: "Membre supprimé avec succès",
        })
      }

      // POST /bureau/:id/photo - Upload une photo
      if (req.method === "POST" && subPath === "photo") {
        const body = await req.json().catch(() => ({}))
        const { file: fileBase64, fileName } = body

        if (!fileBase64) {
          return jsonResponse(
            { success: false, message: "Aucun fichier fourni" },
            { status: 400 },
          )
        }

        // Extraire le type MIME et les données base64
        const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        if (!matches || matches.length !== 3) {
          return jsonResponse(
            { success: false, message: "Format de fichier invalide. Attendu: data:image/...;base64,..." },
            { status: 400 },
          )
        }

        const mimeType = matches[1]
        const base64Data = matches[2]
        const fileBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

        // Déterminer l'extension
        const fileExt = fileName
          ? fileName.split(".").pop()
          : mimeType.includes("jpeg")
          ? "jpg"
          : mimeType.split("/")[1]
        const finalFileName = `member-${memberId}.${fileExt}`
        const filePath = `photos/${finalFileName}`

        // Upload vers Supabase Storage
        const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey)
        const { data: uploadData, error: uploadError } = await supabaseStorage.storage
          .from("bureau-photos")
          .upload(filePath, fileBytes, {
            contentType: mimeType,
            upsert: true,
          })

        if (uploadError) {
          console.error("Error uploading photo to storage", uploadError)
          throw new Error("Erreur lors de l'upload de la photo")
        }

        // Obtenir l'URL publique
        const { data: publicUrlData } = supabaseStorage.storage
          .from("bureau-photos")
          .getPublicUrl(filePath)

        // Mettre à jour le membre avec la photo_url
        const { data: memberData, error: updateError } = await supabaseOrganisation
          .from("bureau_members")
          .update({
            photo_url: publicUrlData.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", memberId)
          .select()
          .single()

        if (updateError) {
          console.error("Error updating member photo_url", updateError)
          throw new Error("Erreur lors de la mise à jour de la photo")
        }

        return jsonResponse({
          success: true,
          message: "Photo uploadée avec succès",
          data: {
            photo_url: publicUrlData.publicUrl,
            member: memberData,
          },
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
    console.error("admin-parametres exception", err)
    return jsonResponse(
      { success: false, message: (err as Error).message || "Erreur serveur" },
      { status: 500 },
    )
  }
})

