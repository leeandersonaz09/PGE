"use client";
import Link from "next/link";
import { GraduationCap, Stethoscope, ClipboardList } from "lucide-react";

// Lista simplificada com apenas os dois módulos solicitados
const modulos = [
  {
    nome: "Alunos",
    icon: <GraduationCap size={32} />,
    rota: "/dashboard/alunos",
    cor: "bg-[#ffb74d]",
  },
  {
    nome: "Encaminhar Sala de Repouso",
    icon: <Stethoscope size={32} />,
    rota: "/dashboard/repouso",
    cor: "bg-[#4db6ac]",
  },
  {
    nome: "Histórico de Atendimentos",
    icon: <ClipboardList size={32} />,
    rota: "/dashboard/historico",
    cor: "bg-[#8b5cf6]", // Uma cor roxa legal para diferenciar dos outros
  },
];

export default function DashboardPage() {
  return (
    <div className="p-10 min-h-full bg-white">
      {/* Grade simplificada para os dois ícones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-x-4 gap-y-12">
        {modulos.map((mod) => (
          <Link
            key={mod.nome}
            href={mod.rota}
            className="flex flex-col items-center group cursor-pointer"
          >
            {/* Ícone Redondo com as cores e bordas originais */}
            <div
              className={`${mod.cor} text-white w-20 h-20 flex items-center justify-center rounded-full shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200 border-[3px] border-white`}
            >
              {mod.icon}
            </div>
            {/* Legenda compacta de 11px */}
            <span className="mt-3 text-[11px] font-medium text-gray-600 text-center leading-tight max-w-[95px] h-8 flex items-start justify-center">
              {mod.nome}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
