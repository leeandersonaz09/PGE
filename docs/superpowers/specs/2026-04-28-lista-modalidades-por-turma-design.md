# Design: Lista de Modalidades por Turma

## Objetivo

Adicionar um quarto módulo dentro de `Central de Relatórios` para gerar listas impressas de alunos por turma, no padrão visual já usado pelos relatórios atuais do PGE, especialmente `Fichas de Acompanhamento`.

O novo relatório deve permitir ao usuário:

- filtrar alunos por curso, série, turma e nome
- selecionar quais turmas deseja incluir
- gerar um único arquivo de impressão com uma página por turma selecionada
- imprimir uma lista em formato de presença/adesão com colunas de modalidades para marcação manual

## Escopo

Entram neste trabalho:

- novo card na tela `Central de Relatórios`
- nova rota de relatório dentro de `src/app/dashboard/relatorios/`
- reaproveitamento do padrão de filtros e carregamento usado nas fichas
- agrupamento dos alunos por série e turma
- layout de impressão próprio para lista por turma

Não entram neste trabalho:

- criação de nova tabela no banco
- persistência das escolhas das modalidades
- exportação em Excel ou PDF separado do fluxo de impressão do navegador

## Fonte de Dados

O relatório usará exclusivamente a tabela `alunos` já existente no Supabase, filtrando pela `sede_id` da `coligadaAtual`.

Campos necessários:

- `id` como RA/matrícula
- `nome`
- `serie`
- `turma`
- `Curso`
- `sede_id`

## Experiência da Tela

O fluxo deve seguir o mesmo comportamento geral das `Fichas de Acompanhamento` para manter familiaridade operacional.

### Barra superior

- botão de retorno para `Central de Relatórios`
- título do módulo
- botão de impressão

### Área de filtros

Mesmos filtros-base das fichas:

- busca por nome
- filtro por curso
- filtro por série
- filtro por turma

### Área de seleção

Em vez de selecionar alunos individualmente para imprimir fichas, a tela listará grupos de impressão por turma.

Cada grupo representa uma combinação de:

- série
- turma
- curso

Cada item mostrará:

- série/turma
- curso
- quantidade de alunos no grupo

O usuário poderá:

- marcar uma turma por vez
- marcar várias turmas
- marcar todas as turmas filtradas
- limpar a seleção

### Ação de carregar

Ao clicar em `Carregar`, o sistema montará a área de impressão com todas as turmas selecionadas, respeitando a ordem visual aplicada na listagem.

## Estrutura do Documento Impresso

Cada turma selecionada gera uma página própria.

### Cabeçalho

Deve seguir o padrão visual próximo ao usado em `Fichas de Acompanhamento`, com:

- logo do CSP
- título do relatório
- identificação destacada da série
- identificação destacada da turma

### Tabela

Colunas fixas:

- `RA`
- `Nome`
- `Karate`
- `GR`
- `Xadrez`
- `Totó`
- `Tênis de Mesa`
- `Corrida`
- `Futsal`
- `Basquete`
- `Vôlei`
- `Jogo Cooperativo`
- `Jogo Recreativo`
- `Jogo Adaptado`

Regras da tabela:

- uma linha por aluno
- células das modalidades devem permanecer vazias para marcação manual
- nomes devem ser ordenados alfabeticamente
- cada página deve conter apenas alunos da turma exibida no cabeçalho

## Ordenação e Agrupamento

O carregamento dos dados seguirá a lógica paginada já usada nas fichas para suportar bases grandes.

Agrupamento:

- chave do grupo: `Curso + serie + turma`

Ordenação:

- grupos ordenados por curso, série e turma
- alunos dentro do grupo ordenados por nome

## Arquitetura Proposta

### Arquivos novos

- nova página em `src/app/dashboard/relatorios/lista-modalidades/page.tsx`

### Arquivos alterados

- `src/app/dashboard/relatorios/page.tsx` para incluir o quarto card

### Reaproveitamento de padrão

O novo módulo deve espelhar das fichas:

- carregamento client-side
- leitura paginada de `alunos`
- uso de `useColigada`
- `useMemo` para filtros e agrupamentos
- `react-to-print` para emissão
- blocos `no-print` e área dedicada de impressão

## Tratamento de Estados

- `loading` durante a carga dos alunos
- botão de impressão desabilitado enquanto não houver turmas carregadas para emissão
- botão `Carregar` desabilitado enquanto não houver seleção
- mensagem visual de sucesso após montar o relatório, no mesmo espírito das fichas

## Testes e Validação

Validação manual esperada:

- filtro por curso, série e turma funcionando
- seleção individual e em massa de turmas
- geração de uma página por turma selecionada
- cabeçalho correto com logo, série e turma
- tabela contendo apenas `RA`, `Nome` e modalidades
- impressão preservando legibilidade em A4 paisagem

## Decisões Fechadas

- o relatório segue a opção 1, reaproveitando o fluxo das fichas
- a seleção será orientada por turmas, não por alunos
- a lista impressa terá apenas `RA`, `Nome` e modalidades
- a identificação de série e turma ficará no cabeçalho
- o documento poderá reunir várias turmas no mesmo arquivo de impressão

## Riscos Conhecidos

- muitas colunas podem apertar o layout; a implementação deve priorizar A4 em paisagem
- nomes longos podem exigir ajuste de fonte ou largura mínima da coluna de nome
- turmas sem padronização de série/turma no banco podem gerar agrupamentos inesperados; a implementação deve normalizar `trim` e caixa alta na chave
