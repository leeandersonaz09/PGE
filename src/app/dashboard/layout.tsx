"use client";

import { useAuth } from "@/context/AuthContext";
import { ColigadaProvider, useColigada } from "@/context/ColigadaContext";
import Header from "@/components/layout/Header";
import TabsBar from "@/components/layout/TabsBar";
import { useState, useEffect } from "react";
import { Lock, ShieldAlert, Loader2 } from "lucide-react";

// Componente Interno para gerenciar o conteúdo e a trava de segurança
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { coligadaAtual, loadingColigadas } = useColigada();
  const [mounted, setMounted] = useState(false);

  // ✅ CORREÇÃO PARA O ERRO DA JOSICLEIDE:
  // Garante que o React não tente mexer no DOM antes da hora
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (loadingColigadas) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f1f5f9] text-blue-600 font-bold text-sm italic">
        <Loader2 className="animate-spin mr-2" size={20} /> Sincronizando
        unidades...
      </div>
    );
  }

  // ✅ TRAVA DE SEGURANÇA COM O SEU VISUAL ORIGINAL
  if (!coligadaAtual) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[#f1f5f9] p-4 text-center">
        <div className="flex flex-col items-center justify-center bg-white p-12 rounded-[2rem] shadow-xl max-w-md border border-gray-100">
          <div className="bg-red-50 p-6 rounded-full mb-6">
            <Lock size={48} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Você não possui permissão para acessar nenhuma unidade no momento.
          </p>
          <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-xl text-left border border-amber-100">
            <ShieldAlert className="text-amber-600 shrink-0" size={20} />
            <span className="text-amber-900 text-[11px] font-semibold leading-tight">
              Contate o <b>CPD</b> para liberar seu acesso às sedes e módulos.
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Tentar carregar novamente
          </button>
        </div>
      </div>
    );
  }

  // Se tiver sede, mostra o sistema normal
  return (
    <div className="flex flex-col h-screen w-full bg-[#f1f5f9] font-sans overflow-hidden">
      <Header />
      <TabsBar />
      <main className="flex-1 overflow-auto bg-white relative">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    if (!loading) setInitialCheckDone(true);
  }, [loading]);

  if (!initialCheckDone && loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f1f5f9] text-blue-600 font-bold text-sm italic">
        Sincronizando credenciais...
      </div>
    );
  }

  return (
    <ColigadaProvider>
      <DashboardContent>{children}</DashboardContent>
    </ColigadaProvider>
  );
}
