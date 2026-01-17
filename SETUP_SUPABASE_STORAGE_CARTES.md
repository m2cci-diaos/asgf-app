# Configuration Supabase Storage pour les Cartes Membres

## Contexte

En cas d'indisponibilité du webhook Google Apps Script, le système utilise automatiquement Supabase Storage comme solution de secours pour stocker les PDFs des cartes membres.

## Configuration requise

### 1. Créer le bucket "cartes-membres"

1. Connectez-vous à votre dashboard Supabase
2. Allez dans **Storage** (menu de gauche)
3. Cliquez sur **New bucket**
4. Configurez le bucket :
   - **Name**: `cartes-membres`
   - **Public bucket**: ✅ **Oui** (pour que les PDFs soient accessibles publiquement via URL)
   - **File size limit**: `10 MB` (ou plus si nécessaire)
   - **Allowed MIME types**: `application/pdf`

### 2. Configurer les politiques de sécurité (RLS)

Dans le bucket `cartes-membres`, allez dans l'onglet **Policies** et créez les politiques suivantes :

#### Politique 1 : Upload (Service Role)
- **Policy name**: "Allow service role uploads"
- **Operation**: INSERT
- **Target roles**: `service_role`
- **Policy definition**: 
  ```sql
  bucket_id = 'cartes-membres'
  ```

#### Politique 2 : Lecture publique
- **Policy name**: "Allow public read access"
- **Operation**: SELECT
- **Target roles**: `anon`, `authenticated`
- **Policy definition**:
  ```sql
  bucket_id = 'cartes-membres'
  ```

#### Politique 3 : Mise à jour (Service Role)
- **Policy name**: "Allow service role updates"
- **Operation**: UPDATE
- **Target roles**: `service_role`
- **Policy definition**:
  ```sql
  bucket_id = 'cartes-membres'
  ```

#### Politique 4 : Suppression (Service Role)
- **Policy name**: "Allow service role deletes"
- **Operation**: DELETE
- **Target roles**: `service_role`
- **Policy definition**:
  ```sql
  bucket_id = 'cartes-membres'
  ```

### 3. Structure des fichiers

Les PDFs seront stockés dans la structure suivante :
```
cartes-membres/
  ├── cartes-membres/
  │   ├── CARTE-ASGF-2025-001.pdf
  │   ├── CARTE-ASGF-2025-002.pdf
  │   └── ...
```

## Fonctionnement

### Ordre de priorité

1. **Tentative 1** : Upload vers Google Drive via Apps Script webhook
   - Si réussi → URL Google Drive stockée dans la base de données
   - Si échoue (timeout, erreur, ou webhook indisponible) → Passer à l'étape 2

2. **Tentative 2** : Upload vers Supabase Storage (fallback)
   - Si réussi → URL publique Supabase stockée dans la base de données
   - Si échoue → Aucun lien PDF n'est stocké (la carte est créée quand même)

### Avantages du fallback

- ✅ Continuité de service même si Google Apps Script est indisponible
- ✅ Pas de perte de données si le webhook échoue
- ✅ Les PDFs restent accessibles via URL publique
- ✅ Logs détaillés pour le débogage

## Vérification

Pour vérifier que tout fonctionne :

1. Générez une carte membre depuis l'interface admin
2. Vérifiez les logs de la fonction Edge `admin-tresorerie` :
   - Recherchez les messages avec "Upload PDF"
   - Vous devriez voir soit "✅ PDF uploadé avec succès sur Google Drive" soit "✅ PDF stocké dans Supabase Storage"

3. Vérifiez dans Supabase Dashboard > Storage > cartes-membres :
   - Les fichiers PDF doivent apparaître dans le dossier `cartes-membres/`

## Notes importantes

- Les PDFs uploadés vers Supabase Storage sont accessibles publiquement via URL
- Le bucket doit être créé manuellement via le dashboard Supabase
- Les politiques RLS sont nécessaires pour que la fonction Edge puisse uploader les fichiers
- Si le bucket n'existe pas, l'upload vers Supabase Storage échouera silencieusement et un warning sera loggé

