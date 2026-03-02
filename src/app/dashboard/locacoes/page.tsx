"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx"; // <-- Importação do Excel adicionada!
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
  Download, // <-- Ícone de download adicionado!
} from "lucide-react";

export default function LocacoesPage() {
  const { user } = useAuth();
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

  // Datas limite para o calendário (Hoje até Hoje + 7 dias)
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

  useEffect(() => {
    carregarDados();
  }, [filtro, dataBusca]);

  const carregarDados = async () => {
    setLoading(true);

    const { data: eqData } = await supabase
      .from("equipamentos")
      .select("*")
      .order("nome");
    if (eqData) setEquipamentos(eqData);

    let query = supabase
      .from("locacoes")
      .select("*, equipamento:equipamentos(nome)")
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
      !formData.observacao
    ) {
      return alert("Preencha todos os campos obrigatórios.");
    }
    if (!diaInteiro && (!horaInicio || !horaFim)) {
      return alert(
        "Preencha a hora de início e a hora do término, ou marque 'Dia Inteiro'.",
      );
    }
    if (!diaInteiro && horaInicio >= horaFim) {
      return alert(
        "A hora de início não pode ser maior ou igual à hora de término.",
      );
    }

    const agora = new Date();
    const isHoje = formData.data_locacao === minDateStr;

    if (isHoje && !diaInteiro) {
      const horaAtual = agora.getHours();
      const minAtual = agora.getMinutes();
      const [hInicio, mInicio] = horaInicio.split(":").map(Number);

      const minutosAgora = horaAtual * 60 + minAtual;
      const minutosInicio = hInicio * 60 + mInicio;

      if (minutosInicio - minutosAgora < 60) {
        return alert(
          "ATENÇÃO: A locação deve ser feita com pelo menos 1 hora de antecedência do horário de uso!",
        );
      }
    }

    setSalvando(true);
    const { error } = await supabase.from("locacoes").insert([
      {
        ...formData,
        solicitante: userName,
        user_id: user?.id,
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
      setHoraInicio("");
      setHoraFim("");
      setDiaInteiro(true);
      carregarDados();
    }
    setSalvando(false);
  };

  const deletarLocacao = async (id: string) => {
    if (
      window.confirm(
        "Tem certeza que deseja cancelar esta locação? O equipamento será liberado para outros.",
      )
    ) {
      const { error } = await supabase.from("locacoes").delete().eq("id", id);
      if (error) alert("Você não tem permissão para apagar esta locação.");
      else carregarDados();
    }
  };

  // --- NOVA FUNÇÃO: EXPORTAR PARA EXCEL ---
  const exportarParaExcel = () => {
    if (locacoes.length === 0) {
      return alert("Não há locações listadas para exportar.");
    }

    // Prepara os dados limpos para a planilha
    const dadosExcel = locacoes.map((loc) => ({
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

    // Cria a planilha e o arquivo
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Locacoes");

    // Define o nome do arquivo baseado no filtro
    let nomeArquivo = `Relatorio_Locacoes_${filtro}.xlsx`;
    if (filtro === "especifico") {
      nomeArquivo = `Relatorio_Locacoes_${dataBusca.split("-").reverse().join("-")}.xlsx`;
    }

    // Faz o download do arquivo
    XLSX.writeFile(workbook, nomeArquivo);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full flex flex-col font-sans">
      <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Projector className="text-indigo-600" size={28} /> Locação
            Multimídia
          </h1>
          <p className="text-sm text-gray-500">
            Agendamento de equipamentos para sala de aula.
          </p>
        </div>

        {/* GRUPO DE BOTÕES NO TOPO */}
        <div className="flex items-center gap-3">
          <button
            onClick={exportarParaExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2 transition-colors"
            title="Exportar dados atuais para Excel"
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
            name="filtro"
            checked={filtro === "hoje"}
            onChange={() => setFiltro("hoje")}
            className="accent-indigo-600"
          />{" "}
          Locações de Hoje
        </label>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="radio"
            name="filtro"
            checked={filtro === "semana"}
            onChange={() => setFiltro("semana")}
            className="accent-indigo-600"
          />{" "}
          Próximos 7 Dias
        </label>
        <label className="flex items-center gap-2 cursor-pointer border-l pl-4 shrink-0">
          <input
            type="radio"
            name="filtro"
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
          className="border p-1 rounded outline-none disabled:opacity-50 text-gray-800 bg-white"
        />
      </div>

      {/* LISTA DE LOCAÇÕES */}
      <div className="flex-1">
        {loading ? (
          <div className="text-center text-indigo-600 font-bold mt-10 animate-pulse">
            Carregando agenda...
          </div>
        ) : locacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-400 gap-3">
            <Calendar size={48} className="opacity-50" />
            <p className="font-bold">
              Nenhuma locação agendada para este período.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {locacoes.map((loc) => {
              const dataFormatada = new Date(
                loc.data_locacao + "T12:00:00",
              ).toLocaleDateString("pt-BR");
              const isOwner = loc.user_id === user?.id;

              return (
                <div
                  key={loc.id}
                  className="bg-white border-l-4 border-indigo-600 p-4 rounded shadow-sm relative"
                >
                  <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-800 text-[10px] font-black px-2 py-1 rounded">
                    {dataFormatada}
                  </div>
                  <h3 className="font-black text-gray-800 text-lg uppercase">
                    {loc.equipamento?.nome}
                  </h3>
                  <p className="text-indigo-600 font-bold text-sm mb-1">
                    SALA: {loc.sala}
                  </p>

                  <div className="flex items-center gap-1 text-xs font-bold text-gray-500 mb-3 bg-gray-100 w-fit px-2 py-1 rounded">
                    <Clock size={12} />
                    {loc.dia_inteiro
                      ? "DIA INTEIRO"
                      : `De ${loc.hora_inicio} às ${loc.hora_fim}`}
                  </div>

                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border mb-3">
                    <span className="font-bold block">Observação:</span>{" "}
                    {loc.observacao}
                  </p>

                  <div className="flex justify-between items-center mt-2 pt-2 border-t text-xs text-gray-500 font-medium">
                    <span>
                      Solicitado por:{" "}
                      <b className="text-gray-700">{loc.solicitante}</b>
                    </span>

                    {(isAdmin || isOwner) && (
                      <button
                        onClick={() => deletarLocacao(loc.id)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Cancelar Locação"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                  className="w-full border p-2 rounded bg-white outline-none focus:border-indigo-600 font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  * Permite reservas para no máximo 7 dias à frente.
                </p>
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
                  />
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
                        className="w-full border p-2 rounded outline-none focus:border-indigo-600"
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
                        className="w-full border p-2 rounded outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-orange-500 mt-2 font-bold">
                  * Locações devem ser feitas com no mínimo 1h de antecedência.
                </p>
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
                  className="w-full border p-2 rounded bg-white outline-none focus:border-indigo-600 font-bold"
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
                        ? `(${eq.disponivel} disponíveis neste horário)`
                        : "(ESGOTADO PARA ESTE HORÁRIO)"}
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
                  className="w-full border p-2 rounded bg-white outline-none focus:border-indigo-600 uppercase"
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
                  className="w-full border p-2 rounded bg-white outline-none focus:border-indigo-600 resize-none"
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
