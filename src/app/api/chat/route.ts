import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant" | "model";
  content: string;
};

type UserProfile = {
  fullName: string | null;
  firstName: string | null;
  displayName: string | null;
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options, path: "/" });
          } catch {}
        },
        remove(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, path: "/" });
          } catch {}
        },
      },
    },
  );
}

function getUserProfileFromAuthUser(user: any): UserProfile {
  const fullName =
    user?.user_metadata?.full_name?.trim?.() ||
    user?.user_metadata?.name?.trim?.() ||
    user?.user_metadata?.nome?.trim?.() ||
    user?.email?.split("@")?.[0]?.trim?.() ||
    null;

  const firstName = fullName ? fullName.split(/\s+/)[0] : null;
  const displayName = firstName || fullName || null;

  return {
    fullName,
    firstName,
    displayName,
  };
}

function mergeUserProfiles(
  authProfile: UserProfile,
  clientProfile: Partial<UserProfile> | null,
): UserProfile {
  const fullName =
    (typeof clientProfile?.fullName === "string" &&
      clientProfile.fullName.trim()) ||
    authProfile.fullName ||
    null;

  const firstName =
    (typeof clientProfile?.firstName === "string" &&
      clientProfile.firstName.trim()) ||
    (fullName ? fullName.split(/\s+/)[0] : null);

  const displayName =
    (typeof clientProfile?.displayName === "string" &&
      clientProfile.displayName.trim()) ||
    firstName ||
    fullName ||
    null;

  return {
    fullName,
    firstName,
    displayName,
  };
}

function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        "role" in m &&
        "content" in m &&
        typeof (m as any).content === "string" &&
        (m as any).content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
      content: m.content.trim(),
    }));
}

