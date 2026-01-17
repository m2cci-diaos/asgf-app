-- Table pour les inscriptions aux projets
CREATE TABLE IF NOT EXISTS public.projets_inscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projet_id VARCHAR(50) NOT NULL, -- 'mobilite-intelligente' ou 'dashboard-energie'
    membre_id UUID REFERENCES adhesion.members(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    numero_membre VARCHAR(50), -- Optionnel, pour les membres existants
    telephone VARCHAR(20),
    statut_pro VARCHAR(100), -- Statut professionnel (étudiant, professionnel, chercheur, etc.)
    motivation TEXT, -- Pourquoi le membre veut participer au projet
    competences TEXT, -- Compétences apportées au projet
    statut VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT projets_inscriptions_projet_id_check CHECK (projet_id IN ('mobilite-intelligente', 'dashboard-energie')),
    CONSTRAINT projets_inscriptions_statut_check CHECK (statut IN ('pending', 'approved', 'rejected'))
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_projets_inscriptions_projet_id ON public.projets_inscriptions(projet_id);
CREATE INDEX IF NOT EXISTS idx_projets_inscriptions_membre_id ON public.projets_inscriptions(membre_id);
CREATE INDEX IF NOT EXISTS idx_projets_inscriptions_email ON public.projets_inscriptions(email);
CREATE INDEX IF NOT EXISTS idx_projets_inscriptions_statut ON public.projets_inscriptions(statut);
CREATE INDEX IF NOT EXISTS idx_projets_inscriptions_created_at ON public.projets_inscriptions(created_at DESC);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_projets_inscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà avant de le créer
DROP TRIGGER IF EXISTS trigger_update_projets_inscriptions_updated_at ON public.projets_inscriptions;

CREATE TRIGGER trigger_update_projets_inscriptions_updated_at
    BEFORE UPDATE ON public.projets_inscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_projets_inscriptions_updated_at();

-- Permissions
GRANT SELECT, INSERT, UPDATE ON public.projets_inscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projets_inscriptions TO service_role;

-- Commentaires
COMMENT ON TABLE public.projets_inscriptions IS 'Inscriptions des membres aux projets de l''association';
COMMENT ON COLUMN public.projets_inscriptions.projet_id IS 'Identifiant du projet: mobilite-intelligente ou dashboard-energie';
COMMENT ON COLUMN public.projets_inscriptions.membre_id IS 'ID du membre si déjà membre de l''association (optionnel)';
COMMENT ON COLUMN public.projets_inscriptions.statut IS 'Statut de l''inscription: pending (en attente), approved (approuvée), rejected (rejetée)';

