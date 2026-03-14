"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
import { Search, Loader2, AlertCircle, Users } from "lucide-react";
import Swal from "sweetalert2";
import ModalDetalhesAluno from "@/app/dashboard/alunos/components/ModalDetalhesAluno";
import ModalOcorrencia from "@/app/dashboard/alunos/components/ModalOcorrencia";

export default function AlunosPage() {
  const { user, loading: authLoading } = useAuth();
  const { coligadaAtual, loadingColigadas } = useColigada();

  // Estados de Dados
  const [resultados, setResultados] = useState<any[]>([]);
  const [opcoesFiltro, setOpcoesFiltro] = useState<
    { serie: any; turma: string }[]
  >([]);

  // Estados de Controle (Paginação e UI)
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filtros
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [buscaNome, setBuscaNome] = useState("");

  // Modais
  const [selecionado, setSelecionado] = useState<any>(null);
  const [mostrarOcorrencia, setMostrarOcorrencia] = useState(false);

  // 1. CARREGA APENAS AS SÉRIES E TURMAS AO ABRIR A PÁGINA (SUPER LEVE)
  useEffect(() => {
    async function carregarOpcoesFiltro() {
      if (!user || !coligadaAtual) return;
      try {
        const { data } = await supabase
          .from("alunos")
          .select("serie, turma")
          .eq("sede_id", coligadaAtual.id);
        if (data) setOpcoesFiltro(data);
      } catch (err) {
        console.error(err);
      }
    }
    carregarOpcoesFiltro();
    // Reseta a tela se trocar de Sede
    setResultados([]);
    setPesquisaRealizada(false);
  }, [user, coligadaAtual]);

  // 2. MOTOR DE BUSCA COM PAGINAÇÃO NO SERVIDOR
  const fetchAlunos = async (paginaAtual: number, isNovaBusca: boolean) => {
    if (!coligadaAtual) return;
    if (isNovaBusca) setDataLoading(true);
    else setLoadingMore(true);

    try {
      let query = supabase
        .from("alunos")
        .select("*")
        .eq("sede_id", coligadaAtual.id)
        .order("nome", { ascending: true });

      // Aplica os filtros diretamente no Banco de Dados (PostgreSQL)
      if (filtroSerie) query = query.eq("serie", filtroSerie);
      if (filtroTurma) query = query.eq("turma", filtroTurma);
      if (buscaNome) query = query.ilike("nome", `%${buscaNome}%`);

      // Lógica de Paginação (Traz de 50 em 50)
      const pageSize = 50;
      const from = paginaAtual * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (!error && data) {
        if (isNovaBusca) {
          setResultados(data);
          if (data.length === 0) {
            Swal.fire({
              title: "Nenhum resultado",
              icon: "info",
              toast: true,
              position: "top-end",
              timer: 3000,
              showConfirmButton: false,
            });
          }
        } else {
          setResultados((prev) => [...prev, ...data]); // Junta os novos com os que já estavam na tela
        }
        // Se trouxe 50 completos, significa que tem chance de ter uma próxima página
        setHasMore(data.length === pageSize);
      }
    } catch (err) {
      console.error("Erro na busca:", err);
    } finally {
      setDataLoading(false);
      setLoadingMore(false);
    }
  };

  // Disparado ao clicar em "BUSCAR"
  const realizarBusca = () => {
    setPesquisaRealizada(true);
    setPage(0);
    setHasMore(true);
    fetchAlunos(0, true);
  };

  // Disparado quando o scroll da página rola para baixo
  useEffect(() => {
    if (page > 0) {
      fetchAlunos(page, false);
    }
  }, [page]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Se chegou perto do final da tela (margem de 100px)
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMore && !loadingMore && !dataLoading) {
        setPage((prev) => prev + 1); // Dispara a busca da próxima página
      }
    }
  };

  // POPULA OS DROPDOWNS COM DADOS ÚNICOS
  const listaSeries = useMemo(() => {
    const series = opcoesFiltro.map((a) => String(a.serie));
    return Array.from(new Set(series)).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [opcoesFiltro]);

  const turmasFiltradas = useMemo(() => {
    if (!filtroSerie) return [];
    return Array.from(
      new Set(
        opcoesFiltro
          .filter((a) => String(a.serie) === filtroSerie)
          .map((a) => a.turma),
      ),
    ).sort();
  }, [filtroSerie, opcoesFiltro]);

  const navegarAluno = (direcao: "anterior" | "proximo") => {
    if (!selecionado) return;
    const index = resultados.findIndex((a) => a.id === selecionado.id);
    if (direcao === "proximo" && index < resultados.length - 1)
      setSelecionado(resultados[index + 1]);
    else if (direcao === "anterior" && index > 0)
      setSelecionado(resultados[index - 1]);
  };

  if (authLoading || loadingColigadas)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2
          className="animate-spin text-blue-600 dark:text-blue-400"
          size={32}
        />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 font-sans text-[11px] text-gray-800 dark:text-slate-300">
      {/* BARRA DE FILTROS */}
      <div className="bg-slate-200 dark:bg-slate-800 p-1 flex gap-2 items-center border-b border-gray-400 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-1 px-2 border-r border-gray-400 dark:border-slate-600 mr-1">
          <span className="font-bold text-blue-700 dark:text-blue-400 uppercase">
            {coligadaAtual?.sigla}
          </span>
        </div>
        <select
          value={filtroSerie}
          onChange={(e) => {
            setFiltroSerie(e.target.value);
            setFiltroTurma("");
          }}
          className="border border-gray-400 dark:border-slate-600 rounded-sm px-1 h-6 w-32 bg-white dark:bg-slate-900 outline-none"
        >
          <option value="">Série (Todas)</option>
          {listaSeries.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filtroTurma}
          onChange={(e) => setFiltroTurma(e.target.value)}
          disabled={!filtroSerie}
          className="border border-gray-400 dark:border-slate-600 rounded-sm px-1 h-6 w-24 bg-white dark:bg-slate-900 outline-none disabled:opacity-50"
        >
          <option value="">Turma</option>
          {turmasFiltradas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={buscaNome}
          onChange={(e) => setBuscaNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && realizarBusca()}
          placeholder="Pesquisar aluno por nome..."
          className="border border-gray-400 dark:border-slate-600 rounded-sm px-2 h-6 flex-1 max-w-md bg-white dark:bg-slate-900 outline-none"
        />
        <button
          onClick={realizarBusca}
          className="bg-[#3182ce] text-white px-4 h-6 rounded-sm flex items-center gap-2 font-bold shadow-sm hover:bg-blue-600 transition-colors"
        >
          <Search size={12} /> BUSCAR
        </button>
      </div>

      {/* ÁREA DE CONTEÚDO (COM EVENTO DE SCROLL INFINITO) */}
      <div
        className="overflow-auto flex-1 bg-gray-50 dark:bg-slate-950 relative"
        onScroll={handleScroll} // ✅ Escuta a rolagem do mouse
      >
        {!pesquisaRealizada ? (
          // ✅ TELA LIMPA INICIAL PARA ECONOMIZAR MEMÓRIA
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3 animate-in fade-in">
            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-full">
              <Users size={48} className="opacity-50" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
             FAÇA A BUSCA PARA CARREGAR OS ALUNOS
            </p>
            <p className="text-xs max-w-md text-center">
              Utilize os filtros acima e clique em <b>Buscar</b> para localizar
              os alunos. Caso clique em buscar sem preencher nenhum filtro, todos os alunos da sede serão carregados (recomendado apenas para sedes pequenas). O sistema carrega os alunos de forma paginada, trazendo os primeiros 50 resultados e carregando mais conforme você rola a página para baixo. 
            </p>
          </div>
        ) : dataLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-blue-600 dark:text-blue-400 italic">
            <Loader2 className="animate-spin" size={24} />
            <span>Consultando banco de dados...</span>
          </div>
        ) : (
          <table className="w-full border-collapse bg-white dark:bg-slate-900">
            <thead className="sticky top-0 bg-[#f1f5f9] dark:bg-slate-800 z-10 shadow-sm">
              <tr className="border-b border-gray-300 dark:border-slate-700 font-bold text-left uppercase text-gray-600 dark:text-slate-400">
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 w-14 text-center">
                  FOTO
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 w-24 text-center">
                  RA
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 px-4">
                  NOME DO ALUNO
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 w-32 text-center">
                  STATUS
                </th>
                <th className="border-r border-gray-300 dark:border-slate-700 p-2 w-32 text-center">
                  TURMA
                </th>
                <th className="p-2 w-24 text-center">SÉRIE</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((aluno, index) => (
                <tr
                  key={aluno.id}
                  onClick={() => setSelecionado(aluno)}
                  className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-gray-100 dark:border-slate-800 transition-colors ${index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-[#f8fafc] dark:bg-slate-900/50"}`}
                >
                  <td className="border-r border-gray-100 dark:border-slate-800 p-1 flex justify-center items-center">
                    <div className="w-8 h-8 rounded-full border border-gray-300 dark:border-slate-700 overflow-hidden bg-gray-200 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                      {aluno.foto_url ? (
                        <img
                          src={aluno.foto_url}
                          alt="Foto"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-black text-gray-400 dark:text-slate-500">
                          {aluno.nome?.charAt(0)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="border-r border-gray-100 dark:border-slate-800 p-1 text-center font-mono text-gray-500 dark:text-slate-500">
                    {aluno.id}
                  </td>
                  <td className="border-r border-gray-100 dark:border-slate-800 p-1 px-4 text-blue-700 dark:text-blue-400 font-bold uppercase">
                    {aluno.nome}
                  </td>
                  <td className="border-r border-gray-100 dark:border-slate-800 p-1 text-center font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${aluno.status === "CURSANDO" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                    >
                      {aluno.status}
                    </span>
                  </td>
                  <td className="border-r border-gray-100 dark:border-slate-800 p-1 text-center">
                    {aluno.turma}
                  </td>
                  <td className="p-1 text-center font-bold text-gray-600 dark:text-slate-400">
                    {aluno.serie}º Ano
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* INDICADOR DE CARREGAMENTO DO INFINITE SCROLL */}
        {loadingMore && (
          <div className="py-4 flex justify-center items-center gap-2 text-blue-500 font-bold bg-white dark:bg-slate-900 border-t dark:border-slate-800">
            <Loader2 className="animate-spin" size={16} /> Carregando mais
            resultados...
          </div>
        )}
      </div>

      {selecionado && !mostrarOcorrencia && (
        <ModalDetalhesAluno
          aluno={selecionado}
          onClose={() => setSelecionado(null)}
          onNavegar={navegarAluno}
          onAbrirOcorrencias={() => setMostrarOcorrencia(true)}
        />
      )}
      {mostrarOcorrencia && selecionado && (
        <ModalOcorrencia
          aluno={selecionado}
          onClose={() => setMostrarOcorrencia(false)}
        />
      )}
    </div>
  );
}
