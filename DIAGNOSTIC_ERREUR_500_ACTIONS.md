# Diagnostic Erreur 500 - Création d'Action

## 🔍 Problème

L'erreur 500 persiste lors de la création d'une action. L'Edge Function a été mise à jour avec un logging amélioré.

## 📋 Étapes de diagnostic

### 1. Vérifier les logs Supabase

1. Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/logs/edge-functions
2. Sélectionnez la fonction `admin-secretariat`
3. Regardez les logs récents lors de la création d'une action
4. Vous devriez voir :
   - `createAction - Payload reçu: {...}`
   - `createAction - Données à insérer: {...}`
   - L'erreur exacte avec code et message

### 2. Vérifier l'erreur dans la console du navigateur

Dans la console du navigateur (F12), l'erreur devrait maintenant inclure :
- `error_code`: "DATABASE_ERROR"
- `details`: Message d'erreur PostgreSQL
- `hint`: Indice sur la cause (si disponible)
- `code`: Code d'erreur PostgreSQL

### 3. Causes probables

#### A) Migrations SQL non appliquées

**Symptôme** : Erreur mentionnant `reunion_id` NOT NULL ou colonne manquante

**Solution** : Appliquer les migrations SQL
1. Ouvrez : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/sql/new
2. Copiez-collez le contenu de `backend/migrations/secretariat_evolutions.sql`
3. Exécutez le script

#### B) Colonne `intitule` n'existe pas

**Symptôme** : Erreur `column "intitule" does not exist`

**Solution** : La table utilise probablement `titre` au lieu de `intitule`
- L'Edge Function essaie automatiquement avec `titre` si `intitule` échoue
- Si le problème persiste, vérifiez le schéma de la table

#### C) Table `action_assignees` n'existe pas

**Symptôme** : Erreur lors de l'insertion dans `action_assignees`

**Solution** : Appliquer les migrations SQL (voir A)

### 4. Vérifier le schéma de la table `actions`

Exécutez cette requête dans le SQL Editor Supabase :

```sql
-- Vérifier les colonnes de la table actions
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'actions'
ORDER BY ordinal_position;
```

**Colonnes attendues** :
- `id` (uuid, PRIMARY KEY)
- `reunion_id` (uuid, nullable) ← **Doit être nullable**
- `intitule` ou `titre` (text) ← **L'un des deux doit exister**
- `description` (text, nullable)
- `assigne_a` (uuid, nullable)
- `statut` (text)
- `deadline` ou `echeance` (date, nullable)
- `priorite` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 5. Vérifier si `reunion_id` est nullable

```sql
-- Vérifier si reunion_id est nullable
SELECT 
  column_name, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'actions' 
AND column_name = 'reunion_id';
```

**Résultat attendu** : `is_nullable = 'YES'`

Si `is_nullable = 'NO'`, appliquez cette migration :

```sql
ALTER TABLE secretariat.actions 
ALTER COLUMN reunion_id DROP NOT NULL;
```

### 6. Vérifier si la colonne s'appelle `intitule` ou `titre`

```sql
-- Vérifier les colonnes intitule/titre
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'actions' 
AND column_name IN ('intitule', 'titre');
```

**Si seule `titre` existe** : L'Edge Function devrait automatiquement utiliser `titre` si `intitule` échoue.

**Si aucune n'existe** : Il faut créer la colonne :

```sql
ALTER TABLE secretariat.actions 
ADD COLUMN IF NOT EXISTS intitule text;

-- Ou si vous préférez titre :
ALTER TABLE secretariat.actions 
ADD COLUMN IF NOT EXISTS titre text;
```

## 🚀 Solution rapide : Appliquer toutes les migrations

1. **Ouvrez le SQL Editor** : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/sql/new

2. **Copiez-collez ce script complet** :

```sql
-- ============================================
-- MIGRATIONS ÉVOLUTIONS MODULE SECRÉTARIAT
-- ============================================

-- 1. Rendre reunion_id nullable pour actions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'actions' 
    AND column_name = 'reunion_id'
  ) THEN
    ALTER TABLE secretariat.actions 
    ALTER COLUMN reunion_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Rendre reunion_id nullable pour documents
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'reunion_id'
  ) THEN
    ALTER TABLE secretariat.documents 
    ALTER COLUMN reunion_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Créer la colonne intitule si elle n'existe pas
ALTER TABLE secretariat.actions 
ADD COLUMN IF NOT EXISTS intitule text;

-- 4. Si intitule n'existe pas mais titre existe, copier les données
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'actions' 
    AND column_name = 'titre'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'actions' 
    AND column_name = 'intitule'
  ) THEN
    UPDATE secretariat.actions 
    SET intitule = titre 
    WHERE intitule IS NULL AND titre IS NOT NULL;
  END IF;
END $$;

-- 5. Créer la table pivot pour la multi-assignation
CREATE TABLE IF NOT EXISTS secretariat.action_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES secretariat.actions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES adhesion.members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(action_id, member_id)
);

-- 6. Créer des index
CREATE INDEX IF NOT EXISTS idx_action_assignees_action_id 
ON secretariat.action_assignees(action_id);

CREATE INDEX IF NOT EXISTS idx_action_assignees_member_id 
ON secretariat.action_assignees(member_id);

-- 7. Migrer les données existantes
DO $$
DECLARE
  action_record RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'actions' 
    AND column_name = 'assigne_a'
  ) THEN
    FOR action_record IN 
      SELECT id, assigne_a FROM secretariat.actions 
      WHERE assigne_a IS NOT NULL
    LOOP
      INSERT INTO secretariat.action_assignees (action_id, member_id)
      VALUES (action_record.id, action_record.assigne_a)
      ON CONFLICT (action_id, member_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;
```

3. **Exécutez le script** (Run ou Ctrl+Enter)

4. **Réessayez de créer une action**

## 📞 Si le problème persiste

1. **Copiez l'erreur complète** depuis la console du navigateur (F12 > Console)
2. **Vérifiez les logs Supabase** : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/logs/edge-functions
3. **Partagez** :
   - Le message d'erreur complet
   - Le code d'erreur PostgreSQL (si disponible)
   - Les logs de l'Edge Function



