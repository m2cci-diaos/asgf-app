# 🪟 Commandes Windows - Déploiement ASGF

## 🚀 Déploiement Rapide

### 1️⃣ Installer Supabase CLI

```powershell
npm install -g supabase
```

### 2️⃣ Se connecter à Supabase

```powershell
supabase login
```

### 3️⃣ Déployer les fonctions (Script automatique)

Depuis la **racine du projet** (`asgf-admin`) :

```powershell
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin
.\deploy-supabase.ps1
```

### 4️⃣ Déployer les fonctions (Manuel)

```powershell
# Depuis la racine du projet
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

# Déployer chaque fonction
supabase functions deploy admin-adhesion-members
supabase functions deploy admin-login
supabase functions deploy admin-dashboard-stats
supabase functions deploy public-bureau
supabase functions deploy projet-inscription
```

### 5️⃣ Déployer le Frontend

```powershell
# Depuis la racine du projet
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

# Aller dans asgf-app
cd asgf-app

# Construire
npm install
npm run build

# Déployer
firebase deploy --only hosting
```

---

## 📝 Commandes Utiles

### Vérifier la version de Supabase CLI

```powershell
supabase --version
```

### Lister les projets Supabase

```powershell
supabase projects list
```

### Lier un projet Supabase

```powershell
supabase link --project-ref wooyxkfdzehvedvivhhd
```

### Voir les logs des fonctions

```powershell
supabase functions logs admin-adhesion-members
```

---

## 🔧 Dépannage

### "supabase : Le terme n'est pas reconnu"

**Solution :**

```powershell
# Option 1 : Installer via npm
npm install -g supabase

# Option 2 : Vérifier que npm est dans le PATH
where.exe npm

# Option 3 : Redémarrer PowerShell après installation
```

### "Project not found"

**Solution :** Vérifiez votre project-ref dans le dashboard Supabase et liez le projet :

```powershell
supabase link --project-ref VOTRE_PROJECT_REF
```

### "Function not found"

**Solution :** Vérifiez que vous êtes dans le bon répertoire :

```powershell
# Depuis la racine du projet
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

# Vérifier que supabase/functions existe
dir supabase\functions
```

---

## 📂 Structure des répertoires

```
asgf-admin/                    ← VOUS DEVEZ ÊTRE ICI
├── supabase/
│   ├── functions/
│   │   ├── admin-adhesion-members/
│   │   ├── admin-login/
│   │   └── ...
│   └── config.toml
├── asgf-app/                  ← Pour déployer le frontend
└── deploy-supabase.ps1        ← Script de déploiement
```

---

## ✅ Checklist de déploiement

- [ ] Supabase CLI installé (`supabase --version`)
- [ ] Connecté à Supabase (`supabase login`)
- [ ] Projet lié (`supabase link`)
- [ ] Fonctions déployées (`supabase functions deploy`)
- [ ] Secrets configurés (Dashboard Supabase)
- [ ] Frontend déployé (`firebase deploy --only hosting`)
- [ ] Variables d'environnement configurées (Firebase)

---

## 🔗 Liens utiles

- **Firebase Console :** https://console.firebase.google.com/project/asgf-siteweb
- **Supabase Dashboard :** https://supabase.com/dashboard
- **Site Web :** https://asgf-siteweb.web.app


