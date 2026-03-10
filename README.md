<div align="center">
  <img src="public/assets/csp_logo.bmp" alt="Logo PGE" width="200" />
  <h1>Portal de Gestão Escolar (PGE) 🎓</h1>
  <p><em>Plataforma web Multi-Tenant para gestão acadêmica, hospitalar, disciplinar e logística de instituições de ensino.</em></p>

  <p>
    <img src="https://img.shields.io/badge/Status-Em_Produ%C3%A7%C3%A3o-success?style=for-the-badge" alt="Status" />
    <img src="https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  </p>
</div>

---

## 📖 Visão Geral

O **PGE** foi idealizado e desenvolvido para centralizar, modernizar e blindar as operações diárias de um grande ecossistema educacional. A aplicação resolve o problema de fragmentação de dados ao integrar o acompanhamento acadêmico, o fluxo de enfermaria, a gestão de ocorrências, reservas de equipamentos e disparo de comunicados em uma única interface escalável.

O sistema foi construído sob uma arquitetura **Multi-Tenant (Múltiplas Sedes)**, o que significa que uma única instância da aplicação atende diversas unidades físicas (Coligadas), garantindo que os usuários vejam apenas os dados pertencentes às sedes para as quais têm permissão explícita.

---

## 📸 Showcase da Interface

> *A interface foi desenhada com foco em UX, responsividade e acessibilidade, contando com suporte nativo a **Dark Mode**.*

| Dashboard Principal |Detalhes do Aluno (Dark Mode) |
| :---: | :---: |
| `<img src="caminho/para/print_dashboard.png" width="400"/>` | `<img src="caminho/para/print_prontuario_dark.png" width="400"/>` |
| **Locação Multimídia (Smart Booking)** | **Relatórios & Mala Direta** |
| `<img src="caminho/para/print_locacao.png" width="400"/>` | `<img src="caminho/para/print_mala_direta.png" width="400"/>` |

*(Substitua os caminhos acima pelos links das suas imagens)*

---

## 🚀 Principais Funcionalidades e Módulos

### 🏢 Arquitetura Multi-Tenant & Acessos
- **Seletor de Unidades:** Os usuários transitam entre diferentes sedes (ex: Pituba, Itaigara) com um clique, reidratando todo o contexto da aplicação em tempo real.
- **SSO Institucional:** Autenticação via Google OAuth2, restrita a domínios autorizados (ex: `@cspba.com.br`).
- **Painel de Administração:** Controle granular de acesso por colaborador (Admin vs User), definindo quais módulos e quais sedes cada um pode visualizar.

### 🎓 Gestão de Alunos (Detalhes 360º)
- Busca unificada ultrarrápida.
- **Modal de Detalhes:** Visualização consolidada de dados acadêmicos, contatos dos responsáveis e foto com recurso de zoom in/out.
- Linha do tempo centralizada unindo o histórico disciplinar e médico do aluno.

### 🩺 Sala de Repouso (Enfermaria)
- Fluxo de trabalho em tempo real: Educadores encaminham alunos detalhando sintomas.
- Fila de espera visível para a equipe de enfermagem.
- Registro de triagem, observações de atendimento e liberação (Sala/Casa).
- Exportação automatizada de laudos e estatísticas para Excel (`.csv` e `.xlsx`).

### ⚖️ Conselho de Classe Inteligente
- Motor de importação massiva de planilhas (`xlsx`/`csv`).
- Filtros dinâmicos que identificam alunos em recuperação cruzando notas de Exame Final e Etapas contra uma **Média de Corte** parametrizável.
- Destaque visual (UI/UX) automático para notas abaixo da média.

### 📽️ Locação Multimídia (Smart Booking)
- Gestão de inventário de equipamentos por sede.
- Algoritmo de prevenção de conflitos: Bloqueia locações caso o equipamento não tenha quantidade disponível no horário/data solicitados.
- Visão gerencial de histórico e auditoria (quem solicitou, horário e destino).

