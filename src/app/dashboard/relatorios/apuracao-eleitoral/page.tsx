"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import Swal from "sweetalert2";
import { useReactToPrint } from "react-to-print";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  PieChart as PieChartIcon,
  Printer,
  Save,
  Trophy,
  Upload,
} from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
import { supabase } from "@/lib/supabase";

type ResultadoChapa = {
  numero: string;
  nome: string;
  votos: number;
};

type AuditSummary = {
  totalParticipacoes: number | null;
  totalVotosAuditoria: number | null;
  urnasParticipacao: string[];
  urnasVotos: string[];
  votosValidosAuditoria: number | null;
  votosBrancosAuditoria: number | null;
  votosNulosAuditoria: number | null;
  totalParticipacoesBrutas: number | null;
  totalVotosBrutosAuditoria: number | null;
  totalRasUnicos: number | null;
  rasDuplicados: string[];
  votosDescartadosDuplicidade: number;
  auditoriaAplicada: boolean;
  alertas: string[];
};

type ApuracaoResumo = {
  totalVotos: number;
  totalValidos: number;
  totalBrancos: number;
  totalNulos: number;
  vencedora: ResultadoChapa | null;
  empate: boolean;
  chapasEmpatadas: ResultadoChapa[];
  auditoria: AuditSummary;
  observacao: string;
};

type ChartSlice = {
  name: string;
  value: number;
  color: string;
};

type SavedElection = {
  id: string;
  identificador: string;
  nome_eleicao: string;
  ano_referencia: number;
  sequencial: number;
  data_apuracao: string;
  observacao: string | null;
  total_votos: number;
  total_validos: number;
  total_brancos: number;
  total_nulos: number;
  chapa_vencedora_numero: string | null;
  chapa_vencedora_nome: string | null;
  chapa_vencedora_votos: number | null;
  resultado_rows: ResultadoChapa[];
  participacoes_rows: Record<string, string>[];
  votos_rows: Record<string, string>[];
  resumo_json: Partial<ApuracaoResumo> | null;
  created_at: string;
};

type ElectionReport = {
  source: "draft" | "saved";
  id?: string;
  identificador: string;
  nomeEleicao: string;
  dataApuracao: string;
  observacao: string;
  resultados: ResultadoChapa[];
  resumo: ApuracaoResumo;
  chartData: ChartSlice[];
};

type ParsedCsvBundle = {
  resultados: ResultadoChapa[];
  participacoes: Record<string, string>[];
  votosAuditoria: Record<string, string>[];
  resumo: ApuracaoResumo;
  chartData: ChartSlice[];
};

type AuditResolvedVote = {
  ra: string;
  voteType: "valid" | "blank" | "null";
  typedNumber: string | null;
  slateId: number | null;
  urnaId: string;
  votedAt: string;
};

type WinnerResolution = {
  vencedora: ResultadoChapa | null;
  empate: boolean;
  chapasEmpatadas: ResultadoChapa[];
};

const CHART_COLORS = [
  "#1D4ED8",
  "#0F766E",
  "#7C3AED",
  "#EC4899",
  "#F59E0B",
  "#DC2626",
  "#0891B2",
  "#4F46E5",
];

const normalizeText = (value: string | number | null | undefined) =>
  String(value ?? "").trim();

const normalizeKey = (value: string) =>
  normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const parseInteger = (value: string | number | null | undefined) => {
  const normalized = normalizeText(value).replace(/[^\d-]/g, "");
  if (!normalized) {
    return 0;
  }

  return Number.parseInt(normalized, 10) || 0;
};

const padNumber = (value: string | null | undefined) => {
  const digits = normalizeText(value).replace(/\D/g, "");
  if (!digits) {
    return "--";
  }

  return digits.padStart(2, "0");
};

