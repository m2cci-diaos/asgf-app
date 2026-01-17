# 🚀 Commandes de Redéploiement - Copier-Coller

## 🎯 Option 1 : Script Automatique (RECOMMANDÉ)

Depuis la **racine du projet** (`asgf-admin`), exécutez :

```powershell
.\deploy-frontend.ps1
```

Ce script fait tout automatiquement :
- ✅ Vérifie Firebase CLI
- ✅ Construit l'application
- ✅ Déploie sur Firebase

---

## 🎯 Option 2 : Commandes Manuelles

### Étape 1 : Aller dans asgf-app

```powershell
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\asgf-app
```

### Étape 2 : Construire l'application

```powershell
npm run build
```

### Étape 3 : Déployer sur Firebase

```powershell
firebase deploy --only hosting
```

---

## ⚡ Commandes Rapides (Copier-Coller)

**Exécutez ces commandes dans PowerShell, une par une :**

```powershell
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\asgf-app
```

```powershell
npm run build
```

```powershell
firebase deploy --only hosting
```

---

## ✅ Résultat Attendu

À la fin, vous verrez :

```
✔  Deploy complete!

Hosting URL: https://asgf-siteweb.web.app
```

---

## 🔍 Vérification

1. Visitez : https://asgf-siteweb.web.app
2. Connectez-vous
3. Testez les fonctionnalités
4. Les erreurs `localhost:3001` ne devraient plus apparaître

---

## ⚠️ Si vous n'êtes pas connecté à Firebase

Si vous obtenez une erreur de connexion :

```powershell
firebase login
```

Puis relancez le déploiement.


