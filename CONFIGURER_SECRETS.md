# 🔐 Configuration des Secrets Supabase - Guide

## ⚠️ Problème actuel

Vous obtenez `{"success":false,"message":"Token invalide"}` car les secrets ne sont pas configurés dans Supabase.

## ✅ Solution : Configurer les secrets

### Méthode 1 : Via le Dashboard Supabase (RECOMMANDÉ)

1. **Allez sur le Dashboard Supabase :**
   - URL : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/settings/functions

2. **Dans la section "Secrets", ajoutez ces variables :**

   | Nom | Valeur | Description |
   |-----|--------|-------------|
   | `JWT_SECRET` | `[Votre JWT Secret]` | Secret pour vérifier les tokens JWT |
   | `APPSCRIPT_CONTACT_WEBHOOK_URL` | `https://script.google.com/macros/s/[ID]/exec` | URL du webhook Google Apps Script |
   | `APPSCRIPT_CONTACT_TOKEN` | `ASGF123` | Token pour sécuriser le webhook |

3. **Comment obtenir JWT_SECRET :**
   - Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/settings/api
   - Dans la section "JWT Settings", copiez le **JWT Secret**
   - C'est la même valeur que celle utilisée par votre backend

### Méthode 2 : Via CLI (Alternative)

```powershell
# Obtenir le JWT Secret depuis le dashboard Supabase
# Puis exécuter :

.\supabase.exe secrets set JWT_SECRET="votre-jwt-secret-ici" --project-ref wooyxkfdzehvedvivhhd
.\supabase.exe secrets set APPSCRIPT_CONTACT_WEBHOOK_URL="https://script.google.com/macros/s/[ID]/exec" --project-ref wooyxkfdzehvedvivhhd
.\supabase.exe secrets set APPSCRIPT_CONTACT_TOKEN="ASGF123" --project-ref wooyxkfdzehvedvivhhd
```

---

## 📋 Secrets requis

### 1. JWT_SECRET (OBLIGATOIRE)

**Où le trouver :**
- Dashboard Supabase → Settings → API → JWT Settings → JWT Secret

**Pourquoi :**
- La fonction `admin-adhesion-members` vérifie les tokens JWT avec ce secret
- Il doit être identique à celui utilisé par votre backend et la fonction `admin-login`

### 2. APPSCRIPT_CONTACT_WEBHOOK_URL (Pour l'envoi d'emails)

**Où le trouver :**
- URL de déploiement de votre Google Apps Script
- Format : `https://script.google.com/macros/s/[SCRIPT_ID]/exec`

### 3. APPSCRIPT_CONTACT_TOKEN (Pour l'envoi d'emails)

**Valeur :**
- `ASGF123` (ou la valeur que vous avez définie dans votre script Google Apps Script)

---

## ✅ Vérification

Après avoir configuré les secrets :

1. **Redéployez la fonction** (pour charger les nouveaux secrets) :
   ```powershell
   .\supabase.exe functions deploy admin-adhesion-members --no-verify-jwt
   ```

2. **Testez avec un token valide** :
   - Connectez-vous via `admin-login` pour obtenir un token
   - Utilisez ce token dans le header `Authorization: Bearer [token]`

---

## 🔍 Comment tester

### Via le navigateur (avec token)

1. Connectez-vous via votre application pour obtenir un token
2. Ouvrez la console du navigateur (F12)
3. Exécutez :
   ```javascript
   const token = localStorage.getItem('asgf_admin_token');
   fetch('https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/pending', {
     headers: {
       'Authorization': `Bearer ${token}`,
       'apikey': 'votre-anon-key'
     }
   })
   .then(r => r.json())
   .then(console.log);
   ```

### Via curl (PowerShell)

```powershell
$token = "votre-token-jwt-ici"
$headers = @{
    "Authorization" = "Bearer $token"
    "apikey" = "votre-anon-key"
}

Invoke-RestMethod -Uri "https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members/pending" -Headers $headers
```

---

## ⚠️ Important

- Les secrets sont automatiquement disponibles via `Deno.env.get("NOM_DU_SECRET")`
- Pas besoin de redémarrer quoi que ce soit, juste redéployer la fonction
- Le JWT_SECRET doit être **identique** à celui utilisé par `admin-login` pour générer les tokens

---

## 🚀 Prochaines étapes

1. ✅ Configurer JWT_SECRET dans le Dashboard Supabase
2. ✅ Configurer APPSCRIPT_CONTACT_WEBHOOK_URL (si vous utilisez l'envoi d'emails)
3. ✅ Configurer APPSCRIPT_CONTACT_TOKEN (si vous utilisez l'envoi d'emails)
4. ✅ Redéployer la fonction pour charger les nouveaux secrets
5. ✅ Tester avec un token valide


