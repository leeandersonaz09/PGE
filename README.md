# PGE - Portal de Gestão Escolar 🎓

> Um sistema web moderno, seguro e escalável (Multi-Tenant) para gestão de alunos, ocorrências disciplinares, atendimentos na enfermaria e locação inteligente de recursos multimídia.

![Status do Projeto](https://img.shields.io/badge/Status-Conclu%C3%ADdo-success)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Netlify](https://img.shields.io/badge/Netlify-Deploy-00C7B7?logo=netlify)

## 📸 Capturas de Tela

_(Substitua as marcações abaixo pelos prints reais do seu sistema para criar uma vitrine visual do projeto)_

`[Insira aqui o Print do Dashboard Principal]`

`[Insira aqui o Print do Módulo de Locação Multimídia]`

`[Insira aqui o Print do Painel Administrativo com Gestão de Permissões]`

---

## 🚀 Sobre o Projeto

O **Portal de Gestão Escolar (PGE)** foi desenvolvido para modernizar e unificar os processos internos de instituições de ensino com múltiplas sedes (Multi-Tenant). A plataforma centraliza dados acadêmicos, médicos, disciplinares e de infraestrutura, garantindo acesso restrito através de rigorosas regras de segurança em nível de linha (RLS) no banco de dados.

### 🌟 Principais Módulos e Funcionalidades

- 🛡️ **Painel Administrativo (Gestão de Acessos):** Controle granular de permissões. O Administrador define quais módulos e quais **Sedes/Coligadas** cada funcionário pode acessar. Inclui importação de alunos em massa via arquivo `.csv`.
- 👥 **Alunos & Conselho de Classe:** Consulta rápida de status de matrícula, notas e dados de responsáveis.
- 🩺 **Sala de Repouso & Histórico Médico:** Fluxo de encaminhamento de alunos para a enfermaria, com registro de sintomas, atendente e geração de histórico médico auditável.
- ⚠️ **Registro de Ocorrências:** Documentação de ocorrências disciplinares. Protegido por RLS (apenas o autor ou um Admin podem excluir registros).
- 💻 **Locação Multimídia (Smart Booking):** Sistema de reserva de equipamentos (Projetores, Laptops, Caixas de Som) com cálculo de disponibilidade dinâmica em tempo real, prevenção de conflito de horários, trava de antecedência mínima (1h) e limite de reservas para até 7 dias.
- 📦 **Histórico de Locações:** Painel gerencial com auditoria completa de reservas passadas e exportação automatizada para Excel (`.xlsx`).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Next.js (App Router), TypeScript, Tailwind CSS.
- **Ícones & UI:** Lucide React.
- **Backend & Autenticação:** Supabase (Google OAuth2).
- **Banco de Dados:** PostgreSQL (Tabelas, Views Seguras, Triggers, Functions e RLS).
- **Processamento de Dados:** Papaparse (CSV), XLSX (Excel Export).
- **Hospedagem (CI/CD):** Netlify.

---

## 📂 Estrutura do Projeto

A arquitetura segue o padrão do Next.js App Router, com separação clara de responsabilidades:

```text
PGE/
├── public/                 # Assets estáticos
├── src/
│   ├── app/
│   │   ├── auth/callback/  # Autenticação Supabase
│   │   ├── dashboard/      # Rotas protegidas (Módulos do Sistema)
│   │   │   ├── admin/
│   │   │   ├── alunos/
│   │   │   ├── conselho/
│   │   │   ├── historico-atendimentos/
│   │   │   ├── historico-locacoes/
│   │   │   ├── locacoes/
│   │   │   ├── ocorrencias/
│   │   │   ├── repouso/
│   │   │   ├── layout.tsx  # Wrapper de proteção
│   │   │   └── page.tsx    # Home do Dashboard
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx        # Login
│   ├── components/         # Componentes reutilizáveis (Modais, Header)
│   ├── context/            # Contextos Globais (Auth, Coligadas)
│   └── lib/                # Configurações de API (supabase.ts)
├── supabase/
│   └── migrations/         # Backup da estrutura do Banco de Dados
├── netlify.toml            # Configurações de Deploy Netlify
├── package.json
└── tailwind.config.js
```

---

## ⚙️ Passo a Passo para Implantação (Deployment)

### 1. Configuração do Backend (Supabase)

Crie um projeto no [Supabase](https://supabase.com/) e execute os scripts abaixo na aba **SQL Editor** na seguinte ordem:

#### A. Estrutura Base (Tabelas)

```sql
CREATE TABLE public.sedes (
  id integer NOT NULL PRIMARY KEY,
  nome text NOT NULL,
  sigla text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.alunos (
  id bigint NOT NULL PRIMARY KEY,
  nome text NOT NULL,
  serie text,
  turma text,
  status text,
  nascimento text,
  email text,
  pai text,
  celular_pai text,
  fixo_pai text,
  mae text,
  celular_mae text,
  fixo_mae text,
  Anosemestre text,
  Curso text,
  "Nome curso" text,
  c_turma text,
  Turno text,
  email_pai text,
  email_mae text,
  financeiro_nome text,
  financeiro_email text,
  financeiro_celular text,
  financeiro_fixo text,
  sede_id integer DEFAULT 1219 REFERENCES public.sedes(id),
  importado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE public.usuarios (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.permissoes_usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES auth.users(id),
  is_admin boolean DEFAULT false,
  sedes_permitidas ARRAY DEFAULT '{}'::integer[],
  modulos_permitidos ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.equipamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  quantidade_total integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.locacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  sala text NOT NULL,
  data_locacao date NOT NULL,
  observacao text NOT NULL,
  solicitante text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid REFERENCES auth.users(id),
  dia_inteiro boolean DEFAULT true,
  hora_inicio text,
  hora_fim text
);

CREATE TABLE public.ocorrencias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id bigint REFERENCES public.alunos(id),
  colaborador_nome text NOT NULL,
  colaborador_id text,
  texto text NOT NULL,
  data timestamp with time zone DEFAULT timezone('utc'::text, now()),
  sede_id integer DEFAULT 1219 REFERENCES public.sedes(id)
);

CREATE TABLE public.encaminhamentos_repouso (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id bigint REFERENCES public.alunos(id),
  sintoma text NOT NULL,
  encaminhado_por text NOT NULL,
  hora_encaminhamento text NOT NULL,
  status text DEFAULT 'aguardando'::text,
  obs_atendimento text,
  destino text,
  atendido_por text,
  hora_atendimento timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  sede_id integer DEFAULT 1219 REFERENCES public.sedes(id)
);

CREATE TABLE public.conselho_notas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cd_aluno text NOT NULL,
  nm_pessoa text NOT NULL,
  foto_url text,
  full_foto_url text,
  turma text,
  grades jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  sede_id integer DEFAULT 1219 REFERENCES public.sedes(id)
);
```

#### B. Triggers e Functions (Sincronização Segura)

Execute o comando abaixo para criar o gatilho que copia os dados dos usuários do Google automaticamente, evitando a exposição da tabela sensível `auth.users` ao Frontend.

```sql
CREATE OR REPLACE FUNCTION public.copiar_dados_novo_usuario()
RETURNS trigger
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_copiar_usuario
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.copiar_dados_novo_usuario();
```

#### C. View Segura e Políticas RLS (Row Level Security)

Habilite as permissões dinâmicas do Painel Administrativo de forma blindada:

```sql
-- Cria a view que une o Usuário com suas Permissões
CREATE OR REPLACE VIEW public.vw_gestao_usuarios WITH (security_invoker = on) AS
SELECT
  u.id,
  u.id as user_id,
  u.email,
  u.nome,
  COALESCE(p.is_admin, false) as is_admin,
  COALESCE(p.sedes_permitidas, '{}'::integer[]) as sedes_permitidas,
  COALESCE(p.modulos_permitidos, '{}'::text[]) as modulos_permitidos
FROM public.usuarios u
LEFT JOIN public.permissoes_usuarios p ON u.id = p.user_id;

-- Habilita a Segurança em Nível de Linha (RLS)
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Locações e Equipamentos
CREATE POLICY "Leitura geral equipamentos" ON public.equipamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestao equipamentos" ON public.equipamentos FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Leitura geral locacoes" ON public.locacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Inserir locacoes" ON public.locacoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Deletar locacoes" ON public.locacoes FOR DELETE USING (
  auth.uid() = user_id OR
  (SELECT is_admin FROM public.permissoes_usuarios WHERE user_id = auth.uid()) = true
);
```

---

### 2. Configuração Local (VS Code)

1. Clone o repositório:
   ```bash
   git clone [https://github.com/SEU_USUARIO/PGE.git](https://github.com/SEU_USUARIO/PGE.git)
   cd PGE
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env.local` na raiz do projeto e insira as chaves fornecidas no painel do seu Supabase (_Project Settings > API_):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=[https://seu-id.supabase.co](https://seu-id.supabase.co)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---

### 3. Deploy na Netlify 🌐 (Passo a Passo Detalhado)

O projeto possui um arquivo `netlify.toml` na raiz, o que automatiza grande parte das configurações de ambiente para o Next.js.

**Passo 1:** Faça login na [Netlify](https://www.netlify.com/) utilizando sua conta do GitHub.
**Passo 2:** No painel principal, clique no botão **"Add new site"** e depois em **"Import an existing project"**.
**Passo 3:** Escolha o **GitHub** como provedor e selecione o repositório `PGE`.
**Passo 4:** Na tela de configurações de Build, a Netlify detectará automaticamente o Next.js. Confirme se os campos estão assim:

- **Framework:** Next.js
- **Build command:** `npm run build`
- **Publish directory:** `.next`
  **Passo 5:** Clique no botão **"Add environment variables"** (Adicionar variáveis de ambiente). É **obrigatório** inserir as chaves de conexão do seu Supabase para o sistema em produção funcionar:
- Chave 1: `NEXT_PUBLIC_SUPABASE_URL` (Insira a URL do seu Supabase)
- Chave 2: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Insira a chave pública Anon)
  **Passo 6:** Clique em **"Deploy site"**.

_(Dica: A Netlify fornecerá uma URL provisória como `nome-aleatorio.netlify.app`. Você pode ir em "Site configuration" > "Domain management" para alterar esse nome para algo como `pge-suaescola.netlify.app`)_.

---

_Desenvolvido com foco em escalabilidade e arquitetura Multi-Tenant com segurança RLS (PostgreSQL) avançada._
