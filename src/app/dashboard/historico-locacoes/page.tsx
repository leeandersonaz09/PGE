"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { Archive, Download, Calendar, Search } from "lucide-react";

export default function HistoricoLocacoesPage() {
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

  useEffect(() => {
    buscarHistorico();
  }, []); // Carrega inicial. A busca por filtro será no botão "Pesquisar"

  const buscarHistorico = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("locacoes")
      .select("*, equipamento:equipamentos(nome)")
      .gte("data_locacao", dataInicio)
      .lte("data_locacao", dataFim)
      .order("data_locacao", { ascending: false }); // Ordem decrescente (mais recentes primeiro)

    if (data) setLocacoes(data);
    setLoading(false);
  };

  const exportarParaExcel = () => {
    if (locacoes.length === 0)
      return alert("Não há dados para exportar neste período.");

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

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HistoricoLocacoes");

    const nomeArquivo = `Historico_Locacoes_${dataInicio}_a_${dataFim}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full flex flex-col font-sans">
      <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Archive className="text-gray-600" size={28} /> Histórico de
            Locações
          </h1>
          <p className="text-sm text-gray-500">
            Relatório geral e auditoria de equipamentos multimidia.
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
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border p-2 rounded outline-none text-gray-800 font-medium"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border p-2 rounded outline-none text-gray-800 font-medium"
          />
        </div>
        <button
          onClick={buscarHistorico}
          className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-colors"
        >
          <Search size={16} /> Pesquisar Período
        </button>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="flex-1 bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b text-gray-700 font-bold uppercase text-[11px]">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Equipamento</th>
              <th className="p-3">Horário</th>
              <th className="p-3">Sala</th>
              <th className="p-3">Solicitante</th>
              <th className="p-3">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-800">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center font-bold text-gray-400 animate-pulse"
                >
                  Buscando registros no banco de dados...
                </td>
              </tr>
            ) : locacoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar size={32} className="opacity-50" />
                    <span>
                      Nenhum registro encontrado no período selecionado.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              locacoes.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold">
                    {new Date(
                      loc.data_locacao + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="p-3 uppercase font-medium">
                    {loc.equipamento?.nome || "Equipamento Apagado"}
                  </td>
                  <td className="p-3 text-xs">
                    {loc.dia_inteiro
                      ? "Dia Inteiro"
                      : `${loc.hora_inicio} às ${loc.hora_fim}`}
                  </td>
                  <td className="p-3 uppercase">{loc.sala}</td>
                  <td className="p-3 font-bold text-gray-600">
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
