"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import {
  Search,
  Printer,
  ArrowLeft,
  Loader2,
  Users,
  GraduationCap,
  FileText,
  CheckCircle2,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// Helper: Gera linha para escrita manual se o dado for vazio
const manualLine = (val: string, label: string) => {
  const isEmpty = !val || val.trim() === "" || val === "-" || val === "---";
  return (
    <div className="flex items-baseline gap-1 overflow-hidden">
      <span className="font-bold text-[9px] text-slate-800 whitespace-nowrap uppercase">
        {label}:
      </span>
      {isEmpty ? (
        <span className="flex-1 border-b border-slate-400 min-w-[60px] h-3"></span>
      ) : (
        <span className="text-slate-900 font-bold text-[10px] truncate uppercase">
          {val}
        </span>
      )}
    </div>
  );
};

// Formatação visual de telefone
const fmtTel = (v: string) => {
  if (!v || v.trim() === "" || v === "-" || v === "---") return "";
  const n = v.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return v;
};

export default function RelatorioFichasPage() {
  const { coligadaAtual } = useColigada();
  const relatorioRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [todosAlunosSede, setTodosAlunosSede] = useState<any[]>([]);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [alunosParaRelatorio, setAlunosParaRelatorio] = useState<any[]>([]);

  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [buscaNome, setBuscaNome] = useState("");
  const [setor, setSetor] = useState("SERVIÇO DE ORIENTAÇÃO EDUCACIONAL");

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: `Ficha_Acompanhamento_CSP_${new Date().getFullYear()}`,
  });

  useEffect(() => {
    if (coligadaAtual) carregarAlunos();
  }, [coligadaAtual]);

  const carregarAlunos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .eq("sede_id", coligadaAtual?.id)
        .order("nome", { ascending: true });
      if (error) throw error;
      setTodosAlunosSede(data || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAluno = (id: number) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const alunosFiltrados = useMemo(() => {
    return todosAlunosSede.filter((aluno) => {
      const matchCurso = filtroCurso ? aluno.Curso === filtroCurso : true;
      const matchSerie = filtroSerie
        ? String(aluno.serie) === filtroSerie
        : true;
      const matchTurma = filtroTurma
        ? String(aluno.turma) === filtroTurma
        : true;
      const matchNome = aluno.nome
        .toLowerCase()
        .includes(buscaNome.toLowerCase());
      return matchCurso && matchSerie && matchTurma && matchNome;
    });
  }, [todosAlunosSede, filtroCurso, filtroSerie, filtroTurma, buscaNome]);

  const cursosDisponiveis = useMemo(
    () =>
      Array.from(new Set(todosAlunosSede.map((a) => a.Curso)))
        .filter(Boolean)
        .sort(),
    [todosAlunosSede],
  );
  const seriesDisponiveis = useMemo(() => {
    const filtrados = filtroCurso
      ? todosAlunosSede.filter((a) => a.Curso === filtroCurso)
      : todosAlunosSede;
    return Array.from(new Set(filtrados.map((a) => String(a.serie))))
      .filter(Boolean)
      .sort();
  }, [todosAlunosSede, filtroCurso]);
  const turmasDisponiveis = useMemo(() => {
    const filtrados = filtroSerie
      ? todosAlunosSede.filter((a) => String(a.serie) === filtroSerie)
      : todosAlunosSede;
    return Array.from(new Set(filtrados.map((a) => String(a.turma))))
      .filter(Boolean)
      .sort();
  }, [todosAlunosSede, filtroSerie]);

  const gerarRelatorio = () => {
    const dados = todosAlunosSede.filter((a) => selecionados.includes(a.id));
    setAlunosParaRelatorio(dados);
    if (dados.length > 0)
      Swal.fire({
        title: "ALTA RESOLUÇÃO",
        text: `${dados.length} fichas otimizadas prontas.`,
        icon: "success",
        confirmButtonColor: "#E87B35",
      });
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen flex flex-col font-sans overflow-auto no-scrollbar pb-10">
      {/* CSS DE IMPRESSÃO DE ALTA FIDELIDADE */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0mm; 
          }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .print-area { 
            display: block !important; 
            width: 210mm !important; 
            image-rendering: -webkit-optimize-contrast; /* Evita que logos fiquem borradas */
            image-rendering: crisp-edges;
          }
        }
      `,
        }}
      />

      {/* HEADER TELA */}
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
              <FileText className="text-[#E87B35]" /> Gerador de Fichas
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-[#E87B35]"
            >
              <option value="SERVIÇO DE ORIENTAÇÃO EDUCACIONAL">SOE</option>
              <option value="COORDENAÇÃO DE DISCIPLINA">CD</option>
            </select>
            <button
              onClick={handlePrint}
              disabled={alunosParaRelatorio.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#E87B35] text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95"
            >
              <Printer size={16} /> Imprimir Alta Definição (
              {alunosParaRelatorio.length})
            </button>
          </div>
        </div>
      </div>

      {/* FILTROS E SELEÇÃO (Mesma lógica do SelecaoSistema) */}
      <div className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="BUSCAR NOME..."
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-[11px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
              />
              <select
                value={filtroCurso}
                onChange={(e) => {
                  setFiltroCurso(e.target.value);
                  setFiltroSerie("");
                  setFiltroTurma("");
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-[11px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
              >
                <option value="">TODOS OS CURSOS</option>
                {cursosDisponiveis.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={filtroSerie}
                  onChange={(e) => {
                    setFiltroSerie(e.target.value);
                    setFiltroTurma("");
                  }}
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-[11px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
                >
                  <option value="">SÉRIE</option>
                  {seriesDisponiveis.map((s) => (
                    <option key={s} value={s}>
                      {s}º ANO
                    </option>
                  ))}
                </select>
                <select
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-[11px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
                >
                  <option value="">TURMA</option>
                  {turmasDisponiveis.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={gerarRelatorio}
                disabled={selecionados.length === 0}
                className="w-full bg-slate-800 py-4 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-[#E87B35] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> Carregar ({selecionados.length})
              </button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Lista de Alunos ({alunosFiltrados.length})
              </h3>
              <button
                onClick={() =>
                  setSelecionados(
                    selecionados.length === alunosFiltrados.length
                      ? []
                      : alunosFiltrados.map((a) => a.id),
                  )
                }
                className="text-[9px] font-black text-[#E87B35] border border-[#E87B35]/20 px-3 py-1.5 rounded-lg hover:bg-[#E87B35] hover:text-white transition-all"
              >
                Todos / Nenhum
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left">
                <tbody>
                  {alunosFiltrados.map((aluno) => (
                    <tr
                      key={aluno.id}
                      onClick={() => handleToggleAluno(aluno.id)}
                      className={`cursor-pointer border-b dark:border-slate-800 transition-colors ${selecionados.includes(aluno.id) ? "bg-[#E87B35]/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                    >
                      <td className="p-4 w-12">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center ${selecionados.includes(aluno.id) ? "bg-[#E87B35] border-[#E87B35] text-white" : "border-slate-300 dark:border-slate-700"}`}
                        >
                          {selecionados.includes(aluno.id) && (
                            <UserCheck size={12} />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                        {aluno.nome}
                      </td>
                      <td className="p-4 text-[10px] font-black text-slate-400 uppercase">
                        {aluno.serie}º {aluno.turma} • {aluno.Curso}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO (A4 ULTRA RESOLUÇÃO) */}
      <div className="flex justify-center p-8 print:p-0 no-scrollbar">
        <div ref={relatorioRef} className="print-area w-[210mm] bg-transparent">
          {alunosParaRelatorio.map((aluno, index) => (
            <div
              key={aluno.id}
              className={`bg-white text-black min-h-[297mm] w-[210mm] p-[10mm_15mm] mb-12 print:mb-0 shadow-2xl print:shadow-none relative ${index > 0 ? "print:break-before-page" : ""}`}
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {/* CABEÇALHO COM TRAVA DE COR */}
              <div
                style={{ borderTop: "8px solid #E87B35", marginBottom: "10px" }}
              >
                <div className="flex justify-between items-center py-2">
                  <img
                    src="/assets/logo-csp.png"
                    alt="Logo CSP"
                    className="h-16 w-auto object-contain"
                  />
                  <div className="flex-1 text-center pr-16">
                    <h1
                      style={{
                        margin: "0",
                        fontSize: "20px",
                        fontWeight: "900",
                        color: "#E87B35",
                        textTransform: "uppercase",
                      }}
                    >
                      {setor}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">
                      Colégio São Paulo
                    </p>
                  </div>
                </div>
              </div>

              {/* GRID PRINCIPAL: DADOS + FOTO 3X4 REAL */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px",
                  gap: "15px",
                  marginBottom: "10px",
                }}
              >
                {/* IDENTIFICAÇÃO */}
                <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/10">
                  <p className="text-[8px] font-black text-[#E87B35] mb-2 uppercase tracking-widest border-b border-slate-100 pb-1 italic">
                    Identificação do Aluno(a)
                  </p>
                  <div className="grid grid-cols-2 gap-y-1.5">
                    <div className="col-span-2 text-[11px] uppercase">
                      <b>ALUNO:</b> {aluno.nome}
                    </div>
                    <div className="text-[10px] uppercase">
                      <b>RA:</b> {aluno.id}
                    </div>
                    <div className="text-[10px] uppercase">
                      <b>SÉRIE:</b> {aluno.serie}º Ano
                    </div>
                    <div className="col-span-2 text-[10px] uppercase">
                      <b>CURSO:</b> {aluno.Curso}
                    </div>
                    <div className="col-span-2 text-[10px] uppercase">
                      <b>TURMA:</b> {aluno.turma}
                    </div>
                  </div>
                </div>

                {/* Foto 3x4 Real preenchendo sem bordas */}
                <div
                  style={{
                    width: "110px",
                    height: "147px",
                    border: "1px solid #E87B35",
                    borderRadius: "4px",
                    overflow: "hidden",
                    background: "#fcfcfc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {aluno.foto_url ? (
                    <img
                      src={aluno.foto_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center opacity-10">
                      <GraduationCap size={40} />
                    </div>
                  )}
                </div>
              </div>

              {/* CONTATOS FAMILIARES (Agrupado e preparado para escrita) */}
              <div className="border border-slate-300 rounded-xl p-3 mb-3 space-y-3">
                <p className="text-[8px] font-black text-[#E87B35] mb-1 uppercase tracking-widest border-b border-slate-100 pb-1 italic">
                  Contatos Familiares
                </p>

                <div className="grid grid-cols-12 gap-x-2 text-[9px] uppercase border-b border-slate-100 pb-1.5">
                  <div className="col-span-12">
                    {manualLine(aluno.pai, "PAI")}
                  </div>
                  <div className="col-span-4 mt-1">
                    {manualLine(fmtTel(aluno.celular_pai), "CEL")}
                  </div>
                  <div className="col-span-4 mt-1">
                    {manualLine(fmtTel(aluno.fixo_pai), "FIXO")}
                  </div>
                  <div className="col-span-4 mt-1 lowercase">
                    {manualLine(aluno.email_pai, "E-MAIL")}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-x-2 text-[9px] uppercase">
                  <div className="col-span-12">
                    {manualLine(aluno.mae, "MÃE")}
                  </div>
                  <div className="col-span-4 mt-1">
                    {manualLine(fmtTel(aluno.celular_mae), "CEL")}
                  </div>
                  <div className="col-span-4 mt-1">
                    {manualLine(fmtTel(aluno.fixo_mae), "FIXO")}
                  </div>
                  <div className="col-span-4 mt-1 lowercase">
                    {manualLine(aluno.email_mae, "E-MAIL")}
                  </div>
                </div>
              </div>

              {/* RESPONSÁVEL FINANCEIRO */}
              <div className="border border-slate-300 rounded-xl p-3 mb-3">
                <p className="text-[8px] font-black text-[#E87B35] mb-1 uppercase tracking-widest border-b border-slate-100 pb-1 italic">
                  Responsável Financeiro
                </p>
                <div className="grid grid-cols-12 gap-x-2 text-[9px] uppercase">
                  <div className="col-span-12">
                    {manualLine(aluno.financeiro_nome, "NOME")}
                  </div>
                  <div className="col-span-4 mt-1">
                    {manualLine(fmtTel(aluno.financeiro_celular), "CEL")}
                  </div>
                  <div className="col-span-4 mt-1">
                    {manualLine(fmtTel(aluno.financeiro_fixo), "FIXO")}
                  </div>
                  <div className="col-span-4 mt-1 lowercase">
                    {manualLine(aluno.financeiro_email, "E-MAIL")}
                  </div>
                </div>
              </div>

              {/* HISTÓRICO ENTRADA */}
              <div className="border border-slate-300 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-4 text-[10px] uppercase">
                  <div>
                    <b>COLÉGIO DE ORIGEM:</b> ___________________________
                  </div>
                  <div>
                    <b>ANO INGRESSO:</b> _________
                  </div>
                </div>
              </div>

              {/* TÍTULO OCORRÊNCIAS */}
              <div
                style={{
                  background: "#E87B35",
                  color: "white",
                  padding: "5px",
                  textAlign: "center",
                  marginTop: "15px",
                  fontWeight: "900",
                  fontSize: "10px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}
              >
                REGISTROS DE ATENDIMENTO / OCORRÊNCIAS
              </div>

              {/* LINHAS PÁGINA 1 */}
              <div style={{ marginTop: "8px" }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    style={{ borderBottom: "1px solid #ccc", height: "33px" }}
                  ></div>
                ))}
              </div>

              {/* PÁGINA 2: CONTINUAÇÃO */}
              <div
                className="print:break-before-page"
                style={{ paddingTop: "15mm" }}
              >
                <div className="flex justify-between items-end border-b-2 border-[#E87B35] pb-2 mb-6">
                  <div className="flex items-center gap-3">
                    <img
                      src="/assets/logo-csp.png"
                      className="h-10 opacity-100"
                    />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Folha de Continuação • Ficha de Acompanhamento
                    </p>
                  </div>
                  <div className="text-right">
                    {/* ✅ NOME COM PROTEÇÃO ANTI-QUEBRA E FONTE DINÂMICA */}
                    <p
                      className={`font-black uppercase text-[#E87B35] leading-none whitespace-nowrap ${aluno.nome.length > 32 ? "text-[9px] tracking-tight" : "text-[11px]"}`}
                    >
                      {aluno.nome}
                    </p>
                    <p
                      className={`font-bold text-slate-800 uppercase mt-1 whitespace-nowrap tracking-tight ${aluno.turma?.length > 12 ? "text-[8px]" : "text-[9px]"}`}
                    >
                      RA: {aluno.id} | TURMA: {aluno.turma}
                    </p>
                  </div>
                </div>
                <div>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      style={{ borderBottom: "1px solid #ccc", height: "33px" }}
                    ></div>
                  ))}
                </div>
                <div className="absolute bottom-10 left-0 w-full text-center">
                  <p className="text-[8px] text-slate-300 uppercase font-black tracking-widest opacity-50">
                    PGE - Sistema de Gestão Educacional | Colégio São Paulo
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
