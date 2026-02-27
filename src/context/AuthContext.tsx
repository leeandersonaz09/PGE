"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            detectSessionInUrl: false, // O route.ts cuidará disso no servidor
            persistSession: true,
            autoRefreshToken: true,
            flowType: "pkce", // Força o fluxo de segurança para evitar o erro 404
          },
        }
      ),
    []
  );

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const email = session.user.email;
          const dominiosAutorizados = ["cspba.com.br", "anchietaba.com.br"];
          const dominioUsuario = email?.split("@")[1];

          if (dominioUsuario && dominiosAutorizados.includes(dominioUsuario)) {
            setUser(session.user);
          }
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const email = session.user.email;
        const dominiosAutorizados = ["cspba.com.br", "anchietaba.com.br"];
        const dominioUsuario = email?.split("@")[1];

        if (dominioUsuario && dominiosAutorizados.includes(dominioUsuario)) {
          setUser(session.user);
        } else {
          await supabase.auth.signOut();
          setUser(null);
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
      const callbackURL = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackURL,
          skipBrowserRedirect: false, // Garante que o fluxo de redirecionamento ocorra após o login
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
            hd: "cspba.com.br", // Restrição de domínio sugerida ao Google
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erro no login:", error);
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
