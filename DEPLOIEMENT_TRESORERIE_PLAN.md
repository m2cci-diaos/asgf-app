# 📋 Plan de Déploiement - Module Trésorerie

## 🎯 Objectif

Créer une fonction Supabase Edge `admin-tresorerie` pour remplacer les routes Express.js du module trésorerie.

## 📊 Routes à Implémenter

### ✅ Priorité 1 - Routes Essentielles

1. **Cotisations**
   - GET /cotisations (liste avec pagination)
   - GET /cotisations/:id
   - POST /cotisations
   - PUT /cotisations/:id
   - POST /cotisations/:id/validate
   - DELETE /cotisations/:id

2. **Paiements**
   - GET /paiements (liste)
   - POST /paiements
   - PUT /paiements/:id
   - POST /paiements/:id/validate

3. **Stats**
   - GET /stats

### ✅ Priorité 2 - Routes Secondaires

4. **Dépenses**
   - GET /depenses
   - POST /depenses
   - PUT /depenses/:id
   - POST /depenses/:id/validate

5. **Relances**
   - GET /relances
   - POST /relances

6. **Cartes Membres**
   - GET /cartes
   - POST /cartes
   - PUT /cartes/:id

7. **Historique**
   - GET /historique

### ⏸️ Priorité 3 - Fonctionnalités Avancées

8. **Exports** (peut être géré côté frontend ou dans une fonction séparée)
9. **Rapports PDF** (peut être géré côté frontend)
10. **Génération automatique** de cotisations mensuelles

## 🚀 Stratégie

1. ✅ Créer la structure de base (comme admin-adhesion-members)
2. ✅ Implémenter les routes prioritaires
3. ✅ Tester et déployer
4. ✅ Ajouter les routes secondaires progressivement

---

**Commencez par les routes essentielles, puis ajoutez le reste progressivement.**


