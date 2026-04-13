import Link from "next/link";
import { useColigada } from "@/context/ColigadaContext";

interface ModuleLinkProps {
  id_modulo: string;
  nome: string;
  icon: JSX.Element;
  rota: string;
  cor: string;
}

export function ModuleLink({ id_modulo, nome, icon, rota, cor }: ModuleLinkProps) {
  const { modulosPermitidos } = useColigada();

  // Se o módulo não estiver na lista de permitidos, não renderiza nada
  if (!modulosPermitidos.includes(id_modulo)) {
    return null;
  }

  return (
    <Link
      key={id_modulo}
      href={rota}
      className="flex flex-col items-center group cursor-pointer"
    >
      <div
        className={`${cor} text-white w-20 h-20 flex items-center justify-center rounded-full shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200 border-[3px] border-white dark:border-slate-800`}
      >
        {icon}
      </div>
      <span className="mt-3 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight max-w-[95px] h-8 flex items-start justify-center">
        {nome}
      </span>
    </Link>
  );
}