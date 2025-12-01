import React, { useState } from 'react'

/**
 * Composant KPI Card professionnel avec hover et action
 */
export default function KPICard({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  onClick,
  loading = false 
}) {
  const [isHovered, setIsHovered] = useState(false)

  const colorStyles = {
    blue: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#2563eb',
      hoverBg: '#dbeafe',
      iconBg: '#dbeafe',
    },
    green: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#16a34a',
      hoverBg: '#dcfce7',
      iconBg: '#dcfce7',
    },
    orange: {
      bg: '#fff7ed',
      border: '#fed7aa',
      text: '#ea580c',
      hoverBg: '#ffedd5',
      iconBg: '#ffedd5',
    },
    yellow: {
      bg: '#fefce8',
      border: '#fef08a',
      text: '#ca8a04',
      hoverBg: '#fef9c3',
      iconBg: '#fef9c3',
    },
  }

  const style = colorStyles[color] || colorStyles.blue

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? style.hoverBg : style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: '0.75rem',
        padding: '1.5rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', opacity: 0.8, marginBottom: '0.25rem', color: style.text }}>
            {title}
          </p>
          {loading ? (
            <div style={{ height: '2rem', width: '5rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem' }}></div>
          ) : (
            <p style={{ fontSize: '1.875rem', fontWeight: '700', color: style.text }}>{value}</p>
          )}
        </div>
        <div style={{
          backgroundColor: style.iconBg,
          padding: '0.75rem',
          borderRadius: '0.5rem',
          color: style.text,
        }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

