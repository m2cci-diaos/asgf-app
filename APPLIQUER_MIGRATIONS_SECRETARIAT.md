# Appliquer les Migrations SQL - Module Secrétariat

## ✅ Edge Function déployée !

L'Edge Function `admin-secretariat` a été déployée avec succès.

## 📋 Étape suivante : Appliquer les migrations SQL

### Option 1 : Via le Dashboard Supabase (Recommandé)

1. **Ouvrez le SQL Editor dans Supabase** :
   - Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/sql/new

2. **Copiez-collez le contenu du fichier** :
   - Ouvrez : `backend/migrations/secretariat_evolutions.sql`
   - Copiez tout le contenu
   - Collez dans l'éditeur SQL
   - Cliquez sur "Run" ou appuyez sur `Ctrl+Enter`

3. **Vérifiez le résultat** :
   - Vous devriez voir "Success. No rows returned"
   - Les migrations ont été appliquées avec succès

### Option 2 : Via la ligne de commande (si vous avez psql)

```powershell
# Depuis la racine du projet
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

# Appliquer les migrations (remplacez [PASSWORD] par votre mot de passe Supabase)
psql "postgresql://postgres:[PASSWORD]@db.wooyxkfdzehvedvivhhd.supabase.co:5432/postgres" -f backend/migrations/secretariat_evolutions.sql
```

## 🔍 Vérifier que les migrations sont appliquées

Après avoir exécuté les migrations, vérifiez dans le SQL Editor :

```sql
-- Vérifier que reunion_id est nullable pour actions
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'actions' 
AND column_name = 'reunion_id';
-- is_nullable devrait être 'YES'

-- Vérifier que reunion_id est nullable pour documents
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'documents' 
AND column_name = 'reunion_id';
-- is_nullable devrait être 'YES'

-- Vérifier que la table action_assignees existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'secretariat' 
AND table_name = 'action_assignees';
-- Devrait retourner 'action_assignees'
```

## ✅ Résumé des migrations

Les migrations SQL vont :

1. ✅ Rendre `reunion_id` nullable pour `actions` (permet actions indépendantes)
2. ✅ Rendre `reunion_id` nullable pour `documents` (permet documents indépendants)
3. ✅ Créer la table `action_assignees` (support multi-assignation)
4. ✅ Créer les index nécessaires pour les performances
5. ✅ Migrer automatiquement les données existantes de `assigne_a` vers `action_assignees`

## 🚀 Une fois les migrations appliquées

Vous pouvez tester les nouvelles fonctionnalités :

1. **Créer une action indépendante** (sans `reunion_id`)
2. **Créer une action avec multi-assignation** (`assignees: ["uuid1", "uuid2"]`)
3. **Créer un document indépendant** (sans `reunion_id`)
4. **Générer un PDF de compte rendu** avec tous les champs (résumé, actions assignées)

## 📝 Notes

- Les migrations sont idempotentes (peuvent être exécutées plusieurs fois sans problème)
- Les données existantes sont préservées
- La rétrocompatibilité est maintenue (`assigne_a` continue de fonctionner)


