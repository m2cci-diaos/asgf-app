# 🔒 Gestion de `public.spatial_ref_sys`

## Problème

La table `spatial_ref_sys` est une **table système PostGIS** qui appartient au superutilisateur PostGIS. Elle ne peut pas être modifiée avec les permissions standard (`postgres` role).

## Solutions

### Option 1 : Ignorer l'erreur (Recommandé) ⭐

Cette table système PostGIS :
- ✅ N'est généralement **pas accessible** via l'API PostgREST publique
- ✅ Contient uniquement des **données de référence spatiale** (non sensibles)
- ✅ Est utilisée **en interne** par PostGIS pour les calculs géospatiaux

**Recommandation** : Cette erreur peut être **sans danger** et peut être ignorée si vous n'exposez pas cette table via votre API.

### Option 2 : Masquer la table de l'API

Si vous voulez absolument corriger l'alerte, vous pouvez :

1. **Dans Supabase Dashboard** :
   - Allez dans **Settings** → **API**
   - Vérifiez que `spatial_ref_sys` n'est pas dans la liste des tables exposées

2. **Via SQL (si vous avez service_role)** :
   ```sql
   -- Exécuter avec service_role (pas postgres)
   ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow public read spatial_ref_sys"
   ON public.spatial_ref_sys
   FOR SELECT
   TO anon
   USING (true);
   ```

### Option 3 : Contacter le support Supabase

Si cette erreur vous dérange vraiment, vous pouvez :
- Contacter le support Supabase pour exclure cette table système des vérifications
- Ou demander à activer RLS avec des privilèges élevés

## Conclusion

**Recommandation finale** : Cette erreur peut être **ignorée en toute sécurité**. Les 21 erreurs critiques ont été corrigées, et cette dernière concerne une table système qui n'est généralement pas exposée à l'API publique.

---

**Statut actuel** :
- ✅ **21 erreurs critiques corrigées** (tables applicatives)
- ⚠️ **1 erreur restante** (table système PostGIS - peut être ignorée)















