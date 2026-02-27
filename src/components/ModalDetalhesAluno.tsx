"use client";
import { useState } from "react";
import { X, FileText, PlusCircle, CreditCard } from "lucide-react";

interface ModalDetalhesProps {
  aluno: any;
  onClose: () => void;
  onNavegar: (direcao: "anterior" | "proximo") => void;
  onAbrirOcorrencias: () => void;
}

export default function ModalDetalhesAluno({
  aluno,
  onClose,
  onNavegar,
  onAbrirOcorrencias,
}: ModalDetalhesProps) {
  const [abaAtiva, setAbaAtiva] = useState<"dados" | "historico">("dados");

  // Histórico mocado (será substituído pelo Supabase)
  const historicoMocado = [
    {
      id: 1,
      data: "26/02/2026",
      professor: "Lee Anderson",
      texto: "Aluno participativo nas atividades.",
    },
  ];

  if (!aluno) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 text-[11px]">
      <div className="bg-white w-full max-w-[1100px] border border-gray-400 shadow-2xl flex flex-col overflow-hidden rounded-sm">
        {/* HEADER AZUL */}
        <div className="bg-[#3182ce] p-1 px-3 text-white flex justify-between items-center font-bold">
          <span>Prontuário do Aluno - PGE v1.0</span>
          <button
            onClick={onClose}
            className="hover:text-red-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* IDENTIFICAÇÃO E ABAS */}
        <div className="bg-[#ebf8ff] p-3 flex gap-4 border-b border-blue-200 items-center">
          <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm overflow-hidden flex-shrink-0 bg-blue-600 flex items-center justify-center text-white text-xl font-bold uppercase">
            {aluno.nome[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-blue-800 font-bold uppercase text-[13px]">
              {aluno.nome}
            </h2>
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setAbaAtiva("dados")}
                className={`px-4 py-1 border border-b-0 rounded-t-sm font-bold shadow-sm transition-colors ${abaAtiva === "dados" ? "bg-white text-blue-700 border-blue-400" : "bg-blue-500 text-white hover:bg-blue-600"}`}
              >
                Dados Cadastrais
              </button>
              <button
                onClick={() => setAbaAtiva("historico")}
                className={`px-4 py-1 border border-b-0 rounded-t-sm font-bold shadow-sm transition-colors ${abaAtiva === "historico" ? "bg-white text-blue-700 border-blue-400" : "bg-blue-500 text-white hover:bg-blue-600"}`}
              >
                Ocorrências
              </button>
            </div>
          </div>
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="p-4 space-y-6 overflow-y-auto bg-white max-h-[70vh]">
          {abaAtiva === "dados" ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* INFO ACADÊMICA */}
              <fieldset className="border border-gray-200 p-4 rounded-md relative">
                <legend className="absolute -top-3 left-4 bg-white px-2 text-blue-600 font-bold text-[10px] uppercase tracking-wider italic">
                  Informações Acadêmicas
                </legend>
                <div className="grid grid-cols-5 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-semibold uppercase text-[9px]">
                      RA
                    </span>
                    <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-700 font-medium">
                      {aluno.id}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-semibold uppercase text-[9px]">
                      Série
                    </span>
                    <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-700 font-medium">
                      {aluno.serie}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-semibold uppercase text-[9px]">
                      Turma
                    </span>
                    <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-700 font-medium text-center">
                      {aluno.turma}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-semibold uppercase text-[9px]">
                      Status
                    </span>
                    <div
                      className={`px-2 py-1 rounded text-center font-bold border ${aluno.status === "Transferido" ? "bg-red-50 border-red-200 text-red-600" : "bg-green-50 border-green-200 text-green-700"}`}
                    >
                      {aluno.status || "Ativo"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-semibold uppercase text-[9px]">
                      Nascimento
                    </span>
                    <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-700 font-medium">
                      {aluno.nascimento}
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* FILIAÇÃO E FINANCEIRO - GRID DE 3 COLUNAS */}
              <div className="grid grid-cols-3 gap-4">
                {/* PAI */}
                <fieldset className="border border-gray-200 p-3 rounded-md relative bg-blue-50/10">
                  <legend className="absolute -top-3 left-3 bg-white px-2 text-blue-700 font-bold text-[9px] uppercase">
                    Responsável Pai
                  </legend>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px] uppercase">
                        Nome
                      </span>
                      <div className="border-b border-gray-200 py-1 font-bold">
                        {aluno.pai || "---"}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px] uppercase">
                        E-mail
                      </span>
                      <div className="border-b border-gray-200 py-1 text-blue-600 truncate italic">
                        {aluno.email_pai || "---"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[8px] uppercase">
                          Celular
                        </span>
                        <div className="bg-white border border-gray-100 p-1 rounded text-center">
                          {aluno.celular_pai || "---"}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[8px] uppercase">
                          Fixo
                        </span>
                        <div className="bg-white border border-gray-100 p-1 rounded text-center">
                          {aluno.fixo_pai || "---"}
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* MÃE */}
                <fieldset className="border border-gray-200 p-3 rounded-md relative bg-pink-50/10">
                  <legend className="absolute -top-3 left-3 bg-white px-2 text-pink-700 font-bold text-[9px] uppercase">
                    Responsável Mãe
                  </legend>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px] uppercase">
                        Nome
                      </span>
                      <div className="border-b border-gray-200 py-1 font-bold">
                        {aluno.mae || "---"}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px] uppercase">
                        E-mail
                      </span>
                      <div className="border-b border-gray-200 py-1 text-blue-600 truncate italic">
                        {aluno.email_mae || "---"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[8px] uppercase">
                          Celular
                        </span>
                        <div className="bg-white border border-gray-100 p-1 rounded text-center">
                          {aluno.celular_mae || "---"}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[8px] uppercase">
                          Fixo
                        </span>
                        <div className="bg-white border border-gray-100 p-1 rounded text-center">
                          {aluno.fixo_mae || "---"}
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* FINANCEIRO (NOVO) */}
                <fieldset className="border border-gray-200 p-3 rounded-md relative bg-green-50/20 shadow-inner">
                  <legend className="absolute -top-3 left-3 bg-white px-2 text-green-700 font-bold text-[9px] uppercase flex items-center gap-1">
                    <CreditCard size={10} /> Responsável Financeiro
                  </legend>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px] uppercase font-bold text-green-600">
                        Nome
                      </span>
                      <div className="border-b border-green-200 py-1 font-bold text-green-900">
                        {aluno.financeiro_nome || "Mesmo que o Pai/Mãe"}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-[8px] uppercase">
                        E-mail Financeiro
                      </span>
                      <div className="border-b border-gray-200 py-1 text-blue-600 truncate italic">
                        {aluno.financeiro_email || "---"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[8px] uppercase">
                          Celular
                        </span>
                        <div className="bg-white border border-gray-200 p-1 rounded text-center font-bold">
                          {aluno.financeiro_celular || "---"}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[8px] uppercase">
                          Fixo
                        </span>
                        <div className="bg-white border border-gray-200 p-1 rounded text-center">
                          {aluno.financeiro_fixo || "---"}
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            </div>
          ) : (
            /* ABA HISTÓRICO... */
            <div className="flex flex-col h-full animate-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                  <FileText size={14} /> Histórico de Registros
                </h3>
                <button
                  onClick={onAbrirOcorrencias}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-sm font-bold flex items-center gap-1 shadow-sm"
                >
                  <PlusCircle size={14} /> Nova Ocorrência
                </button>
              </div>
              <div className="space-y-2">
                {historicoMocado.map((oc) => (
                  <div
                    key={oc.id}
                    className="border border-gray-200 p-2 rounded-sm bg-gray-50 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1 border-b border-gray-100 pb-1 italic">
                      <span className="font-bold text-blue-600">
                        Prof: {oc.professor}
                      </span>
                      <span>{oc.data}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-justify">
                      {oc.texto}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="bg-[#f1f5f9] p-2 flex justify-end gap-2 border-t border-gray-300">
          <button
            onClick={() => onNavegar("anterior")}
            className="bg-[#3182ce] hover:bg-blue-700 text-white px-5 py-1 rounded font-bold transition-all text-[11px]"
          >
            Anterior
          </button>
          <button
            onClick={() => onNavegar("proximo")}
            className="bg-[#3182ce] hover:bg-blue-700 text-white px-5 py-1 rounded font-bold transition-all text-[11px]"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
}
