# 🔧 Résumé Solution - Erreur 500 Documents

## ✅ Ce qui a été fait

1. **Migrations SQL appliquées** :
   - ✅ Colonne `reunion_id` ajoutée (nullable)
   - ✅ Colonne `lien_pdf` ajoutée (nullable)
   - ✅ Colonne `uploaded_by` ajoutée (nullable)
   - ✅ Colonne `type_document` ajoutée (nullable)
   - ✅ Index créés

2. **Edge Function améliorée** :
   - ✅ Logging détaillé
   - ✅ Gestion d'erreur avec retry automatique
   - ✅ Fallback sur colonnes de base si cache PostgREST

3. **Frontend** :
   - ✅ Le champ "Lien PDF" accepte une URL (comportement correct)

## 🔍 Problème restant

L'erreur 500 persiste probablement à cause du **cache PostgREST** qui n'a pas été rafraîchi.

## ✅ Solution finale : Rafraîchir le cache

### Étape 1 : Notifier PostgREST

1. Ouvrez le SQL Editor : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/sql/new

2. Exécutez :
```sql
NOTIFY pgrst, 'reload schema';
```

3. Attendez 10-15 secondes

### Étape 2 : Réessayer

Réessayez de créer un document. L'Edge Function devrait maintenant :
- Soit fonctionner directement (cache rafraîchi)
- Soit contourner le cache avec le fallback automatique

### Étape 3 : Si ça ne fonctionne toujours pas

Vérifiez les logs Supabase pour voir l'erreur exacte :
- https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/logs/edge-functions
- Sélectionnez `admin-secretariat`
- Regardez les logs de la dernière tentative

## 📝 Note

Le champ "Lien PDF" est bien un champ texte pour URL (pas un upload), c'est le comportement attendu ✅


