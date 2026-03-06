"use client";

import { LogOut, User, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";

export default function Header() {
  const { logout, user } = useAuth();
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
    <header className="shrink-0 bg-[#3182ce] text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md z-50 gap-2">
      {/* LADO ESQUERDO: LOGO E SELETOR */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 shrink-0">
          <span className="font-black tracking-tighter text-blue-100">PGE</span>
          <span className="font-medium opacity-80 hidden md:inline">
            | Gestão Educacional
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-2 border-l border-blue-400/50 pl-2 ml-1 min-w-0">
            <Building2
              size={12}
              className="text-blue-200 hidden xs:block shrink-0"
            />

            {loadingColigadas ? (
              <span className="text-blue-200 animate-pulse">...</span>
            ) : (
              <div className="max-w-[120px] sm:max-w-[200px]">
                {coligadasPermitidas.length > 1 ? (
                  <select
                    value={coligadaAtual?.id || ""}
                    onChange={(e) => trocarColigada(Number(e.target.value))}
                    className="bg-blue-800 text-white border border-blue-400 rounded px-1 py-0.5 outline-none cursor-pointer hover:bg-blue-700 transition-all text-[10px] font-bold w-full truncate"
                  >
                    {coligadasPermitidas.map((col) => (
                      <option key={col.id} value={col.id}>
                        {/* No select mostramos a sigla primeiro para facilitar no mobile */}
                        {col.sigla} - {col.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="bg-blue-900/50 px-2 py-0.5 rounded font-bold truncate block">
                    {coligadaAtual?.sigla || "Unidade"}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LADO DIREITO: USUÁRIO E SAIR */}
      <div className="flex items-center gap-3 shrink-0">
        {user && (
          <div className="flex items-center gap-2 border-l border-blue-400/50 pl-3">
            {/* Nome oculto no mobile, aparece apenas do 'lg' pra cima */}
            <span className="italic text-blue-100 hidden lg:inline max-w-[80px] truncate">
              {userName.split(" ")[0]}
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

        {/* BOTÃO SAIR: Texto some no mobile (sm:hidden), ícone permanece */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 px-2 sm:px-3 py-1.5 rounded-lg font-black uppercase text-[10px] transition-all border border-red-400/20 shadow-lg active:scale-95 shrink-0"
          title="Sair do Sistema"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
