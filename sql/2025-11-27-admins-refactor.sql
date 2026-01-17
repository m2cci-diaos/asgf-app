-- 2025-11-27 : Refonte de la table admin.admins et des droits modules
-- Objectifs :
--   * Introduire la notion de role_type (superadmin/admin)
--   * Ajouter un super_scope pour limiter un superadmin à certains modules
--   * Permettre la désactivation temporaire (disabled_until) ou permanente (is_active)
--   * Forcer l'unicité + présence de l'email et suivre updated_at automatiquement
--   * Préparer admins_modules à des droits granulaires + scope optionnel

begin;

-- Renommer l'ancien champ role_global pour éviter toute ambiguïté
alter table admin.admins
  rename column role_global to role_type;

-- Contraintes et colonnes supplémentaires
alter table admin.admins
  alter column email set not null,
  add constraint admins_email_key unique (email),
  alter column role_type set not null,
  alter column role_type set default 'admin',
  add column if not exists super_scope text[] not null default '{}',
  add column if not exists disabled_reason text,
  add column if not exists disabled_until timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Sécurise les valeurs existantes du role_type
update admin.admins
  set role_type = case
    when role_type in ('superadmin', 'master') then 'superadmin'
    else 'admin'
  end;

-- Contrainte de validation sur role_type
alter table admin.admins
  add constraint admins_role_type_check
  check (role_type in ('superadmin', 'admin'));

-- Trigger pour maintenir updated_at
create or replace function admin.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admins_updated_at on admin.admins;
create trigger trg_admins_updated_at
before update on admin.admins
for each row
execute function admin.set_updated_at();

-- Table admins_modules : ajout scope et contrainte sur les droits
alter table admin.admins_modules
  add column if not exists scope_ids uuid[] default '{}',
  alter column droit set default 'full';

update admin.admins_modules
  set droit = 'full'
  where droit is null;

alter table admin.admins_modules
  add constraint admins_modules_droit_check
  check (droit in ('lecture', 'gestion', 'full'));

commit;










