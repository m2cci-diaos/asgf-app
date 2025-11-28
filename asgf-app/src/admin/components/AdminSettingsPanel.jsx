import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAdminsList,
  createAdminAccount,
  updateAdminAccount,
  updateAdminAccess,
  suspendAdminAccount,
  fetchAdminModulesCatalog,
} from '../services/api'

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
    fetchModules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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

  const filteredAdmins = useMemo(() => admins, [admins])
  const disableActions = (admin) => admin.id === currentAdmin?.id || admin.is_master

  return (
    <section className="settings-grid">
      <div className="settings-card settings-card--form">
        <header className="settings-card-header">
          <div>
            <h2>Créer un administrateur</h2>
            <p>Attribuez rapidement un rôle et les modules autorisés.</p>
          </div>
        </header>
        <form className="settings-form" onSubmit={handleCreateAdmin}>
          <div className="form-row two-cols">
            <div className="form-group">
              <label>Numéro membre *</label>
              <input
                type="text"
                value={formData.numero_membre}
                onChange={(e) => handleFormChange('numero_membre', e.target.value)}
                placeholder="ASGF-2025-001"
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="admin@asgf.fr"
                required
              />
            </div>
          </div>
          <div className="form-row two-cols">
            <div className="form-group">
              <label>Mot de passe *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            <div className="form-group">
              <label>Type de rôle *</label>
              <select
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
              <label>Modules autorisés *</label>
              <div className="chip-grid">
                {modulesCatalog.map((module) => {
                  const selected = formData.modules.includes(module)
                  return (
                    <button
                      type="button"
                      key={module}
                      className={`chip ${selected ? 'chip-selected' : ''}`}
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
            <button type="submit" className="btn-primary" disabled={creatingAdmin}>
              {creatingAdmin ? 'Création...' : 'Créer'}
            </button>
          </div>
          {feedback && feedback.type === 'error' && (
            <p className="settings-feedback error">{feedback.message}</p>
          )}
        </form>
      </div>

      <div className="settings-card settings-card--list">
        <header className="settings-card-header">
          <div>
            <h2>Administrateurs existants</h2>
            <p>Contrôlez les accès, modules et suspensions.</p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche par email ou numéro"
            className="settings-search"
          />
        </header>

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
            className="btn-secondary"
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
            className="btn-secondary"
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
                <button type="button" className="btn-secondary" onClick={() => setModulesModal(null)}>
                  Annuler
                </button>
                <button type="button" className="btn-primary" onClick={handleSaveModules}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminSettingsPanel

