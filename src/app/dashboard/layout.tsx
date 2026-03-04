"use client";

import { useAuth } from "@/context/AuthContext";
import { ColigadaProvider, useColigada } from "@/context/ColigadaContext";
import Header from "@/components/layout/Header";
import TabsBar from "@/components/layout/TabsBar";
import { useState, useEffect } from "react";
import { AlertTriangle, Lock } from "lucide-react";

// ✅ COMPONENTE DE SEGURANÇA INTERNO
// Ele lida com a falta de sedes sem quebrar o layout principal
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { coligadaAtual, loadingColigadas } = useColigada();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evita erros de hidratação (SSR vs Client)
  if (!mounted) return null;

  // 2. ✅ TRAVA: Se o usuário logou mas não tem NENHUMA sede vinculada
  if (!coligadaAtual) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-100 p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-red-100 max-w-md">
          <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">
            Acesso Restrito
          </h1>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            Seu perfil foi identificado no sistema, mas você ainda não possui{" "}
            <strong className="text-red-600">unidades (sedes)</strong>{" "}
            vinculadas.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              O que fazer agora?
            </p>
            <div className="bg-amber-50 p-4 rounded-xl text-left flex gap-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={18} />
              <p className="text-amber-800 text-[11px] leading-tight font-semibold">
                Solicite ao administrador do CPD a liberação das suas coligadas
                no módulo de permissões.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 text-xs font-bold text-blue-600 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // 3. Usuário OK (com sede): Renderiza o Dashboard normal
  return (
    <div className="flex flex-col h-screen w-full bg-[#f1f5f9] font-sans overflow-hidden">
      <Header />
      <TabsBar />
      <main className="flex-1 overflow-auto bg-white relative">{children}</main>
    </div>
  );
}

// ✅ EXPORTAÇÃO DO LAYOUT PRINCIPAL
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    if (!loading) {
      setInitialCheckDone(true);
    }
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
