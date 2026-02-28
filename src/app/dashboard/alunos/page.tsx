"use client";
import { useState, useEffect, useMemo } from "react";
// Importamos o cliente centralizado
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext"; // <-- Importamos o contexto das coligadas
import { Search, Loader2, AlertCircle } from "lucide-react";
import ModalDetalhesAluno from "@/components/ModalDetalhesAluno";
import ModalOcorrencia from "@/components/ModalOcorrencia";

export default function AlunosPage() {
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const { user, loading: authLoading } = useAuth();
  const { coligadaAtual, loadingColigadas } = useColigada(); // <-- Puxamos a unidade ativa
  const [dataLoading, setDataLoading] = useState(false);

  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [buscaNome, setBuscaNome] = useState("");
  const [selecionado, setSelecionado] = useState<any>(null);
  const [mostrarOcorrencia, setMostrarOcorrencia] = useState(false);

  // BUSCA DE DADOS - Agora depende da Coligada Selecionada
  useEffect(() => {
    async function carregarAlunos() {
      // Só busca se o usuário estiver logado e a coligada estiver definida
      if (!user || !coligadaAtual) return;

      setDataLoading(true);

      // Resetamos os filtros locais ao trocar de unidade para evitar conflitos
      setFiltroSerie("");
      setFiltroTurma("");
      setBuscaNome("");

      try {
        const { data, error } = await supabase
          .from("alunos")
          .select("*")
          .eq("sede_id", coligadaAtual.id) // <-- FILTRO MÁGICO: Só traz alunos desta coligada
          .order("nome", { ascending: true });

        if (!error) {
          setTodosAlunos(data || []);
          setResultados(data || []);
        } else {
          console.error("Erro Supabase:", error.message);
        }
      } catch (err) {
        console.error("Erro na requisição:", err);
      } finally {
        setDataLoading(false);
      }
    }

    carregarAlunos();
  }, [user, coligadaAtual]); // Re-executa sempre que você mudar a coligada no Header!

  // FILTROS DINÂMICOS
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
  };

  const navegarAluno = (direcao: "anterior" | "proximo") => {
    if (!selecionado) return;
    const index = resultados.findIndex((a) => a.id === selecionado.id);
    if (direcao === "proximo" && index < resultados.length - 1) {
      setSelecionado(resultados[index + 1]);
    } else if (direcao === "anterior" && index > 0) {
      setSelecionado(resultados[index - 1]);
    }
  };

  // ESTADOS DE CARREGAMENTO E ACESSO
  if (authLoading || loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-600 gap-2 p-4 text-center">
        <AlertCircle size={48} />
        <h2 className="text-lg font-bold">ACESSO RESTRITO</h2>
        <p className="text-gray-600">
          Por favor, realize o login para acessar o banco de dados do PGE.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white font-sans text-[11px] text-gray-800">
      {/* BARRA DE FILTROS */}
      <div className="bg-[#cbd5e0] p-1 flex gap-2 items-center border-b border-gray-400">
        <div className="flex items-center gap-1 px-2 border-r border-gray-400 mr-1">
          <span className="font-bold text-blue-700 uppercase">
            {coligadaAtual?.sigla}
          </span>
        </div>

        <select
          value={filtroSerie}
          onChange={(e) => {
            setFiltroSerie(e.target.value);
            setFiltroTurma("");
          }}
          className="border border-gray-400 rounded-sm px-1 h-6 w-32 bg-white outline-none"
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
          className="border border-gray-400 rounded-sm px-1 h-6 w-24 bg-white outline-none"
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
          placeholder="Pesquisar por nome..."
          className="border border-gray-400 rounded-sm px-2 h-6 flex-1 max-w-md bg-white outline-none"
        />

        <button
          onClick={realizarBusca}
          className="bg-[#3182ce] text-white px-3 h-6 rounded-sm flex items-center gap-1 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm font-bold"
        >
          <Search size={12} /> BUSCAR
        </button>
      </div>

      {/* ÁREA DA TABELA */}
      <div className="overflow-auto flex-1 bg-gray-50">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-blue-600 italic">
            <Loader2 className="animate-spin" size={24} />
            <span>Sincronizando com a base de {coligadaAtual?.nome}...</span>
          </div>
        ) : (
          <table className="w-full border-collapse bg-white">
            <thead className="sticky top-0 bg-[#f1f5f9] z-10 shadow-sm">
              <tr className="border-b border-gray-300 font-bold text-left uppercase text-gray-600">
                <th className="border-r border-gray-300 p-2 w-24 text-center">
                  RA
                </th>
                <th className="border-r border-gray-300 p-2 px-4">
                  Nome do Aluno
                </th>
                <th className="border-r border-gray-300 p-2 w-32 text-center">
                  Status
                </th>
                <th className="border-r border-gray-300 p-2 w-32 text-center">
                  Turma
                </th>
                <th className="p-2 w-24 text-center">Série</th>
              </tr>
            </thead>
            <tbody>
              {resultados.length > 0 ? (
                resultados.map((aluno, index) => (
                  <tr
                    key={aluno.id}
                    onClick={() => setSelecionado(aluno)}
                    className={`hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                    }`}
                  >
                    <td className="border-r border-gray-100 p-1 text-center font-mono text-gray-500">
                      {aluno.id}
                    </td>
                    <td className="border-r border-gray-100 p-1 px-4 text-blue-700 font-bold uppercase">
                      {aluno.nome}
                    </td>
                    <td className="border-r border-gray-100 p-1 text-center font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          aluno.status === "CURSANDO"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {aluno.status}
                      </span>
                    </td>
                    <td className="border-r border-gray-100 p-1 text-center">
                      {aluno.turma}
                    </td>
                    <td className="p-1 text-center font-bold text-gray-600">
                      {aluno.serie}º Ano
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-gray-400 italic"
                  >
                    Nenhum aluno encontrado em {coligadaAtual?.nome}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAIS */}
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
