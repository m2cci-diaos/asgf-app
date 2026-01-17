# Script de déploiement avec Supabase CLI local
# Téléchargez supabase.exe et placez-le dans le dossier bin/

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Déploiement Fonctions Supabase (Local)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Chercher supabase.exe dans plusieurs emplacements
$supabasePaths = @(
    ".\bin\supabase.exe",
    ".\supabase.exe",
    "C:\Tools\supabase.exe",
    "C:\Program Files\Supabase\supabase.exe"
)

$SUPABASE_CLI = $null

foreach ($path in $supabasePaths) {
    if (Test-Path $path) {
        $SUPABASE_CLI = Resolve-Path $path
        break
    }
}

if (-not $SUPABASE_CLI) {
    Write-Host "✗ Supabase CLI non trouvé!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Veuillez télécharger supabase.exe depuis:" -ForegroundColor Yellow
    Write-Host "  https://github.com/supabase/cli/releases/latest" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Et placez-le dans un de ces emplacements:" -ForegroundColor Yellow
    foreach ($path in $supabasePaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Ou exécutez: .\install-supabase-cli.ps1" -ForegroundColor Cyan
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "✓ Supabase CLI trouvé: $SUPABASE_CLI" -ForegroundColor Green
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "supabase\functions")) {
    Write-Host "✗ Le dossier 'supabase\functions' n'existe pas" -ForegroundColor Red
    Write-Host "Assurez-vous d'exécuter ce script depuis la racine du projet" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "[1/3] Vérification de la connexion Supabase..." -ForegroundColor Yellow

# Tester la connexion
try {
    & $SUPABASE_CLI projects list 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Vous n'êtes pas connecté" -ForegroundColor Yellow
        Write-Host "  Connexion en cours..." -ForegroundColor Cyan
        & $SUPABASE_CLI login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ Échec de la connexion" -ForegroundColor Red
            Read-Host "Appuyez sur Entrée pour quitter"
            exit 1
        }
    }
    Write-Host "  ✓ Connecté à Supabase" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Connexion en cours..." -ForegroundColor Yellow
    & $SUPABASE_CLI login
}

Write-Host ""
Write-Host "[2/3] Déploiement de la fonction admin-adhesion-members..." -ForegroundColor Yellow

try {
    & $SUPABASE_CLI functions deploy admin-adhesion-members --no-verify-jwt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Fonction déployée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Erreur lors du déploiement" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
} catch {
    Write-Host "  ✗ Erreur: $_" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""
Write-Host "[3/3] Vérification..." -ForegroundColor Yellow
Write-Host "  ✓ Déploiement terminé!" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ✓ Déploiement réussi!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "N'oubliez pas de configurer les secrets dans le Dashboard Supabase:" -ForegroundColor Yellow
Write-Host "  - APPSCRIPT_CONTACT_WEBHOOK_URL" -ForegroundColor Cyan
Write-Host "  - APPSCRIPT_CONTACT_TOKEN" -ForegroundColor Cyan
Write-Host ""

Read-Host "Appuyez sur Entrée pour continuer"


