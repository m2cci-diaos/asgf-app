# 📦 Guide de Déploiement - Routes Manquantes Trésorerie

## 🎯 Processus Simple

Pour ajouter et déployer les routes manquantes, il suffit de :

### Étape 1 : Ajouter les routes dans le code
Les routes sont ajoutées dans le fichier :
```
supabase/functions/admin-tresorerie/index.ts
```

### Étape 2 : Redéployer la fonction
Une seule commande :
```powershell
.\supabase.exe functions deploy admin-tresorerie --no-verify-jwt
```

C'est tout ! 🎉

---

## 📋 Routes à Ajouter

### Routes Prioritaires (à ajouter maintenant)
1. ✅ POST `/cotisations/:id/reset` - Réinitialiser une cotisation
2. ✅ POST `/paiements/:id/cancel` - Annuler un paiement
3. ✅ DELETE `/paiements/:id` - Supprimer un paiement

### Routes Avancées (optionnelles)
4. POST `/cotisations/generate-monthly` - Génération automatique
5. POST `/cotisations/update-overdue` - Mise à jour automatique
6. POST `/cotisations/clean-duplicates` - Nettoyage automatique
7. POST `/cotisations/create-missing` - Création automatique
8. POST `/cartes/:id/generate-pdf` - Génération PDF
9. GET `/exports/*` - Exports CSV/Excel

---

## ⚡ Déploiement Rapide

Une fois les routes ajoutées dans le code, exécutez :

```powershell
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin
.\supabase.exe functions deploy admin-tresorerie --no-verify-jwt
```

---

## ✅ Vérification

Après le déploiement, vous verrez :
```
Deployed Functions on project wooyxkfdzehvedvivhhd: admin-tresorerie
```

Vous pouvez vérifier sur :
https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions


