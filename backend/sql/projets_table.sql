-- Table pour les projets
CREATE TABLE IF NOT EXISTS public.projets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projet_id VARCHAR(50) UNIQUE NOT NULL, -- 'mobilite-intelligente', 'dashboard-energie', etc.
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10), -- Emoji ou icône
    color VARCHAR(20), -- Couleur hex
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_projets_projet_id ON public.projets(projet_id);
CREATE INDEX IF NOT EXISTS idx_projets_is_active ON public.projets(is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_projets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_projets_updated_at ON public.projets;
CREATE TRIGGER trigger_update_projets_updated_at
    BEFORE UPDATE ON public.projets
    FOR EACH ROW
    EXECUTE FUNCTION update_projets_updated_at();

-- Permissions
GRANT SELECT ON public.projets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projets TO service_role;

-- Insérer les projets initiaux
INSERT INTO public.projets (projet_id, titre, description, icon, color) VALUES
('mobilite-intelligente', 'Mobilité intelligente au Sénégal', 'Développement de solutions innovantes pour améliorer la mobilité urbaine et interurbaine au Sénégal grâce aux technologies géomatiques et à l''intelligence artificielle.', '🚗', '#667eea'),
('dashboard-energie', 'Dashboard Énergie (Pétrole et gaz)', 'Création d''un tableau de bord interactif pour le suivi et l''analyse des données énergétiques (pétrole et gaz) au Sénégal.', '⚡', '#f59e0b')
ON CONFLICT (projet_id) DO NOTHING;

