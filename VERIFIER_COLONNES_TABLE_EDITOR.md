# 🔍 Vérifier les Colonnes dans le Table Editor

## 📋 Instructions

### Pour la table `documents` :

1. **Dans le Table Editor Supabase**, sélectionnez le schéma `secretariat`
2. **Cliquez sur la table `documents`**
3. **Vérifiez que ces colonnes existent** :
   - ✅ `id` (uuid, PRIMARY KEY)
   - ✅ `titre` (text)
   - ✅ `description` (text, nullable)
   - ✅ `categorie` (text, nullable)
   - ✅ `lien_pdf` (text, nullable) ← **À vérifier**
   - ✅ `reunion_id` (uuid, nullable) ← **À vérifier**
   - ✅ `uploaded_by` (uuid, nullable) ← **À vérifier**
   - ✅ `type_document` (text, nullable) ← **À vérifier**
   - ✅ `created_at` (timestamptz)
   - ✅ `updated_at` (timestamptz)

### Pour la table `actions` :

1. **Cliquez sur la table `actions`**
2. **Vérifiez que ces colonnes existent** :
   - ✅ `id` (uuid, PRIMARY KEY)
   - ✅ `reunion_id` (uuid, nullable) ← **Doit être nullable**
   - ✅ `intitule` (text) ou `titre` (text) ← **L'un des deux doit exister**
   - ✅ `description` (text, nullable)
   - ✅ `assigne_a` (uuid, nullable)
   - ✅ `statut` (text)
   - ✅ `deadline` (date, nullable) ou `echeance` (date, nullable)
   - ✅ `priorite` (text, nullable)
   - ✅ `created_at` (timestamptz)
   - ✅ `updated_at` (timestamptz)

### Pour la table `action_assignees` :

1. **Cliquez sur la table `action_assignees`**
2. **Vérifiez que cette table existe** avec :
   - ✅ `id` (uuid, PRIMARY KEY)
   - ✅ `action_id` (uuid, FK vers actions)
   - ✅ `member_id` (uuid, FK vers adhesion.members)
   - ✅ `created_at` (timestamptz)

## 🔧 Si des colonnes manquent

Si vous voyez qu'une colonne manque dans le Table Editor, exécutez la migration correspondante dans le SQL Editor :

1. **Pour `documents`** : `backend/migrations/fix_documents_schema_complete.sql`
2. **Pour `actions`** : `backend/migrations/secretariat_evolutions.sql`

## ✅ Après vérification

Une fois que vous avez confirmé que toutes les colonnes existent :
1. **Rafraîchissez le cache PostgREST** :
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
2. **Réessayez de créer un document/action**


