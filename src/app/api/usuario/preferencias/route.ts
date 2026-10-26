import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

// GET - Ler preferências do usuário logado
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Buscar preferências do usuário
    const { data, error } = await supabase
      .from("usuario_preferencias")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = "No rows returned"
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Retornar cor atual (padrão se não existir)
    const corPadrao = "#0d9488";
    const cor = data?.cor_conselho || corPadrao;

    return NextResponse.json({ cor, usuarioId: user.id });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST/PUT - Salvar/Atualizar preferências do usuário
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { cor } = body;

    if (!cor || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(cor)) {
      return NextResponse.json(
        { error: "Cor inválida. Use formato hex: #RRGGBB" },
        { status: 400 }
      );
    }

    // Verificar se já existem preferências
    const { data: existentes, error: checkError } = await supabase
      .from("usuario_preferencias")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let result;

    if (existentes) {
      // Atualizar existentes
      const { data, error } = await supabase
        .from("usuario_preferencias")
        .update({ cor_conselho: cor, atualizado_em: new Date().toISOString() })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      // Inserir novos
      const { data, error } = await supabase
        .from("usuario_preferencias")
        .insert({
          user_id: user.id,
          cor_conselho: cor,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}