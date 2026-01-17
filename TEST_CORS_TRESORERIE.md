# Test CORS - Module Trésorerie

## Tester la fonction OPTIONS directement

Ouvrez la console du navigateur sur https://asgf-siteweb.web.app/admin et exécutez :

```javascript
// Tester OPTIONS directement
fetch('https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-tresorerie/stats', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://asgf-siteweb.web.app',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization, content-type'
  }
})
.then(r => {
  console.log('Status:', r.status)
  console.log('Headers:', Object.fromEntries(r.headers.entries()))
  return r.text()
})
.then(text => console.log('Body:', text))
.catch(err => console.error('Erreur:', err))
```

## Vérifier les logs Supabase

1. Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions/admin-tresorerie/logs
2. Filtrez par "OPTIONS" ou regardez les dernières requêtes
3. Vérifiez s'il y a des erreurs

## Comparer avec admin-adhesion-members

La fonction `admin-adhesion-members` fonctionne. Testez-la aussi pour comparer :

```javascript
fetch('https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/pending', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://asgf-siteweb.web.app',
    'Access-Control-Request-Method': 'GET'
  }
})
.then(r => {
  console.log('Status adhesion-members:', r.status)
  console.log('Headers:', Object.fromEntries(r.headers.entries()))
})
```

Si cette fonction répond correctement à OPTIONS mais pas admin-tresorerie, il y a probablement une erreur dans admin-tresorerie qui empêche même OPTIONS de fonctionner.


