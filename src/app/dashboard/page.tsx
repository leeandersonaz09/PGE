"use client";

import { useColigada } from "@/context/ColigadaContext";
import Link from "next/link";
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

  if (loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full text-blue-600 font-bold italic">
        <Loader2 className="animate-spin mr-2" size={20} /> Sincronizando
        acessos...
      </div>
    );
  }

  // TRAVA DE SEGURANÇA: Se não houver NENHUMA sede liberada no banco de dados
  if (!coligadasPermitidas || coligadasPermitidas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white p-10 text-center">
        <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-gray-300">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
        <p className="text-gray-500 max-w-sm mt-2">
          Seu perfil ainda não possui permissões vinculadas a nenhuma unidade
          educacional.
        </p>
        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex items-center gap-3">
          <ShieldAlert className="text-blue-500" size={20} />
          <span className="text-left">
            Entre em contato com o <b>CPD</b> para liberar seu acesso às sedes e
            módulos.
          </span>
        </div>
      </div>
    );
  }

  // Se houver sedes, filtra os módulos normalmente
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
              Sede identificada, mas nenhum módulo liberado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
