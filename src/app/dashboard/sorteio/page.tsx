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

interface RawCsvData {
  "Carimbo de data/hora": string;
  "Endereço de e-mail": string;
  "E-mail institucional do aluno": string;
  "Selecione a série do aluno(a)": string;
  "Selecione a turma": string;
  "Informe o nome completo do(a) aluno(a)": string;
  Equipe: string;
  "Informe o nome completo do(a) responsável que tem interesse em assistir a dança da gincana.": string;
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

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: `Resultado_Sorteio_CSP_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}`,
  });

  const processFile = (file: File) => {
    if (!file) return;
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      return toast.error("Por favor, envie apenas arquivos CSV.");
    }

    const loadingToast = toast.loading("Analisando planilha...");
    Papa.parse<RawCsvData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const formatados = results.data.map((row) => ({
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
        toast.success(
          `${formatados.length} inscrições carregadas com sucesso!`,
          { id: loadingToast },
        );
      },
      error: () =>
        toast.error("Erro ao ler o arquivo CSV.", { id: loadingToast }),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const realizarSorteioManual = () => {
    if (dados.length === 0)
      return toast.error("Nenhum dado carregado para o sorteio.");

    const sorteioToast = toast.loading(
      "Aplicando regras e realizando sorteio...",
    );
    let baseSorteio = [...dados];

    if (regraUnicoFilho) {
      baseSorteio = Array.from(
        new Map(baseSorteio.map((item) => [item.email_aluno, item])).values(),
      );
    }

    if (regraUnicoResponsavel) {
      baseSorteio = Array.from(
        new Map(
          baseSorteio.map((item) => [
            item.nome_responsavel.trim().toLowerCase(),
            item,
          ]),
        ).values(),
      );
    }

    let sorteadosGeral: Inscrito[] = [];

    if (separarPorEquipe) {
      const equipes = Array.from(new Set(baseSorteio.map((i) => i.equipe)));
      equipes.forEach((equipeNome) => {
        const candidatosEquipe = baseSorteio.filter(
          (i) => i.equipe === equipeNome,
        );
        const shuffled = [...candidatosEquipe];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j =
            window.crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        sorteadosGeral = [...sorteadosGeral, ...shuffled.slice(0, quota)];
      });
    } else {
      const shuffled = [...baseSorteio];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j =
          window.crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      sorteadosGeral = shuffled.slice(0, quota * 3);
    }

    setVencedores(sorteadosGeral);
    toast.success("Sorteio validado e concluído com sucesso!", {
      id: sorteioToast,
    });
  };

  const realizarSorteioComIA = async () => {
    if (dados.length === 0) return toast.error("Carregue a planilha primeiro.");
    if (!instrucoesIA.trim())
      return toast.error("Digite as instruções para a IA.");

    setIsProcessandoIA(true);
    setIaProgress(10);
    setIaMessage("Iniciando motor cognitivo do Gemini...");

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
        setIaProgress((prev) => Math.min(prev + 12, 85));
        passoAtual++;
      }
    }, 1200);

    try {
      const dadosOtimizados = dados.map((d, index) => ({
        id: index,
        aluno: d.nome_aluno,
        resp: d.nome_responsavel,
        eqp: d.equipe,
        serie: d.serie,
        email: d.email_aluno,
      }));

      const promptText = `Você é um engenheiro de software especialista em JavaScript.
      Eu tenho um array chamado 'dados' rodando no navegador do cliente. Cada objeto do array tem essa estrutura: { id: number, aluno: string, resp: string, eqp: string, serie: string, email: string }.
      
      O usuário pediu a seguinte regra para o SORTEIO: "${instrucoesIA}"
      A cota padrão é de ${quota} vagas.
      
      SUA MISSÃO: Escreva APENAS O CORPO de uma função JavaScript que filtre o array 'dados', embaralhe-os (sorteio aleatório) e RETORNE UM ARRAY com os 'id's sorteados.
      
      Responda EXATAMENTE neste formato JSON e nada mais:
      {
        "relatorio": "String explicando brevemente a regra aplicada",
        "codigo": "String com o javascript seguro. Ex: const f = dados.filter(d => d.eqp === 'Aura'); return f.sort(()=>Math.random()-0.5).slice(0, 10).map(d => d.id);"
      }`;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro do servidor: ${errorText.substring(0, 50)}`);
      }

      clearInterval(animacaoProgresso);
      setIaProgress(90);
      setIaMessage("Aplicando algoritmo gerado...");

      const responseData = await response.json();
      let textoResposta =
        responseData.text || responseData.resposta || responseData;

      if (typeof textoResposta !== "string")
        textoResposta = JSON.stringify(textoResposta);
      textoResposta = textoResposta
        .replace(/```json/gi, "")
        .replace(/```javascript/gi, "")
        .replace(/```js/gi, "")
        .replace(/```/g, "")
        .trim();

      const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
      if (!jsonMatch)
        throw new Error("A IA não retornou o algoritmo no formato esperado.");

      const resultadoIA = JSON.parse(jsonMatch);
      const codigoDaIA = resultadoIA.codigo;
      const relatorioIA = resultadoIA.relatorio;

      const motorSorteio = new Function("dados", codigoDaIA);
      const vencedoresIds = motorSorteio(dadosOtimizados);

      if (Array.isArray(vencedoresIds) && vencedoresIds.length > 0) {
        const vencedoresIA = dados.filter((_, idx) =>
          vencedoresIds.includes(idx),
        );
        setVencedores(vencedoresIA);

        setIaProgress(100);
        setIaMessage("Sorteio finalizado com sucesso!");
        setTimeout(() => setIsProcessandoIA(false), 1500);

        Swal.fire({
          title: "Sorteio Processado! 🤖",
          text: relatorioIA,
          icon: "success",
          confirmButtonColor: "#4f46e5",
          confirmButtonText: "Ver Resultado",
        });
      } else {
        throw new Error(
          "O algoritmo rodou, mas nenhum vencedor atendeu aos critérios exatos.",
        );
      }
    } catch (error) {
      console.error(error);
      clearInterval(animacaoProgresso);
      setIaProgress(100);
      setIaMessage("Regra muito complexa. Simplifique o texto.");
      toast.error("Erro na compilação da regra da IA.");
      setTimeout(() => setIsProcessandoIA(false), 2000);
    }
  };

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
      `Sorteio_Vencedores_${new Date().toISOString().split("T")}.csv`,
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
          html: "Os dados foram preparados.<br/><br/>Vamos abrir uma nova planilha no <b>Google Sheets</b>. Basta clicar na primeira célula e dar <b>Ctrl + V</b> (Colar).",
          icon: "success",
          confirmButtonColor: "#10b981",
          confirmButtonText: "Abrir Google Sheets agora",
        }).then((result) => {
          if (result.isConfirmed) window.open("https://sheets.new", "_blank");
        });
      })
      .catch(() =>
        toast.error(
          "Não foi possível copiar os dados. Use o botão Baixar CSV.",
        ),
      );
  };

  const equipesUnicas = Array.from(
    new Set(vencedores.map((v) => v.equipe)),
  ).sort();

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

  return (
    <>
      <Toaster position="bottom-right" reverseOrder={false} />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { 
            background: white !important; 
          }
          .no-print { display: none !important; }
          .print-area { display: block !important; width: 100% !important; }
          
          /* 🔥 FORÇA CORES ESCURAS E VIVAS NA IMPRESSÃO */
          .print-area * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Escurece os textos que antes eram clarinhos */
          .print-area .text-slate-400, 
          .print-area .text-slate-500,
          .print-area .text-slate-600 { 
            color: #0f172a !important; /* Quase Preto */
            font-weight: 800 !important;
          }
          
          /* Escurece as bordas das tabelas */
          .print-area table th, 
          .print-area table td { 
            border-color: #94a3b8 !important; /* Slate-400 (Mais forte) */
          }
          
          /* O truque do cabeçalho repetitivo */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
          /* Evita que um aluno seja cortado ao meio na quebra de página */
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
                <Trophy className="text-orange-500" size={36} /> Módulo Sorteio
                Pro
              </h1>
              <p className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-widest mt-1">
                Motor Criptográfico e Raciocínio por IA
              </p>
            </div>
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer border-2 border-dashed p-4 rounded-2xl flex items-center gap-3 transition-all duration-200 group shadow-sm ${
                isDragging
                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500 scale-105"
                  : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-orange-500"
              }`}
            >
              <UploadCloud
                className={`${isDragging ? "text-orange-500" : "text-slate-400"} group-hover:text-orange-500 transition-colors`}
              />
              <div className="text-left">
                <p
                  className={`text-xs font-black uppercase transition-colors ${isDragging ? "text-orange-600 dark:text-orange-400" : "text-slate-800 dark:text-white"}`}
                >
                  {isDragging ? "Solte o arquivo aqui!" : "Carregar Inscrições"}
                </p>
                <p className="text-[9px] text-slate-400 font-bold">
                  Arquivo CSV do Forms
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
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase">
                        Vagas por Equipe
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium">
                        Quantos convites sortear por grupo
                      </p>
                    </div>
                    <input
                      type="number"
                      value={quota}
                      onChange={(e) => setQuota(Number(e.target.value))}
                      className="w-20 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-black text-center text-blue-600 outline-none focus:border-blue-500"
                    />
                  </div>

                  {[
                    {
                      label: "Isolar Sorteio por Equipes",
                      desc: "Sorteia o limite de vagas dentro de cada equipe.",
                      state: separarPorEquipe,
                      set: setSepararPorEquipe,
                      icon: <Users size={14} />,
                    },
                    {
                      label: "Apenas 1 Inscrição por Aluno",
                      desc: "Ignora duplicatas se o aluno enviar 2x.",
                      state: regraUnicoFilho,
                      set: setRegraUnicoFilho,
                      icon: <Filter size={14} />,
                    },
                    {
                      label: "Apenas 1 Inscrição por Família",
                      desc: "Se tiver 2 filhos na equipe, concorre apenas 1 vez.",
                      state: regraUnicoResponsavel,
                      set: setRegraUnicoResponsavel,
                      icon: <UserMinus size={14} />,
                    },
                  ].map((filtro, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          checked={filtro.state}
                          onChange={(e) => filtro.set(e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:bg-slate-800 dark:border-slate-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5 group-hover:text-orange-500 transition-colors">
                          {filtro.icon} {filtro.label}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                          {filtro.desc}
                        </p>
                      </div>
                    </label>
                  ))}

                  <button
                    onClick={realizarSorteioManual}
                    disabled={dados.length === 0 || isProcessandoIA}
                    className="w-full bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-md mt-4 disabled:opacity-50"
                  >
                    Executar Sorteio Padrão
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                {isProcessandoIA && (
                  <div className="absolute inset-0 bg-white/5 animate-pulse z-0 pointer-events-none"></div>
                )}
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xs font-black uppercase text-indigo-100 flex items-center gap-2">
                      <Sparkles size={16} className="text-yellow-300" />{" "}
                      Delegação Lógica via IA (Gemini)
                    </h3>
                    <span className="bg-white/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      BETA
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-100 mb-3 font-medium">
                    Descreva regras complexas (ex: "Remova quem se inscreveu
                    depois das 10h e sorteie 2 da Equipe Trama"). A IA
                    processará e explicará as ações.
                  </p>

                  <textarea
                    placeholder="Descreva as regras customizadas..."
                    className="w-full bg-black/20 border border-white/20 rounded-xl p-4 text-xs placeholder:text-white/40 outline-none focus:ring-2 ring-white/40 h-24 resize-none mb-4 font-medium"
                    value={instrucoesIA}
                    onChange={(e) => setInstrucoesIA(e.target.value)}
                    disabled={isProcessandoIA}
                  />

                  {isProcessandoIA ? (
                    <div className="bg-black/30 p-4 rounded-xl border border-white/10 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-100 uppercase tracking-widest">
                          <Bot
                            size={14}
                            className="text-yellow-300 animate-bounce"
                          />{" "}
                          {iaMessage}
                        </div>
                        <span className="text-[10px] font-black text-yellow-300">
                          {iaProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full transition-all duration-700 ease-out relative"
                          style={{ width: `${iaProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={realizarSorteioComIA}
                      disabled={dados.length === 0}
                      className="w-full bg-white text-indigo-700 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 transition-all shadow-lg disabled:opacity-50"
                    >
                      Sortear usando Lógica da IA
                    </button>
                  )}
                </div>
              </div>

              {vencedores.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-500" size={16} />{" "}
                      Lista Oficial ({vencedores.length})
                    </h3>

                    <div className="flex flex-wrap items-center gap-2">
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
                        className="flex items-center gap-1.5 text-[9px] font-black text-purple-700 hover:text-purple-800 transition-colors uppercase bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-800/50 shadow-sm"
                      >
                        <Printer size={12} /> Imprimir Oficial
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                        <tr className="text-[9px] font-black text-slate-400 uppercase">
                          <th className="p-4 border-b dark:border-slate-800">
                            Equipe
                          </th>
                          <th className="p-4 border-b dark:border-slate-800">
                            Responsável Autorizado
                          </th>
                          <th className="p-4 border-b dark:border-slate-800">
                            Aluno Vínculo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {vencedores.map((v, i) => (
                          <tr
                            key={i}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${getCorEquipe(v.equipe).bg} ${getCorEquipe(v.equipe).text} ${getCorEquipe(v.equipe).border}`}
                              >
                                {v.equipe}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
                                {v.nome_responsavel || "NÃO INFORMADO"}
                              </div>
                              <div className="text-[9px] text-slate-400 font-medium lowercase truncate max-w-[200px]">
                                {v.email_contato}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                                {v.nome_aluno}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                {v.serie} - {v.turma}
                              </div>
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

      {/* ✅ ZONA DE IMPRESSÃO SECRETA E OTIMIZADA */}
      <div style={{ display: "none" }}>
        <div ref={relatorioRef} className="print-area bg-white text-slate-900">
          {/* A Tabela Mestra que engloba tudo */}
          <table className="w-full border-collapse">
            {/* O cabeçalho repetitivo mágico do HTML */}
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
                      <h1 className="text-2xl font-black uppercase text-orange-600 tracking-tight leading-none print:text-orange-600">
                        Resultado Oficial
                      </h1>
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mt-2">
                        Sorteio Auditável de Convites
                      </p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">
                        Data de Emissão:{" "}
                        {new Date().toLocaleDateString("pt-BR")} às{" "}
                        {new Date().toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>

            {/* O conteúdo principal das equipes */}
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
                              <th className="p-2 w-8 text-center border-r border-slate-300">
                                #
                              </th>
                              <th className="p-2 border-r border-slate-300">
                                Responsável Autorizado
                              </th>
                              <th className="p-2 border-r border-slate-300">
                                Aluno(a) Vinculado
                              </th>
                              <th className="p-2 border-r border-slate-300">
                                Série/Turma
                              </th>
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
                                <td className="p-2 text-center text-[10px] font-black text-slate-500 border-r border-slate-300">
                                  {index + 1}
                                </td>
                                <td className="p-2 text-[10px] font-black text-slate-900 uppercase border-r border-slate-300">
                                  {v.nome_responsavel || "NÃO INFORMADO"}
                                </td>
                                <td className="p-2 text-[10px] font-bold text-slate-800 uppercase border-r border-slate-300">
                                  {v.nome_aluno}
                                </td>
                                <td className="p-2 text-[10px] text-slate-700 border-r border-slate-300">
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

            {/* O Rodapé repetitivo caso queira uma assinatura por página */}
            <tfoot>
              <tr>
                <td>
                  <div className="mt-6 pt-4 border-t-2 border-slate-300 text-center">
                    <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                      Documento gerado automaticamente pelo PGE - Portal de
                      Gestão Escolar | Colégio São Paulo
                    </p>
                    <p className="text-[7px] text-slate-500 uppercase mt-1 font-semibold">
                      Este sorteio foi processado de forma aleatória e
                      auditável, garantindo igualdade a todos os inscritos.
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
