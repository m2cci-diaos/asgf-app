# 🔧 Correction Urgente : Schéma table documents

## ❌ Problème

L'erreur `"Could not find the 'reunion_id' column of 'documents' in the schema cache"` indique que la table `documents` n'a pas toutes les colonnes nécessaires.

## ✅ Solution

### Étape 1 : Appliquer la migration complète

1. **Ouvrez le SQL Editor Supabase** :
   - https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/sql/new

2. **Copiez-collez le script complet** depuis :
   - `backend/migrations/fix_documents_schema_complete.sql`

   Ou copiez directement ce script :

```sql
-- ============================================
-- CORRECTION COMPLÈTE : Schéma table documents
-- ============================================

-- 1. Ajouter reunion_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'reunion_id'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN reunion_id uuid NULL;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'reunions'
    ) THEN
      ALTER TABLE secretariat.documents
      ADD CONSTRAINT documents_reunion_id_fkey 
      FOREIGN KEY (reunion_id) REFERENCES secretariat.reunions(id) ON DELETE SET NULL;
    END IF;
  ELSE
    ALTER TABLE secretariat.documents 
    ALTER COLUMN reunion_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Ajouter lien_pdf
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'lien_pdf'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'documents' 
      AND column_name = 'lien_document'
    ) THEN
      ALTER TABLE secretariat.documents 
      ADD COLUMN lien_pdf text NULL;
      
      UPDATE secretariat.documents 
      SET lien_pdf = lien_document 
      WHERE lien_pdf IS NULL AND lien_document IS NOT NULL;
    ELSE
      ALTER TABLE secretariat.documents 
      ADD COLUMN lien_pdf text NULL;
    END IF;
  END IF;
END $$;

-- 3. Ajouter uploaded_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN uploaded_by uuid NULL;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'adhesion' 
      AND table_name = 'members'
    ) THEN
      ALTER TABLE secretariat.documents
      ADD CONSTRAINT documents_uploaded_by_fkey 
      FOREIGN KEY (uploaded_by) REFERENCES adhesion.members(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 4. Ajouter type_document
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'type_document'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN type_document text NULL;
  END IF;
END $$;

-- 5. Créer les index
CREATE INDEX IF NOT EXISTS idx_documents_reunion_id 
ON secretariat.documents(reunion_id);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by 
ON secretariat.documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_documents_categorie 
ON secretariat.documents(categorie);
```

3. **Exécutez le script** (Run ou `Ctrl+Enter`)

4. **Vérifiez le résultat** : Vous devriez voir "Success. No rows returned"

### Étape 2 : Vérifier le schéma

Pour vérifier que toutes les colonnes existent, exécutez :

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'documents'
ORDER BY ordinal_position;
```

**Colonnes attendues** :
- ✅ `id` (uuid, PRIMARY KEY)
- ✅ `titre` (text, NOT NULL)
- ✅ `description` (text, nullable)
- ✅ `categorie` (text, nullable)
- ✅ `lien_pdf` (text, nullable) ← **Doit exister**
- ✅ `reunion_id` (uuid, nullable) ← **Doit exister**
- ✅ `uploaded_by` (uuid, nullable) ← **Doit exister**
- ✅ `type_document` (text, nullable) ← **Doit exister**
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

### Étape 3 : Réessayer

Après avoir appliqué la migration, réessayez de créer un document dans l'interface.

## 🔍 Si le problème persiste

1. **Vérifiez les logs Supabase** :
   - https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/logs/edge-functions
   - Regardez les logs détaillés de l'erreur

2. **Vérifiez la console du navigateur** (F12) :
   - L'erreur devrait maintenant inclure plus de détails

3. **Partagez** :
   - Le message d'erreur complet
   - Le résultat de la requête de vérification du schéma



