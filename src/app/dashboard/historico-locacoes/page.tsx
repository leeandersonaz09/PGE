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
        .order("created_at", { ascending: false }); // Ordenado pelo registro mais recente

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
      "Registrado em": new Date(loc.created_at).toLocaleString("pt-BR"), // Adicionado no Excel
      Observação: loc.observacao,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Locacoes");
    XLSX.writeFile(workbook, `Historico_Locacoes_${coligadaAtual?.sigla}.xlsx`);
  };

  if (loadingColigadas)
    return (
      <div className="p-10 text-center italic text-blue-600">
        Sincronizando...
      </div>
    );

  return (
    <div className="p-6 bg-gray-50 min-h-full flex flex-col font-sans">
      {/* ... Cabeçalho e Filtros permanecem iguais ... */}
      <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Archive className="text-gray-600" size={28} /> Histórico de
            Locações
          </h1>
          <p className="text-sm text-gray-500">
            Unidade:{" "}
            <b className="text-blue-600 uppercase">{coligadaAtual?.nome}</b>
          </p>
        </div>
        <button
          onClick={exportarParaExcel}
          className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2 transition-all"
        >
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      <div className="bg-white border rounded shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 border-b text-gray-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3 border-r border-gray-200">Uso (Data)</th>
              <th className="p-3 border-r border-gray-200">Horário</th>
              <th className="p-3 border-r border-gray-200">Equipamento</th>
              <th className="p-3 border-r border-gray-200">Solicitante</th>
              <th className="p-3 border-r border-gray-200 text-center">
                Registrado em
              </th>{" "}
              {/* NOVA COLUNA */}
              <th className="p-3">Obs.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-800">
            {locacoes.map((loc) => (
              <tr
                key={loc.id}
                className="hover:bg-blue-50/30 transition-colors"
              >
                <td className="p-3 font-bold text-gray-900">
                  {new Date(loc.data_locacao + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </td>
                <td className="p-3 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${loc.dia_inteiro ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {loc.dia_inteiro
                      ? "Dia Inteiro"
                      : `${loc.hora_inicio} às ${loc.hora_fim}`}
                  </span>
                </td>
                <td className="p-3 font-medium uppercase">
                  {loc.equipamento?.nome}
                </td>
                <td className="p-3 font-bold text-gray-600">
                  {loc.solicitante}
                </td>

                {/* EXIBIÇÃO DA DATA/HORA DE REGISTRO QUE JÁ ESTÁ NO BANCO */}
                <td className="p-3 text-center text-[10px] text-gray-400 font-mono leading-tight">
                  {new Date(loc.created_at).toLocaleDateString("pt-BR")}
                  <br />
                  {new Date(loc.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>

                <td
                  className="p-3 text-[11px] text-gray-500 italic max-w-xs truncate"
                  title={loc.observacao}
                >
                  {loc.observacao}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
