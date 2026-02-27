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
  const { logout, user, loading } = useAuth(); // Adicionado loading para evitar flash de 'vazio'

  // Melhorei a captura do nome e da foto para cobrir todas as possibilidades do Google
  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";
  const userPhoto =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const isModuloAlunos = pathname.includes("/dashboard/alunos");

  return (
    <div className="flex flex-col h-screen bg-[#f1f5f9] font-sans">
      {/* HEADER SUPERIOR (AZUL) */}
      <header className="bg-[#3182ce] text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md z-50">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">
            PGE - Portal de Gestão Educacional (2026)
          </span>

          {/* SÓ MOSTRA O NOME E FOTO SE O USER JÁ ESTIVER CARREGADO */}
          {!loading && user && (
            <div className="flex items-center gap-2 border-l border-blue-400 pl-4 ml-2">
              <span className="italic text-blue-100 hidden sm:inline">
                Olá, {userName.split(" ")[0]}
              </span>
              {/* CONTAINER DA FOTO */}
              <div className="w-7 h-7 rounded-full border-2 border-blue-300 overflow-hidden bg-blue-800 flex items-center justify-center shadow-inner">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer" // Importante para carregar fotos do Google
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

      {/* BARRA DE ABAS */}
      <div className="bg-[#cbd5e0] flex items-end px-2 h-9 border-b border-gray-400 gap-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-4 h-8 rounded-t-lg text-[11px] font-bold transition-all ${
            pathname === "/dashboard"
              ? "bg-white text-gray-800 border-x border-t border-gray-400"
              : "bg-gray-300 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Home size={14} /> INÍCIO
        </Link>

        {isModuloAlunos && (
          <div className="flex items-center gap-2 px-4 h-8 bg-white text-gray-800 border-x border-t border-gray-400 rounded-t-lg text-[11px] font-bold shadow-sm relative">
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

      <main className="flex-1 overflow-hidden bg-white">{children}</main>
    </div>
  );
}
