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

const MEMBER_FIELDS = "id, prenom, nom, email, numero_membre, pays"

async function fetchMemberById(supabaseAdhesion: any, memberId: string): Promise<any> {
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
    const supabaseSecretariat = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "secretariat" },
    })
    const supabaseAdhesion = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "adhesion" },
    })

    const { pathname, searchParams } = parseUrl(req.url)
    const base = "/functions/v1/admin-secretariat"
    let relativePath = pathname

    if (pathname.startsWith(base)) {
      relativePath = pathname.substring(base.length)
    } else if (pathname.startsWith("/admin-secretariat")) {
      relativePath = pathname.substring("/admin-secretariat".length)
    }
    relativePath = relativePath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || ""

    console.log("Request URL:", req.url)
    console.log("Relative path:", relativePath)

    // GET /stats
    if (req.method === "GET" && relativePath === "stats") {
      const today = new Date().toISOString().split("T")[0]
      
      const [
        { count: totalReunions },
        { count: reunionsAVenir },
        { count: totalParticipants },
        { count: totalActions },
        { count: actionsEnCours },
        { count: totalDocuments },
        { data: reunionsByType },
      ] = await Promise.all([
        supabaseSecretariat.from("reunions").select("*", { count: "exact", head: true }),
        supabaseSecretariat.from("reunions").select("*", { count: "exact", head: true }).gte("date_reunion", today),
        supabaseSecretariat.from("participants_reunion").select("*", { count: "exact", head: true }),
        supabaseSecretariat.from("actions").select("*", { count: "exact", head: true }),
        supabaseSecretariat.from("actions").select("*", { count: "exact", head: true }).eq("statut", "en cours"),
        supabaseSecretariat.from("documents").select("*", { count: "exact", head: true }),
        supabaseSecretariat.from("reunions").select("type_reunion"),
      ])

      const repartitionParType: Record<string, number> = {}
      ;(reunionsByType || []).forEach((r: any) => {
        repartitionParType[r.type_reunion] = (repartitionParType[r.type_reunion] || 0) + 1
      })

      return jsonResponse({
        success: true,
        data: {
          total_reunions: totalReunions || 0,
          reunions_a_venir: reunionsAVenir || 0,
          total_participants: totalParticipants || 0,
          total_actions: totalActions || 0,
          actions_en_cours: actionsEnCours || 0,
          total_documents: totalDocuments || 0,
          repartition_par_type: repartitionParType,
        },
      })
    }

    // GET /members/by-email
    if (req.method === "GET" && relativePath === "members/by-email") {
      const email = searchParams.get("email")
      if (!email) {
        return jsonResponse({ success: false, message: "Email requis" }, { status: 400 })
      }

      const { data, error } = await supabaseAdhesion
        .from("members")
        .select(MEMBER_FIELDS)
        .eq("email", email.toLowerCase().trim())
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        console.error("findMemberByEmail error", error)
        return jsonResponse({ success: false, message: "Erreur lors de la recherche" }, { status: 500 })
      }

      return jsonResponse({ success: true, data: data || null })
    }

    // ========== RÉUNIONS ==========

    // GET /reunions - Liste avec pagination
    if (req.method === "GET" && relativePath === "reunions") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""
      const type_reunion = searchParams.get("type_reunion") || ""
      const pole = searchParams.get("pole") || ""

      let query = supabaseSecretariat
        .from("reunions")
        .select("*", { count: "exact" })
        .order("date_reunion", { ascending: false })

      if (type_reunion) {
        query = query.eq("type_reunion", type_reunion)
      }
      if (pole) {
        query = query.eq("pole", pole)
      }
      if (search) {
        query = query.or(`titre.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: reunions, error, count } = await query

      if (error) {
        console.error("getAllReunions error", error)
        throw new Error("Erreur lors de la récupération des réunions")
      }

      // Enrichir avec les informations du groupe de travail si présent
      const reunionsWithGroupe = await Promise.all(
        (reunions || []).map(async (reunion: any) => {
          if (reunion.groupe_travail_id) {
            const { data: groupe } = await supabaseSecretariat
              .from("groupes_travail")
              .select("id, nom, projet_id")
              .eq("id", reunion.groupe_travail_id)
              .maybeSingle()
            
            if (groupe) {
              // Récupérer les infos du projet
              const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
              const { data: projet } = await supabasePublic
                .from("projets")
                .select("id, projet_id, titre, icon, color")
                .eq("projet_id", groupe.projet_id)
                .maybeSingle()
              
              reunion.groupe_travail = {
                ...groupe,
                projet: projet
              }
            }
          }
          return reunion
        })
      )

      return jsonResponse({
        success: true,
        data: reunionsWithGroupe || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /reunions - Créer une réunion
    if (req.method === "POST" && relativePath === "reunions") {
      const body = await req.json().catch(() => ({}))
      const insertData: any = {
        type_reunion: body.type_reunion,
        titre: body.titre,
        description: body.description || null,
        date_reunion: body.date_reunion,
        heure_debut: body.heure_debut,
        heure_fin: body.heure_fin || null,
        pole: body.pole || null,
        lien_visio: body.lien_visio || null,
        ordre_du_jour: body.ordre_du_jour || null,
        groupe_travail_id: body.groupe_travail_id || null, // Lier à un groupe de travail (optionnel)
      }

      if (body.presente_par) {
        insertData.presente_par = body.presente_par
      }

      const { data, error } = await supabaseSecretariat
        .from("reunions")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("createReunion error", error)
        throw new Error("Erreur lors de la création de la réunion")
      }

      // Si la réunion est liée à un groupe de travail, ajouter automatiquement les membres du groupe comme participants
      if (data.groupe_travail_id) {
        console.log("Réunion créée avec groupe_travail_id:", data.groupe_travail_id)
        
        // Récupérer les membres du groupe
        const { data: groupeMembres, error: membresError } = await supabaseSecretariat
          .from("groupe_travail_membres")
          .select("membre_id")
          .eq("groupe_travail_id", data.groupe_travail_id)

        if (!membresError && groupeMembres && groupeMembres.length > 0) {
          // Ajouter chaque membre comme participant
          const participantsData = groupeMembres
            .filter((m: any) => m.membre_id) // Filtrer seulement les membres avec membre_id
            .map((m: any) => ({
              reunion_id: data.id,
              membre_id: m.membre_id,
              statut_invitation: "envoye",
            }))

          if (participantsData.length > 0) {
            const { error: participantsError } = await supabaseSecretariat
              .from("participants_reunion")
              .insert(participantsData)

            if (participantsError) {
              console.error("Erreur lors de l'ajout automatique des participants:", participantsError)
              // Ne pas échouer la création de la réunion, juste logger l'erreur
            } else {
              console.log(`${participantsData.length} participant(s) ajouté(s) automatiquement`)
            }
          }
        }
      }

      return jsonResponse({
        success: true,
        message: "Réunion créée avec succès",
        data,
      })
    }

    // Routes avec ID de réunion
    const reunionIdMatch = relativePath.match(/^reunions\/([0-9a-fA-F-]+)(?:\/(.*))?$/)
    if (reunionIdMatch) {
      const reunionId = reunionIdMatch[1]
      const subPath = reunionIdMatch[2] || ""

      // GET /reunions/:id - Détails d'une réunion
      if (req.method === "GET" && subPath === "") {
        const { data, error } = await supabaseSecretariat
          .from("reunions")
          .select("*")
          .eq("id", reunionId)
          .maybeSingle()

        if (error) {
          console.error("getReunionById error", error)
          throw new Error("Erreur lors de la récupération de la réunion")
        }

        if (!data) {
          return jsonResponse({ success: false, message: "Réunion introuvable" }, { status: 404 })
        }

        // Enrichir avec le présentateur si disponible
        if (data.presente_par) {
          const presentateur = await fetchMemberById(supabaseAdhesion, data.presente_par)
          data.presentateur = presentateur
        }

        return jsonResponse({ success: true, data })
      }

      // PUT /reunions/:id - Mettre à jour une réunion
      if (req.method === "PUT" && subPath === "") {
        const body = await req.json().catch(() => ({}))
        const { data, error } = await supabaseSecretariat
          .from("reunions")
          .update(body)
          .eq("id", reunionId)
          .select()
          .single()

        if (error) {
          console.error("updateReunion error", error)
          throw new Error("Erreur lors de la mise à jour de la réunion")
        }

        return jsonResponse({
          success: true,
          message: "Réunion mise à jour avec succès",
          data,
        })
      }

      // GET /reunions/:id/participants - Participants d'une réunion
      if (req.method === "GET" && subPath === "participants") {
        const { data: participants, error } = await supabaseSecretariat
          .from("participants_reunion")
          .select("*")
          .eq("reunion_id", reunionId)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("getParticipantsByReunion error", error)
          throw new Error("Erreur lors de la récupération des participants")
        }

        // Enrichir avec les données des membres
        const participantsWithMembers = await Promise.all(
          (participants || []).map(async (participant: any) => {
            let membre = null
            if (participant.membre_id) {
              membre = await fetchMemberById(supabaseAdhesion, participant.membre_id)
            }
            return {
              ...participant,
              membre,
              nom_display: membre
                ? `${membre.prenom} ${membre.nom}`
                : participant.prenom_externe && participant.nom_externe
                ? `${participant.prenom_externe} ${participant.nom_externe}`
                : participant.nom_externe || "Participant externe",
            }
          }),
        )

        return jsonResponse({ success: true, data: participantsWithMembers })
      }

      // GET /reunions/:id/compte-rendu - Compte rendu d'une réunion
      if (req.method === "GET" && subPath === "compte-rendu") {
        const { data, error } = await supabaseSecretariat
          .from("comptes_rendus")
          .select("*")
          .eq("reunion_id", reunionId)
          .maybeSingle()

        if (error) {
          console.error("getCompteRenduByReunion error", error)
          throw new Error("Erreur lors de la récupération du compte rendu")
        }

        return jsonResponse({ success: true, data: data || null })
      }

      // GET /reunions/:id/actions - Actions d'une réunion
      if (req.method === "GET" && subPath === "actions") {
        const { data: actions, error } = await supabaseSecretariat
          .from("actions")
          .select("*")
          .eq("reunion_id", reunionId)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("getActionsByReunion error", error)
          throw new Error("Erreur lors de la récupération des actions")
        }

        // Enrichir avec les assignés multiples et leurs données
        const actionsWithAssignees = await Promise.all(
          (actions || []).map(async (action: any) => {
            const { data: assigneesData } = await supabaseSecretariat
              .from("action_assignees")
              .select("member_id")
              .eq("action_id", action.id)

            const assigneeIds = assigneesData?.map((a: any) => a.member_id) || []
            
            // Si pas d'assignés multiples mais assigne_a existe, l'ajouter
            if (assigneeIds.length === 0 && action.assigne_a) {
              assigneeIds.push(action.assigne_a)
            }

            // Enrichir avec les données des membres assignés
            const assigneesMembers = await Promise.all(
              assigneeIds.map(async (memberId: string) => {
                const member = await fetchMemberById(supabaseAdhesion, memberId)
                return member ? { id: memberId, ...member } : null
              })
            )

            action.assignees = assigneeIds
            action.assignees_members = assigneesMembers.filter(m => m !== null)

            // Garder membre pour rétrocompatibilité (premier assigné)
            if (action.assignees_members.length > 0) {
              action.membre = action.assignees_members[0]
            } else if (action.assigne_a) {
              action.membre = await fetchMemberById(supabaseAdhesion, action.assigne_a)
            }

            return action
          })
        )

        return jsonResponse({ success: true, data: actionsWithAssignees })
      }

      // GET /reunions/:id/generate-pdf - Générer PDF
      if (req.method === "GET" && subPath === "generate-pdf") {
        try {
          // Récupérer la réunion
          const { data: reunion, error: reunionError } = await supabaseSecretariat
            .from("reunions")
            .select("*")
            .eq("id", reunionId)
            .maybeSingle()

          if (reunionError || !reunion) {
            return jsonResponse({ success: false, message: "Réunion introuvable" }, { status: 404 })
          }

          // Récupérer le présentateur si disponible
          let presentateur = null
          if (reunion.presente_par) {
            presentateur = await fetchMemberById(supabaseAdhesion, reunion.presente_par)
            reunion.presentateur = presentateur
          }

          // Récupérer les participants
          const { data: participants, error: participantsError } = await supabaseSecretariat
            .from("participants_reunion")
            .select("*")
            .eq("reunion_id", reunionId)
            .order("created_at", { ascending: false })

          if (participantsError) {
            console.error("getParticipantsByReunion error", participantsError)
          }

          // Enrichir participants avec les membres
          const participantsWithMembers = await Promise.all(
            (participants || []).map(async (p: any) => {
              let membre = null
              if (p.membre_id) {
                membre = await fetchMemberById(supabaseAdhesion, p.membre_id)
              }
              return {
                ...p,
                membre,
                nom_display: membre
                  ? `${membre.prenom} ${membre.nom}`
                  : p.prenom_externe && p.nom_externe
                  ? `${p.prenom_externe} ${p.nom_externe}`
                  : p.nom_externe || "Participant externe",
              }
            }),
          )

          // Récupérer le compte-rendu
          const { data: compteRendu, error: crError } = await supabaseSecretariat
            .from("comptes_rendus")
            .select("*")
            .eq("reunion_id", reunionId)
            .maybeSingle()

          if (crError) {
            console.error("getCompteRenduByReunion error", crError)
          }

          // Récupérer les actions
          const { data: actions, error: actionsError } = await supabaseSecretariat
            .from("actions")
            .select("*")
            .eq("reunion_id", reunionId)
            .order("created_at", { ascending: false })

          if (actionsError) {
            console.error("getActionsByReunion error", actionsError)
          }

          // Générer le PDF avec pdf-lib
          const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

          const pdfDoc = await PDFDocument.create()
          let currentPage = pdfDoc.addPage([595, 842]) // A4
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
          const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

          let y = 800
          const pageWidth = currentPage.getWidth()
          const margin = 50
          const lineHeight = 15

          // Couleurs
          const primaryColor = rgb(0.051, 0.278, 0.631)
          const textColor = rgb(0.1, 0.1, 0.1)
          const grayColor = rgb(0.5, 0.5, 0.5)

          // Fonction helper pour formater une date
          const formatDate = (dateStr: string | null) => {
            if (!dateStr) return "—"
            const date = new Date(dateStr)
            return date.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          }

          // Fonction helper pour gérer les nouvelles pages
          const ensureSpace = (neededHeight: number) => {
            if (y < neededHeight) {
              currentPage = pdfDoc.addPage([595, 842])
              y = 800
            }
          }

          // Titre
          currentPage.drawText("COMPTE-RENDU DE RÉUNION", {
            x: margin,
            y,
            size: 20,
            font: fontBold,
            color: primaryColor,
          })
          y -= 30

          currentPage.drawText(reunion.titre || "Réunion", {
            x: margin,
            y,
            size: 16,
            font: fontBold,
            color: textColor,
          })
          y -= 40

          // Ligne de séparation
          currentPage.drawLine({
            start: { x: margin, y },
            end: { x: pageWidth - margin, y },
            thickness: 2,
            color: primaryColor,
          })
          y -= 30

          // Informations de la réunion
          currentPage.drawText("Informations de la réunion", {
            x: margin,
            y,
            size: 14,
            font: fontBold,
            color: primaryColor,
          })
          y -= 25

          currentPage.drawText(`Type: ${reunion.type_reunion || "—"}`, {
            x: margin,
            y,
            size: 11,
            font: font,
            color: textColor,
          })
          y -= lineHeight

          currentPage.drawText(`Date: ${formatDate(reunion.date_reunion)}`, {
            x: margin,
            y,
            size: 11,
            font: font,
            color: textColor,
          })
          y -= lineHeight

          if (reunion.heure_debut) {
            currentPage.drawText(
              `Heure: ${reunion.heure_debut}${reunion.heure_fin ? ` - ${reunion.heure_fin}` : ""}`,
              {
                x: margin,
                y,
                size: 11,
                font: font,
                color: textColor,
              },
            )
            y -= lineHeight
          }

          if (reunion.pole) {
            currentPage.drawText(`Pôle: ${reunion.pole}`, {
              x: margin,
              y,
              size: 11,
              font: font,
              color: textColor,
            })
            y -= lineHeight
          }

          if (presentateur) {
            currentPage.drawText(`Présenté par: ${presentateur.prenom} ${presentateur.nom}`, {
              x: margin,
              y,
              size: 11,
              font: font,
              color: textColor,
            })
            y -= lineHeight
          }

          y -= 20

          // Ordre du jour
          if (reunion.ordre_du_jour) {
            currentPage.drawText("Ordre du jour", {
              x: margin,
              y,
              size: 14,
              font: fontBold,
              color: primaryColor,
            })
            y -= 25

            const ordreLines = reunion.ordre_du_jour.split("\n")
            for (const line of ordreLines) {
              if (y < 100) {
                currentPage = pdfDoc.addPage([595, 842])
                y = 800
              }
              currentPage.drawText(line.trim() || " ", {
                x: margin + 10,
                y,
                size: 10,
                font: font,
                color: textColor,
                maxWidth: pageWidth - 2 * margin - 20,
              })
              y -= lineHeight
            }
            y -= 20
          }

          // Participants
          if (participantsWithMembers && participantsWithMembers.length > 0) {
            if (y < 150) {
              currentPage = pdfDoc.addPage([595, 842])
              y = 800
            }

            currentPage.drawText("Participants", {
              x: margin,
              y,
              size: 14,
              font: fontBold,
              color: primaryColor,
            })
            y -= 25

            const presents = participantsWithMembers.filter((p: any) => p.presence === "present")
            const absents = participantsWithMembers.filter((p: any) => p.presence === "absent")
            const nonDefinis = participantsWithMembers.filter((p: any) => !p.presence)

            if (presents.length > 0) {
              currentPage.drawText("Présents:", {
                x: margin + 10,
                y,
                size: 11,
                font: fontBold,
                color: rgb(0.18, 0.49, 0.196),
              })
              y -= lineHeight

              for (const p of presents) {
                if (y < 100) {
                  currentPage = pdfDoc.addPage([595, 842])
                  y = 800
                }
                currentPage.drawText(`• ${p.nom_display}`, {
                  x: margin + 20,
                  y,
                  size: 10,
                  font: font,
                  color: textColor,
                })
                y -= lineHeight
              }
              y -= 5
            }

            if (absents.length > 0) {
              if (y < 100) {
                currentPage = pdfDoc.addPage([595, 842])
                y = 800
              }
              currentPage.drawText("Absents:", {
                x: margin + 10,
                y,
                size: 11,
                font: fontBold,
                color: rgb(0.776, 0.157, 0.157),
              })
              y -= lineHeight

              for (const p of absents) {
                if (y < 100) {
                  currentPage = pdfDoc.addPage([595, 842])
                  y = 800
                }
                const motif = p.motif_absence ? ` (${p.motif_absence})` : ""
                currentPage.drawText(`• ${p.nom_display}${motif}`, {
                  x: margin + 20,
                  y,
                  size: 10,
                  font: font,
                  color: textColor,
                })
                y -= lineHeight
              }
              y -= 5
            }

            if (nonDefinis.length > 0) {
              if (y < 100) {
                currentPage = pdfDoc.addPage([595, 842])
                y = 800
              }
              currentPage.drawText("Non définis:", {
                x: margin + 10,
                y,
                size: 11,
                font: fontBold,
                color: grayColor,
              })
              y -= lineHeight

              for (const p of nonDefinis) {
                if (y < 100) {
                  currentPage = pdfDoc.addPage([595, 842])
                  y = 800
                }
                currentPage.drawText(`• ${p.nom_display}`, {
                  x: margin + 20,
                  y,
                  size: 10,
                  font: font,
                  color: textColor,
                })
                y -= lineHeight
              }
            }
            y -= 20
          }

          // Compte-rendu
          if (compteRendu) {
            // Résumé (utiliser resume en priorité, sinon contenu pour rétrocompatibilité)
            const resume = compteRendu.resume || compteRendu.contenu
            if (resume) {
              if (y < 150) {
                currentPage = pdfDoc.addPage([595, 842])
                y = 800
              }

              currentPage.drawText("Résumé", {
                x: margin,
                y,
                size: 14,
                font: fontBold,
                color: primaryColor,
              })
              y -= 25

              const resumeLines = resume.split("\n")
              for (const line of resumeLines) {
                if (y < 100) {
                  currentPage = pdfDoc.addPage([595, 842])
                  y = 800
                }
                currentPage.drawText(line.trim() || " ", {
                  x: margin + 10,
                  y,
                  size: 10,
                  font: font,
                  color: textColor,
                  maxWidth: pageWidth - 2 * margin - 20,
                })
                y -= lineHeight
              }
              y -= 20
            }

            // Décisions
            if (compteRendu.decisions) {
              if (y < 150) {
                currentPage = pdfDoc.addPage([595, 842])
                y = 800
              }
              currentPage.drawText("Décisions", {
                x: margin,
                y,
                size: 14,
                font: fontBold,
                color: rgb(0.22, 0.557, 0.235),
              })
              y -= 25

              const decisionsLines = compteRendu.decisions.split("\n")
              for (const line of decisionsLines) {
                if (y < 100) {
                  currentPage = pdfDoc.addPage([595, 842])
                  y = 800
                }
                currentPage.drawText(line.trim() || " ", {
                  x: margin + 10,
                  y,
                  size: 10,
                  font: font,
                  color: textColor,
                  maxWidth: pageWidth - 2 * margin - 20,
                })
                y -= lineHeight
              }
              y -= 20
            }

            // Actions assignées (texte du compte rendu)
            const actionsAssignees = compteRendu.actions_assignées || compteRendu.actions_assignees
            if (actionsAssignees) {
              if (y < 150) {
                currentPage = pdfDoc.addPage([595, 842])
                y = 800
              }
              currentPage.drawText("Actions assignées", {
                x: margin,
                y,
                size: 14,
                font: fontBold,
                color: primaryColor,
              })
              y -= 25

              const actionsLines = actionsAssignees.split("\n")
              for (const line of actionsLines) {
                if (y < 100) {
                  currentPage = pdfDoc.addPage([595, 842])
                  y = 800
                }
                currentPage.drawText(line.trim() || " ", {
                  x: margin + 10,
                  y,
                  size: 10,
                  font: font,
                  color: textColor,
                  maxWidth: pageWidth - 2 * margin - 20,
                })
                y -= lineHeight
              }
              y -= 20
            }
          }

          // Actions
          if (actions && actions.length > 0) {
            if (y < 150) {
              currentPage = pdfDoc.addPage([595, 842])
              y = 800
            }

            currentPage.drawText("Actions assignées", {
              x: margin,
              y,
              size: 14,
              font: fontBold,
              color: primaryColor,
            })
            y -= 25

            for (const [index, action] of actions.entries()) {
              if (y < 100) {
                currentPage = pdfDoc.addPage([595, 842])
                y = 800
              }

              // Utiliser intitule en priorité, sinon titre (rétrocompatibilité)
              const actionTitre = action.intitule || action.titre || "Action"
              currentPage.drawText(`${index + 1}. ${actionTitre}`, {
                x: margin + 10,
                y,
                size: 11,
                font: fontBold,
                color: textColor,
              })
              y -= lineHeight

              if (action.description) {
                const descLines = action.description.split("\n")
                for (const line of descLines) {
                  if (y < 100) {
                    currentPage = pdfDoc.addPage([595, 842])
                    y = 800
                  }
                  currentPage.drawText(line.trim() || " ", {
                    x: margin + 20,
                    y,
                    size: 10,
                    font: font,
                    color: textColor,
                    maxWidth: pageWidth - 2 * margin - 30,
                  })
                  y -= lineHeight
                }
              }

              if (action.assigne_a) {
                const assigne = await fetchMemberById(supabaseAdhesion, action.assigne_a)
                const assigneNom = assigne ? `${assigne.prenom} ${assigne.nom}` : "Non assigné"
                currentPage.drawText(`Assigné à: ${assigneNom}`, {
                  x: margin + 20,
                  y,
                  size: 9,
                  font: font,
                  color: grayColor,
                })
                y -= lineHeight - 2
              }

              if (action.statut) {
                currentPage.drawText(`Statut: ${action.statut}`, {
                  x: margin + 20,
                  y,
                  size: 9,
                  font: font,
                  color: grayColor,
                })
                y -= lineHeight - 2
              }

              // Utiliser deadline en priorité, sinon echeance (rétrocompatibilité)
              const deadline = action.deadline || action.echeance
              if (deadline) {
                currentPage.drawText(`Échéance: ${formatDate(deadline)}`, {
                  x: margin + 20,
                  y,
                  size: 9,
                  font: font,
                  color: grayColor,
                })
                y -= lineHeight - 2
              }

              y -= 10
            }
          }

          // Pied de page
          const pages = pdfDoc.getPages()
          const totalPages = pages.length
          pages.forEach((p, index) => {
            p.drawText(
              `Page ${index + 1} sur ${totalPages} - ASGF - Généré le ${new Date().toLocaleDateString("fr-FR")}`,
              {
                x: margin,
                y: 30,
                size: 8,
                font: font,
                color: grayColor,
              },
            )
          })

          const pdfBytes = await pdfDoc.save()

          const fileName = `reunion-${reunionId}.pdf`

          const headers = new Headers(CORS_HEADERS)
          headers.set("Content-Type", "application/pdf")
          headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

          return new Response(pdfBytes, { headers })
        } catch (pdfError) {
          console.error("Erreur génération PDF réunion", pdfError)
          return jsonResponse(
            {
              success: false,
              message: `Erreur lors de la génération du PDF: ${(pdfError as Error).message}`,
            },
            { status: 500 },
          )
        }
      }

      // PUT /reunions/:id/presence - Mettre à jour la présence
      if (req.method === "PUT" && subPath === "presence") {
        const body = await req.json().catch(() => ({}))
        const { participants } = body

        if (!Array.isArray(participants)) {
          return jsonResponse(
            { success: false, message: "Le champ participants doit être un tableau" },
            { status: 400 },
          )
        }

        // Mettre à jour chaque participant
        const updated = await Promise.all(
          participants.map(async (p: any) => {
            const { data, error } = await supabaseSecretariat
              .from("participants_reunion")
              .update({
                presence: p.presence,
                motif_absence: p.motif_absence || null,
              })
              .eq("id", p.id)
              .eq("reunion_id", reunionId)
              .select()
              .single()

            if (error) {
              console.error(`Error updating participant ${p.id}:`, error)
              return null
            }
            return data
          }),
        )

        return jsonResponse({
          success: true,
          message: "Présence mise à jour avec succès",
          data: updated.filter(Boolean),
        })
      }
    }

    // ========== PARTICIPANTS ==========

    // POST /participants - Ajouter un ou plusieurs participants
    if (req.method === "POST" && relativePath === "participants") {
      const body = await req.json().catch(() => [])

      // Si c'est un tableau, ajouter plusieurs participants
      if (Array.isArray(body)) {
        const reunionId = body[0]?.reunion_id
        if (!reunionId) {
          return jsonResponse({ success: false, message: "reunion_id est requis" }, { status: 400 })
        }

        // Vérifier les participants existants pour éviter les doublons
        const { data: existing } = await supabaseSecretariat
          .from("participants_reunion")
          .select("membre_id")
          .eq("reunion_id", reunionId)

        const existingMemberIds = new Set((existing || []).map((p: any) => p.membre_id).filter(Boolean))

        const toInsert = body.filter((p: any) => {
          if (!p.membre_id) return true // Les externes peuvent être ajoutés
          return !existingMemberIds.has(p.membre_id)
        })

        if (toInsert.length === 0) {
          return jsonResponse({
            success: true,
            message: "Tous les participants existent déjà",
            data: [],
          })
        }

        const insertData = toInsert.map((p: any) => ({
          reunion_id: p.reunion_id,
          membre_id: p.membre_id || null,
          nom_externe: p.nom_externe || null,
          prenom_externe: p.prenom_externe || null,
          email_externe: p.email_externe || null,
          statut_invitation: p.statut_invitation || "envoye",
          commentaire: p.commentaire || null,
          presence: p.presence || null,
          motif_absence: p.motif_absence || null,
        }))

        const { data, error } = await supabaseSecretariat
          .from("participants_reunion")
          .insert(insertData)
          .select()

        if (error) {
          console.error("addMultipleParticipants error", error)
          throw new Error("Erreur lors de l'ajout des participants")
        }

        return jsonResponse({
          success: true,
          message: `${data?.length || 0} participant(s) ajouté(s) avec succès`,
          data: data || [],
        })
      } else {
        // Ajouter un seul participant
        const insertData: any = {
          reunion_id: body.reunion_id,
          membre_id: body.membre_id || null,
          statut_invitation: body.statut_invitation || "envoye",
          commentaire: body.commentaire || null,
        }

        if (body.nom_externe) insertData.nom_externe = body.nom_externe
        if (body.prenom_externe) insertData.prenom_externe = body.prenom_externe
        if (body.email_externe) insertData.email_externe = body.email_externe
        if (body.presence) insertData.presence = body.presence
        if (body.motif_absence) insertData.motif_absence = body.motif_absence

        const { data, error } = await supabaseSecretariat
          .from("participants_reunion")
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error("addParticipant error", error)
          throw new Error("Erreur lors de l'ajout du participant")
        }

        return jsonResponse({
          success: true,
          message: "Participant ajouté avec succès",
          data,
        })
      }
    }

    // PUT /participants/:id - Mettre à jour un participant
    const participantIdMatch = relativePath.match(/^participants\/([0-9a-fA-F-]+)$/)
    if (req.method === "PUT" && participantIdMatch) {
      const participantId = participantIdMatch[1]
      const body = await req.json().catch(() => ({}))

      const { data, error } = await supabaseSecretariat
        .from("participants_reunion")
        .update(body)
        .eq("id", participantId)
        .select()
        .single()

      if (error) {
        console.error("updateParticipant error", error)
        throw new Error("Erreur lors de la mise à jour du participant")
      }

      return jsonResponse({
        success: true,
        message: "Participant mis à jour avec succès",
        data,
      })
    }

    // ========== COMPTES RENDUS ==========

    // POST /comptes-rendus - Créer ou mettre à jour un compte rendu
    if (req.method === "POST" && relativePath === "comptes-rendus") {
      const body = await req.json().catch(() => ({}))
      const reunionId = body.reunion_id

      if (!reunionId) {
        return jsonResponse(
          { success: false, message: "reunion_id est requis", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Vérifier si un compte rendu existe déjà
      const { data: existing } = await supabaseSecretariat
        .from("comptes_rendus")
        .select("id")
        .eq("reunion_id", reunionId)
        .maybeSingle()

      // Mapping des champs : support à la fois les anciens noms (contenu, points_abordes) 
      // et les nouveaux (resume, actions_assignées)
      const resume = body.resume || body.contenu || null
      const decisions = body.decisions || null
      const actions_assignées = body.actions_assignées || body.actions_assignees || body.points_abordes || null
      const participants_list = body.participants_list || null

      let data
      if (existing) {
        // Mettre à jour
        const { data: updated, error } = await supabaseSecretariat
          .from("comptes_rendus")
          .update({
            resume: resume,
            decisions: decisions,
            actions_assignées: actions_assignées,
            participants_list: participants_list,
          })
          .eq("id", existing.id)
          .select()
          .single()

        if (error) {
          console.error("updateCompteRendu error", error)
          return jsonResponse(
            { 
              success: false, 
              message: "Erreur lors de la mise à jour du compte rendu",
              error_code: "DATABASE_ERROR",
              details: error.message 
            },
            { status: 500 }
          )
        }
        data = updated
      } else {
        // Créer
        const { data: created, error } = await supabaseSecretariat
          .from("comptes_rendus")
          .insert({
            reunion_id: reunionId,
            resume: resume,
            decisions: decisions,
            actions_assignées: actions_assignées,
            participants_list: participants_list,
          })
          .select()
          .single()

        if (error) {
          console.error("createCompteRendu error", error)
          return jsonResponse(
            { 
              success: false, 
              message: "Erreur lors de la création du compte rendu",
              error_code: "DATABASE_ERROR",
              details: error.message 
            },
            { status: 500 }
          )
        }
        data = created
      }

      return jsonResponse({
        success: true,
        message: "Compte rendu sauvegardé avec succès",
        data,
      })
    }

    // POST /comptes-rendus/reunions/:id/pdf - Générer PDF (utilise la même logique que GET)
    const compteRenduPdfMatch = relativePath.match(/^comptes-rendus\/reunions\/([0-9a-fA-F-]+)\/pdf$/)
    if (req.method === "POST" && compteRenduPdfMatch) {
      // Utiliser la même logique que GET /reunions/:id/generate-pdf
      const reunionId = compteRenduPdfMatch[1]
      relativePath = `reunions/${reunionId}/generate-pdf`
      // Continuer le traitement comme une requête GET
      req = new Request(req.url.replace("/comptes-rendus/reunions/", "/reunions/").replace("/pdf", "/generate-pdf"), {
        method: "GET",
        headers: req.headers,
      })
    }

    // ========== ACTIONS ==========

    // GET /actions - Toutes les actions avec filtres
    if (req.method === "GET" && relativePath === "actions") {
      const assigne_a = searchParams.get("assigne_a")
      const statut = searchParams.get("statut")
      const limit = parseInt(searchParams.get("limit") || "50", 10)

      let query = supabaseSecretariat.from("actions").select("*").order("created_at", { ascending: false })

      if (assigne_a) {
        // Filtrer par assigné (via action_assignees ou assigne_a pour rétrocompatibilité)
        // On va filtrer après enrichissement pour supporter les deux cas
      }
      if (statut) {
        query = query.eq("statut", statut)
      }

      query = query.limit(limit)

      const { data: actions, error } = await query

      if (error) {
        console.error("getAllActions error", error)
        throw new Error("Erreur lors de la récupération des actions")
      }

        // Enrichir avec les assignés multiples, leurs données, et les infos du groupe de travail
        const actionsWithAssignees = await Promise.all(
          (actions || []).map(async (action: any) => {
            // Récupérer les assignés depuis action_assignees
            const { data: assigneesData } = await supabaseSecretariat
              .from("action_assignees")
              .select("member_id")
              .eq("action_id", action.id)

            const assigneeIds = assigneesData?.map((a: any) => a.member_id) || []
            
            // Si pas d'assignés multiples mais assigne_a existe, l'ajouter
            if (assigneeIds.length === 0 && action.assigne_a) {
              assigneeIds.push(action.assigne_a)
            }

            // Enrichir avec les données des membres assignés
            const assigneesMembers = await Promise.all(
              assigneeIds.map(async (memberId: string) => {
                const member = await fetchMemberById(supabaseAdhesion, memberId)
                return member ? { id: memberId, ...member } : null
              })
            )

            action.assignees = assigneeIds
            action.assignees_members = assigneesMembers.filter(m => m !== null)

            // Garder membre pour rétrocompatibilité (premier assigné)
            if (action.assignees_members.length > 0) {
              action.membre = action.assignees_members[0]
            } else if (action.assigne_a) {
              action.membre = await fetchMemberById(supabaseAdhesion, action.assigne_a)
            }

            // Enrichir avec les informations du groupe de travail si présent
            if (action.groupe_travail_id) {
              const { data: groupe } = await supabaseSecretariat
                .from("groupes_travail")
                .select("id, nom, projet_id")
                .eq("id", action.groupe_travail_id)
                .maybeSingle()
              
              if (groupe) {
                // Récupérer les infos du projet
                const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
                const { data: projet } = await supabasePublic
                  .from("projets")
                  .select("id, projet_id, titre, icon, color")
                  .eq("projet_id", groupe.projet_id)
                  .maybeSingle()
                
                action.groupe_travail = {
                  ...groupe,
                  projet: projet
                }
              }
            }

            return action
          })
        )

      // Filtrer par assigne_a si demandé (après enrichissement)
      let filteredActions = actionsWithAssignees
      if (assigne_a) {
        filteredActions = actionsWithAssignees.filter((action: any) => 
          action.assignees.includes(assigne_a) || action.assigne_a === assigne_a
        )
      }

      return jsonResponse({ success: true, data: filteredActions })
    }

    // POST /actions - Créer une action
    if (req.method === "POST" && relativePath === "actions") {
      const body = await req.json().catch(() => ({}))
      
      console.log("createAction - Payload reçu:", JSON.stringify(body))
      
      // Validation du payload
      if (!body.intitule && !body.titre) {
        return jsonResponse(
          { success: false, message: "Le champ 'intitule' ou 'titre' est requis", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Utiliser intitule en priorité, sinon titre (rétrocompatibilité)
      const intitule = body.intitule || body.titre
      
      // Utiliser deadline en priorité, sinon echeance (rétrocompatibilité)
      const deadline = body.deadline || body.echeance || null

      // Support multi-assignation : assignees peut être un array de member_id
      // Rétrocompatibilité : assigne_a (single) est toujours supporté
      let assignees = body.assignees || (body.assigne_a ? [body.assigne_a] : [])

      // Si l'action est liée à un groupe de travail et qu'aucun assigné n'est spécifié, 
      // assigner automatiquement tous les membres du groupe
      if (body.groupe_travail_id && (!assignees || assignees.length === 0)) {
        console.log("Action créée avec groupe_travail_id, récupération automatique des membres:", body.groupe_travail_id)
        
        const { data: groupeMembres, error: membresError } = await supabaseSecretariat
          .from("groupe_travail_membres")
          .select("membre_id")
          .eq("groupe_travail_id", body.groupe_travail_id)

        if (!membresError && groupeMembres && groupeMembres.length > 0) {
          // Récupérer uniquement les membre_id qui ne sont pas null
          const membreIds = groupeMembres
            .filter((m: any) => m.membre_id)
            .map((m: any) => m.membre_id)
          
          if (membreIds.length > 0) {
            assignees = membreIds
            console.log(`${membreIds.length} membre(s) assigné(s) automatiquement au groupe de travail`)
          }
        }
      }

      // Essayer d'abord avec intitule, puis avec titre si intitule échoue
      // Note: description et priorite n'existent pas dans le schéma DB
      let insertData: any = {
        reunion_id: body.reunion_id || null,
        groupe_travail_id: body.groupe_travail_id || null, // Lier à un groupe de travail (optionnel)
        intitule: intitule,
        assigne_a: assignees.length > 0 ? assignees[0] : null, // Garder pour rétrocompatibilité
        statut: body.statut || "en cours",
        deadline: deadline,
      }

      console.log("createAction - Données à insérer:", JSON.stringify(insertData))

      let { data: action, error } = await supabaseSecretariat
        .from("actions")
        .insert(insertData)
        .select()
        .single()

      // Si erreur avec intitule, essayer avec titre (rétrocompatibilité)
      if (error && error.message && error.message.includes("column") && error.message.includes("intitule")) {
        console.log("createAction - Erreur avec intitule, tentative avec titre")
        insertData = {
          ...insertData,
          titre: intitule,
        }
        delete insertData.intitule
        
        const retryResult = await supabaseSecretariat
          .from("actions")
          .insert(insertData)
          .select()
          .single()
        
        action = retryResult.data
        error = retryResult.error
      }

      if (error) {
        console.error("createAction error - Code:", error.code, "Message:", error.message, "Details:", JSON.stringify(error))
        // Retourner l'erreur détaillée pour le debugging
        return jsonResponse(
          { 
            success: false, 
            message: "Erreur lors de la création de l'action",
            error_code: "DATABASE_ERROR",
            details: error.message,
            hint: error.hint || null,
            code: error.code || null
          },
          { status: 500 }
        )
      }

      // Si multi-assignation, créer les entrées dans action_assignees
      if (Array.isArray(assignees) && assignees.length > 0) {
        const assigneesData = assignees
          .filter((memberId: string) => memberId) // Filtrer les valeurs nulles
          .map((memberId: string) => ({
            action_id: action.id,
            member_id: memberId,
          }))

        if (assigneesData.length > 0) {
          const { error: assigneesError } = await supabaseSecretariat
            .from("action_assignees")
            .insert(assigneesData)

          if (assigneesError) {
            console.error("createActionAssignees error", assigneesError)
            // Ne pas échouer la création de l'action, juste logger l'erreur
          }
        }
      }

      // Enrichir avec les assignés multiples
      if (action) {
        const { data: assigneesData } = await supabaseSecretariat
          .from("action_assignees")
          .select("member_id")
          .eq("action_id", action.id)

        action.assignees = assigneesData?.map((a: any) => a.member_id) || []
      }

      return jsonResponse({
        success: true,
        message: "Action créée avec succès",
        data: action,
      })
    }

    // PUT /actions/:id - Mettre à jour une action
    // DELETE /actions/:id - Supprimer une action
    const actionIdMatch = relativePath.match(/^actions\/([0-9a-fA-F-]+)$/)
    if (actionIdMatch) {
      const actionId = actionIdMatch[1]

      if (req.method === "PUT") {
        const body = await req.json().catch(() => ({}))

        // Extraire assignees du body si présent (pour multi-assignation)
        const assignees = body.assignees
        const updateData = { ...body }
        delete updateData.assignees // Ne pas mettre à jour directement assignees dans actions

        // Si intitule n'est pas fourni mais titre l'est, utiliser titre
        if (!updateData.intitule && updateData.titre) {
          updateData.intitule = updateData.titre
          delete updateData.titre
        }

        // Si deadline n'est pas fourni mais echeance l'est, utiliser echeance
        if (!updateData.deadline && updateData.echeance) {
          updateData.deadline = updateData.echeance
          delete updateData.echeance
        }

        // Mettre à jour assigne_a si assignees est fourni (rétrocompatibilité)
        if (Array.isArray(assignees) && assignees.length > 0) {
          updateData.assigne_a = assignees[0]
        } else if (body.assigne_a !== undefined) {
          updateData.assigne_a = body.assigne_a
        }

        const { data: action, error } = await supabaseSecretariat
          .from("actions")
          .update(updateData)
          .eq("id", actionId)
          .select()
          .single()

        if (error) {
          console.error("updateAction error", error)
          return jsonResponse(
            { 
              success: false, 
              message: "Erreur lors de la mise à jour de l'action",
              error_code: "DATABASE_ERROR",
              details: error.message 
            },
            { status: 500 }
          )
        }

        // Mettre à jour les assignés multiples si assignees est fourni
        if (Array.isArray(assignees)) {
          // Supprimer les assignés existants
          await supabaseSecretariat
            .from("action_assignees")
            .delete()
            .eq("action_id", actionId)

          // Ajouter les nouveaux assignés
          if (assignees.length > 0) {
            const assigneesData = assignees
              .filter((memberId: string) => memberId)
              .map((memberId: string) => ({
                action_id: actionId,
                member_id: memberId,
              }))

            if (assigneesData.length > 0) {
              const { error: assigneesError } = await supabaseSecretariat
                .from("action_assignees")
                .insert(assigneesData)

              if (assigneesError) {
                console.error("updateActionAssignees error", assigneesError)
              }
            }
          }
        }

        // Enrichir avec les assignés multiples
        if (action) {
          const { data: assigneesData } = await supabaseSecretariat
            .from("action_assignees")
            .select("member_id")
            .eq("action_id", action.id)

          action.assignees = assigneesData?.map((a: any) => a.member_id) || []
          
          // Si pas d'assignés multiples mais assigne_a existe, l'ajouter
          if (action.assignees.length === 0 && action.assigne_a) {
            action.assignees = [action.assigne_a]
          }
        }

        return jsonResponse({
          success: true,
          message: "Action mise à jour avec succès",
          data: action,
        })
      }

      if (req.method === "DELETE") {
        const { error } = await supabaseSecretariat.from("actions").delete().eq("id", actionId)

        if (error) {
          console.error("deleteAction error", error)
          throw new Error("Erreur lors de la suppression de l'action")
        }

        return jsonResponse({
          success: true,
          message: "Action supprimée avec succès",
        })
      }
    }

    // ========== DOCUMENTS ==========

    // GET /documents - Liste avec pagination
    if (req.method === "GET" && relativePath === "documents") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)
      const search = searchParams.get("search") || ""
      const categorie = searchParams.get("categorie") || ""

      let query = supabaseSecretariat
        .from("documents")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (search) {
        query = query.or(`titre.ilike.%${search}%,description.ilike.%${search}%`)
      }
      if (categorie) {
        query = query.eq("categorie", categorie)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: documents, error, count } = await query

      if (error) {
        console.error("getAllDocuments error", error)
        throw new Error("Erreur lors de la récupération des documents")
      }

      // Enrichir avec les informations de réunion/action si liées
      const documentsWithRelations = await Promise.all(
        (documents || []).map(async (doc: any) => {
          // Si lié à une réunion, récupérer les infos de la réunion
          if (doc.reunion_id) {
            const { data: reunion } = await supabaseSecretariat
              .from("reunions")
              .select("id, titre, date_reunion, groupe_travail_id")
              .eq("id", doc.reunion_id)
              .maybeSingle()
            
            if (reunion) {
              doc.reunion = {
                id: reunion.id,
                titre: reunion.titre,
                date_reunion: reunion.date_reunion
              }
              
              // Si la réunion a un groupe de travail, récupérer ses infos
              if (reunion.groupe_travail_id) {
                const { data: groupe } = await supabaseSecretariat
                  .from("groupes_travail")
                  .select("id, nom, projet_id")
                  .eq("id", reunion.groupe_travail_id)
                  .maybeSingle()
                
                if (groupe) {
                  const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
                  const { data: projet } = await supabasePublic
                    .from("projets")
                    .select("id, projet_id, titre, icon, color")
                    .eq("projet_id", groupe.projet_id)
                    .maybeSingle()
                  
                  doc.reunion.groupe_travail = {
                    ...groupe,
                    projet: projet
                  }
                }
              }
            }
          }
          
          // Si lié à une action (via réunion ou directement si on ajoute action_id plus tard)
          // Pour l'instant, on passe par la réunion
          return doc
        })
      )

      return jsonResponse({
        success: true,
        data: documentsWithRelations || [],
        data: documents || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // POST /documents - Créer un document
    if (req.method === "POST" && relativePath === "documents") {
      const body = await req.json().catch(() => ({}))

      console.log("createDocument - Payload reçu:", JSON.stringify(body))

      // Validation du payload
      if (!body.titre) {
        return jsonResponse(
          { success: false, message: "Le champ 'titre' est requis", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      if (!body.categorie) {
        return jsonResponse(
          { success: false, message: "Le champ 'categorie' est requis", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Utiliser lien_pdf en priorité, sinon lien_document (rétrocompatibilité)
      // IMPORTANT: lien_pdf est NOT NULL dans le schéma, donc on doit fournir une valeur
      const lien_pdf = body.lien_pdf || body.lien_document || ""
      
      if (!lien_pdf) {
        return jsonResponse(
          { success: false, message: "Le champ 'lien_pdf' est requis", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Valider uploaded_by si fourni (doit exister dans adhesion.members)
      let uploaded_by = null
      if (body.uploaded_by) {
        try {
          const { data: memberExists, error: memberError } = await supabaseAdhesion
            .from("members")
            .select("id")
            .eq("id", body.uploaded_by)
            .maybeSingle()
          
          if (memberError) {
            console.log("createDocument - Erreur lors de la vérification de uploaded_by:", memberError.message)
            // En cas d'erreur, on ignore uploaded_by pour éviter de bloquer la création
          } else if (memberExists && memberExists.id) {
            uploaded_by = body.uploaded_by
            console.log("createDocument - uploaded_by validé:", uploaded_by)
          } else {
            console.log("createDocument - uploaded_by ID non trouvé dans members, ignoré:", body.uploaded_by)
          }
        } catch (err) {
          console.log("createDocument - Exception lors de la validation de uploaded_by:", err)
          // En cas d'exception, on ignore uploaded_by
        }
      }

      // Construire les données à insérer
      const insertData: any = {
        titre: body.titre,
        categorie: body.categorie,
        description: body.description || null,
        lien_pdf: lien_pdf, // NOT NULL, donc toujours une valeur
        type_document: body.type_document || null,
        uploaded_by: uploaded_by,
      }

      // Ajouter reunion_id seulement si la colonne existe (vérification dynamique)
      // On essaie d'abord sans reunion_id, puis avec si nécessaire
      if (body.reunion_id !== undefined && body.reunion_id) {
        // Valider que la réunion existe
        const { data: reunionExists } = await supabaseSecretariat
          .from("reunions")
          .select("id")
          .eq("id", body.reunion_id)
          .maybeSingle()
        
        if (reunionExists) {
          insertData.reunion_id = body.reunion_id
        } else {
          console.log("createDocument - reunion_id non trouvé, ignoré:", body.reunion_id)
        }
      }

      console.log("createDocument - Données à insérer:", JSON.stringify(insertData))

      let { data, error } = await supabaseSecretariat
        .from("documents")
        .insert(insertData)
        .select()
        .single()

      // Si erreur liée au cache PostgREST ou colonnes manquantes, réessayer sans les colonnes optionnelles
      if (error && (
        error.code === "PGRST204" || 
        error.message?.includes("reunion_id") || 
        error.message?.includes("column") || 
        error.message?.includes("schema cache") ||
        error.message?.includes("uploaded_by") ||
        error.message?.includes("type_document") ||
        error.message?.includes("Could not find")
      )) {
        console.log("createDocument - Erreur de cache PostgREST détectée, retry sans colonnes optionnelles")
        
        // Retry avec seulement les colonnes de base (qui existent certainement)
        // IMPORTANT: categorie et lien_pdf sont NOT NULL dans le schéma
        const baseInsertData: any = {
          titre: body.titre,
          categorie: body.categorie || "", // NOT NULL, donc valeur par défaut si manquant
          description: body.description || null,
          lien_pdf: lien_pdf || "", // NOT NULL, donc valeur par défaut si manquant
        }
        
        // Ne pas inclure reunion_id, uploaded_by, type_document pour éviter le cache
        console.log("createDocument - Retry avec données de base:", JSON.stringify(baseInsertData))
        
        const retryResult = await supabaseSecretariat
          .from("documents")
          .insert(baseInsertData)
          .select()
          .single()
        
        data = retryResult.data
        error = retryResult.error
        
        // Si ça fonctionne, mettre à jour avec les colonnes optionnelles via UPDATE
        if (data && !error) {
          const updateData: any = {}
          
          // Ajouter reunion_id si fourni et valide
          if (body.reunion_id) {
            const { data: reunionExists } = await supabaseSecretariat
              .from("reunions")
              .select("id")
              .eq("id", body.reunion_id)
              .maybeSingle()
            if (reunionExists) {
              updateData.reunion_id = body.reunion_id
            }
          }
          
          // Ajouter uploaded_by si fourni et valide
          if (uploaded_by) {
            updateData.uploaded_by = uploaded_by
          }
          
          // Ajouter type_document si fourni
          if (body.type_document) {
            updateData.type_document = body.type_document
          }
          
          if (Object.keys(updateData).length > 0) {
            console.log("createDocument - Mise à jour avec colonnes optionnelles:", JSON.stringify(updateData))
            const updateResult = await supabaseSecretariat
              .from("documents")
              .update(updateData)
              .eq("id", data.id)
              .select()
              .single()
            
            if (updateResult.data) {
              data = updateResult.data
            } else if (updateResult.error) {
              console.log("createDocument - Erreur lors de la mise à jour (ignorée):", updateResult.error.message)
              // Ignorer les erreurs de mise à jour (colonnes peuvent ne pas exister encore)
            }
          }
        }
      }

      if (error) {
        console.error("createDocument error - Code:", error.code, "Message:", error.message, "Details:", JSON.stringify(error))
        // Retourner l'erreur détaillée pour le debugging
        return jsonResponse(
          { 
            success: false, 
            message: "Erreur lors de la création du document",
            error_code: "DATABASE_ERROR",
            details: error.message,
            hint: error.hint || null,
            code: error.code || null
          },
          { status: 500 }
        )
      }

      return jsonResponse({
        success: true,
        message: "Document créé avec succès",
        data,
      })
    }

    // PUT /documents/:id - Mettre à jour un document
    const documentIdMatch = relativePath.match(/^documents\/([0-9a-fA-F-]+)$/)
    if (req.method === "PUT" && documentIdMatch) {
      const documentId = documentIdMatch[1]
      const body = await req.json().catch(() => ({}))

      const { data, error } = await supabaseSecretariat
        .from("documents")
        .update(body)
        .eq("id", documentId)
        .select()
        .single()

      if (error) {
        console.error("updateDocument error", error)
        throw new Error("Erreur lors de la mise à jour du document")
      }

      return jsonResponse({
        success: true,
        message: "Document mis à jour avec succès",
        data,
      })
    }

    // ========== RAPPORTS ==========

    // POST /rapports/presidence - Générer rapport présidence (stub)
    if (req.method === "POST" && relativePath === "rapports/presidence") {
      return jsonResponse({
        success: false,
        message:
          "La génération de rapport présidence nécessite le backend Express. Cette fonctionnalité sera disponible prochainement dans la fonction Edge.",
      })
    }

    // ========== GROUPES DE TRAVAIL ==========

    // GET /groupes-travail - Liste des groupes de travail (avec filtre par projet)
    if (req.method === "GET" && relativePath === "groupes-travail") {
      const projetId = searchParams.get("projet_id")
      
      let query = supabaseSecretariat
        .from("groupes_travail")
        .select("*")
        .order("created_at", { ascending: false })

      if (projetId) {
        query = query.eq("projet_id", projetId)
      }

      const { data, error } = await query

      if (error) {
        console.error("getGroupesTravail error", error)
        throw new Error("Erreur lors de la récupération des groupes de travail")
      }

      // Enrichir avec les données du projet et les membres (projets est dans le schéma public)
      const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
      const groupesWithProjet = await Promise.all(
        (data || []).map(async (groupe: any) => {
          const { data: projet } = await supabasePublic
            .from("projets")
            .select("id, projet_id, titre, icon, color")
            .eq("projet_id", groupe.projet_id) // groupe.projet_id est un varchar
            .maybeSingle()
          
          groupe.projet = projet
          
          // Récupérer les membres du groupe depuis groupe_travail_membres
          const { data: membresData } = await supabaseSecretariat
            .from("groupe_travail_membres")
            .select("inscription_id, membre_id")
            .eq("groupe_travail_id", groupe.id)
          
          // Enrichir avec les données des inscriptions et membres
          if (membresData && membresData.length > 0) {
            const membres = await Promise.all(
              membresData.map(async (m: any) => {
                // Récupérer l'inscription
                const { data: inscription } = await supabasePublic
                  .from("projets_inscriptions")
                  .select("*")
                  .eq("id", m.inscription_id)
                  .maybeSingle()
                
                // Récupérer le membre si membre_id existe
                let membre = null
                if (m.membre_id) {
                  membre = await fetchMemberById(supabaseAdhesion, m.membre_id)
                }
                
                return {
                  inscription_id: m.inscription_id,
                  membre_id: m.membre_id,
                  inscription: inscription,
                  membre: membre,
                }
              })
            )
            groupe.membres = membres
            groupe.nombre_membres = membres.length
          } else {
            groupe.membres = []
            groupe.nombre_membres = 0
          }
          
          return groupe
        })
      )

      return jsonResponse({ success: true, data: groupesWithProjet })
    }

    // GET /groupes-travail/:id - Détails d'un groupe de travail
    const groupeIdMatch = relativePath.match(/^groupes-travail\/([0-9a-fA-F-]+)$/)
    if (req.method === "GET" && groupeIdMatch) {
      const groupeId = groupeIdMatch[1]

      const { data, error } = await supabaseSecretariat
        .from("groupes_travail")
        .select("*")
        .eq("id", groupeId)
        .single()

      if (error) {
        console.error("getGroupeTravail error", error)
        throw new Error("Erreur lors de la récupération du groupe de travail")
      }

      // Enrichir avec le projet (projets est dans le schéma public)
      // Note: data.projet_id est un varchar, pas un UUID
      if (data) {
        const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
        const { data: projet } = await supabasePublic
          .from("projets")
          .select("id, projet_id, titre, icon, color")
          .eq("projet_id", data.projet_id) // Utiliser projet_id (varchar) au lieu de id (uuid)
          .maybeSingle()
        
        data.projet = projet
      }

      return jsonResponse({ success: true, data })
    }

    // POST /groupes-travail - Créer un groupe de travail
    if (req.method === "POST" && relativePath === "groupes-travail") {
      const body = await req.json().catch(() => ({}))

      if (!body.nom) {
        return jsonResponse(
          { success: false, message: "Le champ 'nom' est requis", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      if (!body.projet_id) {
        return jsonResponse(
          { success: false, message: "Le champ 'projet_id' est requis (ex: 'mobilite-intelligente', 'dashboard-energie')", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Vérifier que le projet_id existe dans public.projets
      const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
      const { data: projet } = await supabasePublic
        .from("projets")
        .select("id, projet_id, titre")
        .eq("projet_id", body.projet_id)
        .maybeSingle()

      if (!projet) {
        return jsonResponse(
          { success: false, message: `Le projet '${body.projet_id}' n'existe pas`, error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseSecretariat
        .from("groupes_travail")
        .insert({
          projet_id: body.projet_id,
          nom: body.nom,
          description: body.description || null,
        })
        .select()
        .single()

      if (error) {
        console.error("createGroupeTravail error", error)
        console.error("Error details:", JSON.stringify(error, null, 2))
        return jsonResponse(
          { 
            success: false, 
            message: "Erreur lors de la création du groupe de travail",
            error_code: "DATABASE_ERROR",
            details: error.message || JSON.stringify(error)
          },
          { status: 500 }
        )
      }

      // Le trigger devrait avoir ajouté les membres automatiquement
      // Récupérer les membres ajoutés pour confirmation
      const { data: membresData } = await supabaseSecretariat
        .from("groupe_travail_membres")
        .select("inscription_id, membre_id")
        .eq("groupe_travail_id", data.id)

      data.nombre_membres = membresData?.length || 0

      return jsonResponse({
        success: true,
        message: "Groupe de travail créé avec succès",
        data,
      })
    }

    // PUT /groupes-travail/:id - Mettre à jour un groupe de travail
    if (req.method === "PUT" && groupeIdMatch) {
      const groupeId = groupeIdMatch[1]
      const body = await req.json().catch(() => ({}))

      const updateData: any = {}
      if (body.nom !== undefined) updateData.nom = body.nom
      if (body.description !== undefined) updateData.description = body.description
      if (body.projet_id !== undefined) updateData.projet_id = body.projet_id

      const { data, error } = await supabaseSecretariat
        .from("groupes_travail")
        .update(updateData)
        .eq("id", groupeId)
        .select()
        .single()

      if (error) {
        console.error("updateGroupeTravail error", error)
        throw new Error("Erreur lors de la mise à jour du groupe de travail")
      }

      return jsonResponse({
        success: true,
        message: "Groupe de travail mis à jour avec succès",
        data,
      })
    }

    // DELETE /groupes-travail/:id - Supprimer un groupe de travail
    if (req.method === "DELETE" && groupeIdMatch) {
      const groupeId = groupeIdMatch[1]

      const { error } = await supabaseSecretariat
        .from("groupes_travail")
        .delete()
        .eq("id", groupeId)

      if (error) {
        console.error("deleteGroupeTravail error", error)
        throw new Error("Erreur lors de la suppression du groupe de travail")
      }

      return jsonResponse({
        success: true,
        message: "Groupe de travail supprimé avec succès",
      })
    }

    // GET /groupes-travail/:id/reunions - Réunions d'un groupe de travail
    const groupeReunionsMatch = relativePath.match(/^groupes-travail\/([0-9a-fA-F-]+)\/reunions$/)
    if (req.method === "GET" && groupeReunionsMatch) {
      const groupeId = groupeReunionsMatch[1]

      const { data, error } = await supabaseSecretariat
        .from("reunions")
        .select("*")
        .eq("groupe_travail_id", groupeId)
        .order("date_reunion", { ascending: false })

      if (error) {
        console.error("getReunionsByGroupe error", error)
        throw new Error("Erreur lors de la récupération des réunions")
      }

      return jsonResponse({ success: true, data: data || [] })
    }

    // GET /groupes-travail/:id/actions - Actions d'un groupe de travail
    const groupeActionsMatch = relativePath.match(/^groupes-travail\/([0-9a-fA-F-]+)\/actions$/)
    if (req.method === "GET" && groupeActionsMatch) {
      const groupeId = groupeActionsMatch[1]

      const { data: actions, error } = await supabaseSecretariat
        .from("actions")
        .select("*")
        .eq("groupe_travail_id", groupeId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("getActionsByGroupe error", error)
        throw new Error("Erreur lors de la récupération des actions")
      }

      // Enrichir avec les assignés multiples
      const actionsWithAssignees = await Promise.all(
        (actions || []).map(async (action: any) => {
          const { data: assigneesData } = await supabaseSecretariat
            .from("action_assignees")
            .select("member_id")
            .eq("action_id", action.id)

          const assigneeIds = assigneesData?.map((a: any) => a.member_id) || []
          
          if (assigneeIds.length === 0 && action.assigne_a) {
            assigneeIds.push(action.assigne_a)
          }

          const assigneesMembers = await Promise.all(
            assigneeIds.map(async (memberId: string) => {
              const member = await fetchMemberById(supabaseAdhesion, memberId)
              return member ? { id: memberId, ...member } : null
            })
          )

          action.assignees = assigneeIds
          action.assignees_members = assigneesMembers.filter(m => m !== null)

          if (action.assignees_members.length > 0) {
            action.membre = action.assignees_members[0]
          } else if (action.assigne_a) {
            action.membre = await fetchMemberById(supabaseAdhesion, action.assigne_a)
          }

          return action
        })
      )

      return jsonResponse({ success: true, data: actionsWithAssignees })
    }

    // GET /groupes-travail/:id/membres - Membres d'un groupe de travail
    const groupeMembresMatch = relativePath.match(/^groupes-travail\/([0-9a-fA-F-]+)\/membres$/)
    if (req.method === "GET" && groupeMembresMatch) {
      const groupeId = groupeMembresMatch[1]

      // Récupérer les membres du groupe depuis groupe_travail_membres
      const { data: membresData, error } = await supabaseSecretariat
        .from("groupe_travail_membres")
        .select("inscription_id, membre_id")
        .eq("groupe_travail_id", groupeId)

      if (error) {
        console.error("getMembresByGroupe error", error)
        throw new Error("Erreur lors de la récupération des membres")
      }

      // Enrichir avec les données des inscriptions et membres
      const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
      const membresEnrichis = await Promise.all(
        (membresData || []).map(async (m: any) => {
          // Récupérer l'inscription
          const { data: inscription } = await supabasePublic
            .from("projets_inscriptions")
            .select("*")
            .eq("id", m.inscription_id)
            .maybeSingle()
          
          // Récupérer le membre si membre_id existe
          let membre = null
          if (m.membre_id) {
            membre = await fetchMemberById(supabaseAdhesion, m.membre_id)
          }
          
          return {
            inscription_id: m.inscription_id,
            membre_id: m.membre_id,
            inscription: inscription,
            membre: membre,
          }
        })
      )

      return jsonResponse({ success: true, data: membresEnrichis })
    }

    // POST /groupes-travail/:id/membres - Ajouter un membre au groupe (depuis projets_inscriptions approuvées)
    if (req.method === "POST" && groupeMembresMatch) {
      const groupeId = groupeMembresMatch[1]
      const body = await req.json().catch(() => ({}))

      if (!body.inscription_id) {
        return jsonResponse(
          { success: false, message: "Le champ 'inscription_id' est requis", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Vérifier que l'inscription est approuvée et appartient au même projet que le groupe
      const { data: groupe } = await supabaseSecretariat
        .from("groupes_travail")
        .select("projet_id")
        .eq("id", groupeId)
        .single()

      if (!groupe) {
        return jsonResponse(
          { success: false, message: "Groupe de travail introuvable", error_code: "NOT_FOUND" },
          { status: 404 }
        )
      }

      const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
      const { data: inscription } = await supabasePublic
        .from("projets_inscriptions")
        .select("projet_id, statut, membre_id")
        .eq("id", body.inscription_id)
        .maybeSingle()

      if (!inscription) {
        return jsonResponse(
          { success: false, message: "Inscription introuvable", error_code: "NOT_FOUND" },
          { status: 404 }
        )
      }

      if (inscription.statut !== 'approved') {
        return jsonResponse(
          { success: false, message: "L'inscription doit être approuvée pour être ajoutée au groupe", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Vérifier que l'inscription appartient au même projet
      // groupe.projet_id est un varchar, inscription.projet_id aussi
      if (groupe.projet_id !== inscription.projet_id) {
        return jsonResponse(
          { success: false, message: "L'inscription n'appartient pas au même projet que le groupe", error_code: "VALIDATION_ERROR" },
          { status: 400 }
        )
      }

      // Ajouter le membre au groupe
      const { data, error } = await supabaseSecretariat
        .from("groupe_travail_membres")
        .insert({
          groupe_travail_id: groupeId,
          inscription_id: body.inscription_id,
          membre_id: inscription.membre_id || null,
        })
        .select()
        .single()

      if (error) {
        console.error("addMembreToGroupe error", error)
        return jsonResponse(
          { 
            success: false, 
            message: "Erreur lors de l'ajout du membre au groupe",
            error_code: "DATABASE_ERROR",
            details: error.message
          },
          { status: 500 }
        )
      }

      return jsonResponse({
        success: true,
        message: "Membre ajouté au groupe avec succès",
        data,
      })
    }

    // DELETE /groupes-travail/:id/membres/:inscription_id - Retirer un membre du groupe
    const groupeMembreDeleteMatch = relativePath.match(/^groupes-travail\/([0-9a-fA-F-]+)\/membres\/([0-9a-fA-F-]+)$/)
    if (req.method === "DELETE" && groupeMembreDeleteMatch) {
      const groupeId = groupeMembreDeleteMatch[1]
      const inscriptionId = groupeMembreDeleteMatch[2]

      const { error } = await supabaseSecretariat
        .from("groupe_travail_membres")
        .delete()
        .eq("groupe_travail_id", groupeId)
        .eq("inscription_id", inscriptionId)

      if (error) {
        console.error("removeMembreFromGroupe error", error)
        throw new Error("Erreur lors de la suppression du membre du groupe")
      }

      return jsonResponse({
        success: true,
        message: "Membre retiré du groupe avec succès",
      })
    }

    // GET /rapports/presidence - Liste des rapports présidence
    if (req.method === "GET" && relativePath === "rapports/presidence") {
      const page = parseInt(searchParams.get("page") || "1", 10)
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 500)

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data: rapports, error, count } = await supabaseSecretariat
        .from("rapports_presidence")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) {
        console.error("getRapportsPresidence error", error)
        throw new Error("Erreur lors de la récupération des rapports")
      }

      return jsonResponse({
        success: true,
        data: rapports || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // Route non trouvée
    console.log("Route non trouvée - relativePath:", relativePath, "method:", req.method)
    return jsonResponse(
      { success: false, message: `Route non trouvée: ${req.method} /${relativePath}` },
      { status: 404 },
    )
  } catch (err) {
    console.error("admin-secretariat exception", err)
    return jsonResponse(
      { success: false, message: (err as Error).message || "Erreur serveur" },
      { status: 500 },
    )
  }
})

