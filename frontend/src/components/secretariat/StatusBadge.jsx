import React from 'react'

/**
 * Badge de statut professionnel avec couleurs cohérentes
 */
export default function StatusBadge({ status, size = 'md' }) {
  const statusConfig = {
    // Réunions
    programmee: { label: 'Programmée', bg: '#dbeafe', text: '#1e40af' },
    en_cours: { label: 'En cours', bg: '#fed7aa', text: '#c2410c' },
    terminee: { label: 'Terminée', bg: '#dcfce7', text: '#166534' },
    annulee: { label: 'Annulée', bg: '#fee2e2', text: '#991b1b' },
    
    // Participants
    envoye: { label: 'Envoyée', bg: '#dbeafe', text: '#1e40af' },
    acceptee: { label: 'Acceptée', bg: '#dcfce7', text: '#166534' },
    refusee: { label: 'Refusée', bg: '#fee2e2', text: '#991b1b' },
    present: { label: 'Présent', bg: '#dcfce7', text: '#166534' },
    absent: { label: 'Absent', bg: '#fee2e2', text: '#991b1b' },
    
    // Actions
    termine: { label: 'Terminé', bg: '#dcfce7', text: '#166534' },
    annule: { label: 'Annulé', bg: '#fee2e2', text: '#991b1b' },
    en_retard: { label: 'En retard', bg: '#fee2e2', text: '#991b1b' },
  }

  const config = statusConfig[status] || { 
    label: status || 'Inconnu', 
    bg: '#f3f4f6', 
    text: '#374151' 
  }

  const sizeStyles = {
    sm: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
    md: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
    lg: { padding: '0.5rem 1rem', fontSize: '1rem' },
  }

  return (
    <span style={{
      backgroundColor: config.bg,
      color: config.text,
      ...sizeStyles[size],
      fontWeight: '500',
      borderRadius: '9999px',
      display: 'inline-flex',
      alignItems: 'center',
    }}>
      {config.label}
    </span>
  )
}

