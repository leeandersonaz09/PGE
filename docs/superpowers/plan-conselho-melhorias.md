# Plano de Implementação: Melhorias do Conselho de Classe

## Objetivo
Complementar o módulo Conselho de Classe com 5 melhorias, sem quebrar nenhuma funcionalidade existente.

## Funcionalidades Existentes a PRESERVAR
- Upload de planilha Excel (.xlsx, .xls, .csv)
- Filtros: Turma, Média Corte, Exame Final, Média Final, Etapas
- Modal de foto com zoom
- Tema escuro/claro
- Barra de abas (TabsBar)
- Navegação Anterior/Próximo entre alunos
- Status de Recuperação/Conselho

## Melhorias a Implementar

### 1. Histórico de Conselhos
- Tabela `conselho_historico` no Supabase
- Registra cada sessão do conselho: data, turma, aluno, decisão, observação
- API route para salvar e buscar histórico
- Interface: lista de sessões passadas com filtros

### 2. Busca por Aluno (Nome/RA)
- Barra de busca no topo da tela
- Filtra por nome ou RA
- Destaca o aluno encontrado na navegação

### 3. Campo de Parecer do Conselho
- Textarea na ficha do aluno
- Botões rápidos: Aprovado, Retido/Exame, Recuperação, Observação
- Salva no banco alongside do aluno

### 4. Filtro de Disciplinas Mais Intuitivo
- Agrupa disciplinas por tipo (Principais, Complementares, Ignoradas)
- Busca por disciplina específica
- Mantém o comportamento atual de auto-seleção

### 5. Exportação de Pareceres
- Botão "Exportar" gera Excel (.xlsx) com todos os alunos, disciplinas e decisões
- Usa a biblioteca `xlsx` que já está instalada

## Arquitetura

### Banco de Dados
- Nova migration SQL em `docs/superpowers/sql/`
- Tabela `conselho_historico`
- Coluna `parecer` em `conselho_notas`

### API
- `src/app/api/conselho/route.ts`
  - GET: buscar histórico de conselhos
  - POST: salvar parecer de um aluno
  - PUT: atualizar parecer

### Frontend
- `src/app/dashboard/conselho/page.tsx` (modificado)
- Componentes adicionais em `src/components/conselho/`

## Ordem de Implementação
1. Migration SQL (banco de dados)
2. API route
3. Frontend (page.tsx + componentes)
4. Testes