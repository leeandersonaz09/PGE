import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
// ✅ AGORA SIM! Importando do jeito que o PGE trabalha:
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Mensagens inválidas." },
        { status: 400 },
      );
    }

    const userMessage = messages[messages.length - 1].content;

    // Tenta pegar o usuário logado para o log de auditoria
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ========================================================================
    // 🔥 CONTEXTO ESPECIALISTA DO PGE
    // ========================================================================
    const pgeSystemPrompt = `
      Você é o "CPD-Bot", o Assistente Virtual Inteligente e Especialista oficial do **Portal PGE (Portal de Gestão Escolar) do Colégio São Paulo**.

      SUA MISSÃO: Ajudar funcionários (professores, coordenadores, secretários) a navegarem e utilizarem o Portal PGE com eficiência.

      ### 1. MÓDULO ALUNOS (/dashboard/alunos)
      * Onde gerenciar o ciclo de vida do estudante (matrículas, edição, boletim).
      
      ### 2. MÓDULO TURMAS (/dashboard/turmas)
      * Organização das séries e turmas da escola.
      
      ### 3. MÓDULO PROFESSORES (/dashboard/professores)
      * Gestão do corpo docente e vínculo com turmas.
      
      ### 4. MÓDULO FINANCEIRO (/dashboard/financeiro)
      * Controle de parcelas, status de adimplente/inadimplente e simulação de boletos.
      
      ### 5. MÓDULO OCORRÊNCIAS (/dashboard/ocorrencias)
      * Registro disciplinar (indisciplina, atrasos, elogios) vinculado ao aluno.
      
      ### 6. MÓDULO SORTEIO PRO v2 (/dashboard/sorteio)
      * Sorteio criptográfico auditável. Explique que o usuário pode fazer o "Sorteio Padrão" filtrando manualmente ou usar a "Lógica via Gemini" digitando a regra na caixa de texto. O resultado sai em PDF por equipe.

      REGRAS: Seja direto. Use o nome exato dos botões. Não invente dados de alunos, apenas oriente como usar a ferramenta. Responda em português do Brasil de forma profissional e amigável.
    `.trim();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: pgeSystemPrompt }] },
        {
          role: "model",
          parts: [
            {
              text: "Entendido. Sou o CPD-Bot, pronto para guiar os usuários pelo Portal PGE.",
            },
          ],
        },
        ...messages.map((m: any) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      ],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
    });

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    // ✅ LOG DE AUDITORIA NO SUPABASE
    // Se você já tiver a tabela 'logs_auditoria' criada no banco, isso vai salvar a conversa!
    if (user) {
      try {
        await supabase.from("logs_auditoria").insert({
          usuario_nome: user.email || "Usuário PGE",
          acao: "Consulta CPD-Bot",
          detalhes: `Pergunta: ${userMessage} | Assistente respondeu com sucesso.`,
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
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
