# Script de déploiement simple - Utilise supabase.exe dans le projet
# Usage: .\deploy-fonction.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Déploiement Fonction admin-adhesion-members" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que supabase.exe existe
if (-not (Test-Path "supabase.exe")) {
    Write-Host "✗ supabase.exe non trouvé dans le répertoire actuel" -ForegroundColor Red
    Write-Host "Répertoire actuel: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "✓ Supabase CLI trouvé" -ForegroundColor Green

# Vérifier la version
Write-Host ""
Write-Host "Version:" -ForegroundColor Yellow
.\supabase.exe --version
Write-Host ""

# Étape 1: Se connecter
Write-Host "[1/3] Connexion à Supabase..." -ForegroundColor Yellow
Write-Host "  Ouvrant le navigateur pour vous connecter..." -ForegroundColor Cyan
Write-Host ""

.\supabase.exe login

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Échec de la connexion" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Utilisez un token d'accès" -ForegroundColor Yellow
    Write-Host "  1. Allez sur: https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
    Write-Host "  2. Créez un nouveau token" -ForegroundColor Cyan
    Write-Host "  3. Exécutez:" -ForegroundColor Cyan
    Write-Host "     `$env:SUPABASE_ACCESS_TOKEN='votre-token'" -ForegroundColor White
    Write-Host "     .\supabase.exe login --token `$env:SUPABASE_ACCESS_TOKEN" -ForegroundColor White
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "  ✓ Connecté avec succès!" -ForegroundColor Green
Write-Host ""

# Étape 2: Vérifier que la fonction existe
Write-Host "[2/3] Vérification de la fonction..." -ForegroundColor Yellow

if (-not (Test-Path "supabase\functions\admin-adhesion-members\index.ts")) {
    Write-Host "  ✗ La fonction admin-adhesion-members n'existe pas" -ForegroundColor Red
    Write-Host "  Chemin attendu: supabase\functions\admin-adhesion-members\index.ts" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "  ✓ Fonction trouvée" -ForegroundColor Green
Write-Host ""

# Étape 3: Déployer
Write-Host "[3/3] Déploiement de la fonction admin-adhesion-members..." -ForegroundColor Yellow
Write-Host "  Cela peut prendre quelques instants..." -ForegroundColor Cyan
Write-Host ""

.\supabase.exe functions deploy admin-adhesion-members --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  ✓ Déploiement réussi!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "La fonction est maintenant disponible à:" -ForegroundColor Yellow
    Write-Host "  https://wooyxkfdzehvedvivhhd.supabase.co/functions/v1/admin-adhesion-members" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "N'oubliez pas de configurer les secrets dans le Dashboard Supabase:" -ForegroundColor Yellow
    Write-Host "  - APPSCRIPT_CONTACT_WEBHOOK_URL" -ForegroundColor Cyan
    Write-Host "  - APPSCRIPT_CONTACT_TOKEN" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "  ✗ Erreur lors du déploiement" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez:" -ForegroundColor Yellow
    Write-Host "  1. Que vous êtes connecté à Supabase" -ForegroundColor Cyan
    Write-Host "  2. Que votre projet est lié (supabase link)" -ForegroundColor Cyan
    Write-Host "  3. Les logs d'erreur ci-dessus" -ForegroundColor Cyan
    Write-Host ""
}

Read-Host "Appuyez sur Entrée pour continuer"


