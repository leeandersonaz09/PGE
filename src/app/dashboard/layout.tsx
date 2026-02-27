"use client";

import { useRouter, usePathname } from "next/navigation";
import { X, LogOut, User, Home, GraduationCap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, loading } = useAuth();

  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";

  const userPhoto =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="flex flex-col h-screen bg-[#f1f5f9] font-sans">
      {/* HEADER SUPERIOR */}
      <header className="bg-[#3182ce] text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md z-50">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">
            PGE - Portal de Gestão Educacional (2026)
          </span>

          {!loading && user && (
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

      {/* TABS - REMOVIDO O BLOQUEIO DE USER PARA NUNCA DESAPARECEREM */}
      <div className="bg-[#cbd5e0] flex items-end px-2 h-9 border-b border-gray-400 gap-1">
        {/* INÍCIO - Sempre estruturalmente presente no HTML */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold transition-all ${
            pathname === "/dashboard" || pathname === "/dashboard/"
              ? "bg-white text-gray-800 border-x border-t border-gray-400"
              : "bg-gray-300 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Home size={14} /> INÍCIO
        </Link>

        {/* ALUNOS - Depende estritamente do endereço na barra do navegador */}
        {pathname?.includes("/alunos") && (
          <div className="flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold shadow-sm relative bg-white text-gray-800 border-x border-t border-gray-400">
            <GraduationCap size={14} className="text-blue-600" />
            ALUNOS
            <button
              onClick={() => router.push("/dashboard")}
              className="ml-2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
              title="Fechar módulo"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-hidden bg-white">{children}</main>
    </div>
  );
}
