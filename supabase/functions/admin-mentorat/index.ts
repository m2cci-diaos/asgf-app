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
    const supabaseMentorat = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "mentorat" },
    })
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-mentorat"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-mentorat")) {
      relativePath = pathname.substring("/admin-mentorat".length)
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
          .select("id, prenom, nom, email, numero_membre")
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
        { count: mentorsCount },
        { count: menteesCount },
        { count: relationsCount },
        { count: rdvCount },
        { data: domainesData },
        { data: objectifsData },
      ] = await Promise.all([
        supabaseMentorat
          .from("mentors")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabaseMentorat
          .from("mentees")
          .select("*", { count: "exact", head: true })
          .eq("status", "en recherche"),
        supabaseMentorat
          .from("relations")
          .select("*", { count: "exact", head: true })
          .eq("statut_relation", "active"),
        supabaseMentorat
          .from("rendezvous")
          .select("*", { count: "exact", head: true }),
        supabaseMentorat
          .from("mentors")
          .select("domaine")
          .eq("status", "active"),
        supabaseMentorat
          .from("objectifs")
          .select("statut"),
      ])

      const domainesRepartition: Record<string, number> = {}
      ;(domainesData || []).forEach((m: any) => {
        domainesRepartition[m.domaine] = (domainesRepartition[m.domaine] || 0) + 1
      })

      const objectifsRepartition: Record<string, number> = {}
      ;(objectifsData || []).forEach((o: any) => {
        objectifsRepartition[o.statut] = (objectifsRepartition[o.statut] || 0) + 1
      })

      return jsonResponse({
        success: true,
        data: {
          mentors_actifs: mentorsCount || 0,
          mentees_en_recherche: menteesCount || 0,
          relations_actives: relationsCount || 0,
          total_rendezvous: rdvCount || 0,
          repartition_domaines: domainesRepartition,
          repartition_objectifs: objectifsRepartition,
        },
      })
    }

    // ========== MENTORS ==========

    // GET /mentors
    if (req.method === "GET" && relativePath === "mentors") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""
      const domaine = searchParams.get("domaine") || ""
      const status = searchParams.get("status") || ""

      let query = supabaseMentorat
        .from("mentors")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (search) {
        query = query.or(`domaine.ilike.%${search}%,competences.ilike.%${search}%,biographie.ilike.%${search}%`)
      }
      if (domaine) {
        query = query.eq("domaine", domaine)
      }
      if (status) {
        query = query.eq("status", status)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: mentors, error, count } = await query

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la récupération des mentors" },
          { status: 500 },
        )
      }

      const mentorsWithMembers = await Promise.all(
        (mentors || []).map(async (mentor: any) => {
          const membre = await enrichWithMember(mentor, mentor.membre_id)
          return { ...mentor, membre }
        }),
      )

      return jsonResponse({
        success: true,
        data: mentorsWithMembers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // GET /mentors/:id
    const mentorMatch = relativePath.match(/^mentors\/(.+)$/)
    if (req.method === "GET" && mentorMatch) {
      const mentorId = mentorMatch[1]
      const { data: mentor, error } = await supabaseMentorat
        .from("mentors")
        .select("*")
        .eq("id", mentorId)
        .maybeSingle()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération du mentor" },
          { status: 500 },
        )
      }

      if (!mentor) {
        return jsonResponse(
          { success: false, message: "Mentor introuvable" },
          { status: 404 },
        )
      }

      const membre = await enrichWithMember(mentor, mentor.membre_id)

      return jsonResponse({
        success: true,
        data: { ...mentor, membre },
      })
    }

    // POST /mentors
    if (req.method === "POST" && relativePath === "mentors") {
      const body = await req.json()
      const { data: existing } = await supabaseMentorat
        .from("mentors")
        .select("id")
        .eq("membre_id", body.membre_id)
        .maybeSingle()

      if (existing) {
        return jsonResponse(
          { success: false, message: "Ce membre est déjà enregistré comme mentor" },
          { status: 409 },
        )
      }

      const { data, error } = await supabaseMentorat
        .from("mentors")
        .insert({
          membre_id: body.membre_id,
          domaine: body.domaine,
          biographie: body.biographie || null,
          competences: body.competences || null,
          linkedin: body.linkedin || null,
          disponibilite: body.disponibilite || null,
          status: body.status || "active",
        })
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création du mentor" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Mentor créé avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /mentors/:id
    if (req.method === "PUT" && mentorMatch) {
      const mentorId = mentorMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("mentors")
        .update(body)
        .eq("id", mentorId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour du mentor" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Mentor mis à jour avec succès",
        data,
      })
    }

    // ========== MENTEES ==========

    // GET /mentees
    if (req.method === "GET" && relativePath === "mentees") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""
      const domaine = searchParams.get("domaine") || ""
      const status = searchParams.get("status") || ""

      let query = supabaseMentorat
        .from("mentees")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (search) {
        query = query.or(`domaine_souhaite.ilike.%${search}%,objectif_general.ilike.%${search}%`)
      }
      if (domaine) {
        query = query.eq("domaine_souhaite", domaine)
      }
      if (status) {
        query = query.eq("status", status)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: mentees, error, count } = await query

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération des mentorés" },
          { status: 500 },
        )
      }

      const menteesWithMembers = await Promise.all(
        (mentees || []).map(async (mentee: any) => {
          const membre = await enrichWithMember(mentee, mentee.membre_id)
          return { ...mentee, membre }
        }),
      )

      return jsonResponse({
        success: true,
        data: menteesWithMembers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // GET /mentees/:id
    const menteeMatch = relativePath.match(/^mentees\/(.+)$/)
    if (req.method === "GET" && menteeMatch) {
      const menteeId = menteeMatch[1]
      const { data: mentee, error } = await supabaseMentorat
        .from("mentees")
        .select("*")
        .eq("id", menteeId)
        .maybeSingle()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération du mentoré" },
          { status: 500 },
        )
      }

      if (!mentee) {
        return jsonResponse(
          { success: false, message: "Mentoré introuvable" },
          { status: 404 },
        )
      }

      const membre = await enrichWithMember(mentee, mentee.membre_id)

      return jsonResponse({
        success: true,
        data: { ...mentee, membre },
      })
    }

    // POST /mentees
    if (req.method === "POST" && relativePath === "mentees") {
      const body = await req.json()
      const { data: existing } = await supabaseMentorat
        .from("mentees")
        .select("id")
        .eq("membre_id", body.membre_id)
        .maybeSingle()

      if (existing) {
        return jsonResponse(
          { success: false, message: "Ce membre est déjà enregistré comme mentoré" },
          { status: 409 },
        )
      }

      const { data, error } = await supabaseMentorat
        .from("mentees")
        .insert({
          membre_id: body.membre_id,
          domaine_souhaite: body.domaine_souhaite,
          objectif_general: body.objectif_general || null,
          niveau: body.niveau || null,
          status: body.status || "en recherche",
        })
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création du mentoré" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Mentoré créé avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /mentees/:id
    if (req.method === "PUT" && menteeMatch) {
      const menteeId = menteeMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("mentees")
        .update(body)
        .eq("id", menteeId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour du mentoré" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Mentoré mis à jour avec succès",
        data,
      })
    }

    // ========== RELATIONS ==========

    // GET /relations
    if (req.method === "GET" && relativePath === "relations") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const status = searchParams.get("status") || ""

      let query = supabaseMentorat
        .from("relations")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (status) {
        query = query.eq("statut_relation", status)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: relations, error, count } = await query

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la récupération des relations" },
          { status: 500 },
        )
      }

      const enrichedRelations = await Promise.all(
        (relations || []).map(async (relation: any) => {
          const [mentorData, menteeData] = await Promise.all([
            supabaseMentorat.from("mentors").select("*").eq("id", relation.mentor_id).maybeSingle(),
            supabaseMentorat.from("mentees").select("*").eq("id", relation.mentee_id).maybeSingle(),
          ])

          const mentorMembre = await enrichWithMember(mentorData.data, mentorData.data?.membre_id)
          const menteeMembre = await enrichWithMember(menteeData.data, menteeData.data?.membre_id)

          return {
            ...relation,
            mentor: mentorData.data ? { ...mentorData.data, membre: mentorMembre } : null,
            mentee: menteeData.data ? { ...menteeData.data, membre: menteeMembre } : null,
          }
        }),
      )

      return jsonResponse({
        success: true,
        data: enrichedRelations,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // GET /relations/:id
    const relationMatch = relativePath.match(/^relations\/(.+)$/)
    if (req.method === "GET" && relationMatch) {
      const relationId = relationMatch[1]
      const { data: relation, error } = await supabaseMentorat
        .from("relations")
        .select("*")
        .eq("id", relationId)
        .maybeSingle()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération de la relation" },
          { status: 500 },
        )
      }

      if (!relation) {
        return jsonResponse(
          { success: false, message: "Relation introuvable" },
          { status: 404 },
        )
      }

      const [mentorData, menteeData] = await Promise.all([
        supabaseMentorat.from("mentors").select("*").eq("id", relation.mentor_id).maybeSingle(),
        supabaseMentorat.from("mentees").select("*").eq("id", relation.mentee_id).maybeSingle(),
      ])

      const mentorMembre = await enrichWithMember(mentorData.data, mentorData.data?.membre_id)
      const menteeMembre = await enrichWithMember(menteeData.data, menteeData.data?.membre_id)

      return jsonResponse({
        success: true,
        data: {
          ...relation,
          mentor: mentorData.data ? { ...mentorData.data, membre: mentorMembre } : null,
          mentee: menteeData.data ? { ...menteeData.data, membre: menteeMembre } : null,
        },
      })
    }

    // POST /relations
    if (req.method === "POST" && relativePath === "relations") {
      const body = await req.json()
      const statutRelation = body.statut_relation || "active"

      if (statutRelation === "active") {
        const { data: existingActive } = await supabaseMentorat
          .from("relations")
          .select("id")
          .eq("mentor_id", body.mentor_id)
          .eq("mentee_id", body.mentee_id)
          .eq("statut_relation", "active")
          .maybeSingle()

        if (existingActive) {
          return jsonResponse(
            { success: false, message: "Une relation active existe déjà entre ce mentor et ce mentoré" },
            { status: 409 },
          )
        }
      }

      const { data, error } = await supabaseMentorat
        .from("relations")
        .insert({
          mentor_id: body.mentor_id,
          mentee_id: body.mentee_id,
          date_debut: body.date_debut || new Date().toISOString().split("T")[0],
          date_fin: body.date_fin || null,
          statut_relation: statutRelation,
          commentaire_admin: body.commentaire_admin || null,
        })
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création de la relation" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Relation créée avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /relations/:id
    if (req.method === "PUT" && relationMatch) {
      const relationId = relationMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("relations")
        .update(body)
        .eq("id", relationId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour de la relation" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Relation mise à jour avec succès",
        data,
      })
    }

    // POST /relations/:id/close
    const relationCloseMatch = relativePath.match(/^relations\/(.+)\/close$/)
    if (req.method === "POST" && relationCloseMatch) {
      const relationId = relationCloseMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("relations")
        .update({
          statut_relation: "terminee",
          date_fin: new Date().toISOString().split("T")[0],
          commentaire_admin: body.commentaire || null,
        })
        .eq("id", relationId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la clôture de la relation" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Relation clôturée avec succès",
        data,
      })
    }

    // ========== OBJECTIFS ==========

    // GET /relations/:id/objectifs
    const relationObjectifsMatch = relativePath.match(/^relations\/(.+)\/objectifs$/)
    if (req.method === "GET" && relationObjectifsMatch) {
      const relationId = relationObjectifsMatch[1]
      const { data, error } = await supabaseMentorat
        .from("objectifs")
        .select("*")
        .eq("relation_id", relationId)
        .order("created_at", { ascending: false })

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération des objectifs" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        data: data || [],
      })
    }

    // POST /objectifs
    if (req.method === "POST" && relativePath === "objectifs") {
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("objectifs")
        .insert({
          relation_id: body.relation_id,
          titre: body.titre,
          description: body.description || null,
          statut: body.statut || "en cours",
          deadline: body.deadline || null,
        })
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création de l'objectif" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Objectif créé avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /objectifs/:id
    const objectifMatch = relativePath.match(/^objectifs\/(.+)$/)
    if (req.method === "PUT" && objectifMatch) {
      const objectifId = objectifMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("objectifs")
        .update(body)
        .eq("id", objectifId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour de l'objectif" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Objectif mis à jour avec succès",
        data,
      })
    }

    // ========== RENDEZ-VOUS ==========

    // GET /relations/:id/rendezvous
    const relationRdvMatch = relativePath.match(/^relations\/(.+)\/rendezvous$/)
    if (req.method === "GET" && relationRdvMatch) {
      const relationId = relationRdvMatch[1]
      const { data, error } = await supabaseMentorat
        .from("rendezvous")
        .select("*")
        .eq("relation_id", relationId)
        .order("date_rdv", { ascending: false })

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la récupération des rendez-vous" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        data: data || [],
      })
    }

    // POST /rendezvous
    if (req.method === "POST" && relativePath === "rendezvous") {
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("rendezvous")
        .insert({
          relation_id: body.relation_id,
          date_rdv: body.date_rdv,
          type: body.type,
          notes_rdv: body.notes_rdv || null,
          prochaine_action: body.prochaine_action || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          return jsonResponse(
            { success: false, message: "Un rendez-vous existe déjà à cette date et heure pour cette relation" },
            { status: 409 },
          )
        }
        return jsonResponse(
          { success: false, message: error.message || "Erreur lors de la création du rendez-vous" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Rendez-vous créé avec succès",
        data,
      }, { status: 201 })
    }

    // PUT /rendezvous/:id
    const rdvMatch = relativePath.match(/^rendezvous\/(.+)$/)
    if (req.method === "PUT" && rdvMatch) {
      const rdvId = rdvMatch[1]
      const body = await req.json()
      const { data, error } = await supabaseMentorat
        .from("rendezvous")
        .update(body)
        .eq("id", rdvId)
        .select()
        .single()

      if (error) {
        return jsonResponse(
          { success: false, message: "Erreur lors de la mise à jour du rendez-vous" },
          { status: 500 },
        )
      }

      return jsonResponse({
        success: true,
        message: "Rendez-vous mis à jour avec succès",
        data,
      })
    }

    // Route non trouvée
    return jsonResponse(
      { success: false, message: "Route non trouvée" },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-mentorat exception", err)
    return jsonResponse(
      {
        success: false,
        message: (err as Error).message || "Erreur serveur",
      },
      { status: 500 },
    )
  }
})


