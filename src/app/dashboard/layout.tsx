"use client";
import { useRouter, usePathname } from "next/navigation";
import { X, LogOut, User } from "lucide-react"; // Importamos o ícone de fallback
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth(); // O 'user' contém photoURL e displayName do Google

  const isModuloAluno = pathname.includes("/alunos");

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      {/* HEADER AZUL REESTILIZADO */}
      <header className="bg-[#3182ce] text-white p-2 flex justify-between items-center text-[11px] px-4 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">
            PGE - Portal de Gestão Educacional (PITUBA - 2026)
          </span>

          {/* DIVISOR E IDENTIFICAÇÃO DO USUÁRIO */}
          {user && (
            <div className="flex items-center gap-2 border-l border-blue-400 pl-4 ml-2">
              <span className="italic text-blue-100 hidden sm:inline">
                Olá, {user.displayName?.split(" ")[0]}
              </span>

              {/* CONTAINER DA FOTO - Redonda e com borda de destaque */}
              <div className="w-7 h-7 rounded-full border-2 border-blue-300 overflow-hidden shadow-sm bg-blue-800 flex items-center justify-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
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

        {/* BOTÃO SAIR COM HOVER SUAVE */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 hover:bg-blue-700 px-3 py-1 rounded-md transition-all font-bold bg-blue-600/30"
        >
          <LogOut size={14} />
          Sair
        </button>
      </header>

      {/* SISTEMA DE ABAS (Permanecendo igual ao anterior) */}
      <div className="flex bg-[#7eb5e6] px-1 pt-1 border-b border-[#3182ce]">
        <button
          onClick={() => router.push("/dashboard")}
          className={`px-4 py-1 text-[11px] rounded-t-sm border-r border-gray-400 transition-colors ${
            pathname === "/dashboard"
              ? "bg-[#f7fafc] text-blue-700 font-bold"
              : "bg-[#cbd5e0] text-gray-700 hover:bg-[#e2e8f0]"
          }`}
        >
          Início
        </button>

        {isModuloAluno && (
          <div className="bg-[#f7fafc] text-blue-700 px-4 py-1 text-[11px] rounded-t-sm flex items-center gap-2 border-r border-gray-400 font-bold shadow-sm">
            Aluno
            <X
              size={12}
              className="cursor-pointer hover:text-red-500 transition-colors"
              onClick={() => router.push("/dashboard")}
            />
          </div>
        )}
      </div>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
