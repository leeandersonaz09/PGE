"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  History,
  Save,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
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

interface RespostaIA {
  relatorio?: string;
  ids?: number[];
}

interface SorteioElegivel {
  id: number;
  aluno: string;
  responsavel: string;
  eqp: string;
  serie: string;
  turma: string;
  email: string;
  contato: string;
  timestamp: string;
}

interface AuditoriaItem {
  tipo:
    | "csv"
    | "duplicidade_aluno"
    | "possivel_duplicidade"
    | "manual"
    | "ia"
    | "fallback"
    | "persistencia";
  titulo: string;
  descricao: string;
  total?: number;
  detalhes?: string[];
}

interface SorteioPersistidoPayload {
  id?: string;
  metodo: "manual" | "ia" | "ia_fallback";
  seed: string;
  quota: number;
  separarPorEquipe: boolean;
  instrucoesIA: string;
  arquivoOrigem: string;
  totalInscricoes: number;
  totalElegiveis: number;
  totalVencedores: number;
  relatorioHtml: string;
  vencedores: Inscrito[];
  auditoria: AuditoriaItem[];
  csvHeaders: string[];
}

const HEADER_TIMESTAMP = "Carimbo de data/hora";
const HEADER_EMAIL_CONTATO = "Endereço de e-mail";
const HEADER_EMAIL_ALUNO = "E-mail institucional do aluno";
const HEADER_SERIE = "Selecione a série do aluno(a)";
const HEADER_TURMA = "Selecione a turma";
const HEADER_NOME_ALUNO = "Informe o nome completo do(a) aluno(a)";
const HEADER_EQUIPE = "Equipe";
const HEADER_RESPONSAVEL =
  "Informe o nome completo do(a) responsável que tem interesse em assistir a dança da gincana.";

const REQUIRED_HEADERS = [
  HEADER_TIMESTAMP,
  HEADER_EMAIL_CONTATO,
  HEADER_EMAIL_ALUNO,
  HEADER_SERIE,
  HEADER_TURMA,
  HEADER_NOME_ALUNO,
  HEADER_EQUIPE,
  HEADER_RESPONSAVEL,
];

const normalizarTexto = (valor: unknown, fallback = "") => {
  return typeof valor === "string" ? valor.trim() : fallback;
};

const normalizarComparacao = (valor: unknown) => {
  return normalizarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const apenasLetrasNumeros = (valor: unknown) =>
  normalizarComparacao(valor)
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const similarityDice = (a: string, b: string) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s: string) => {
    const txt = ` ${s} `;
    const grams: string[] = [];
    for (let i = 0; i < txt.length - 1; i++) grams.push(txt.slice(i, i + 2));
    return grams;
  };
  const a2 = bigrams(a);
  const b2 = bigrams(b);
  if (a2.length === 0 || b2.length === 0) return 0;
  const map = new Map<string, number>();
  a2.forEach((g) => map.set(g, (map.get(g) || 0) + 1));
  let intersection = 0;
  b2.forEach((g) => {
    const count = map.get(g) || 0;
    if (count > 0) {
      map.set(g, count - 1);
      intersection++;
    }
  });
  return (2 * intersection) / (a2.length + b2.length);
};

const hashString = (input: string) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};

const createSeededRandom = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleComSeed = <T,>(array: T[], seed: string) => {
  const arr = [...array];
  if (arr.length <= 1) return arr;
  const numericSeed = parseInt(hashString(seed), 16) || 1;
  const random = createSeededRandom(numericSeed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const gerarSeed = () => {
  const arr = new Uint32Array(2);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    arr[0] = Math.floor(Math.random() * 0xffffffff);
    arr[1] = Math.floor(Math.random() * 0xffffffff);
  }
  return `${Date.now()}-${arr[0]}-${arr[1]}`;
};

const timestampParaNumero = (valor: string, fallbackIndex: number) => {
  const bruto = normalizarTexto(valor);
  if (!bruto) return Number.MAX_SAFE_INTEGER - fallbackIndex;

  const tentativaDireta = Date.parse(bruto);
  if (!Number.isNaN(tentativaDireta)) return tentativaDireta;

  const match = bruto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    const [, dd, mm, yyyy, hh = "0", mi = "0", ss = "0"] = match;
    const ano = yyyy.length === 2 ? `20${yyyy}` : yyyy;
    const iso = `${ano}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${mi.padStart(2, "0")}:${ss.padStart(2, "0")}`;
    const tentativaBr = Date.parse(iso);
    if (!Number.isNaN(tentativaBr)) return tentativaBr;
  }

  return Number.MAX_SAFE_INTEGER - fallbackIndex;
};

