import React, { useState, useEffect, useCallback } from 'react'
import { fetchAuditLogs, fetchAuditStats } from '../services/api'

const ACTION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  VALIDATE: 'VALIDATE',
  CANCEL: 'CANCEL',
  RESET: 'RESET',
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD',
}

const ACTION_LABELS = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  VIEW: 'Consultation',
  EXPORT: 'Export',
  APPROVE: 'Approbation',
  REJECT: 'Rejet',
  VALIDATE: 'Validation',
  CANCEL: 'Annulation',
  RESET: 'Réinitialisation',
  UPLOAD: 'Upload',
  DOWNLOAD: 'Téléchargement',
}

const ACTION_COLORS = {
  CREATE: '#22c55e',
  UPDATE: '#3b82f6',
  DELETE: '#ef4444',
  LOGIN: '#10b981',
  LOGOUT: '#6b7280',
  VIEW: '#8b5cf6',
  EXPORT: '#f59e0b',
  APPROVE: '#22c55e',
  REJECT: '#ef4444',
  VALIDATE: '#22c55e',
  CANCEL: '#f59e0b',
  RESET: '#6366f1',
  UPLOAD: '#06b6d4',
  DOWNLOAD: '#06b6d4',
}

const AuditLogContent = () => {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    actionType: '',
    entityType: '',
    module: '',
    adminId: '',
    search: '',
    startDate: '',
    endDate: '',
  })

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchAuditLogs({
        page,
        limit: 50,
        ...filters,
      })
      setLogs(Array.isArray(result) ? result : result?.data || [])
      setTotalPages(result?.pagination?.totalPages || 1)
    } catch (err) {
      console.error('Erreur chargement logs:', err)
      alert('Erreur lors du chargement des logs: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchAuditStats()
      setStats(statsData)
    } catch (err) {
      console.error('Erreur chargement stats:', err)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleResetFilters = () => {
    setFilters({
      actionType: '',
      entityType: '',
      module: '',
      adminId: '',
      search: '',
      startDate: '',
      endDate: '',
    })
    setPage(1)
  }

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
            📋 Historique des Actions
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            Traçabilité complète de toutes les actions effectuées par les administrateurs
          </p>
        </div>

        {/* Stats Cards */}
        {stats.actionsByType && Object.keys(stats.actionsByType).length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            {Object.entries(stats.actionsByType).slice(0, 6).map(([action, count]) => (
              <div
                key={action}
                style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  {ACTION_LABELS[action] || action}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: ACTION_COLORS[action] || '#0f172a' }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Type d'action
              </label>
              <select
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="">Tous</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Type d'entité
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="">Tous</option>
                <option value="member">Membre</option>
                <option value="formation">Formation</option>
                <option value="webinaire">Webinaire</option>
                <option value="cotisation">Cotisation</option>
                <option value="paiement">Paiement</option>
                <option value="reunion">Réunion</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Module
              </label>
              <select
                value={filters.module}
                onChange={(e) => handleFilterChange('module', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="">Tous</option>
                <option value="adhesions">Adhésions</option>
                <option value="members">Membres</option>
                <option value="formations">Formations</option>
                <option value="webinaires">Webinaires</option>
                <option value="tresorerie">Trésorerie</option>
                <option value="secretariat">Secrétariat</option>
                <option value="mentorat">Mentorat</option>
                <option value="recrutement">Recrutement</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Recherche
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Admin, entité..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Date début
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Date fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Réinitialiser les filtres
          </button>
        </div>

        {/* Logs Table */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Chargement...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Aucun log trouvé
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Date/Heure
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Admin
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Action
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Entité
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Module
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Détails
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#0f172a' }}>
                          <div>{log.admin_nom || log.admin_email || 'N/A'}</div>
                          {log.ip_address && (
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.ip_address}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: `${ACTION_COLORS[log.action_type] || '#64748b'}20`,
                              color: ACTION_COLORS[log.action_type] || '#64748b',
                            }}
                          >
                            {ACTION_LABELS[log.action_type] || log.action_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#0f172a' }}>
                          <div style={{ fontWeight: 600 }}>{log.entity_name || log.entity_type || 'N/A'}</div>
                          {log.entity_id && (
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {log.entity_id.substring(0, 8)}...</div>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
                          {log.module || 'N/A'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                          {log.changes && (
                            <details>
                              <summary style={{ cursor: 'pointer', color: '#3b82f6' }}>Voir changements</summary>
                              <pre style={{
                                marginTop: '8px',
                                padding: '8px',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                fontSize: '11px',
                                overflow: 'auto',
                                maxHeight: '200px',
                              }}>
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  padding: '16px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Page {page} sur {totalPages}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: page === 1 ? '#f1f5f9' : 'white',
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: page === totalPages ? '#f1f5f9' : 'white',
                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditLogContent

