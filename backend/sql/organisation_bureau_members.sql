-- Schéma SQL pour la gestion du bureau ASGF
-- À exécuter dans Supabase SQL Editor

-- Créer le schéma organisation s'il n'existe pas
create schema if not exists organisation;

-- Donner les permissions nécessaires au service role (service_role)
-- Cela permet au backend d'accéder au schéma via PostgREST
grant usage on schema organisation to service_role;
grant all on schema organisation to service_role;
grant all privileges on all tables in schema organisation to service_role;
grant all privileges on all sequences in schema organisation to service_role;

-- Table bureau_members
create table if not exists organisation.bureau_members (
  id uuid primary key default gen_random_uuid(),

  -- identité
  prenom text not null,
  nom text not null,
  nom_affichage text,              -- optionnel, sinon concat(prenom + ' ' + nom)

  -- rôle dans l'ASGF
  role_court text not null,        -- PRESIDENT, VICE-PRESIDENT, SECRETAIRE, etc.
  role_long text not null,         -- "Président", "Vice-président", etc.
  categorie text not null,         -- 'direction' | 'pole' | 'autre'
  pole_nom text,                   -- ex: "Pôle Formation", "Pôle Communication"

  -- affichage
  highlight boolean default false, -- pour mettre en avant (ex : président)
  ordre smallint default 100,      -- pour l'ordre d'affichage dans la catégorie
  is_active boolean default true,

  -- contacts
  email text,
  phone text,
  linkedin_url text,
  other_url text,

  -- photo
  photo_url text,                  -- URL publique du fichier dans Supabase Storage

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index pour optimiser les requêtes
create index if not exists idx_bureau_members_categorie_ordre
  on organisation.bureau_members (categorie, ordre);

create index if not exists idx_bureau_members_is_active
  on organisation.bureau_members (is_active);

-- Trigger pour mettre à jour updated_at automatiquement
create or replace function organisation.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Donner les permissions sur la fonction au service_role
grant execute on function organisation.update_updated_at_column() to service_role;

-- Supprimer le trigger s'il existe déjà avant de le créer
drop trigger if exists update_bureau_members_updated_at on organisation.bureau_members;

create trigger update_bureau_members_updated_at
  before update on organisation.bureau_members
  for each row
  execute function organisation.update_updated_at_column();

-- Commentaires pour la documentation
comment on table organisation.bureau_members is 'Membres du bureau exécutif et responsables de pôles de l''ASGF';
comment on column organisation.bureau_members.categorie is 'Catégorie du membre: direction, pole, ou autre';
comment on column organisation.bureau_members.role_court is 'Code court du rôle (ex: PRESIDENT, VICE-PRESIDENT)';
comment on column organisation.bureau_members.role_long is 'Libellé complet du rôle (ex: Président, Vice-président)';
comment on column organisation.bureau_members.highlight is 'Mettre en avant ce membre (ex: président avec badge)';

-- Permissions pour les futures tables/fonctions créées dans ce schéma
alter default privileges in schema organisation grant all on tables to service_role;
alter default privileges in schema organisation grant all on sequences to service_role;
alter default privileges in schema organisation grant execute on functions to service_role;

