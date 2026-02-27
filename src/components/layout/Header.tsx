"use client";

import { LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { logout, user } = useAuth();

  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";
  const userPhoto =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <header className="shrink-0 bg-[#3182ce] text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md z-50">
      <div className="flex items-center gap-3">
        <span className="font-semibold tracking-tight">
          PGE - Portal de Gestão Educacional (2026)
        </span>

        {user && (
          <div className="flex items-center gap-2 border-l border-blue-400 pl-4 ml-2">
            <span className="italic text-blue-100 hidden sm:inline">
              Olá, {userName.split(" ")[0]}
            </span>

            <div className="w-7 h-7 rounded-full border-2 border-blue-300 overflow-hidden bg-blue-800 flex items-center justify-center shadow-inner">
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
        className="flex items-center gap-1.5 hover:bg-red-500 px-3 py-1 rounded-md font-bold bg-blue-600/30 transition-all border border-transparent hover:border-white/20"
      >
        <LogOut size={14} /> Sair
      </button>
    </header>
  );
}
