"use client";

import { useColigada } from "@/context/ColigadaContext";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  GraduationCap,
  Stethoscope,
  ClipboardList,
  BarChart,
  FileText,
  Loader2,
  ShieldCheck,
  Lock,
  ShieldAlert,
  Laptop,
  Archive,
  MailCheckIcon,
} from "lucide-react";

const modulosConfig = [
  {
    id_modulo: "alunos",
    nome: "Alunos",
    icon: <GraduationCap size={32} />,
    rota: "/dashboard/alunos",
    cor: "bg-[#ffb74d]",
  },
  {
    id_modulo: "repouso",
    nome: "Encaminhar Sala de Repouso",
    icon: <Stethoscope size={32} />,
    rota: "/dashboard/repouso",
    cor: "bg-[#4db6ac]",
  },
  {
    id_modulo: "historico",
    nome: "Histórico de Atendimentos",
    icon: <ClipboardList size={32} />,
    rota: "/dashboard/historico-atendimentos",
    cor: "bg-[#8b5cf6]",
  },
  {
    id_modulo: "ocorrencias",
    nome: "Registro de Ocorrências",
    icon: <FileText size={32} />,
    rota: "/dashboard/ocorrencias",
    cor: "bg-[#f43f5e]",
  },
  {
    id_modulo: "conselho",
    nome: "Conselho de Classe",
    icon: <BarChart size={32} />,
    rota: "/dashboard/conselho",
    cor: "bg-[#0d9488]",
  },
  {
    id_modulo: "locacoes",
    nome: "Locação Multimídia",
    icon: <Laptop size={32} />,
    rota: "/dashboard/locacoes",
    cor: "bg-indigo-600", // Nova cor para diferenciar
  },
  {
    id_modulo: "historico_locacoes",
    nome: "Histórico de Locações",
    icon: <Archive size={32} />,
    rota: "/dashboard/historico-locacoes",
    cor: "bg-gray-600",
  },
  {
    id_modulo: "mala_direta",
    nome: "Mala Direta",
    icon: <MailCheckIcon size={32} />,
    rota: "/dashboard/mala-direta",
    cor: "bg-blue-600",
  },
  {
    id_modulo: "relatorios",
    nome: "Central de Relatórios",
    icon: <FileText size={32} />,
    rota: "/dashboard/relatorios",
    cor: "bg-blue-600",
  },
  {
    id_modulo: "admin",
    nome: "Administração",
    icon: <ShieldCheck size={32} />,
    rota: "/dashboard/admin",
    cor: "bg-gray-700",
  },
];

export default function DashboardPage() {
  const { modulosPermitidos, coligadasPermitidas, loadingColigadas } =
    useColigada();

  // ✅ ESTA É A CHAVE: Garante que a renderização condicional não quebre o DOM
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Não renderiza nada até o navegador estar pronto

  if (loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full text-blue-600 dark:text-blue-400 font-bold italic">
        <Loader2 className="animate-spin mr-2" size={20} /> Sincronizando
        acessos...
      </div>
    );
  }

  // TRAVA DE SEGURANÇA ORIGINAL (Visual que você quer)
  if (!coligadasPermitidas || coligadasPermitidas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 p-10 text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Acesso Restrito
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
          Seu perfil ainda não possui permissões vinculadas a nenhuma unidade
          educacional.
        </p>
        <div className="mt-8 p-4 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-md text-sm text-blue-800 dark:text-blue-300 flex items-center gap-3">
          <ShieldAlert className="text-blue-500 dark:text-blue-400" size={20} />
          <span className="text-left">
            Entre em contato com o <b>CPD</b> para liberar seu acesso às sedes e
            módulos.
          </span>
        </div>
      </div>
    );
  }

  const modulosVisiveis = modulosConfig.filter((m) =>
    modulosPermitidos.includes(m.id_modulo),
  );

  return (
    <div className="p-10 min-h-full bg-white dark:bg-slate-900">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-x-4 gap-y-12">
        {modulosVisiveis.map((mod) => (
          <Link
            key={mod.id_modulo}
            href={mod.rota}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div
              className={`${mod.cor} text-white w-20 h-20 flex items-center justify-center rounded-full shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200 border-[3px] border-white dark:border-slate-800`}
            >
              {mod.icon}
            </div>
            <span className="mt-3 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight max-w-[95px] h-8 flex items-start justify-center">
              {mod.nome}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
