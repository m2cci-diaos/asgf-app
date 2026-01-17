# 🚀 Commande de Déploiement - Module Trésorerie

## ⚡ Commande Unique

Pour déployer toutes les routes du module trésorerie, exécutez simplement :

```powershell
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin
.\supabase.exe functions deploy admin-tresorerie --no-verify-jwt
```

## ✅ Résultat Attendu

Vous devriez voir :
```
Deployed Functions on project wooyxkfdzehvedvivhhd: admin-tresorerie
You can inspect your deployment in the Dashboard: 
https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions
```

## 📋 Routes Ajoutées Cette Session

✅ **Nouvelles routes déployées :**
- POST `/cotisations/:id/reset` - Réinitialiser une cotisation
- POST `/paiements/:id/cancel` - Annuler un paiement  
- DELETE `/paiements/:id` - Supprimer un paiement

## 🎯 Toutes les Routes Déployées

**Total : 29/39 routes (74%)**

Les routes essentielles sont maintenant toutes disponibles !

---

**Prêt à déployer ? Exécutez la commande ci-dessus !** 🚀


