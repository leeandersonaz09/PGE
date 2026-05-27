"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Printer,
  UserCheck,
  Users,
} from "lucide-react";

import { useColigada } from "@/context/ColigadaContext";
import { supabase } from "@/lib/supabase";

type Aluno = {
  id: number;
  nome: string;
  serie: string | null;
  turma: string | null;
  Curso: string | null;
  sede_id: number | null;
};

type GrupoTurma = {
  chave: string;
  curso: string;
  serie: string;
  turma: string;
  alunos: Aluno[];
};

const MODALIDADES = [
  "Dança",
  "Karate",
  "GR",
  "Xadrez",
  "Toto",
  "Tenis de Mesa",
  "Corrida",
  "Futsal",
  "Basquete",
  "Volei",
  "Jogo Cooperativo",
  "Jogo Recreativo",
  "Jogo Adaptado",
] as const;

const LIMITE_LINHAS_POR_PAGINA = 38;

const normalizarTexto = (valor: string | null | undefined) =>
  String(valor || "").trim();

const normalizarBusca = (valor: string | null | undefined) =>
  normalizarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const criarChaveGrupo = (aluno: Aluno) => {
  const curso = normalizarTexto(aluno.Curso).toUpperCase();
  const serie = normalizarTexto(aluno.serie).toUpperCase();
  const turma = normalizarTexto(aluno.turma).toUpperCase();

  return `${curso}||${serie}||${turma}`;
};

const distribuirAlunosEmPaginas = (alunos: Aluno[], limite: number) => {
  if (alunos.length <= limite) {
    return [alunos];
  }

  const totalPaginas = Math.ceil(alunos.length / limite);
  const tamanhoBase = Math.floor(alunos.length / totalPaginas);
  const paginasComLinhaExtra = alunos.length % totalPaginas;
  const paginas: Aluno[][] = [];
  let cursor = 0;

  for (let indice = 0; indice < totalPaginas; indice += 1) {
    const tamanhoPagina =
      tamanhoBase + (indice < paginasComLinhaExtra ? 1 : 0);

    paginas.push(alunos.slice(cursor, cursor + tamanhoPagina));
    cursor += tamanhoPagina;
  }

  return paginas;
};

