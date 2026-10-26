-- Migration: Melhorias no Conselho de Classe
-- Data: 2026-04-29

-- 1. Adiciona coluna de parecer na tabela conselho_notas
alter table public.conselho_notas
add column if not exists parecer text;

-- 2. Cria tabela de histórico de conselhos
create table if not exists public.conselho_historico (
  id uuid primary key default gen_random_uuid(),
  sede_id integer references public.sedes(id) on delete cascade,
  nm_pessoa text not null,
  cd_aluno text not null,
  turma text,
  decisao text not null, -- 'Aprovado', 'Retido', 'Exame', 'Recuperação', 'Observação'
  observacao text,
  data_conselho timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Índices para buscas rápidas
create index if not exists conselho_historico_data_idx
  on public.conselho_historico (data_conselho desc);

create index if not exists conselho_historico_aluno_idx
  on public.conselho_historico (cd_aluno);

create index if not exists conselho_historico_turma_idx
  on public.conselho_historico (turma);

-- Trigger para updated_at
create or replace function public.set_conselho_historico_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.created_at = now();
  return new;
end;
$$;

-- RLS
alter table public.conselho_historico enable row level security;

drop policy if exists conselho_historico_select_auth on public.conselho_historico;
create policy conselho_historico_select_auth
  on public.conselho_historico
  for select
  using (auth.role() = 'authenticated');

drop policy if exists conselho_historico_insert_auth on public.conselho_historico;
create policy conselho_historico_insert_auth
  on public.conselho_historico
  for insert
  with check (auth.role() = 'authenticated');