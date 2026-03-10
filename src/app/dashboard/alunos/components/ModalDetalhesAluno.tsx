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
  Stethoscope,
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

  // Estados para o Modal de Encaminhamento à Enfermaria
  const [modalEnfermariaOpen, setModalEnfermariaOpen] = useState(false);
  const [sintoma, setSintoma] = useState("");
  const [isSalvandoEncaminhamento, setIsSalvandoEncaminhamento] =
    useState(false);

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

  // ✅ FUNÇÃO PARA SALVAR ENCAMINHAMENTO
  const handleSalvarEncaminhamento = async () => {
    if (!sintoma.trim()) {
      return Swal.fire(
        "Campo Vazio",
        "Por favor, descreva o sintoma do aluno.",
        "warning",
      );
    }

    if (!coligadaAtual || !user) {
      return Swal.fire(
        "Erro",
        "Unidade ou usuário não identificados.",
        "error",
      );
    }

    setIsSalvandoEncaminhamento(true);

    const userName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "Usuário Logado";
    const horaAtual = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const { error } = await supabase.from("encaminhamentos_repouso").insert([
      {
        aluno_id: aluno.id,
        sintoma: sintoma,
        encaminhado_por: userName,
        hora_encaminhamento: horaAtual,
        status: "aguardando",
        sede_id: coligadaAtual.id,
      },
    ]);

    if (error) {
      Swal.fire(
        "Erro",
        "Falha ao enviar para enfermaria: " + error.message,
        "error",
      );
    } else {
      setModalEnfermariaOpen(false);
      setSintoma("");
      Swal.fire(
        "Encaminhado!",
        "O aluno foi enviado para a fila da Enfermaria.",
        "success",
      );
    }
    setIsSalvandoEncaminhamento(false);
  };

  if (!aluno) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 text-[11px] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[1100px] border border-gray-300 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden rounded-xl h-[95vh] sm:h-auto">
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

        {/* IDENTIFICAÇÃO E NAVEGAÇÃO DE ABAS */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-700 items-center sm:items-end shrink-0">
          {/* ✅ FOTO REDONDA APLICADA AQUI (rounded-full) */}
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white dark:border-slate-600 shadow-md overflow-hidden cursor-zoom-in bg-slate-200 dark:bg-slate-700 flex items-center justify-center group relative shrink-0 transition-transform active:scale-95"
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
              <span className="text-4xl font-black text-slate-400 dark:text-slate-500 uppercase">
                {aluno.nome ? aluno.nome[0] : "?"}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3 text-center sm:text-left w-full">
            <div>
              <h2 className="text-blue-900 dark:text-blue-400 font-black uppercase text-[14px] sm:text-[16px] leading-tight mb-1">
                {aluno.nome}
              </h2>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                Registro Ativo
              </span>
            </div>

            {/* TABS DE NAVEGAÇÃO */}
            <div className="flex justify-center sm:justify-start gap-1 sm:gap-2">
              <button
                onClick={() => setAbaAtiva("dados")}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-t-lg font-black uppercase tracking-tighter text-[10px] transition-all ${abaAtiva === "dados" ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-700" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
              >
                Dados
              </button>
              <button
                onClick={() => setAbaAtiva("historico")}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-t-lg font-black uppercase tracking-tighter text-[10px] transition-all ${abaAtiva === "historico" ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-700" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
              >
                Ocorrências
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO SCROLLÁVEL */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto bg-white dark:bg-slate-900 flex-1 custom-scrollbar text-slate-900 dark:text-slate-200">
          {abaAtiva === "dados" ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <fieldset className="border border-slate-200 dark:border-slate-700 p-4 sm:p-5 rounded-xl bg-slate-50/30 dark:bg-slate-800/20 relative">
                <legend className="absolute -top-3 left-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-0.5 text-blue-600 dark:text-blue-400 font-black text-[9px] uppercase rounded-full shadow-sm">
                  Acadêmico
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
                  <DataField label="RA" value={aluno.id} isMono />
                  <DataField label="Série" value={`${aluno.serie}º Ano`} />
                  <DataField label="Turma" value={aluno.turma} center />
                  <StatusField status={aluno.status} />
                  <DataField label="Nascimento" value={aluno.nascimento} />
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase block mb-1">
                    E-mail de Contato
                  </span>
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-3 rounded-lg text-blue-800 dark:text-blue-300 text-[12px] sm:text-[13px] font-bold flex items-center gap-2 truncate">
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <h3 className="font-black text-slate-800 dark:text-slate-200 text-[13px] uppercase flex items-center gap-2">
                  <FileText size={18} className="text-blue-600 dark:text-blue-500" />{" "}
                  Linha do Tempo
                </h3>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setModalEnfermariaOpen(true)}
                    className="flex-1 sm:flex-none bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-lg font-black uppercase text-[9px] flex items-center justify-center gap-1 shadow-sm transition-all border border-orange-200 dark:border-orange-800/50 active:scale-95"
                  >
                    <Stethoscope size={14} /> Enfermaria
                  </button>
                  <button
                    onClick={onAbrirOcorrencias}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-black uppercase text-[9px] flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                  >
                    <PlusCircle size={14} /> Novo
                  </button>
                </div>
              </div>

              {loadingHist ? (
                <div className="flex flex-col items-center justify-center py-20 text-blue-500 dark:text-blue-400 italic font-bold text-center">
                  <Loader2 size={40} className="animate-spin mb-4" />{" "}
                  Sincronizando registros...
                </div>
              ) : (
                <div className="space-y-4 pb-6">
                  {historico.length > 0 ? (
                    historico.map((oc) => (
                      <div
                        key={oc.id}
                        className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-blue-700 dark:text-blue-400 uppercase text-[9px]">
                              Autor: {oc.colaborador_nome || "SISTEMA"}
                            </span>
                            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-bold text-[9px]">
                              <Calendar size={10} />{" "}
                              {new Date(oc.data).toLocaleString("pt-BR")}
                            </div>
                          </div>
                          {user?.id === oc.colaborador_id && (
                            <button
                              onClick={() =>
                                excluirOcorrencia(oc.id, oc.colaborador_id)
                              }
                              className="text-red-500 dark:hover:text-white hover:bg-red-500 hover:text-white dark:hover:bg-red-600 p-2 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-justify font-medium text-[11px] px-1">
                          {oc.texto}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl opacity-50">
                      <FileText
                        size={48}
                        className="mx-auto text-slate-300 dark:text-slate-700"
                      />
                      <p className="font-black text-slate-400 dark:text-slate-600 uppercase mt-2">
                        Nenhum registro
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="bg-slate-100 dark:bg-slate-800 p-3 flex flex-col sm:flex-row justify-between items-center border-t border-slate-200 dark:border-slate-700 gap-3 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavegar("anterior")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-blue-500 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() => onNavegar("proximo")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-blue-500 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm active:scale-95"
            >
              Próximo <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-black dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-10 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* OVERLAYS E MODAIS SECUNDÁRIOS */}

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

      {/* MODAL ENFERMARIA */}
      {modalEnfermariaOpen && (
        <div className="fixed inset-0 bg-slate-900/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="bg-orange-500 p-4 text-white flex justify-between items-center">
              <h2 className="font-black uppercase text-xs flex items-center gap-2">
                <Stethoscope size={18} /> Encaminhar para Enfermaria
              </h2>
              <button
                onClick={() => setModalEnfermariaOpen(false)}
                className="bg-white/20 hover:bg-white/40 p-1.5 rounded-full transition-all text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="bg-orange-50/50 dark:bg-orange-900/30 p-3 rounded-xl border border-orange-100 dark:border-orange-800/40 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 flex items-center justify-center font-black shadow-sm overflow-hidden">
                  {aluno.foto_url ? (
                    <img
                      src={aluno.foto_url}
                      alt="A"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    aluno.nome[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 dark:text-slate-200 text-[12px] uppercase truncate">
                    {aluno.nome}
                  </p>
                  <p className="text-orange-600 dark:text-orange-400 font-bold text-[10px] uppercase">
                    Série: {aluno.serie}º Ano - {aluno.turma}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1">
                  Relato do Sintoma
                </label>
                <textarea
                  value={sintoma}
                  onChange={(e) => setSintoma(e.target.value)}
                  disabled={isSalvandoEncaminhamento}
                  rows={4}
                  className="w-full border-2 border-slate-100 dark:border-slate-700 p-4 text-[13px] font-medium text-slate-900 dark:text-slate-200 focus:border-orange-400 outline-none resize-none bg-slate-50 dark:bg-slate-800 rounded-xl transition-all shadow-inner placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="Ex: Aluno relata dor de cabeça e febre desde o intervalo..."
                />
              </div>

              <button
                onClick={handleSalvarEncaminhamento}
                disabled={isSalvandoEncaminhamento || !sintoma.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl uppercase shadow-xl shadow-orange-200 dark:shadow-orange-900/50 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSalvandoEncaminhamento ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Processando
                  </>
                ) : (
                  <>
                    <PlusCircle size={18} /> Enviar Aluno
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataField({ label, value, isMono = false, center = false }: any) {
  return (
    <div className="min-w-0">
      <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-black mb-1 block tracking-tighter truncate">
        {label}
      </span>
      <div
        className={`bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-700 dark:text-slate-300 font-bold truncate text-[10px] ${isMono ? "font-mono" : ""} ${center ? "text-center" : ""}`}
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
      <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-black mb-1 block tracking-tighter">
        Status
      </span>
      <div
        className={`p-2 rounded-lg text-center font-black border truncate text-[10px] ${isCursando ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50"}`}
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
    blue: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30",
    pink: "text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800/30",
    green:
      "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30",
  };
  return (
    <fieldset className="border border-slate-200 dark:border-slate-700 p-3 sm:p-4 rounded-xl relative shadow-sm bg-white dark:bg-slate-800/20">
      <legend
        className={`absolute -top-3 left-3 bg-white dark:bg-slate-900 px-2 font-black text-[8px] sm:text-[9px] uppercase flex items-center gap-1 ${colors[color].split(" ")[0]}`}
      >
        {isFin && <CreditCard size={10} />} {title}
      </legend>
      <div className="space-y-3 mt-1">
        <div className="space-y-0.5">
          <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-black">
            Nome
          </span>
          <div className="bg-slate-50/50 dark:bg-slate-800 p-1.5 rounded text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase min-h-[26px] flex items-center leading-tight">
            {name || "---"}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-black">
            E-mail
          </span>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-1.5 rounded text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 italic truncate shadow-inner">
            {email || "---"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-black">
              Celular
            </span>
            <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded text-center font-black text-slate-700 dark:text-slate-300 text-[9px] sm:text-[10px]">
              {formatarTelefone(cel)}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-black">
              Fixo
            </span>
            <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded text-center font-black text-slate-700 dark:text-slate-300 text-[9px] sm:text-[10px]">
              {formatarTelefone(fixo)}
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
