-- Ajout des colonnes de période pour les cotisations et paiements

alter table if exists tresorerie.cotisations
  add column if not exists periode_mois smallint null,
  add column if not exists periode_annee smallint null;

alter table if exists tresorerie.paiements
  add column if not exists periode_mois smallint null,
  add column if not exists periode_annee smallint null;

-- Mettre à jour les enregistrements existants avec les valeurs dérivées de date_paiement
update tresorerie.cotisations
set
  periode_mois = coalesce(periode_mois, extract(month from coalesce(date_paiement, created_at))::smallint),
  periode_annee = coalesce(periode_annee, extract(year from coalesce(date_paiement, created_at))::smallint)
where true;

update tresorerie.paiements
set
  periode_mois = coalesce(periode_mois, extract(month from coalesce(date_paiement, created_at))::smallint),
  periode_annee = coalesce(periode_annee, extract(year from coalesce(date_paiement, created_at))::smallint)
where true;

-- Contraintes pour garantir la cohérence
alter table tresorerie.cotisations
  alter column periode_mois set default extract(month from current_date)::smallint,
  alter column periode_annee set default extract(year from current_date)::smallint;

alter table tresorerie.paiements
  alter column periode_mois set default extract(month from current_date)::smallint,
  alter column periode_annee set default extract(year from current_date)::smallint;

-- Index pour faciliter les filtres par période
create index if not exists idx_cotisations_periode
  on tresorerie.cotisations (periode_annee, periode_mois);

create index if not exists idx_paiements_periode
  on tresorerie.paiements (periode_annee, periode_mois);

