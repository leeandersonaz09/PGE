"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext"; // <-- Importação do contexto
import * as XLSX from "xlsx";
import { Archive, Download, Calendar, Search, Loader2 } from "lucide-react";

export default function HistoricoLocacoesPage() {
  const { coligadaAtual, loadingColigadas } = useColigada(); // <-- Acesso ao contexto global
  const [locacoes, setLocacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros padrão: Últimos 30 dias até hoje
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(hoje.getDate() - 30);

  const [dataInicio, setDataInicio] = useState(
    trintaDiasAtras.toISOString().split("T")[0],
  );
  const [dataFim, setDataFim] = useState(hoje.toISOString().split("T")[0]);

  // Sincroniza a busca sempre que a sede mudar no Header
  useEffect(() => {
    if (coligadaAtual) {
      buscarHistorico();
    }
  }, [coligadaAtual]);

  const buscarHistorico = async () => {
    if (!coligadaAtual) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("locacoes")
        .select("*, equipamento:equipamentos(nome)")
        .eq("sede_id", coligadaAtual.id) // <-- FILTRO DE UNIDADE ATIVO
        .gte("data_locacao", dataInicio)
        .lte("data_locacao", dataFim)
        .order("data_locacao", { ascending: false });

      if (!error && data) {
        setLocacoes(data);
      }
    } catch (err) {
      console.error("Erro na busca:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportarParaExcel = () => {
    if (locacoes.length === 0)
      return alert("Não há dados para exportar neste período.");

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
    XLSX.utils.book_append_sheet(workbook, worksheet, "HistoricoLocacoes");

    // Nome do arquivo dinâmico com a sigla da unidade
    const nomeArquivo = `Historico_Locacoes_${coligadaAtual?.sigla}_${dataInicio}_a_${dataFim}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
  };

  if (loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full text-blue-600 font-bold italic">
        <Loader2 className="animate-spin mr-2" size={20} />
        Sincronizando Unidade...
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full flex flex-col font-sans">
      <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Archive className="text-gray-600" size={28} /> Histórico de
            Locações
          </h1>
          <p className="text-sm text-gray-500">
            Relatório de auditoria:{" "}
            <span className="font-bold text-blue-600 uppercase">
              {coligadaAtual?.nome}
            </span>
          </p>
        </div>
        <button
          onClick={exportarParaExcel}
          disabled={locacoes.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2 transition-colors disabled:bg-gray-400"
        >
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded shadow-sm border flex flex-wrap gap-4 items-end mb-6">
        <div className="bg-gray-100 px-3 py-2 rounded border border-gray-200">
          <span className="text-[10px] font-black text-blue-600 uppercase block mb-0.5">
            Unidade Selecionada
          </span>
          <span className="text-sm font-black text-gray-800 uppercase">
            {coligadaAtual?.sigla}
          </span>
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border p-2 rounded outline-none text-gray-800 font-medium bg-white"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border p-2 rounded outline-none text-gray-800 font-medium bg-white"
          />
        </div>
        <button
          onClick={buscarHistorico}
          disabled={loading}
          className="bg-gray-800 hover:bg-black text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors h-[42px] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Search size={16} />
          )}
          Pesquisar
        </button>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="flex-1 bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 border-b text-gray-700 font-bold uppercase text-[11px]">
            <tr>
              <th className="p-3 border-r border-gray-200">Data</th>
              <th className="p-3 border-r border-gray-200">Equipamento</th>
              <th className="p-3 border-r border-gray-200">Horário</th>
              <th className="p-3 border-r border-gray-200">Sala</th>
              <th className="p-3 border-r border-gray-200">Solicitante</th>
              <th className="p-3">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-800">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center font-bold text-blue-600 animate-pulse"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    Consultando base de {coligadaAtual?.sigla}...
                  </div>
                </td>
              </tr>
            ) : locacoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar size={32} className="opacity-50" />
                    <span>
                      Nenhuma locação encontrada nesta unidade para o período.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              locacoes.map((loc) => (
                <tr key={loc.id} className="hover:bg-blue-50 transition-colors">
                  <td className="p-3 font-bold border-r border-gray-100">
                    {new Date(
                      loc.data_locacao + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="p-3 uppercase font-medium border-r border-gray-100">
                    {loc.equipamento?.nome || "Equipamento Apagado"}
                  </td>
                  <td className="p-3 text-xs border-r border-gray-100">
                    <span
                      className={`px-2 py-1 rounded-full font-bold ${loc.dia_inteiro ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {loc.dia_inteiro
                        ? "Dia Inteiro"
                        : `${loc.hora_inicio} às ${loc.hora_fim}`}
                    </span>
                  </td>
                  <td className="p-3 uppercase font-bold text-gray-600 border-r border-gray-100">
                    {loc.sala}
                  </td>
                  <td className="p-3 font-bold text-gray-700 border-r border-gray-100">
                    {loc.solicitante}
                  </td>
                  <td
                    className="p-3 text-xs text-gray-500 max-w-xs truncate"
                    title={loc.observacao}
                  >
                    {loc.observacao}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
