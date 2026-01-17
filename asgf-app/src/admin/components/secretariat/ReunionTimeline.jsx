import React, { useState } from 'react'
import StatusBadge from './StatusBadge'

/**
 * Timeline des réunions à venir
 */
export default function ReunionTimeline({ reunions, onReunionClick, loading }) {
  const [hoveredId, setHoveredId] = useState(null)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ height: '1rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', width: '75%', marginBottom: '0.5rem' }}></div>
            <div style={{ height: '0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', width: '50%' }}></div>
          </div>
        ))}
      </div>
    )
  }

  if (!reunions || reunions.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '2rem',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
      }}>
        <p style={{ color: '#6b7280' }}>Aucune réunion à venir</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {reunions.map((reunion) => {
        const date = new Date(reunion.date_reunion)
        const isHovered = hoveredId === reunion.id

        return (
          <div
            key={reunion.id}
            onClick={() => onReunionClick?.(reunion)}
            onMouseEnter={() => setHoveredId(reunion.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1rem',
              border: `1px solid ${isHovered ? '#93c5fd' : '#e5e7eb'}`,
              boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontWeight: '600', color: '#111827' }}>{reunion.titre}</h4>
                  <StatusBadge status={reunion.statut || 'programmee'} size="sm" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {date.toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {reunion.heure_debut}
                    {reunion.heure_fin && ` - ${reunion.heure_fin}`}
                  </span>
                  {reunion.pole && (
                    <span style={{ color: '#6b7280' }}>• {reunion.pole}</span>
                  )}
                </div>
                {reunion.type_reunion && (
                  <span style={{
                    display: 'inline-block',
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                  }}>
                    {reunion.type_reunion}
                  </span>
                )}
              </div>
              {reunion.lien_visio && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(reunion.lien_visio, '_blank')
                  }}
                  style={{
                    marginLeft: '1rem',
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontSize: '0.875rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  Rejoindre
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}








