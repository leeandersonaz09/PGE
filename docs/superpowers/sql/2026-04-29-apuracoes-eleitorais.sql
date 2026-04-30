create extension if not exists pgcrypto;

create table if not exists public.apuracoes_eleitorais (
  id uuid primary key default gen_random_uuid(),
  sede_id integer not null references public.sedes (id) on delete cascade,
  identificador text not null unique,
  nome_eleicao text not null,
  ano_referencia integer not null,
  sequencial integer not null,
  data_apuracao date not null,
  observacao text,
  total_votos integer not null default 0,
  total_validos integer not null default 0,
  total_brancos integer not null default 0,
  total_nulos integer not null default 0,
  chapa_vencedora_numero text,
  chapa_vencedora_nome text,
  chapa_vencedora_votos integer,
  resultado_rows jsonb not null default '[]'::jsonb,
  participacoes_rows jsonb not null default '[]'::jsonb,
  votos_rows jsonb not null default '[]'::jsonb,
  resumo_json jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apuracoes_eleitorais_sede_ano_seq_key unique (sede_id, ano_referencia, sequencial)
);

create index if not exists apuracoes_eleitorais_sede_data_idx
  on public.apuracoes_eleitorais (sede_id, data_apuracao desc, created_at desc);

create or replace function public.set_apuracoes_eleitorais_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_apuracoes_eleitorais_updated_at on public.apuracoes_eleitorais;
create trigger trg_apuracoes_eleitorais_updated_at
before update on public.apuracoes_eleitorais
for each row
execute function public.set_apuracoes_eleitorais_updated_at();

alter table public.apuracoes_eleitorais enable row level security;

drop policy if exists apuracoes_eleitorais_select_auth on public.apuracoes_eleitorais;
create policy apuracoes_eleitorais_select_auth
on public.apuracoes_eleitorais
for select
to authenticated
using (
  exists (
    select 1
    from public.permissoes_usuarios pu
    where pu.user_id = auth.uid()
      and public.apuracoes_eleitorais.sede_id = any (coalesce(pu.sedes_permitidas, '{}'::integer[]))
  )
);

drop policy if exists apuracoes_eleitorais_insert_auth on public.apuracoes_eleitorais;
create policy apuracoes_eleitorais_insert_auth
on public.apuracoes_eleitorais
for insert
to authenticated
with check (
  exists (
    select 1
    from public.permissoes_usuarios pu
    where pu.user_id = auth.uid()
      and public.apuracoes_eleitorais.sede_id = any (coalesce(pu.sedes_permitidas, '{}'::integer[]))
  )
);

drop policy if exists apuracoes_eleitorais_update_auth on public.apuracoes_eleitorais;
create policy apuracoes_eleitorais_update_auth
on public.apuracoes_eleitorais
for update
to authenticated
using (
  exists (
    select 1
    from public.permissoes_usuarios pu
    where pu.user_id = auth.uid()
      and public.apuracoes_eleitorais.sede_id = any (coalesce(pu.sedes_permitidas, '{}'::integer[]))
  )
)
with check (
  exists (
    select 1
    from public.permissoes_usuarios pu
    where pu.user_id = auth.uid()
      and public.apuracoes_eleitorais.sede_id = any (coalesce(pu.sedes_permitidas, '{}'::integer[]))
  )
);

drop policy if exists apuracoes_eleitorais_delete_auth on public.apuracoes_eleitorais;
create policy apuracoes_eleitorais_delete_auth
on public.apuracoes_eleitorais
for delete
to authenticated
using (
  exists (
    select 1
    from public.permissoes_usuarios pu
    where pu.user_id = auth.uid()
      and public.apuracoes_eleitorais.sede_id = any (coalesce(pu.sedes_permitidas, '{}'::integer[]))
  )
);
