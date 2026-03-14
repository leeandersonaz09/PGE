"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
import { Search, Loader2, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";
import ModalDetalhesAluno from "@/app/dashboard/alunos/components/ModalDetalhesAluno";
import ModalOcorrencia from "@/app/dashboard/alunos/components/ModalOcorrencia";

export default function AlunosPage() {
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const { user, loading: authLoading } = useAuth();
  const { coligadaAtual, loadingColigadas } = useColigada();
  const [dataLoading, setDataLoading] = useState(false);

  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [buscaNome, setBuscaNome] = useState("");
  const [selecionado, setSelecionado] = useState<any>(null);
  const [mostrarOcorrencia, setMostrarOcorrencia] = useState(false);

  useEffect(() => {
    async function carregarAlunos() {
      if (!user || !coligadaAtual) return;
      setDataLoading(true);
      try {
        const { data, error } = await supabase
          .from("alunos")
          .select("*")
          .eq("sede_id", coligadaAtual.id)
          .order("nome", { ascending: true });

        if (!error) {
          setTodosAlunos(data || []);
          setResultados(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    }
    carregarAlunos();
  }, [user, coligadaAtual]);

  // FILTROS (MANTIDOS)
  const listaSeries = useMemo(() => {
    const series = todosAlunos.map((a) => String(a.serie));
    return Array.from(new Set(series)).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [todosAlunos]);

  const turmasFiltradas = useMemo(() => {
    if (!filtroSerie) return [];
    return Array.from(
      new Set(
        todosAlunos
          .filter((a) => String(a.serie) === filtroSerie)
          .map((a) => a.turma),
      ),
    ).sort();
  }, [filtroSerie, todosAlunos]);

  const realizarBusca = () => {
    const filtrados = todosAlunos.filter((aluno) => {
      const nomeMatch = aluno.nome
        ?.toLowerCase()
        .includes(buscaNome.toLowerCase());
      const serieMatch =
        filtroSerie === "" || String(aluno.serie) === filtroSerie;
      const turmaMatch = filtroTurma === "" || aluno.turma === filtroTurma;
      return nomeMatch && serieMatch && turmaMatch;
    });
    setResultados(filtrados);
    if (filtrados.length === 0) {
      Swal.fire({
        title: "Nenhum resultado",
        icon: "info",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

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
          placeholder="Pesquisar..."
          className="border border-gray-400 dark:border-slate-600 rounded-sm px-2 h-6 flex-1 max-w-md bg-white dark:bg-slate-900 outline-none"
        />
        <button
          onClick={realizarBusca}
          className="bg-[#3182ce] text-white px-3 h-6 rounded-sm flex items-center gap-1 font-bold shadow-sm"
        >
          <Search size={12} /> BUSCAR
        </button>
      </div>

      <div className="overflow-auto flex-1 bg-gray-50 dark:bg-slate-950">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-blue-600 dark:text-blue-400 italic">
            <Loader2 className="animate-spin" size={24} />{" "}
            <span>Sincronizando...</span>
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