export default function ListaModalidadesPage() {
  const { coligadaAtual } = useColigada();
  const relatorioRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [todosAlunosSede, setTodosAlunosSede] = useState<Aluno[]>([]);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);
  const [gruposParaImpressao, setGruposParaImpressao] = useState<GrupoTurma[]>(
    [],
  );

  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [buscaNome, setBuscaNome] = useState("");

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: `Lista_Modalidades_${coligadaAtual?.sigla || "CSP"}`,
  });

  useEffect(() => {
    if (!coligadaAtual) return;

    const carregarAlunos = async () => {
      setLoading(true);
      try {
        let todos: Aluno[] = [];
        let fetchMore = true;
        let from = 0;
        const step = 999;

        while (fetchMore) {
          const { data, error } = await supabase
            .from("alunos")
            .select("id, nome, serie, turma, Curso, sede_id")
            .eq("sede_id", coligadaAtual.id)
            .order("nome", { ascending: true })
            .range(from, from + step);

          if (error) throw error;

          if (data && data.length > 0) {
            todos = [...todos, ...(data as Aluno[])];
            from += step + 1;
          }

          if (!data || data.length <= step) {
            fetchMore = false;
          }
        }

        setTodosAlunosSede(todos);
        setTurmasSelecionadas([]);
        setGruposParaImpressao([]);
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Erro ao carregar",
          text: "Nao foi possivel carregar os alunos desta unidade.",
          icon: "error",
          confirmButtonColor: "#E87B35",
        });
      } finally {
        setLoading(false);
      }
    };

    carregarAlunos();
  }, [coligadaAtual]);

  const alunosFiltrados = useMemo(() => {
    return todosAlunosSede.filter((aluno) => {
      const cursoAluno = normalizarTexto(aluno.Curso);
      const serieAluno = normalizarTexto(aluno.serie);
      const turmaAluno = normalizarTexto(aluno.turma).toUpperCase();
      const nomeAluno = normalizarBusca(aluno.nome);

      const matchCurso = filtroCurso ? cursoAluno === filtroCurso : true;
      const matchSerie = filtroSerie ? serieAluno === filtroSerie : true;
      const matchTurma = filtroTurma ? turmaAluno === filtroTurma : true;
      const matchNome = nomeAluno.includes(normalizarBusca(buscaNome));

      return matchCurso && matchSerie && matchTurma && matchNome;
    });
  }, [todosAlunosSede, filtroCurso, filtroSerie, filtroTurma, buscaNome]);

  const gruposFiltrados = useMemo<GrupoTurma[]>(() => {
    const mapa = new Map<string, GrupoTurma>();

    alunosFiltrados.forEach((aluno) => {
      const chave = criarChaveGrupo(aluno);

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          curso: normalizarTexto(aluno.Curso),
          serie: normalizarTexto(aluno.serie),
          turma: normalizarTexto(aluno.turma).toUpperCase(),
          alunos: [],
        });
      }

      mapa.get(chave)?.alunos.push(aluno);
    });

    return Array.from(mapa.values())
      .map((grupo) => ({
        ...grupo,
        alunos: [...grupo.alunos].sort((a, b) =>
          normalizarTexto(a.nome).localeCompare(normalizarTexto(b.nome), "pt-BR"),
        ),
      }))
      .sort((a, b) => {
        const curso = a.curso.localeCompare(b.curso, "pt-BR");
        if (curso !== 0) return curso;

        const serie = a.serie.localeCompare(b.serie, "pt-BR", { numeric: true });
        if (serie !== 0) return serie;

        return a.turma.localeCompare(b.turma, "pt-BR");
      });
  }, [alunosFiltrados]);

  const cursosDisponiveis = useMemo(
    () =>
      Array.from(new Set(todosAlunosSede.map((aluno) => normalizarTexto(aluno.Curso))))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [todosAlunosSede],
  );

  const seriesDisponiveis = useMemo(() => {
    const base = filtroCurso
      ? todosAlunosSede.filter(
          (aluno) => normalizarTexto(aluno.Curso) === filtroCurso,
        )
      : todosAlunosSede;

    return Array.from(new Set(base.map((aluno) => normalizarTexto(aluno.serie))))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [todosAlunosSede, filtroCurso]);

  const turmasDisponiveis = useMemo(() => {
    const base = todosAlunosSede.filter((aluno) => {
      const matchCurso = filtroCurso
        ? normalizarTexto(aluno.Curso) === filtroCurso
        : true;
      const matchSerie = filtroSerie
        ? normalizarTexto(aluno.serie) === filtroSerie
        : true;

      return matchCurso && matchSerie;
    });

    return Array.from(
      new Set(base.map((aluno) => normalizarTexto(aluno.turma).toUpperCase())),
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todosAlunosSede, filtroCurso, filtroSerie]);

  const toggleTurma = (chave: string) => {
    setTurmasSelecionadas((atual) =>
      atual.includes(chave)
        ? atual.filter((item) => item !== chave)
        : [...atual, chave],
    );
  };

  const selecionarOuLimparTodas = () => {
    setTurmasSelecionadas((atual) =>
      atual.length === gruposFiltrados.length
        ? []
        : gruposFiltrados.map((grupo) => grupo.chave),
    );
  };

  const gerarRelatorio = () => {
    const grupos = gruposFiltrados.filter((grupo) =>
      turmasSelecionadas.includes(grupo.chave),
    );

    setGruposParaImpressao(grupos);

    if (grupos.length > 0) {
      Swal.fire({
        title: "Relatorio carregado",
        text: `${grupos.length} turma(s) pronta(s) para impressao.`,
        icon: "success",
        confirmButtonColor: "#E87B35",
      });
    }
  };

  const subtituloTurma = (grupo: GrupoTurma) => {
    const partes = [grupo.serie, grupo.turma].filter(Boolean);
    return partes.join(" - ");
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen flex flex-col font-sans overflow-auto no-scrollbar pb-10">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: landscape;
                margin: 6mm;
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
                margin: 0 !important;
                box-shadow: none !important;
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
              <FileSpreadsheet className="text-[#E87B35]" />
              Olimpíada Interna
            </h1>
          </div>
          <button
            onClick={handlePrint}
            disabled={gruposParaImpressao.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#E87B35] text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95 disabled:opacity-40"
          >
            <Printer size={16} /> Imprimir ({gruposParaImpressao.length})
          </button>
        </div>
      </div>

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
                  setTurmasSelecionadas([]);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-[11px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
              >
                <option value="">TODOS OS CURSOS</option>
                {cursosDisponiveis.map((curso) => (
                  <option key={curso} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={filtroSerie}
                  onChange={(e) => {
                    setFiltroSerie(e.target.value);
                    setFiltroTurma("");
                    setTurmasSelecionadas([]);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-[11px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
                >
                  <option value="">SERIE</option>
                  {seriesDisponiveis.map((serie) => (
                    <option key={serie} value={serie}>
                      {serie}
                    </option>
                  ))}
                </select>
                <select
                  value={filtroTurma}
                  onChange={(e) => {
                    setFiltroTurma(e.target.value);
                    setTurmasSelecionadas([]);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-[11px] font-bold outline-none border-none focus:ring-2 focus:ring-[#E87B35]"
                >
                  <option value="">TURMA</option>
                  {turmasDisponiveis.map((turma) => (
                    <option key={turma} value={turma}>
                      {turma}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={gerarRelatorio}
                disabled={turmasSelecionadas.length === 0}
                className="w-full bg-slate-800 py-4 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-[#E87B35] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> Carregar ({turmasSelecionadas.length})
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Turmas Disponiveis ({gruposFiltrados.length})
              </h3>
              <button
                onClick={selecionarOuLimparTodas}
                disabled={gruposFiltrados.length === 0}
                className="text-[9px] font-black text-[#E87B35] border border-[#E87B35]/20 px-3 py-1.5 rounded-lg hover:bg-[#E87B35] hover:text-white transition-all disabled:opacity-40"
              >
                Todas / Nenhuma
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="p-8 flex items-center justify-center gap-3 text-slate-500 text-sm font-bold">
                  <Loader2 size={18} className="animate-spin" />
                  Carregando alunos...
                </div>
              ) : gruposFiltrados.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm font-bold">
                  Nenhuma turma encontrada com os filtros atuais.
                </div>
              ) : (
                <table className="w-full text-left">
                  <tbody>
                    {gruposFiltrados.map((grupo) => {
                      const selecionado = turmasSelecionadas.includes(grupo.chave);

                      return (
                        <tr
                          key={grupo.chave}
                          onClick={() => toggleTurma(grupo.chave)}
                          className={`cursor-pointer border-b dark:border-slate-800 transition-colors ${selecionado ? "bg-[#E87B35]/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                        >
                          <td className="p-4 w-12">
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center ${selecionado ? "bg-[#E87B35] border-[#E87B35] text-white" : "border-slate-300 dark:border-slate-700"}`}
                            >
                              {selecionado && <UserCheck size={12} />}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                              {subtituloTurma(grupo)}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase mt-1">
                              {grupo.curso || "SEM CURSO"}
                            </div>
                          </td>
                          <td className="p-4 text-right text-[10px] font-black text-slate-400 uppercase">
                            <div className="flex items-center justify-end gap-2">
                              <Users size={14} className="text-[#E87B35]" />
                              {grupo.alunos.length} aluno(s)
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center p-8 print:p-0">
        <div ref={relatorioRef} className="print-area w-full max-w-[1120px]">
          {gruposParaImpressao.map((grupo) => {
            const paginas = distribuirAlunosEmPaginas(
              grupo.alunos,
              LIMITE_LINHAS_POR_PAGINA,
            );

            return paginas.map((alunosPagina, indicePagina) => (
              <div
                key={`${grupo.chave}-${indicePagina}`}
                className="print-page bg-white text-black w-full min-h-[190mm] mb-8 shadow-2xl print:shadow-none rounded-2xl overflow-hidden"
              >
                <div className="border-t-[10px] border-[#E87B35] px-4 py-5">
                  <div className="flex justify-between items-center gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-4">
                      <Image
                        src="/assets/logo-csp.png"
                        alt="Logo CSP"
                        width={180}
                        height={46}
                        className="h-11 w-auto object-contain"
                      />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                          Colegio Sao Paulo
                        </p>
                        <h2 className="text-[18px] font-black uppercase text-[#E87B35] leading-none mt-1">
                          Lista de Modalidades
                        </h2>
                        {paginas.length > 1 && (
                          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 mt-1">
                            Continuacao • Pagina {indicePagina + 1} de {paginas.length}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right uppercase">
                      <p className="text-[9px] font-black tracking-[0.2em] text-slate-400">
                        Serie
                      </p>
                      <p className="text-[18px] font-black text-slate-800">
                        {grupo.serie || "---"}
                      </p>
                      <p className="text-[9px] font-black tracking-[0.2em] text-slate-400 mt-2">
                        Turma
                      </p>
                      <p className="text-[18px] font-black text-slate-800">
                        {grupo.turma || "---"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <span>{grupo.curso || "Curso nao informado"}</span>
                    <span>
                      {grupo.alunos.length} aluno(s) • {alunosPagina.length} nesta
                      pagina
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
                    <table
                      className="w-full border-collapse"
                      style={{ tableLayout: "fixed" }}
                    >
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-1 py-1.5 text-[10px] font-black uppercase w-[40%]">
                            Nome
                          </th>
                          {MODALIDADES.map((modalidade) => (
                            <th
                              key={modalidade}
                              className="border border-slate-300 p-0.5 text-[8px] font-black uppercase text-center align-middle leading-[1.1] break-words"
                            >
                              {modalidade}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {alunosPagina.map((aluno) => (
                          <tr key={aluno.id}>
                            <td className="border border-slate-300 px-1.5 py-1 text-[9px] font-bold uppercase">
                              {aluno.nome}
                            </td>
                            {MODALIDADES.map((modalidade) => (
                              <td
                                key={`${aluno.id}-${modalidade}`}
                                className="border border-slate-300 h-[18px]"
                              ></td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
}
