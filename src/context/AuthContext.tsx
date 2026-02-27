"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
        router.push("/"); // Redireciona para login se não estiver logado
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

const loginGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken(); // 1. Pega o token real do Firebase
    const userEmail = result.user.email || "";

    const dominiosAutorizados = ["@cspba.com.br", "@anchietaba.com.br"];
    const isAutorizado = dominiosAutorizados.some((d) => userEmail.endsWith(d));

    if (isAutorizado) {
      // 2. Salva o Token real no cookie (Vulnerável a JS, mas necessário para o Middleware ler)
      document.cookie = `__session=${idToken}; path=/; max-age=3600; SameSite=Lax`;
      router.push("/dashboard");
    } else {
      await signOut(auth);
      alert("Acesso negado!");
    }
  } catch (error) {
    console.error(error);
  }
};
const logout = async () => {
  try {
    await signOut(auth);
    // Apaga o cookie definindo uma data de validade passada
    document.cookie =
      "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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