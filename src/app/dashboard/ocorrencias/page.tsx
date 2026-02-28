"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import {
  Search,
  Loader2,
  Download,
  AlertCircle,
  FileText,
  UserCheck,
} from "lucide-react";

export default function RelatorioOcorrenciasPage() {
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);
  const [buscaNome, setBuscaNome] = useState("");

  const { coligadaAtual, loadingColigadas } = useColigada();

  useEffect(() => {
    if (coligadaAtual) {
      carregarOcorrencias();
    }
  }, [coligadaAtual]);

  const carregarOcorrencias = async () => {
    if (!coligadaAtual) return;
    setLoadingDados(true);

    // Busca todas as ocorrências da unidade e traz os dados do aluno junto
    const { data, error } = await supabase
      .from("ocorrencias")
      .select(
        `
        *,
        aluno:alunos(id, nome, turma, serie)
      `,
      )
      .eq("sede_id", coligadaAtual.id)
      .order("data", { ascending: false });

    if (!error && data) {
      const formatados = data.map((oc: any) => ({
        ...oc,
        aluno: Array.isArray(oc.aluno) ? oc.aluno[0] : oc.aluno,
      }));
      setOcorrencias(formatados);
      setResultados(formatados);
    } else {
      console.error("Erro ao carregar ocorrências", error);
    }

    setLoadingDados(false);
  };

  const realizarBusca = () => {
    if (!buscaNome.trim()) {
      setResultados(ocorrencias);
      return;
    }
    const filtrados = ocorrencias.filter((item) =>
      item.aluno?.nome?.toLowerCase().includes(buscaNome.toLowerCase()),
    );
    setResultados(filtrados);
  };

  // --- FUNÇÃO DE EXPORTAR OCORRÊNCIAS PARA EXCEL ---
  const exportarExcel = () => {
    const cabecalhos = [
      "Unidade",
      "Data/Hora",
      "RA",
      "Nome do Aluno",
      "Série",
      "Turma",
      "Relato da Ocorrência",
      "Registrado Por",
    ];

    const linhas = resultados.map((item) => {
      const dataFormatada = item.data
        ? new Date(item.data).toLocaleString("pt-BR")
        : "";

      return [
        coligadaAtual?.sigla || "",
        dataFormatada,
        item.aluno?.id || "",
        item.aluno?.nome || "",
        `${item.aluno?.serie || ""}º Ano`,
        item.aluno?.turma || "",
        `"${(item.texto || "").replace(/"/g, '""')}"`, // Aspas duplas para não quebrar o CSV
        item.colaborador_nome || "",
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

    const nomeArquivo = `Relatorio_Ocorrencias_${coligadaAtual?.sigla}_${new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-")}.csv`;

    link.download = nomeArquivo;
    link.click();
  };

  if (loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full text-[#3182ce] font-bold italic">
        Sincronizando Unidade...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white font-sans text-[11px] text-gray-800">
      {/* BARRA SUPERIOR E FILTROS */}
      <div className="bg-[#cbd5e0] p-2 flex justify-between items-center border-b border-gray-400">
        <div className="flex gap-2 items-center flex-1">
          <div className="bg-white border border-gray-400 rounded-sm px-2 h-7 flex items-center font-bold text-blue-700 uppercase mr-1">
            {coligadaAtual?.sigla}
          </div>

          <input
            type="text"
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && realizarBusca()}
            placeholder={`Pesquisar ocorrência por nome do aluno em ${coligadaAtual?.sigla}...`}
            className="border border-gray-400 rounded-sm px-2 h-7 w-full max-w-md bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#3182ce]"
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
          <Download size={14} /> EXPORTAR OCORRÊNCIAS
        </button>
      </div>

      {/* ÁREA DA TABELA */}
      <div className="overflow-auto flex-1 bg-gray-50">
        {loadingDados ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#3182ce] italic">
            <Loader2 className="animate-spin" size={24} />
            <span>Carregando base de dados de {coligadaAtual?.nome}...</span>
          </div>
        ) : (
          <table className="w-full border-collapse bg-white">
            <thead className="sticky top-0 bg-[#f1f5f9] z-10 shadow-sm">
              <tr className="border-b border-gray-300 font-bold text-left uppercase text-gray-600 text-[10px]">
                <th className="border-r border-gray-300 p-2 text-center w-24">
                  Data / Hora
                </th>
                <th className="border-r border-gray-300 p-2 w-20 text-center">
                  Série/Turma
                </th>
                <th className="border-r border-gray-300 p-2 min-w-[180px]">
                  Aluno
                </th>
                <th className="border-r border-gray-300 p-2">
                  Descrição da Ocorrência
                </th>
                <th className="p-2 w-40">Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {resultados.length > 0 ? (
                resultados.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 transition-colors hover:bg-blue-50 ${
                      index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                    }`}
                  >
                    <td className="border-r border-gray-100 p-2 text-center text-gray-500 font-medium">
                      {new Date(item.data).toLocaleDateString("pt-BR")}
                      <span className="block text-[9px] font-normal">
                        {new Date(item.data).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="border-r border-gray-100 p-2 text-center">
                      <div className="font-bold text-[#3182ce]">
                        {item.aluno?.serie}º {item.aluno?.turma}
                      </div>
                    </td>
                    <td className="border-r border-gray-100 p-2 font-bold uppercase text-gray-700">
                      {item.aluno?.nome}
                    </td>
                    <td className="border-r border-gray-100 p-2 text-gray-600 leading-relaxed text-justify">
                      {item.texto}
                    </td>
                    <td className="p-2 text-gray-500">
                      <div className="flex items-center gap-1 font-bold text-orange-600">
                        <UserCheck size={12} /> {item.colaborador_nome}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={32} />
                      <span className="italic text-sm">
                        Nenhuma ocorrência encontrada para {coligadaAtual?.nome}
                        .
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