const chaveAluno = (
  item: Pick<Inscrito, "nome_aluno" | "email_aluno" | "serie" | "turma">,
) => {
  const nome = apenasLetrasNumeros(item.nome_aluno);
  const email = normalizarComparacao(item.email_aluno);
  const serie = apenasLetrasNumeros(item.serie);
  const turma = apenasLetrasNumeros(item.turma);

  if (nome && email) return `${nome}::${email}`;
  if (nome && serie && turma) return `${nome}::${serie}::${turma}`;
  return nome || email || `${serie}::${turma}`;
};

const construirBaseElegivel = (origem: Inscrito[]) => {
  const comMeta = origem
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ta = timestampParaNumero(a.item.timestamp, a.index);
      const tb = timestampParaNumero(b.item.timestamp, b.index);
      if (ta !== tb) return ta - tb;
      return a.index - b.index;
    });

  const alunosJaSelecionados = new Set<string>();
  const elegiveis: Array<Inscrito & { __originalIndex: number }> = [];
  const removidosDuplicidadeAluno: Array<
    Inscrito & { __originalIndex: number; venceuIndex: number }
  > = [];

  comMeta.forEach(({ item, index }) => {
    const alunoKey = chaveAluno(item);
    if (!alunoKey) return;

    if (alunosJaSelecionados.has(alunoKey)) {
      const vencedor = elegiveis.find((e) => chaveAluno(e) === alunoKey);
      removidosDuplicidadeAluno.push({
        ...item,
        __originalIndex: index,
        venceuIndex: vencedor?.__originalIndex ?? -1,
      });
      return;
    }

    alunosJaSelecionados.add(alunoKey);
    elegiveis.push({ ...item, __originalIndex: index });
  });

  return { elegiveis, removidosDuplicidadeAluno };
};

const detectarPossiveisDuplicidades = (origem: Inscrito[]) => {
  const saida: string[] = [];
  const vistos = new Set<string>();
  for (let i = 0; i < origem.length; i++) {
    for (let j = i + 1; j < origem.length; j++) {
      const a = origem[i];
      const b = origem[j];
      const emailA = normalizarComparacao(a.email_aluno);
      const emailB = normalizarComparacao(b.email_aluno);
      if (emailA && emailB && emailA === emailB) continue;
      const nomeA = apenasLetrasNumeros(a.nome_aluno);
      const nomeB = apenasLetrasNumeros(b.nome_aluno);
      const serieA = apenasLetrasNumeros(a.serie);
      const serieB = apenasLetrasNumeros(b.serie);
      const turmaA = apenasLetrasNumeros(a.turma);
      const turmaB = apenasLetrasNumeros(b.turma);
      if (!nomeA || !nomeB || serieA !== serieB || turmaA !== turmaB) continue;
      const score = similarityDice(nomeA, nomeB);
      if (score >= 0.94 && nomeA !== nomeB) {
        const key = `${nomeA}::${nomeB}::${serieA}::${turmaA}`;
        if (!vistos.has(key)) {
          vistos.add(key);
          saida.push(
            `${a.nome_aluno} ↔ ${b.nome_aluno} (${a.serie}/${a.turma})`,
          );
        }
      }
    }
  }
  return saida.slice(0, 15);
};

const montarRegistrosElegiveisIA = (origem: Inscrito[]): SorteioElegivel[] => {
  const { elegiveis } = construirBaseElegivel(origem);
  return elegiveis.map((item) => ({
    id: item.__originalIndex,
    aluno: item.nome_aluno,
    responsavel: item.nome_responsavel,
    eqp: item.equipe,
    serie: item.serie,
    turma: item.turma,
    email: item.email_aluno,
    contato: item.email_contato,
    timestamp: item.timestamp,
  }));
};

const extrairJsonDaResposta = (raw: unknown): RespostaIA => {
  let texto = "";

  if (typeof raw === "string") {
    texto = raw.trim();
  } else if (raw && typeof raw === "object") {
    texto = JSON.stringify(raw);
  } else {
    throw new Error("Resposta da IA vazia ou inválida.");
  }

  texto = texto
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(texto) as RespostaIA;
  } catch {
    const inicio = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");
    if (inicio === -1 || fim === -1 || fim <= inicio) {
      throw new Error("A IA não retornou um JSON válido.");
    }
    return JSON.parse(texto.slice(inicio, fim + 1)) as RespostaIA;
  }
};

