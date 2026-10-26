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

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const { searchParams } = new URL(req.url);
    const turma = searchParams.get("turma");
    const nm_pessoa = searchParams.get("nm_pessoa");
    const cd_aluno = searchParams.get("cd_aluno");

    let query = supabase
      .from("conselho_historico")
      .select("*")
      .order("data_conselho", { ascending: false });

    if (turma) query = query.eq("turma", turma);
    if (nm_pessoa) query = query.ilike("nm_pessoa", `%${nm_pessoa}%`);
    if (cd_aluno) query = query.eq("cd_aluno", cd_aluno);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const body = await req.json();
    const {
      nm_pessoa,
      cd_aluno,
      turma,
      decisao,
      observacao,
      sede_id,
    } = body;

    if (!nm_pessoa || !cd_aluno || !decisao) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nm_pessoa, cd_aluno, decisao" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("conselho_historico")
      .insert({
        nm_pessoa,
        cd_aluno,
        turma,
        decisao,
        observacao,
        sede_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const body = await req.json();
    const { id, decisao, observacao } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conselho_historico")
      .update({ decisao, observacao })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}