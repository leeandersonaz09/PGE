"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import * as XLSX from "xlsx";
import {
  Archive,
  Download,
  Calendar,
  Search,
  Loader2,
  Clock,
} from "lucide-react";

export default function HistoricoLocacoesPage() {
  const { coligadaAtual, loadingColigadas } = useColigada();
  const [locacoes, setLocacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(hoje.getDate() - 30);

  const [dataInicio, setDataInicio] = useState(
    trintaDiasAtras.toISOString().split("T")[0],
  );
  const [dataFim, setDataFim] = useState(hoje.toISOString().split("T")[0]);

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
        .eq("sede_id", coligadaAtual.id)
        .gte("data_locacao", dataInicio)
        .lte("data_locacao", dataFim)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLocacoes(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const exportarParaExcel = () => {
    if (locacoes.length === 0) return alert("Não há dados para exportar.");

    const dadosExcel = locacoes.map((loc) => ({
      Unidade: coligadaAtual?.sigla || "",
      "Data de Uso": new Date(
        loc.data_locacao + "T12:00:00",
      ).toLocaleDateString("pt-BR"),
      Horário: loc.dia_inteiro
        ? "Dia Inteiro"
        : `De ${loc.hora_inicio} às ${loc.hora_fim}`,
      Equipamento: loc.equipamento?.nome || "Apagado",
      Sala: loc.sala,
      Solicitante: loc.solicitante,
      "Registrado em": new Date(loc.created_at).toLocaleString("pt-BR"),
      Observação: loc.observacao,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Locacoes");
    XLSX.writeFile(workbook, `Historico_Locacoes_${coligadaAtual?.sigla}.xlsx`);
  };

  if (loadingColigadas)
    return (
      <div className="p-10 text-center italic text-blue-600 dark:text-blue-400">
        Sincronizando...
      </div>
    );

  return (
    <div className="p-6 bg-gray-50 dark:bg-slate-950 min-h-full flex flex-col font-sans">
      <div className="flex justify-between items-center border-b border-gray-300 dark:border-slate-700 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-slate-200 flex items-center gap-2">
            <Archive className="text-gray-600 dark:text-slate-400" size={28} />{" "}
            Histórico de Locações
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Unidade:{" "}
            <b className="text-blue-600 dark:text-blue-400 uppercase">
              {coligadaAtual?.nome}
            </b>
          </p>
        </div>
        <button
          onClick={exportarParaExcel}
          className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2 transition-all hover:bg-green-700"
        >
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border dark:border-slate-700 flex flex-wrap gap-4 items-center mb-6 text-[11px] font-bold text-slate-700 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <Calendar size={16} /> De:
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border dark:border-slate-700 p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500"
          />
        </label>
        <label className="flex items-center gap-2">
          Até:
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border dark:border-slate-700 p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500"
          />
        </label>
        <button
          onClick={buscarHistorico}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Search size={14} /> Buscar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-indigo-500">
          <Loader2 className="animate-spin inline-block mr-2" /> Carregando...
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 dark:bg-slate-800 border-b dark:border-slate-700 text-gray-700 dark:text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3 border-r dark:border-slate-700">
                  Uso (Data)
                </th>
                <th className="p-3 border-r dark:border-slate-700">Horário</th>
                <th className="p-3 border-r dark:border-slate-700">
                  Equipamento
                </th>
                <th className="p-3 border-r dark:border-slate-700">
                  Solicitante
                </th>
                <th className="p-3 border-r dark:border-slate-700 text-center">
                  Registrado em
                </th>
                <th className="p-3">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-gray-800 dark:text-slate-300">
              {locacoes.map((loc) => (
                <tr
                  key={loc.id}
                  className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <td className="p-3 font-bold text-gray-900 dark:text-slate-100">
                    {new Date(loc.data_locacao + "T12:00:00").toLocaleDateString(
                      "pt-BR",
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${loc.dia_inteiro ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"}`}
                    >
                      {loc.dia_inteiro
                        ? "Dia Inteiro"
                        : `${loc.hora_inicio} às ${loc.hora_fim}`}
                    </span>
                  </td>
                  <td className="p-3 font-medium uppercase">
                    {loc.equipamento?.nome}
                  </td>
                  <td className="p-3 font-bold text-gray-600 dark:text-slate-400">
                    {loc.solicitante}
                  </td>
                  <td className="p-3 text-center text-[10px] text-gray-400 dark:text-slate-500 font-mono leading-tight">
                    {new Date(loc.created_at).toLocaleDateString("pt-BR")}
                    <br />
                    {new Date(loc.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td
                    className="p-3 text-[11px] text-gray-500 dark:text-slate-400 italic max-w-xs truncate"
                    title={loc.observacao}
                  >
                    {loc.observacao}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
