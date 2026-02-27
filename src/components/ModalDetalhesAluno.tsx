"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase"; // Importante para validar quem é o dono do registro
import {
  X,
  FileText,
  PlusCircle,
  CreditCard,
  Loader2,
  Mail,
  Trash2,
} from "lucide-react";

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
  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    if (abaAtiva === "historico" && aluno) {
      buscarOcorrencias();
    }
  }, [abaAtiva, aluno]);

  async function buscarOcorrencias() {
    setLoadingHist(true);
    const { data, error } = await supabase
      .from("ocorrencias")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("data", { ascending: false });

    if (!error) setHistorico(data || []);
    setLoadingHist(false);
  }

  async function excluirOcorrencia(id: string, donoId: string) {
    const usuarioLogado = auth.currentUser;

    // Trava de segurança no Front-end
    if (!usuarioLogado || usuarioLogado.uid !== donoId) {
      alert(
        "Operação negada: Apenas o autor original pode excluir este registro.",
      );
      return;
    }

    if (!confirm("Deseja realmente apagar esta ocorrência permanentemente?"))
      return;

    const { error } = await supabase.from("ocorrencias").delete().eq("id", id);

    if (error) {
      alert("Erro ao excluir do banco de dados: " + error.message);
    } else {
      // Remove da lista localmente para atualizar a tela na hora
      setHistorico((prev) => prev.filter((item) => item.id !== id));
    }
  }

  if (!aluno) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 text-[11px]">
      <div className="bg-white w-full max-w-[1100px] border border-gray-400 shadow-2xl flex flex-col overflow-hidden rounded-sm">
        {/* HEADER */}
        <div className="bg-[#3182ce] p-1 px-3 text-white flex justify-between items-center font-bold">
          <span>Prontuário do Aluno - PGE Salvador</span>
          <button
            onClick={onClose}
            className="hover:text-red-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* IDENTIFICAÇÃO */}
        <div className="bg-[#ebf8ff] p-3 flex gap-4 border-b border-blue-200 items-center">
          <div className="w-16 h-16 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-white text-xl font-bold uppercase overflow-hidden shadow-sm">
            {aluno.nome ? aluno.nome[0] : "?"}
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

        {/* CONTEÚDO */}
        <div className="p-4 space-y-6 overflow-y-auto bg-white max-h-[70vh] min-h-[450px]">
          {abaAtiva === "dados" ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* INFO ACADÊMICA E E-MAIL DO ALUNO */}
              <fieldset className="border border-gray-200 p-4 rounded-md relative bg-gray-50/30">
                <legend className="absolute -top-3 left-4 bg-white px-2 text-blue-600 font-bold text-[10px] uppercase italic">
                  Informações Acadêmicas & Contato
                </legend>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <span className="text-gray-400 text-[9px] uppercase font-bold">
                        RA
                      </span>
                      <div className="bg-gray-50 border border-gray-200 p-1.5 rounded font-mono text-gray-700">
                        {aluno.id}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[9px] uppercase font-bold">
                        Série
                      </span>
                      <div className="bg-gray-50 border border-gray-200 p-1.5 rounded font-medium text-gray-700">
                        {aluno.serie}º Ano
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[9px] uppercase font-bold">
                        Turma
                      </span>
                      <div className="bg-gray-50 border border-gray-200 p-1.5 rounded text-center font-medium text-gray-700">
                        {aluno.turma}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[9px] uppercase font-bold">
                        Status
                      </span>
                      <div
                        className={`p-1.5 rounded text-center font-bold border ${aluno.status === "CURSANDO" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {aluno.status}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[9px] uppercase font-bold">
                        Nascimento
                      </span>
                      <div className="bg-gray-50 border border-gray-200 p-1.5 rounded font-medium text-gray-700">
                        {aluno.nascimento}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] uppercase font-bold flex items-center gap-1">
                      <Mail size={10} /> E-mail Institucional / Pessoal
                    </span>
                    <div className="mt-1 bg-blue-50/50 border border-blue-200 p-2.5 rounded text-blue-900 text-[13px] font-bold break-all shadow-inner italic flex items-center">
                      {aluno.email || "Não informado"}
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* RESPONSÁVEIS */}
              <div className="grid grid-cols-3 gap-4">
                {/* PAI */}
                <fieldset className="border border-gray-200 p-3 rounded-md bg-blue-50/5 relative">
                  <legend className="absolute -top-3 left-3 bg-white px-2 text-blue-700 font-bold text-[9px] uppercase">
                    Responsável Pai
                  </legend>
                  <div className="space-y-3 mt-1">
                    <div>
                      <span className="text-gray-400 text-[8px] uppercase font-bold">
                        Nome
                      </span>
                      <div className="bg-gray-50 border border-gray-200 p-1.5 rounded font-bold text-gray-800 break-words min-h-[28px] uppercase">
                        {aluno.pai || "---"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[8px] uppercase font-bold">
                        E-mail
                      </span>
                      <div className="bg-white border border-blue-200 p-2 rounded text-blue-800 text-[12px] font-bold break-all min-h-[32px] shadow-sm flex items-center italic">
                        {aluno.email_pai || "---"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase font-bold">
                          Celular
                        </span>
                        <div className="bg-gray-50 border border-gray-200 p-1 rounded text-center font-bold text-gray-700">
                          {aluno.celular_pai || "---"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase font-bold">
                          Fixo
                        </span>
                        <div className="bg-gray-50 border border-gray-200 p-1 rounded text-center font-bold text-gray-700">
                          {aluno.fixo_pai || "---"}
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* MÃE */}
                <fieldset className="border border-gray-200 p-3 rounded-md bg-pink-50/5 relative">
                  <legend className="absolute -top-3 left-3 bg-white px-2 text-pink-700 font-bold text-[9px] uppercase">
                    Responsável Mãe
                  </legend>
                  <div className="space-y-3 mt-1">
                    <div>
                      <span className="text-gray-400 text-[8px] uppercase font-bold">
                        Nome
                      </span>
                      <div className="bg-gray-50 border border-gray-200 p-1.5 rounded font-bold text-gray-800 break-words min-h-[28px] uppercase">
                        {aluno.mae || "---"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[8px] uppercase font-bold">
                        E-mail
                      </span>
                      <div className="bg-white border border-pink-200 p-2 rounded text-blue-800 text-[12px] font-bold break-all min-h-[32px] shadow-sm flex items-center italic">
                        {aluno.email_mae || "---"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase font-bold">
                          Celular
                        </span>
                        <div className="bg-gray-50 border border-gray-200 p-1 rounded text-center font-bold text-gray-700">
                          {aluno.celular_mae || "---"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase font-bold">
                          Fixo
                        </span>
                        <div className="bg-gray-50 border border-gray-200 p-1 rounded text-center font-bold text-gray-700">
                          {aluno.fixo_mae || "---"}
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* FINANCEIRO */}
                <fieldset className="border border-gray-200 p-3 rounded-md bg-green-50/10 relative shadow-inner">
                  <legend className="absolute -top-3 left-3 bg-white px-2 text-green-700 font-bold text-[9px] uppercase flex items-center gap-1">
                    <CreditCard size={10} /> Financeiro
                  </legend>
                  <div className="space-y-3 mt-1">
                    <div>
                      <span className="text-gray-400 text-[8px] uppercase font-bold">
                        Nome Financeiro
                      </span>
                      <div className="bg-green-50/50 border border-green-200 p-1.5 rounded font-bold text-green-900 break-words min-h-[28px] uppercase">
                        {aluno.financeiro_nome || "---"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[8px] uppercase font-bold text-green-600">
                        E-mail Financeiro
                      </span>
                      <div className="bg-white border border-green-200 p-2 rounded text-blue-800 text-[12px] font-bold break-all min-h-[32px] shadow-sm flex items-center italic">
                        {aluno.financeiro_email || "---"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase font-bold">
                          Celular
                        </span>
                        <div className="bg-gray-50 border border-gray-200 p-1 rounded text-center font-bold text-gray-700">
                          {aluno.financeiro_celular || "---"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase font-bold">
                          Fixo
                        </span>
                        <div className="bg-gray-50 border border-gray-200 p-1 rounded text-center font-bold text-gray-700">
                          {aluno.financeiro_fixo || "---"}
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            </div>
          ) : (
            /* ABA HISTÓRICO COM LIXEIRA INTELIGENTE */
            <div className="flex flex-col h-full animate-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                  <FileText size={14} /> Histórico de Registros
                </h3>
                <button
                  onClick={onAbrirOcorrencias}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-sm font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                >
                  <PlusCircle size={14} /> Nova Ocorrência
                </button>
              </div>

              {loadingHist ? (
                <div className="flex flex-col items-center justify-center py-20 text-blue-400 italic">
                  <Loader2 size={30} className="animate-spin mb-3" />{" "}
                  Sincronizando registros do aluno...
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {historico.length > 0 ? (
                    historico.map((oc) => {
                      // Verifica se o usuário logado é o dono do registro
                      const isDono =
                        auth.currentUser?.uid === oc.colaborador_id;

                      return (
                        <div
                          key={oc.id}
                          className="border border-gray-200 p-3 rounded-sm bg-gray-50 hover:bg-blue-50 transition-colors shadow-sm relative group"
                        >
                          <div className="flex justify-between text-[10px] text-gray-500 mb-2 border-b border-gray-100 pb-1 italic">
                            <div className="flex flex-col">
                              <span className="font-bold text-blue-600 uppercase">
                                COLABORADOR: {oc.colaborador_nome || "SISTEMA"}
                              </span>
                              <span className="font-bold">
                                {new Date(oc.data).toLocaleString("pt-BR")}
                              </span>
                            </div>

                            {/* ÍCONE DE LIXEIRA - SÓ APARECE PARA O DONO */}
                            {isDono && (
                              <button
                                onClick={() =>
                                  excluirOcorrencia(oc.id, oc.colaborador_id)
                                }
                                className="flex items-center gap-1 text-red-400 hover:text-red-600 transition-colors p-1"
                                title="Excluir meu registro"
                              >
                                <Trash2 size={13} />
                                <span className="font-bold">EXCLUIR</span>
                              </button>
                            )}
                          </div>
                          <p className="text-gray-700 leading-relaxed text-justify text-[11px]">
                            {oc.texto}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 text-gray-400 italic border-2 border-dashed border-gray-100 rounded-lg">
                      Não existem ocorrências registradas para este aluno.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="bg-[#f1f5f9] p-2 flex justify-end gap-2 border-t border-gray-300">
          <button
            onClick={() => onNavegar("anterior")}
            className="bg-[#3182ce] hover:bg-blue-700 text-white px-6 py-1.5 rounded font-bold text-[11px] shadow-sm"
          >
            ALUNO ANTERIOR
          </button>
          <button
            onClick={() => onNavegar("proximo")}
            className="bg-[#3182ce] hover:bg-blue-700 text-white px-6 py-1.5 rounded font-bold text-[11px] shadow-sm"
          >
            PRÓXIMO ALUNO
          </button>
        </div>
      </div>
    </div>
  );
}