const formatarMensagemErroIA = (status: number, data: any) => {
  const rawMessage =
    data?.error || data?.message || "Falha interna ao consultar a IA.";
  const message = String(rawMessage);
  const lower = message.toLowerCase();

  if (
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("exceeded your current quota")
  ) {
    const retryMatch =
      message.match(/retry in\s+([\d.]+)s/i) ||
      message.match(/"retryDelay":"(\d+)s"/i);
    if (retryMatch?.[1]) {
      const segundos = Math.ceil(Number(retryMatch[1]));
      if (!Number.isNaN(segundos) && segundos > 0) {
        return `Limite da API Gemini atingido. Aguarde cerca de ${segundos} segundos e tente novamente.`;
      }
    }
    return "Limite da API Gemini atingido. Aguarde cerca de 1 minuto e tente novamente.";
  }

  if (lower.includes("abort") || lower.includes("timeout")) {
    return "A consulta ao Gemini demorou demais e foi interrompida.";
  }

  return message;
};

const aplicarFiltroLocal = (
  baseElegivelIA: SorteioElegivel[],
  instrucoesIA: string,
  quota: number,
  separarPorEquipe: boolean,
) => {
  const regra = normalizarComparacao(instrucoesIA);
  let filtrados = [...baseElegivelIA];

  const equipes = ["hora", "tumba", "texas", "aura", "forma", "trama"];
  const equipesCitadas = equipes.filter((eq) => regra.includes(eq));
  if (equipesCitadas.length > 0) {
    filtrados = filtrados.filter((item) =>
      equipesCitadas.some((eq) => normalizarComparacao(item.eqp).includes(eq)),
    );
  }

  const seriesCitadas = Array.from(
    regra.matchAll(/(\d{1,2})\s*[ºo°]?\s*ano/g),
  ).map((m) => m[1]);
  if (seriesCitadas.length > 0) {
    filtrados = filtrados.filter((item) =>
      seriesCitadas.some((serie) =>
        normalizarComparacao(item.serie).includes(serie),
      ),
    );
  }

  const turmasCitadas = Array.from(regra.matchAll(/turma\s+([a-z0-9]+)/gi)).map(
    (m) => normalizarComparacao(m[1]),
  );
  if (turmasCitadas.length > 0) {
    filtrados = filtrados.filter((item) =>
      turmasCitadas.some((turma) =>
        normalizarComparacao(item.turma).includes(turma),
      ),
    );
  }

  const matchesQtd = regra.match(
    /(\d{1,3})\s+(?:alunos|aluno|pessoas|pessoa|responsaveis|responsáveis)/,
  );
  const qtdSolicitada = matchesQtd ? Number(matchesQtd[1]) : undefined;

  return {
    filtrados,
    quotaEfetiva: separarPorEquipe ? quota : qtdSolicitada || quota * 3,
    relatorio: `<p>Falha na IA. Foi aplicado um filtro local conservador sobre a base elegível.</p><p>Regra interpretada: <strong>${instrucoesIA || "Sem filtro textual"}</strong>.</p><p>Encontrados <strong>${filtrados.length}</strong> candidatos elegíveis antes do sorteio.</p>`,
  };
};

const headersValidos = (headers: string[]) => {
  const missing = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  return { ok: missing.length === 0, missing };
};

