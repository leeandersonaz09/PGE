"use client";
import { useState } from "react";
// Importando o cliente centralizado que usa o createBrowserClient do @supabase/ssr
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext"; // <-- Importamos o contexto das coligadas
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
  const { user } = useAuth(); // Pega usuário logado via Supabase Auth
  const { coligadaAtual } = useColigada(); // <-- Puxamos a coligada selecionada no cabeçalho

  const salvarOcorrencia = async () => {
    if (!texto.trim()) return alert("Por favor, preencha o relato.");
    if (!user) return alert("Erro: Usuário não autenticado.");
    if (!coligadaAtual) return alert("Erro: Nenhuma unidade selecionada."); // Trava de segurança

    setSalvando(true);
    setErro("");

    try {
      const { error } = await supabase.from("ocorrencias").insert([
        {
          aluno_id: aluno.id,
          // Mapeia corretamente os dados do Google via Supabase
          colaborador_nome: user.user_metadata?.full_name || user.email,
          colaborador_id: user.id, // UUID único do Supabase
          texto: texto,
          sede_id: coligadaAtual.id, // <-- A MÁGICA ESTÁ AQUI: Carimba a ocorrência com a sede atual!
        },
      ]);

      if (error) throw error;

      alert("Registro salvo com sucesso!");
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
        {/* HEADER */}
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
            Relato do Ocorrido / Observação ({coligadaAtual?.sigla}):
          </label>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={salvando}
            className="w-full h-44 border border-gray-300 p-3 text-[12px] focus:ring-1 focus:ring-blue-600 outline-none resize-none bg-white shadow-sm rounded-sm disabled:bg-gray-50"
            placeholder="Descreva aqui os fatos de forma clara..."
          />

          <div className="flex items-center gap-1 text-[9px] text-green-600 font-bold uppercase">
            <ShieldCheck size={12} /> Autenticação Ativa via Supabase
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
            className="px-4 py-1.5 text-gray-500 font-bold text-[10px] hover:bg-gray-200 rounded uppercase"
          >
            Cancelar
          </button>
          <button
            onClick={salvarOcorrencia}
            disabled={salvando}
            className="bg-[#1a202c] hover:bg-gray-800 text-white px-6 py-1.5 rounded-sm font-bold text-[10px] flex items-center gap-2 shadow-md disabled:bg-gray-400 uppercase transition-all"
          >
            {salvando ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Gravando...
              </>
            ) : (
              <>
                <Save size={14} /> Salvar no Banco
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
