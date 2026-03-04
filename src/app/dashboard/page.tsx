"use client";

import { useColigada } from "@/context/ColigadaContext";
import Link from "next/link";
import {
  GraduationCap,
  Stethoscope,
  ClipboardList,
  BarChart,
  FileText,
  ShieldCheck,
  Laptop,
  Archive,
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
    cor: "bg-indigo-600",
  },
  {
    id_modulo: "historico_locacoes",
    nome: "Histórico Locações",
    icon: <Archive size={32} />,
    rota: "/dashboard/historico-locacoes",
    cor: "bg-gray-600",
  },
  {
    id_modulo: "relatorios",
    nome: "Relatórios",
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
  const { modulosPermitidos } = useColigada();

  const modulosVisiveis = modulosConfig.filter((m) =>
    modulosPermitidos.includes(m.id_modulo),
  );

  return (
    <div className="p-10 min-h-full bg-white">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-x-4 gap-y-12">
        {modulosVisiveis.map((mod) => (
          <Link
            key={mod.id_modulo}
            href={mod.rota}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div
              className={`${mod.cor} text-white w-20 h-20 flex items-center justify-center rounded-full shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200 border-[3px] border-white`}
            >
              {mod.icon}
            </div>
            <span className="mt-3 text-[11px] font-medium text-gray-600 text-center leading-tight max-w-[95px] h-8 flex items-start justify-center">
              {mod.nome}
            </span>
          </Link>
        ))}

        {modulosVisiveis.length === 0 && (
          <div className="col-span-full text-center py-20">
            <p className="text-gray-400 italic">
              Unidade identificada, mas nenhum módulo liberado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
