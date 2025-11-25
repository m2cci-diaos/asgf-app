-- Table des dépenses Trésorerie
create table if not exists tresorerie.depenses (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text null,
  montant numeric(12,2) not null,
  devise text not null default 'EUR',
  categorie text null,
  statut text not null default 'planifie', -- planifie | valide | rejete
  date_depense date not null default now(),
  justificatif_url text null,
  cree_par uuid null references adhesion.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour les filtres par statut/date
create index if not exists idx_depenses_statut on tresorerie.depenses (statut);
create index if not exists idx_depenses_date on tresorerie.depenses (date_depense);

-- Trigger de mise à jour automatique du timestamp
create or replace function tresorerie.update_depense_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_depenses_update on tresorerie.depenses;
create trigger trg_depenses_update
before update on tresorerie.depenses
for each row
execute function tresorerie.update_depense_timestamp();

