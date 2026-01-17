# Système d'Audit Log - Documentation

## Installation

1. **Exécuter le script SQL** pour créer la table `audit_log` :
   ```sql
   -- Dans Supabase SQL Editor ou via psql
   -- Exécuter le contenu de backend/sql/audit_log.sql
   ```

2. **Vérifier que la table est créée** :
   ```sql
   SELECT * FROM public.audit_log LIMIT 1;
   ```

## Utilisation

### Dans les contrôleurs

Pour logger une action, importez et utilisez `logAction` :

```javascript
import { logAction, ACTION_TYPES, ENTITY_TYPES } from '../services/audit.service.js'

// Exemple dans un contrôleur
export async function createFormationController(req, res) {
  try {
    const formation = await createFormation(req.body)
    
    // Logger l'action
    if (req.admin) {
      logAction({
        adminId: req.admin.id,
        adminEmail: req.admin.email,
        adminNom: req.admin.nom || `${req.admin.prenom || ''} ${req.admin.nom || ''}`.trim(),
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.FORMATION,
        entityId: formation.id,
        entityName: formation.titre,
        module: 'formations',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      }).catch(err => console.error('Erreur audit log (non bloquant):', err))
    }
    
    return res.json({ success: true, data: formation })
  } catch (err) {
    // ...
  }
}
```

### Types d'actions disponibles

- `CREATE` - Création
- `UPDATE` - Modification
- `DELETE` - Suppression
- `LOGIN` - Connexion
- `LOGOUT` - Déconnexion
- `VIEW` - Consultation
- `EXPORT` - Export
- `APPROVE` - Approbation
- `REJECT` - Rejet
- `VALIDATE` - Validation
- `CANCEL` - Annulation
- `RESET` - Réinitialisation
- `UPLOAD` - Upload
- `DOWNLOAD` - Téléchargement

### Types d'entités disponibles

- `member` - Membre
- `formation` - Formation
- `session` - Session
- `inscription` - Inscription
- `formateur` - Formateur
- `webinaire` - Webinaire
- `presentateur` - Présentateur
- `cotisation` - Cotisation
- `paiement` - Paiement
- `depense` - Dépense
- `reunion` - Réunion
- `mentor` - Mentor
- `mentee` - Mentee
- `relation` - Relation
- `candidature` - Candidature
- `bureau_member` - Membre du bureau
- `admin` - Administrateur
- `contact` - Contact

## Interface Frontend

L'interface est accessible via le module "Historique" dans le dashboard admin.

**Accès** : Réservé aux superadmins uniquement.

**Fonctionnalités** :
- Filtres par type d'action, entité, module, admin, dates
- Recherche textuelle
- Pagination
- Affichage des détails des changements (pour UPDATE)
- Statistiques des actions

## Notes importantes

- Le logging est **non-bloquant** : si le log échoue, l'action principale continue
- Les logs sont stockés dans la table `public.audit_log`
- Les logs incluent l'IP et le user agent pour la traçabilité
- Pour les UPDATE, les changements (before/after) sont stockés dans le champ `changes` (JSONB)





