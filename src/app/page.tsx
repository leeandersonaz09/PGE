"use client";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  // Importamos a função de login real do nosso contexto
  const { loginGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      {/* CARD DE LOGIN */}
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        {/* TÍTULO DO PORTAL */}
        <h1 className="text-[#0056f1] text-2xl font-bold text-center mb-8 uppercase tracking-wide">
          PGE - Portal de Gestão
        </h1>

        {/* BOTÃO GOOGLE REAL */}
        <button
          onClick={loginGoogle}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-300 p-3 rounded-md hover:bg-gray-50 transition-all group"
        >
          {/* LOGO GOOGLE */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"
            />
            <path
              fill="#34A853"
              d="M16.04 18.013c-1.09.593-2.325.917-3.62.917-2.85 0-5.27-1.876-6.105-4.432L2.246 17.58C4.316 21.43 8.356 24 12.38 24c3.147 0 6.012-1.047 8.243-2.822l-4.583-3.165z"
            />
            <path
              fill="#4285F4"
              d="M19.82 12.11c0-.796-.073-1.564-.207-2.31H12v4.363h4.412c-.19 1.023-.767 1.888-1.636 2.47l4.583 3.166C21.996 17.5 24 14.81 24 12.11z"
            />
            <path
              fill="#FBBC05"
              d="M5.266 9.765l-4.026-3.115C.44 7.935 0 9.932 0 12c0 2.063.44 4.055 1.233 5.827l4.032-3.116C5.064 13.91 5 12.98 5 12c0-.793.094-1.56.266-2.235z"
            />
          </svg>

          {/* TEXTO DO BOTÃO */}
          <span className="text-gray-700 font-semibold text-base group-hover:text-black">
            Entrar com Google
          </span>
        </button>

        {/* RODAPÉ DO LOGIN */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-xs">
            © 2026 Portal de Gestão Educacional - Lee Anderson
          </p>
        </div>
      </div>
    </div>
  );
}
