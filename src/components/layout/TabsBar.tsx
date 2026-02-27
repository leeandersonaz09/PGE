"use client";

import { useRouter, usePathname } from "next/navigation";
import { X, Home, GraduationCap, Stethoscope } from "lucide-react";
import Link from "next/link";

export default function TabsBar() {
  const router = useRouter();
  // Se o Next.js demorar um milissegundo para ler a rota, assumimos texto vazio para não quebrar
  const pathname = usePathname() || "";

  // 1. Verificações limpas de qual aba deve estar visível
  const isInicio = pathname === "/dashboard" || pathname === "/dashboard/";
  const isAlunos = pathname.includes("/alunos");
  const isRepouso = pathname.includes("/repouso");

  return (
    // 2. O 'shrink-0' é o nosso escudo de proteção contra o Flexbox
    <div className="shrink-0 bg-[#cbd5e0] flex items-end px-2 h-9 border-b border-gray-400 gap-1 w-full overflow-x-auto">
      {/* =========================================
          ABA 1: INÍCIO (Sempre visível)
      ========================================= */}
      <Link
        href="/dashboard"
        className={`flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold transition-all ${
          isInicio
            ? "bg-white text-gray-800 border-x border-t border-gray-400 z-10"
            : "bg-gray-300 text-gray-600 hover:bg-gray-200 border-x border-t border-transparent"
        }`}
      >
        <Home size={14} /> INÍCIO
      </Link>

      {/* =========================================
          ABA 2: ALUNOS (Aparece na rota de alunos)
      ========================================= */}
      {isAlunos && (
        <div className="flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold shadow-sm relative bg-white text-gray-800 border-x border-t border-gray-400 z-10">
          <GraduationCap size={14} className="text-[#ffb74d]" />
          ALUNOS
          <button
            onClick={() => router.push("/dashboard")}
            className="ml-2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
            title="Fechar aba"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* =========================================
          ABA 3: SALA DE REPOUSO (Nova aba!)
      ========================================= */}
      {isRepouso && (
        <div className="flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold shadow-sm relative bg-white text-gray-800 border-x border-t border-gray-400 z-10">
          <Stethoscope size={14} className="text-[#4db6ac]" />
          SALA DE REPOUSO
          <button
            onClick={() => router.push("/dashboard")}
            className="ml-2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
            title="Fechar aba"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
