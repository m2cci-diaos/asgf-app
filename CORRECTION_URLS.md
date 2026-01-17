# ✅ Correction des URLs - Migration vers Supabase Functions

## 🔧 Problème résolu

Le frontend pointait vers `localhost:3001` (backend Express local) au lieu des fonctions Supabase Edge Functions déployées.

## ✨ Modifications apportées

### 1. Configuration des URLs Supabase

**Fichier modifié :** `asgf-app/src/admin/services/api.js`

- ✅ URL corrigée pour utiliser le bon format Supabase : `https://[project-ref].supabase.co/functions/v1/`
- ✅ Construction automatique de l'URL à partir de `VITE_SUPABASE_URL`

### 2. Fonctions mises à jour

Les fonctions suivantes utilisent maintenant les fonctions Supabase Edge Functions :

- ✅ `fetchPendingMembers()` → `${ADMIN_ADHESION_MEMBERS_URL}/pending`
- ✅ `fetchAdhesionStats()` → `${ADMIN_ADHESION_MEMBERS_URL}/stats`
- ✅ `sendMemberEmails()` → `${ADMIN_ADHESION_MEMBERS_URL}/email`
- ✅ `fetchAllMembers()` → Déjà corrigée (utilisait déjà la bonne URL)
- ✅ `approveMember()`, `rejectMember()`, `updateMember()`, `deleteMember()` → Déjà corrigées

## 📋 Configuration requise

### Variables d'environnement

Assurez-vous que ces variables sont définies dans votre fichier `.env` ou dans les variables d'environnement de votre build :

```env
VITE_SUPABASE_URL=https://wooyxkfdzehvedvivhhd.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key_ici
```

**Pour Firebase Hosting :**

1. Allez dans Firebase Console → Hosting → Variables d'environnement
2. Ajoutez les variables ci-dessus
3. Redéployez votre application

Ou créez un fichier `.env.production` dans `asgf-app/` :

```env
VITE_SUPABASE_URL=https://wooyxkfdzehvedvivhhd.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key_ici
```

## 🔍 URLs des fonctions

Les fonctions Supabase sont maintenant accessibles via :

```
https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members
https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/pending
https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/stats
https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/email
```

## 🚀 Prochaines étapes

1. **Redéployer le frontend** sur Firebase Hosting :
   ```bash
   cd asgf-app
   npm run build
   firebase deploy --only hosting
   ```

2. **Vérifier les variables d'environnement** dans Firebase Console

3. **Tester les routes** dans la console du navigateur après redéploiement

## ⚠️ Important

- Les fonctions Supabase doivent être déployées avant de tester
- Assurez-vous que `VITE_SUPABASE_URL` pointe vers votre projet Supabase correct
- Vérifiez que les fonctions Supabase ont les variables d'environnement nécessaires configurées (APPSCRIPT_CONTACT_WEBHOOK_URL, etc.)

## 🔗 Routes disponibles

| Fonction | Route Supabase |
|----------|----------------|
| Liste membres | `GET /functions/v1/admin-adhesion-members` |
| Membres en attente | `GET /functions/v1/admin-adhesion-members/pending` |
| Statistiques | `GET /functions/v1/admin-adhesion-members/stats` |
| Envoyer emails | `POST /functions/v1/admin-adhesion-members/email` |
| Approuver | `POST /functions/v1/admin-adhesion-members/:id/approve` |
| Rejeter | `POST /functions/v1/admin-adhesion-members/:id/reject` |
| Modifier | `PUT /functions/v1/admin-adhesion-members/:id` |
| Supprimer | `DELETE /functions/v1/admin-adhesion-members/:id` |