function enforceUserNameInResponse(
  responseText: string,
  displayName: string | null,
): string {
  if (!responseText?.trim() || !displayName) return responseText;

  const trimmed = responseText.trim();
  const lower = trimmed.toLowerCase();
  const displayLower = displayName.toLowerCase();

  if (lower.includes(displayLower)) {
    return trimmed;
  }

  const genericGreetings = [
    "olá!",
    "olá.",
    "olá,",
    "oi!",
    "oi.",
    "oi,",
    "bom dia!",
    "bom dia.",
    "bom dia,",
    "boa tarde!",
    "boa tarde.",
    "boa tarde,",
    "boa noite!",
    "boa noite.",
    "boa noite,",
  ];

  for (const greeting of genericGreetings) {
    if (lower.startsWith(greeting)) {
      const rest = trimmed.slice(greeting.length).trimStart();

      if (!rest) {
        return `${displayName}, como posso ajudar?`;
      }

      return `${displayName}, ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
    }
  }

  return `${displayName}, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

function buildSystemPrompt(userProfile: UserProfile) {
  const treatmentRule = userProfile.displayName
    ? `
NOME DO USUÁRIO ATUAL
- Nome completo do usuário: ${userProfile.fullName || userProfile.displayName}
- Primeiro nome do usuário: ${userProfile.firstName || userProfile.displayName}
- Forma preferencial de tratamento no usuário: ${userProfile.displayName}

REGRAS DE TRATAMENTO
- Sempre que natural, trate o usuário pelo nome.
- Em atendimentos comuns, prefira usar o primeiro nome ou a forma curta: "${userProfile.displayName}".
- Evite usar o nome completo repetidamente se ele for grande.
- Use o nome completo apenas quando houver necessidade formal.
- Exemplos preferidos:
  - "${userProfile.displayName}, isso é feito no módulo..."
  - "Certo, ${userProfile.displayName}. Para fazer isso..."
  - "${userProfile.displayName}, o caminho correto é..."
- Evite construções artificiais como repetir nome completo e depois nome curto na mesma frase.
`
    : `
NOME DO USUÁRIO ATUAL
- O nome do usuário não está disponível.
- Não invente nome.
- Use tratamento neutro, profissional e cordial.
`;

  return `
Você é o "CPD-Bot", assistente virtual oficial e especialista do Portal PGE (Portal de Gestão Escolar) do Colégio São Paulo.

Sua função é atuar como um HELP DESK SÊNIOR do sistema:
- orientar professores, coordenadores, secretários e administradores;
- explicar com clareza onde cada tarefa é feita;
- ensinar o fluxo correto de uso do sistema;
- esclarecer regras de funcionamento dos módulos;
- responder com base no comportamento real do portal;
- nunca inventar alunos, dados financeiros, usuários, permissões ou resultados.

${treatmentRule}

IDENTIDADE DE ATENDIMENTO
- Fale em português do Brasil.
- Seja profissional, claro, objetivo e prestativo.
- Fale como suporte interno de sistema escolar.
- Priorize instruções práticas, em passos curtos e claros.
- Quando o usuário perguntar "onde fica", responda pelo NOME DO MÓDULO, e não pela rota.
- Só cite a rota técnica entre parênteses se isso realmente ajudar.
- Prefira frases como:
  - "Acesse o módulo Sorteio"
  - "Vá em Configurações do Sistema > Gestão de Acessos"
  - "Abra o módulo Alunos e use os filtros de série e turma"
- Evite respostas vagas como "verifique no sistema".
- Nunca diga que fez algo no banco, importou dados ou alterou permissões se isso não aconteceu de fato.

REGRAS GERAIS DE ATENDIMENTO
1. Sempre responda usando o nome funcional da área do sistema.
2. Quando possível, cite botão, aba, campo, filtro ou ação exata.
3. Se existir mais de um caminho possível, diga qual é o recomendado.
4. Se a dúvida for operacional, responda em formato de passo a passo.
5. Se a dúvida for conceitual, explique primeiro e depois diga onde executar.
6. Se a pergunta envolver erro do usuário, explique a causa provável e como corrigir.
7. Se a dúvida envolver permissão, informe que o acesso depende das permissões do usuário e da unidade liberada.
8. Se a dúvida envolver dados sensíveis, não invente resposta; oriente o usuário a verificar no módulo correto.
9. Nunca invente nomes de alunos, sorteados, usuários, sedes ou registros.
10. Se o usuário citar apenas a rota, traduza isso para o nome amigável do módulo.
11. Quando houver nome do usuário disponível, use esse nome naturalmente na resposta.
12. Ao explicar caminhos, priorize este formato:
    - nome do módulo
    - submenu/aba
    - ação/botão
13. Sempre que possível, responda em 3 partes:
    - o que é
    - onde fica
    - como fazer

MAPA FUNCIONAL DO SISTEMA

1) INÍCIO / DASHBOARD
Nome amigável: Início
Função:
- tela principal do sistema;
- resumo geral do portal;
- ponto de entrada para navegação dos módulos.

2) MÓDULO ALUNOS
Nome amigável: Alunos
Função:
- consulta e busca de alunos;
- filtros por série, turma e nome;
- visualização de dados acadêmicos e cadastrais;
- acesso ao histórico do aluno;
- exibição de foto e informações de responsáveis quando disponíveis;
- relacionamento com a unidade/sede atual.

3) MÓDULO SALA DE REPOUSO
Nome amigável: Sala de Repouso
Função:
- fluxo de atendimento e acompanhamento de encaminhamentos de alunos para repouso/enfermaria.

4) MÓDULO OCORRÊNCIAS
Nome amigável: Ocorrências
Função:
- registro disciplinar e histórico de ocorrências do aluno.

5) MÓDULO HISTÓRICO
Nome amigável: Histórico
Função:
- emissão/consulta de histórico escolar e documentos acadêmicos relacionados.

6) MÓDULO CONSELHO
Nome amigável: Conselho
Função:
- apoio a rotinas pedagógicas e registros ligados ao conselho de classe.

7) MÓDULO LOCAÇÕES
Nome amigável: Locações
Função:
- controle de empréstimo/uso de dispositivos e equipamentos.

8) MÓDULO HISTÓRICO DE LOCAÇÕES
Nome amigável: Histórico de Locações
Função:
- consulta de movimentações passadas de equipamentos e empréstimos.

9) MÓDULO RELATÓRIOS
Nome amigável: Relatórios
Função:
- central de emissão e impressão de relatórios do portal.

10) MÓDULO MALA DIRETA
Nome amigável: Mala Direta
Função:
- envio em lote de comunicação.

11) MÓDULO SORTEIO PRO v2
Nome amigável: Sorteio
Função:
- realização de sorteios auditáveis com base em inscrições;
- definição de cotas;
- regras de unicidade;
- separação por equipe;
- uso opcional de IA para interpretar regras escritas em linguagem natural.

12) CONFIGURAÇÕES DO SISTEMA
Nome amigável: Configurações do Sistema
Função:
- área administrativa e operacional do portal.

OBJETIVO FINAL
Seu papel é fazer o usuário entender rapidamente:
- em qual módulo ele deve entrar;
- qual botão ou ação usar;
- qual é o fluxo correto dentro do PGE.

Se o usuário citar apenas a rota, traduza isso para o nome amigável do módulo.
`.trim();
}

// --- FUNÇÕES PARA OPENROUTER ---

async function callOpenRouter(messages: ChatMessage[], profile: UserProfile) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY não configurada");
  }

  const systemPrompt = buildSystemPrompt(profile);

  // Prepara as mensagens com o system prompt
  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost",
      "X-Title": "Portal PGE - CPD-Bot",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet:latest",  // Modelo de alta qualidade
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const errData = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${errData}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Não consegui gerar uma resposta.";
}

// --- FUNÇÃO PARA GEMINI (fallback) ---

async function callGemini(messages: ChatMessage[], profile: UserProfile) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = buildSystemPrompt(profile);

  const previousMessages = messages.slice(0, -1).slice(-12);

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      {
        role: "model",
        parts: [
          {
            text: profile.displayName
              ? `Entendido. Sou o CPD-Bot e vou atender ${profile.displayName} de forma clara, profissional e natural.`
              : "Entendido. Sou o CPD-Bot e vou orientar o usuário de forma clara, profissional e objetiva.",
          },
        ],
      },
      ...previousMessages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
    ],
    generationConfig: {
      maxOutputTokens: 1400,
      temperature: 0.15,
      topP: 0.9,
    },
  });

  const result = await chat.sendMessage(messages[messages.length - 1].content);
  return result.response.text()?.trim() || "";
}

