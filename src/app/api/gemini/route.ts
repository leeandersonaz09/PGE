// Adicione esta linha no topo do arquivo
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { prompt, textoAtual } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave da API não configurada" },
        { status: 500 },
      );
    }

    // Inicializa o Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Monta a instrução para o Gemini
    const instrucaoCompleta = `
      Você é um assistente de comunicação de um colégio (Colégio São Paulo).
      O usuário pediu: "${prompt}".
      Texto atual no editor (pode estar vazio): "${textoAtual}".
      
      Regras:
      1. Se o usuário pediu para corrigir o texto atual, apenas devolva o texto corrigido.
      2. Se pediu para criar algo novo, crie com tom profissional, acolhedor e claro.
      3. IMPORTANTE: Retorne APENAS o texto formatado em HTML básico para ser inserido num editor Rich Text (use <p>, <strong>, <br>). 
      4. NUNCA use blocos de código Markdown (como \`\`\`html), apenas as tags puras.
    `;

    const result = await model.generateContent(instrucaoCompleta);
    const response = await result.response;
    const textoGerado = response.text();

    return NextResponse.json({ success: true, text: textoGerado });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
