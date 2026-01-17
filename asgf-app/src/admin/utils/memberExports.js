// Utilitaires pour l'export Excel et PDF des membres

/**
 * Export Excel des membres
 */
export function exportMembersToExcel(members) {
  const headers = [
    'ID',
    'Numéro membre',
    'Prénom',
    'Nom',
    'Email',
    'Téléphone',
    'Pays',
    'Ville',
    'Adresse',
    'Domaine',
    'Niveau',
    'Statut',
    'Date adhésion',
    'Date création'
  ]

  const rows = members.map(member => {
    // Récupérer le statut (peut être 'status' ou 'statut' selon la source)
    const status = member.status || member.statut || 'pending'
    // Convertir le statut en libellé français
    let statusLabel = 'En attente'
    if (status === 'approved' || status === 'approuvé') {
      statusLabel = 'Approuvé'
    } else if (status === 'rejected' || status === 'rejeté') {
      statusLabel = 'Rejeté'
    } else if (status === 'pending' || status === 'en_attente') {
      statusLabel = 'En attente'
    }
    
    return [
      member.id,
      member.numero_membre || '',
      member.prenom || '',
      member.nom || '',
      member.email || '',
      member.telephone || '',
      member.pays || '',
      member.ville || '',
      member.adresse || '',
      member.domaine || '',
      member.niveau || '',
      statusLabel,
      member.date_adhesion ? new Date(member.date_adhesion).toLocaleDateString('fr-FR') : '',
      member.created_at ? new Date(member.created_at).toLocaleDateString('fr-FR') : ''
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
  link.setAttribute('download', `membres-asgf-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export PDF des membres
 */
export function exportMembersToPDF(members) {
  const now = new Date()
  const dateLabel = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  
  // Statistiques
  const totalMembers = members.length
  const approvedMembers = members.filter(m => {
    const status = m.status || m.statut || 'pending'
    return status === 'approved' || status === 'approuvé'
  }).length
  const pendingMembers = members.filter(m => {
    const status = m.status || m.statut || 'pending'
    return status === 'pending' || status === 'en_attente'
  }).length
  const rejectedMembers = members.filter(m => {
    const status = m.status || m.statut || 'pending'
    return status === 'rejected' || status === 'rejeté'
  }).length

  // Créer le HTML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Liste des Membres ASGF - ${dateLabel}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          color: #0f172a;
          background: #ffffff;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #2563eb;
          font-size: 2rem;
          margin-bottom: 10px;
        }
        .header p {
          color: #475467;
          font-size: 0.95rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 0.9rem;
          color: #475467;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 0.85rem;
        }
        thead {
          background: #2563eb;
          color: #ffffff;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.5px;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e4e7ec;
        }
        tbody tr:hover {
          background: #f8fafc;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-approved {
          background: #dcfce7;
          color: #16a34a;
        }
        .status-pending {
          background: #fef3c7;
          color: #ca8a04;
        }
        .status-rejected {
          background: #fee2e2;
          color: #dc2626;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e4e7ec;
          text-align: center;
          color: #475467;
          font-size: 0.85rem;
        }
        @media print {
          body {
            padding: 20px;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Association des Sénégalais Géomaticiens en France</h1>
        <p>Liste des Membres - ${dateLabel}</p>
        <p>Généré le : ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totalMembers}</div>
          <div class="stat-label">Total membres</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${approvedMembers}</div>
          <div class="stat-label">Approuvés</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${pendingMembers}</div>
          <div class="stat-label">En attente</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${rejectedMembers}</div>
          <div class="stat-label">Rejetés</div>
        </div>
      </div>

      <h2>Détail des membres</h2>
      <table>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Prénom</th>
            <th>Nom</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Pays</th>
            <th>Ville</th>
            <th>Domaine</th>
            <th>Statut</th>
            <th>Date adhésion</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(member => {
            // Récupérer le statut (peut être 'status' ou 'statut' selon la source)
            const statut = member.status || member.statut || 'pending'
            const statusClass = statut === 'approved' || statut === 'approuvé' ? 'status-approved' 
              : statut === 'rejected' || statut === 'rejeté' ? 'status-rejected' 
              : 'status-pending'
            const statusLabel = statut === 'approved' || statut === 'approuvé' ? 'Approuvé'
              : statut === 'rejected' || statut === 'rejeté' ? 'Rejeté'
              : 'En attente'
            
            return `
              <tr>
                <td>${member.numero_membre || '—'}</td>
                <td>${member.prenom || '—'}</td>
                <td>${member.nom || '—'}</td>
                <td>${member.email || '—'}</td>
                <td>${member.telephone || '—'}</td>
                <td>${member.pays || '—'}</td>
                <td>${member.ville || '—'}</td>
                <td>${member.domaine || '—'}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${member.date_adhesion ? new Date(member.date_adhesion).toLocaleDateString('fr-FR') : '—'}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Association des Sénégalais Géomaticiens en France (ASGF)</p>
        <p>Ce rapport a été généré automatiquement depuis le système de gestion des adhésions</p>
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
  }, 500)
}

