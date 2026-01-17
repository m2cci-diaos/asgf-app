# 🧪 Guide de Test - Fonctions Supabase

## ✅ État actuel

Vos fonctions sont **déployées** et vos secrets sont **configurés** ! 🎉

- ✅ `admin-adhesion-members` déployée
- ✅ `JWT_SECRET` configuré
- ✅ `APPSCRIPT_CONTACT_WEBHOOK_URL` configuré
- ✅ `APPSCRIPT_CONTACT_TOKEN` configuré

---

## 🔍 Pourquoi "Token invalide" ?

L'erreur `{"success":false,"message":"Token invalide"}` apparaît car :

1. **Vous testez sans token** → C'est normal, la fonction nécessite un token JWT valide
2. **Le token utilisé n'est pas valide** → Il doit être généré par `admin-login`

---

## ✅ Comment tester correctement

### Étape 1 : Obtenir un token valide

**Option A : Via votre application**

1. Allez sur : https://asgf-siteweb.web.app/admin
2. Connectez-vous avec vos identifiants admin
3. Ouvrez la console du navigateur (F12)
4. Exécutez :
   ```javascript
   localStorage.getItem('asgf_admin_token')
   ```
5. Copiez le token affiché

**Option B : Via la fonction admin-login directement**

Ouvrez la console du navigateur et exécutez :

```javascript
// Remplacer par vos vraies identifiants
const response = await fetch('https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    numero_membre: 'VOTRE_NUMERO_MEMBRE',
    password: 'VOTRE_MOT_DE_PASSE'
  })
});

const data = await response.json();
console.log('Token:', data.data.token);
```

---

### Étape 2 : Tester la fonction avec le token

Une fois que vous avez le token, testez la fonction :

```javascript
const token = 'VOTRE_TOKEN_ICI'; // Collez le token obtenu

// Tester GET /pending
fetch('https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/pending', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);

// Tester GET /stats
fetch('https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/stats', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 🔧 Test complet dans le navigateur

Ouvrez la console du navigateur (F12) sur https://asgf-siteweb.web.app et collez ce script :

```javascript
// Script de test complet
(async () => {
  // 1. Vérifier si vous êtes connecté
  const existingToken = localStorage.getItem('asgf_admin_token');
  
  if (!existingToken) {
    console.log('❌ Vous n\'êtes pas connecté. Connectez-vous d\'abord.');
    return;
  }
  
  console.log('✅ Token trouvé dans localStorage');
  
  const token = existingToken;
  const baseUrl = 'https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members';
  
  // 2. Tester GET /pending
  console.log('\n📋 Test: GET /pending');
  try {
    const pendingRes = await fetch(`${baseUrl}/pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const pendingData = await pendingRes.json();
    console.log('✅ Réponse:', pendingData);
  } catch (err) {
    console.error('❌ Erreur:', err);
  }
  
  // 3. Tester GET /stats
  console.log('\n📊 Test: GET /stats');
  try {
    const statsRes = await fetch(`${baseUrl}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const statsData = await statsRes.json();
    console.log('✅ Réponse:', statsData);
  } catch (err) {
    console.error('❌ Erreur:', err);
  }
  
  // 4. Tester GET / (liste)
  console.log('\n📋 Test: GET / (liste membres)');
  try {
    const listRes = await fetch(`${baseUrl}?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const listData = await listRes.json();
    console.log('✅ Réponse:', listData);
  } catch (err) {
    console.error('❌ Erreur:', err);
  }
  
  console.log('\n✅ Tests terminés!');
})();
```

---

## ✅ Vérification dans le Dashboard

Vous pouvez aussi vérifier les logs dans le Dashboard Supabase :

1. Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions
2. Cliquez sur `admin-adhesion-members`
3. Allez dans l'onglet "Logs"
4. Vous verrez les requêtes et les erreurs

---

## 🎯 Résumé

- ✅ **Fonction déployée** : `admin-adhesion-members` est en ligne
- ✅ **Secrets configurés** : Tous les secrets nécessaires sont présents
- ⚠️ **Pour tester** : Vous devez utiliser un **token JWT valide** obtenu via `admin-login`

L'erreur "Token invalide" est **normale** si vous testez sans token ou avec un token invalide. Une fois que vous utilisez un token valide (obtenu via la connexion admin), tout devrait fonctionner ! 🚀


