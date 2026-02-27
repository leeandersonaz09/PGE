import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Força o processamento dinâmico e impede cache do Netlify
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
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
              // AJUSTE PARA PRODUÇÃO: Forçamos as flags de segurança para o Netlify
              cookieStore.set({
                name,
                value,
                ...options,
                path: "/", // Garante acesso em todas as rotas
                sameSite: "lax",
                secure: true, // Obrigatório para HTTPS
              });
            } catch (error) {
              // O Middleware lidará com isso se falhar aqui
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({
                name,
                value: "",
                ...options,
                path: "/",
              });
            } catch (error) {
              // O Middleware lidará com isso
            }
          },
        },
      }
    );

    // Troca o código pela sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectUrl = new URL(next, origin);
      // O timestamp ajuda a evitar o cache da página de destino
      redirectUrl.searchParams.set("t", Date.now().toString());

      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  // Se houver erro, volta para a home com o motivo
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
