import { supabase } from "@/lib/supabase";

export async function registrarLog(usuarioNome: string, acao: string, detalhes: string) {
  try {
    await supabase.from("logs_auditoria").insert([
      {
        usuario_nome: usuarioNome,
        acao: acao,
        detalhes: detalhes,
      }
    ]);
  } catch (error) {
    console.error("Falha ao registrar log de auditoria:", error);
  }
}