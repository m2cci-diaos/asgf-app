# Script d'installation automatique de Supabase CLI pour Windows
# Usage: .\install-supabase-cli.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Installation Supabase CLI - Windows" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si déjà installé
try {
    $version = supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Supabase CLI est déjà installé: $version" -ForegroundColor Green
        Write-Host ""
        $continue = Read-Host "Voulez-vous le réinstaller ? (O/N)"
        if ($continue -ne "O" -and $continue -ne "o") {
            Write-Host "Installation annulée." -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "Supabase CLI n'est pas installé. Installation en cours..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Méthode d'installation:" -ForegroundColor Yellow
Write-Host "1. Télécharger l'exécutable (Recommandé)" -ForegroundColor Cyan
Write-Host "2. Installer via Scoop (si installé)" -ForegroundColor Cyan
Write-Host "3. Installer via Chocolatey (si installé)" -ForegroundColor Cyan
Write-Host "4. Annuler" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Choisissez une option (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "[Méthode 1] Téléchargement de l'exécutable..." -ForegroundColor Yellow
        
        # Créer un dossier bin dans le projet
        $binDir = Join-Path $PSScriptRoot "bin"
        if (-not (Test-Path $binDir)) {
            New-Item -ItemType Directory -Path $binDir | Out-Null
            Write-Host "✓ Dossier 'bin' créé dans le projet" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "Étapes manuelles:" -ForegroundColor Yellow
        Write-Host "1. Ouvrez votre navigateur et allez sur:" -ForegroundColor Cyan
        Write-Host "   https://github.com/supabase/cli/releases/latest" -ForegroundColor White
        Write-Host ""
        Write-Host "2. Téléchargez: supabase_windows_amd64.zip" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "3. Extrayez supabase.exe" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "4. Copiez supabase.exe dans:" -ForegroundColor Cyan
        Write-Host "   $binDir" -ForegroundColor White
        Write-Host ""
        Write-Host "5. Ensuite, utilisez:" -ForegroundColor Yellow
        Write-Host "   .\bin\supabase.exe --version" -ForegroundColor White
        Write-Host ""
        
        $done = Read-Host "Appuyez sur Entrée une fois que vous avez copié supabase.exe"
        
        $supabasePath = Join-Path $binDir "supabase.exe"
        if (Test-Path $supabasePath) {
            Write-Host "✓ Supabase CLI trouvé!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Pour utiliser Supabase CLI, utilisez:" -ForegroundColor Yellow
            Write-Host "  .\bin\supabase.exe [commande]" -ForegroundColor White
            Write-Host ""
            Write-Host "Ou ajoutez '.\bin' à votre PATH pour utiliser simplement 'supabase'" -ForegroundColor Cyan
        } else {
            Write-Host "✗ supabase.exe non trouvé dans $binDir" -ForegroundColor Red
            Write-Host "Veuillez copier le fichier manuellement." -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "[Méthode 2] Installation via Scoop..." -ForegroundColor Yellow
        
        # Vérifier si Scoop est installé
        try {
            scoop --version | Out-Null
            Write-Host "✓ Scoop détecté" -ForegroundColor Green
            
            Write-Host "Ajout du bucket Supabase..." -ForegroundColor Cyan
            scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
            
            Write-Host "Installation de Supabase CLI..." -ForegroundColor Cyan
            scoop install supabase
            
            Write-Host "✓ Installation terminée!" -ForegroundColor Green
            supabase --version
        } catch {
            Write-Host "✗ Scoop n'est pas installé" -ForegroundColor Red
            Write-Host "Installez Scoop depuis: https://scoop.sh" -ForegroundColor Yellow
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "[Méthode 3] Installation via Chocolatey..." -ForegroundColor Yellow
        
        # Vérifier si Chocolatey est installé
        try {
            choco --version | Out-Null
            Write-Host "✓ Chocolatey détecté" -ForegroundColor Green
            
            Write-Host "Installation de Supabase CLI..." -ForegroundColor Cyan
            choco install supabase -y
            
            Write-Host "✓ Installation terminée!" -ForegroundColor Green
            supabase --version
        } catch {
            Write-Host "✗ Chocolatey n'est pas installé" -ForegroundColor Red
            Write-Host "Installez Chocolatey depuis: https://chocolatey.org/install" -ForegroundColor Yellow
        }
    }
    
    "4" {
        Write-Host "Installation annulée." -ForegroundColor Yellow
        exit 0
    }
    
    default {
        Write-Host "Option invalide." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Installation terminée!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""


