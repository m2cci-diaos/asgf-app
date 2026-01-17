# 🚀 Déploiement Simple - Guide Rapide

## ✅ Bonne nouvelle !

Vous avez déjà `supabase.exe` dans votre projet ! Voici comment l'utiliser.

---

## 📋 Déploiement en 3 étapes

### Étape 1 : Se connecter à Supabase

Ouvrez PowerShell dans la racine du projet et exécutez :

```powershell
.\supabase.exe login
```

Cela ouvrira votre navigateur pour vous authentifier.

### Étape 2 : Lier votre projet (si pas déjà fait)

```powershell
.\supabase.exe link --project-ref wooyxkfdzehvedvivhhd
```

**Remplacez `wooyxkfdzehvedvivhhd` par votre project-ref Supabase.**

### Étape 3 : Déployer la fonction

```powershell
.\supabase.exe functions deploy admin-adhesion-members --no-verify-jwt
```

---

## 🎯 Utiliser le script automatique

**C'est encore plus simple !** J'ai créé un script qui fait tout automatiquement :

```powershell
.\deploy-fonction.ps1
```

Ce script va :
1. ✅ Vérifier que supabase.exe existe
2. ✅ Vous connecter à Supabase
3. ✅ Déployer la fonction admin-adhesion-members

---

## 📝 Commandes complètes (Copier-coller)

```powershell
# Se positionner dans le projet (si pas déjà fait)
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

# Se connecter (ouvrira votre navigateur)
.\supabase.exe login

# Déployer la fonction
.\supabase.exe functions deploy admin-adhesion-members --no-verify-jwt
```

---

## 🔍 Vérifier le déploiement

Après le déploiement, allez sur :
- **Dashboard Supabase :** https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions
- Vous devriez voir `admin-adhesion-members` dans la liste

---

## ⚙️ Configurer les secrets (Important !)

N'oubliez pas de configurer les secrets dans le Dashboard Supabase :

1. Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/settings/functions
2. Section "Secrets", ajoutez :
   - `APPSCRIPT_CONTACT_WEBHOOK_URL` = `https://script.google.com/macros/s/[VOTRE_ID]/exec`
   - `APPSCRIPT_CONTACT_TOKEN` = `ASGF123`

---

## 🚀 C'est tout !

Une fois déployé, votre frontend (qui est déjà configuré) pourra utiliser les fonctions Supabase directement.


