# Script de déploiement du frontend sur Firebase
# Usage: .\deploy-frontend.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Déploiement Frontend Firebase - ASGF" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier le répertoire de base
$projectRoot = Split-Path -Parent $PSScriptRoot
$asgfAppPath = Join-Path $projectRoot "asgf-app"

# Vérifier que le dossier asgf-app existe
if (-not (Test-Path $asgfAppPath)) {
    Write-Host "✗ Le dossier 'asgf-app' n'existe pas dans: $projectRoot" -ForegroundColor Red
    Write-Host "Répertoire actuel: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "[1/4] Navigation vers asgf-app..." -ForegroundColor Yellow
Set-Location $asgfAppPath
Write-Host "  ✓ Répertoire: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Vérifier Firebase CLI
Write-Host "[2/4] Vérification de Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Host "  ✓ Firebase CLI installé: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Firebase CLI non trouvé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installez Firebase CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g firebase-tools" -ForegroundColor Cyan
    Write-Host "  firebase login" -ForegroundColor Cyan
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""

# Vérifier firebase.json
if (-not (Test-Path "firebase.json")) {
    Write-Host "✗ firebase.json non trouvé dans asgf-app" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "[3/4] Construction de l'application..." -ForegroundColor Yellow
Write-Host "  Exécution de: npm run build" -ForegroundColor Cyan
Write-Host "  (Cela peut prendre quelques minutes...)" -ForegroundColor Gray
Write-Host ""

try {
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "✗ Erreur lors de la construction" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
    
    Write-Host ""
    Write-Host "  ✓ Construction réussie!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "✗ Erreur lors de la construction: $_" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""
Write-Host "[4/4] Déploiement sur Firebase Hosting..." -ForegroundColor Yellow
Write-Host "  Exécution de: firebase deploy --only hosting" -ForegroundColor Cyan
Write-Host "  (Cela peut prendre 1-2 minutes...)" -ForegroundColor Gray
Write-Host ""

try {
    firebase deploy --only hosting
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "✗ Erreur lors du déploiement" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  ✓ Déploiement réussi!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Votre site est maintenant disponible sur:" -ForegroundColor Yellow
    Write-Host "  https://asgf-siteweb.web.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Les fonctions Supabase sont maintenant actives!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "✗ Erreur lors du déploiement: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez:" -ForegroundColor Yellow
    Write-Host "  1. Que vous êtes connecté: firebase login" -ForegroundColor Cyan
    Write-Host "  2. Que le projet est configuré: firebase use" -ForegroundColor Cyan
    Write-Host ""
}

Read-Host "Appuyez sur Entrée pour continuer"


