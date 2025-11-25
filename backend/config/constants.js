// backend/config/constants.js

// Modules disponibles dans le système
export const MODULES = {
  ADHESION: 'adhesion',
  FORMATION: 'formation',
  WEBINAIRE: 'webinaire',
  TRESORERIE: 'tresorerie',
  SECRETARIAT: 'secretariat',
  MENTORAT: 'mentorat',
  RECRUTEMENT: 'recrutement',
}

// Liste de tous les modules (pour validation)
export const ALL_MODULES = Object.values(MODULES)

// Rôles globaux
export const ROLES = {
  MASTER: 'master',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
}

// Statuts génériques
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}



