"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
import Swal from "sweetalert2"; // ✅ Alertas modernos
import {
  X,
  Save,
  Loader2,
  ClipboardList,
  ShieldCheck,
  User,
} from "lucide-react";

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
  const { user } = useAuth();
  const { coligadaAtual } = useColigada();

  const salvarOcorrencia = async () => {
    // Validações com SweetAlert2
    if (!texto.trim()) {
      return Swal.fire({
        title: "Campo Vazio",
        text: "Por favor, descreva o ocorrido antes de salvar.",
        icon: "warning",
        confirmButtonColor: "#3182ce",
      });
    }

    if (!user || !coligadaAtual) {
      return Swal.fire(
        "Erro de Sessão",
        "Usuário ou unidade não identificada.",
        "error",
      );
    }

    setSalvando(true);

    try {
      const { error } = await supabase.from("ocorrencias").insert([
        {
          aluno_id: aluno.id,
          colaborador_nome: user.user_metadata?.full_name || user.email,
          colaborador_id: user.id,
          texto: texto,
          sede_id: coligadaAtual.id, // ✅ Mantido o carimbo da sede
        },
      ]);

      if (error) throw error;

      await Swal.fire({
        title: "Sucesso!",
        text: "O registro foi gravado no prontuário do aluno.",
        icon: "success",
        confirmButtonColor: "#16a34a",
      });

      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      Swal.fire("Falha na Gravação", err.message, "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col scale-in-center">
        {/* HEADER ESTILIZADO */}
        <div className="bg-slate-900 dark:bg-slate-800 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-1.5 rounded-lg">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-[12px] font-black uppercase tracking-wider leading-none">
                Novo Registro de Ocorrência
              </h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                UNIDADE: {coligadaAtual?.sigla}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* IDENTIFICAÇÃO DO ALUNO (Visual mais limpo) */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black shadow-sm">
              {aluno.nome ? aluno.nome[0] : "?"}
            </div>
            <div>
              <span className="text-slate-900 dark:text-slate-200 font-black block text-[13px] uppercase">
                {aluno.nome}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                RA: {aluno.id} • {aluno.serie}º Ano - {aluno.turma}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-1">
              Relato Detalhado
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={salvando}
              className="w-full h-48 border border-slate-200 dark:border-slate-700 p-4 text-[13px] font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none bg-slate-50/30 dark:bg-slate-800/50 rounded-xl transition-all shadow-inner placeholder:text-slate-300 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-200"
              placeholder="Descreva aqui os fatos, observações ou encaminhamentos de forma profissional..."
            />
          </div>

          {/* RODAPÉ DE SEGURANÇA */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase">
              <ShieldCheck size={14} />
              Sessão Identificada:{" "}
              {user?.user_metadata?.full_name?.split(" ")[0] || "Usuário"}
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={salvando}
            className="px-6 py-2.5 text-slate-500 dark:text-slate-400 font-black text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl uppercase transition-all"
          >
            Descartar
          </button>
          <button
            onClick={salvarOcorrencia}
            disabled={salvando}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-lg shadow-slate-200 dark:shadow-blue-900/50 disabled:bg-slate-400 uppercase transition-all active:scale-95"
          >
            {salvando ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Gravando...
              </>
            ) : (
              <>
                <Save size={14} /> Finalizar Registro
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