// --- EXECUÇÃO PRINCIPAL ---

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const normalizedMessages = normalizeMessages(body?.messages);

    if (normalizedMessages.length === 0) {
      return NextResponse.json(
        { error: "Mensagens inválidas." },
        { status: 400 },
      );
    }

    const lastMessage = normalizedMessages[normalizedMessages.length - 1];
    const userMessage = lastMessage?.content;

    if (!userMessage) {
      return NextResponse.json(
        { error: "A última mensagem do usuário está vazia." },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const authProfile = getUserProfileFromAuthUser(user);
    const resolvedProfile = mergeUserProfiles(
      authProfile,
      body?.userProfile && typeof body.userProfile === "object"
        ? body.userProfile
        : null,
    );

    const pgeSystemPrompt = buildSystemPrompt(resolvedProfile);

    const messages: ChatMessage[] = normalizedMessages;

    let responseText: string;

    // Tenta OpenRouter primeiro, cai para Gemini se der erro
    try {
      responseText = await callOpenRouter(messages, resolvedProfile);
    } catch (openRouterError) {
      console.warn("OpenRouter falhou, caindo para Gemini:", openRouterError.message);
      try {
        responseText = await callGemini(messages, resolvedProfile);
      } catch (geminiError) {
        console.error("Gemini também falhou:", geminiError.message);
        responseText = `${resolvedProfile.displayName || "Usuário"}, desculpe, o serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes.`;
      }
    }

    if (!responseText?.trim()) {
      responseText = resolvedProfile.displayName
        ? `${resolvedProfile.displayName}, não consegui gerar uma resposta agora. Tente novamente.`
        : "Não consegui gerar uma resposta agora. Tente novamente.";
    }

    responseText = enforceUserNameInResponse(
      responseText,
      resolvedProfile.displayName,
    );

    if (user) {
      try {
        await supabase.from("logs_auditoria").insert({
          usuario_nome:
            resolvedProfile.fullName ||
            resolvedProfile.displayName ||
            user.email ||
            "Usuário PGE",
          acao: "Consulta CPD-Bot",
          detalhes: `Pergunta: ${messages[messages.length - 1]?.content?.slice(0, 1000)} | Resposta: ${responseText?.slice(0, 1000)}`,
        });
      } catch (logError) {
        console.error(
          "Aviso: Falha ao salvar o log de auditoria no Supabase.",
          logError,
        );
      }
    }

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error("Erro no chat da IA:", error);

    const fallbackMessage =
      process.env.NODE_ENV === "development"
        ? `Erro: ${error.message}`
        : "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.";

    return NextResponse.json(
      { error: fallbackMessage },
      { status: 500 },
    );
  }
}