"use client";

import { useAuth } from "@/context/AuthContext";
import { ColigadaProvider } from "@/context/ColigadaContext"; // <-- Importamos o nosso Provider
import Header from "@/components/layout/Header";
import TabsBar from "@/components/layout/TabsBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  // 1. TRAVA DE SESSÃO: Impede que a tela carregue "vazia"
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f1f5f9] text-blue-600 font-bold text-sm italic">
        Sincronizando credenciais...
      </div>
    );
  }

  return (
    /* 2. Envolvemos todo o painel com o "Cérebro" das Coligadas */
    <ColigadaProvider>
      <div className="flex flex-col h-screen w-full bg-[#f1f5f9] font-sans overflow-hidden">
        {/* 3. Componente do Header isolado */}
        <Header />

        {/* 4. Componente das Abas isolado */}
        <TabsBar />

        {/* 5. MAIN - 'overflow-auto' obriga o conteúdo a rolar só aqui dentro */}
        <main className="flex-1 overflow-auto bg-white relative">
          {children}
        </main>
      </div>
    </ColigadaProvider>
  );
}
