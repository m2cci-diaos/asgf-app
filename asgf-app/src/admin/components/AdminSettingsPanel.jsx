import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAdminsList,
  createAdminAccount,
  updateAdminAccount,
  updateAdminAccess,
  suspendAdminAccount,
  fetchAdminModulesCatalog,
  fetchAllBureauMembers,
  createBureauMember,
  updateBureauMember,
  deleteBureauMember,
  uploadBureauMemberPhoto,
  fetchAllMembers,
} from '../services/api'
import './AdminSettingsPanel.css'

const initialFormState = {
  numero_membre: '',
  email: '',
  password: '',
  role_type: 'admin',
  is_master: false,
  modules: [],
  super_scope: [],
}

const formatStatus = (admin) => {
  if (!admin.is_active) {
    return { label: 'Désactivé', tone: 'danger' }
  }
  if (admin.disabled_until) {
    const disabledDate = new Date(admin.disabled_until)
    if (disabledDate > new Date()) {
      return { label: `Suspendu jusqu'au ${disabledDate.toLocaleString('fr-FR')}`, tone: 'warning' }
    }
  }
  return { label: 'Actif', tone: 'success' }
}

const AdminSettingsPanel = ({ currentAdmin }) => {
  const [activeTab, setActiveTab] = useState('admins') // 'admins' ou 'bureau'
  
  // États pour les administrateurs
  const [admins, setAdmins] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 })
  const [search, setSearch] = useState('')
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [formData, setFormData] = useState(initialFormState)
  const [feedback, setFeedback] = useState(null)
  const [modulesCatalog, setModulesCatalog] = useState([])
  const [modulesModal, setModulesModal] = useState(null) // { admin, selection: [] }
  const [pageSize] = useState(10)
  const [membersList, setMembersList] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')

  // États pour le Bureau & Équipe
  const [activeSegment, setActiveSegment] = useState('liste') // 'liste', 'ajouter', 'modifier', 'photos'
  const [bureauMembers, setBureauMembers] = useState([])
  const [loadingBureau, setLoadingBureau] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [selectedMemberForPhoto, setSelectedMemberForPhoto] = useState(null)
  const [bureauFormData, setBureauFormData] = useState({
    prenom: '',
    nom: '',
    nom_affichage: '',
    role_court: '',
    role_long: '',
    categorie: 'direction',
    pole_nom: '',
    email: '',
    phone: '',
    linkedin_url: '',
    other_url: '',
    ordre: 100,
    highlight: false,
    photo_url: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const roleOptions = [
    { value: 'PRESIDENT', label: 'Président' },
    { value: 'VICE-PRESIDENT', label: 'Vice-président' },
    { value: 'SECRETAIRE', label: 'Secrétaire général' },
    { value: 'TRESORIER', label: 'Trésorier' },
    { value: 'MEMBRE_BUREAU', label: 'Membre du Bureau Exécutif' },
    { value: 'RESPONSABLE_POLE', label: 'Responsable de pôle' },
    { value: 'CO_RESPONSABLE', label: 'Co-responsable' },
    { value: 'AUTRE', label: 'Autre' },
  ]

  const loadAdmins = useCallback(
    async ({ page: targetPage = 1, searchTerm = search } = {}) => {
      setLoadingAdmins(true)
      try {
        const { admins: list, pagination: meta } = await fetchAdminsList({
          page: targetPage,
          limit: pageSize,
          search: searchTerm.trim(),
        })
        setAdmins(list)
        setPagination(meta)
      } catch (error) {
        console.error('fetchAdminsList error', error)
        setFeedback({ type: 'error', message: error.message || 'Impossible de charger les administrateurs' })
      } finally {
        setLoadingAdmins(false)
      }
    },
    [pageSize, search]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAdmins({ page: 1, searchTerm: search })
    }, 300)
    return () => {
      clearTimeout(timer)
    }
  }, [search, loadAdmins])

  useEffect(() => {
    loadAdmins({ page: 1, searchTerm: '' })
    const fetchModules = async () => {
      try {
        const modules = await fetchAdminModulesCatalog()
        setModulesCatalog(modules)
      } catch (error) {
        console.warn('Impossible de charger les modules', error)
      }
    }
    const loadMembers = async () => {
      setLoadingMembers(true)
      try {
        // Récupérer tous les membres (limite max: 500)
        // Si plus de 500 membres, on récupère les 500 premiers
        let allMembers = []
        let page = 1
        let hasMore = true
        
        while (hasMore && page <= 5) { // Limiter à 5 pages max (2500 membres max)
          const members = await fetchAllMembers({ limit: 500, page })
          const membersArray = Array.isArray(members) ? members : []
          allMembers.push(...membersArray)
          hasMore = membersArray.length === 500
          page++
        }
        
        setMembersList(allMembers)
      } catch (error) {
        console.warn('Impossible de charger les membres', error)
        setMembersList([])
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchModules()
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleMemberSelect = (memberId) => {
    setSelectedMemberId(memberId)
    if (memberId) {
      const selectedMember = membersList.find((m) => m.id === memberId)
      if (selectedMember) {
        setFormData((prev) => ({
          ...prev,
          numero_membre: selectedMember.numero_membre || '',
          email: selectedMember.email || '',
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        numero_membre: '',
        email: '',
      }))
    }
  }

  const toggleFormModule = (moduleName, field = 'modules') => {
    setFormData((prev) => {
      const current = prev[field] || []
      const exists = current.includes(moduleName)
      return {
        ...prev,
        [field]: exists ? current.filter((m) => m !== moduleName) : [...current, moduleName],
      }
    })
  }

  const handleCreateAdmin = async (event) => {
    event.preventDefault()
    setCreatingAdmin(true)
    setFeedback(null)
    try {
      const payload = {
        numero_membre: formData.numero_membre.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role_type: formData.is_master ? 'superadmin' : formData.role_type,
        is_master: formData.is_master,
        modules: formData.role_type === 'admin' ? formData.modules : [],
        super_scope:
          formData.role_type === 'superadmin' && !formData.is_master ? formData.super_scope : [],
      }

      await createAdminAccount(payload)
      setFeedback({ type: 'success', message: 'Administrateur créé avec succès' })
      setFormData(initialFormState)
      setSelectedMemberId('')
      await loadAdmins({ page: 1, searchTerm: search })
    } catch (error) {
      console.error('createAdminAccount error', error)
      setFeedback({ type: 'error', message: error.message || 'Création impossible' })
    } finally {
      setCreatingAdmin(false)
    }
  }

  const openModulesModal = (admin) => {
    const isScope = admin.role_type === 'superadmin' && !admin.is_master
    setModulesModal({
      admin,
      mode: isScope ? 'scope' : 'modules',
      selection: isScope ? admin.super_scope || [] : (admin.modules || []).map((m) => m.module),
    })
  }

  const handleSaveModules = async () => {
    if (!modulesModal) return
    try {
      if (modulesModal.mode === 'scope') {
        await updateAdminAccount(modulesModal.admin.id, { super_scope: modulesModal.selection })
        setFeedback({ type: 'success', message: 'Portée du superadmin mise à jour' })
      } else {
        await updateAdminAccess(modulesModal.admin.id, modulesModal.selection)
        setFeedback({ type: 'success', message: 'Modules mis à jour' })
      }
      setModulesModal(null)
      await loadAdmins({ page: pagination.page, searchTerm: search })
    } catch (error) {
      console.error('updateAdminAccess error', error)
      setFeedback({ type: 'error', message: error.message || 'Impossible de mettre à jour les modules' })
    }
  }

  const handleSuspend = async (admin, hours) => {
    const disabledUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    try {
      await suspendAdminAccount(admin.id, {
        reason: `Suspension ${hours}h`,
        disabledUntil,
      })
      setFeedback({ type: 'success', message: `Admin suspendu pour ${hours}h` })
      await loadAdmins({ page: pagination.page, searchTerm: search })
    } catch (error) {
      console.error('suspendAdminAccount error', error)
      setFeedback({ type: 'error', message: error.message || 'Impossible de suspendre cet admin' })
    }
  }

  const handleDeactivate = async (admin) => {
    if (!window.confirm('Confirmer la désactivation définitive de cet admin ?')) return
    try {
      await suspendAdminAccount(admin.id, {
        reason: 'Désactivation par un superadmin',
      })
      setFeedback({ type: 'success', message: 'Administrateur désactivé' })
      await loadAdmins({ page: pagination.page, searchTerm: search })
    } catch (error) {
      console.error('deactivate admin error', error)
      setFeedback({ type: 'error', message: error.message || 'Impossible de désactiver cet admin' })
    }
  }

  const handleReactivate = async (admin) => {
    try {
      await updateAdminAccount(admin.id, {
        is_active: true,
        disabled_until: null,
        disabled_reason: null,
      })
      setFeedback({ type: 'success', message: 'Administrateur réactivé' })
      await loadAdmins({ page: pagination.page, searchTerm: search })
    } catch (error) {
      console.error('reactivate admin error', error)
      setFeedback({ type: 'error', message: error.message || 'Impossible de réactiver cet admin' })
    }
  }

  const roleLabel = (admin) => {
    if (admin.is_master) return 'Superadmin global'
    if (admin.role_type === 'superadmin') return 'Superadmin'
    return 'Admin'
  }

  // Fonctions pour le Bureau & Équipe
  const loadBureauMembers = useCallback(async () => {
    setLoadingBureau(true)
    try {
      const data = await fetchAllBureauMembers()
      setBureauMembers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur chargement bureau:', err)
      setFeedback({ type: 'error', message: 'Erreur lors du chargement des membres du bureau' })
      setBureauMembers([])
    } finally {
      setLoadingBureau(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'bureau') {
      loadBureauMembers()
    }
  }, [activeTab, loadBureauMembers])

  const handlePhotoUpload = async (file, memberId) => {
    if (!file) return null

    try {
      setUploadingPhoto(true)
      
      // Convertir le fichier en base64
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Upload via le backend (qui utilise service_role)
      const result = await uploadBureauMemberPhoto(memberId, fileBase64, file.name)
      
      if (result.success && result.data?.photo_url) {
        return result.data.photo_url
      } else {
        throw new Error(result.message || 'Erreur lors de l\'upload')
      }
    } catch (err) {
      console.error('Erreur upload photo:', err)
      throw err
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleBureauSubmit = async (e) => {
    e.preventDefault()
    setUploadingPhoto(true)

    try {
      let memberId = editingId

      // Si création, créer d'abord le membre pour obtenir l'ID
      if (!memberId) {
        const newMember = await createBureauMember({
          ...bureauFormData,
          photo_url: null, // Sera mis à jour après l'upload
        })
        memberId = newMember.id
      }

      // Upload de la photo si un fichier est sélectionné
      let photoUrl = bureauFormData.photo_url
      if (photoFile) {
        photoUrl = await handlePhotoUpload(photoFile, memberId)
      }

      // Mettre à jour le membre avec la photo_url
      const updateData = { ...bureauFormData }
      if (photoUrl) {
        updateData.photo_url = photoUrl
      }

      if (memberId) {
        await updateBureauMember(memberId, updateData)
      }

      setFeedback({ type: 'success', message: editingId ? 'Membre mis à jour avec succès !' : 'Membre créé avec succès !' })
      setActiveSegment('liste')
      resetBureauForm()
      await loadBureauMembers()
    } catch (err) {
      console.error('Erreur:', err)
      setFeedback({ type: 'error', message: 'Erreur : ' + (err.message || 'Erreur lors de l\'opération') })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleBureauEdit = (member) => {
    setEditingId(member.id)
    setBureauFormData({
      prenom: member.prenom || '',
      nom: member.nom || '',
      nom_affichage: member.nom_affichage || '',
      role_court: member.role_court || '',
      role_long: member.role_long || '',
      categorie: member.categorie || 'direction',
      pole_nom: member.pole_nom || '',
      email: member.email || '',
      phone: member.phone || '',
      linkedin_url: member.linkedin_url || '',
      other_url: member.other_url || '',
      ordre: member.ordre || 100,
      highlight: member.highlight || false,
      photo_url: member.photo_url || '',
    })
    setPhotoFile(null)
    setActiveSegment('modifier')
  }

  const handleBureauDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver ce membre ?')) return
    try {
      await deleteBureauMember(id)
      setFeedback({ type: 'success', message: 'Membre désactivé avec succès !' })
      await loadBureauMembers()
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur : ' + (err.message || 'Erreur lors de la suppression') })
    }
  }

  const handlePhotoOnly = (member) => {
    setSelectedMemberForPhoto(member)
    setActiveSegment('photos')
  }

  const handlePhotoUploadOnly = async (file, memberId) => {
    if (!file) {
      setFeedback({ type: 'error', message: 'Veuillez sélectionner un fichier' })
      return
    }

    try {
      setUploadingPhoto(true)
      const photoUrl = await handlePhotoUpload(file, memberId)
      await updateBureauMember(memberId, { photo_url: photoUrl })
      setFeedback({ type: 'success', message: 'Photo mise à jour avec succès !' })
      setSelectedMemberForPhoto(null)
      setActiveSegment('liste')
      await loadBureauMembers()
    } catch (err) {
      console.error('Erreur upload photo:', err)
      setFeedback({ type: 'error', message: 'Erreur : ' + (err.message || 'Erreur lors de l\'upload de la photo') })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const resetBureauForm = () => {
    setBureauFormData({
      prenom: '',
      nom: '',
      nom_affichage: '',
      role_court: '',
      role_long: '',
      categorie: 'direction',
      pole_nom: '',
      email: '',
      phone: '',
      linkedin_url: '',
      other_url: '',
      ordre: 100,
      highlight: false,
      photo_url: '',
    })
    setPhotoFile(null)
    setEditingId(null)
    setSelectedMemberForPhoto(null)
  }

  const filteredAdmins = useMemo(() => admins, [admins])
  const disableActions = (admin) => admin.id === currentAdmin?.id || admin.is_master

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Paramètres</h1>
        <p className="settings-page__subtitle">Admin / Paramètres</p>
      </div>

      {/* Onglets principaux */}
      <div className="settings-tabs">
        <button
          onClick={() => setActiveTab('admins')}
          className={`settings-tab ${activeTab === 'admins' ? 'settings-tab--active' : ''}`}
        >
          👥 Administrateurs
        </button>
        <button
          onClick={() => setActiveTab('bureau')}
          className={`settings-tab ${activeTab === 'bureau' ? 'settings-tab--active' : ''}`}
        >
          🏛️ Bureau & Équipe
        </button>
      </div>

      {/* Feedback messages */}
      {feedback && (
        <div className={`settings-feedback ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Contenu: Administrateurs */}
      {activeTab === 'admins' && (
        <div className="settings-grid">
      <div className="settings-card settings-card--primary-header">
        <div className="settings-card__header">
          <h2 className="settings-card__title">Créer un administrateur</h2>
          <p className="settings-card__subtitle">Attribuez rapidement un rôle et les modules autorisés.</p>
        </div>
        <form className="settings-form" onSubmit={handleCreateAdmin}>
          <div className="settings-form-row">
            <div className="form-group">
              <label className="settings-label">Sélectionner un membre *</label>
              <select
                className="settings-select"
                value={selectedMemberId}
                onChange={(e) => handleMemberSelect(e.target.value)}
                disabled={loadingMembers}
                required
              >
                <option value="">-- Choisir un membre --</option>
                {membersList.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.numero_membre} - {member.prenom} {member.nom?.toUpperCase()} {member.email ? `(${member.email})` : ''}
                  </option>
                ))}
              </select>
              {loadingMembers && <small style={{ color: '#64748b', marginTop: '0.25rem', display: 'block' }}>Chargement des membres...</small>}
            </div>
            <div className="form-group">
              <label className="settings-label">Numéro membre *</label>
              <input
                type="text"
                className="settings-input"
                value={formData.numero_membre}
                onChange={(e) => handleFormChange('numero_membre', e.target.value)}
                placeholder="ASGF-2025-001"
                required
                readOnly={!!selectedMemberId}
                style={selectedMemberId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              />
            </div>
          </div>
          <div className="settings-form-row">
            <div className="form-group">
              <label className="settings-label">Email *</label>
              <input
                type="email"
                className="settings-input"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="admin@asgf.fr"
                required
                readOnly={!!selectedMemberId}
                style={selectedMemberId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              />
            </div>
            <div className="form-group">
              <label className="settings-label">Mot de passe *</label>
              <input
                type="password"
                className="settings-input"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
          </div>
          <div className="settings-form-row">
            <div className="form-group">
              <label className="settings-label">Type de rôle *</label>
              <select
                className="settings-select"
                value={formData.role_type}
                onChange={(e) => handleFormChange('role_type', e.target.value)}
                disabled={formData.is_master}
              >
                <option value="admin">Admin (accès ciblé)</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>
          <div className="form-group checkbox-inline">
            <input
              id="isMasterToggle"
              type="checkbox"
              checked={formData.is_master}
              onChange={(e) => handleFormChange('is_master', e.target.checked)}
            />
            <label htmlFor="isMasterToggle">Superadmin global (accès complet)</label>
          </div>

          {formData.role_type === 'admin' && !formData.is_master && (
            <div className="form-group">
              <label className="settings-label">Modules autorisés *</label>
              <div className="chip-grid">
                {modulesCatalog.map((module) => {
                  const selected = formData.modules.includes(module)
                  return (
                    <button
                      type="button"
                      key={module}
                      className={`settings-chip ${selected ? 'settings-chip--selected' : ''}`}
                      onClick={() => toggleFormModule(module, 'modules')}
                    >
                      {module}
                    </button>
                  )
                })}
              </div>
              <small>Sélectionnez les modules accessibles pour cet admin.</small>
            </div>
          )}

          {formData.role_type === 'superadmin' && !formData.is_master && (
            <div className="form-group">
              <label>Super scope (modules visibles)</label>
              <div className="chip-grid">
                {modulesCatalog.map((module) => {
                  const selected = formData.super_scope.includes(module)
                  return (
                    <button
                      type="button"
                      key={module}
                      className={`chip ${selected ? 'chip-selected' : ''}`}
                      onClick={() => toggleFormModule(module, 'super_scope')}
                    >
                      {module}
                    </button>
                  )
                })}
              </div>
              <small>Laissez vide pour un accès complet.</small>
            </div>
          )}

          <div className="settings-actions">
            <button type="submit" className="settings-primary-btn" disabled={creatingAdmin}>
              {creatingAdmin ? 'Création...' : 'Créer'}
            </button>
          </div>
          {feedback && feedback.type === 'error' && (
            <p className="settings-feedback error">{feedback.message}</p>
          )}
        </form>
      </div>

      <div className="settings-card">
        <div className="settings-card__header">
          <h2 className="settings-card__title">Administrateurs existants</h2>
          <p className="settings-card__subtitle">Contrôlez les accès, modules et suspensions.</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche par email ou numéro"
          className="settings-search"
        />

        {feedback && feedback.type === 'success' && (
          <div className="settings-feedback success">{feedback.message}</div>
        )}

        <div className="admins-table-wrapper">
          {loadingAdmins ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Chargement des administrateurs...</p>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="empty-state">
              <p>Aucun administrateur ne correspond à votre recherche.</p>
            </div>
          ) : (
            <table className="admins-table">
              <thead>
                <tr>
                  <th>Identité</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Modules</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => {
                  const status = formatStatus(admin)
                  const modulesLabel =
                    admin.is_master || admin.role_type === 'superadmin'
                      ? admin.is_master
                        ? 'Tous (master)'
                        : admin.super_scope?.length
                          ? admin.super_scope.join(', ')
                          : 'Tous les modules'
                      : (admin.modules || []).map((m) => m.module).join(', ') || 'Non défini'

                  return (
                    <tr key={admin.id}>
                      <td>
                        <div className="admin-identity">
                          <span className="admin-badge">{admin.numero_membre}</span>
                        </div>
                      </td>
                      <td>{admin.email}</td>
                      <td>{roleLabel(admin)}</td>
                      <td className="admin-modules">{modulesLabel}</td>
                      <td>
                        <span className={`status-badge ${status.tone}`}>{status.label}</span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="btn-link"
                            disabled={admin.is_master}
                            onClick={() => openModulesModal(admin)}
                          >
                            Modules
                          </button>
                          {!disableActions(admin) && (
                            <>
                              <button
                                type="button"
                                className="btn-link"
                                onClick={() => handleSuspend(admin, 48)}
                              >
                                Suspendre 48h
                              </button>
                              <button
                                type="button"
                                className="btn-link danger"
                                onClick={() => handleDeactivate(admin)}
                              >
                                Désactiver
                              </button>
                            </>
                          )}
                          {(status.tone === 'warning' || !admin.is_active) && (
                            <button
                              type="button"
                              className="btn-link success"
                              onClick={() => handleReactivate(admin)}
                            >
                              Réactiver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="settings-pagination">
          <button
            type="button"
            className="settings-secondary-btn"
            onClick={() =>
              pagination.page > 1 && loadAdmins({ page: pagination.page - 1, searchTerm: search })
            }
            disabled={pagination.page <= 1 || loadingAdmins}
          >
            Précédent
          </button>
          <span>
            Page {pagination.page} / {pagination.totalPages || 1}
          </span>
          <button
            type="button"
            className="settings-secondary-btn"
            onClick={() =>
              pagination.page < (pagination.totalPages || 1) &&
              loadAdmins({ page: pagination.page + 1, searchTerm: search })
            }
            disabled={pagination.page >= (pagination.totalPages || 1) || loadingAdmins}
          >
            Suivant
          </button>
        </div>
      </div>

      {modulesModal && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <div className="modal-header">
              <h2>
                {modulesModal.mode === 'scope' ? 'Portée superadmin' : 'Modules'} - {modulesModal.admin.numero_membre}
              </h2>
              <button className="modal-close" onClick={() => setModulesModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p>
                {modulesModal.mode === 'scope'
                  ? 'Choisissez les modules visibles pour ce superadmin.'
                  : 'Sélectionnez les modules accessibles pour cet administrateur.'}
              </p>
              <div className="chip-grid">
                {modulesCatalog.map((module) => {
                  const selected = modulesModal.selection.includes(module)
                  return (
                    <button
                      type="button"
                      key={module}
                      className={`chip ${selected ? 'chip-selected' : ''}`}
                      onClick={() =>
                        setModulesModal((prev) => ({
                          ...prev,
                          selection: selected
                            ? prev.selection.filter((m) => m !== module)
                            : [...prev.selection, module],
                        }))
                      }
                    >
                      {module}
                    </button>
                  )
                })}
              </div>
              <div className="modal-actions">
                <button type="button" className="settings-secondary-btn" onClick={() => setModulesModal(null)}>
                  Annuler
                </button>
                <button type="button" className="settings-primary-btn" onClick={handleSaveModules}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Contenu: Bureau & Équipe */}
      {activeTab === 'bureau' && (
        <div className="bureau-management">
          {/* Segments pour les différentes actions */}
          <div className="bureau-segments">
            <button
              onClick={() => { setActiveSegment('liste'); resetBureauForm() }}
              className={`bureau-segment ${activeSegment === 'liste' ? 'bureau-segment--active' : ''}`}
            >
              📋 Liste des membres
            </button>
            <button
              onClick={() => { setActiveSegment('ajouter'); resetBureauForm() }}
              className={`bureau-segment ${activeSegment === 'ajouter' ? 'bureau-segment--active' : ''}`}
            >
              ➕ Ajouter un membre
            </button>
            <button
              onClick={() => { setActiveSegment('photos'); resetBureauForm() }}
              className={`bureau-segment ${activeSegment === 'photos' ? 'bureau-segment--active' : ''}`}
            >
              📷 Gérer les photos
            </button>
          </div>

          {/* Segment: Liste des membres */}
          {activeSegment === 'liste' && (
            <>
              {loadingBureau ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Chargement...</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Rôle</th>
                        <th>Catégorie</th>
                        <th>Ordre</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bureauMembers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            Aucun membre du bureau
                          </td>
                        </tr>
                      ) : (
                        bureauMembers.map((member) => (
                          <tr key={member.id}>
                            <td>
                              {member.nom_affichage || (member.prenom + ' ' + member.nom.toUpperCase())}
                            </td>
                            <td>{member.role_long}</td>
                            <td>
                              <span className="status-badge">{member.categorie}</span>
                            </td>
                            <td>{member.ordre}</td>
                            <td>
                              <span className={`status-badge ${member.is_active ? 'approved' : 'pending'}`}>
                                {member.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="action-btn approve"
                                  onClick={() => handleBureauEdit(member)}
                                  title="Modifier"
                                >
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  className="action-btn"
                                  onClick={() => handlePhotoOnly(member)}
                                  title="Gérer la photo"
                                  style={{ background: '#10b981', color: 'white' }}
                                >
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                                <button
                                  className="action-btn reject"
                                  onClick={() => handleBureauDelete(member.id)}
                                  title="Désactiver"
                                >
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Segment: Ajouter un membre */}
          {activeSegment === 'ajouter' && (
            <div className="settings-card">
              <div className="settings-card__header">
                <h2 className="settings-card__title">Ajouter un nouveau membre du bureau</h2>
              </div>
              <form onSubmit={handleBureauSubmit}>
                <div className="settings-form-row">
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input
                      type="text"
                      required
                      value={bureauFormData.prenom}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, prenom: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      required
                      value={bureauFormData.nom}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, nom: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Nom d'affichage (optionnel)</label>
                    <input
                      type="text"
                      value={bureauFormData.nom_affichage}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, nom_affichage: e.target.value })}
                      placeholder="Sinon: Prénom + NOM"
                    />
                  </div>
                  <div className="form-group">
                    <label>Rôle court *</label>
                    <select
                      required
                      value={bureauFormData.role_court}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, role_court: e.target.value })}
                    >
                      <option value="">Sélectionner...</option>
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rôle long *</label>
                    <input
                      type="text"
                      required
                      value={bureauFormData.role_long}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, role_long: e.target.value })}
                      placeholder="ex: Président, Vice-président"
                    />
                  </div>
                  <div className="form-group">
                    <label>Catégorie *</label>
                    <select
                      required
                      value={bureauFormData.categorie}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, categorie: e.target.value })}
                    >
                      <option value="direction">Direction</option>
                      <option value="pole">Pôle</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  {bureauFormData.categorie === 'pole' && (
                    <div className="form-group">
                      <label>Nom du pôle</label>
                      <input
                        type="text"
                        value={bureauFormData.pole_nom}
                        onChange={(e) => setBureauFormData({ ...bureauFormData, pole_nom: e.target.value })}
                        placeholder="ex: Pôle Formation"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={bureauFormData.email}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input
                      type="tel"
                      value={bureauFormData.phone}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input
                      type="url"
                      value={bureauFormData.linkedin_url}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, linkedin_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Autre URL</label>
                    <input
                      type="url"
                      value={bureauFormData.other_url}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, other_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordre d'affichage</label>
                    <input
                      type="number"
                      value={bureauFormData.ordre}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, ordre: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={bureauFormData.highlight}
                        onChange={(e) => setBureauFormData({ ...bureauFormData, highlight: e.target.checked })}
                      />
                      {' '}Mettre en avant (ex: président)
                    </label>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Photo (optionnel - peut être ajoutée plus tard)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="settings-secondary-btn"
                    onClick={() => { setActiveSegment('liste'); resetBureauForm() }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="settings-primary-btn"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Création en cours...' : 'Créer le membre'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Segment: Modifier un membre */}
          {activeSegment === 'modifier' && editingId && (
            <div className="settings-card">
              <div className="settings-card__header">
                <h2 className="settings-card__title">Modifier un membre du bureau</h2>
              </div>
              <form onSubmit={handleBureauSubmit}>
                <div className="settings-form-row">
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input
                      type="text"
                      required
                      value={bureauFormData.prenom}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, prenom: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      required
                      value={bureauFormData.nom}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, nom: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Nom d'affichage (optionnel)</label>
                    <input
                      type="text"
                      value={bureauFormData.nom_affichage}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, nom_affichage: e.target.value })}
                      placeholder="Sinon: Prénom + NOM"
                    />
                  </div>
                  <div className="form-group">
                    <label>Rôle court *</label>
                    <select
                      required
                      value={bureauFormData.role_court}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, role_court: e.target.value })}
                    >
                      <option value="">Sélectionner...</option>
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rôle long *</label>
                    <input
                      type="text"
                      required
                      value={bureauFormData.role_long}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, role_long: e.target.value })}
                      placeholder="ex: Président, Vice-président"
                    />
                  </div>
                  <div className="form-group">
                    <label>Catégorie *</label>
                    <select
                      required
                      value={bureauFormData.categorie}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, categorie: e.target.value })}
                    >
                      <option value="direction">Direction</option>
                      <option value="pole">Pôle</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  {bureauFormData.categorie === 'pole' && (
                    <div className="form-group">
                      <label>Nom du pôle</label>
                      <input
                        type="text"
                        value={bureauFormData.pole_nom}
                        onChange={(e) => setBureauFormData({ ...bureauFormData, pole_nom: e.target.value })}
                        placeholder="ex: Pôle Formation"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={bureauFormData.email}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input
                      type="tel"
                      value={bureauFormData.phone}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input
                      type="url"
                      value={bureauFormData.linkedin_url}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, linkedin_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Autre URL</label>
                    <input
                      type="url"
                      value={bureauFormData.other_url}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, other_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordre d'affichage</label>
                    <input
                      type="number"
                      value={bureauFormData.ordre}
                      onChange={(e) => setBureauFormData({ ...bureauFormData, ordre: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={bureauFormData.highlight}
                        onChange={(e) => setBureauFormData({ ...bureauFormData, highlight: e.target.checked })}
                      />
                      {' '}Mettre en avant (ex: président)
                    </label>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Photo (optionnel - peut être modifiée dans l'onglet Photos)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                    />
                    {bureauFormData.photo_url && !photoFile && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <img
                          src={bureauFormData.photo_url}
                          alt="Photo actuelle"
                          style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                          Photo actuelle. Utilisez l'onglet "Gérer les photos" pour la modifier.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setActiveSegment('liste'); resetBureauForm() }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Mise à jour en cours...' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Segment: Gérer les photos */}
          {activeSegment === 'photos' && (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Gérer les photos des membres</h2>
              
              {selectedMemberForPhoto ? (
                <div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                    <p><strong>Membre sélectionné :</strong> {selectedMemberForPhoto.nom_affichage || (selectedMemberForPhoto.prenom + ' ' + selectedMemberForPhoto.nom.toUpperCase())}</p>
                    <p><strong>Rôle :</strong> {selectedMemberForPhoto.role_long}</p>
                  </div>
                  
                  {selectedMemberForPhoto.photo_url && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Photo actuelle :</p>
                      <img
                        src={selectedMemberForPhoto.photo_url}
                        alt="Photo actuelle"
                        style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px', border: '2px solid #e2e8f0' }}
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label>Nouvelle photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      id="photo-upload-input"
                      onChange={async (e) => {
                        const file = e.target.files[0]
                        if (file) {
                          await handlePhotoUploadOnly(file, selectedMemberForPhoto.id)
                        }
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => { setSelectedMemberForPhoto(null) }}
                    >
                      Retour à la liste
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>
                    Sélectionnez un membre pour ajouter ou modifier sa photo
                  </p>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Nom</th>
                          <th>Rôle</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bureauMembers.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-4">
                              Aucun membre du bureau
                            </td>
                          </tr>
                        ) : (
                          bureauMembers.map((member) => (
                            <tr key={member.id}>
                              <td>
                                {member.photo_url ? (
                                  <img
                                    src={member.photo_url}
                                    alt={member.nom_affichage || (member.prenom + ' ' + member.nom)}
                                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '1.5rem' }}>👤</span>
                                  </div>
                                )}
                              </td>
                              <td>
                                {member.nom_affichage || (member.prenom + ' ' + member.nom.toUpperCase())}
                              </td>
                              <td>{member.role_long}</td>
                              <td>
                                <button
                                  className="btn-primary"
                                  onClick={() => handlePhotoOnly(member)}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                >
                                  {member.photo_url ? 'Modifier photo' : 'Ajouter photo'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminSettingsPanel

