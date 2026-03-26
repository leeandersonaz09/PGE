export const maxDuration = 90;

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface RegistroElegivel {
  id: number;
  aluno: string;
  responsavel: string;
  eqp: string;
  serie: string;
  turma: string;
  email: string;
  contato: string;
  timestamp: string;
}

interface GeminiRequestBody {
  prompt?: string;
  registros?: RegistroElegivel[];
  quota?: number;
  separarPorEquipe?: boolean;
}

const extrairJsonDaResposta = (raw: string) => {
  const texto = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(texto);
  } catch {
    const inicio = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");

    if (inicio === -1 || fim === -1 || fim <= inicio) {
      throw new Error("A IA não retornou JSON válido.");
    }

    return JSON.parse(texto.slice(inicio, fim + 1));
  }
};

const sanitizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GeminiRequestBody;
    const { prompt, registros, quota, separarPorEquipe } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chave da API não configurada.",
        },
        { status: 500 },
      );
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt ausente ou inválido.",
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum registro elegível foi enviado para análise.",
        },
        { status: 400 },
      );
    }

    const promptSeguro = String(prompt).slice(0, 3000);
    const quotaSegura = Math.max(
      1,
      Math.min(40, Math.floor(Number(quota) || 40)),
    );

    const registrosSanitizados = registros.slice(0, 5000).map((item) => ({
      id: Number(item.id),
      aluno: sanitizeText(item.aluno),
      responsavel: sanitizeText(item.responsavel),
      eqp: sanitizeText(item.eqp || "S/ EQUIPE"),
      serie: sanitizeText(item.serie),
      turma: sanitizeText(item.turma),
      email: sanitizeText(item.email),
      contato: sanitizeText(item.contato),
      timestamp: sanitizeText(item.timestamp),
    }));

    const idsPermitidos = new Set(registrosSanitizados.map((r) => r.id));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const instrucaoCompleta = `
Você é um interpretador seguro de regras de sorteio escolar.

TAREFA:
- Ler a REGRA DO USUÁRIO.
- Selecionar apenas IDs existentes em REGISTROS.
- Nunca inventar IDs.
- Nunca criar código.
- Nunca responder fora de JSON.

REGRAS FIXAS DO SISTEMA:
- REGISTROS já foram saneados localmente.
- Cada aluno aparece no máximo uma vez.
- Quando houve duplicidade do mesmo aluno, o sistema preservou a primeira inscrição.
- Responsável repetido para alunos diferentes permanece válido.
- Comparações devem ser tolerantes a acentos e maiúsculas/minúsculas.
- Limite máximo por equipe nesta execução: ${quotaSegura}.
- Separar por equipe nesta execução: ${separarPorEquipe ? "sim" : "não"}.

CRITÉRIOS:
- Se a regra do usuário não restringir claramente, considere todos os registros elegíveis.
- Se a regra pedir algo impossível, retorne ids vazio e explique no relatorio.
- Nunca ultrapasse o limite por equipe quando separar por equipe estiver ativo.
- Responda com relatório curto em HTML simples.

FORMATO OBRIGATÓRIO:
{"relatorio":"<p>...</p>","ids":[1,2,3]}

REGRA DO USUÁRIO:
${promptSeguro}

REGISTROS:
${JSON.stringify(registrosSanitizados)}
    `.trim();

    const result = await model.generateContent(instrucaoCompleta);
    const response = await result.response;
    const textoGerado = response.text();

    const json = extrairJsonDaResposta(textoGerado);

    if (!Array.isArray(json?.ids)) {
      return NextResponse.json(
        {
          success: false,
          error: "A IA não retornou o campo ids em formato válido.",
        },
        { status: 502 },
      );
    }

    const idsValidos = Array.from(
      new Set(
        json.ids
          .map((id: unknown) => Number(id))
          .filter(
            (id: number) => Number.isInteger(id) && idsPermitidos.has(id),
          ),
      ),
    );

    const relatorioSeguro =
      typeof json?.relatorio === "string" && json.relatorio.trim()
        ? json.relatorio.slice(0, 5000)
        : "<p>Sorteio processado com sucesso.</p>";

    return NextResponse.json({
      success: true,
      relatorio: relatorioSeguro,
      ids: idsValidos,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Falha ao consultar o Gemini.",
      },
      { status: 500 },
    );
  }
}
