"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Inicialização estável com a trava para erro 404 (PKCE)
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            detectSessionInUrl: false, // ESSENCIAL: Evita que o cliente tente processar o código 2x
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

        // --- TRAVA DE SEGURANÇA POR DOMÍNIO ---
        if (dominioUsuario && dominiosAutorizados.includes(dominioUsuario)) {
          setUser(session.user);
        } else {
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Garante o fluxo para o seu arquivo /auth/callback/route.ts
          redirectTo: `${window.location.origin}/auth/callback`,
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
