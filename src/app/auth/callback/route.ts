import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    // No Next.js mais recente, aguardamos o cookieStore
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
            // Usamos try/catch porque middlewares às vezes tentam setar cookies em rotas protegidas
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Se falhar aqui, o AuthContext no cliente resolverá a sessão
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              // Silencia erros de mutação de cookie em Server Actions/Routes
            }
          },
        },
      }
    );

    // Troca o código de autorização pela sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Erro ao trocar código por sessão:", error.message);
      return NextResponse.redirect(`${origin}/?error=auth_failed`);
    }
  }

  // Retorno bem-sucedido para o Dashboard em Salvador
  return NextResponse.redirect(`${origin}/dashboard`);
}
