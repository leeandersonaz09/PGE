"use client";

import { useRouter, usePathname } from "next/navigation";
import { X, Home, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function TabsBar() {
  const router = useRouter();
  const pathname = usePathname() || "";

  return (
    <div className="shrink-0 bg-[#cbd5e0] flex items-end px-2 h-9 border-b border-gray-400 gap-1">
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

      {pathname.includes("/dashboard/alunos") && (
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
  );
}
