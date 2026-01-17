# Script de déploiement simplifié - Utilise le supabase.exe trouvé
# Usage: .\deploy-simple.ps1

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Déploiement Fonctions Supabase ASGF" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Chemin vers supabase.exe
$supabaseExe = "C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\supabase.exe"

# Vérifier que le fichier existe
if (-not (Test-Path $supabaseExe)) {
    Write-Host "✗ supabase.exe non trouvé à: $supabaseExe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Recherche dans le répertoire courant..." -ForegroundColor Yellow
    
    # Chercher dans le répertoire courant
    $found = Get-ChildItem -Path . -Filter "supabase.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($found) {
        $supabaseExe = $found.FullName
        Write-Host "✓ Trouvé: $supabaseExe" -ForegroundColor Green
    } else {
        Write-Host "✗ supabase.exe non trouvé" -ForegroundColor Red
        Write-Host "Veuillez vérifier le chemin ou télécharger supabase.exe" -ForegroundColor Yellow
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
} else {
    Write-Host "✓ supabase.exe trouvé" -ForegroundColor Green
}

Write-Host ""
Write-Host "[1/3] Connexion à Supabase..." -ForegroundColor Yellow

# Tester la version
try {
    $version = & $supabaseExe --version 2>&1
    Write-Host "  Version: $version" -ForegroundColor Cyan
} catch {
    Write-Host "  ⚠ Impossible de vérifier la version" -ForegroundColor Yellow
}

# Se connecter
Write-Host "  Connexion..." -ForegroundColor Cyan
try {
    & $supabaseExe login 2>&1 | Out-Null
    Write-Host "  ✓ Connecté" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Erreur de connexion (peut-être déjà connecté)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/3] Déploiement de admin-adhesion-members..." -ForegroundColor Yellow

try {
    Write-Host "  Déploiement en cours..." -ForegroundColor Cyan
    & $supabaseExe functions deploy admin-adhesion-members --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Fonction déployée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Erreur lors du déploiement (code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Vérifiez:" -ForegroundColor Yellow
        Write-Host "  1. Que vous êtes connecté: $supabaseExe login" -ForegroundColor Cyan
        Write-Host "  2. Que le projet est lié: $supabaseExe link --project-ref [VOTRE_REF]" -ForegroundColor Cyan
        Write-Host "  3. Les logs ci-dessus pour plus de détails" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ✗ Erreur: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/3] Résumé..." -ForegroundColor Yellow

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Déploiement terminé!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠ N'oubliez pas de configurer les secrets dans le Dashboard Supabase:" -ForegroundColor Yellow
Write-Host "  - APPSCRIPT_CONTACT_WEBHOOK_URL" -ForegroundColor Cyan
Write-Host "  - APPSCRIPT_CONTACT_TOKEN" -ForegroundColor Cyan
Write-Host ""

Read-Host "Appuyez sur Entrée pour continuer"

