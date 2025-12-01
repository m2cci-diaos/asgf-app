# Améliorations Module Mentorat - Guide d'implémentation

## ✅ Déjà fait

1. **Migration SQL** (`backend/migrations/mentorat_unique_constraints.sql`)
   - Contraintes UNIQUE pour mentors (un seul par membre)
   - Contraintes UNIQUE pour mentees (un seul par membre)
   - Index unique partiel pour relations actives (pas de doublons actifs)
   - Index unique pour rendez-vous (pas de doublons au même moment)

2. **Backend - Gestion des doublons**
   - Détection des erreurs PostgreSQL 23505
   - Messages d'erreur clairs pour chaque cas de doublon
   - Vérifications préalables avant insertion

3. **Backend - Route clôture relation**
   - Fonction `closeRelation` dans le service
   - Route POST `/api/mentorat/relations/:id/close`
   - Contrôleur `closeRelation`

4. **Drawer Relation**
   - Composant `RelationDrawer.jsx` créé
   - Affichage des infos, objectifs et rendez-vous
   - Bouton de clôture de relation

## 🔧 À faire dans AdminDashboard.jsx - Composant MentoratContent

### 1. Imports à ajouter
```javascript
import RelationDrawer from '../components/mentorat/RelationDrawer'
import { closeRelation, getRelation } from '../services/api'
```

### 2. États à ajouter
- `selectedRelation` : pour stocker la relation sélectionnée pour le drawer
- `memberSearch` : pour la recherche de membres dans les modals
- `mentorSearch` : pour la recherche de mentors
- `menteeSearch` : pour la recherche de mentorés

### 3. Vérifications de doublons avant soumission

#### Modal "Ajouter Mentor"
- Vérifier si `formData.membre_id` existe déjà dans `mentors`
- Afficher un message d'erreur si doublon détecté

#### Modal "Ajouter Mentoré"
- Vérifier si `formData.membre_id` existe déjà dans `mentees`
- Afficher un message d'erreur si doublon détecté

#### Modal "Créer Relation"
- Vérifier s'il existe déjà une relation ACTIVE avec le même `mentor_id` + `mentee_id`
- Afficher un message d'erreur si doublon détecté

### 4. Amélioration des modals avec recherche

#### Modal "Ajouter Mentor/Mentoré"
- Remplacer le `<select>` par un input de recherche
- Filtrer les membres par nom, email, numéro
- Afficher la liste filtrée avec checkbox/selection

#### Modal "Créer Relation"
- Ajouter des inputs de recherche pour mentor et mentoré
- Filtrer la liste selon la recherche

### 5. Tableau des relations - Lignes cliquables

```javascript
<tr 
  key={rel.id}
  onClick={() => setSelectedRelation(rel)}
  style={{ cursor: 'pointer' }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
>
```

### 6. Drawer Relation

Ajouter après le modal :
```javascript
{selectedRelation && (
  <RelationDrawer
    relation={selectedRelation}
    onClose={() => setSelectedRelation(null)}
    onUpdate={() => {
      setSelectedRelation(null)
      loadData()
    }}
  />
)}
```

### 7. Correction type rendez-vous

Dans le modal "Ajouter Rendez-vous", remplacer :
```javascript
<option value="premier_contact">Premier contact</option>
<option value="suivi">Suivi</option>
<option value="bilan">Bilan</option>
<option value="autre">Autre</option>
```

Par :
```javascript
<option value="visio">Visio</option>
<option value="presentiel">Présentiel</option>
<option value="telephone">Téléphone</option>
```

### 8. Badges de statut améliorés

Dans le tableau, améliorer l'affichage des statuts :
- active : vert
- terminée : orange
- suspendue : gris

## Notes importantes

- Toutes les vérifications de doublons doivent être faites AVANT l'appel API (UX)
- Le backend gère aussi les doublons (sécurité SQL)
- Les messages d'erreur doivent être clairs et explicites
- Le drawer doit être fermé lors de la mise à jour des données




