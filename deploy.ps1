# Script de déploiement simplifié - Utilise supabase.exe dans le répertoire courant
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Déploiement Fonctions Supabase ASGF" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que supabase.exe existe
if (-not (Test-Path "supabase.exe")) {
    Write-Host "✗ supabase.exe non trouvé dans le répertoire courant" -ForegroundColor Red
    Write-Host "Répertoire actuel: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "✓ supabase.exe trouvé" -ForegroundColor Green
Write-Host ""

# Vérifier que le dossier supabase/functions existe
if (-not (Test-Path "supabase\functions")) {
    Write-Host "✗ Le dossier 'supabase\functions' n'existe pas" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "[1/4] Vérification de la connexion Supabase..." -ForegroundColor Yellow

# Tester la connexion
try {
    $result = .\supabase.exe projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Vous n'êtes pas connecté" -ForegroundColor Yellow
        Write-Host "  Connexion en cours..." -ForegroundColor Cyan
        .\supabase.exe login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ Échec de la connexion" -ForegroundColor Red
            Read-Host "Appuyez sur Entrée pour quitter"
            exit 1
        }
    } else {
        Write-Host "  ✓ Connecté à Supabase" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Connexion en cours..." -ForegroundColor Yellow
    .\supabase.exe login
}

Write-Host ""
Write-Host "[2/4] Liste des fonctions disponibles..." -ForegroundColor Yellow

$functions = @(
    "admin-adhesion-members",
    "admin-login",
    "admin-dashboard-stats",
    "public-bureau",
    "projet-inscription"
)

$existingFunctions = @()

foreach ($func in $functions) {
    $funcPath = "supabase\functions\$func"
    if (Test-Path $funcPath) {
        $existingFunctions += $func
        Write-Host "  ✓ $func" -ForegroundColor Green
    }
}

if ($existingFunctions.Count -eq 0) {
    Write-Host "  ✗ Aucune fonction trouvée" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""
Write-Host "[3/4] Déploiement des fonctions..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$errorCount = 0

foreach ($func in $existingFunctions) {
    Write-Host "  → Déploiement de $func..." -ForegroundColor Cyan
    
    try {
        $output = .\supabase.exe functions deploy $func --no-verify-jwt 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ $func déployé avec succès" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "    ✗ Échec du déploiement de $func" -ForegroundColor Red
            $errorCount++
            # Afficher les erreurs
            $output | ForEach-Object {
                if ($_ -match "error|Error|ERROR|failed|Failed|FAILED") {
                    Write-Host "      $_" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "    ✗ Erreur: $_" -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

Write-Host "[4/4] Résumé..." -ForegroundColor Yellow
Write-Host "  Fonctions déployées: $successCount/$($existingFunctions.Count)" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Yellow" })

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($errorCount -eq 0) {
    Write-Host "  ✓ Déploiement terminé avec succès!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Déploiement terminé avec des erreurs" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "⚠ Important: Configurez les secrets dans le Dashboard Supabase:" -ForegroundColor Yellow
    Write-Host "  - APPSCRIPT_CONTACT_WEBHOOK_URL" -ForegroundColor Cyan
    Write-Host "  - APPSCRIPT_CONTACT_TOKEN" -ForegroundColor Cyan
    Write-Host ""
}

Read-Host "Appuyez sur Entrée pour continuer"

