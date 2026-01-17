# Configuration du module Bureau

## 📋 Étapes de configuration

### 1. Exposer le schéma dans PostgREST

1. Aller dans **Supabase Dashboard** > **API** > **Settings**
2. Dans la section **Exposed schemas**, ajouter `organisation` à la liste
3. Sauvegarder les changements

### 2. Exécuter le script SQL dans Supabase

1. Ouvrir le **SQL Editor** dans votre projet Supabase
2. Copier le contenu du fichier `organisation_bureau_members.sql`
3. Exécuter le script complet
4. Vérifier que le schéma `organisation` et la table `organisation.bureau_members` ont été créés

**Important** : Le script SQL donne automatiquement les permissions nécessaires au `service_role` pour accéder au schéma `organisation`.

### 2. Créer le bucket Storage pour les photos

1. Aller dans **Storage** dans Supabase
2. Cliquer sur **New bucket**
3. Nommer le bucket : `bureau-photos`
4. **Important** : Cocher **Public bucket** pour permettre la lecture publique des photos
5. Cliquer sur **Create bucket**

### 3. Vérifier les permissions (optionnel)

Si vous avez des problèmes d'accès, vérifier les politiques RLS (Row Level Security) dans Supabase :

- Table `organisation.bureau_members` : Les politiques doivent permettre la lecture publique pour les membres actifs

### 4. Tester la connexion

Vous pouvez tester la connexion avec le script :

```bash
node backend/scripts/test-bureau-connection.js
```

## 🔍 Dépannage

### Erreur 500 sur `/api/bureau`

Si vous obtenez une erreur 500, vérifiez :

1. ✅ Le schéma `organisation` est exposé dans PostgREST (Dashboard > API > Settings > Exposed schemas)
2. ✅ Le schéma `organisation` existe dans Supabase
3. ✅ La table `organisation.bureau_members` existe
4. ✅ Les permissions ont été accordées au `service_role` (via le script SQL)
5. ✅ Les variables d'environnement `VITE_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE` sont correctement configurées dans le backend
6. ✅ Le serveur backend est redémarré après les modifications

### Erreur "permission denied for schema organisation"

Cette erreur signifie que le `service_role` n'a pas les permissions nécessaires. Solution :
1. Exécuter à nouveau le script SQL qui contient les commandes `GRANT`
2. Vérifier que le schéma `organisation` est bien exposé dans PostgREST

### Erreur "The schema must be one of the following..."

Cette erreur signifie que le schéma `organisation` n'est pas exposé dans PostgREST. Solution :
1. Aller dans Supabase Dashboard > API > Settings > Exposed schemas
2. Ajouter `organisation` à la liste
3. Sauvegarder

### Erreur "relation does not exist"

Cela signifie que la table n'a pas été créée. Exécutez le script SQL dans Supabase.

### Les photos ne s'affichent pas

Vérifiez que :
- Le bucket `bureau-photos` existe et est public
- Les URLs des photos sont correctement stockées dans `photo_url`
- Les permissions du bucket permettent la lecture publique

