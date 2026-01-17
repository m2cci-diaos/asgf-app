#!/bin/bash

echo "=========================================="
echo "  Déploiement ASGF - Firebase + Supabase"
echo "=========================================="
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "asgf-app" ]; then
    echo "[ERREUR] Le dossier asgf-app n'existe pas. Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

if [ ! -d "supabase" ]; then
    echo "[ERREUR] Le dossier supabase n'existe pas. Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

# 1. Déployer le frontend sur Firebase
echo "[1/2] Déploiement du Frontend sur Firebase Hosting..."
echo ""
cd asgf-app

echo "  - Installation des dépendances..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERREUR] Échec de l'installation des dépendances"
    exit 1
fi

echo "  - Construction de l'application..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERREUR] Échec de la construction de l'application"
    exit 1
fi

echo "  - Déploiement sur Firebase Hosting..."
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "[ERREUR] Échec du déploiement sur Firebase"
    exit 1
fi

echo ""
echo "[OK] Frontend déployé avec succès sur https://asgf-siteweb.web.app/"
echo ""
cd ..

# 2. Déployer les fonctions Supabase
echo "[2/2] Déploiement des Fonctions Supabase Edge Functions..."
echo ""
cd supabase

echo "  - Déploiement de admin-adhesion-members..."
supabase functions deploy admin-adhesion-members --no-verify-jwt
if [ $? -ne 0 ]; then
    echo "[ERREUR] Échec du déploiement de admin-adhesion-members"
    exit 1
fi

echo "  - Déploiement de admin-login..."
supabase functions deploy admin-login --no-verify-jwt || echo "[ATTENTION] admin-login peut déjà être déployée"

echo "  - Déploiement de admin-dashboard-stats..."
supabase functions deploy admin-dashboard-stats --no-verify-jwt || echo "[ATTENTION] admin-dashboard-stats peut déjà être déployée"

echo "  - Déploiement de public-bureau..."
supabase functions deploy public-bureau --no-verify-jwt || echo "[ATTENTION] public-bureau peut déjà être déployée"

echo "  - Déploiement de projet-inscription..."
supabase functions deploy projet-inscription --no-verify-jwt || echo "[ATTENTION] projet-inscription peut déjà être déployée"

echo ""
echo "[OK] Fonctions Supabase déployées avec succès"
echo ""
cd ..

echo "=========================================="
echo "  Déploiement terminé avec succès !"
echo "=========================================="
echo ""
echo "Frontend : https://asgf-siteweb.web.app/"
echo "Fonctions Supabase : Consultez votre dashboard Supabase"
echo ""


