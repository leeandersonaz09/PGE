"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext"; // <-- Importado o contexto
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
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

// --- FUNÇÃO PARA ESCOLHER O ÍCONE ---
const getIconForEquipamento = (nome: string) => {
  const n = nome.toLowerCase();
  if (
    n.includes("projetor") ||
    n.includes("data show") ||
    n.includes("datashow")
  ) {
    return <Projector size={24} className="text-indigo-600" />;
  }
  if (
    n.includes("notebook") ||
    n.includes("chromebook") ||
    n.includes("laptop") ||
    n.includes("pc")
  ) {
    return <Laptop size={24} className="text-indigo-600" />;
  }
  if (
    n.includes("caixa") ||
    n.includes("som") ||
    n.includes("áudio") ||
    n.includes("audio") ||
    n.includes("microfone")
  ) {
    return <Speaker size={24} className="text-indigo-600" />;
  }
  if (
    n.includes("tv") ||
    n.includes("televisão") ||
    n.includes("monitor") ||
    n.includes("tela")
  ) {
    return <Tv size={24} className="text-indigo-600" />;
  }
  return <Package size={24} className="text-indigo-600" />;
};

export default function LocacoesPage() {
  const { user } = useAuth();
  const { coligadaAtual, loadingColigadas } = useColigada(); // <-- Puxamos a unidade ativa
  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuário";

  const [locacoes, setLocacoes] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filtros
  const [filtro, setFiltro] = useState<"hoje" | "semana" | "especifico">(
    "hoje",
  );
  const [dataBusca, setDataBusca] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Modal de Nova Locação
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

  const hoje = new Date();
  const maxDate = new Date();
  maxDate.setDate(hoje.getDate() + 7);
  const minDateStr = hoje.toISOString().split("T")[0];
  const maxDateStr = maxDate.toISOString().split("T")[0];

  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("permissoes_usuarios")
          .select("is_admin")
          .eq("user_id", user.id)
          .single();
        if (data) setIsAdmin(data.is_admin);
      }
    };
    checkAdmin();
  }, [user]);

  // Sincroniza busca com Filtros, Data e agora a Sede selecionada
  useEffect(() => {
    if (coligadaAtual) {
      carregarDados();
    }
  }, [filtro, dataBusca, coligadaAtual]);

  const carregarDados = async () => {
    if (!coligadaAtual) return;
    setLoading(true);

    // 1. Busca equipamentos (Pode ser global ou por sede, depende da sua tabela)
    const { data: eqData } = await supabase
      .from("equipamentos")
      .select("*")
      .order("nome");
    if (eqData) setEquipamentos(eqData);

    // 2. Busca locações FILTRADAS POR SEDE
    let query = supabase
      .from("locacoes")
      .select("*, equipamento:equipamentos(nome)")
      .eq("sede_id", coligadaAtual.id) // <-- FILTRO DE SEDE ATIVO
      .order("data_locacao", { ascending: true });

    const hojeStr = new Date().toISOString().split("T")[0];

    if (filtro === "hoje") {
      query = query.eq("data_locacao", hojeStr);
    } else if (filtro === "semana") {
      const fimSemana = new Date();
      fimSemana.setDate(hoje.getDate() + 7);
      query = query
        .gte("data_locacao", hojeStr)
        .lte("data_locacao", fimSemana.toISOString().split("T")[0]);
    } else if (filtro === "especifico" && dataBusca) {
      query = query.eq("data_locacao", dataBusca);
    }

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

      if (nInicio < lFim && lInicio < nFim) {
        quantidadeEmUso += 1;
      }
    });

    return {
      ...eq,
      disponivel: eq.quantidade_total - quantidadeEmUso,
    };
  });

  const handleSalvar = async () => {
    if (
      !formData.equipamento_id ||
      !formData.sala ||
      !formData.data_locacao ||
      !formData.observacao ||
      !coligadaAtual
    ) {
      return alert("Preencha todos os campos obrigatórios.");
    }
    if (!diaInteiro && (!horaInicio || !horaFim)) {
      return alert("Preencha o horário da reserva.");
    }
    if (!diaInteiro && horaInicio >= horaFim) {
      return alert("A hora de início não pode ser maior que a de término.");
    }

    setSalvando(true);
    const { error } = await supabase.from("locacoes").insert([
      {
        ...formData,
        solicitante: userName,
        user_id: user?.id,
        sede_id: coligadaAtual.id, // <-- AGORA SALVA O ID DA SEDE ATUAL
        dia_inteiro: diaInteiro,
        hora_inicio: diaInteiro ? null : horaInicio,
        hora_fim: diaInteiro ? null : horaFim,
      },
    ]);

    if (error) {
      alert("Erro ao salvar locação: " + error.message);
    } else {
      setModalOpen(false);
      setFormData({
        equipamento_id: "",
        sala: "",
        data_locacao: minDateStr,
        observacao: "",
      });
      setDiaInteiro(true);
      carregarDados();
    }
    setSalvando(false);
  };

  const deletarLocacao = async (id: string) => {
    if (window.confirm("Tem certeza que deseja cancelar esta locação?")) {
      const { error } = await supabase.from("locacoes").delete().eq("id", id);
      if (error) alert("Você não tem permissão para apagar esta locação.");
      else carregarDados();
    }
  };

  const exportarParaExcel = () => {
    if (locacoes.length === 0) return alert("Não há locações para exportar.");
    const dadosExcel = locacoes.map((loc) => ({
      Unidade: coligadaAtual?.sigla || "",
      "Data da Locação": new Date(
        loc.data_locacao + "T12:00:00",
      ).toLocaleDateString("pt-BR"),
      Equipamento: loc.equipamento?.nome || "Equipamento Apagado",
      Sala: loc.sala,
      Horário: loc.dia_inteiro
        ? "Dia Inteiro"
        : `De ${loc.hora_inicio} às ${loc.hora_fim}`,
      Solicitante: loc.solicitante,
      Observação: loc.observacao,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Locacoes");
    XLSX.writeFile(workbook, `Locacoes_${coligadaAtual?.sigla}_${filtro}.xlsx`);
  };

  if (loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full text-blue-600 font-bold italic">
        <Loader2 className="animate-spin mr-2" size={24} /> Sincronizando
        Unidade...
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full flex flex-col font-sans">
      <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Projector className="text-indigo-600" size={28} /> Locação
            Multimídia
          </h1>
          <p className="text-sm text-gray-500">
            Unidade Atual:{" "}
            <span className="font-bold text-blue-600 uppercase">
              {coligadaAtual?.nome}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportarParaExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2 transition-colors"
          >
            <Download size={18} /> Exportar
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Nova Locação
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-3 rounded shadow-sm border flex gap-4 items-center mb-6 text-sm font-bold text-gray-700 overflow-x-auto">
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="radio"
            checked={filtro === "hoje"}
            onChange={() => setFiltro("hoje")}
            className="accent-indigo-600"
          />{" "}
          Locações de Hoje
        </label>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="radio"
            checked={filtro === "semana"}
            onChange={() => setFiltro("semana")}
            className="accent-indigo-600"
          />{" "}
          Próximos 7 Dias
        </label>
        <label className="flex items-center gap-2 cursor-pointer border-l pl-4 shrink-0">
          <input
            type="radio"
            checked={filtro === "especifico"}
            onChange={() => setFiltro("especifico")}
            className="accent-indigo-600"
          />{" "}
          Dia Específico:
        </label>
        <input
          type="date"
          disabled={filtro !== "especifico"}
          value={dataBusca}
          onChange={(e) => setDataBusca(e.target.value)}
          className="border p-1 rounded bg-white"
        />
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="text-center text-indigo-600 font-bold mt-10 animate-pulse">
            Carregando agenda de {coligadaAtual?.sigla}...
          </div>
        ) : locacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-400 gap-3">
            <Calendar size={48} className="opacity-50" />
            <p className="font-bold">
              Nenhuma locação agendada nesta unidade para este período.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {locacoes.map((loc) => (
              <div
                key={loc.id}
                className="bg-white border-l-4 border-indigo-600 p-4 rounded shadow-sm relative pt-5"
              >
                <div className="absolute top-3 right-3 bg-indigo-50 text-indigo-800 text-[10px] font-black px-2 py-1 rounded">
                  {new Date(loc.data_locacao + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </div>
                <div className="flex items-start gap-3 mb-3 pr-16">
                  <div className="bg-indigo-50 p-2 rounded-md shrink-0 border border-indigo-100 shadow-sm">
                    {getIconForEquipamento(loc.equipamento?.nome || "")}
                  </div>
                  <h3 className="font-black text-gray-800 text-lg uppercase leading-tight pt-1">
                    {loc.equipamento?.nome}
                  </h3>
                </div>
                <p className="text-indigo-600 font-bold text-sm mb-1">
                  SALA: {loc.sala}
                </p>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 mb-3 bg-gray-100 w-fit px-2 py-1 rounded">
                  <Clock size={12} />{" "}
                  {loc.dia_inteiro
                    ? "DIA INTEIRO"
                    : `De ${loc.hora_inicio} às ${loc.hora_fim}`}
                </div>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border mb-3">
                  <span className="font-bold block">Observação:</span>{" "}
                  {loc.observacao}
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t text-xs text-gray-500">
                  <span>
                    Solicitado por:{" "}
                    <b className="text-gray-700">{loc.solicitante}</b>
                  </span>
                  {(isAdmin || loc.user_id === user?.id) && (
                    <button
                      onClick={() => deletarLocacao(loc.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                      title="Cancelar"
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

      {/* MODAL NOVA LOCAÇÃO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
              <h2 className="font-black flex items-center gap-2">
                <Plus size={18} /> Reservar Equipamento
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="hover:text-red-300"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-gray-800 text-sm">
              <div>
                <label className="font-bold text-xs uppercase text-gray-500 mb-1 block">
                  1. Data da Utilização
                </label>
                <input
                  type="date"
                  min={minDateStr}
                  max={maxDateStr}
                  value={formData.data_locacao}
                  onChange={(e) =>
                    setFormData({ ...formData, data_locacao: e.target.value })
                  }
                  className="w-full border p-2 rounded bg-white font-bold"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded border">
                <label className="font-bold text-xs uppercase text-gray-500 mb-2 block">
                  2. Horário da Reserva
                </label>
                <label className="flex items-center gap-2 mb-3 cursor-pointer text-sm font-bold text-indigo-700">
                  <input
                    type="checkbox"
                    checked={diaInteiro}
                    onChange={(e) => setDiaInteiro(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />{" "}
                  Reservar para o Dia Inteiro
                </label>
                {!diaInteiro && (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500">
                        Início:
                      </label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        className="w-full border p-2 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500">
                        Término:
                      </label>
                      <input
                        type="time"
                        value={horaFim}
                        onChange={(e) => setHoraFim(e.target.value)}
                        className="w-full border p-2 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="font-bold text-xs uppercase text-gray-500 mb-1 block">
                  3. Equipamento
                </label>
                <select
                  value={formData.equipamento_id}
                  onChange={(e) =>
                    setFormData({ ...formData, equipamento_id: e.target.value })
                  }
                  className="w-full border p-2 rounded bg-white font-bold"
                >
                  <option value="">Selecione...</option>
                  {equipamentosDisponiveis.map((eq) => (
                    <option
                      key={eq.id}
                      value={eq.id}
                      disabled={eq.disponivel <= 0}
                    >
                      {eq.nome}{" "}
                      {eq.disponivel > 0
                        ? `(${eq.disponivel} disp.)`
                        : "(ESGOTADO)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-xs uppercase text-gray-500 mb-1 block">
                  4. Sala de Aula
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sala 12, Laboratório..."
                  value={formData.sala}
                  onChange={(e) =>
                    setFormData({ ...formData, sala: e.target.value })
                  }
                  className="w-full border p-2 rounded bg-white uppercase"
                />
              </div>
              <div>
                <label className="font-bold text-xs uppercase text-gray-500 mb-1 block">
                  5. Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Precisa de cabo HDMI."
                  value={formData.observacao}
                  onChange={(e) =>
                    setFormData({ ...formData, observacao: e.target.value })
                  }
                  className="w-full border p-2 rounded bg-white resize-none"
                ></textarea>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 font-bold text-sm text-gray-600 hover:bg-gray-200 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 font-bold text-sm rounded shadow flex items-center gap-2 disabled:bg-gray-400"
              >
                {salvando ? (
                  "Salvando..."
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirmar Reserva
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
