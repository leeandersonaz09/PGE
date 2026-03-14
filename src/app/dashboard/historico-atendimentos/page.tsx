"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext"; // <-- Importamos o contexto
import {
  Search,
  Loader2,
  Download,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

export default function HistoricoRepousoPage() {
  const [historico, setHistorico] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);
  const [buscaNome, setBuscaNome] = useState("");

  const { coligadaAtual, loadingColigadas } = useColigada(); // <-- Puxamos a unidade ativa

  useEffect(() => {
    if (coligadaAtual) {
      carregarHistorico();
    }
  }, [coligadaAtual]); // Recarrega sempre que mudar a coligada no Header

  const carregarHistorico = async () => {
    if (!coligadaAtual) return;
    setLoadingDados(true);

    // Busca apenas os que já foram atendidos, junta com os dados do aluno e FILTRA POR SEDE
    const { data, error } = await supabase
      .from("encaminhamentos_repouso")
      .select(
        `
        *,
        aluno:alunos(id, nome, turma, serie)
      `,
      )
      .eq("status", "atendido")
      .eq("sede_id", coligadaAtual.id) // <-- FILTRO MÁGICO DE SEDE
      .order("hora_atendimento", { ascending: false });

    if (!error && data) {
      const formatados = data.map((enc: any) => ({
        ...enc,
        aluno: Array.isArray(enc.aluno) ? enc.aluno[0] : enc.aluno,
      }));
      setHistorico(formatados);
      setResultados(formatados);
    } else {
      console.error("Erro ao carregar histórico", error);
    }

    setLoadingDados(false);
  };

  const realizarBusca = () => {
    if (!buscaNome.trim()) {
      setResultados(historico);
      return;
    }
    const filtrados = historico.filter((item) =>
      item.aluno?.nome?.toLowerCase().includes(buscaNome.toLowerCase()),
    );
    setResultados(filtrados);
  };

  // --- FUNÇÃO DE EXPORTAR PARA EXCEL (CSV) ---
  const exportarExcel = () => {
    const cabecalhos = [
      "Unidade",
      "RA",
      "Nome do Aluno",
      "Série",
      "Turma",
      "Data e Hora do Atendimento",
      "Sintoma / Motivo",
      "Encaminhado Por",
      "Atendido Por",
      "Observações do Atendimento",
      "Destino",
    ];

    const linhas = resultados.map((item) => {
      const dataFormatada = item.hora_atendimento
        ? new Date(item.hora_atendimento).toLocaleString("pt-BR")
        : "";

      return [
        coligadaAtual?.sigla || "",
        item.aluno?.id || "",
        item.aluno?.nome || "",
        `${item.aluno?.serie || ""}º Ano`,
        item.aluno?.turma || "",
        dataFormatada,
        `"${(item.sintoma || "").replace(/"/g, '""')}"`,
        item.encaminhado_por || "",
        item.atendido_por || "",
        `"${(item.obs_atendimento || "").replace(/"/g, '""')}"`,
        item.destino === "sala"
          ? "Liberado para Sala"
          : item.destino === "casa"
            ? "Liberado para Casa"
            : item.destino,
      ];
    });

    const conteudoCsv = [
      cabecalhos.join(";"),
      ...linhas.map((linha) => linha.join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + conteudoCsv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    // Nome do arquivo agora inclui a sigla da unidade
    const nomeArquivo = `Historico_Enfermaria_${coligadaAtual?.sigla}_${new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-")}.csv`;

    link.download = nomeArquivo;
    link.click();
  };

  if (loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full text-[#3182ce] dark:text-blue-400 font-bold italic">
        Sincronizando Unidade...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 font-sans text-[11px] text-gray-800 dark:text-slate-300">
      {/* BARRA SUPERIOR E FILTROS */}
      <div className="bg-slate-200 dark:bg-slate-800 p-2 flex justify-between items-center border-b border-gray-400 dark:border-slate-700">
        <div className="flex gap-2 items-center flex-1">
          {/* Indicador de Unidade Atual */}
          <div className="bg-white dark:bg-slate-700 border border-gray-400 dark:border-slate-600 rounded-sm px-2 h-7 flex items-center font-bold text-blue-700 dark:text-blue-400 uppercase mr-1">
            {coligadaAtual?.sigla}
          </div>

          <input
            type="text"
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && realizarBusca()}
            placeholder={`Buscar em ${coligadaAtual?.nome}...`}
            className="border border-gray-400 dark:border-slate-600 rounded-sm px-2 h-7 w-full max-w-md bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#3182ce]"
          />
          <button
            onClick={realizarBusca}
            className="bg-[#3182ce] text-white px-3 h-7 rounded-sm flex items-center gap-1 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm font-bold"
          >
            <Search size={14} /> BUSCAR
          </button>
        </div>

        <button
          onClick={exportarExcel}
          disabled={resultados.length === 0}
          className="bg-green-600 text-white px-4 h-7 rounded-sm flex items-center gap-2 hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed ml-4"
        >
          <Download size={14} /> EXPORTAR EXCEL
        </button>
      </div>

      {/* ÁREA DA TABELA */}
      <div className="overflow-auto flex-1 bg-gray-50 dark:bg-slate-950">
        {loadingDados ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#3182ce] dark:text-blue-400 italic">
            <Loader2 className="animate-spin" size={24} />
            <span>Consultando base de {coligadaAtual?.nome}...</span>
          </div>
        ) : (
          <table className="w-full border-collapse bg-white dark:bg-slate-900">
            <thead className="sticky top-0 bg-[#f1f5f9] dark:bg-slate-800 z-10 shadow-sm">
              <tr className="border-b border-gray-300 dark:border-slate-700 font-bold text-left uppercase text-gray-600 dark:text-slate-400 text-[10px]">
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 text-center w-16">
                  Data
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 w-20 text-center">
                  RA / Turma
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 min-w-[150px]">
                  Aluno
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 min-w-[200px]">
                  Sintoma
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 min-w-[200px]">
                  Observações (Atendimento)
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 text-center">
                  Destino
                </th>
                <th className="p-2 text-center">Profissionais</th>
              </tr>
            </thead>
            <tbody>
              {resultados.length > 0 ? (
                resultados.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 dark:border-slate-800 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-[#f8fafc] dark:bg-slate-900/50"
                    }`}
                  >
                    <td className="border-r border-gray-100 dark:border-slate-800 p-2 text-center font-bold text-gray-500 dark:text-slate-400">
                      {item.hora_atendimento
                        ? new Date(item.hora_atendimento).toLocaleDateString(
                            "pt-BR",
                          )
                        : "--"}
                      <span className="block text-[9px] font-normal">
                        {item.hora_atendimento
                          ? new Date(item.hora_atendimento).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : ""}
                      </span>
                    </td>
                    <td className="border-r border-gray-100 dark:border-slate-800 p-2 text-center">
                      <div className="font-mono text-gray-500 dark:text-slate-500">
                        {item.aluno?.id}
                      </div>
                      <div className="font-bold text-[#3182ce] dark:text-blue-400">
                        {item.aluno?.serie}º {item.aluno?.turma}
                      </div>
                    </td>
                    <td className="border-r border-gray-100 dark:border-slate-800 p-2 font-bold uppercase text-gray-700 dark:text-slate-300">
                      {item.aluno?.nome}
                    </td>
                    <td className="border-r border-gray-100 dark:border-slate-800 p-2 text-gray-600 dark:text-slate-300">
                      {item.sintoma}
                    </td>
                    <td className="border-r border-gray-100 dark:border-slate-800 p-2 text-gray-600 dark:text-slate-400 italic">
                      {item.obs_atendimento || "Sem observações."}
                    </td>
                    <td className="border-r border-gray-100 dark:border-slate-800 p-2 text-center font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide ${
                          item.destino === "casa"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {item.destino === "sala" ? "Sala" : "Casa"}
                      </span>
                    </td>
                    <td className="p-2 text-[9px] text-gray-500 dark:text-slate-400">
                      <div>
                        Encam:{" "}
                        <span className="font-bold">
                          {item.encaminhado_por}
                        </span>
                      </div>
                      <div>
                        Atend:{" "}
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {item.atendido_por}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-gray-400 dark:text-slate-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={32} />
                      <span className="italic text-sm">
                        Nenhum atendimento finalizado encontrado em{" "}
                        {coligadaAtual?.nome}.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
