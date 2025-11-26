// Utilitaires pour l'export Excel et PDF des formations

/**
 * Export Excel des formations
 */
export function exportFormationsToExcel(formations, sessions, inscriptions, formateurs) {
  // Créer un workbook simple en CSV (compatible Excel)
  const headers = [
    'ID',
    'Titre',
    'Catégorie',
    'Niveau',
    'Mode',
    'Durée (heures)',
    'Prix (€)',
    'Participants max',
    'Formateurs',
    'Sessions',
    'Inscriptions totales',
    'Inscriptions confirmées',
    'Revenus estimés (€)',
    'Statut',
    'Date création'
  ]

  const rows = formations.map(formation => {
    const formationFormateurs = formateurs.filter(f => 
      formation.formateurs_list?.some(ff => ff.id === f.id) || 
      formation.formateur_id === f.id
    )
    const formationSessions = sessions.filter(s => s.formation_id === formation.id)
    const formationInscriptions = inscriptions.filter(i => i.formation_id === formation.id)
    const confirmedInscriptions = formationInscriptions.filter(i => i.status === 'confirmed')
    const revenus = confirmedInscriptions.length * (formation.prix || 0)

    return [
      formation.id,
      formation.titre || '',
      formation.categorie || '',
      formation.niveau || '',
      formation.mode || '',
      formation.duree_heures || '',
      formation.prix || 0,
      formation.participants_max || '',
      formationFormateurs.map(f => `${f.prenom} ${f.nom}`).join(', ') || '',
      formationSessions.length,
      formationInscriptions.length,
      confirmedInscriptions.length,
      revenus.toFixed(2),
      formation.is_active ? 'Active' : 'Inactive',
      formation.created_at ? new Date(formation.created_at).toLocaleDateString('fr-FR') : ''
    ]
  })

  // Convertir en CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  // Télécharger
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `formations-asgf-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export Excel des inscriptions
 */
export function exportInscriptionsToExcel(inscriptions, formations) {
  const headers = [
    'ID',
    'Prénom',
    'Nom',
    'Email',
    'Formation',
    'Session',
    'Niveau',
    'Niveau d\'étude',
    'Statut',
    'Paiement',
    'Date inscription',
    'Date confirmation'
  ]

  const rows = inscriptions.map(inscription => {
    const formation = formations.find(f => f.id === inscription.formation_id)
    return [
      inscription.id,
      inscription.prenom || '',
      inscription.nom || '',
      inscription.email || '',
      formation?.titre || '',
      inscription.session_id || '',
      inscription.niveau || '',
      inscription.niveau_etude || '',
      inscription.status || 'pending',
      inscription.paiement_status || 'non payé',
      inscription.created_at ? new Date(inscription.created_at).toLocaleDateString('fr-FR') : '',
      inscription.confirmed_at ? new Date(inscription.confirmed_at).toLocaleDateString('fr-FR') : ''
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `inscriptions-asgf-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export PDF des formations (rapport mensuel/annuel)
 */
export function exportFormationsToPDF(formations, sessions, inscriptions, formateurs, period = 'month') {
  // Créer un document HTML qui sera converti en PDF
  const now = new Date()
  const periodLabel = period === 'month' 
    ? `${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
    : `${now.getFullYear()}`

  // Filtrer les données selon la période
  const startDate = period === 'month' 
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), 0, 1)
  
  const filteredInscriptions = inscriptions.filter(i => {
    const date = new Date(i.created_at)
    return date >= startDate
  })

  const filteredSessions = sessions.filter(s => {
    const date = new Date(s.date_debut)
    return date >= startDate
  })

  // Calculer les statistiques
  const totalRevenus = filteredInscriptions
    .filter(i => i.status === 'confirmed')
    .reduce((sum, i) => {
      const formation = formations.find(f => f.id === i.formation_id)
      return sum + (formation?.prix || 0)
    }, 0)

  const tauxRemplissage = formations.reduce((sum, f) => {
    const formationInscriptions = filteredInscriptions.filter(i => i.formation_id === f.id && i.status === 'confirmed')
    const max = f.participants_max || 0
    if (max === 0) return sum
    return sum + (formationInscriptions.length / max * 100)
  }, 0) / formations.length

  // Créer le HTML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport Formations ASGF - ${periodLabel}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #0066CC;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #0066CC;
          margin: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 30px 0;
        }
        .stat-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background: #f9f9f9;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #0066CC;
        }
        .stat-label {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #0066CC;
          color: white;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Rapport Formations ASGF</h1>
        <p>Période : ${periodLabel}</p>
        <p>Généré le : ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${formations.length}</div>
          <div class="stat-label">Formations actives</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${filteredInscriptions.length}</div>
          <div class="stat-label">Inscriptions (période)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${filteredInscriptions.filter(i => i.status === 'confirmed').length}</div>
          <div class="stat-label">Inscriptions confirmées</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalRevenus.toFixed(2)} €</div>
          <div class="stat-label">Revenus estimés</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${tauxRemplissage.toFixed(1)}%</div>
          <div class="stat-label">Taux de remplissage moyen</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formateurs.length}</div>
          <div class="stat-label">Formateurs actifs</div>
        </div>
      </div>

      <h2>Détail des formations</h2>
      <table>
        <thead>
          <tr>
            <th>Titre</th>
            <th>Catégorie</th>
            <th>Formateurs</th>
            <th>Inscriptions</th>
            <th>Revenus (€)</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${formations.map(formation => {
            const formationFormateurs = formateurs.filter(f => 
              formation.formateurs_list?.some(ff => ff.id === f.id) || 
              formation.formateur_id === f.id
            )
            const formationInscriptions = filteredInscriptions.filter(i => i.formation_id === formation.id)
            const confirmedInscriptions = formationInscriptions.filter(i => i.status === 'confirmed')
            const revenus = confirmedInscriptions.length * (formation.prix || 0)

            return `
              <tr>
                <td>${formation.titre || ''}</td>
                <td>${formation.categorie || ''}</td>
                <td>${formationFormateurs.map(f => `${f.prenom} ${f.nom}`).join(', ') || 'Aucun'}</td>
                <td>${confirmedInscriptions.length} / ${formationInscriptions.length}</td>
                <td>${revenus.toFixed(2)}</td>
                <td>${formation.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Association des Sénégalais Géomaticiens en France (ASGF)</p>
        <p>Ce rapport a été généré automatiquement depuis le système de gestion des formations</p>
      </div>
    </body>
    </html>
  `

  // Ouvrir dans une nouvelle fenêtre pour impression
  const printWindow = window.open('', '_blank')
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  
  // Attendre que le contenu soit chargé puis imprimer
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

/**
 * Export Excel des formateurs
 */
export function exportFormateursToExcel(formateurs, formations, inscriptions) {
  const headers = [
    'ID',
    'Prénom',
    'Nom',
    'Email',
    'Statut',
    'Formations enseignées',
    'Nombre de formations',
    'Inscriptions totales',
    'Date création'
  ]

  const rows = formateurs.map(formateur => {
    // Trouver les formations associées
    const formateurFormations = formations.filter(f => 
      f.formateurs_list?.some(ff => ff.id === formateur.id) || 
      f.formateur_id === formateur.id
    )
    const formateurInscriptions = inscriptions.filter(i => 
      formateurFormations.some(f => f.id === i.formation_id)
    )

    return [
      formateur.id,
      formateur.prenom || '',
      formateur.nom || '',
      formateur.email || '',
      formateur.statut === 'membre' ? 'Membre ASGF' : 'Personne extérieure',
      formateurFormations.map(f => f.titre).join('; ') || 'Aucune',
      formateurFormations.length,
      formateurInscriptions.length,
      formateur.created_at ? new Date(formateur.created_at).toLocaleDateString('fr-FR') : ''
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `formateurs-asgf-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


