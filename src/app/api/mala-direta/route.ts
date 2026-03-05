import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { contatos, assunto, mensagem, tags, anexo } = await request.json();

    // 1. Configura o "Carteiro" (Nodemailer) com os dados do seu .env
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true para porta 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let enviados = 0;
    let erros = 0;
    let mensagensDeErro: string[] = []; 

    // 2. Loop de envio: Passa por cada contato da planilha
    for (const contato of contatos) {
      // Tenta achar qual é a coluna do e-mail
      const emailDestino = contato.email || contato.Email || contato[tags[0]];
      
      if (!emailDestino) {
        erros++;
        mensagensDeErro.push("E-mail de destino não encontrado na linha.");
        continue;
      }

      // 3. Substitui as {{Tags}} pelos dados da pessoa
      const assuntoPersonalizado = tags.reduce(
        (txt: string, tag: string) => txt.replace(new RegExp(`{{${tag}}}`, "g"), contato[tag] || ""),
        assunto
      );
      
      const mensagemPersonalizada = tags.reduce(
        // Adicionamos a tag <strong> em volta da variável!
        (txt: string, tag: string) => txt.replace(new RegExp(`{{${tag}}}`, "g"), `<strong>${contato[tag] || ""}</strong>`),
        mensagem
      );

      // 4. Dispara o e-mail
    try {
        await transporter.sendMail({
          from: `"Não Responder" <${process.env.EMAIL_USER}>`,
          to: emailDestino,
          subject: assuntoPersonalizado,
          html: mensagemPersonalizada, // <-- MUDOU DE 'text' PARA 'html'
          attachments: anexo ? [
            {
              filename: anexo.nome,
              content: anexo.conteudo,
              encoding: "base64",
            }
          ] : []
        });
        enviados++;
      } catch (err: any) {
        console.error(`Erro ao enviar para ${emailDestino}:`, err);
        erros++;
        mensagensDeErro.push(`Falha para ${emailDestino}: ${err.message}`); 
      }
    }

    // 5. Retorna o resultado para a tela
    return NextResponse.json({ success: true, enviados, erros, detalhes: mensagensDeErro });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}