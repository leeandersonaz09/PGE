"use client";

import { useAuth } from "@/context/AuthContext";
import { ColigadaProvider } from "@/context/ColigadaContext";
import Header from "@/components/layout/Header";
import TabsBar from "@/components/layout/TabsBar";
import { useState, useEffect } from "react";
// ✅ 1. Importando o nosso assistente PGE criado no passo anterior
import { ChatBot } from "@/components/ChatBot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Controle para evitar que o "Sincronizando" apareça toda hora
  useEffect(() => {
    if (!loading) {
      setInitialCheckDone(true);
    }
  }, [loading]);

  // 1. TRAVA DE SESSÃO: Só barra a tela no PRIMEIRO carregamento
  if (!initialCheckDone && loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f1f5f9] dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold text-sm italic">
        Sincronizando credenciais...
      </div>
    );
  }

  return (
    <ColigadaProvider>
      <div className="flex flex-col h-screen w-full bg-[#f1f5f9] dark:bg-slate-950 font-sans overflow-hidden">
        <Header />
        <TabsBar />
        {/* O 'main' nunca mais será desmontado se o loading piscar */}
        <main className="flex-1 overflow-auto bg-white dark:bg-slate-900 relative">
          {children}

          {/* ✅ 2. O ChatBot é injetado aqui! Como ele é 'fixed' e 'z-50', ele flutua em todas as páginas */}
          <ChatBot />
        </main>
      </div>
    </ColigadaProvider>
  );
}
