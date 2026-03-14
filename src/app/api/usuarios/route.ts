import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: Request) {
  try {
    const { userIdParaDeletar, adminId } = await req.json();

    if (!userIdParaDeletar || !adminId) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // 1. Inicializa o Supabase com poderes de Super Administrador (Ignora RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. CHECAGEM DE SEGURANÇA (A palavra final do banco)
    // Verifica no banco se o usuário que fez o pedido é realmente um ADMIN
    const { data: adminData } = await supabaseAdmin
      .from("permissoes_usuarios")
      .select("is_admin")
      .eq("user_id", adminId)
      .single();

    if (!adminData?.is_admin) {
      return NextResponse.json(
        { error: "Acesso Negado. Tentativa de invasão bloqueada." },
        { status: 403 }
      );
    }

    // 3. Limpa as permissões do usuário
    await supabaseAdmin.from("permissoes_usuarios").delete().eq("user_id", userIdParaDeletar);

    // 4. Limpa os dados públicos do usuário
    await supabaseAdmin.from("usuarios").delete().eq("id", userIdParaDeletar);

    // 5. Exclui a conta de Autenticação (Login) definitivamente
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdParaDeletar);

    if (authError) throw authError;

    return NextResponse.json({ success: true, message: "Usuário apagado permanentemente." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}