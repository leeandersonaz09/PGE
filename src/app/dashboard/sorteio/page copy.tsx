"use client";

import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import {
  UploadCloud,
  Trophy,
  Users,
  Sparkles,
  Download,
  CheckCircle2,
  Filter,
  UserMinus,
  Settings2,
  Bot,
  Table,
  Printer,
  ShieldCheck,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import { useReactToPrint } from "react-to-print";

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

export default function SorteioPage() {
  const [dados, setDados] = useState<Inscrito[]>([]);
  const [vencedores, setVencedores] = useState<Inscrito[]>([]);
  const [instrucoesIA, setInstrucoesIA] = useState("");
  const relatorioRef = useRef<HTMLDivElement>(null);

  const [isProcessandoIA, setIsProcessandoIA] = useState(false);
  const [iaMessage, setIaMessage] = useState("");
  const [iaProgress, setIaProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [quota, setQuota] = useState(40);
  const [regraUnicoFilho, setRegraUnicoFilho] = useState(true);
  const [regraUnicoResponsavel, setRegraUnicoResponsavel] = useState(true);
  const [separarPorEquipe, setSepararPorEquipe] = useState(true);

  // ==========================================
  // 🔐 MOTOR CRIPTOGRÁFICO (FIXED)
  // ==========================================

  const getSecureRandom = (max: number) => {
    const array = new Uint32Array(1);
    let randomValue: number;
    do {
      window.crypto.getRandomValues(array);
      // ✅ A correção está aqui: acessamos o índice do array
      randomValue = array[0];
    } while (randomValue >= Math.floor(0xffffffff / max) * max);

    return randomValue % max;
  };

  const shuffleFisherYates = <T,>(array: T[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = getSecureRandom(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ==========================================
  // 🛡️ SEGURANÇA (SANDBOX IA)
  // ==========================================

  const validarCodigoIA = (codigo: unknown) => {
    if (typeof codigo !== "string" || !codigo.trim()) return false;

    const proibidos = [
      "fetch",
      "window",
      "document",
      "localstorage",
      "localStorage",
      "eval",
      "cookie",
      "xmlhttprequest",
      "XMLHttpRequest",
      "sessionstorage",
      "indexeddb",
      "import(",
      "Function(",
    ];

    const codeLower = codigo.toLowerCase();
    return !proibidos.some((p) => codeLower.includes(p.toLowerCase()));
  };

  // ==========================================
  // 📂 FUNÇÕES DE EXPORTAÇÃO (ADICIONADAS)
  // ==========================================

  const baixarCSV = () => {
    if (vencedores.length === 0) return;
    const dadosParaExportacao = vencedores.map((v) => ({
      Equipe: v.equipe,
      "Responsável Sorteado": v.nome_responsavel,
      "E-mail de Contato": v.email_contato,
      "Nome do Aluno": v.nome_aluno,
      Série: v.serie,
      Turma: v.turma,
      "E-mail do Aluno": v.email_aluno,
      "Data da Inscrição": v.timestamp,
    }));
    const csv = Papa.unparse(dadosParaExportacao);
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Sorteio_CSP_${new Date().toISOString().split("T")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download do CSV iniciado!");
  };

  const abrirNoGoogleSheets = () => {
    if (vencedores.length === 0) return;
    const dadosParaExportacao = vencedores.map((v) => ({
      Equipe: v.equipe,
      "Responsável Sorteado": v.nome_responsavel,
      "E-mail de Contato": v.email_contato,
      "Nome do Aluno": v.nome_aluno,
      Série: v.serie,
      Turma: v.turma,
      "E-mail do Aluno": v.email_aluno,
      "Data da Inscrição": v.timestamp,
    }));
    const tsv = Papa.unparse(dadosParaExportacao, { delimiter: "\t" });
    navigator.clipboard
      .writeText(tsv)
      .then(() => {
        Swal.fire({
          title: "Copiado para Área de Transferência!",
          html: "Os dados foram preparados.<br/><br/>Basta clicar na primeira célula do Google Sheets e dar <b>Ctrl + V</b>.",
          icon: "success",
          confirmButtonColor: "#10b981",
          confirmButtonText: "Abrir Google Sheets agora",
        }).then((result) => {
          if (result.isConfirmed) window.open("https://sheets.new", "_blank");
        });
      })
      .catch(() =>
        toast.error("Erro ao copiar dados. Use o botão Baixar CSV."),
      );
  };

  // ==========================================
  // 📂 PROCESSAMENTO DE ARQUIVOS
  // ==========================================

  const processFile = (file: File) => {
    if (!file) return;
    const loadingToast = toast.loading("Processando banco de dados...");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const formatados = results.data.map((row: any) => ({
          timestamp: row["Carimbo de data/hora"],
          email_contato: row["Endereço de e-mail"],
          email_aluno: row["E-mail institucional do aluno"],
          serie: row["Selecione a série do aluno(a)"],
          turma: row["Selecione a turma"],
          nome_aluno: row["Informe o nome completo do(a) aluno(a)"],
          equipe: row["Equipe"]?.trim() || "S/ EQUIPE",
          nome_responsavel:
            row[
              "Informe o nome completo do(a) responsável que tem interesse em assistir a dança da gincana."
            ] || "",
        }));
        setDados(formatados);
        toast.success(`${formatados.length} inscrições carregadas!`, {
          id: loadingToast,
        });
      },
      error: () =>
        toast.error("Falha na leitura do CSV.", { id: loadingToast }),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ==========================================
  // 🎲 SORTEIO MANUAL
  // ==========================================

  const realizarSorteioManual = () => {
    if (dados.length === 0) return toast.error("Nenhuma inscrição.");
    const sorteioToast = toast.loading("Sorteando...");

    let base = [...dados];
    if (regraUnicoFilho)
      base = Array.from(new Map(base.map((i) => [i.email_aluno, i])).values());
    if (regraUnicoResponsavel)
      base = Array.from(
        new Map(
          base.map((i) => [i.nome_responsavel.trim().toLowerCase(), i]),
        ).values(),
      );

    let sorteados: Inscrito[] = [];
    if (separarPorEquipe) {
      const equipes = Array.from(new Set(base.map((i) => i.equipe)));
      equipes.forEach((eq) => {
        const candidatos = base.filter((i) => i.equipe === eq);
        sorteados = [
          ...sorteados,
          ...shuffleFisherYates(candidatos).slice(0, quota),
        ];
      });
    } else {
      sorteados = shuffleFisherYates(base).slice(0, quota * 3);
    }

    setVencedores(sorteados);
    toast.success("Sorteio concluído!", { id: sorteioToast });
  };

  // ==========================================
  // 🤖 SORTEIO COM IA (COM ANIMAÇÃO DE PROGRESSO)
  // ==========================================

  const realizarSorteioComIA = async () => {
    if (dados.length === 0 || !instrucoesIA.trim())
      return toast.error("Dados ou regras ausentes.");

    setIsProcessandoIA(true);
    setIaProgress(10);
    setIaMessage("Iniciando motor cognitivo do Gemini...");

    // ✅ RESTAURADO: Frases de raciocínio para animar o loading
    const frasesRaciocinio = [
      "Interpretando as regras do edital...",
      "Gerando algoritmo matemático de filtragem...",
      "Otimizando código para processamento local...",
      "Executando motor criptográfico na memória...",
    ];

    let passoAtual = 0;
    const animacaoProgresso = setInterval(() => {
      if (passoAtual < frasesRaciocinio.length) {
        setIaMessage(frasesRaciocinio[passoAtual]);
        setIaProgress((prev) => Math.min(prev + 12, 75)); // Sobe gradualmente até 75%
        passoAtual++;
      }
    }, 1500);

    try {
      const promptText = `Aja como um engenheiro de software. Regra: "${instrucoesIA}". Cota: ${quota}. Array 'dados' com {id: number, aluno: string, eqp: string, email: string}. MISSÃO: Escreva o corpo da função JS que retorna array de IDs sorteados. RESPOSTA: Retorne APENAS um JSON: {"relatorio": "texto html", "codigo": "js"}`;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        throw new Error("A API retornou uma resposta inválida.");
      }

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Falha interna ao consultar a IA.",
        );
      }

      // Para a animação assim que a resposta chegar
      clearInterval(animacaoProgresso);
      setIaProgress(85);
      setIaMessage("Algoritmo recebido! Validando segurança...");

      let rawText = data.text || data.resposta || data;
      if (typeof rawText !== "string") rawText = JSON.stringify(rawText);

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("A IA não retornou um formato válido.");
      const resIA = JSON.parse(jsonMatch);

      const { codigo, relatorio } = resIA;

      if (!validarCodigoIA(codigo))
        throw new Error("Código inseguro detectado.");

      setIaProgress(95);
      setIaMessage("Aplicando sorteio seguro...");

      const motor = new Function("dados", codigo);
      const IDsSorteados = motor(
        dados.map((d, i) => ({
          id: i,
          aluno: d.nome_aluno,
          eqp: d.equipe,
          email: d.email_aluno,
        })),
      );

      if (!Array.isArray(IDsSorteados))
        throw new Error("A IA falhou ao gerar a lista.");

      setVencedores(dados.filter((_, i) => IDsSorteados.includes(i)));
      setIaProgress(100);
      setIaMessage("Sorteio finalizado com sucesso!");

      setTimeout(() => setIsProcessandoIA(false), 1200);

      Swal.fire({
        title: "Sorteio Realizado (v2) 🛡️",
        html: relatorio,
        icon: "success",
        confirmButtonColor: "#4f46e5",
      });
    } catch (error: any) {
      console.error(error);
      clearInterval(animacaoProgresso); // ✅ Importante limpar em caso de erro também
      toast.error(error.message || "Erro na IA.");
      setIsProcessandoIA(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: "Resultado_Oficial_CSP_v2",
  });

  const getCorEquipe = (eqp: string) => {
    const e = eqp.toLowerCase();
    if (e.includes("aura"))
      return {
        bg: "bg-purple-100 print:bg-purple-200",
        border: "border-purple-300 print:border-purple-500",
        text: "text-purple-800 print:text-purple-900",
      };
    if (e.includes("forma"))
      return {
        bg: "bg-blue-100 print:bg-blue-200",
        border: "border-blue-300 print:border-blue-500",
        text: "text-blue-800 print:text-blue-900",
      };
    if (e.includes("trama"))
      return {
        bg: "bg-orange-100 print:bg-orange-200",
        border: "border-orange-300 print:border-orange-500",
        text: "text-orange-800 print:text-orange-900",
      };
    return {
      bg: "bg-slate-100 print:bg-slate-200",
      border: "border-slate-300 print:border-slate-500",
      text: "text-slate-800 print:text-black",
    };
  };

  const equipesUnicas = Array.from(
    new Set(vencedores.map((v) => v.equipe)),
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
          .print-area { display: block !important; width: 100% !important; }
          .print-area * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-area .text-slate-500 { color: #0f172a !important; font-weight: 800 !important; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
        }
      `,
        }}
      />

      <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b dark:border-slate-800 pb-6 gap-4 no-print">
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                <Trophy className="text-orange-500" size={36} /> Sorteio Pro{" "}
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  v2
                </span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-widest mt-1 flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" /> Sorteio
                Criptográfico Auditável
              </p>
            </div>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`cursor-pointer border-2 border-dashed p-4 rounded-2xl flex items-center gap-3 transition-all ${isDragging ? "bg-orange-50 border-orange-500 scale-105" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-orange-500 shadow-sm"}`}
            >
              <UploadCloud
                className={`${isDragging ? "text-orange-500" : "text-slate-400"}`}
              />
              <div className="text-left">
                <p
                  className={`text-xs font-black uppercase ${isDragging ? "text-orange-600" : "text-slate-800 dark:text-white"}`}
                >
                  Carregar Inscrições
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">
                  CSV do Google Forms
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 border-b dark:border-slate-800 pb-3">
                  <Settings2 size={16} className="text-blue-500" /> Parâmetros
                  Avançados
                </h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase">
                      Vagas por Equipe
                    </span>
                    <input
                      type="number"
                      value={quota}
                      onChange={(e) => setQuota(Number(e.target.value))}
                      className="w-20 bg-white dark:bg-slate-950 border border-slate-300 rounded-lg p-2 font-black text-center text-blue-600 outline-none"
                    />
                  </div>
                  {[
                    {
                      label: "Isolar Sorteio por Equipe",
                      state: separarPorEquipe,
                      set: setSepararPorEquipe,
                      icon: <Users size={14} />,
                    },
                    {
                      label: "Único por Aluno",
                      state: regraUnicoFilho,
                      set: setRegraUnicoFilho,
                      icon: <Filter size={14} />,
                    },
                    {
                      label: "Único por Família",
                      state: regraUnicoResponsavel,
                      set: setRegraUnicoResponsavel,
                      icon: <UserMinus size={14} />,
                    },
                  ].map((filtro, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={filtro.state}
                        onChange={(e) => filtro.set(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-orange-500"
                      />
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                        {filtro.icon} {filtro.label}
                      </span>
                    </label>
                  ))}
                  <button
                    onClick={realizarSorteioManual}
                    disabled={dados.length === 0 || isProcessandoIA}
                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-md mt-4 disabled:opacity-50"
                  >
                    Sorteio Padrão (F-Yates)
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2rem] shadow-xl text-white">
                <h3 className="text-xs font-black uppercase text-indigo-100 flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-yellow-300" /> Delegação
                  Lógica Inteligente
                </h3>
                <textarea
                  placeholder="Ex: Sorteie 10 alunos do 9º ano..."
                  className="w-full bg-black/20 border border-white/20 rounded-xl p-4 text-xs h-24 resize-none mb-4 outline-none focus:ring-2 ring-white/40"
                  value={instrucoesIA}
                  onChange={(e) => setInstrucoesIA(e.target.value)}
                  disabled={isProcessandoIA}
                />
                {isProcessandoIA ? (
                  <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                        <Bot size={14} className="animate-bounce" /> {iaMessage}
                      </div>
                      <span className="text-[10px] font-black text-yellow-300">
                        {iaProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full transition-all duration-700"
                        style={{ width: `${iaProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={realizarSorteioComIA}
                    disabled={dados.length === 0}
                    className="w-full bg-white text-indigo-700 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 shadow-lg disabled:opacity-50"
                  >
                    Executar Lógica via Gemini
                  </button>
                )}
              </div>

              {vencedores.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b flex justify-between items-center">
                    <h3 className="text-[11px] font-black uppercase flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-500" size={16} />{" "}
                      Vencedores ({vencedores.length})
                    </h3>

                    {/* ✅ BOTÕES RESTAURADOS AQUI */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={baixarCSV}
                        className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 hover:text-slate-800 transition-colors uppercase bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                      >
                        <Download size={12} /> CSV
                      </button>
                      <button
                        onClick={abrirNoGoogleSheets}
                        className="flex items-center gap-1.5 text-[9px] font-black text-emerald-700 hover:text-emerald-800 transition-colors uppercase bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800/50 shadow-sm"
                      >
                        <Table size={12} /> Sheets
                      </button>
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 text-[9px] font-black text-purple-700 uppercase bg-purple-100 px-3 py-2 rounded-lg border border-purple-300 shadow-sm"
                      >
                        <Printer size={12} /> Imprimir PDF Oficial
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-white dark:bg-slate-900 sticky top-0 text-[9px] font-black text-slate-400 uppercase">
                        <tr>
                          <th className="p-4">Equipe</th>
                          <th className="p-4">Responsável</th>
                          <th className="p-4">Aluno</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {vencedores.map((v, i) => (
                          <tr
                            key={i}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                          >
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${getCorEquipe(v.equipe).bg} ${getCorEquipe(v.equipe).text}`}
                              >
                                {v.equipe}
                              </span>
                            </td>
                            <td className="p-4 text-[11px] font-black text-emerald-700 uppercase">
                              {v.nome_responsavel || "NÃO INFORMADO"}
                            </td>
                            <td className="p-4 text-[10px] font-bold uppercase">
                              {v.nome_aluno}{" "}
                              <span className="text-[9px] text-slate-400 block">
                                {v.serie}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ZONA DE IMPRESSÃO - LAYOUT IGUAL AO PAGE.TSX */}
      <div style={{ display: "none" }}>
        <div ref={relatorioRef} className="print-area bg-white text-slate-900">
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
                        Sorteio Auditável de Convites
                      </p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">
                        Emissão: {new Date().toLocaleString()}
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
                    const equipeVencedores = vencedores.filter(
                      (v) => v.equipe === equipe,
                    );
                    if (equipeVencedores.length === 0) return null;
                    const cores = getCorEquipe(equipe);
                    return (
                      <div
                        key={equipe}
                        className={`mb-8 ${idx !== 0 ? "print:break-before-page" : ""}`}
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
            <tfoot>
              <tr>
                <td>
                  <div className="mt-6 pt-4 border-t-2 border-slate-300 text-center">
                    <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                      Documento gerado pelo PGE | Colégio São Paulo
                    </p>
                    <p className="text-[7px] text-slate-500 uppercase mt-1">
                      Este sorteio foi processado de forma aleatória e
                      auditável.
                    </p>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
