"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import {
  Filter,
  CheckCircle2,
  Search,
  Loader2,
  Users,
  Activity,
} from "lucide-react";
import Swal from "sweetalert2";

interface SelecaoSistemaProps {
  onConfirm: (contatos: any[], tags: string[]) => void;
}

export default function SelecaoSistema({ onConfirm }: SelecaoSistemaProps) {
  const { coligadaAtual } = useColigada();
  const [loading, setLoading] = useState(false);

  // Filtros
  const [todosAlunosSede, setTodosAlunosSede] = useState<any[]>([]);
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroStatus, setFiltroStatus] = useState(""); // Novo filtro de Status
  const [buscaNome, setBuscaNome] = useState("");

  // Seleção
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const [canais, setCanais] = useState({
    aluno: true,
    pai: false,
    mae: false,
    financeiro: false,
  });

  useEffect(() => {
    async function carregarDadosSede() {
      if (!coligadaAtual) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("alunos")
          .select("*")
          .eq("sede_id", coligadaAtual.id)
          .order("nome", { ascending: true });

        if (!error) setTodosAlunosSede(data || []);
      } finally {
        setLoading(false);
      }
    }
    carregarDadosSede();
  }, [coligadaAtual]);

  // Lista de Séries Únicas
  const listaSeries = useMemo(() => {
    const s = todosAlunosSede.map((a) => String(a.serie));
    return Array.from(new Set(s)).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [todosAlunosSede]);

  // Lista de Turmas Únicas baseadas na série
  const listaTurmas = useMemo(() => {
    if (!filtroSerie) return [];
    return Array.from(
      new Set(
        todosAlunosSede
          .filter((a) => String(a.serie) === filtroSerie)
          .map((a) => a.turma),
      ),
    ).sort();
  }, [filtroSerie, todosAlunosSede]);

  // NOVO: Lista de Status Únicos vindos do banco
  const listaStatus = useMemo(() => {
    const s = todosAlunosSede
      .map((a) => String(a.status))
      .filter((val) => val !== "null" && val !== "undefined");
    return Array.from(new Set(s)).sort();
  }, [todosAlunosSede]);

  // Alunos que aparecem na lista (Filtro por Nome, Série, Turma E Status)
  const alunosFiltrados = useMemo(() => {
    return todosAlunosSede.filter((aluno) => {
      const nomeMatch = aluno.nome
        ?.toLowerCase()
        .includes(buscaNome.toLowerCase());
      const serieMatch =
        filtroSerie === "" || String(aluno.serie) === filtroSerie;
      const turmaMatch = filtroTurma === "" || aluno.turma === filtroTurma;
      const statusMatch =
        filtroStatus === "" || String(aluno.status) === filtroStatus; // Lógica do novo filtro
      return nomeMatch && serieMatch && turmaMatch && statusMatch;
    });
  }, [buscaNome, filtroSerie, filtroTurma, filtroStatus, todosAlunosSede]);

  const confirmarSelecao = () => {
    const listaFinal: any[] = [];
    const alunosParaEnviar = todosAlunosSede.filter((a) =>
      selecionados.includes(a.id),
    );

    alunosParaEnviar.forEach((aluno) => {
      if (canais.aluno && aluno.email)
        listaFinal.push({
          email: aluno.email,
          Nome: aluno.nome,
          Tipo: "Aluno",
        });
      if (canais.pai && aluno.email_pai)
        listaFinal.push({
          email: aluno.email_pai,
          Nome: aluno.pai || aluno.nome,
          Tipo: "Pai",
        });
      if (canais.mae && aluno.email_mae)
        listaFinal.push({
          email: aluno.email_mae,
          Nome: aluno.mae || aluno.nome,
          Tipo: "Mãe",
        });
      if (canais.financeiro && aluno.financeiro_email)
        listaFinal.push({
          email: aluno.financeiro_email,
          Nome: aluno.financeiro_nome || aluno.nome,
          Tipo: "Financeiro",
        });
    });

    if (listaFinal.length === 0) {
      return Swal.fire(
        "Lista Vazia",
        "Nenhum e-mail válido encontrado na seleção.",
        "warning",
      );
    }

    const listaUnica = listaFinal.filter(
      (v, i, a) => a.findIndex((t) => t.email === v.email) === i,
    );
    onConfirm(listaUnica, ["Nome", "Tipo"]);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* BARRA DE FILTROS ATUALIZADA */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-slate-100 p-2 rounded-xl border border-slate-300">
        {/* Filtro de Série */}
        <select
          value={filtroSerie}
          onChange={(e) => {
            setFiltroSerie(e.target.value);
            setFiltroTurma("");
          }}
          className="h-10 text-[10px] font-black uppercase border border-slate-400 rounded-lg px-2 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="">Série (Todas)</option>
          {listaSeries.map((s) => (
            <option key={s} value={s}>
              {s}º Ano
            </option>
          ))}
        </select>

        {/* Filtro de Turma */}
        <select
          value={filtroTurma}
          onChange={(e) => setFiltroTurma(e.target.value)}
          disabled={!filtroSerie}
          className="h-10 text-[10px] font-black uppercase border border-slate-400 rounded-lg px-2 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50"
        >
          <option value="">Turma (Todas)</option>
          {listaTurmas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* NOVO: Filtro de Status de Matrícula */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="h-10 text-[10px] font-black uppercase border border-slate-400 rounded-lg px-2 bg-white text-blue-700 border-l-4 border-l-blue-500 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="">Status (Todos)</option>
          {listaStatus.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Busca por Nome */}
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="PESQUISAR NOME DO ALUNO..."
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            className="w-full h-10 text-[10px] font-black uppercase border border-slate-400 rounded-lg pl-9 pr-2 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm placeholder:text-slate-400"
          />
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      {/* CANAIS DE ENVIO */}
      <div className="bg-blue-600 p-3 rounded-xl shadow-md">
        <h4 className="text-[10px] uppercase font-black text-blue-100 mb-2 flex items-center gap-2">
          <Users size={12} /> Destinatários por aluno selecionado:
        </h4>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "aluno", label: "Próprio Aluno" },
            { id: "pai", label: "Pai" },
            { id: "mae", label: "Mãe" },
            { id: "financeiro", label: "Financeiro" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() =>
                setCanais((prev) => ({
                  ...prev,
                  [item.id]: !prev[item.id as keyof typeof canais],
                }))
              }
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                canais[item.id as keyof typeof canais]
                  ? "bg-green-500 text-white shadow-lg"
                  : "bg-blue-700 text-blue-200 hover:bg-blue-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABELA DE ALUNOS */}
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center font-black text-[10px] text-slate-500 uppercase">
          <span>{alunosFiltrados.length} Alunos encontrados</span>
          <div className="flex gap-3">
            <button
              onClick={() => setSelecionados(alunosFiltrados.map((a) => a.id))}
              className="text-blue-600 hover:underline"
            >
              Selecionar Filtrados
            </button>
            <button
              onClick={() => setSelecionados([])}
              className="text-red-600 hover:underline"
            >
              Limpar
            </button>
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-white">
              <tbody className="text-[11px]">
                {alunosFiltrados.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className={`border-b border-slate-100 hover:bg-blue-50 cursor-pointer ${selecionados.includes(aluno.id) ? "bg-blue-50" : ""}`}
                    onClick={() => {
                      setSelecionados((prev) =>
                        prev.includes(aluno.id)
                          ? prev.filter((id) => id !== aluno.id)
                          : [...prev, aluno.id],
                      );
                    }}
                  >
                    <td className="p-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(aluno.id)}
                        readOnly
                        className="rounded border-slate-400 text-blue-600"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-black text-slate-800 uppercase leading-none">
                        {aluno.nome}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                        {aluno.serie}º {aluno.turma} • {aluno.status}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${aluno.status === "CURSANDO" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {aluno.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <button
        onClick={confirmarSelecao}
        disabled={selecionados.length === 0}
        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 uppercase tracking-tighter"
      >
        <CheckCircle2 size={20} />
        GERAR LISTA ({selecionados.length} ALUNOS)
      </button>
    </div>
  );
}
