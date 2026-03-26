"use client";

import React, { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import {
  ArrowLeft,
  Download,
  History,
  Printer,
  RefreshCcw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/lib/supabase";

interface Inscrito {
  timestamp: string;
  email_contato: string;
  email_aluno: string;
  serie: string;
  turma: string;
  nome_aluno: string;
  equipe: string;
  nome_responsavel: string;
}

interface SorteioHistoricoRow {
  id: string;
  created_at: string;
  metodo: "manual" | "ia" | "ia_fallback";
  seed: string;
  quota: number;
  separar_por_equipe: boolean;
  instrucoes_ia: string | null;
  arquivo_origem: string | null;
  total_inscricoes: number;
  total_elegiveis: number;
  total_vencedores: number;
  relatorio_html: string | null;
  vencedores: Inscrito[];
  auditoria: Array<{
    titulo: string;
    descricao: string;
    total?: number;
  }> | null;
  usuario_nome: string | null;
}

const normalizarTexto = (valor: unknown, fallback = "") =>
  typeof valor === "string" ? valor.trim() : fallback;

export default function HistoricoSorteiosPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [registros, setRegistros] = useState<SorteioHistoricoRow[]>([]);
  const [selecionado, setSelecionado] = useState<SorteioHistoricoRow | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sorteios_historico")
        .select(
          "id, created_at, metodo, seed, quota, separar_por_equipe, instrucoes_ia, arquivo_origem, total_inscricoes, total_elegiveis, total_vencedores, relatorio_html, vencedores, auditoria, usuario_nome",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (data || []) as SorteioHistoricoRow[];
      setRegistros(rows);
      setSelecionado((prev) => prev || rows[0] || null);
    } catch (error: any) {
      toast.error(error?.message || "Falha ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selecionado
      ? `Resultado_${selecionado.id}`
      : "Historico_Sorteios",
  });

  const baixarCSV = () => {
    if (
      !selecionado ||
      !Array.isArray(selecionado.vencedores) ||
      selecionado.vencedores.length === 0
    ) {
      return toast.error("Nenhum resultado selecionado.");
    }

    const csv = Papa.unparse(
      selecionado.vencedores.map((v) => ({
        Equipe: v.equipe,
        "Responsável Sorteado": v.nome_responsavel,
        "Nome do Aluno": v.nome_aluno,
        Série: v.serie,
        Turma: v.turma,
        "E-mail do Aluno": v.email_aluno,
        "E-mail de Contato": v.email_contato,
        "Data da Inscrição": v.timestamp,
        Seed: selecionado.seed,
        Método: selecionado.metodo,
      })),
    );

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico_sorteio_${selecionado.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getCorEquipe = (eqp: string) => {
    const e = normalizarTexto(eqp, "S/ EQUIPE").toLowerCase();
    if (e.includes("hora") || e.includes("aura")) {
      return {
        bg: "bg-purple-100 print:bg-purple-200",
        border: "border-purple-300 print:border-purple-500",
        text: "text-purple-800 print:text-purple-900",
      };
    }
    if (e.includes("tumba") || e.includes("forma")) {
      return {
        bg: "bg-blue-100 print:bg-blue-200",
        border: "border-blue-300 print:border-blue-500",
        text: "text-blue-800 print:text-blue-900",
      };
    }
    if (e.includes("texas") || e.includes("trama")) {
      return {
        bg: "bg-orange-100 print:bg-orange-200",
        border: "border-orange-300 print:border-orange-500",
        text: "text-orange-800 print:text-orange-900",
      };
    }
    return {
      bg: "bg-slate-100 print:bg-slate-200",
      border: "border-slate-300 print:border-slate-500",
      text: "text-slate-800 print:text-black",
    };
  };

  const equipesUnicas = Array.from(
    new Set((selecionado?.vencedores || []).map((v) => v.equipe)),
  ).sort();

  return (
    <>
      <Toaster position="bottom-right" />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4 portrait; margin: 12mm 10mm; }
            body { background: white !important; }
            .no-print { display: none !important; }
          }
        `,
        }}
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 no-print flex-wrap border-b dark:border-slate-800 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <History className="text-orange-500" /> Histórico de Sorteios
              </h1>
              <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mt-1">
                Reimpressão e reexportação de resultados anteriores
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => router.push("/dashboard/sorteio")}
                className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <ArrowLeft size={14} /> Voltar ao Sorteio
              </button>
              <button
                onClick={carregar}
                className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <RefreshCcw size={14} /> Atualizar
              </button>
              <button
                onClick={baixarCSV}
                disabled={!selecionado}
                className="flex items-center gap-1.5 text-[12px] font-black text-slate-600 hover:text-slate-800 transition-colors uppercase bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={handlePrint}
                disabled={!selecionado}
                className="flex items-center gap-1.5 text-[12px] font-black text-purple-700 uppercase bg-purple-100 px-3 py-2 rounded-2xl border border-purple-300 shadow-sm"
              >
                <Printer size={14} /> Reimprimir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4 no-print">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b bg-slate-50 dark:bg-slate-800/50">
                  <h2 className="text-[11px] font-black uppercase">
                    Resultados Salvos
                  </h2>
                </div>
                <div className="max-h-[70vh] overflow-y-auto divide-y dark:divide-slate-800">
                  {loading ? (
                    <div className="p-5 text-[11px] text-slate-500">
                      Carregando...
                    </div>
                  ) : registros.length === 0 ? (
                    <div className="p-5 text-[11px] text-slate-500">
                      Nenhum sorteio salvo encontrado.
                    </div>
                  ) : (
                    registros.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => setSelecionado(row)}
                        className={`w-full text-left p-4 transition-colors ${
                          selecionado?.id === row.id
                            ? "bg-orange-50 dark:bg-orange-950/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase text-slate-900 dark:text-white">
                          {new Date(row.created_at).toLocaleString()}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">
                          {row.metodo} • {row.total_vencedores} vencedores
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 break-all">
                          Seed: {row.seed}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {selecionado ? (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden no-print">
                    <div className="p-5 border-b bg-slate-50 dark:bg-slate-800/50">
                      <h2 className="text-[11px] font-black uppercase">
                        Resumo do Sorteio
                      </h2>
                    </div>
                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] uppercase font-black">
                      <div>
                        <span className="text-slate-400 block">Método</span>
                        {selecionado.metodo}
                      </div>
                      <div>
                        <span className="text-slate-400 block">Quota</span>
                        {selecionado.quota}
                      </div>
                      <div>
                        <span className="text-slate-400 block">Inscrições</span>
                        {selecionado.total_inscricoes}
                      </div>
                      <div>
                        <span className="text-slate-400 block">Elegíveis</span>
                        {selecionado.total_elegiveis}
                      </div>
                      <div className="col-span-2 md:col-span-4 break-all">
                        <span className="text-slate-400 block">Seed</span>
                        {selecionado.seed}
                      </div>
                      <div className="col-span-2 md:col-span-4">
                        <span className="text-slate-400 block">Arquivo</span>
                        {selecionado.arquivo_origem || "-"}
                      </div>
                      <div className="col-span-2 md:col-span-4">
                        <span className="text-slate-400 block">Usuário</span>
                        {selecionado.usuario_nome || "-"}
                      </div>
                      {selecionado.instrucoes_ia && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-slate-400 block">
                            Instruções IA
                          </span>
                          {selecionado.instrucoes_ia}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden no-print">
                    <div className="p-5 border-b bg-slate-50 dark:bg-slate-800/50">
                      <h2 className="text-[11px] font-black uppercase">
                        Vencedores
                      </h2>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white dark:bg-slate-900 text-[9px] uppercase font-black text-slate-400">
                          <tr>
                            <th className="p-4">Equipe</th>
                            <th className="p-4">Responsável</th>
                            <th className="p-4">Aluno</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                          {selecionado.vencedores.map((v, i) => (
                            <tr key={i}>
                              <td className="p-4">
                                <span
                                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${getCorEquipe(v.equipe).bg} ${getCorEquipe(v.equipe).text}`}
                                >
                                  {v.equipe}
                                </span>
                              </td>
                              <td className="p-4 text-[10px] font-black uppercase">
                                {v.nome_responsavel || "NÃO INFORMADO"}
                              </td>
                              <td className="p-4 text-[10px] font-bold uppercase">
                                {v.nome_aluno}
                                <span className="block text-[9px] text-slate-400">
                                  {v.serie} - {v.turma}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-10 text-[12px] text-slate-500">
                  Selecione um sorteio salvo para visualizar o resultado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "none" }}>
        <div ref={printRef} className="bg-white text-slate-900 p-2">
          {selecionado && (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <td>
                    <div className="border-b-[4px] border-orange-500 pb-4 mb-6 flex justify-between items-end">
                      <img
                        src="/assets/logo-csp.png"
                        alt="Logo CSP"
                        className="h-16 object-contain"
                      />
                      <div className="text-right">
                        <h1 className="text-2xl font-black uppercase text-orange-600 leading-none">
                          Resultado Oficial
                        </h1>
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mt-2">
                          Histórico de Sorteio Auditável
                        </p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">
                          Emissão original:{" "}
                          {new Date(selecionado.created_at).toLocaleString()}
                        </p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">
                          Seed: {selecionado.seed}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {equipesUnicas.map((equipe, idx) => {
                      const equipeVencedores = (
                        selecionado.vencedores || []
                      ).filter((v) => v.equipe === equipe);
                      const cores = getCorEquipe(equipe);
                      return (
                        <div
                          key={equipe}
                          className={`mb-8 ${idx !== 0 ? "break-before-page" : ""}`}
                        >
                          <h2
                            className={`text-[12px] font-black uppercase px-4 py-2.5 rounded-t-xl border-b-2 ${cores.bg} ${cores.text} ${cores.border}`}
                          >
                            Equipe: {equipe}{" "}
                            <span className="float-right">
                              {equipeVencedores.length} Sorteados
                            </span>
                          </h2>
                          <table className="w-full text-left border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 text-[9px] uppercase tracking-widest border-b-2 border-slate-300">
                                <th className="p-2 w-8 text-center border-r">
                                  #
                                </th>
                                <th className="p-2 border-r">
                                  Responsável Autorizado
                                </th>
                                <th className="p-2 border-r">
                                  Aluno(a) Vinculado
                                </th>
                                <th className="p-2 border-r">Série/Turma</th>
                                <th className="p-2 text-right">Data/Hora</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                              {equipeVencedores.map((v, index) => (
                                <tr
                                  key={index}
                                  className={
                                    index % 2 === 0 ? "bg-white" : "bg-slate-50"
                                  }
                                >
                                  <td className="p-2 text-center text-[10px] font-black text-slate-500 border-r">
                                    {index + 1}
                                  </td>
                                  <td className="p-2 text-[10px] font-black text-slate-900 uppercase border-r">
                                    {v.nome_responsavel || "NÃO INFORMADO"}
                                  </td>
                                  <td className="p-2 text-[10px] font-bold text-slate-800 uppercase border-r">
                                    {v.nome_aluno}
                                  </td>
                                  <td className="p-2 text-[10px] text-slate-700 border-r">
                                    {v.serie} - {v.turma}
                                  </td>
                                  <td className="p-2 text-right text-[9px] text-slate-600">
                                    {v.timestamp}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
