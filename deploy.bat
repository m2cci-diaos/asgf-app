@echo off
echo ==========================================
echo   Déploiement ASGF - Firebase + Supabase
echo ==========================================
echo.

REM Vérifier que nous sommes dans le bon répertoire
if not exist "asgf-app" (
    echo [ERREUR] Le dossier asgf-app n'existe pas. Assurez-vous d'être dans le répertoire racine du projet.
    pause
    exit /b 1
)

if not exist "supabase" (
    echo [ERREUR] Le dossier supabase n'existe pas. Assurez-vous d'être dans le répertoire racine du projet.
    pause
    exit /b 1
)

REM 1. Déployer le frontend sur Firebase
echo [1/2] Deploiement du Frontend sur Firebase Hosting...
echo.
cd asgf-app

echo   - Installation des dependances...
call npm install
if errorlevel 1 (
    echo [ERREUR] Echec de l'installation des dependances
    pause
    exit /b 1
)

echo   - Construction de l'application...
call npm run build
if errorlevel 1 (
    echo [ERREUR] Echec de la construction de l'application
    pause
    exit /b 1
)

echo   - Deploiement sur Firebase Hosting...
call firebase deploy --only hosting
if errorlevel 1 (
    echo [ERREUR] Echec du deploiement sur Firebase
    pause
    exit /b 1
)

echo.
echo [OK] Frontend deploye avec succes sur https://asgf-siteweb.web.app/
echo.
cd ..

REM 2. Déployer les fonctions Supabase
echo [2/2] Deploiement des Fonctions Supabase Edge Functions...
echo.
cd supabase

echo   - Deploiement de admin-adhesion-members...
call supabase functions deploy admin-adhesion-members --no-verify-jwt
if errorlevel 1 (
    echo [ERREUR] Echec du deploiement de admin-adhesion-members
    pause
    exit /b 1
)

echo   - Deploiement de admin-login...
call supabase functions deploy admin-login --no-verify-jwt
if errorlevel 1 (
    echo [ATTENTION] Echec du deploiement de admin-login (peut-etre deja deploye)
)

echo   - Deploiement de admin-dashboard-stats...
call supabase functions deploy admin-dashboard-stats --no-verify-jwt
if errorlevel 1 (
    echo [ATTENTION] Echec du deploiement de admin-dashboard-stats (peut-etre deja deploye)
)

echo   - Deploiement de public-bureau...
call supabase functions deploy public-bureau --no-verify-jwt
if errorlevel 1 (
    echo [ATTENTION] Echec du deploiement de public-bureau (peut-etre deja deploye)
)

echo   - Deploiement de projet-inscription...
call supabase functions deploy projet-inscription --no-verify-jwt
if errorlevel 1 (
    echo [ATTENTION] Echec du deploiement de projet-inscription (peut-etre deja deploye)
)

echo.
echo [OK] Fonctions Supabase deployees avec succes
echo.
cd ..

echo ==========================================
echo   Deploiement termine avec succes !
echo ==========================================
echo.
echo Frontend : https://asgf-siteweb.web.app/
echo Fonctions Supabase : Consultez votre dashboard Supabase
echo.
pause


