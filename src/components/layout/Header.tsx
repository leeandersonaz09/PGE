"use client";

import { useState, useEffect } from "react";
import { LogOut, User, Building2, Sun, Moon } from "lucide-react"; // ✅ Importados Sun e Moon
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
import { useTheme } from "next-themes"; // ✅ Importado o hook do next-themes

export default function Header() {
  const { logout, user } = useAuth();
  const {
    coligadaAtual,
    coligadasPermitidas,
    trocarColigada,
    loadingColigadas,
  } = useColigada();

  // ✅ LÓGICA DO TEMA (DARK MODE) - USANDO resolvedTheme
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita erro de hidratação (Hydration Mismatch) esperando o componente montar no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";
  const userPhoto =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <header className="shrink-0 bg-[#3182ce] dark:bg-slate-900 text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md z-50 gap-2 transition-colors duration-300">
      {/* LADO ESQUERDO: LOGO E SELETOR */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 shrink-0">
          <span className="font-black tracking-tighter text-blue-100">PGE</span>
          <span className="font-medium opacity-80 hidden md:inline">
            | Gestão Educacional
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-2 border-l border-blue-400/50 dark:border-slate-700 pl-2 ml-1 min-w-0">
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
                    className="bg-blue-800 dark:bg-slate-800 text-white border border-blue-400 dark:border-slate-600 rounded px-1 py-0.5 outline-none cursor-pointer hover:bg-blue-700 dark:hover:bg-slate-700 transition-all text-[10px] font-bold w-full truncate"
                  >
                    {coligadasPermitidas.map((col) => (
                      <option key={col.id} value={col.id}>
                        {/* No select mostramos a sigla primeiro para facilitar no mobile */}
                        {col.sigla} - {col.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="bg-blue-900/50 dark:bg-slate-800 px-2 py-0.5 rounded font-bold truncate block">
                    {coligadaAtual?.sigla || "Unidade"}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LADO DIREITO: TEMA, USUÁRIO E SAIR */}
      <div className="flex items-center gap-3 shrink-0">
        {/* ✅ BOTÃO MÁGICO DO TEMA ESCURO ATUALIZADO */}
        {mounted && (
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-all text-yellow-300 dark:text-blue-300 active:scale-90 flex-shrink-0"
            title={
              resolvedTheme === "dark"
                ? "Mudar para Claro"
                : "Mudar para Escuro"
            }
          >
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2 border-l border-blue-400/50 dark:border-slate-700 pl-3">
            {/* Nome oculto no mobile, aparece apenas do 'lg' pra cima */}
            <span className="italic text-blue-100 hidden lg:inline max-w-[80px] truncate">
              {userName.split(" ")[0]}
            </span>

            <div className="w-7 h-7 rounded-full border-2 border-blue-300 dark:border-slate-600 overflow-hidden bg-blue-800 dark:bg-slate-800 flex items-center justify-center shadow-inner shrink-0">
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

        {/* BOTÃO SAIR */}
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