### 🖨️ Central de Relatórios (Pixel-Perfect)
- Geração de "Históricos Escolares" (Frente e Verso) complexos.
- Motor de impressão injetado via CSS (`@media print`) garantindo fidelidade absoluta de dimensões (A4), margens e quebras de página em relação aos documentos oficiais do MEC/SEC.
- Dados preenchidos são salvos dinamicamente no banco de dados para edições futuras.

### 📧 Mala Direta Automática
- Editor de Texto Rico (Rich Text) integrado.
- Importação de destinatários diretamente do banco de dados (filtrando por Turma/Série/Status) ou via arrastar-e-soltar de planilhas externas.
- Motor de **Tags Dinâmicas** (`{{Nome}}`, `{{Turma}}`) e envio com anexos processado via rotas de API seguras (Nodemailer + Edge Functions).

---

## 🛠️ Stack Tecnológico

**Frontend:**
- [Next.js 15.1](https://nextjs.org/) (App Router, Server & Client Components)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) (Estilização avançada com `@custom-variant dark`)
- **next-themes** (Gestão fluida de Dark/Light mode sem FOUC)
- **Lucide React** (Iconografia)
- **SweetAlert2** (Feedback visual avançado)
- **React-Quill-New** (Editor WYSIWYG)

**Backend & Integrações:**
- [Supabase](https://supabase.com/) (BaaS)
- **Next.js API Routes** (Edge Functions para processamento de e-mails)
- **Nodemailer** (Serviço SMTP de disparos)
- **PapaParse & XLSX** (Processamento em memória de planilhas)

**Hospedagem:**
- [Netlify](https://www.netlify.com/) (CI/CD Automatizado com cache tuning via `netlify.toml`)

---

## 🔒 Segurança e Banco de Dados (PostgreSQL)

Um dos maiores diferenciais deste projeto é a arquitetura de segurança de dados implementada no backend:

1. **Row Level Security (RLS):** Todas as tabelas críticas possuem políticas RLS estritas no Postgres. Um usuário só pode inserir, editar ou deletar registros se estiver autenticado e, em operações destrutivas, se for o autor da ação ou um Administrador validado pela tabela `permissoes_usuarios`.
2. **Database Triggers:** Sincronização automática (`AFTER INSERT`) entre o Identity Provider do Supabase (`auth.users`) e a tabela pública de colaboradores.
3. **Secure Views:** Uso de Views com `security_invoker = on` para cruzar dados sensíveis de usuários com matrizes de permissões sem expor a camada de autenticação ao Client-Side.
4. **Cookies Seguros:** Middleware interceptador e rotas de callback que forçam o armazenamento de tokens com flags `sameSite: "lax"` e `secure: true`.

---

## 📁 Estrutura de Diretórios (Resumo)

```text
src/
├── app/
│   ├── api/mala-direta/          # Rotas de Backend (Node)
│   ├── auth/callback/            # Fluxo OAuth2 Seguro
│   ├── dashboard/                # Rotas Protegidas do Sistema
│   │   ├── admin/                # Gestão de Permissões e Importação CSV
│   │   ├── alunos/               # Grid, Busca e Modais (Prontuário/Ocorrência)
│   │   ├── conselho/             # Parse de Notas e Regras Acadêmicas
│   │   ├── locacoes/             # Smart Booking
│   │   ├── mala-direta/          # Interface do Editor e Disparo
│   │   ├── relatorios/           # Motor de Impressão A4
│   │   └── repouso/              # Fluxo de Enfermaria Hospitalar
│   ├── layout.tsx                # Tema (Dark Mode) e Provedores Root
│   └── page.tsx                  # Interface de Login (Google SSO)
├── components/
│   ├── layout/                   # Header, Seletor de Unidades, Tabs
│   └── ThemeProvider.tsx         # Next-Themes
├── context/
│   ├── AuthContext.tsx           # Gestão de Sessão
│   └── ColigadaContext.tsx       # Controle de Estado Multi-Tenant
└── lib/
    └── supabase.ts               # Instância do Cliente SSR
