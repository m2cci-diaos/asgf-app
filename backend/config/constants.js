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
  CONTACT: 'contact',
  AUDIT: 'audit',
  CALENDAR: 'calendar',
  PROJETS: 'projets',
}

// Liste de tous les modules (pour validation)
export const ALL_MODULES = Object.values(MODULES)

export const ROLE_TYPES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
}

export const MODULE_DROITS = {
  LECTURE: 'lecture',
  GESTION: 'gestion',
  FULL: 'full',
}

export const ADMIN_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
}

// Statuts génériques
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}