export default function SorteioPage() {
  const router = useRouter();
  const relatorioRef = useRef<HTMLDivElement>(null);
  const ultimaExecucaoIARef = useRef(0);

  const [dados, setDados] = useState<Inscrito[]>([]);
  const [vencedores, setVencedores] = useState<Inscrito[]>([]);
  const [instrucoesIA, setInstrucoesIA] = useState("");
  const [isProcessandoIA, setIsProcessandoIA] = useState(false);
  const [iaMessage, setIaMessage] = useState("");
  const [iaProgress, setIaProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [quota, setQuota] = useState(40);
  const [regraUnicoFilho, setRegraUnicoFilho] = useState(true);
  const [regraUnicoResponsavel, setRegraUnicoResponsavel] = useState(true);
  const [separarPorEquipe, setSepararPorEquipe] = useState(true);
  const [auditoria, setAuditoria] = useState<AuditoriaItem[]>([]);
  const [seedAtual, setSeedAtual] = useState("");
  const [metodoAtual, setMetodoAtual] = useState<
    "manual" | "ia" | "ia_fallback" | null
  >(null);
  const [relatorioUltimoSorteio, setRelatorioUltimoSorteio] = useState(
    "<p>Sorteio executado com sucesso.</p>",
  );
  const [arquivoOrigem, setArquivoOrigem] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [isSalvando, setIsSalvando] = useState(false);
  const [historicoSalvoId, setHistoricoSalvoId] = useState<string | null>(null);

  const baseElegivelMemo = useMemo(() => construirBaseElegivel(dados), [dados]);
  const totalElegiveis = baseElegivelMemo.elegiveis.length;

  useEffect(() => {
    if (dados.length === 0) return;

    const possiveisDuplicidades = detectarPossiveisDuplicidades(dados);
    const novosLogs: AuditoriaItem[] = [
      {
        tipo: "csv",
        titulo: "Arquivo validado",
        descricao: `${dados.length} inscrições carregadas a partir do CSV ${arquivoOrigem || "sem nome"}.`,
        total: dados.length,
      },
      {
        tipo: "duplicidade_aluno",
        titulo: "Regra da primeira inscrição aplicada",
        descricao: `${baseElegivelMemo.removidosDuplicidadeAluno.length} inscrição(ões) foram removidas por duplicidade de aluno; a primeira inscrição foi preservada.`,
        total: baseElegivelMemo.removidosDuplicidadeAluno.length,
        detalhes: baseElegivelMemo.removidosDuplicidadeAluno
          .slice(0, 12)
          .map(
            (item) =>
              `${item.nome_aluno} | ${item.serie}/${item.turma} | removido em favor do índice ${item.venceuIndex}`,
          ),
      },
    ];

    if (possiveisDuplicidades.length > 0) {
      novosLogs.push({
        tipo: "possivel_duplicidade",
        titulo: "Possíveis duplicidades por nome semelhante",
        descricao:
          "Nenhum registro foi removido por fuzzy match. Estes casos são apenas alertas para auditoria humana.",
        total: possiveisDuplicidades.length,
        detalhes: possiveisDuplicidades,
      });
    }

    setAuditoria(novosLogs);
  }, [arquivoOrigem, baseElegivelMemo, dados]);

  const persistirResultado = async (payload: SorteioPersistidoPayload) => {
    if (!supabase) {
      toast.error("Supabase não configurado no ambiente do navegador.");
      return null;
    }

    setIsSalvando(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let usuarioNome = "Usuário não identificado";
      if (user?.id) {
        const { data: usuarioTabela } = await supabase
          .from("usuarios")
          .select("nome")
          .eq("id", user.id)
          .maybeSingle();
        usuarioNome = usuarioTabela?.nome || user.email || usuarioNome;
      }

      const insertPayload = {
        metodo: payload.metodo,
        seed: payload.seed,
        quota: payload.quota,
        separar_por_equipe: payload.separarPorEquipe,
        instrucoes_ia: payload.instrucoesIA || null,
        arquivo_origem: payload.arquivoOrigem || null,
        total_inscricoes: payload.totalInscricoes,
        total_elegiveis: payload.totalElegiveis,
        total_vencedores: payload.totalVencedores,
        relatorio_html: payload.relatorioHtml,
        vencedores: payload.vencedores,
        auditoria: payload.auditoria,
        csv_headers: payload.csvHeaders,
        user_id: user?.id || null,
        usuario_nome: usuarioNome,
      };

      const { data, error } = await supabase
        .from("sorteios_historico")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error) throw error;

      setHistoricoSalvoId(data?.id || null);
      setAuditoria((prev) => [
        ...prev,
        {
          tipo: "persistencia",
          titulo: "Resultado salvo no histórico",
          descricao: `Sorteio persistido no Supabase com ID ${data?.id || "(sem retorno)"}.`,
          total: payload.totalVencedores,
        },
      ]);

      toast.success("Resultado salvo no histórico do Supabase!");
      return data?.id || null;
    } catch (error: any) {
      toast.error(error?.message || "Falha ao salvar histórico do sorteio.");
      return null;
    } finally {
      setIsSalvando(false);
    }
  };

  const salvarResultadoAtual = async () => {
    if (vencedores.length === 0 || !metodoAtual || !seedAtual) {
      return toast.error("Nenhum resultado pronto para salvar.");
    }

    await persistirResultado({
      metodo: metodoAtual,
      seed: seedAtual,
      quota,
      separarPorEquipe,
      instrucoesIA,
      arquivoOrigem,
      totalInscricoes: dados.length,
      totalElegiveis,
      totalVencedores: vencedores.length,
      relatorioHtml: relatorioUltimoSorteio,
      vencedores,
      auditoria,
      csvHeaders,
    });
  };

  const concluirSorteio = async ({
    selecionados,
    metodo,
    seed,
    relatorio,
    auditoriaExtra = [],
    exibirAlerta = true,
    tituloAlerta = "Sorteio Realizado (v3) 🛡️",
    icone = "success" as "success" | "info",
  }: {
    selecionados: Inscrito[];
    metodo: "manual" | "ia" | "ia_fallback";
    seed: string;
    relatorio: string;
    auditoriaExtra?: AuditoriaItem[];
    exibirAlerta?: boolean;
    tituloAlerta?: string;
    icone?: "success" | "info";
  }) => {
    setVencedores(selecionados);
    setMetodoAtual(metodo);
    setSeedAtual(seed);
    setRelatorioUltimoSorteio(relatorio);

    const auditoriaCompleta = [
      ...auditoria.filter(
        (item) =>
          item.tipo !== "manual" &&
          item.tipo !== "ia" &&
          item.tipo !== "fallback" &&
          item.tipo !== "persistencia",
      ),
      ...auditoriaExtra,
    ];
    setAuditoria(auditoriaCompleta);

    const savedId = await persistirResultado({
      metodo,
      seed,
      quota,
      separarPorEquipe,
      instrucoesIA,
      arquivoOrigem,
      totalInscricoes: dados.length,
      totalElegiveis,
      totalVencedores: selecionados.length,
      relatorioHtml: relatorio,
      vencedores: selecionados,
      auditoria: auditoriaCompleta,
      csvHeaders,
    });

    if (savedId) setHistoricoSalvoId(savedId);

    if (exibirAlerta) {
      await Swal.fire({
        title: tituloAlerta,
        html: relatorio,
        icon: icone,
        confirmButtonColor: "#4f46e5",
      });
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
      Seed: seedAtual,
      Método: metodoAtual || "-",
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
      `Sorteio_CSP_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      Seed: seedAtual,
      Método: metodoAtual || "-",
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
          if (result.isConfirmed) {
            window.open("https://sheets.new", "_blank");
          }
        });
      })
      .catch(() => {
        toast.error("Erro ao copiar dados. Use o botão Baixar CSV.");
      });
  };

  const processFile = (file: File) => {
    if (!file) return;
    const loadingToast = toast.loading("Processando banco de dados...");
    setArquivoOrigem(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        try {
          const linhas = Array.isArray(results.data) ? results.data : [];
          const headers = (results.meta.fields || []).map((item) =>
            String(item),
          );
          setCsvHeaders(headers);
          const validacao = headersValidos(headers);

          if (!validacao.ok) {
            throw new Error(
              `CSV inválido. Colunas ausentes: ${validacao.missing.join(", ")}`,
            );
          }

          const formatados: Inscrito[] = linhas
            .map((row) => ({
              timestamp: normalizarTexto(row[HEADER_TIMESTAMP]),
              email_contato: normalizarTexto(row[HEADER_EMAIL_CONTATO]),
              email_aluno: normalizarTexto(row[HEADER_EMAIL_ALUNO]),
              serie: normalizarTexto(row[HEADER_SERIE]),
              turma: normalizarTexto(row[HEADER_TURMA]),
              nome_aluno: normalizarTexto(row[HEADER_NOME_ALUNO]),
              equipe:
                normalizarTexto(row[HEADER_EQUIPE], "S/ EQUIPE") || "S/ EQUIPE",
              nome_responsavel: normalizarTexto(row[HEADER_RESPONSAVEL]) || "",
            }))
            .filter(
              (item) =>
                item.nome_aluno ||
                item.nome_responsavel ||
                item.email_aluno ||
                item.email_contato,
            );

          if (formatados.length === 0) {
            throw new Error(
              "O CSV foi lido, mas nenhuma inscrição válida foi encontrada.",
            );
          }

          setDados(formatados);
          setVencedores([]);
          setHistoricoSalvoId(null);
          setMetodoAtual(null);
          setSeedAtual("");
          setRelatorioUltimoSorteio("<p>Aguardando sorteio.</p>");

          toast.success(`${formatados.length} inscrições carregadas!`, {
            id: loadingToast,
          });
        } catch (error: any) {
          toast.error(error?.message || "Falha ao processar o CSV.", {
            id: loadingToast,
          });
        }
      },
      error: () => {
        toast.error("Falha na leitura do CSV.", { id: loadingToast });
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const sortearComSeed = (
    base: Array<Inscrito & { __originalIndex: number }>,
    seed: string,
    quotaParam: number,
    separar: boolean,
  ) => {
    let sorteados: typeof base = [];
    if (separar) {
      const equipes = Array.from(new Set(base.map((i) => i.equipe)));
      equipes.forEach((eq) => {
        const candidatos = base.filter((i) => i.equipe === eq);
        sorteados = [
          ...sorteados,
          ...shuffleComSeed(candidatos, `${seed}::${eq}`).slice(0, quotaParam),
        ];
      });
    } else {
      sorteados = shuffleComSeed(base, seed).slice(0, quotaParam * 3);
    }
    return sorteados.map(({ __originalIndex, ...item }) => item);
  };

  const realizarSorteioManual = async () => {
    if (dados.length === 0) return toast.error("Nenhuma inscrição.");

    const sorteioToast = toast.loading("Sorteando...");
    try {
      let base = [...baseElegivelMemo.elegiveis];
      if (regraUnicoFilho) base = [...base];
      if (regraUnicoResponsavel) base = [...base];

      const seed = gerarSeed();
      const sorteados = sortearComSeed(base, seed, quota, separarPorEquipe);
      const relatorio = `<p>Sorteio manual executado com seed <strong>${seed}</strong>.</p><p>Total de inscrições: <strong>${dados.length}</strong>. Base elegível após saneamento: <strong>${base.length}</strong>. Sorteados finais: <strong>${sorteados.length}</strong>.</p>`;

      await concluirSorteio({
        selecionados: sorteados,
        metodo: "manual",
        seed,
        relatorio,
        auditoriaExtra: [
          {
            tipo: "manual",
            titulo: "Sorteio manual executado",
            descricao: `Método Fisher-Yates com seed reproduzível ${seed}.`,
            total: sorteados.length,
          },
        ],
      });

      toast.success("Sorteio concluído!", { id: sorteioToast });
    } catch (error: any) {
      toast.error(error?.message || "Erro ao realizar sorteio manual.", {
        id: sorteioToast,
      });
    }
  };

  const consultarGeminiComRetry = async (body: Record<string, unknown>) => {
    let ultimoErro: any = null;
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      const controller = new AbortController();

      const timeout = window.setTimeout(() => {
        controller.abort(new Error("Timeout da requisição Gemini"));
      }, 85000);

      try {
        const response = await fetch("/api/sorteio-ia", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        window.clearTimeout(timeout);

        if (!response.ok) {
          const texto = await response.text().catch(() => "");
          throw new Error(
            `Erro na API Gemini (${response.status}): ${texto || "sem detalhes"}`,
          );
        }

        const data = await response.json();

        return data;
      } catch (error: any) {
        window.clearTimeout(timeout);

        const foiAbortado =
          error?.name === "AbortError" || controller.signal.aborted;

        if (foiAbortado) {
          if (tentativa < 2) continue;

          throw new Error(
            "A IA demorou demais para responder. Tente novamente.",
          );
        }

        if (tentativa < 2) continue;

        throw error;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    throw ultimoErro;
  };

  const realizarSorteioComIA = async () => {
    if (isProcessandoIA) return;
    if (dados.length === 0 || !instrucoesIA.trim()) {
      return toast.error("Dados ou regras ausentes.");
    }

    const agora = Date.now();
    if (agora - ultimaExecucaoIARef.current < 5000) {
      return toast.error("Aguarde alguns segundos antes de nova consulta.");
    }
    ultimaExecucaoIARef.current = agora;

    setIsProcessandoIA(true);
    setIaProgress(10);
    setIaMessage("Preparando base elegível auditável...");

    const frasesRaciocinio = [
      "Aplicando regra da primeira inscrição por aluno...",
      "Removendo duplicidades indevidas antes da IA...",
      "Enviando apenas a base elegível para interpretação...",
      "Validando retorno estruturado do Gemini...",
    ];

    const baseElegivelIA = montarRegistrosElegiveisIA(dados);
    let passoAtual = 0;
    const animacaoProgresso = window.setInterval(() => {
      if (passoAtual < frasesRaciocinio.length) {
        setIaMessage(frasesRaciocinio[passoAtual]);
        setIaProgress((prev) => Math.min(prev + 12, 75));
        passoAtual++;
      }
    }, 1500);

    try {
      const promptText = `
Você vai interpretar uma regra de sorteio e selecionar IDs já elegíveis.

REGRA DO USUÁRIO:
${instrucoesIA}

REGRAS FIXAS JÁ APLICADAS PELO SISTEMA ANTES DE CHEGAR A VOCÊ:
- cada aluno aparece no máximo uma vez
- quando houve inscrição duplicada para o mesmo aluno, somente a primeira inscrição foi mantida
- responsável repetido para alunos diferentes é permitido
- comparação deve ser tolerante a maiúsculas/minúsculas e acentos

COTA MÁXIMA POR EQUIPE:
${quota}

MODO PADRÃO:
- separar por equipe: ${separarPorEquipe ? "sim" : "não"}
- equipes esperadas no arquivo atual: Hora, Tumba e Texas

TAREFA:
1. Leia a REGRA DO USUÁRIO.
2. Selecione somente IDs existentes no array recebido.
3. Respeite o limite máximo de ${quota} por equipe quando o modo separar por equipe estiver ativo.
4. Se a regra do usuário não restringir, você pode considerar todos os registros elegíveis.
5. Se não houver candidatos válidos, retorne ids: [] e explique no relatório.

FORMATO DE RESPOSTA OBRIGATÓRIO:
Retorne APENAS JSON válido, sem markdown, sem comentários, sem crases, exatamente com estas chaves:
{"relatorio":"<p>...</p>","ids":[1,2,3]}
`.trim();

      const data = await consultarGeminiComRetry({
        prompt: promptText,
        registros: baseElegivelIA,
        quota,
        separarPorEquipe,
      });

      window.clearInterval(animacaoProgresso);
      setIaProgress(85);
      setIaMessage("Conferindo IDs retornados pelo Gemini...");

      const resIA: RespostaIA = {
        relatorio:
          typeof data?.relatorio === "string" ? data.relatorio : undefined,
        ids: Array.isArray(data?.ids) ? data.ids : undefined,
      };
      const relatorio =
        typeof resIA.relatorio === "string" && resIA.relatorio.trim()
          ? resIA.relatorio
          : "<p>Sorteio executado com sucesso.</p>";

      if (!Array.isArray(resIA.ids)) {
        throw new Error("A IA não retornou o campo 'ids' corretamente.");
      }

      const idsElegiveis = new Set(baseElegivelIA.map((item) => item.id));
      const idsValidos = Array.from(
        new Set(
          resIA.ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id))
            .filter((id) => idsElegiveis.has(id)),
        ),
      );

      const selecionados = dados.filter((_, i) => idsValidos.includes(i));

      if (separarPorEquipe) {
        const excessoPorEquipe = Array.from(
          selecionados.reduce<Map<string, number>>((acc, item) => {
            acc.set(item.equipe, (acc.get(item.equipe) || 0) + 1);
            return acc;
          }, new Map()),
        ).find(([, total]) => total > quota);

        if (excessoPorEquipe) {
          throw new Error(
            `A IA excedeu o limite da equipe ${excessoPorEquipe[0]} (máximo ${quota}).`,
          );
        }
      }

      const seed = gerarSeed();
      if (selecionados.length === 0) {
        await concluirSorteio({
          selecionados: [],
          metodo: "ia",
          seed,
          relatorio,
          auditoriaExtra: [
            {
              tipo: "ia",
              titulo: "IA não encontrou candidatos",
              descricao:
                "O Gemini retornou zero IDs válidos para a regra informada.",
              total: 0,
            },
          ],
          tituloAlerta: "Nenhum candidato encontrado",
          icone: "info",
        });
      } else {
        await concluirSorteio({
          selecionados,
          metodo: "ia",
          seed,
          relatorio,
          auditoriaExtra: [
            {
              tipo: "ia",
              titulo: "Sorteio via Gemini executado",
              descricao: `Gemini retornou ${selecionados.length} IDs válidos sobre a base elegível de ${baseElegivelIA.length} registros.`,
              total: selecionados.length,
            },
          ],
        });
      }

      setIaProgress(100);
      setIaMessage("Sorteio finalizado com sucesso!");
    } catch (error: any) {
      console.error(error);
      window.clearInterval(animacaoProgresso);

      try {
        setIaProgress(90);
        setIaMessage("IA indisponível. Aplicando fallback local...");
        const { filtrados, quotaEfetiva, relatorio } = aplicarFiltroLocal(
          baseElegivelIA,
          instrucoesIA,
          quota,
          separarPorEquipe,
        );

        const baseFallback = filtrados
          .map((item) => {
            const original = dados[item.id];
            return { ...original, __originalIndex: item.id };
          })
          .filter(Boolean) as Array<Inscrito & { __originalIndex: number }>;

        const seed = gerarSeed();
        const sorteados = separarPorEquipe
          ? sortearComSeed(baseFallback, seed, quota, true)
          : sortearComSeed(
              baseFallback,
              seed,
              Math.max(1, Math.ceil(quotaEfetiva / 3)),
              false,
            );

        await concluirSorteio({
          selecionados: sorteados,
          metodo: "ia_fallback",
          seed,
          relatorio,
          auditoriaExtra: [
            {
              tipo: "fallback",
              titulo: "Fallback local acionado",
              descricao:
                error?.message ||
                "A integração com IA falhou; o sistema usou o motor local conservador.",
              total: sorteados.length,
            },
          ],
          tituloAlerta: "Fallback local aplicado",
          icone: "info",
        });

        toast.success(
          "IA indisponível. O sistema concluiu o sorteio com fallback local.",
        );
      } catch (fallbackError: any) {
        toast.error(fallbackError?.message || error?.message || "Erro na IA.");
      }
    } finally {
      setIsProcessandoIA(false);
      setIaProgress(0);
      setIaMessage("");
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: "Resultado_Oficial_CSP_v3",
  });

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
                  v3
                </span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-widest mt-1 flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" /> Sorteio
                Criptográfico Auditável
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => router.push("/dashboard/sorteio/historico")}
                className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm"
              >
                <History size={14} /> Histórico de Sorteios
              </button>

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
                      min={1}
                      max={40}
                      onChange={(e) =>
                        setQuota(
                          Math.min(
                            40,
                            Math.max(1, Number(e.target.value) || 1),
                          ),
                        )
                      }
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

              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b dark:border-slate-800 pb-3">
                  <AlertTriangle size={16} className="text-amber-500" />{" "}
                  Auditoria Técnica
                </h3>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-[9px] uppercase font-black text-slate-500">
                        Inscrições
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {dados.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-[9px] uppercase font-black text-slate-500">
                        Elegíveis
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {totalElegiveis}
                      </div>
                    </div>
                  </div>

                  {seedAtual && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                      <div className="text-[9px] uppercase font-black text-emerald-600">
                        Seed reproduzível
                      </div>
                      <div className="text-[11px] font-black break-all text-emerald-900 dark:text-emerald-200">
                        {seedAtual}
                      </div>
                    </div>
                  )}

                  {auditoria.length === 0 ? (
                    <div className="text-[11px] text-slate-500">
                      Carregue um CSV para iniciar a auditoria automática.
                    </div>
                  ) : (
                    auditoria.map((item, idx) => (
                      <div
                        key={`${item.titulo}-${idx}`}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[10px] uppercase font-black text-slate-800 dark:text-white">
                            {item.titulo}
                          </div>
                          {typeof item.total === "number" && (
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              {item.total}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {item.descricao}
                        </p>
                        {item.detalhes && item.detalhes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.detalhes.slice(0, 6).map((det, i) => (
                              <div
                                key={i}
                                className="text-[10px] text-slate-500 dark:text-slate-400"
                              >
                                • {det}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
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
                  placeholder="Ex: Sorteie 10 alunos do 9º ano da equipe Hora..."
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
                    disabled={dados.length === 0 || isProcessandoIA}
                    className="w-full bg-white text-indigo-700 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 shadow-lg disabled:opacity-50"
                  >
                    Executar Lógica via Gemini
                  </button>
                )}
              </div>

              {vencedores.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b flex justify-between items-center gap-3 flex-wrap">
                    <h3 className="text-[11px] font-black uppercase flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-500" size={16} />{" "}
                      Vencedores ({vencedores.length})
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={salvarResultadoAtual}
                        disabled={isSalvando || vencedores.length === 0}
                        className="flex items-center gap-1.5 text-[9px] font-black text-indigo-700 uppercase bg-indigo-100 px-3 py-2 rounded-lg border border-indigo-300 shadow-sm disabled:opacity-50"
                      >
                        {isSalvando ? (
                          <RefreshCcw size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}{" "}
                        Salvar
                      </button>

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

                  <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-[10px] font-bold uppercase tracking-widest text-amber-800 flex flex-wrap gap-4">
                    <span>Método: {metodoAtual || "-"}</span>
                    <span>Seed: {seedAtual || "-"}</span>
                    {historicoSalvoId && (
                      <span>Histórico: {historicoSalvoId}</span>
                    )}
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
                      {seedAtual && (
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">
                          Seed: {seedAtual}
                        </p>
                      )}
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
