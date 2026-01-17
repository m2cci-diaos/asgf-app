# 🔧 Installation Supabase CLI - Windows

## ❌ Problème

L'installation via `npm install -g supabase` ne fonctionne plus car Supabase CLI n'est plus supporté comme module global npm.

## ✅ Solutions

### Option 1 : Télécharger l'exécutable directement (RECOMMANDÉ)

1. **Télécharger Supabase CLI :**
   - Allez sur : https://github.com/supabase/cli/releases/latest
   - Téléchargez : `supabase_windows_amd64.zip` (ou `supabase_windows_arm64.zip` si vous êtes sur ARM)

2. **Extraire l'exécutable :**
   - Décompressez le fichier ZIP
   - Vous obtiendrez `supabase.exe`

3. **Placer dans un dossier accessible :**
   
   **Option A : Dans le projet (Simple mais local)**
   ```powershell
   # Créer un dossier bin dans le projet
   mkdir C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\bin
   
   # Copier supabase.exe dans ce dossier
   # (Vous devrez faire cela manuellement après téléchargement)
   
   # Utiliser avec le chemin complet
   .\bin\supabase.exe --version
   ```

   **Option B : Dans le PATH Windows (Recommandé)**
   ```powershell
   # Créer un dossier pour les outils
   mkdir C:\Tools
   
   # Copier supabase.exe dans C:\Tools
   # (Faites cela manuellement après téléchargement)
   
   # Ajouter au PATH
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Tools", "User")
   
   # Redémarrer PowerShell et tester
   supabase --version
   ```

### Option 2 : Utiliser Scoop (Si vous avez Scoop installé)

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Option 3 : Utiliser Chocolatey (Si vous avez Chocolatey installé)

```powershell
choco install supabase
```

### Option 4 : Déployer via le Dashboard Supabase (Sans CLI)

Vous pouvez déployer les fonctions directement depuis le Dashboard Supabase :

1. Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions
2. Utilisez l'interface web pour uploader vos fonctions

---

## 🚀 Solution Rapide - Script d'installation automatique

Créons un script qui télécharge et installe automatiquement Supabase CLI.


