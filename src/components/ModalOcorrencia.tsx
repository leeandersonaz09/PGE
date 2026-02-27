"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { X, Save, Loader2, ClipboardList, ShieldCheck } from "lucide-react";

interface ModalOcorrenciaProps {
  aluno: any;
  onClose: () => void;
}

export default function ModalOcorrencia({
  aluno,
  onClose,
}: ModalOcorrenciaProps) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const salvarOcorrencia = async () => {
    // 1. Validação de campo vazio
    if (!texto.trim()) {
      return alert("Por favor, preencha o relato antes de salvar.");
    }

    // 2. SEGURANÇA: Verifica se o colaborador está logado no Firebase
    const user = auth.currentUser;
    if (!user) {
      return alert(
        "Erro de Autenticação: Você precisa estar logado para registrar uma ocorrência.",
      );
    }

    setSalvando(true);
    setErro("");

    try {
      // 3. Inserção no Supabase com trava de ID
      const { error } = await supabase.from("ocorrencias").insert([
        {
          aluno_id: aluno.id,
          colaborador_nome: user.displayName || user.email || "Colaborador PGE",
          colaborador_id: user.uid, // Este ID será validado pelo RLS do Supabase
          texto: texto,
        },
      ]);

      if (error) throw error;

      alert("Registro salvo com sucesso no prontuário!");
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setErro("Falha na segurança ou conexão: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md border border-gray-400 shadow-2xl rounded-sm overflow-hidden flex flex-col">
        {/* HEADER COM IDENTIDADE VISUAL SEGURA */}
        <div className="bg-[#1a202c] p-2 px-3 text-white flex justify-between items-center font-bold text-[11px] uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <ClipboardList size={14} className="text-blue-400" />
            Registro do Colaborador - RA {aluno.id}
          </span>
          <button
            onClick={onClose}
            className="hover:text-red-400 transition-colors outline-none"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* IDENTIFICAÇÃO DO ALUNO */}
          <div className="bg-blue-50/50 p-2 rounded border-l-4 border-blue-600">
            <span className="text-gray-800 font-bold block text-[12px] uppercase">
              {aluno.nome}
            </span>
            <span className="text-gray-500 text-[10px] font-medium">
              {aluno.serie}º Ano - Turma {aluno.turma}
            </span>
          </div>

          <label className="text-gray-600 font-bold text-[10px] uppercase tracking-tight flex items-center gap-1">
            Relato do Ocorrido / Observação:
          </label>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={salvando}
            className="w-full h-44 border border-gray-300 p-3 text-[12px] focus:ring-1 focus:ring-blue-600 outline-none resize-none bg-white shadow-sm rounded-sm disabled:bg-gray-50"
            placeholder="Descreva aqui os fatos de forma clara para o prontuário..."
          />

          {/* INDICADOR DE SEGURANÇA */}
          <div className="flex items-center gap-1 text-[9px] text-green-600 font-bold uppercase">
            <ShieldCheck size={12} /> Autenticação Ativa via Firebase
          </div>

          {erro && (
            <span className="text-red-600 text-[10px] font-bold bg-red-50 p-2 border border-red-100 rounded animate-pulse">
              {erro}
            </span>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="bg-gray-50 p-2 flex justify-end gap-2 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-1.5 text-gray-500 font-bold text-[10px] hover:bg-gray-200 rounded uppercase transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvarOcorrencia}
            disabled={salvando}
            className="bg-[#1a202c] hover:bg-gray-800 text-white px-6 py-1.5 rounded-sm font-bold text-[10px] flex items-center gap-2 shadow-md disabled:bg-gray-400 uppercase transition-all active:scale-95"
          >
            {salvando ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Gravando...
              </>
            ) : (
              <>
                <Save size={14} />
                Salvar no Banco
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
