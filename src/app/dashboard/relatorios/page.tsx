"use client";

import Link from "next/link";
import { FileText, FileBadge, ArrowRight, FileCheck } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <div className="p-8 bg-gray-50 dark:bg-slate-950 min-h-full font-sans text-gray-900">
      <div className="border-b border-gray-300 dark:border-slate-700 pb-4 mb-8">
        <h1 className="text-2xl font-black flex items-center gap-2 text-gray-800 dark:text-slate-200">
          <FileText className="text-blue-600" size={32} /> Central de Relatórios
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Selecione o modelo de documento que deseja gerar ou emitir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD DO HISTÓRICO CSP - FRENTE */}
        <Link
          href="/dashboard/relatorios/historico-csp-frente"
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="bg-blue-50 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileBadge size={24} />
            </div>
            <h2 className="text-lg font-black text-gray-800 dark:text-slate-200 mb-2">
              Histórico CSP - Frente
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium line-clamp-2">
              Emissão da página frontal do histórico escolar padrão Colégio São
              Paulo (Ensino Fundamental e Médio).
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
            Acessar Módulo{" "}
            <ArrowRight
              size={14}
              className="ml-1 group-hover:translate-x-1 transition-transform"
            />
          </div>
        </Link>

        {/* ✅ NOVO CARD: HISTÓRICO CSP - VERSO */}
        <Link
          href="/dashboard/relatorios/historico-csp-verso"
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="bg-indigo-50 dark:bg-indigo-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileCheck size={24} />
            </div>
            <h2 className="text-lg font-black text-gray-800 dark:text-slate-200 mb-2">
              Histórico CSP - Verso
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium line-clamp-2">
              Registros complementares, observações regimentais, código de
              segurança e assinaturas da diretoria.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
            Acessar Módulo{" "}
            <ArrowRight
              size={14}
              className="ml-1 group-hover:translate-x-1 transition-transform"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
