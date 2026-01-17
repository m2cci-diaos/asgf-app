# Correction des erreurs CORS - Module Trésorerie

## Problème identifié
Les requêtes depuis `https://asgf-siteweb.web.app` vers la fonction Supabase Edge `admin-tresorerie` échouent avec des erreurs CORS :
- `Response to preflight request doesn't pass access control check: It does not have HTTP ok status`

## Solutions testées

1. ✅ Ajout de la gestion explicite des requêtes OPTIONS
2. ✅ Utilisation du même format que `admin-adhesion-members` qui fonctionne
3. ✅ Ajout des en-têtes CORS corrects
4. ✅ Vérification de la structure du code

## Actions à prendre

### 1. Vérifier les logs Supabase
Allez sur https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions/admin-tresorerie/logs
et vérifiez s'il y a des erreurs lors des requêtes OPTIONS.

### 2. Vérifier la configuration de la fonction
Dans le dashboard Supabase :
- Allez dans Edge Functions > admin-tresorerie
- Vérifiez que `verify_jwt` est bien à `false`
- Vérifiez les variables d'environnement (PROJECT_URL, SERVICE_ROLE_KEY, JWT_SECRET)

### 3. Alternative : Configurer CORS dans Supabase Dashboard
Il est possible que Supabase nécessite une configuration CORS au niveau de la plateforme.

### 4. Test direct de la fonction
Testez la fonction directement avec curl :

```bash
curl -X OPTIONS https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-tresorerie/stats \
  -H "Origin: https://asgf-siteweb.web.app" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

### 5. Solution temporaire possible
Si le problème persiste, il se peut que Supabase Edge Functions nécessite une configuration spéciale pour les CORS depuis des domaines externes. Dans ce cas, il faudra peut-être :
- Configurer les domaines autorisés dans le dashboard Supabase
- Ou utiliser un proxy CORS

## Code actuel de la fonction
La fonction gère déjà correctement OPTIONS :
```typescript
if (req.method === "OPTIONS") {
  const headers = new Headers(CORS_HEADERS)
  return new Response(null, { status: 204, headers })
}
```

Les en-têtes CORS sont également inclus dans toutes les réponses via `jsonResponse()`.

## Prochaine étape
Vérifiez les logs Supabase et partagez les erreurs trouvées pour diagnostic plus approfondi.


