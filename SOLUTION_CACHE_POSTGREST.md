# 🔧 Solution : Rafraîchir le Cache PostgREST

## ❌ Problème

Les colonnes existent dans la base de données ✅, mais PostgREST (l'API REST de Supabase) a un cache de schéma obsolète qui ne voit pas les nouvelles colonnes.

## ✅ Solution : Rafraîchir le cache

### Méthode 1 : Notifier PostgREST (Recommandé)

1. **Ouvrez le SQL Editor Supabase** :
   - https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/sql/new

2. **Exécutez cette commande** :

```sql
NOTIFY pgrst, 'reload schema';
```

3. **Attendez 5-10 secondes** pour que le cache se rafraîchisse

4. **Réessayez de créer un document**

### Méthode 2 : Redémarrer l'API (si Méthode 1 ne fonctionne pas)

1. Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/settings/api
2. Cliquez sur "Restart API" ou "Restart PostgREST"
3. Attendez que l'API redémarre (30-60 secondes)
4. Réessayez

### Méthode 3 : Vérifier l'exposition du schéma

Vérifiez que le schéma `secretariat` est bien exposé à PostgREST :

```sql
-- Vérifier que le schéma est dans la liste des schémas exposés
SELECT 
  schema_name
FROM information_schema.schemata 
WHERE schema_name = 'secretariat';

-- Si le schéma n'est pas exposé, l'exposer (nécessite les droits admin)
-- ALTER DATABASE postgres SET search_path = public, secretariat, adhesion;
```

### Méthode 4 : Attendre (Solution simple)

Parfois, il suffit d'attendre 1-2 minutes après avoir ajouté les colonnes. Le cache PostgREST se rafraîchit automatiquement toutes les minutes.

## 🔍 Vérification

Après avoir rafraîchi le cache, vérifiez que ça fonctionne :

1. **Réessayez de créer un document** dans l'interface
2. **Vérifiez les logs Supabase** pour voir si l'erreur a changé
3. **Si l'erreur persiste**, vérifiez les logs détaillés dans :
   - https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/logs/edge-functions
   - Sélectionnez `admin-secretariat`
   - Regardez les logs récents pour voir l'erreur exacte

## 📝 Note importante

L'Edge Function utilise `createClient` avec `db: { schema: "secretariat" }`, ce qui devrait contourner le cache PostgREST. Si l'erreur persiste après le rafraîchissement, il peut y avoir un autre problème (permissions, RLS, etc.).



