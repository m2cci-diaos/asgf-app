/**
 * Apps Script Web App pour notifier l'expéditeur et l'association
 * Déployer en tant que Web App (exécuter en tant que vous-même, accès: Anyone with the link)
 */

const CONTACT_WEBHOOK_TOKEN = 'ASGF123'
const ASSOCIATION_EMAIL = 'association.geomaticiens.sf@gmail.com'
const BRAND_COLOR = '#0d47a1'
const ACCENT_COLOR = '#e53935'

const EVENT_TYPES = {
  CONTACT: 'contact_message',
  FORMATION_INSCRIPTION: 'formation_inscription',
  FORMATION_STATUS: 'formation_status',
  FORMATION_INVITATION: 'formation_invitation',
  FORMATION_REMINDER: 'formation_reminder',
  WEBINAIRE_INSCRIPTION: 'webinaire_inscription',
  WEBINAIRE_STATUS: 'webinaire_status',
  WEBINAIRE_INVITATION: 'webinaire_invitation',
  WEBINAIRE_REMINDER: 'webinaire_reminder',
  MEMBER_EMAIL: 'member_email',
}

/**
 * Fonction doGet pour les tests et vérifications
 * Permet de tester le script sans envoyer de requête POST
 */
function doGet(e) {
  return jsonResponse({
    success: true,
    message: 'Script Google Apps Script ASGF - Webhook actif',
    version: '1.0',
    timestamp: new Date().toISOString(),
    instructions: 'Ce script doit être appelé via POST avec un body JSON contenant: { token, type, ... }',
    note: 'Pour tester doPost, utilisez la fonction testDoPost() dans l\'éditeur ou envoyez une requête HTTP POST réelle'
  })
}

/**
 * Fonction de test pour doPost
 * Peut être appelée manuellement dans l'éditeur Google Apps Script
 */
function testDoPost() {
  console.log('🧪 Test de doPost avec des données simulées')
  
  // Simuler un objet e comme le ferait une vraie requête HTTP POST
  const mockE = {
    postData: {
      contents: JSON.stringify({
        token: CONTACT_WEBHOOK_TOKEN,
        type: EVENT_TYPES.CONTACT,
        full_name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test Message'
      }),
      name: 'postData',
      type: 'application/json'
    },
    parameter: {},
    queryString: '',
    pathInfo: '',
    contentLength: -1,
    parameters: {}
  }
  
  const result = doPost(mockE)
  console.log('✅ Résultat du test:', result.getContent())
  return result
}

function doPost(e) {
  try {
    // Log initial pour débogage
    console.log('📨 doPost appelé - Type de e:', typeof e)
    console.log('📨 e existe?', e !== undefined && e !== null)
    
    // Vérifier que e existe
    if (!e) {
      console.error('❌ Paramètre e est undefined dans doPost')
      console.error('❌ Stack trace:', new Error().stack)
      console.warn('⚠️ ATTENTION: doPost() ne peut pas être testé directement dans l\'éditeur.')
      console.warn('⚠️ Pour tester manuellement, utilisez la fonction testDoPost()')
      console.warn('⚠️ Pour un test réel, envoyez une requête HTTP POST à l\'URL de déploiement du script')
      return jsonResponse({ 
        success: false, 
        message: 'Erreur: paramètre de requête manquant. Le script doit être appelé via une requête POST HTTP depuis le backend, pas directement dans l\'éditeur.',
        error: 'Parameter e is undefined',
        instructions: 'Pour tester manuellement, utilisez la fonction testDoPost() dans l\'éditeur. Pour un test réel, le backend doit envoyer une requête HTTP POST avec un body JSON.'
      })
    }
    
    // Log des propriétés disponibles dans e
    console.log('📨 Propriétés de e:', Object.keys(e || {}))
    console.log('📨 e.postData existe?', !!e.postData)
    console.log('📨 e.parameter existe?', !!e.parameter)
    console.log('📨 e.queryString existe?', !!e.queryString)
    
    // Essayer de récupérer les données depuis différents emplacements possibles
    let rawData = null
    if (e.postData && e.postData.contents) {
      rawData = e.postData.contents
      console.log(`📨 Données trouvées dans e.postData.contents - Taille: ${(rawData.length / 1024).toFixed(2)} KB`)
    } else if (e.parameter && e.parameter.data) {
      rawData = e.parameter.data
      console.log(`📨 Données trouvées dans e.parameter.data - Taille: ${(rawData.length / 1024).toFixed(2)} KB`)
    } else if (typeof e === 'string') {
      rawData = e
      console.log(`📨 e est une string directe - Taille: ${(rawData.length / 1024).toFixed(2)} KB`)
    }
    
    if (!rawData) {
      console.error('❌ Aucune donnée POST trouvée dans e.postData.contents, e.parameter.data, ou e directement')
      console.error('❌ Structure de e:', JSON.stringify(e, null, 2).substring(0, 500))
      return jsonResponse({ 
        success: false, 
        message: 'Aucune donnée POST reçue. Vérifiez que la requête envoie les données au format JSON dans le body.',
        error: 'No POST data found'
      })
    }

    let body
    try {
      body = JSON.parse(rawData)
      console.log('✓ JSON parsé avec succès')
      console.log('✓ Clés du body:', Object.keys(body))
    } catch (parseErr) {
      console.error('❌ Erreur parsing JSON:', parseErr.message)
      console.error('❌ Premiers caractères des données:', rawData.substring(0, 200))
      console.error('❌ Type des données:', typeof rawData)
      return jsonResponse({ 
        success: false, 
        message: `Erreur parsing JSON: ${parseErr.message}`,
        error: parseErr.toString()
      })
    }

    const token = body.token || ''

    if (!token || token !== CONTACT_WEBHOOK_TOKEN) {
      console.error('❌ Token invalide ou manquant')
      return jsonResponse({ success: false, message: 'Unauthorized' })
    }

    const type = body.type || body.event_type || EVENT_TYPES.CONTACT
    console.log(`📋 Type d'événement: ${type}`)
    
    if (type === EVENT_TYPES.MEMBER_EMAIL) {
      console.log(`📦 MEMBER_EMAIL - Analyse du body:`, {
        hasAttachments: !!body.attachments,
        attachmentsType: typeof body.attachments,
        attachmentsIsArray: Array.isArray(body.attachments),
        attachmentsLength: body.attachments?.length || 0,
        bodyKeys: Object.keys(body),
        recipientsCount: body.recipients?.length || 0,
        attachmentsPreview: body.attachments?.slice(0, 1).map(a => ({
          name: a?.name,
          type: a?.type,
          hasData: !!a?.data,
          dataType: typeof a?.data,
          dataLength: a?.data?.length || 0,
          dataPreview: a?.data ? a.data.substring(0, 30) + '...' : 'MANQUANT'
        })) || []
      })
    }

    let result
    try {
      switch (type) {
        case EVENT_TYPES.FORMATION_INSCRIPTION:
          result = handleFormationInscription(body)
          break
        case EVENT_TYPES.FORMATION_STATUS:
          result = handleFormationStatus(body)
          break
        case EVENT_TYPES.FORMATION_INVITATION:
          result = handleFormationInvitation(body)
          break
        case EVENT_TYPES.FORMATION_REMINDER:
          result = handleFormationReminder(body)
          break
        case EVENT_TYPES.WEBINAIRE_INSCRIPTION:
          result = handleWebinaireInscription(body)
          break
        case EVENT_TYPES.WEBINAIRE_STATUS:
          result = handleWebinaireStatus(body)
          break
        case EVENT_TYPES.WEBINAIRE_INVITATION:
          result = handleWebinaireInvitation(body)
          break
        case EVENT_TYPES.WEBINAIRE_REMINDER:
          result = handleWebinaireReminder(body)
          break
        case EVENT_TYPES.MEMBER_EMAIL:
          result = handleMemberEmail(body)
          break
        case 'upload_pdf':
          result = handleUploadPDF(body)
          break
        case 'find_pdf_file':
          result = handleFindPDFFile(body)
          break
        case EVENT_TYPES.CONTACT:
        default:
          result = handleContactMessage(body)
          break
      }
      
      console.log('✅ Handler exécuté avec succès')
      return result
    } catch (error) {
      console.error('❌ Erreur Apps Script webhook:', error)
      console.error('Stack:', error.stack)
      return jsonResponse({ 
        success: false, 
        message: error.message,
        error: error.toString(),
        stack: error.stack
      })
    }
  } catch (outerError) {
    console.error('❌ Erreur fatale dans doPost:', outerError)
    return jsonResponse({ 
      success: false, 
      message: `Erreur fatale: ${outerError.message}`,
      error: outerError.toString()
    })
  }
}

