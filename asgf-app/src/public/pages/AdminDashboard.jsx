import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase.config'
import emailjs from '@emailjs/browser'
import { EMAILJS_CONFIG } from '../config/emailjs.config'

function AdminDashboard() {
  const [pendingMembers, setPendingMembers] = useState([])
  const [approvedMembers, setApprovedMembers] = useState([])
  const [rejectedMembers, setRejectedMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'approved' | 'rejected'

  // 🔎 Recherche + filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [filterUniversite, setFilterUniversite] = useState('all')
  const [filterPays, setFilterPays] = useState('all')
  const [filterNiveau, setFilterNiveau] = useState('all')

  const fetchMembers = async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .in('status', ['pending', 'approved', 'rejected'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching members:', error)
      setError("Impossible de charger les membres.")
      setLoading(false)
      return
    }

    const all = data || []
    setPendingMembers(all.filter(m => m.status === 'pending'))
    setApprovedMembers(all.filter(m => m.status === 'approved'))
    setRejectedMembers(all.filter(m => m.status === 'rejected'))

    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const sendDecisionEmails = async (member, newStatus) => {
    const statusLabel = newStatus === 'approved' ? 'acceptée' : 'refusée'

    // 1) Mail au MEMBRE
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateIdMember,
        {
          email: member.email,
          to_email: member.email,
          to_name: `${member.prenom} ${member.nom}`,
          custom_message:
            statusLabel === 'acceptée'
              ? "Bonne nouvelle ! Votre demande d’adhésion à l’ASGF a été acceptée 🎉."
              : "Après étude de votre demande, nous vous informons qu’elle a été refusée.",
        },
        EMAILJS_CONFIG.publicKey
      )
    } catch (err) {
      console.error("Erreur mail décision (membre) :", err)
    }

    // 2) Mail à l’ADMIN
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateIdAdmin,
        {
          admin_email: 'association.geomaticiens.sf@gmail.com',
          nom: member.nom,
          prenom: member.prenom,
          email: member.email,
          telephone: member.telephone,
          universite: member.universite,
          niveau: member.niveau,
          custom_message: `Décision prise : adhésion ${statusLabel}.`,
        },
        EMAILJS_CONFIG.publicKey
      )
    } catch (err) {
      console.error("Erreur mail décision (admin) :", err)
    }
  }

  const updateMemberStatus = async (member, newStatus) => {
    setActionLoadingId(member.id)
    setError(null)

    const { error } = await supabase
      .from('members')
      .update({
        status: newStatus,
        validated_at: new Date().toISOString()
      })
      .eq('id', member.id)

    if (error) {
      console.error('Error updating member status:', error)
      setError("Erreur lors de la mise à jour du statut.")
    } else {
      await fetchMembers()
      await sendDecisionEmails(member, newStatus)
    }

    setActionLoadingId(null)
  }

  // 🔎 Fonction pour appliquer recherche + filtres
  const applyFilters = (list) => {
    const term = searchTerm.toLowerCase().trim()

    return list.filter(member => {
      // Recherche globale
      if (term) {
        const text =
          `${member.nom || ''} ${member.prenom || ''} ${member.email || ''} ${member.universite || ''} ${member.specialite || ''}`.toLowerCase()
        if (!text.includes(term)) return false
      }

      // Filtres
      if (filterUniversite !== 'all' && member.universite !== filterUniversite) return false
      if (filterPays !== 'all' && member.pays !== filterPays) return false
      if (filterNiveau !== 'all' && member.niveau !== filterNiveau) return false

      return true
    })
  }

  // 🔢 listes uniques pour les selects
  const getUniqueValues = (field) => {
    const all = [...pendingMembers, ...approvedMembers, ...rejectedMembers]
    const values = all
      .map(m => m[field])
      .filter(v => v && v.trim() !== '')
    return Array.from(new Set(values)).sort()
  }

  const universitesOptions = getUniqueValues('universite')
  const paysOptions = getUniqueValues('pays')
  const niveauxOptions = getUniqueValues('niveau')

  // 📤 Export CSV du tableau courant (onglet + filtres)
  const handleExport = () => {
    let currentList = []
    if (activeTab === 'pending') currentList = applyFilters(pendingMembers)
    if (activeTab === 'approved') currentList = applyFilters(approvedMembers)
    if (activeTab === 'rejected') currentList = applyFilters(rejectedMembers)

    if (currentList.length === 0) {
      alert("Aucun membre à exporter pour cette vue.")
      return
    }

    const headers = [
      'Nom',
      'Prénom',
      'Email',
      'Téléphone',
      'Université',
      'Pays',
      'Niveau',
      'Spécialité',
      'Motivation',
      'Statut'
    ]

    const rows = currentList.map(m => [
      m.nom || '',
      m.prenom || '',
      m.email || '',
      m.telephone || '',
      m.universite || '',
      m.pays || '',
      m.niveau || '',
      m.specialite || '',
      (m.motivation || '').replace(/\r?\n/g, ' '),
      m.status || ''
    ])

    const csvContent = [headers, ...rows]
      .map(row =>
        row
          .map(value => {
            const v = String(value).replace(/"/g, '""')
            return `"${v}"`
          })
          .join(';')
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const label =
      activeTab === 'pending'
        ? 'en_attente'
        : activeTab === 'approved'
        ? 'valides'
        : 'refuses'
    a.href = url
    a.download = `asgf_membres_${label}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderMemberCard = (member, withActions = false) => (
    <div
      key={member.id}
      style={{
        borderRadius: '12px',
        padding: '16px 18px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
        backgroundColor: '#fff',
        border: '1px solid #eee',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
            {member.prenom} {member.nom}
          </h2>
          <p style={{ margin: '4px 0', color: '#555', fontSize: '0.9rem' }}>
            <strong>Email :</strong> {member.email} • <strong>Tél :</strong> {member.telephone}
          </p>
          <p style={{ margin: '4px 0', color: '#777', fontSize: '0.85rem' }}>
            <strong>Université :</strong> {member.universite} •{' '}
            <strong>Pays :</strong> {member.pays || '—'} •{' '}
            <strong>Niveau :</strong> {member.niveau} •{' '}
            <strong>Spécialité :</strong> {member.specialite}
          </p>
          {member.motivation && (
            <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#444' }}>
              <strong>Motivation :</strong> {member.motivation}
            </p>
          )}
        </div>

        {withActions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
            <button
              onClick={() => updateMemberStatus(member, 'approved')}
              disabled={actionLoadingId === member.id}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                backgroundColor: '#16a34a',
                color: 'white'
              }}
            >
              {actionLoadingId === member.id ? 'Validation…' : '✅ Valider'}
            </button>
            <button
              onClick={() => updateMemberStatus(member, 'rejected')}
              disabled={actionLoadingId === member.id}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                border: '1px solid #e11d48',
                cursor: 'pointer',
                fontSize: '0.9rem',
                backgroundColor: 'white',
                color: '#e11d48'
              }}
            >
              {actionLoadingId === member.id ? 'Traitement…' : '❌ Refuser'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderList = () => {
    if (loading) return <p>Chargement des membres…</p>

    if (activeTab === 'pending') {
      const list = applyFilters(pendingMembers)
      if (list.length === 0) return <p>Aucun membre en attente de validation ✅</p>
      return (
        <div style={{ display: 'grid', gap: '16px' }}>
          {list.map(m => renderMemberCard(m, true))}
        </div>
      )
    }

    if (activeTab === 'approved') {
      const list = applyFilters(approvedMembers)
      if (list.length === 0) return <p>Aucun membre validé pour le moment.</p>
      return (
        <div style={{ display: 'grid', gap: '16px' }}>
          {list.map(m => renderMemberCard(m, false))}
        </div>
      )
    }

    if (activeTab === 'rejected') {
      const list = applyFilters(rejectedMembers)
      if (list.length === 0) return <p>Aucun membre refusé.</p>
      return (
        <div style={{ display: 'grid', gap: '16px' }}>
          {list.map(m => renderMemberCard(m, false))}
        </div>
      )
    }

    return null
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>
        Dashboard Admin – Vue globale des membres
      </h1>
      <p style={{ marginBottom: '20px', color: '#555' }}>
        Ici, les admins, trésoriers et secrétaires peuvent voir les membres en attente, validés et refusés.
      </p>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#ffe5e5',
            color: '#b41616',
            fontSize: '0.9rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            backgroundColor: activeTab === 'pending' ? '#1d4ed8' : '#e5e7eb',
            color: activeTab === 'pending' ? 'white' : '#111827'
          }}
        >
          ⏳ En attente ({pendingMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            backgroundColor: activeTab === 'approved' ? '#16a34a' : '#e5e7eb',
            color: activeTab === 'approved' ? 'white' : '#111827'
          }}
        >
          ✅ Validés ({approvedMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            backgroundColor: activeTab === 'rejected' ? '#e11d48' : '#e5e7eb',
            color: activeTab === 'rejected' ? 'white' : '#111827'
          }}
        >
          ❌ Refusés ({rejectedMembers.length})
        </button>
      </div>

      {/* Barre de recherche + filtres + export */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '20px',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          placeholder="Rechercher (nom, prénom, email, université, spécialité...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9rem'
          }}
        />

        <select
          value={filterUniversite}
          onChange={(e) => setFilterUniversite(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9rem'
          }}
        >
          <option value="all">Université (toutes)</option>
          {universitesOptions.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <select
          value={filterPays}
          onChange={(e) => setFilterPays(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9rem'
          }}
        >
          <option value="all">Pays (tous)</option>
          {paysOptions.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={filterNiveau}
          onChange={(e) => setFilterNiveau(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9rem'
          }}
        >
          <option value="all">Niveau (tous)</option>
          {niveauxOptions.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <button
          onClick={handleExport}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            backgroundColor: '#0f766e',
            color: 'white',
            whiteSpace: 'nowrap'
          }}
        >
          📤 Exporter en Excel
        </button>
      </div>

      {renderList()}
    </div>
  )
}

export default AdminDashboard
