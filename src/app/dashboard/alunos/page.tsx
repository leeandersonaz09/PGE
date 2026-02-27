"use client";
import { useState, useMemo } from "react";
import alunosData from "@/data/alunos.json";
import { Search } from "lucide-react";
import ModalDetalhesAluno from "@/components/ModalDetalhesAluno";
import ModalOcorrencia from "@/components/ModalOcorrencia";

export default function AlunosPage() {
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [buscaNome, setBuscaNome] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [selecionado, setSelecionado] = useState<any>(null);
  const [mostrarOcorrencia, setMostrarOcorrencia] = useState(false);

  // 1. Gera a lista de Séries únicas para o select
  const listaSeries = useMemo(() => {
    return Array.from(new Set(alunosData.map((a) => a.serie))).sort();
  }, []);

  // 2. Filtra as Turmas baseadas na Série selecionada
  const turmasFiltradas = useMemo(() => {
    if (!filtroSerie) return [];
    const turmasdaSerie = alunosData
      .filter((aluno) => aluno.serie === filtroSerie)
      .map((aluno) => aluno.turma);
    return Array.from(new Set(turmasdaSerie)).sort();
  }, [filtroSerie]);

  // 3. Função de Busca (Resolve o erro 'realizarBusca is not defined')
  const realizarBusca = () => {
    const filtrados = alunosData.filter((aluno) => {
      const bateNome = aluno.nome
        .toLowerCase()
        .includes(buscaNome.toLowerCase());
      const bateSerie = filtroSerie === "" || aluno.serie === filtroSerie;
      const bateTurma = filtroTurma === "" || aluno.turma === filtroTurma;
      return bateNome && bateSerie && bateTurma;
    });
    setResultados(filtrados);
  };

  // 4. Função de Navegação entre alunos dentro do modal
  const navegarAluno = (direcao: "anterior" | "proximo") => {
    if (!selecionado) return;
    const index = resultados.findIndex((a) => a.id === selecionado.id);
    if (direcao === "proximo" && index < resultados.length - 1) {
      setSelecionado(resultados[index + 1]);
    } else if (direcao === "anterior" && index > 0) {
      setSelecionado(resultados[index - 1]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans text-[11px] text-gray-800">
      {/* BARRA DE FILTROS */}
      <div className="bg-[#cbd5e0] p-1 flex gap-2 items-center border-b border-gray-400">
        <select
          value={filtroSerie}
          onChange={(e) => {
            setFiltroSerie(e.target.value);
            setFiltroTurma("");
          }}
          className="border border-gray-400 rounded-sm px-1 h-6 w-32 bg-white"
        >
          <option value="">Série/Ano (Todas)</option>
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
          className={`border border-gray-400 rounded-sm px-1 h-6 w-24 bg-white ${!filtroSerie ? "bg-gray-100 cursor-not-allowed" : ""}`}
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
          placeholder="Nome"
          className="border border-gray-400 rounded-sm px-2 h-6 flex-1 max-w-md bg-white outline-none"
        />

        <button
          onClick={realizarBusca}
          className="bg-[#3182ce] text-white px-3 h-6 rounded-sm flex items-center gap-1 hover:bg-blue-700"
        >
          <Search size={12} /> Buscar
        </button>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#f1f5f9] z-10 shadow-sm text-gray-700">
            <tr className="border-b border-gray-300 font-bold text-left">
              <th className="border-r border-gray-300 p-1 w-24 text-center">
                RA
              </th>
              <th className="border-r border-gray-300 p-1 px-4">Aluno</th>
              <th className="border-r border-gray-300 p-1 w-32 text-center">
                Status
              </th>
              <th className="border-r border-gray-300 p-1 w-24 text-center">
                Turma
              </th>
              <th className="p-1 w-24 text-center">Série</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((aluno, index) => (
              <tr
                key={aluno.id}
                onClick={() => setSelecionado(aluno)}
                className={`hover:bg-blue-50 cursor-pointer border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}`}
              >
                <td className="border-r border-gray-200 p-1 text-center">
                  {aluno.id}
                </td>
                <td className="border-r border-gray-200 p-1 px-4 text-blue-600 font-medium uppercase">
                  {aluno.nome}
                </td>
                <td className="border-r border-gray-200 p-1 text-center">
                  {aluno.status}
                </td>
                <td className="border-r border-gray-200 p-1 text-center">
                  {aluno.turma}
                </td>
                <td className="p-1 text-center">{aluno.serie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAIS MODULARIZADOS */}
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
