# PGE - Portal de Gestão Escolar (Design Document)

## 1. Visão Geral da Arquitetura
O PGE é uma plataforma monolítica front-heavy desenhada em **Next.js (App Router)** e hospedada geralmente nativamente na Vercel ou via Docker. O sistema delega grande parte de sua complexidade transacional e bancos de dados (BaaS) diretamente ao ecossistema do **Supabase** via PostgreSQL.

## 2. Decisões Estruturais e Tecnológicas

### 2.1 Por que Supabase?
Foi escolhido sobre o Firebase ou Hasura devido ao acesso nativo a um banco SQL relacional (Postgres). Isso foi fundamental pois sistemas escolares são fortemente baseados em vínculos estruturais (Sede -> Aluno -> Notas -> Ocorrências), que em bancos não-relacionais gerariam duplicações complexas inviáveis a longo prazo.

### 2.2 Controle de Permissões (Multi-Tenant)
Foi implementado um modelo `Multi-Tenant Leve`:
- Todos os usuários e alunos dividem as mesmas tabelas mestras (Ex: `alunos`, `ocorrencias`).
- A compartimentalização acontece com o vínculo obrigatório a uma Sede via a Foreign Key genérica: `sede_id`.
- Devido às particularidades de algumas escolas agrupadas em Holding, utilizamos Arrays no PostgreSQL na tabela `permissoes_usuarios` (`sedes_permitidas []`) para que diretores de alto nível e CPD possam transitar entre o Dashboard do EF1, EF2 e EM livremente através de seletores no React sem necessitar multi-contas.

### 2.3 Gerenciamento de Estado de Redes (SWR vs React Query)
Para o controle das telas pesadas recheadas de KPI e paineis matemáticos em tempo real, adotou-se globalmente o `SWR` em vez do disparo local `useState` combinado a `useEffect`. O motivo da escolha específica do SWR em relação ao TanStack React Query foi sua sintaxe ultracurta, forte alinhamento com a Next.js/Vercel (autores originais) e implementação imediata de Loading Skeletons via React.

### 2.4 Caching e Otimização Sem Redis
Atualmente o PGE não necessita atritar sua pilha de deploy com clusterizações em Redis via Docker. O Supabase fornece cache Edge via sua API PostgREST, sendo rápido o suficiente para atender instâncias de CRUD padrão de funcionários. Somado a isso, o uso agressivo do **SWR (Stale-While-Revalidate)** no Frontend mascara 90% dos carregamentos da camada de aplicação do usuário. Em caso de listagens de Fichas (ex> 3.000 alunos), adotou-se lógicas de loops paginados via `.range()`, mitigando congestionamento.

## 3. Segurança (RLS e Edge API)
O projeto confia 100% de sua camada de autorização ao Auth() Middleware do Supabase atrelado à RLS Database Policy nativa. Todas as interações com GenAI (Google Gemini) são feitas server-side, mascarando `GOOGLE_API_KEY` apenas na camada encriptada NodeJS, protegendo orçamentos e payloads da companhia.
