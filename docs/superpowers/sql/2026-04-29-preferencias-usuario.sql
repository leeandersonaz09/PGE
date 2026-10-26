-- Migration: Preferências de cor do usuário para o módulo Conselho
-- Data: 2026-04-29

-- 1. Verificar se tabela public.profiles existe e adicionar campo de cor
-- Se a tabela profiles já existir, adicionamos o campo; se não, criamos a migration condicional

-- Adicionar campo cor_preferida_conselho na tabela auth.users ou perfis
-- Como o NextAuth/Supabase usa auth.users, vamos criar uma tabela de preferências separada

create table if not exists public.usuario_preferencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  cor_conselho varchar(7) default '#0d9488', -- formato hex '#RRGGBB'
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Índice para buscas por usuário
create index if not exists usuario_preferencias_user_id_idx
  on public.usuario_preferencias (user_id);

-- Trigger para updated_at
create or replace function public.set_usuario_preferencias_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_usuario_preferencias_updated_at on public.usuario_preferencias;
create trigger trg_usuario_preferencias_updated_at
before update on public.usuario_preferencias
for each row
execute function public.set_usuario_preferencias_updated_at();

-- RLS (Row Level Security)
alter table public.usuario_preferencias enable row level security;

-- Policy: usuários podem ler apenas suas próprias preferências
drop policy if exists usuario_preferencias_select_auth on public.usuario_preferencias;
create policy usuario_preferencias_select_auth
  on public.usuario_preferencias
  for select
  using (auth.uid() = user_id);

-- Policy: usuários podem inserir/atualizar suas próprias preferências
drop policy if exists usuario_preferencias_upsert_auth on public.usuario_preferencias;
create policy usuario_preferencias_upsert_auth
  on public.usuario_preferencias
  for insert
  with check (auth.uid() = user_id);

drop policy if exists usuario_preferencias_update_auth on public.usuario_preferencias;
create policy usuario_preferencias_update_auth
  on public.usuario_preferencias
  for update
  using (auth.uid() = user_id);