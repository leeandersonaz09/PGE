"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  UploadCloud,
  Laptop,
  Building2,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Importando os submódulos
import GestaoUsuarios from "./GestaoUsuarios";
import SincronizacaoBase from "./SincronizacaoBase";
import GestaoEquipamentos from "./GestaoEquipamentos";
import GestaoSedes from "./GestaoSedes";
import LogsAuditoria from "./LogsAuditoria";

export default function AdminPage() {
  const [abaAtiva, setAbaAtiva] = useState<
    "usuarios" | "sincronizacao" | "equipamentos" | "sedes" | "logs"
  >("usuarios");
  const [sedes, setSedes] = useState<any[]>([]);

  // Carrega as sedes e passa para os filhos (agora também recarrega se o GestaoSedes mudar algo)
  const carregarSedes = async () => {
    const { data } = await supabase.from("sedes").select("*").order("nome");
    if (data) setSedes(data);
  };

  useEffect(() => {
    carregarSedes();
  }, []);

  const menuItems = [
    { id: "usuarios", label: "Gestão de Acessos", icon: Users },
    { id: "sedes", label: "Unidades (Sedes)", icon: Building2 },
    { id: "sincronizacao", label: "Sincronizar Base", icon: UploadCloud },
    { id: "equipamentos", label: "Dispositivos", icon: Laptop },
    { id: "logs", label: "Auditoria e Logs", icon: ClipboardList },
  ];

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-slate-950 min-h-full flex flex-col text-slate-900 font-sans">
      <div className="flex justify-between items-center border-b dark:border-slate-800 pb-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-slate-800 dark:text-slate-200 uppercase tracking-tight">
          <ShieldCheck className="text-red-600 shrink-0" size={28} />
          <span>Configurações do Sistema</span>
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* MENU LATERAL */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id as any)}
                className={`flex items-center gap-3 p-4 rounded-xl font-bold text-sm transition-all duration-200 text-left ${
                  ativo
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-100"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.02] border border-slate-200 dark:border-slate-800"
                }`}
              >
                <Icon
                  size={18}
                  className={ativo ? "text-white" : "text-slate-400"}
                />
                {item.label}
              </button>
            );
          })}
        </aside>

        {/* ÁREA DE CONTEÚDO */}
        <main className="flex-1 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in slide-in-from-right-4 duration-300 min-h-[500px]">
          {abaAtiva === "usuarios" && <GestaoUsuarios sedes={sedes} />}
          {abaAtiva === "sincronizacao" && <SincronizacaoBase sedes={sedes} />}
          {abaAtiva === "equipamentos" && <GestaoEquipamentos sedes={sedes} />}
          {abaAtiva === "sedes" && (
            <GestaoSedes sedes={sedes} recarregar={carregarSedes} />
          )}
          {abaAtiva === "logs" && <LogsAuditoria />}
        </main>
      </div>
    </div>
  );
}
