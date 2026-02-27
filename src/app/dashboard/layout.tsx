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
  // Se o pathname for undefined no primeiro milissegundo, assume string vazia
  const pathname = usePathname() || "";
  const { logout, user } = useAuth();

  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";
  const userPhoto =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const isInicio = pathname === "/dashboard" || pathname === "/dashboard/";
  const isAlunos = pathname.includes("/alunos");

  return (
    <div className="flex flex-col h-screen w-full bg-[#f1f5f9] font-sans overflow-hidden">
      {/* HEADER AZUL - shrink-0 garante que a altura seja respeitada */}
      <header className="bg-[#3182ce] text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md z-50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">
            PGE - Portal de Gestão Educacional
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

      {/* BARRA DE ABAS - Esta div vai aparecer SEMPRE, independente do estado */}
      <div className="bg-[#cbd5e0] flex items-end px-2 h-9 border-b border-gray-400 gap-1 shrink-0 w-full">
        {/* ABA INÍCIO */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold transition-all ${
            isInicio
              ? "bg-white text-gray-800 border-x border-t border-gray-400 z-10"
              : "bg-gray-300 text-gray-600 hover:bg-gray-200 border-x border-t border-transparent"
          }`}
        >
          <Home size={14} /> INÍCIO
        </Link>

        {/* ABA ALUNOS */}
        {isAlunos && (
          <div className="flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold shadow-sm relative bg-white text-gray-800 border-x border-t border-gray-400 z-10">
            <GraduationCap size={14} className="text-blue-600" />
            ALUNOS
            <button
              onClick={() => router.push("/dashboard")}
              className="ml-2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* O main deve ter overflow-auto para rolar apenas o conteúdo, e não a tela toda */}
      <main className="flex-1 bg-white overflow-auto relative">{children}</main>
    </div>
  );
}
