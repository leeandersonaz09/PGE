import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Força o processamento dinâmico para evitar que o Netlify versione esta rota
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Redireciona para o dashboard por padrão
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // O Middleware gerencia atualizações de cookies se necessário
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              // O Middleware gerencia remoções de cookies
            }
          },
        },
      }
    );

    // Troca o código pela sessão no lado do servidor
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Adicionado timestamp (?t=) para forçar o navegador a ignorar caches antigos
      const redirectUrl = new URL(next, origin);
      redirectUrl.searchParams.set("t", Date.now().toString());

      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  // Em caso de erro na troca de código, retorna à home com parâmetro de erro
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