function handleContactMessage(body) {
  const {
    full_name: fullName = 'Visiteur',
    email = '',
    subject = 'Message sans sujet',
    message = '',
    created_at: createdAt = new Date().toISOString(),
  } = body

  if (!email) {
    throw new Error('Email manquant dans la requête')
  }

  const confirmationPlain = [
    `Bonjour ${fullName},`,
    '',
    'Merci pour votre message ! Nous l’avons bien reçu et un membre de l’ASGF vous répondra rapidement.',
    '',
    'Récapitulatif :',
    `Sujet : ${subject}`,
    `Message :`,
    message,
    '',
    'À très vite,',
    'Association des Géomaticiens Sénégalais de France',
  ].join('\n')

  const confirmationHtml = buildHtmlEmail({
    title: 'Merci pour votre message 🙏',
    intro: `Bonjour ${fullName},`,
    paragraphs: [
      'Nous avons bien reçu votre message et l’équipe de l’Association des Géomaticiens Sénégalais de France vous répondra très vite.',
      'Voici un récapitulatif :',
    ],
    recap: [
      { label: 'Sujet', value: subject },
      { label: 'Message', value: message },
    ],
    footer: 'Merci de faire confiance à la communauté ASGF. Ensemble, cartographions demain 🌍',
  })

  GmailApp.sendEmail(email, 'ASGF – Votre message a bien été reçu', confirmationPlain, {
    htmlBody: confirmationHtml,
  })

  const adminPlain = [
    'Nouveau message reçu via le site public',
    '',
    `Nom : ${fullName}`,
    `Email : ${email}`,
    `Sujet : ${subject}`,
    `Reçu le : ${new Date(createdAt).toLocaleString()}`,
    '',
    'Message :',
    message,
  ].join('\n')

  const adminHtml = buildHtmlEmail({
    title: '📥 Nouveau message de contact',
    intro: 'Vous avez reçu un nouveau message via le site public ASGF.',
    recap: [
      { label: 'Nom', value: fullName },
      { label: 'Email', value: email },
      { label: 'Sujet', value: subject },
      { label: 'Reçu le', value: new Date(createdAt).toLocaleString('fr-FR') },
    ],
    footer: 'Vous pouvez répondre directement à cet email pour contacter le membre.',
    messageBlock: message,
  })

  GmailApp.sendEmail(ASSOCIATION_EMAIL, `ASGF • Nouveau message de ${fullName}`, adminPlain, {
    htmlBody: adminHtml,
    replyTo: email,
  })

  return jsonResponse({ success: true })
}

