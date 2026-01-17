# Script de déploiement des fonctions Supabase pour Windows
# Usage: .\deploy-supabase.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Déploiement Fonctions Supabase ASGF" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "supabase")) {
    Write-Host "[ERREUR] Le dossier 'supabase' n'existe pas." -ForegroundColor Red
    Write-Host "Assurez-vous d'exécuter ce script depuis la racine du projet (asgf-admin)" -ForegroundColor Yellow
    Write-Host "Répertoire actuel: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Vérifier si Supabase CLI est installé
Write-Host "[1/4] Vérification de Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "  ✓ Supabase CLI installé: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Supabase CLI non trouvé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Veuillez installer Supabase CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou visitez: https://github.com/supabase/cli/releases" -ForegroundColor Cyan
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Vérification de la connexion Supabase..." -ForegroundColor Yellow

# Vérifier si l'utilisateur est connecté
try {
    $linkInfo = supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Vous n'êtes pas connecté à Supabase" -ForegroundColor Yellow
        Write-Host "  Exécution de: supabase login" -ForegroundColor Cyan
        supabase login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ Échec de la connexion" -ForegroundColor Red
            Read-Host "Appuyez sur Entrée pour quitter"
            exit 1
        }
    }
    Write-Host "  ✓ Connecté à Supabase" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Erreur lors de la vérification de la connexion" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/4] Déploiement des fonctions Supabase..." -ForegroundColor Yellow
Write-Host ""

# Liste des fonctions à déployer
$functions = @(
    "admin-adhesion-members",
    "admin-login",
    "admin-dashboard-stats",
    "public-bureau",
    "projet-inscription"
)

$successCount = 0
$errorCount = 0

foreach ($func in $functions) {
    $funcPath = "supabase\functions\$func"
    
    if (Test-Path $funcPath) {
        Write-Host "  → Déploiement de $func..." -ForegroundColor Cyan
        
        try {
            supabase functions deploy $func --no-verify-jwt 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✓ $func déployé avec succès" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "    ✗ Échec du déploiement de $func" -ForegroundColor Red
                $errorCount++
            }
        } catch {
            Write-Host "    ✗ Erreur lors du déploiement de $func: $_" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "  ⊘ $func non trouvé (ignoré)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[4/4] Résumé du déploiement..." -ForegroundColor Yellow
Write-Host "  Fonctions déployées avec succès: $successCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "  Fonctions en erreur: $errorCount" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($errorCount -eq 0) {
    Write-Host "  ✓ Déploiement terminé avec succès!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Déploiement terminé avec des erreurs" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Rappel pour configurer les secrets
Write-Host "⚠ N'oubliez pas de configurer les secrets Supabase:" -ForegroundColor Yellow
Write-Host "  - APPSCRIPT_CONTACT_WEBHOOK_URL" -ForegroundColor Cyan
Write-Host "  - APPSCRIPT_CONTACT_TOKEN" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dashboard: https://supabase.com/dashboard/project/[votre-project]/settings/functions" -ForegroundColor Cyan
Write-Host ""

Read-Host "Appuyez sur Entrée pour continuer"


