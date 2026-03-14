"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import {
  Projector,
  Calendar,
  Plus,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Clock,
  Download,
  Loader2,
  Laptop,
  Speaker,
  Tv,
  Package,
} from "lucide-react";

const getIconForEquipamento = (nome: string) => {
  const n = nome.toLowerCase();
  if (n.includes("projetor") || n.includes("data show"))
    return <Projector size={24} className="text-indigo-600" />;
  if (n.includes("notebook") || n.includes("chromebook"))
    return <Laptop size={24} className="text-indigo-600" />;
  if (n.includes("caixa") || n.includes("som"))
    return <Speaker size={24} className="text-indigo-600" />;
  if (n.includes("tv") || n.includes("monitor"))
    return <Tv size={24} className="text-indigo-600" />;
  return <Package size={24} className="text-indigo-600" />;
};

export default function LocacoesPage() {
  const { user } = useAuth();
  const { coligadaAtual, loadingColigadas } = useColigada();
  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";

  const [locacoes, setLocacoes] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [filtro, setFiltro] = useState<"hoje" | "semana" | "especifico">(
    "hoje",
  );
  const [dataBusca, setDataBusca] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [formData, setFormData] = useState({
    equipamento_id: "",
    sala: "",
    data_locacao: new Date().toISOString().split("T")[0],
    observacao: "",
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("permissoes_usuarios")
          .select("is_admin")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setIsAdmin(data.is_admin);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (coligadaAtual) carregarDados();
  }, [filtro, dataBusca, coligadaAtual]);

  const carregarDados = async () => {
    if (!coligadaAtual) return;
    setLoading(true);
    const { data: eqData } = await supabase
      .from("equipamentos")
      .select("*")
      .eq("sede_id", coligadaAtual.id)
      .order("nome");
    if (eqData) setEquipamentos(eqData);

    let query = supabase
      .from("locacoes")
      .select("*, equipamento:equipamentos(nome)")
      .eq("sede_id", coligadaAtual.id)
      .order("data_locacao", { ascending: true });
    const hojeStr = new Date().toISOString().split("T")[0];

    if (filtro === "hoje") query = query.eq("data_locacao", hojeStr);
    else if (filtro === "semana") {
      const fimSemana = new Date();
      fimSemana.setDate(new Date().getDate() + 7);
      query = query
        .gte("data_locacao", hojeStr)
        .lte("data_locacao", fimSemana.toISOString().split("T")[0]);
    } else if (filtro === "especifico" && dataBusca)
      query = query.eq("data_locacao", dataBusca);

    const { data: locData } = await query;
    if (locData) setLocacoes(locData);
    setLoading(false);
  };

  const equipamentosDisponiveis = equipamentos.map((eq) => {
    const locacoesDoDia = locacoes.filter(
      (l) =>
        l.data_locacao === formData.data_locacao && l.equipamento_id === eq.id,
    );
    let quantidadeEmUso = 0;
    locacoesDoDia.forEach((l) => {
      const lInicio = l.dia_inteiro ? "00:00" : l.hora_inicio || "00:00";
      const lFim = l.dia_inteiro ? "23:59" : l.hora_fim || "23:59";
      const nInicio = diaInteiro ? "00:00" : horaInicio || "00:00";
      const nFim = diaInteiro ? "23:59" : horaFim || "23:59";
      if (nInicio < lFim && lInicio < nFim) quantidadeEmUso += 1;
    });
    return { ...eq, disponivel: eq.quantidade_total - quantidadeEmUso };
  });

  const handleSalvar = async () => {
    if (!formData.equipamento_id || !formData.sala || !coligadaAtual)
      return Swal.fire(
        "Atenção",
        "Preencha todos os campos obrigatórios.",
        "warning",
      );

    setSalvando(true);
    const { error } = await supabase.from("locacoes").insert([
      {
        ...formData,
        solicitante: userName,
        user_id: user?.id,
        sede_id: coligadaAtual.id,
        dia_inteiro: diaInteiro,
        hora_inicio: diaInteiro ? null : horaInicio,
        hora_fim: diaInteiro ? null : horaFim,
      },
    ]);

    if (error) {
      Swal.fire("Erro", error.message, "error");
    } else {
      setModalOpen(false);
      carregarDados();
      Swal.fire({
        title: "Confirmado!",
        text: "Reserva realizada com sucesso.",
        icon: "success",
        confirmButtonColor: "#4f46e5",
      });
    }
    setSalvando(false);
  };

  const deletarLocacao = async (id: string) => {
    const result = await Swal.fire({
      title: "Cancelar Reserva?",
      text: "Esta ação não poderá ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, cancelar!",
      cancelButtonText: "Manter reserva",
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from("locacoes").delete().eq("id", id);
      if (error) {
        Swal.fire("Erro", "Sem permissão para cancelar esta locação.", "error");
      } else {
        carregarDados();
        Swal.fire("Cancelada!", "A reserva foi removida.", "success");
      }
    }
  };

  if (loadingColigadas)
    return (
      <div className="flex items-center justify-center h-full italic text-blue-600 dark:text-blue-400">
        <Loader2 className="animate-spin mr-2" /> Sincronizando Unidade...
      </div>
    );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-950 min-h-full flex flex-col font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 dark:border-slate-700 pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-slate-200 flex items-center gap-2">
            <Projector className="text-indigo-600" size={28} /> Locação
            Multimídia
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 uppercase">
            Unidade:{" "}
            <b className="text-blue-600 dark:text-blue-400">
              {coligadaAtual?.nome}
            </b>
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Plus size={18} /> Reservar Equipamento
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-4 items-center mb-6 text-[11px] font-bold text-slate-700 dark:text-slate-300 overflow-x-auto">
        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
          <input
            type="radio"
            checked={filtro === "hoje"}
            onChange={() => setFiltro("hoje")}
            className="w-4 h-4 accent-indigo-600"
          />{" "}
          Hoje
        </label>
        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
          <input
            type="radio"
            checked={filtro === "semana"}
            onChange={() => setFiltro("semana")}
            className="w-4 h-4 accent-indigo-600"
          />{" "}
          7 Dias
        </label>
        <label className="flex items-center gap-2 shrink-0 border-l border-slate-200 dark:border-slate-700 pl-4 cursor-pointer">
          <input
            type="radio"
            checked={filtro === "especifico"}
            onChange={() => setFiltro("especifico")}
            className="w-4 h-4 accent-indigo-600"
          />{" "}
          Data:
        </label>
        <input
          type="date"
          disabled={filtro !== "especifico"}
          value={dataBusca}
          onChange={(e) => setDataBusca(e.target.value)}
          className="border border-slate-200 dark:border-slate-700 p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="text-center text-indigo-600 dark:text-indigo-400 font-bold animate-pulse py-10">
            Carregando agenda de {coligadaAtual?.sigla}...
          </div>
        ) : locacoes.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            Nenhuma reserva para este período.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {locacoes.map((loc) => (
              <div
                key={loc.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-4 border-l-indigo-600 p-4 rounded-xl shadow-sm relative animate-in fade-in duration-300"
              >
                <div className="absolute top-3 right-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                  {new Date(loc.data_locacao + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </div>
                <div className="flex items-start gap-3 mb-3 pr-20">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-lg shrink-0 border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                    {getIconForEquipamento(loc.equipamento?.nome || "")}
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-slate-200 text-base uppercase leading-tight pt-1 truncate">
                    {loc.equipamento?.nome}
                  </h3>
                </div>
                <p className="text-indigo-600 dark:text-indigo-400 font-black text-xs mb-1 uppercase tracking-tight">
                  SALA / LOCAL: {loc.sala}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 mb-3 bg-slate-100 dark:bg-slate-700 w-fit px-2.5 py-1 rounded-full">
                  <Clock size={12} />{" "}
                  {loc.dia_inteiro
                    ? "DIA INTEIRO"
                    : `${loc.hora_inicio} - ${loc.hora_fim}`}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 italic font-medium leading-relaxed">
                  "{loc.observacao}"
                </p>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <span className="truncate max-w-[200px]">
                    Por:{" "}
                    <b className="text-slate-600 dark:text-slate-300">
                      {loc.solicitante}
                    </b>
                  </span>
                  {(isAdmin || loc.user_id === user?.id) && (
                    <button
                      onClick={() => deletarLocacao(loc.id)}
                      className="bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 p-2 rounded-lg transition-all shadow-sm active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shadow-lg">
              <h2 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <Plus size={18} /> Reservar Equipamento
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="bg-white/20 hover:bg-white/40 p-1 rounded-full transition-all text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="font-black text-[10px] uppercase text-slate-400 tracking-widest ml-1">
                  1. Data da Reserva
                </label>
                <input
                  type="date"
                  value={formData.data_locacao}
                  onChange={(e) =>
                    setFormData({ ...formData, data_locacao: e.target.value })
                  }
                  className="w-full border-2 border-slate-100 dark:border-slate-800 p-3 rounded-xl font-black text-slate-900 dark:text-slate-200 focus:border-indigo-500 outline-none bg-slate-50 dark:bg-slate-800 transition-all shadow-inner"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                <label className="flex items-center gap-2 mb-3 cursor-pointer text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-tighter">
                  <input
                    type="checkbox"
                    checked={diaInteiro}
                    onChange={(e) => setDiaInteiro(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded"
                  />{" "}
                  Reservar Dia Inteiro
                </label>
                {!diaInteiro && (
                  <div className="flex gap-4 animate-in slide-in-from-top-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                        Início
                      </label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-900 dark:text-slate-200 font-bold bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                        Término
                      </label>
                      <input
                        type="time"
                        value={horaFim}
                        onChange={(e) => setHoraFim(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-900 dark:text-slate-200 font-bold bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-black text-[10px] uppercase text-slate-400 tracking-widest ml-1">
                  2. Equipamento ({coligadaAtual?.sigla})
                </label>
                <select
                  value={formData.equipamento_id}
                  onChange={(e) =>
                    setFormData({ ...formData, equipamento_id: e.target.value })
                  }
                  className="w-full border-2 border-slate-100 dark:border-slate-800 p-3 rounded-xl font-black text-slate-900 dark:text-slate-200 focus:border-indigo-500 outline-none bg-slate-50 dark:bg-slate-800 transition-all shadow-inner"
                >
                  <option value="">Selecione o item...</option>
                  {equipamentosDisponiveis.map((eq) => (
                    <option
                      key={eq.id}
                      value={eq.id}
                      disabled={eq.disponivel <= 0}
                      className="font-black"
                    >
                      {eq.nome} ({eq.disponivel} disponíveis)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-black text-[10px] uppercase text-slate-400 tracking-widest ml-1">
                  3. Sala / Destino
                </label>
                <input
                  type="text"
                  placeholder="EX: SALA 05, AUDITÓRIO..."
                  value={formData.sala}
                  onChange={(e) =>
                    setFormData({ ...formData, sala: e.target.value })
                  }
                  className="w-full border-2 border-slate-100 dark:border-slate-800 p-3 rounded-xl font-black text-slate-900 dark:text-slate-200 uppercase focus:border-indigo-500 outline-none bg-slate-50 dark:bg-slate-800 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="font-black text-[10px] uppercase text-slate-400 tracking-widest ml-1">
                  4. Observações do CPD
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva cabos ou adaptadores necessários..."
                  value={formData.observacao}
                  onChange={(e) =>
                    setFormData({ ...formData, observacao: e.target.value })
                  }
                  className="w-full border-2 border-slate-100 dark:border-slate-800 p-3 rounded-xl font-medium text-slate-900 dark:text-slate-200 focus:border-indigo-500 outline-none bg-slate-50 dark:bg-slate-800 transition-all resize-none shadow-inner"
                />
              </div>

              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl uppercase shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
              >
                {salvando ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {salvando ? "Confirmando..." : "Confirmar Reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