function handleFormationInscription(body) {
  const {
    prenom = '',
    nom = '',
    email = '',
    formation_title: formationTitle = 'Formation ASGF',
    session_date: sessionDate = '',
    formation_mode: formationMode = '',
    niveau = '',
  } = body

  if (!email) {
    throw new Error('Email manquant pour la formation')
  }

  const dateLabel = sessionDate
    ? new Date(sessionDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À confirmer'

  const participantPlain = [
    `Bonjour ${prenom} ${nom},`,
    '',
    `Merci d'avoir déposé votre demande d'inscription à la formation "${formationTitle}".`,
    "Notre équipe pédagogique va étudier votre dossier et vous reviendra sous peu pour confirmer ou non votre participation.",
    '',
    `Session pressentie : ${dateLabel}`,
    formationMode ? `Modalité : ${formationMode}` : '',
    niveau ? `Niveau indiqué : ${niveau}` : '',
    '',
    'Merci pour votre confiance et à très bientôt,',
    'Association des Géomaticiens Sénégalais de France',
  ]
    .filter(Boolean)
    .join('\n')

  const participantHtml = buildHtmlEmail({
    title: '🎓 Merci pour votre inscription',
    intro: `Bonjour ${prenom} ${nom},`,
    paragraphs: [
      `Nous avons bien reçu votre demande pour la formation <strong>${formationTitle}</strong>.`,
      'Elle va maintenant être examinée par notre équipe. Nous vous communiquerons la décision finale dans les plus brefs délais.',
    ],
    recap: [
      { label: 'Formation', value: formationTitle },
      { label: 'Session pressentie', value: dateLabel },
      formationMode ? { label: 'Modalité', value: formationMode } : null,
      niveau ? { label: 'Niveau indiqué', value: niveau } : null,
    ].filter(Boolean),
    footer: 'Vous serez notifié par email dès que votre inscription sera validée ou refusée.',
  })

  GmailApp.sendEmail(email, `ASGF – Votre demande d'inscription à "${formationTitle}"`, participantPlain, {
    htmlBody: participantHtml,
  })

  const adminHtml = buildHtmlEmail({
    title: '📥 Nouvelle inscription formation',
    intro: 'Une nouvelle demande vient d’être enregistrée sur le site public.',
    recap: [
      { label: 'Candidat', value: `${prenom} ${nom}` },
      { label: 'Email', value: email },
      { label: 'Formation', value: formationTitle },
      { label: 'Session demandée', value: dateLabel },
      formationMode ? { label: 'Modalité', value: formationMode } : null,
      niveau ? { label: 'Niveau indiqué', value: niveau } : null,
    ].filter(Boolean),
    footer: 'Merci de traiter cette demande depuis le back-office (valider ou refuser).',
  })

  GmailApp.sendEmail(
    ASSOCIATION_EMAIL,
    `ASGF • Nouvelle inscription à ${formationTitle}`,
    participantPlain,
    { htmlBody: adminHtml, replyTo: email }
  )

  return jsonResponse({ success: true })
}

function handleFormationStatus(body) {
  const {
    prenom = '',
    nom = '',
    email = '',
    formation_title: formationTitle = 'Formation ASGF',
    session_date: sessionDate = '',
    status = 'pending',
    ordre_attente = null,
    message = '',
  } = body

  if (!email) {
    throw new Error('Email manquant pour la notification de statut')
  }

  const dateLabel = sessionDate
    ? new Date(sessionDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À venir'

  const isConfirmed = status === 'confirmed'
  const isPending = status === 'pending'
  const isCancelled = status === 'cancelled' || status === 'rejected'

  const subject = isConfirmed
    ? `ASGF – Votre inscription à "${formationTitle}" est validée`
    : isPending
    ? `ASGF — Vous êtes en liste d'attente (Formation : ${formationTitle})`
    : isCancelled
    ? `ASGF – Votre inscription à "${formationTitle}" n'a pas été retenue`
    : `ASGF – Mise à jour concernant "${formationTitle}"`

  const intro = `Bonjour ${prenom} ${nom},`

  let paragraphs = []
  if (isConfirmed) {
    paragraphs = [
      `Bonne nouvelle ! Votre inscription à la formation "${formationTitle}" est confirmée.`,
      'Vous recevrez prochainement toutes les informations pratiques (lien de connexion, matériel, etc.).',
    ]
  } else if (isPending) {
    if (message) {
      // Si un message personnalisé est fourni, l'utiliser
      paragraphs = message.split('\n').filter(Boolean)
    } else {
      // Message par défaut pour la liste d'attente
      paragraphs = [
        `Nous vous informons que votre demande d'inscription à la formation « ${formationTitle} » a bien été prise en compte, mais que la session est actuellement complète.`,
        '',
        'Vous êtes donc placé(e) en liste d\'attente.',
        ordre_attente ? `Votre position actuelle : ${ordre_attente}.` : 'Votre position actuelle sera communiquée prochainement.',
        '',
        'Dès qu\'une place se libère, nous vous contacterons par e-mail pour vous confirmer votre inscription.',
      ].filter(Boolean)
    }
  } else if (isCancelled) {
    paragraphs = [
      `Après étude de votre dossier, nous ne pouvons malheureusement pas retenir votre inscription pour la formation "${formationTitle}".`,
      '',
      'Nous restons à votre disposition pour échanger et serons ravis de vous accueillir sur une prochaine session.',
    ]
  } else {
    paragraphs = [
      `Votre inscription à la formation "${formationTitle}" a été mise à jour.`,
    ]
  }

  const footer = isConfirmed
    ? 'Merci de noter la date dans votre agenda. À très vite !'
    : isPending
    ? 'Merci pour votre intérêt et votre confiance,'
    : isCancelled
    ? 'Merci pour votre intérêt et votre compréhension,'
    : 'Merci pour votre confiance,'

  const recap = [
    { label: 'Formation', value: formationTitle },
    { label: 'Session', value: dateLabel },
    ...(isPending && ordre_attente ? [{ label: 'Position', value: ordre_attente.toString() }] : []),
    { label: 'Statut', value: isConfirmed ? 'Confirmée' : isPending ? 'Liste d\'attente' : isCancelled ? 'Non retenue' : 'En cours' },
  ]

  // Pour les emails en liste d'attente, utiliser le format texte brut uniquement
  if (isPending && !message) {
    const plainText = [
      intro,
      '',
      ...paragraphs,
      '',
      'Cordialement,',
      '',
      "L'équipe ASGF",
      '',
      'https://association-asgf.fr',
      '',
      ...recap.map(r => `${r.label} : ${r.value}`),
    ].filter(Boolean).join('\n')

    // Envoyer uniquement en texte brut, sans HTML
    GmailApp.sendEmail(email, subject, plainText)

    return jsonResponse({ success: true })
  }

  const htmlBody = buildHtmlEmail({
    title: isConfirmed ? 'Inscription confirmée' : isPending ? '⏳ Inscription en attente' : isCancelled ? 'Inscription non retenue' : 'Mise à jour de votre inscription',
    intro,
    paragraphs: paragraphs,
    recap,
    footer,
  })

  // Créer une version texte plain en retirant les balises HTML
  let plainText = `${intro}\n\n${paragraphs.map(p => (p || '').replace(/<[^>]*>/g, '')).join('\n')}\n\n${recap.map(r => `${r.label}: ${r.value}`).join('\n')}\n\n${footer}`
  
  // Pour les emails en attente, envoyer uniquement en texte brut (sans HTML)
  if (isPending) {
    GmailApp.sendEmail(email, subject, plainText)
  } else {
    GmailApp.sendEmail(email, subject, plainText, {
      htmlBody,
    })
  }

  return jsonResponse({ success: true })
}

function handleFormationInvitation(body) {
  const {
    prenom = '',
    nom = '',
    email = '',
    formation_title: formationTitle = 'Formation ASGF',
    session_date: sessionDate = '',
    access_link: accessLink = '',
  } = body

  if (!email) {
    throw new Error("Email manquant pour l'invitation")
  }

  const dateLabel = sessionDate
    ? new Date(sessionDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À venir'

  const subject = `📩 Invitation à la formation "${formationTitle}"`

  const paragraphs = [
    `Votre inscription à la formation <strong>${formationTitle}</strong> est confirmée. Voici votre lien de connexion pour participer à la session.`,
  ]
  
  const recap = [
    { label: 'Formation', value: formationTitle },
    { label: 'Session', value: dateLabel },
  ]
  
  const footer = "Merci d'être à l'heure le jour J et de tester votre connexion en amont."

  const htmlBody = buildHtmlEmail({
    title: '📩 Votre lien de connexion',
    intro: `Bonjour ${prenom} ${nom},`,
    paragraphs,
    recap,
    messageBlock: accessLink
      ? `Lien de connexion : ${accessLink}`
      : "Le lien de connexion vous sera transmis ultérieurement par l'équipe ASGF.",
    footer,
  })

  // Créer une version texte plain en retirant les balises HTML
  const plainText = `Bonjour ${prenom} ${nom},\n\n${paragraphs.map(p => p.replace(/<[^>]*>/g, '')).join('\n')}\n\n${recap.map(r => `${r.label}: ${r.value}`).join('\n')}${accessLink ? `\n\nLien de connexion: ${accessLink}` : ''}\n\n${footer}`
  
  GmailApp.sendEmail(
    email,
    subject,
    plainText,
    {
      htmlBody,
    }
  )

  return jsonResponse({ success: true })
}

function handleFormationReminder(body) {
  const {
    kind = 'generic',
    prenom = '',
    nom = '',
    email = '',
    formation_title: formationTitle = 'Formation ASGF',
    session_date: sessionDate = '',
    access_link: accessLink = '',
  } = body

  if (!email) {
    throw new Error("Email manquant pour le rappel")
  }

  const dateLabel = sessionDate
    ? new Date(sessionDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À venir'

  const is48h = kind === '48h'
  const is2h = kind === '2h'

  const subject = is48h
    ? `⏰ Rappel : votre formation "${formationTitle}" est dans 48h`
    : is2h
    ? `⏰ Dernier rappel : votre formation "${formationTitle}" commence bientôt`
    : `⏰ Rappel formation "${formationTitle}"`

  const paragraphs = is48h
    ? [
        `Petit rappel : votre formation <strong>${formationTitle}</strong> aura lieu dans environ 48 heures.`,
        'Pensez à vérifier votre matériel (connexion internet, micro, caméra le cas échéant).',
      ]
    : is2h
    ? [
        `Ceci est un dernier rappel : la formation <strong>${formationTitle}</strong> commence très bientôt.`,
        "Nous vous conseillons de vous connecter quelques minutes en avance pour être prêt à l'heure.",
      ]
    : [
        `Rappel : la formation <strong>${formationTitle}</strong> approche.`,
      ]

  const recap = [
    { label: 'Formation', value: formationTitle },
    { label: 'Date', value: dateLabel },
  ]
  
  const footer = 'À très vite pour cette session avec la communauté ASGF.'

  const htmlBody = buildHtmlEmail({
    title: '⏰ Rappel de votre formation',
    intro: `Bonjour ${prenom} ${nom},`,
    paragraphs,
    recap,
    messageBlock: accessLink ? `Lien de connexion : ${accessLink}` : '',
    footer,
  })

  // Créer une version texte plain en retirant les balises HTML
  const plainText = `Bonjour ${prenom} ${nom},\n\n${paragraphs.map(p => p.replace(/<[^>]*>/g, '')).join('\n')}\n\n${recap.map(r => `${r.label}: ${r.value}`).join('\n')}${accessLink ? `\n\nLien de connexion: ${accessLink}` : ''}\n\n${footer}`
  
  GmailApp.sendEmail(
    email,
    subject,
    plainText,
    { htmlBody }
  )

  return jsonResponse({ success: true })
}

function handleWebinaireInscription(body) {
  const {
    prenom = '',
    nom = '',
    email = '',
    webinaire_title: webinaireTitle = 'Webinaire ASGF',
    webinaire_date: webinaireDate = '',
    webinaire_time: webinaireTime = '',
    pays = 'France',
    whatsapp = '',
  } = body

  if (!email) {
    throw new Error('Email manquant pour l\'inscription webinaire')
  }

  const dateLabel = webinaireDate
    ? new Date(webinaireDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À venir'

  const participantPlain = [
    `Bonjour ${prenom} ${nom},`,
    '',
    `Merci d'avoir déposé votre demande d'inscription au webinaire "${webinaireTitle}".`,
    "Notre équipe va étudier votre demande et vous reviendra sous peu pour confirmer ou non votre participation.",
    '',
    `Date prévue : ${dateLabel}`,
    webinaireTime ? `Heure : ${webinaireTime}` : '',
    '',
    'Merci pour votre confiance et à très bientôt,',
    'Association des Géomaticiens Sénégalais de France',
  ]
    .filter(Boolean)
    .join('\n')

  const participantHtml = buildHtmlEmail({
    title: '🎥 Merci pour votre inscription',
    intro: `Bonjour ${prenom} ${nom},`,
    paragraphs: [
      `Nous avons bien reçu votre demande pour le webinaire <strong>${webinaireTitle}</strong>.`,
      'Elle va maintenant être examinée par notre équipe. Nous vous communiquerons la décision finale dans les plus brefs délais.',
    ],
    recap: [
      { label: 'Webinaire', value: webinaireTitle },
      { label: 'Date prévue', value: dateLabel },
      webinaireTime ? { label: 'Heure', value: webinaireTime } : null,
    ].filter(Boolean),
    footer: 'Vous serez notifié par email dès que votre inscription sera validée ou refusée.',
  })

  GmailApp.sendEmail(email, `ASGF – Votre demande d'inscription au webinaire "${webinaireTitle}"`, participantPlain, {
    htmlBody: participantHtml,
  })

  const adminHtml = buildHtmlEmail({
    title: '📥 Nouvelle inscription webinaire',
    intro: 'Une nouvelle demande vient d\'être enregistrée sur le site public.',
    recap: [
      { label: 'Participant', value: `${prenom} ${nom}` },
      { label: 'Email', value: email },
      { label: 'Webinaire', value: webinaireTitle },
      { label: 'Date prévue', value: dateLabel },
      webinaireTime ? { label: 'Heure', value: webinaireTime } : null,
      pays ? { label: 'Pays', value: pays } : null,
      whatsapp ? { label: 'WhatsApp', value: whatsapp } : null,
    ].filter(Boolean),
    footer: 'Merci de traiter cette demande depuis le back-office (valider ou refuser).',
  })

  GmailApp.sendEmail(
    ASSOCIATION_EMAIL,
    `ASGF • Nouvelle inscription au webinaire "${webinaireTitle}"`,
    participantPlain,
    { htmlBody: adminHtml, replyTo: email }
  )

  return jsonResponse({ success: true })
}

function handleWebinaireStatus(body) {
  const {
    prenom = '',
    nom = '',
    email = '',
    webinaire_title: webinaireTitle = 'Webinaire ASGF',
    webinaire_date: webinaireDate = '',
    webinaire_time: webinaireTime = '',
    webinaire_lien: webinaireLien = '',
    status = 'pending',
  } = body

  if (!email) {
    throw new Error('Email manquant pour la notification de statut webinaire')
  }

  const dateLabel = webinaireDate
    ? new Date(webinaireDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À venir'

  const isConfirmed = status === 'confirmed'

  const subject = isConfirmed
    ? `✅ ASGF – Votre inscription au webinaire "${webinaireTitle}" est validée`
    : `⛔ ASGF – Mise à jour concernant le webinaire "${webinaireTitle}"`

  const intro = `Bonjour ${prenom} ${nom},`

  const paragraphs = isConfirmed
    ? [
        `Bonne nouvelle ! Votre inscription au webinaire <strong>${webinaireTitle}</strong> est confirmée.`,
        'Vous recevrez prochainement toutes les informations pratiques (lien de connexion, matériel, etc.).',
      ]
    : [
        `Après étude de votre demande, nous ne pouvons malheureusement pas retenir votre inscription pour le webinaire <strong>${webinaireTitle}</strong>.`,
        'Nous restons à votre disposition pour échanger et serons ravis de vous accueillir sur un prochain webinaire.',
      ]

  const footer = isConfirmed
    ? 'Merci de noter la date dans votre agenda. À très vite !'
    : 'Merci pour votre intérêt et votre compréhension.'

  const recap = [
    { label: 'Webinaire', value: webinaireTitle },
    { label: 'Date', value: dateLabel },
    webinaireTime ? { label: 'Heure', value: webinaireTime } : null,
    { label: 'Statut', value: isConfirmed ? 'Confirmée ✅' : 'Non retenue ⛔' },
  ].filter(Boolean)

  const messageBlock = webinaireLien
    ? `Lien de connexion : <a href="${webinaireLien}" style="color:${BRAND_COLOR};text-decoration:underline;">${webinaireLien}</a>`
    : ''

  const htmlBody = buildHtmlEmail({
    title: isConfirmed ? '🎉 Inscription confirmée' : 'ℹ️ Mise à jour de votre inscription',
    intro,
    paragraphs,
    recap,
    messageBlock,
    footer,
  })

  const plainText = `${intro}\n\n${paragraphs.map(p => p.replace(/<[^>]*>/g, '')).join('\n')}\n\n${recap.map(r => `${r.label}: ${r.value}`).join('\n')}${webinaireLien ? `\n\nLien de connexion: ${webinaireLien}` : ''}\n\n${footer}`

  GmailApp.sendEmail(email, subject, plainText, {
    htmlBody,
  })

  return jsonResponse({ success: true })
}

function handleWebinaireInvitation(body) {
  const {
    prenom = '',
    nom = '',
    email = '',
    webinaire_title: webinaireTitle = 'Webinaire ASGF',
    webinaire_date: webinaireDate = '',
    webinaire_time: webinaireTime = '',
    access_link: accessLink = '',
  } = body

  if (!email) {
    throw new Error("Email manquant pour l'invitation webinaire")
  }

  const dateLabel = webinaireDate
    ? new Date(webinaireDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À venir'

  const subject = `📩 Invitation au webinaire "${webinaireTitle}"`

  const paragraphs = [
    `Votre inscription au webinaire <strong>${webinaireTitle}</strong> est confirmée.`,
    'Voici les informations de connexion pour rejoindre la session.',
  ]

  const recap = [
    { label: 'Webinaire', value: webinaireTitle },
    { label: 'Date', value: dateLabel },
  ]

  if (webinaireTime) {
    recap.push({ label: 'Heure', value: webinaireTime })
  }
  
  const footer = "Merci d'être à l'heure le jour J et de tester votre connexion en amont."

  const htmlBody = buildHtmlEmail({
    title: '📩 Votre lien de connexion au webinaire',
    intro: `Bonjour ${prenom} ${nom},`,
    paragraphs,
    recap,
    messageBlock: accessLink
      ? `Lien de connexion : ${accessLink}`
      : "Le lien de connexion vous sera transmis ultérieurement par l'équipe ASGF.",
    footer,
  })

  // Créer une version texte plain en retirant les balises HTML
  const plainText = `Bonjour ${prenom} ${nom},\n\n${paragraphs.map(p => p.replace(/<[^>]*>/g, '')).join('\n')}\n\n${recap.map(r => `${r.label}: ${r.value}`).join('\n')}${accessLink ? `\n\nLien de connexion: ${accessLink}` : ''}\n\n${footer}`
  
  GmailApp.sendEmail(
    email,
    subject,
    plainText,
    {
      htmlBody,
    }
  )

  return jsonResponse({ success: true })
}

function handleWebinaireReminder(body) {
  const {
    kind = 'generic',
    prenom = '',
    nom = '',
    email = '',
    webinaire_title: webinaireTitle = 'Webinaire ASGF',
    webinaire_date: webinaireDate = '',
    webinaire_time: webinaireTime = '',
    access_link: accessLink = '',
  } = body

  if (!email) {
    throw new Error("Email manquant pour le rappel webinaire")
  }

  const dateLabel = webinaireDate
    ? new Date(webinaireDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'À venir'

  const is48h = kind === '48h'
  const is2h = kind === '2h'

  const subject = is48h
    ? `⏰ Rappel : votre webinaire "${webinaireTitle}" est dans 48h`
    : is2h
    ? `⏰ Dernier rappel : votre webinaire "${webinaireTitle}" commence bientôt`
    : `⏰ Rappel webinaire "${webinaireTitle}"`

  const paragraphs = is48h
    ? [
        `Petit rappel : votre webinaire <strong>${webinaireTitle}</strong> aura lieu dans environ 48 heures.`,
        'Pensez à vérifier votre matériel (connexion internet, micro, caméra le cas échéant).',
      ]
    : is2h
    ? [
        `Ceci est un dernier rappel : le webinaire <strong>${webinaireTitle}</strong> commence très bientôt.`,
        "Nous vous conseillons de vous connecter quelques minutes en avance pour être prêt à l'heure.",
      ]
    : [
        `Rappel : le webinaire <strong>${webinaireTitle}</strong> approche.`,
      ]

  const recap = [
    { label: 'Webinaire', value: webinaireTitle },
    { label: 'Date', value: dateLabel },
  ]

  if (webinaireTime) {
    recap.push({ label: 'Heure', value: webinaireTime })
  }

  const footer = 'À très vite pour ce webinaire avec la communauté ASGF.'

  const htmlBody = buildHtmlEmail({
    title: '⏰ Rappel de votre webinaire',
    intro: `Bonjour ${prenom} ${nom},`,
    paragraphs,
    recap,
    messageBlock: accessLink ? `Lien de connexion : ${accessLink}` : '',
    footer,
  })

  // Créer une version texte plain en retirant les balises HTML
  const plainText = `Bonjour ${prenom} ${nom},\n\n${paragraphs.map(p => p.replace(/<[^>]*>/g, '')).join('\n')}\n\n${recap.map(r => `${r.label}: ${r.value}`).join('\n')}${accessLink ? `\n\nLien de connexion: ${accessLink}` : ''}\n\n${footer}`
  
  GmailApp.sendEmail(
    email,
    subject,
    plainText,
    { htmlBody }
  )

  return jsonResponse({ success: true })
}

function handleMemberEmail(body) {
  console.log('📥 handleMemberEmail appelé avec:', {
    recipientsCount: body.recipients?.length || 0,
    subject: body.subject,
    bodyTemplateLength: body.bodyTemplate?.length || 0,
    attachmentsCount: body.attachments?.length || 0,
    attachmentsDetails: body.attachments?.map(a => ({
      name: a.name,
      type: a.type,
      dataLength: a.data?.length || 0,
      hasData: !!a.data
    })) || []
  })

  const {
    recipients = [], // [{ email, prenom, nom, numero_membre, pays }]
    subject = 'Message de l\'ASGF',
    bodyTemplate = '',
    attachments = [], // [{ name, data (base64), type }]
  } = body

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Aucun destinataire fourni pour member_email')
  }

  if (!subject || !bodyTemplate) {
    throw new Error("Sujet et contenu de l'email requis pour member_email")
  }

  console.log(`📎 Attachments reçus: ${attachments?.length || 0}`)

  let successCount = 0
  let errorCount = 0
  const errors = []

  // Préparer les pièces jointes UNE FOIS pour tous les destinataires (optimisation)
  const emailAttachments = []
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    console.log(`🔧 Préparation de ${attachments.length} pièce(s) jointe(s)`)
    attachments.forEach((att, index) => {
      try {
        console.log(`  → Traitement pièce jointe ${index + 1}/${attachments.length}:`, {
          name: att.name,
          type: att.type,
          dataLength: att.data?.length || 0,
          dataPreview: att.data ? att.data.substring(0, 50) + '...' : 'MANQUANT'
        })

        if (!att.data || typeof att.data !== 'string' || att.data.length === 0) {
          throw new Error(`Données base64 manquantes ou invalides (type: ${typeof att.data}, length: ${att.data?.length || 0})`)
        }

        // Normaliser le MIME type
        let mimeType = att.type || 'application/octet-stream'
        if (mimeType === 'application/pdf') {
          mimeType = 'application/pdf'
        } else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        } else if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) {
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }

        // Convertir base64 en bytes
        const base64Data = att.data.trim() // Enlever les espaces éventuels
        
        // Vérifier que les données base64 sont valides
        if (base64Data.length === 0) {
          throw new Error('Données base64 vides après trim')
        }

        // Vérifier la taille (Gmail limite à 25MB par email, mais Apps Script peut avoir des limites plus strictes)
        const estimatedSizeMB = (base64Data.length * 3 / 4) / (1024 * 1024)
        if (estimatedSizeMB > 20) {
          console.warn(`    ⚠️ Fichier volumineux: ${estimatedSizeMB.toFixed(2)} MB (limite recommandée: 20MB)`)
        }
        
        let decodedBytes
        try {
          decodedBytes = Utilities.base64Decode(base64Data)
          const actualSizeMB = decodedBytes.length / (1024 * 1024)
          console.log(`    ✓ Base64 décodé: ${decodedBytes.length} bytes (${(decodedBytes.length / 1024).toFixed(2)} KB / ${actualSizeMB.toFixed(2)} MB)`)
          
          // Vérifier la taille réelle
          if (actualSizeMB > 25) {
            throw new Error(`Fichier trop volumineux: ${actualSizeMB.toFixed(2)} MB (limite Gmail: 25MB)`)
          }
        } catch (decodeErr) {
          if (decodeErr.message.includes('trop volumineux')) {
            throw decodeErr
          }
          throw new Error(`Erreur décodage base64: ${decodeErr.message}`)
        }
        
        // Vérifier que les bytes décodés ne sont pas vides
        if (!decodedBytes || decodedBytes.length === 0) {
          throw new Error('Bytes décodés vides')
        }
        
        // Créer le blob avec le bon MIME type et le nom du fichier
        const fileName = att.name || `attachment_${index + 1}`
        const blob = Utilities.newBlob(
          decodedBytes,
          mimeType,
          fileName
        )

        if (!blob) {
          throw new Error('Échec création du blob (blob est null/undefined)')
        }

        // Vérifier que le blob est valide
        const blobBytes = blob.getBytes()
        if (!blobBytes || blobBytes.length === 0) {
          throw new Error('Blob créé mais bytes vides')
        }

        // Vérifier le nom et le type du blob
        const blobName = blob.getName()
        const blobType = blob.getContentType()
        
        if (blobName !== fileName) {
          console.warn(`    ⚠️ Nom blob différent: attendu "${fileName}", obtenu "${blobName}"`)
        }
        
        if (blobType !== mimeType) {
          console.warn(`    ⚠️ Type blob différent: attendu "${mimeType}", obtenu "${blobType}"`)
        }

        // Test final : vérifier que le blob peut être lu
        try {
          const testBytes = blob.getBytes()
          const testName = blob.getName()
          const testType = blob.getContentType()
          if (!testBytes || testBytes.length === 0) {
            throw new Error('Blob créé mais impossible de lire les bytes')
          }
          if (!testName) {
            throw new Error('Blob créé mais pas de nom')
          }
          console.log(`    ✓ Test blob OK: ${testName} (${testType}, ${(testBytes.length / 1024).toFixed(2)} KB)`)
        } catch (testErr) {
          throw new Error(`Blob invalide après création: ${testErr.message}`)
        }

        emailAttachments.push(blob)
        console.log(`    ✓✓ Pièce jointe "${fileName}" préparée avec succès:`, {
          mimeType: blobType,
          size: `${(blobBytes.length / 1024).toFixed(2)} KB`,
          originalSize: `${(decodedBytes.length / 1024).toFixed(2)} KB`,
          name: blobName
        })
      } catch (err) {
        const errorMsg = `Erreur conversion pièce jointe "${att.name || 'inconnu'}": ${err.message}`
        console.error(`    ❌ ${errorMsg}`, err)
        errors.push(errorMsg)
        errorCount++
      }
    })
  } else {
    console.log('⚠️ Aucune pièce jointe fournie ou format invalide', {
      attachments,
      isArray: Array.isArray(attachments),
      length: attachments?.length
    })
  }

  console.log(`📦 Résultat préparation: ${emailAttachments.length} blob(s) créé(s) sur ${attachments?.length || 0} pièce(s) jointe(s) fournie(s)`)

  recipients.forEach((recipient) => {
    try {
      const {
        email,
        prenom = '',
        nom = '',
        numero_membre: numeroMembre = '',
        pays = '',
      } = recipient

      if (!email) {
        console.warn('Destinataire sans email ignoré', recipient)
        errorCount++
        errors.push(`Membre ${prenom} ${nom} n'a pas d'email`)
        return
      }

      const vars = {
        prenom,
        nom,
        numero_membre: numeroMembre,
        pays,
      }

      let rendered = bodyTemplate
      Object.keys(vars).forEach((key) => {
        const value = vars[key] || ''
        const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        rendered = rendered.replace(re, value)
      })

      const plainText = rendered.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')

      const htmlBody = buildHtmlEmail({
        title: subject,
        intro: `Bonjour ${prenom} ${nom},`,
        paragraphs: [],
        recap: [],
        messageBlock: rendered,
        footer: 'Vous recevez cet email en tant que membre ou contact de l\'ASGF.',
      })

      // Options d'envoi
      const emailOptions = {
        htmlBody: htmlBody,
      }

      // Ajouter les pièces jointes si présentes
      if (emailAttachments.length > 0) {
        // Vérifier que tous les blobs sont valides avant l'envoi
        const validAttachments = emailAttachments.filter((blob, i) => {
          try {
            const bytes = blob.getBytes()
            const name = blob.getName()
            const type = blob.getContentType()
            if (!bytes || bytes.length === 0) {
              console.error(`    ❌ Blob ${i} invalide: bytes vides`)
              return false
            }
            if (!name) {
              console.error(`    ❌ Blob ${i} invalide: pas de nom`)
              return false
            }
            return true
          } catch (err) {
            console.error(`    ❌ Blob ${i} invalide: ${err.message}`)
            return false
          }
        })

        if (validAttachments.length !== emailAttachments.length) {
          console.warn(`⚠️ ${emailAttachments.length - validAttachments.length} blob(s) invalide(s) filtré(s)`)
        }

        if (validAttachments.length > 0) {
          emailOptions.attachments = validAttachments
          const totalSize = validAttachments.reduce((sum, blob) => sum + blob.getBytes().length, 0)
          console.log(`📤 Envoi email à ${email} avec ${validAttachments.length} pièce(s) jointe(s) valide(s) (${(totalSize / 1024 / 1024).toFixed(2)} MB total):`, 
            validAttachments.map((blob, i) => ({
              index: i,
              name: blob.getName(),
              type: blob.getContentType(),
              size: `${(blob.getBytes().length / 1024).toFixed(2)} KB`
            }))
          )
        } else {
          console.warn(`⚠️ Aucune pièce jointe valide, envoi sans PJ`)
        }
      } else {
        console.log(`📤 Envoi email à ${email} SANS pièces jointes`)
      }

      // Envoyer l'email
      try {
        // Utiliser GmailApp pour tous les cas (avec ou sans pièces jointes)
        // GmailApp gère aussi les pièces jointes et utilise les mêmes autorisations
        if (emailOptions.attachments && emailOptions.attachments.length > 0) {
          console.log(`📧 Appel GmailApp.sendEmail pour ${email} avec ${emailOptions.attachments.length} pièce(s) jointe(s)`)
          
          // Vérifier une dernière fois les attachments avant envoi
          const finalAttachments = emailOptions.attachments.map((blob, idx) => {
            const blobInfo = {
              index: idx,
              name: blob.getName(),
              type: blob.getContentType(),
              size: blob.getBytes().length,
              sizeKB: (blob.getBytes().length / 1024).toFixed(2)
            }
            console.log(`  📎 Attachment ${idx + 1}:`, blobInfo)
            return blob
          })
          
          // GmailApp.sendEmail avec attachments
          GmailApp.sendEmail(
            email,
            subject,
            plainText,
            {
              htmlBody: emailOptions.htmlBody,
              attachments: finalAttachments
            }
          )
          
          console.log(`✓✓✓ Email envoyé avec succès à ${email} via GmailApp (${finalAttachments.length} PJ)`)
        } else {
          // Pas de pièces jointes
          console.log(`📧 Appel GmailApp.sendEmail pour ${email} (sans PJ)`)
          GmailApp.sendEmail(email, subject, plainText, emailOptions)
          console.log(`✓✓ Email envoyé avec succès à ${email} via GmailApp (sans PJ)`)
        }
      } catch (sendErr) {
        console.error(`❌❌ Erreur envoi email à ${email}:`, {
          message: sendErr.message,
          stack: sendErr.stack,
          attachmentsCount: emailOptions.attachments?.length || 0
        })
        throw new Error(`Erreur envoi email: ${sendErr.message}`)
      }

      successCount++
      console.log(`✓ Email envoyé avec succès à ${email}${emailAttachments.length > 0 ? ` (${emailAttachments.length} PJ)` : ''}`)
    } catch (err) {
      errorCount++
      const errorMsg = `Erreur envoi à ${recipient.email || 'email inconnu'}: ${err.message}`
      errors.push(errorMsg)
      console.error(errorMsg, err)
    }
  })

  const result = {
    success: successCount > 0,
    message: `Emails envoyés: ${successCount}, erreurs: ${errorCount}`,
    successCount,
    errorCount,
    totalRecipients: recipients.length,
    attachmentsProcessed: emailAttachments.length,
    errors: errors.length > 0 ? errors : undefined
  }

  if (errorCount > 0) {
    console.warn(`⚠️ Envoi terminé avec ${errorCount} erreur(s)`, errors)
  } else {
    console.log(`✅ Envoi terminé avec succès: ${successCount} email(s) envoyé(s)`)
  }

  console.log('📊 Résultat final:', result)
  return jsonResponse(result)
}

function handleUploadPDF(body) {
  console.log('📤 handleUploadPDF appelé avec:', {
    folderId: body.folderId,
    fileName: body.fileName,
    fileDataLength: body.fileData?.length || 0,
    mimeType: body.mimeType,
  })

  // Vérifier le token
  const token = body.token || ''
  if (!token || token !== CONTACT_WEBHOOK_TOKEN) {
    console.error('❌ Token invalide ou manquant pour upload_pdf')
    return jsonResponse({ 
      success: false, 
      message: 'Unauthorized - Token invalide ou manquant' 
    })
  }

  const {
    folderId = '',
    fileName = 'document.pdf',
    fileData = '',
    mimeType = 'application/pdf',
  } = body

  if (!folderId) {
    throw new Error('folderId est requis pour upload_pdf')
  }

  if (!fileData || typeof fileData !== 'string' || fileData.length === 0) {
    throw new Error('fileData est requis et doit être une chaîne base64 non vide')
  }

  try {
    // Décoder les données base64
    const decodedBytes = Utilities.base64Decode(fileData)
    
    // Créer un blob avec les données décodées
    const blob = Utilities.newBlob(decodedBytes, mimeType, fileName)
    
    if (!blob) {
      throw new Error('Échec de la création du blob')
    }

    console.log(`📦 Blob créé: ${fileName} (${(decodedBytes.length / 1024).toFixed(2)} KB, ${mimeType})`)

    // Obtenir le dossier Google Drive
    let folder
    try {
      folder = DriveApp.getFolderById(folderId)
    } catch (folderErr) {
      throw new Error(`Impossible d'accéder au dossier Google Drive (ID: ${folderId}). Vérifiez que le script a les autorisations nécessaires et que l'ID du dossier est correct.`)
    }

    // Vérifier si un fichier avec le même nom existe déjà
    const existingFiles = folder.getFilesByName(fileName)
    if (existingFiles.hasNext()) {
      console.log(`⚠️ Fichier existant trouvé: ${fileName}, suppression de l'ancien fichier`)
      while (existingFiles.hasNext()) {
        const existingFile = existingFiles.next()
        existingFile.setTrashed(true)
      }
    }

    // Créer le fichier dans le dossier
    const file = folder.createFile(blob)
    
    // Rendre le fichier accessible via un lien partagé
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
    
    // Obtenir l'URL du fichier (URL de visualisation)
    const fileUrl = file.getUrl()
    
    // Obtenir l'ID du fichier pour créer une URL de partage directe
    const fileId = file.getId()
    
    // Créer une URL de partage directe (format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing)
    const shareableUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
    
    console.log(`✅ Fichier uploadé avec succès: ${fileName}`)
    console.log(`🔗 File ID: ${fileId}`)
    console.log(`🔗 URL de visualisation: ${fileUrl}`)
    console.log(`🔗 URL de partage: ${shareableUrl}`)

    return jsonResponse({
      success: true,
      message: `Fichier ${fileName} uploadé avec succès sur Google Drive`,
      fileUrl: shareableUrl, // Utiliser l'URL de partage directe
      fileId: fileId,
      folderId: folderId,
      size: decodedBytes.length,
      fileName: fileName,
    })
  } catch (error) {
    console.error('❌ Erreur upload PDF:', error)
    console.error('Stack:', error.stack)
    return jsonResponse({
      success: false,
      message: `Erreur lors de l'upload du PDF: ${error.message}`,
      error: error.toString(),
    })
  }
}

function handleFindPDFFile(body) {
  console.log('🔍 handleFindPDFFile appelé avec:', {
    folderId: body.folderId,
    fileName: body.fileName,
  })

  // Vérifier le token
  const token = body.token || ''
  if (!token || token !== CONTACT_WEBHOOK_TOKEN) {
    console.error('❌ Token invalide ou manquant pour find_pdf_file')
    return jsonResponse({ 
      success: false, 
      message: 'Unauthorized - Token invalide ou manquant' 
    })
  }

  const {
    folderId = '',
    fileName = '',
  } = body

  if (!folderId || !fileName) {
    return jsonResponse({
      success: false,
      message: 'folderId et fileName sont requis pour find_pdf_file',
    })
  }

  try {
    // Obtenir le dossier Google Drive
    let folder
    try {
      folder = DriveApp.getFolderById(folderId)
    } catch (folderErr) {
      throw new Error(`Impossible d'accéder au dossier Google Drive (ID: ${folderId})`)
    }

    // Chercher le fichier par nom
    const files = folder.getFilesByName(fileName)
    
    if (!files.hasNext()) {
      console.log(`⚠️ Fichier non trouvé: ${fileName}`)
      return jsonResponse({
        success: false,
        message: `Fichier ${fileName} non trouvé dans le dossier`,
      })
    }

    // Prendre le premier fichier trouvé
    const file = files.next()
    const fileId = file.getId()
    const shareableUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
    
    console.log(`✅ Fichier trouvé: ${fileName}`)
    console.log(`🔗 File ID: ${fileId}`)
    console.log(`🔗 URL: ${shareableUrl}`)

    return jsonResponse({
      success: true,
      message: `Fichier ${fileName} trouvé sur Google Drive`,
      fileUrl: shareableUrl,
      fileId: fileId,
      fileName: fileName,
      folderId: folderId,
    })
  } catch (error) {
    console.error('❌ Erreur recherche PDF:', error)
    return jsonResponse({
      success: false,
      message: `Erreur lors de la recherche du PDF: ${error.message}`,
      error: error.toString(),
    })
  }
}

function buildHtmlEmail(params) {
  // Google Apps Script ne supporte pas les paramètres par défaut dans les destructurations
  const title = params.title || ''
  const intro = params.intro || ''
  const paragraphs = params.paragraphs || []
  const recap = params.recap || []
  const messageBlock = params.messageBlock || ''
  const footer = params.footer || ''
  const recapHtml = recap
    .map(
      ({ label, value }) => `
        <div style="margin-bottom:8px;">
          <span style="font-weight:600;color:${BRAND_COLOR};">${sanitize(label)} :</span>
          <span style="color:#0f172a;">${sanitize(value)}</span>
        </div>
      `
    )
    .join('')

  // Pour les paragraphes, on permet du HTML sécurisé (strong, em, br, a)
  const paragraphsHtml = paragraphs.map((p) => {
    const safeHtml = sanitizeHtml(p)
    return `<p style="margin:0 0 12px 0;color:#0f172a;">${safeHtml}</p>`
  }).join('')

  // Pour messageBlock, on permet du HTML sécurisé
  const messageHtml = messageBlock
    ? `
        <div style="margin-top:12px;padding:16px;border-left:4px solid ${ACCENT_COLOR};background:#f8fafc;color:#0f172a;border-radius:8px;">
          ${sanitizeHtml(messageBlock.replace(/\n/g, '<br/>'))}
        </div>
      `
    : ''

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="font-family:'Inter',Helvetica,Arial,sans-serif;background:#f4f6fb;padding:32px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;box-shadow:0 10px 25px rgba(13,71,161,0.15);overflow:hidden;">
          <div style="background:${BRAND_COLOR};padding:28px 32px;color:white;">
            <h1 style="margin:0;font-size:22px;">${sanitize(title)}</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px 0;color:#0f172a;font-size:16px;">${sanitize(intro)}</p>
            ${paragraphsHtml}
            ${recapHtml}
            ${messageHtml}
            <p style="margin:24px 0 0 0;color:#475569;">${sanitize(footer)}</p>
          </div>
          <div style="background:#0f172a;color:#e2e8f0;padding:20px 32px;text-align:center;font-size:13px;">
            Association des Géomaticiens Sénégalais de France<br/>
            <span style="color:#94a3b8;">Ensemble, cartographions demain</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Sanitize du texte simple (échappe tout le HTML)
 */
function sanitize(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitize du HTML en permettant certains tags sécurisés (strong, em, br, a, etc.)
 * Cette fonction préserve les tags HTML autorisés et échappe le reste
 */
function sanitizeHtml(html) {
  if (!html) return ''
  let text = String(html)
  
  // Protéger les tags autorisés avec des placeholders
  const placeholders = {}
  const allowedTags = ['strong', 'em', 'br', 'a', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code']
  let placeholderIndex = 0
  
  // Fonction pour créer un placeholder unique
  const createPlaceholder = () => {
    const key = `__TAG_PLACEHOLDER_${placeholderIndex}__`
    placeholderIndex++
    return key
  }
  
  // Remplacer les tags autorisés (avec leurs attributs) par des placeholders
  allowedTags.forEach(tag => {
    // Tags ouverts avec attributs possibles (surtout pour <a href="...">)
    const openTagRegex = new RegExp(`<${tag}(\\s+[^>]*)?>`, 'gi')
    text = text.replace(openTagRegex, (match) => {
      const key = createPlaceholder()
      placeholders[key] = match
      return key
    })
    
    // Tags de fermeture
    const closeTagRegex = new RegExp(`</${tag}>`, 'gi')
    text = text.replace(closeTagRegex, (match) => {
      const key = createPlaceholder()
      placeholders[key] = match
      return key
    })
  })
  
  // Sanitizer le reste (échapper le HTML restant qui pourrait être malveillant)
  text = sanitize(text)
  
  // Remettre les tags autorisés à leur place
  Object.keys(placeholders).forEach(key => {
    text = text.replace(key, placeholders[key])
  })
  
  return text
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  )
}

