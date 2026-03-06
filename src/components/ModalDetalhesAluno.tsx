"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
import Swal from "sweetalert2";
import {
  X,
  FileText,
  PlusCircle,
  CreditCard,
  Loader2,
  Mail,
  Trash2,
  Search,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ✅ FUNÇÃO DE FORMATAÇÃO DE TELEFONE
const formatarTelefone = (valor: string) => {
  if (!valor || valor === "---" || valor.trim() === "-" || valor.trim() === "")
    return "---";
  const nums = valor.replace(/\D/g, "");
  if (nums.length === 11) {
    return nums.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (nums.length === 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return valor;
};

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
  const { user } = useAuth();
  const { coligadaAtual } = useColigada();

  const [modalFotoOpen, setModalFotoOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (abaAtiva === "historico" && aluno && coligadaAtual) {
      buscarOcorrencias();
    }
  }, [abaAtiva, aluno, coligadaAtual]);

  const getHighResUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("width=")) {
      return url
        .replace(/&width=\d+/i, "&width=600")
        .replace(/&height=\d+/i, "&height=875");
    }
    return url;
  };

  async function buscarOcorrencias() {
    if (!coligadaAtual) return;
    setLoadingHist(true);
    const { data, error } = await supabase
      .from("ocorrencias")
      .select("*")
      .eq("aluno_id", aluno.id)
      .eq("sede_id", coligadaAtual.id)
      .order("data", { ascending: false });

    if (!error) setHistorico(data || []);
    setLoadingHist(false);
  }

  async function excluirOcorrencia(id: string, donoId: string) {
    if (!user || user.id !== donoId) {
      Swal.fire(
        "Acesso Negado",
        "Apenas o autor original pode excluir este registro.",
        "error",
      );
      return;
    }

    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Esta ação não poderá ser revertida!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, apagar!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from("ocorrencias")
        .delete()
        .eq("id", id);
      if (error) {
        Swal.fire("Erro", "Falha ao excluir: " + error.message, "error");
      } else {
        setHistorico((prev) => prev.filter((item) => item.id !== id));
        Swal.fire(
          "Excluído!",
          "O registro foi removido com sucesso.",
          "success",
        );
      }
    }
  }

  if (!aluno) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 text-[11px] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[1100px] border border-gray-300 shadow-2xl flex flex-col overflow-hidden rounded-xl h-[95vh] sm:h-auto">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-2 px-4 text-white flex justify-between items-center font-bold shrink-0">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span className="tracking-wide uppercase truncate max-w-[200px] sm:max-w-none">
              Prontuário - {coligadaAtual?.nome || "SISTEMA"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-red-500 p-1 rounded-full transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* IDENTIFICAÇÃO */}
        <div className="bg-slate-50 p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 border-b border-slate-200 items-center sm:items-end shrink-0">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden cursor-zoom-in bg-slate-200 flex items-center justify-center group relative shrink-0 transition-transform active:scale-95"
            onClick={() => aluno.foto_url && setModalFotoOpen(true)}
          >
            {aluno.foto_url ? (
              <>
                <img
                  src={aluno.foto_url}
                  alt="Foto Aluno"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Search size={24} className="text-white drop-shadow-md" />
                </div>
              </>
            ) : (
              <span className="text-4xl font-black text-slate-400 uppercase">
                {aluno.nome ? aluno.nome[0] : "?"}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3 text-center sm:text-left w-full">
            <div>
              <h2 className="text-blue-900 font-black uppercase text-[14px] sm:text-[16px] leading-tight mb-1">
                {aluno.nome}
              </h2>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                Registro Ativo
              </span>
            </div>
            <div className="flex justify-center sm:justify-start gap-1 sm:gap-2">
              <button
                onClick={() => setAbaAtiva("dados")}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-t-lg font-black uppercase tracking-tighter text-[10px] transition-all ${abaAtiva === "dados" ? "bg-white text-blue-700 border-x border-t border-slate-200" : "bg-slate-200 text-slate-500"}`}
              >
                Dados
              </button>
              <button
                onClick={() => setAbaAtiva("historico")}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-t-lg font-black uppercase tracking-tighter text-[10px] transition-all ${abaAtiva === "historico" ? "bg-white text-blue-700 border-x border-t border-slate-200" : "bg-slate-200 text-slate-500"}`}
              >
                Ocorrências
              </button>
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto bg-white flex-1 custom-scrollbar text-slate-900">
          {abaAtiva === "dados" ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <fieldset className="border border-slate-200 p-4 sm:p-5 rounded-xl bg-slate-50/30 relative">
                <legend className="absolute -top-3 left-4 bg-white border border-slate-200 px-3 py-0.5 text-blue-600 font-black text-[9px] uppercase rounded-full shadow-sm">
                  Acadêmico
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
                  <DataField label="RA" value={aluno.id} isMono />
                  <DataField label="Série" value={`${aluno.serie}º Ano`} />
                  <DataField label="Turma" value={aluno.turma} center />
                  <StatusField status={aluno.status} />
                  <DataField label="Nascimento" value={aluno.nascimento} />
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <span className="text-slate-400 text-[9px] font-black uppercase block mb-1">
                    E-mail de Contato
                  </span>
                  <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-blue-800 text-[12px] sm:text-[13px] font-bold flex items-center gap-2 truncate">
                    <Mail size={14} className="text-blue-400 shrink-0" />{" "}
                    {aluno.email || "NÃO INFORMADO"}
                  </div>
                </div>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <ParentSection
                  title="Responsável Pai"
                  name={aluno.pai}
                  email={aluno.email_pai}
                  cel={aluno.celular_pai}
                  fixo={aluno.fixo_pai}
                  color="blue"
                />
                <ParentSection
                  title="Responsável Mãe"
                  name={aluno.mae}
                  email={aluno.email_mae}
                  cel={aluno.celular_mae}
                  fixo={aluno.fixo_mae}
                  color="pink"
                />
                <ParentSection
                  title="Financeiro"
                  name={aluno.financeiro_nome}
                  email={aluno.financeiro_email}
                  cel={aluno.financeiro_celular}
                  fixo={aluno.financeiro_fixo}
                  color="green"
                  isFin
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800 text-[13px] uppercase flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" /> Linha do
                  Tempo
                </h3>
                <button
                  onClick={onAbrirOcorrencias}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-black uppercase text-[9px] flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <PlusCircle size={14} /> Novo
                </button>
              </div>
              {loadingHist ? (
                <div className="flex flex-col items-center justify-center py-20 text-blue-500 italic font-bold text-center">
                  <Loader2 size={40} className="animate-spin mb-4" />{" "}
                  Sincronizando registros...
                </div>
              ) : (
                <div className="space-y-4 pb-6">
                  {historico.length > 0 ? (
                    historico.map((oc) => (
                      <div
                        key={oc.id}
                        className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-blue-700 uppercase text-[9px]">
                              Autor: {oc.colaborador_nome || "SISTEMA"}
                            </span>
                            <div className="flex items-center gap-1 text-slate-400 font-bold text-[9px]">
                              <Calendar size={10} />{" "}
                              {new Date(oc.data).toLocaleString("pt-BR")}
                            </div>
                          </div>
                          {user?.id === oc.colaborador_id && (
                            <button
                              onClick={() =>
                                excluirOcorrencia(oc.id, oc.colaborador_id)
                              }
                              className="text-red-500 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 leading-relaxed text-justify font-medium text-[11px] px-1">
                          {oc.texto}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-2xl opacity-50">
                      <FileText size={48} className="mx-auto text-slate-300" />
                      <p className="font-black text-slate-400 uppercase mt-2">
                        Nenhum registro
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ RODAPÉ CORRIGIDO E RESPONSIVO */}
        <div className="bg-slate-100 p-3 flex flex-col sm:flex-row justify-between items-center border-t border-slate-200 gap-3 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavegar("anterior")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-blue-500 text-slate-600 hover:text-blue-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() => onNavegar("proximo")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-blue-500 text-slate-600 hover:text-blue-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm active:scale-95"
            >
              Próximo <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-black text-white px-10 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* MODAL ZOOM FOTO */}
      {modalFotoOpen && aluno.foto_url && (
        <div
          className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 cursor-zoom-out animate-in zoom-in-95 duration-300"
          onClick={() => setModalFotoOpen(false)}
        >
          <img
            src={getHighResUrl(aluno.foto_url)}
            className={`max-w-full max-h-full rounded-xl shadow-2xl transition-transform duration-500 ${isZoomed ? "scale-125" : "scale-100"}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            style={{ cursor: isZoomed ? "zoom-out" : "zoom-in" }}
            alt="Zoom"
          />
          <button
            onClick={() => setModalFotoOpen(false)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white bg-white/10 p-2 sm:p-3 rounded-full backdrop-blur-md hover:bg-white/20 transition-all"
          >
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
}

function DataField({ label, value, isMono = false, center = false }: any) {
  return (
    <div className="min-w-0">
      <span className="text-slate-400 text-[8px] uppercase font-black mb-1 block tracking-tighter truncate">
        {label}
      </span>
      <div
        className={`bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700 font-bold truncate ${isMono ? "font-mono" : ""} ${center ? "text-center" : ""}`}
      >
        {value || "---"}
      </div>
    </div>
  );
}

function StatusField({ status }: any) {
  const isCursando = status === "CURSANDO";
  return (
    <div className="min-w-0">
      <span className="text-slate-400 text-[8px] uppercase font-black mb-1 block tracking-tighter">
        Situação
      </span>
      <div
        className={`p-2 rounded-lg text-center font-black border truncate ${isCursando ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
      >
        {status || "---"}
      </div>
    </div>
  );
}

function ParentSection({
  title,
  name,
  email,
  cel,
  fixo,
  color,
  isFin = false,
}: any) {
  const colors: any = {
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    pink: "text-pink-700 bg-pink-50 border-pink-100",
    green: "text-green-700 bg-green-50 border-green-100",
  };
  return (
    <fieldset
      className={`border border-slate-200 p-4 rounded-xl relative shadow-sm bg-white`}
    >
      <legend
        className={`absolute -top-3 left-3 bg-white px-2 font-black text-[9px] uppercase flex items-center gap-1 ${colors[color].split(" ")[0]}`}
      >
        {isFin && <CreditCard size={10} />} {title}
      </legend>
      <div className="space-y-4 mt-2">
        <div className="space-y-1">
          <span className="text-slate-400 text-[8px] uppercase font-black">
            Nome Completo
          </span>
          <div className="bg-slate-50/50 p-2 rounded text-[10px] sm:text-[11px] font-black text-slate-800 uppercase min-h-[30px] flex items-center leading-tight">
            {name || "---"}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-slate-400 text-[8px] uppercase font-black block">
            E-mail Contato
          </span>
          <div className="bg-white border border-slate-100 p-2 rounded text-[10px] sm:text-[11px] font-bold text-blue-600 italic break-all shadow-inner">
            {email || "---"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-1">
            <span className="text-slate-400 text-[8px] uppercase font-black">
              Celular
            </span>
            <div className="bg-slate-50 p-1.5 rounded text-center font-black text-slate-700 text-[10px]">
              {formatarTelefone(cel)}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 text-[8px] uppercase font-black">
              Fixo
            </span>
            <div className="bg-slate-50 p-1.5 rounded text-center font-black text-slate-700 text-[10px]">
              {formatarTelefone(fixo)}
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
