"use client";
import { useState } from "react";
import { X, Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ModalOcorrenciaProps {
  aluno: any;
  onClose: () => void;
}

export default function ModalOcorrencia({
  aluno,
  onClose,
}: ModalOcorrenciaProps) {
  const { user } = useAuth();
  const [texto, setTexto] = useState("");

  const salvar = () => {
    if (!texto.trim()) return alert("Descreva a ocorrência.");
    // Lógica futura de salvamento no DB (Supabase/Firestore)
    console.log(
      `Gravando para ${aluno.nome} por ${user?.displayName}: ${texto}`,
    );
    alert("Ocorrência gravada com sucesso!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-2 text-[11px]">
      <div className="bg-white w-full max-w-[600px] border border-gray-400 shadow-2xl flex flex-col">
        <div className="bg-red-600 p-1 px-3 text-white flex justify-between items-center font-bold">
          <span>Registrar Ocorrência - {aluno.nome}</span>
          <button onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 p-2 text-yellow-800 italic">
            Atenção: Este registro será vinculado ao seu usuário institucional.
          </div>

          <textarea
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="w-full h-40 border border-gray-300 p-2 outline-none focus:border-red-400 resize-none"
            placeholder="Descreva detalhadamente o ocorrido..."
          />
        </div>

        <div className="bg-[#f1f5f9] p-2 flex justify-end gap-2 border-t border-gray-300">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-1 rounded font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded font-bold flex items-center gap-2"
          >
            <Save size={14} /> Gravar Ocorrência
          </button>
        </div>
      </div>
    </div>
  );
}
