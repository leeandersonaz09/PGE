"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Configuração estável do cliente Supabase para ambiente SSR (Next.js 16)
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            // Importante: Impede que o cliente tente processar o código da URL,
            // deixando essa tarefa exclusiva para o seu arquivo /auth/callback/route.ts
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: true,
          },
        }
      ),
    []
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const email = session.user.email;
        const dominiosAutorizados = ["cspba.com.br", "anchietaba.com.br"];
        const dominioUsuario = email?.split("@")[1];

        // Trava de segurança por domínio institucional
        if (dominioUsuario && dominiosAutorizados.includes(dominioUsuario)) {
          setUser(session.user);
        } else {
          // Expulsa usuários fora do domínio do colégio
          await supabase.auth.signOut();
          setUser(null);
          alert(
            "Acesso Negado: Utilize apenas seu e-mail institucional (@cspba.com.br ou @anchietaba.com.br)."
          );
          router.push("/");
        }
      } else {
        setUser(null);
        if (event === "SIGNED_OUT") {
          router.push("/");
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const loginGoogle = async () => {
    try {
      // Forçamos a URL de produção para evitar que o código fique "preso" na URL do Dashboard
      const productionURL = "https://pgegea.netlify.app/auth/callback";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: productionURL,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
            hd: "cspba.com.br",
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao conectar com o Google.");
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginGoogle, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
