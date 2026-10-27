import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type ChatMessage = {
  role: "user" | "assistant" | "model";
  content: string;
};

type UserProfile = {
  fullName: string | null;
  firstName: string | null;
  displayName: string | null;
};

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
        remove(name: string, options: CookieOptions) {
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
- Forma preferencial de tratamento no chat: ${userProfile.displayName}

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
- Quando o usuário perguntar “onde fica”, responda pelo NOME DO MÓDULO, e não pela rota.
- Só cite a rota técnica entre parênteses se isso realmente ajudar.
- Prefira frases como:
  - "Acesse o módulo Sorteio"
  - "Vá em Configurações do Sistema > Gestão de Acessos"
  - "Abra o módulo Alunos e use os filtros de série e turma"
- Evite respostas vagas como “verifique no sistema”.
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
`.trim();
}

// --- PROVEDORES DE IA ---
// Ordem padrão: OpenRouter -> Mistral -> Groq -> Gemini -> FreeLLM API.
// A disponibilidade gratuita e os limites dependem da conta de cada provedor.
type AIProvider = {
  name: string;
  url: string;
  key: string;
  model: string;
  format: "openai" | "gemini";
  headers?: Record<string, string>;
};

function getAIProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || "";
  const mistralKey = process.env.MISTRAL_API_KEY?.trim() || "";
  const groqKey = process.env.GROQ_API_KEY?.trim() || "";
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const freeLLMKey = process.env.FREELLMAPI_KEY?.trim() || "";

  if (openRouterKey) {
    providers.push({
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: openRouterKey,
      model: process.env.OPENROUTER_MODEL?.trim() || "openrouter/free",
      format: "openai",
      headers: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Portal PGE - CPD-Bot",
      },
    });
  }

  if (mistralKey) {
    providers.push({
      name: "Mistral",
      url: "https://api.mistral.ai/v1/chat/completions",
      key: mistralKey,
      model: process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest",
      format: "openai",
    });
  }

  // Desativado por padrão. Ative apenas depois de conferir o modelo,
  // a disponibilidade e as condições de uso da sua conta Groq.
  if (process.env.AI_ALLOW_GROQ === "true" && groqKey) {
    providers.push({
      name: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groqKey,
      model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
      format: "openai",
    });
  }

  // Google AI Studio (Gemini) - plano gratuito
  if (geminiKey) {
    providers.push({
      name: "Gemini",
      url: `https://generativelanguage.googleapis.com/v1beta/models/${
        process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash"
      }:generateContent?key=${geminiKey}`,
      key: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
      format: "gemini",
    });
  }

  // FreeLLM API - proxy gratuito com modelos do HuggingFace
  if (freeLLMKey) {
    providers.push({
      name: "FreeLLM API",
      url: "https://freellmapi.duckdns.org/v1/chat/completions",
      key: freeLLMKey,
      model: process.env.FREELLMAPI_MODEL?.trim() || "gpt-4o-mini",
      format: "openai",
    });
  }

  return providers;
}

function extractAIText(data: any): string {
  // Formato OpenAI: choices[0].message.content
  const openaiContent = data?.choices?.[0]?.message?.content;
  if (typeof openaiContent === "string") {
    return openaiContent.trim();
  }
  if (Array.isArray(openaiContent)) {
    return openaiContent
      .filter(
        (part: any) => part?.type === "text" && typeof part.text === "string",
      )
      .map((part: any) => part.text)
      .join("\n")
      .trim();
  }

  // Formato Gemini: candidates[0].content.parts[].text
  const geminiParts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(geminiParts)) {
    return geminiParts
      .filter((part: any) => typeof part?.text === "string")
      .map((part: any) => part.text)
      .join("\n")
      .trim();
  }

  return "";
}

async function callAIProvider(
  provider: AIProvider,
  formattedMessages: { role: string; content: string }[],
): Promise<string> {
  const configuredTimeout = Number(process.env.AI_TIMEOUT_MS) || 20000;
  const timeoutMs = Math.min(60000, Math.max(5000, configuredTimeout));
  const configuredMaxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS) || 800;
  const maxTokens = Math.min(1200, Math.max(100, configuredMaxTokens));

  // Converte mensagens para o formato de cada provedor
  let body: Record<string, unknown>;
  if (provider.format === "gemini") {
    const systemInstruction = formattedMessages.find(m => m.role === "system")?.content || "";
    const contents = formattedMessages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
      },
    };
  } else {
    body = {
      model: provider.model,
      messages: formattedMessages,
      temperature: 0.2,
      max_tokens: maxTokens,
      stream: false,
    };
  }

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(provider.format === "gemini"
        ? {} // A key já está na URL query string
        : { Authorization: `Bearer ${provider.key}` }),
      ...provider.headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  const rawBody = await response.text();
  let data: any = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // Não registrar o corpo completo nem chaves ou histórico da conversa.
    console.warn("[CPD-Bot] Provedor recusou a requisição", {
      provider: provider.name,
      status: response.status,
      retryAfter: response.headers.get("retry-after"),
      error:
        typeof data?.error?.message === "string"
          ? data.error.message.slice(0, 300)
          : "Erro sem detalhes JSON",
      requestId:
        response.headers.get("x-request-id") ||
        response.headers.get("x-openrouter-request-id"),
    });

    throw new Error(`${provider.name} HTTP ${response.status}`);
  }

  if (!data) {
    throw new Error(`${provider.name} retornou JSON inválido ou vazio`);
  }

  const content = extractAIText(data);

  if (!content) {
    console.warn("[CPD-Bot] Resposta sem texto utilizável", {
      provider: provider.name,
      model: data.model,
      finishReason: data.choices?.[0]?.finish_reason,
      hasChoices: Array.isArray(data.choices),
      choicesCount: data.choices?.length ?? 0,
    });

    throw new Error(`${provider.name} retornou resposta vazia`);
  }

  return content;
}

// --- ORQUESTRADOR EM CASCATA ---
async function generateAIResponse(
  messages: ChatMessage[],
  profile: UserProfile,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(profile);
  const recentMessages = messages.slice(-8);

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...recentMessages.map((message) => ({
      role: message.role === "model" ? "assistant" : message.role,
      content: message.content,
    })),
  ];

  const providers = getAIProviders();

  if (providers.length === 0) {
    throw new Error("Nenhum provedor de IA configurado");
  }

  const failures: string[] = [];

  for (const provider of providers) {
    try {
      console.info("[CPD-Bot] Tentando provedor:", provider.name);
      const answer = await callAIProvider(provider, formattedMessages);
      console.info("[CPD-Bot] Resposta recebida de:", provider.name);
      return answer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      failures.push(`${provider.name}: ${errorMessage}`);
      console.warn(
        "[CPD-Bot] Provedor falhou; tentando o próximo:",
        provider.name,
        errorMessage,
      );
    }
  }

  // Detalhes técnicos apenas nos logs do servidor.
  console.error("[CPD-Bot] Todos os provedores falharam", failures);
  throw new Error("Todos os provedores de IA falharam");
}

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

    let responseText = "";

    try {
      responseText = await generateAIResponse(
        normalizedMessages,
        resolvedProfile,
      );
    } catch (aiError) {
      console.error("[CPD-Bot] Falha geral nas IAs:", aiError);

      return NextResponse.json(
        {
          error:
            "O CPD-Bot está temporariamente indisponível. Tente novamente em instantes.",
          code: "AI_UNAVAILABLE",
        },
        { status: 503 },
      );
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
          detalhes: `Pergunta: ${userMessage.slice(0, 1000)} | Resposta: ${responseText.slice(0, 1000)}`,
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
        ? `Erro: ${(error as Error)?.message}`
        : "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.";

    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}
