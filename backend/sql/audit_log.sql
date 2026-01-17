-- Table pour l'historique des actions des administrateurs (Audit Log)
-- Ce script crée la table et les index nécessaires pour tracer toutes les actions

-- Créer le schéma si nécessaire (utiliser public par défaut)
-- CREATE SCHEMA IF NOT EXISTS audit;

-- Table audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_email VARCHAR(255),
  admin_nom VARCHAR(255),
  action_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'member', 'formation', 'webinaire', 'cotisation', etc.
  entity_id UUID,
  entity_name VARCHAR(255), -- Nom/titre de l'entité pour faciliter la recherche
  module VARCHAR(50), -- 'adhesions', 'members', 'formations', 'webinaires', etc.
  changes JSONB, -- Détails des changements (avant/après pour UPDATE)
  metadata JSONB, -- Informations supplémentaires (IP, user agent, etc.)
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON public.audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON public.audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON public.audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON public.audit_log(module);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_email ON public.audit_log(admin_email);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_date ON public.audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_audit_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_audit_log_updated_at ON public.audit_log;
CREATE TRIGGER update_audit_log_updated_at
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audit_log_updated_at();

-- Permissions pour service_role
GRANT ALL ON TABLE public.audit_log TO service_role;
-- Note: Pas de séquence nécessaire car on utilise UUID avec gen_random_uuid()

-- Permissions par défaut pour les futures tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- Commentaires pour documentation
COMMENT ON TABLE public.audit_log IS 'Historique de toutes les actions effectuées par les administrateurs';
COMMENT ON COLUMN public.audit_log.action_type IS 'Type d''action: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT, etc.';
COMMENT ON COLUMN public.audit_log.entity_type IS 'Type d''entité modifiée: member, formation, webinaire, cotisation, etc.';
COMMENT ON COLUMN public.audit_log.changes IS 'Détails des changements (format JSON avec before/after pour UPDATE)';
COMMENT ON COLUMN public.audit_log.metadata IS 'Métadonnées supplémentaires (filtres utilisés, paramètres, etc.)';

