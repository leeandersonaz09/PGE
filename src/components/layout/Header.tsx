"use client";

import { LogOut, User, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext"; // <-- Importamos o contexto

export default function Header() {
  const { logout, user } = useAuth();

  // Puxamos as variáveis mágicas do nosso contexto
  const {
    coligadaAtual,
    coligadasPermitidas,
    trocarColigada,
    loadingColigadas,
  } = useColigada();

  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";
  const userPhoto =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <header className="shrink-0 bg-[#3182ce] text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md z-50">
      <div className="flex items-center gap-3">
        {/* Ocultei o texto longo em telas muito pequenas para não espremer o layout */}
        <span className="font-semibold tracking-tight hidden sm:inline">
          PGE - Portal de Gestão Educacional (2026)
        </span>
        <span className="font-semibold tracking-tight sm:hidden">
          PGE (2026)
        </span>

        {/* ==================================================
            NOVO SELETOR DE COLIGADAS 
        ================================================== */}
        {user && (
          <div className="flex items-center gap-2 border-l border-blue-400 pl-3 ml-1">
            <Building2 size={14} className="text-blue-200 hidden md:block" />

            {loadingColigadas ? (
              <span className="text-blue-200 italic">
                Carregando unidades...
              </span>
            ) : coligadasPermitidas.length > 1 ? (
              // Se tiver mais de uma permissão, mostra o Select
              <select
                value={coligadaAtual?.id || ""}
                onChange={(e) => trocarColigada(Number(e.target.value))}
                className="bg-blue-800 text-white border border-blue-400 rounded px-2 py-1 outline-none cursor-pointer hover:bg-blue-700 transition-colors text-[11px] font-bold"
              >
                {coligadasPermitidas.map((coligada) => (
                  <option key={coligada.id} value={coligada.id}>
                    {coligada.sigla} - {coligada.nome}
                  </option>
                ))}
              </select>
            ) : (
              // Se só tiver uma, mostra apenas o texto travado
              <span className="bg-blue-800 text-white border border-blue-400 rounded px-2 py-1 opacity-80 cursor-default font-bold">
                {coligadaAtual
                  ? `${coligadaAtual.sigla} - ${coligadaAtual.nome}`
                  : "Nenhuma unidade"}
              </span>
            )}
          </div>
        )}
        {/* ================================================== */}

        {user && (
          <div className="flex items-center gap-2 border-l border-blue-400 pl-3 ml-1">
            <span className="italic text-blue-100 hidden md:inline">
              Olá, {userName.split(" ")[0]}
            </span>

            <div className="w-7 h-7 rounded-full border-2 border-blue-300 overflow-hidden bg-blue-800 flex items-center justify-center shadow-inner shrink-0">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt="Perfil"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={14} className="text-blue-200" />
              )}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-1.5 hover:bg-red-500 px-3 py-1 rounded-md font-bold bg-blue-600/30 transition-all border border-transparent hover:border-white/20 shrink-0"
      >
        <LogOut size={14} /> Sair
      </button>
    </header>
  );
}
