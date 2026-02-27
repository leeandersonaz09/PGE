"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Inicialização do cliente Supabase com travas de segurança para produção
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            // ESSENCIAL: Impede que o navegador tente trocar o código da URL.
            // Isso evita o erro 404 PKCE e o conflito com o seu route.ts
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: true,
          },
        }
      ),
    []
  );

  useEffect(() => {
    // Escuta as mudanças de estado (o route.ts vai gerar o evento de login via cookie)
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
          // Bloqueio imediato para e-mails não autorizados
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
      // Forçamos o redirecionamento direto para o seu "porteiro" no servidor
      const callbackURL = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackURL,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
            hd: "cspba.com.br", // Sugestão de domínio para o Google
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
