# 🚀 Guide de Redéploiement Frontend - Firebase

## 📋 Étapes pour redéployer le frontend

### 1. Aller dans le dossier asgf-app

```powershell
cd asgf-app
```

### 2. Vérifier que Firebase CLI est installé

```powershell
firebase --version
```

Si Firebase CLI n'est pas installé :
```powershell
npm install -g firebase-tools
firebase login
```

### 3. Construire l'application

```powershell
npm run build
```

### 4. Déployer sur Firebase Hosting

```powershell
firebase deploy --only hosting
```

---

## ✅ Résultat attendu

Après le déploiement, vous verrez quelque chose comme :

```
✔  Deploy complete!

Hosting URL: https://asgf-siteweb.web.app
```

---

## 🔍 Vérification

1. Visitez : https://asgf-siteweb.web.app
2. Connectez-vous et testez les fonctionnalités
3. Les erreurs `localhost:3001` ne devraient plus apparaître

---

## 📝 Commandes complètes (copier-coller)

```powershell
# Depuis la racine du projet
cd asgf-app

# Construire
npm run build

# Déployer
firebase deploy --only hosting
```

---

## ⚠️ Notes importantes

- Le build peut prendre quelques minutes
- Le déploiement peut prendre 1-2 minutes
- Votre site sera temporairement en maintenance pendant le déploiement (quelques secondes)