const formatDate = (value: string) => {
  if (!value) {
    return "--";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const formatDateTime = (value: string) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const buildChartData = (
  resultados: ResultadoChapa[],
  totalBrancos: number,
  totalNulos: number,
): ChartSlice[] => {
  const chapas = resultados.map((resultado, index) => ({
    name: `${resultado.numero} - ${resultado.nome}`,
    value: resultado.votos,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const extras: ChartSlice[] = [];
  if (totalBrancos > 0) {
    extras.push({ name: "Brancos", value: totalBrancos, color: "#F59E0B" });
  }
  if (totalNulos > 0) {
    extras.push({ name: "Nulos", value: totalNulos, color: "#DC2626" });
  }

  return [...chapas, ...extras];
};

const resolveWinner = (resultados: ResultadoChapa[]): WinnerResolution => {
  if (resultados.length === 0) {
    return {
      vencedora: null,
      empate: false,
      chapasEmpatadas: [],
    };
  }

  const maiorVotacao = resultados[0]?.votos ?? 0;
  if (maiorVotacao <= 0) {
    return {
      vencedora: null,
      empate: false,
      chapasEmpatadas: [],
    };
  }

  const chapasEmpatadas = resultados.filter((resultado) => resultado.votos === maiorVotacao);
  if (chapasEmpatadas.length > 1) {
    return {
      vencedora: null,
      empate: true,
      chapasEmpatadas,
    };
  }

  return {
    vencedora: chapasEmpatadas[0] ?? null,
    empate: false,
    chapasEmpatadas: [],
  };
};

const formatEmpateList = (chapasEmpatadas: ResultadoChapa[]) =>
  chapasEmpatadas.map((chapa) => `${chapa.numero} - ${chapa.nome}`).join(", ");

const getConicGradient = (chartData: ChartSlice[]) => {
  const total = chartData.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return "conic-gradient(#cbd5e1 0 100%)";
  }

  let current = 0;
  const stops = chartData.map((slice) => {
    const start = current;
    const portion = (slice.value / total) * 100;
    current += portion;
    return `${slice.color} ${start}% ${current}%`;
  });

  return `conic-gradient(${stops.join(", ")})`;
};

const parseCsvFile = async (file: File) => {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeKey(header),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`Falha ao ler o arquivo ${file.name}.`);
  }

  return parsed.data;
};

const parseResultadosCsv = (rows: Record<string, string>[]) => {
  let totalBrancos = 0;
  let totalNulos = 0;

  const resultados: ResultadoChapa[] = rows
    .map((row) => {
      const nome = normalizeText(row.chapa || row.nome || row.lista || row.slate);
      const numero = padNumber(row.numero || row.number);
      const votos = parseInteger(
        row.totalvotosvalidos || row.totalvotos || row.votos || row.total,
      );

      return { nome, numero, votos };
    })
    .filter((row) => row.nome || row.votos > 0)
    .reduce<ResultadoChapa[]>((acc, row) => {
      const upperName = normalizeKey(row.nome);
      if (upperName.includes("votosembranco") || upperName.includes("branco")) {
        totalBrancos += row.votos;
        return acc;
      }
      if (upperName.includes("votosnulos") || upperName.includes("nulo")) {
        totalNulos += row.votos;
        return acc;
      }

      acc.push({
        numero: row.numero,
        nome: row.nome,
        votos: row.votos,
      });
      return acc;
    }, [])
    .sort((a, b) => b.votos - a.votos || a.numero.localeCompare(b.numero));

  return { resultados, totalBrancos, totalNulos };
};

const mergeCsvRows = async (files: File[]) => {
  const mergedRows: Record<string, string>[] = [];

  for (const file of files) {
    const rows = await parseCsvFile(file);
    mergedRows.push(...rows);
  }

  return mergedRows;
};

const mergeResultadosRows = (rows: Record<string, string>[]) => {
  const byKey = new Map<string, ResultadoChapa>();
  let totalBrancos = 0;
  let totalNulos = 0;

  for (const row of rows) {
    const nome = normalizeText(row.chapa || row.nome || row.lista || row.slate);
    const numero = padNumber(row.numero || row.number);
    const votos = parseInteger(row.totalvotosvalidos || row.totalvotos || row.votos || row.total);
    const upperName = normalizeKey(nome);

    if (!nome && votos <= 0) {
      continue;
    }

    if (upperName.includes("votosembranco") || upperName.includes("branco")) {
      totalBrancos += votos;
      continue;
    }

    if (upperName.includes("votosnulos") || upperName.includes("nulo")) {
      totalNulos += votos;
      continue;
    }

    const key = `${numero}::${nome}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.votos += votos;
      continue;
    }

    byKey.set(key, {
      numero,
      nome,
      votos,
    });
  }

  const resultados = Array.from(byKey.values()).sort(
    (a, b) => b.votos - a.votos || a.numero.localeCompare(b.numero),
  );

  return { resultados, totalBrancos, totalNulos };
};

const resolveAuditedVotes = ({
  participacoes,
  votosAuditoria,
  resultadosBase,
}: {
  participacoes: Record<string, string>[];
  votosAuditoria: Record<string, string>[];
  resultadosBase: ResultadoChapa[];
}) => {
  if (participacoes.length === 0 || votosAuditoria.length === 0) {
    return null;
  }

  const participacoesPorChave = new Map<string, string[]>();
  for (const row of participacoes) {
    const ra = normalizeText(row.ra);
    const urnaId = normalizeText(row.urnaid || row.urna_id);
    const votedAt = normalizeText(row.votedat || row.voted_at);
    if (!ra || !urnaId || !votedAt) {
      continue;
    }

    const key = `${urnaId}::${votedAt}`;
    const list = participacoesPorChave.get(key) ?? [];
    list.push(ra);
    participacoesPorChave.set(key, list);
  }

  const slatesByNumber = new Map<string, ResultadoChapa>();
  resultadosBase.forEach((resultado) => {
    slatesByNumber.set(resultado.numero, resultado);
  });

  const votosComRa: AuditResolvedVote[] = [];
  const votosSemParticipacao: string[] = [];

  for (const row of votosAuditoria) {
    const urnaId = normalizeText(row.urnaid || row.urna_id);
    const votedAt = normalizeText(row.votedat || row.voted_at);
    const voteTypeRaw = normalizeText(row.votetype || row.vote_type).toLowerCase();
    const typedNumberRaw = normalizeText(row.typednumber || row.typed_number);
    const slateIdRaw = normalizeText(row.slateid || row.slate_id);
    const key = `${urnaId}::${votedAt}`;
    const queue = participacoesPorChave.get(key);
    const ra = queue?.shift() ?? "";

    if (!ra) {
      votosSemParticipacao.push(key);
      continue;
    }

    const voteType: "valid" | "blank" | "null" =
      voteTypeRaw === "blank" || voteTypeRaw === "null" ? voteTypeRaw : "valid";

    votosComRa.push({
      ra,
      voteType,
      typedNumber: typedNumberRaw ? padNumber(typedNumberRaw) : null,
      slateId: slateIdRaw ? Number.parseInt(slateIdRaw, 10) || null : null,
      urnaId,
      votedAt,
    });
  }

  const uniqueVotesByRa = new Map<string, AuditResolvedVote>();
  const rasDuplicadosSet = new Set<string>();
  let votosDescartadosDuplicidade = 0;

  for (const voto of votosComRa) {
    if (uniqueVotesByRa.has(voto.ra)) {
      rasDuplicadosSet.add(voto.ra);
      votosDescartadosDuplicidade += 1;
      continue;
    }

    uniqueVotesByRa.set(voto.ra, voto);
  }

  const resultadosAuditadosMap = new Map<string, ResultadoChapa>();
  resultadosBase.forEach((resultado) => {
    resultadosAuditadosMap.set(resultado.numero, {
      numero: resultado.numero,
      nome: resultado.nome,
      votos: 0,
    });
  });

  let totalBrancosAuditados = 0;
  let totalNulosAuditados = 0;

  Array.from(uniqueVotesByRa.values()).forEach((voto) => {
    if (voto.voteType === "blank") {
      totalBrancosAuditados += 1;
      return;
    }

    if (voto.voteType === "null") {
      totalNulosAuditados += 1;
      return;
    }

    const numero = voto.typedNumber ? padNumber(voto.typedNumber) : "";
    const resultado = resultadosAuditadosMap.get(numero);
    if (resultado) {
      resultado.votos += 1;
      return;
    }

    totalNulosAuditados += 1;
  });

  const resultadosAuditados = Array.from(resultadosAuditadosMap.values()).sort(
    (a, b) => b.votos - a.votos || a.numero.localeCompare(b.numero),
  );

  return {
    resultados: resultadosAuditados,
    totalBrancos: totalBrancosAuditados,
    totalNulos: totalNulosAuditados,
    totalParticipacoesBrutas: participacoes.length,
    totalVotosBrutosAuditoria: votosAuditoria.length,
    totalRasUnicos: uniqueVotesByRa.size,
    rasDuplicados: Array.from(rasDuplicadosSet).sort((a, b) => a.localeCompare(b)),
    votosDescartadosDuplicidade,
    votosSemParticipacao,
  };
};

const buildAuditSummary = ({
  participacoes,
  votosAuditoria,
  totalValidos,
  totalBrancos,
  totalNulos,
  auditResolution,
}: {
  participacoes: Record<string, string>[];
  votosAuditoria: Record<string, string>[];
  totalValidos: number;
  totalBrancos: number;
  totalNulos: number;
  auditResolution: ReturnType<typeof resolveAuditedVotes>;
}): AuditSummary => {
  const alertas: string[] = [];
  const totalParticipacoesBrutas = participacoes.length > 0 ? participacoes.length : null;
  const totalVotosBrutosAuditoria = votosAuditoria.length > 0 ? votosAuditoria.length : null;
  const totalParticipacoes =
    auditResolution?.totalRasUnicos ?? (participacoes.length > 0 ? participacoes.length : null);
  const totalVotosAuditoria =
    auditResolution?.totalRasUnicos ?? (votosAuditoria.length > 0 ? votosAuditoria.length : null);

  const votosValidosAuditoria =
    auditResolution
      ? auditResolution.resultados.reduce((sum, row) => sum + row.votos, 0)
      : votosAuditoria.length > 0
      ? votosAuditoria.filter((row) => normalizeText(row.votetype) === "valid").length
      : null;
  const votosBrancosAuditoria =
    auditResolution
      ? auditResolution.totalBrancos
      : votosAuditoria.length > 0
      ? votosAuditoria.filter((row) => normalizeText(row.votetype) === "blank").length
      : null;
  const votosNulosAuditoria =
    auditResolution
      ? auditResolution.totalNulos
      : votosAuditoria.length > 0
      ? votosAuditoria.filter((row) => normalizeText(row.votetype) === "null").length
      : null;

  if (totalParticipacoes !== null && totalParticipacoes !== totalValidos + totalBrancos + totalNulos) {
    alertas.push(
      "O total de participacoes nao confere com a soma de votos validos, brancos e nulos.",
    );
  }

  if (totalVotosAuditoria !== null && totalVotosAuditoria !== totalValidos + totalBrancos + totalNulos) {
    alertas.push(
      "O total do arquivo votos_auditoria.csv nao confere com a apuracao consolidada.",
    );
  }

  if (votosValidosAuditoria !== null && votosValidosAuditoria !== totalValidos) {
    alertas.push("A contagem de votos validos do arquivo de auditoria diverge do resultado local.");
  }
  if (votosBrancosAuditoria !== null && votosBrancosAuditoria !== totalBrancos) {
    alertas.push("A contagem de votos em branco do arquivo de auditoria diverge do resultado local.");
  }
  if (votosNulosAuditoria !== null && votosNulosAuditoria !== totalNulos) {
    alertas.push("A contagem de votos nulos do arquivo de auditoria diverge do resultado local.");
  }

  const urnasParticipacao = Array.from(
    new Set(participacoes.map((row) => normalizeText(row.urnaid || row.urnaid)).filter(Boolean)),
  );
  const urnasVotos = Array.from(
    new Set(votosAuditoria.map((row) => normalizeText(row.urnaid || row.urnaid)).filter(Boolean)),
  );

  if ((auditResolution?.rasDuplicados.length ?? 0) > 0) {
    alertas.push(
      `${auditResolution?.rasDuplicados.length ?? 0} RA(s) com voto duplicado entre urnas. Apenas um voto por RA foi considerado.`,
    );
  }

  if ((auditResolution?.votosSemParticipacao.length ?? 0) > 0) {
    alertas.push(
      `${auditResolution?.votosSemParticipacao.length ?? 0} voto(s) de auditoria nao puderam ser vinculados a uma participacao por urna/data.`,
    );
  }

  return {
    totalParticipacoes,
    totalVotosAuditoria,
    urnasParticipacao,
    urnasVotos,
    votosValidosAuditoria,
    votosBrancosAuditoria,
    votosNulosAuditoria,
    totalParticipacoesBrutas,
    totalVotosBrutosAuditoria,
    totalRasUnicos: auditResolution?.totalRasUnicos ?? null,
    rasDuplicados: auditResolution?.rasDuplicados ?? [],
    votosDescartadosDuplicidade: auditResolution?.votosDescartadosDuplicidade ?? 0,
    auditoriaAplicada: Boolean(auditResolution),
    alertas,
  };
};

const buildParsedBundle = ({
  resultadosRows,
  participacoesRows,
  votosRows,
  observacao,
}: {
  resultadosRows: Record<string, string>[];
  participacoesRows: Record<string, string>[];
  votosRows: Record<string, string>[];
  observacao: string;
}): ParsedCsvBundle => {
  const baseResults = mergeResultadosRows(resultadosRows);
  const auditResolution = resolveAuditedVotes({
    participacoes: participacoesRows,
    votosAuditoria: votosRows,
    resultadosBase: baseResults.resultados,
  });
  const resultados = auditResolution?.resultados ?? baseResults.resultados;
  const totalBrancos = auditResolution?.totalBrancos ?? baseResults.totalBrancos;
  const totalNulos = auditResolution?.totalNulos ?? baseResults.totalNulos;
  const totalValidos = resultados.reduce((sum, row) => sum + row.votos, 0);
  const totalVotos = totalValidos + totalBrancos + totalNulos;
  const { vencedora, empate, chapasEmpatadas } = resolveWinner(resultados);

  const auditoria = buildAuditSummary({
    participacoes: participacoesRows,
    votosAuditoria: votosRows,
    totalValidos,
    totalBrancos,
    totalNulos,
    auditResolution,
  });

  const resumo: ApuracaoResumo = {
    totalVotos,
    totalValidos,
    totalBrancos,
    totalNulos,
    vencedora,
    empate,
    chapasEmpatadas,
    auditoria,
    observacao,
  };

  return {
    resultados,
    participacoes: participacoesRows,
    votosAuditoria: votosRows,
    resumo,
    chartData: buildChartData(resultados, totalBrancos, totalNulos),
  };
};

const mapSavedElectionToReport = (row: SavedElection): ElectionReport => {
  const winnerResolution = resolveWinner(row.resultado_rows);
  const resumo = {
    totalVotos: row.total_votos,
    totalValidos: row.total_validos,
    totalBrancos: row.total_brancos,
    totalNulos: row.total_nulos,
    vencedora: winnerResolution.vencedora,
    empate:
      typeof row.resumo_json?.empate === "boolean" ? row.resumo_json.empate : winnerResolution.empate,
    chapasEmpatadas: Array.isArray(row.resumo_json?.chapasEmpatadas)
      ? row.resumo_json.chapasEmpatadas
      : winnerResolution.chapasEmpatadas,
    auditoria: {
      totalParticipacoes:
        typeof row.resumo_json?.auditoria?.totalParticipacoes === "number"
          ? row.resumo_json.auditoria.totalParticipacoes
          : row.participacoes_rows.length || null,
      totalVotosAuditoria:
        typeof row.resumo_json?.auditoria?.totalVotosAuditoria === "number"
          ? row.resumo_json.auditoria.totalVotosAuditoria
          : row.votos_rows.length || null,
      urnasParticipacao:
        Array.isArray(row.resumo_json?.auditoria?.urnasParticipacao)
          ? row.resumo_json.auditoria.urnasParticipacao
          : [],
      urnasVotos:
        Array.isArray(row.resumo_json?.auditoria?.urnasVotos)
          ? row.resumo_json.auditoria.urnasVotos
          : [],
      votosValidosAuditoria:
        typeof row.resumo_json?.auditoria?.votosValidosAuditoria === "number"
          ? row.resumo_json.auditoria.votosValidosAuditoria
          : null,
      votosBrancosAuditoria:
        typeof row.resumo_json?.auditoria?.votosBrancosAuditoria === "number"
          ? row.resumo_json.auditoria.votosBrancosAuditoria
          : null,
      votosNulosAuditoria:
        typeof row.resumo_json?.auditoria?.votosNulosAuditoria === "number"
          ? row.resumo_json.auditoria.votosNulosAuditoria
          : null,
      totalParticipacoesBrutas:
        typeof row.resumo_json?.auditoria?.totalParticipacoesBrutas === "number"
          ? row.resumo_json.auditoria.totalParticipacoesBrutas
          : row.participacoes_rows.length || null,
      totalVotosBrutosAuditoria:
        typeof row.resumo_json?.auditoria?.totalVotosBrutosAuditoria === "number"
          ? row.resumo_json.auditoria.totalVotosBrutosAuditoria
          : row.votos_rows.length || null,
      totalRasUnicos:
        typeof row.resumo_json?.auditoria?.totalRasUnicos === "number"
          ? row.resumo_json.auditoria.totalRasUnicos
          : null,
      rasDuplicados: Array.isArray(row.resumo_json?.auditoria?.rasDuplicados)
        ? row.resumo_json.auditoria.rasDuplicados
        : [],
      votosDescartadosDuplicidade:
        typeof row.resumo_json?.auditoria?.votosDescartadosDuplicidade === "number"
          ? row.resumo_json.auditoria.votosDescartadosDuplicidade
          : 0,
      auditoriaAplicada:
        typeof row.resumo_json?.auditoria?.auditoriaAplicada === "boolean"
          ? row.resumo_json.auditoria.auditoriaAplicada
          : false,
      alertas: Array.isArray(row.resumo_json?.auditoria?.alertas)
        ? row.resumo_json.auditoria.alertas
        : [],
    },
    observacao: row.observacao || "",
  } satisfies ApuracaoResumo;

  return {
    source: "saved",
    id: row.id,
    identificador: row.identificador,
    nomeEleicao: row.nome_eleicao,
    dataApuracao: row.data_apuracao,
    observacao: row.observacao || "",
    resultados: row.resultado_rows,
    resumo,
    chartData: buildChartData(row.resultado_rows, row.total_brancos, row.total_nulos),
  };
};

export default function ApuracaoEleitoralPage() {
  const { user } = useAuth();
  const { coligadaAtual } = useColigada();
  const reportRef = useRef<HTMLDivElement>(null);

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [nomeEleicao, setNomeEleicao] = useState("");
  const [dataApuracao, setDataApuracao] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [observacao, setObservacao] = useState("");

  const [resultadoFiles, setResultadoFiles] = useState<File[]>([]);
  const [participacoesFiles, setParticipacoesFiles] = useState<File[]>([]);
  const [votosFiles, setVotosFiles] = useState<File[]>([]);

  const [savedElections, setSavedElections] = useState<SavedElection[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [draftReport, setDraftReport] = useState<ElectionReport | null>(null);
  const [printLogoSrc, setPrintLogoSrc] = useState("/assets/logo-csp.png");

  const selectedSavedReport = useMemo(() => {
    const selected = savedElections.find((row) => row.id === selectedSavedId);
    return selected ? mapSavedElectionToReport(selected) : null;
  }, [savedElections, selectedSavedId]);

  const activeReport = draftReport ?? selectedSavedReport;

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: activeReport
      ? `${activeReport.identificador}_${activeReport.nomeEleicao}`
      : "Relatorio_Apuracao",
  });

  useEffect(() => {
    if (!coligadaAtual) {
      return;
    }

    void loadHistory();
  }, [coligadaAtual]);

  useEffect(() => {
    let active = true;

    async function loadPrintLogo() {
      try {
        const response = await fetch("/assets/logo-csp.png");
        if (!response.ok) {
          throw new Error("Falha ao carregar logo para impressao.");
        }

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active && typeof reader.result === "string") {
            setPrintLogoSrc(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error(error);
        if (active) {
          setPrintLogoSrc("/assets/logo-csp.png");
        }
      }
    }

    void loadPrintLogo();

    return () => {
      active = false;
    };
  }, []);

  async function loadHistory() {
    if (!coligadaAtual) {
      return;
    }

    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("apuracoes_eleitorais")
        .select("*")
        .eq("sede_id", coligadaAtual.id)
        .order("data_apuracao", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rows = (data || []) as SavedElection[];
      setSavedElections(rows);
      if (rows.length > 0 && !selectedSavedId) {
        setSelectedSavedId(rows[0].id);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Tabela nao encontrada",
        text: "Aplique primeiro o SQL docs/superpowers/sql/2026-04-29-apuracoes-eleitorais.sql no Supabase.",
        icon: "warning",
        confirmButtonColor: "#E87B35",
      });
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleGenerateApuracao() {
    if (resultadoFiles.length === 0) {
      await Swal.fire({
        title: "Arquivo obrigatorio",
        text: "Selecione pelo menos um resultado_local.csv para gerar a apuracao.",
        icon: "warning",
        confirmButtonColor: "#E87B35",
      });
      return;
    }

    if (!nomeEleicao.trim()) {
      await Swal.fire({
        title: "Informe a eleicao",
        text: "Preencha o nome da eleicao antes de gerar a apuracao.",
        icon: "warning",
        confirmButtonColor: "#E87B35",
      });
      return;
    }

    setGenerating(true);
    try {
      const resultadosRows = await mergeCsvRows(resultadoFiles);
      const participacoesRows = participacoesFiles.length > 0 ? await mergeCsvRows(participacoesFiles) : [];
      const votosRows = votosFiles.length > 0 ? await mergeCsvRows(votosFiles) : [];

      const parsed = buildParsedBundle({
        resultadosRows,
        participacoesRows,
        votosRows,
        observacao,
      });

      setDraftReport({
        source: "draft",
        identificador: "RASCUNHO",
        nomeEleicao: nomeEleicao.trim(),
        dataApuracao,
        observacao,
        resultados: parsed.resultados,
        resumo: parsed.resumo,
        chartData: parsed.chartData,
      });
      setSelectedSavedId(null);

      await Swal.fire({
        title: "Apuracao carregada",
        text: "Revise o relatorio e clique em salvar para registrar a eleicao no historico.",
        icon: "success",
        confirmButtonColor: "#E87B35",
      });
    } catch (error) {
      console.error(error);
      await Swal.fire({
        title: "Falha ao gerar",
        text: error instanceof Error ? error.message : "Nao foi possivel processar os arquivos CSV.",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function getNextIdentifier() {
    if (!coligadaAtual) {
      throw new Error("Coligada atual nao encontrada.");
    }

    const year = Number.parseInt(dataApuracao.slice(0, 4), 10) || new Date().getFullYear();
    const { data, error } = await supabase
      .from("apuracoes_eleitorais")
      .select("sequencial")
      .eq("sede_id", coligadaAtual.id)
      .eq("ano_referencia", year)
      .order("sequencial", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    const nextSequence = ((data?.[0]?.sequencial as number | undefined) || 0) + 1;
    const identifier = `AP-${coligadaAtual.sigla.toUpperCase()}-${year}-${String(nextSequence).padStart(4, "0")}`;

    return {
      year,
      nextSequence,
      identifier,
    };
  }

  async function handleSaveApuracao() {
    if (!draftReport || !coligadaAtual) {
      await Swal.fire({
        title: "Nada para salvar",
        text: "Gere a apuracao antes de tentar salvar.",
        icon: "warning",
        confirmButtonColor: "#E87B35",
      });
      return;
    }

    setSaving(true);
    try {
      const resultadosRows = await mergeCsvRows(resultadoFiles);
      const participacoesRows = participacoesFiles.length > 0 ? await mergeCsvRows(participacoesFiles) : [];
      const votosRows = votosFiles.length > 0 ? await mergeCsvRows(votosFiles) : [];
      const parsed = buildParsedBundle({
        resultadosRows,
        participacoesRows,
        votosRows,
        observacao,
      });

      let saved = false;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 2 && !saved; attempt += 1) {
        try {
          const { year, nextSequence, identifier } = await getNextIdentifier();

          const payload = {
            sede_id: coligadaAtual.id,
            identificador: identifier,
            nome_eleicao: nomeEleicao.trim(),
            ano_referencia: year,
            sequencial: nextSequence,
            data_apuracao: dataApuracao,
            observacao: observacao.trim() || null,
            total_votos: parsed.resumo.totalVotos,
            total_validos: parsed.resumo.totalValidos,
            total_brancos: parsed.resumo.totalBrancos,
            total_nulos: parsed.resumo.totalNulos,
            chapa_vencedora_numero: parsed.resumo.empate ? null : parsed.resumo.vencedora?.numero || null,
            chapa_vencedora_nome: parsed.resumo.empate ? null : parsed.resumo.vencedora?.nome || null,
            chapa_vencedora_votos: parsed.resumo.empate ? null : parsed.resumo.vencedora?.votos || null,
            resultado_rows: parsed.resultados,
            participacoes_rows: parsed.participacoes,
            votos_rows: parsed.votosAuditoria,
            resumo_json: parsed.resumo,
            created_by: user?.id || null,
          };

          const { data, error } = await supabase
            .from("apuracoes_eleitorais")
            .insert(payload)
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          const row = data as SavedElection;
          setSavedElections((current) => [row, ...current]);
          setSelectedSavedId(row.id);
          setDraftReport(null);
          saved = true;

          await Swal.fire({
            title: "Eleicao salva",
            text: `A apuracao ${identifier} foi registrada no historico da coligada.`,
            icon: "success",
            confirmButtonColor: "#0f766e",
          });
        } catch (error) {
          lastError = error;
        }
      }

      if (!saved && lastError) {
        throw lastError;
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        title: "Erro ao salvar",
        text:
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar a eleicao no historico do Supabase.",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setSaving(false);
    }
  }

  const reportGradient = useMemo(
    () => getConicGradient(activeReport?.chartData || []),
    [activeReport],
  );

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen flex flex-col font-sans overflow-auto no-scrollbar pb-10">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .print-area {
                display: block !important;
                width: 100% !important;
              }
              .print-page {
                break-after: page;
                box-shadow: none !important;
                margin: 0 !important;
              }
            }
          `,
        }}
      />

      <div className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/relatorios"
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-[#E87B35] hover:text-white transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <PieChartIcon className="text-[#E87B35]" />
              Apuracao Eleitoral
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleGenerateApuracao()}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95 disabled:opacity-40"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Gerar apuracao
            </button>
            <button
              onClick={() => void handleSaveApuracao()}
              disabled={!draftReport || saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#E87B35] text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95 disabled:opacity-40"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Salvar eleicao
            </button>
            <button
              onClick={() => void handlePrint()}
              disabled={!activeReport}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95 disabled:opacity-40"
            >
              <Printer size={15} />
              Imprimir A4
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 no-print">
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-400">
                  Nova apuracao
                </p>
                <h2 className="text-xl font-black text-slate-800 dark:text-white mt-1">
                  Relatorio eleitoral
                </h2>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase">
                {coligadaAtual?.sigla || "Coligada"}
              </div>
            </div>

            <div className="space-y-4 mt-5">
              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Nome da eleicao
                </span>
                <input
                  value={nomeEleicao}
                  onChange={(event) => setNomeEleicao(event.target.value)}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-[12px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
                  placeholder="Ex.: Eleicao do Gremio 2026"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Data da apuracao
                  </span>
                  <input
                    type="date"
                    value={dataApuracao}
                    onChange={(event) => setDataApuracao(event.target.value)}
                    className="mt-1 w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-[12px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
                  />
                </label>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 mt-5 md:mt-0 flex items-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Identificador
                    </span>
                    <p className="text-[12px] font-black text-slate-800 dark:text-slate-100 mt-1">
                      Gerado ao salvar
                    </p>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Observacao
                </span>
                <textarea
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  rows={3}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-[12px] font-bold outline-none border-none resize-none focus:ring-2 focus:ring-[#E87B35]"
                  placeholder="Observacoes opcionais da comissao"
                />
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-400">
              Arquivos CSV
            </p>
            <div className="space-y-3 mt-4">
              <label className="block rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-100">
                  resultado_local.csv
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Obrigatorio. Pode enviar varios arquivos, um por urna, para consolidar os votos por chapa.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={(event) => setResultadoFiles(Array.from(event.target.files || []))}
                  className="mt-3 w-full text-[11px] font-bold"
                />
                {resultadoFiles.length > 0 ? (
                  <p className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {resultadoFiles.length} arquivo(s) selecionado(s)
                  </p>
                ) : null}
              </label>

              <label className="block rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-100">
                  participacoes_auditoria.csv
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Opcional. Pode enviar varios arquivos para detectar RAs duplicados entre urnas.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={(event) => setParticipacoesFiles(Array.from(event.target.files || []))}
                  className="mt-3 w-full text-[11px] font-bold"
                />
                {participacoesFiles.length > 0 ? (
                  <p className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {participacoesFiles.length} arquivo(s) selecionado(s)
                  </p>
                ) : null}
              </label>

              <label className="block rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-100">
                  votos_auditoria.csv
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Opcional. Pode enviar varios arquivos para recalcular a apuracao auditada por RA unico.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={(event) => setVotosFiles(Array.from(event.target.files || []))}
                  className="mt-3 w-full text-[11px] font-bold"
                />
                {votosFiles.length > 0 ? (
                  <p className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {votosFiles.length} arquivo(s) selecionado(s)
                  </p>
                ) : null}
              </label>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[1.5rem] p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-300">
                  Historico da coligada
                </p>
                <h2 className="text-2xl font-black mt-2">
                  Eleicoes salvas em {coligadaAtual?.sigla || "CSP"}
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Clique em uma eleicao para abrir o relatorio salvo e imprimir novamente.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-300">
                <Database size={14} /> Supabase
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_320px] gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-400">
                    Preview da apuracao
                  </p>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">
                    {activeReport ? activeReport.nomeEleicao : "Nenhuma apuracao carregada"}
                  </h3>
                </div>
                {activeReport ? (
                  <div className="px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 text-xs font-black uppercase flex items-center gap-2">
                    <Trophy size={14} />
                    {activeReport.resumo.empate
                      ? "Empate"
                      : activeReport.resumo.vencedora
                        ? `Vencedora ${activeReport.resumo.vencedora.numero}`
                        : "Sem vencedora"}
                  </div>
                ) : null}
              </div>

              {!activeReport ? (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500">
                  Gere uma apuracao nova ou selecione uma eleicao salva no historico.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
                      <p className="text-[10px] uppercase font-black text-slate-400">Total</p>
                      <strong className="text-2xl text-slate-800 dark:text-white">
                        {activeReport.resumo.totalVotos}
                      </strong>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4">
                      <p className="text-[10px] uppercase font-black text-emerald-700">Validos</p>
                      <strong className="text-2xl text-emerald-700">
                        {activeReport.resumo.totalValidos}
                      </strong>
                    </div>
                    <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/30 p-4">
                      <p className="text-[10px] uppercase font-black text-orange-700">Brancos</p>
                      <strong className="text-2xl text-orange-700">
                        {activeReport.resumo.totalBrancos}
                      </strong>
                    </div>
                    <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4">
                      <p className="text-[10px] uppercase font-black text-rose-700">Nulos</p>
                      <strong className="text-2xl text-rose-700">
                        {activeReport.resumo.totalNulos}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4 mt-5">
                    <div className="rounded-[1.5rem] border border-slate-200 dark:border-slate-800 p-4 h-[420px]">
                      <div className="flex items-center gap-2 mb-3 text-slate-600 dark:text-slate-300">
                        <PieChartIcon size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                          Distribuicao dos votos
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={activeReport.chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="42%"
                            outerRadius={96}
                            innerRadius={54}
                            paddingAngle={2}
                          >
                            {activeReport.chartData.map((slice) => (
                              <Cell key={slice.name} fill={slice.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={56} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-[1.5rem] border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                          Vencedora
                        </p>
                        {activeReport.resumo.empate ? (
                          <div className="mt-3">
                            <h4 className="text-2xl font-black text-slate-800 dark:text-white">EMPATE</h4>
                            <p className="text-sm text-slate-500 mt-1">
                              {formatEmpateList(activeReport.resumo.chapasEmpatadas)}
                            </p>
                          </div>
                        ) : activeReport.resumo.vencedora ? (
                          <div className="mt-3">
                            <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                              {activeReport.resumo.vencedora.numero} -{" "}
                              {activeReport.resumo.vencedora.nome}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">
                              {activeReport.resumo.vencedora.votos} votos validos
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 mt-3">Nenhuma chapa vencedora definida.</p>
                        )}
                      </div>

                      <div className="rounded-[1.5rem] border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                          Auditoria
                        </p>
                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <span className="text-slate-500">
                              {activeReport.resumo.auditoria.auditoriaAplicada ? "RAs unicos" : "Participacoes"}
                            </span>
                            <p className="font-black text-slate-800 dark:text-white">
                              {activeReport.resumo.auditoria.totalParticipacoes ?? "--"}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">
                              {activeReport.resumo.auditoria.auditoriaAplicada ? "Votos auditados" : "Votos auditoria"}
                            </span>
                            <p className="font-black text-slate-800 dark:text-white">
                              {activeReport.resumo.auditoria.totalVotosAuditoria ?? "--"}
                            </p>
                          </div>
                        </div>

                        {activeReport.resumo.auditoria.auditoriaAplicada ? (
                          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                            <div>
                              <span className="text-slate-500">Participacoes brutas</span>
                              <p className="font-black text-slate-800 dark:text-white">
                                {activeReport.resumo.auditoria.totalParticipacoesBrutas ?? "--"}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Votos descartados</span>
                              <p className="font-black text-slate-800 dark:text-white">
                                {activeReport.resumo.auditoria.votosDescartadosDuplicidade}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {activeReport.resumo.auditoria.rasDuplicados.length > 0 ? (
                          <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3">
                            <div className="text-rose-700 text-xs font-black uppercase">
                              RAs com duplicidade entre urnas
                            </div>
                            <p className="mt-2 text-xs text-rose-800 break-words">
                              {activeReport.resumo.auditoria.rasDuplicados.join(", ")}
                            </p>
                          </div>
                        ) : null}

                        {activeReport.resumo.auditoria.alertas.length > 0 ? (
                          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3">
                            <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase">
                              <AlertTriangle size={14} />
                              Alertas de consistencia
                            </div>
                            <ul className="mt-2 text-xs text-amber-800 space-y-1">
                              {activeReport.resumo.auditoria.alertas.map((alerta) => (
                                <li key={alerta}>{alerta}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 text-xs font-black uppercase flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            Sem divergencias nos arquivos enviados
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Numero
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Chapa
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 text-right">
                            Votos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReport.resultados.map((resultado) => (
                          <tr
                            key={`${resultado.numero}-${resultado.nome}`}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-4 py-3 text-sm font-black text-slate-800 dark:text-white">
                              {resultado.numero}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                              {resultado.nome}
                            </td>
                            <td className="px-4 py-3 text-sm font-black text-slate-800 dark:text-white text-right">
                              {resultado.votos}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-400">
                    Historico
                  </p>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">
                    Eleicoes anteriores
                  </h3>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                  <CalendarDays size={12} />
                  {savedElections.length}
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[720px] overflow-auto pr-1">
                {loadingHistory ? (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Carregando historico...
                  </div>
                ) : savedElections.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 text-sm text-slate-500">
                    Nenhuma eleicao salva nesta coligada ainda.
                  </div>
                ) : (
                  savedElections.map((election) => {
                    const selected = election.id === selectedSavedId;
                    const electionWinner = resolveWinner(election.resultado_rows);
                    return (
                      <button
                        key={election.id}
                        onClick={() => {
                          setDraftReport(null);
                          setSelectedSavedId(election.id);
                        }}
                        className={`w-full text-left rounded-[1.25rem] border p-4 transition-all ${
                          selected
                            ? "border-[#E87B35] bg-orange-50 dark:bg-orange-950/20"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-300"
                        }`}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {election.identificador}
                            </div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">
                              {election.nome_eleicao}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(election.data_apuracao)} • {formatDateTime(election.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-black text-slate-400">
                              vencedora
                            </div>
                            <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                              {electionWinner.empate
                                ? "EMPATE"
                                : electionWinner.vencedora?.numero || "--"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center p-8 print:p-0">
        <div ref={reportRef} className="print-area w-full max-w-[820px]">
          {activeReport ? (
            <div className="print-page bg-white text-black rounded-[1.5rem] shadow-2xl overflow-hidden">
              <div className="border-t-[12px] border-[#E87B35] px-8 py-7">
                <div className="flex justify-between items-start gap-6 border-b border-slate-200 pb-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={printLogoSrc}
                      alt="Logo CSP"
                      width={170}
                      height={48}
                      className="h-12 w-auto object-contain shrink-0"
                    />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                        Colegio Sao Paulo
                      </p>
                      <h2 className="text-[28px] font-black uppercase text-slate-900 leading-none mt-1">
                        Relatorio de Apuracao
                      </h2>
                      <p className="text-[13px] text-slate-600 mt-2">{activeReport.nomeEleicao}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Identificador
                    </p>
                    <p className="text-[18px] font-black text-slate-900 mt-1">
                      {activeReport.identificador}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {formatDate(activeReport.dataApuracao)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[1.1fr_.9fr] gap-6 mt-6">
                  <div className="grid gap-5">
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <strong className="block text-slate-900">Coligada</strong>
                        <span className="text-slate-600">{coligadaAtual?.nome || coligadaAtual?.sigla || "--"}</span>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <strong className="block text-slate-900">Data da apuracao</strong>
                        <span className="text-slate-600">{formatDate(activeReport.dataApuracao)}</span>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 p-5">
                      <div className="flex justify-between items-center gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Chapa vencedora
                          </p>
                          <h3 className="text-[24px] font-black text-slate-900 mt-2">
                            {activeReport.resumo.empate
                              ? "EMPATE ENTRE CHAPAS"
                              : activeReport.resumo.vencedora
                              ? `${activeReport.resumo.vencedora.numero} - ${activeReport.resumo.vencedora.nome}`
                              : "Sem vencedora"}
                          </h3>
                          <p className="text-[12px] text-slate-600 mt-1">
                            {activeReport.resumo.empate
                              ? formatEmpateList(activeReport.resumo.chapasEmpatadas)
                              : activeReport.resumo.vencedora
                              ? `${activeReport.resumo.vencedora.votos} votos validos`
                              : "Nao ha votos validos registrados."}
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Trophy size={28} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-3 bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <div className="px-4 py-3 border-r border-slate-200">Indicador</div>
                        <div className="px-4 py-3 border-r border-slate-200">Descricao</div>
                        <div className="px-4 py-3 text-right">Total</div>
                      </div>
                      <div className="grid grid-cols-3 text-[12px]">
                        <div className="px-4 py-3 border-t border-r border-slate-200 font-black">Geral</div>
                        <div className="px-4 py-3 border-t border-r border-slate-200">Total de votos</div>
                        <div className="px-4 py-3 border-t text-right font-black">{activeReport.resumo.totalVotos}</div>
                        <div className="px-4 py-3 border-t border-r border-slate-200 font-black">Validos</div>
                        <div className="px-4 py-3 border-t border-r border-slate-200">Votos validos</div>
                        <div className="px-4 py-3 border-t text-right font-black">{activeReport.resumo.totalValidos}</div>
                        <div className="px-4 py-3 border-t border-r border-slate-200 font-black">Brancos</div>
                        <div className="px-4 py-3 border-t border-r border-slate-200">Votos em branco</div>
                        <div className="px-4 py-3 border-t text-right font-black">{activeReport.resumo.totalBrancos}</div>
                        <div className="px-4 py-3 border-t border-r border-slate-200 font-black">Nulos</div>
                        <div className="px-4 py-3 border-t border-r border-slate-200">Votos nulos</div>
                        <div className="px-4 py-3 border-t text-right font-black">{activeReport.resumo.totalNulos}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 p-5 flex flex-col items-center justify-center">
                    <div
                      className="w-[220px] h-[220px] rounded-full relative"
                      style={{ background: reportGradient }}
                    >
                      <div className="absolute inset-[38px] rounded-full bg-white flex items-center justify-center text-center">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-black">
                            {activeReport.resumo.empate ? "Empate" : "Vencedora"}
                          </div>
                          <div className="text-[34px] font-black text-slate-900">
                            {activeReport.resumo.empate
                              ? "EMP"
                              : activeReport.resumo.vencedora?.numero || "--"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 mt-5 w-full">
                      {activeReport.chartData.map((slice) => (
                        <div key={slice.name} className="flex items-center justify-between text-[12px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: slice.color }}
                            ></span>
                            <span className="truncate">{slice.name}</span>
                          </div>
                          <strong>{slice.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-[88px_1fr_88px] bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <div className="px-4 py-3 border-r border-slate-200">Numero</div>
                    <div className="px-4 py-3 border-r border-slate-200">Chapa</div>
                    <div className="px-4 py-3 text-right">Votos</div>
                  </div>

                  <div className="grid grid-cols-[88px_1fr_88px] text-[12px]">
                    {activeReport.resultados.map((resultado) => (
                      <React.Fragment key={`${resultado.numero}-${resultado.nome}`}>
                        <div className="px-4 py-3 border-t border-r border-slate-200 font-black text-slate-900">
                          {resultado.numero}
                        </div>
                        <div className="px-4 py-3 border-t border-r border-slate-200 text-slate-700">
                          {resultado.nome}
                        </div>
                        <div className="px-4 py-3 border-t text-right font-black text-slate-900">
                          {resultado.votos}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {activeReport.resumo.auditoria.auditoriaAplicada ? (
                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 p-4 text-[12px]">
                    <strong className="block text-slate-900 uppercase tracking-[0.16em] text-[10px] mb-2">
                      Auditoria de duplicidade
                    </strong>
                    <p className="text-slate-700">
                      {activeReport.resumo.auditoria.totalParticipacoesBrutas ?? "--"} participacoes brutas,
                      {" "}
                      {activeReport.resumo.auditoria.totalRasUnicos ?? "--"} RA(s) unicos considerados e
                      {" "}
                      {activeReport.resumo.auditoria.votosDescartadosDuplicidade} voto(s) descartado(s) por duplicidade.
                    </p>
                    {activeReport.resumo.auditoria.rasDuplicados.length > 0 ? (
                      <p className="text-slate-700 mt-2">
                        RAs com duplicidade: {activeReport.resumo.auditoria.rasDuplicados.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {activeReport.observacao ? (
                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 p-4 text-[12px]">
                    <strong className="block text-slate-900 uppercase tracking-[0.16em] text-[10px] mb-2">
                      Observacao
                    </strong>
                    <p className="text-slate-700">{activeReport.observacao}</p>
                  </div>
                ) : null}

                <div className="mt-6 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Documento interno de apuracao eleitoral</span>
                  <span>Assinatura da comissao</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
