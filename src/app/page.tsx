"use client";

import { LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { loginGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await loginGoogle();
      // não precisa setLoading(false)
      // pois haverá redirecionamento
    } catch (error: any) {
      console.error("Erro ao iniciar login:", error?.message);
      alert("Erro ao conectar com o Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#E87B35]">
      {/* PADRÃO DE FUNDO - Exatamente como o original */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E87B35] via-[#D1621D] to-[#002B54] opacity-95"></div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        ></div>
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] bg-[#002B54]/40 rounded-full blur-[100px]"></div>
      </div>

      {/* CARD DE LOGIN */}
      <div className="relative z-10 bg-white/95 backdrop-blur-md p-10 rounded-[2.5rem] shadow-[0_25px_50_rgba(0,0,0,0.5)] w-full max-w-md border border-white/40 transform transition-all hover:scale-[1.01]">
        {/* LOGO E TÍTULO */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6 drop-shadow-md">
            <img
              src="https://www.cspba.com.br/wp-content/uploads/2025/01/logo-1.png"
              alt="Logo Colégio São Paulo"
              className="h-28 w-auto object-contain"
            />
          </div>

          <div className="text-center">
            <h1 className="text-[#002B54] text-5xl font-black tracking-tighter italic leading-none">
              PGE
            </h1>
            <p className="text-[#E87B35] text-[10px] font-black uppercase tracking-[0.3em] mt-2 ml-1">
              Colégio São Paulo - Itaigara
            </p>
          </div>
          <div className="w-16 h-1 bg-[#002B54] mt-6 rounded-full opacity-20"></div>
        </div>

        <p className="text-slate-500 text-center mb-10 text-sm font-medium leading-relaxed">
          Portal de Gestão Unificado. <br />
          Identifique-se com sua conta institucional.
        </p>

        {/* BOTÃO GOOGLE PREMIUM */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-2xl hover:border-[#E87B35]/30 transition-all duration-500 group active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <div className="bg-white p-1 rounded-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.787 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.747-.067-1.48-.187-2.053H12.48z"
              />
            </svg>
          </div>

          <span className="text-[#002B54] font-black text-lg tracking-tight">
            {loading ? "Conectando..." : "Acessar com Google"}
          </span>

          <LogIn
            size={20}
            className="text-[#E87B35] group-hover:translate-x-1 transition-transform duration-300"
          />
        </button>

        {/* FOOTER DO CARD */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex justify-center items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <p className="text-slate-400 text-[9px] uppercase font-bold tracking-[0.2em]">
            Ambiente Seguro & Monitorado
          </p>
        </div>
      </div>

      {/* CRÉDITOS EXTERNOS */}
      <div className="absolute bottom-8 w-full text-center">
        <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.4em]">
          PGE © 2026 | Developed by Lee Brasil
        </p>
      </div>
    </div>
  );
}
