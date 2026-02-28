"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Search,
  Clock,
  User,
  Stethoscope,
  CheckCircle,
  AlertCircle,
  X,
  Trash2,
} from "lucide-react";

// --- TIPAGENS ---
type Aluno = { id: string; nome: string; turma: string };
type Encaminhamento = {
  id: string;
  aluno_id: string;
  aluno: Aluno;
  sintoma: string;
  encaminhado_por: string;
  hora_encaminhamento: string;
  status: "aguardando" | "atendido";
};

export default function SalaRepousoPage() {
  const { user } = useAuth();
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Usuário Logado";

  // --- ESTADOS DO SISTEMA ---
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [alunosDb, setAlunosDb] = useState<Aluno[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);

  // Estados dos Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalAtenderOpen, setModalAtenderOpen] = useState(false);

  // Estados para Novo Encaminhamento
  const [busca, setBusca] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [sintoma, setSintoma] = useState("");
  const [isSalvando, setIsSalvando] = useState(false);

  // Estados para Atendimento
  const [cardSelecionado, setCardSelecionado] = useState<Encaminhamento | null>(
    null
  );
  const [obsAtendimento, setObsAtendimento] = useState("");
  const [destino, setDestino] = useState<"sala" | "casa" | "">("");

  // --- BUSCA INICIAL DE DADOS (SUPABASE) ---
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoadingDados(true);

    // 1. Busca todos os alunos para a barra de pesquisa
    const { data: dadosAlunos } = await supabase
      .from("alunos")
      .select("id, nome, turma")
      .order("nome");

    if (dadosAlunos) setAlunosDb(dadosAlunos);

    // 2. Busca apenas os encaminhamentos "aguardando" com os dados do aluno junto (JOIN)
    const { data: dadosEncaminhamentos } = await supabase
      .from("encaminhamentos_repouso")
      .select(
        `
        *,
        aluno:alunos(id, nome, turma)
      `
      )
      .eq("status", "aguardando")
      .order("created_at", { ascending: true });

    if (dadosEncaminhamentos) {
      // O Supabase retorna o JOIN como array/objeto, vamos garantir o formato
      const formatados = dadosEncaminhamentos.map((enc: any) => ({
        ...enc,
        aluno: Array.isArray(enc.aluno) ? enc.aluno[0] : enc.aluno,
      }));
      setEncaminhamentos(formatados);
    }

    setLoadingDados(false);
  };

  // --- FUNÇÕES DE AÇÃO (SUPABASE) ---
  const alunosFiltrados = alunosDb.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSalvarEncaminhamento = async () => {
    if (!alunoSelecionado || !sintoma) return;
    setIsSalvando(true);

    const horaAtual = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const { error } = await supabase.from("encaminhamentos_repouso").insert([
      {
        aluno_id: alunoSelecionado.id,
        sintoma: sintoma,
        encaminhado_por: userName,
        hora_encaminhamento: horaAtual,
        status: "aguardando",
      },
    ]);

    if (!error) {
      await carregarDados(); // Recarrega a lista
      setModalNovoOpen(false);
      setAlunoSelecionado(null);
      setSintoma("");
      setBusca("");
    } else {
      alert("Erro ao salvar encaminhamento. Tente novamente.");
      console.error(error);
    }
    setIsSalvando(false);
  };

  const handleExcluirEncaminhamento = async (
    id: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (window.confirm("Tem certeza que deseja apagar este encaminhamento?")) {
      const { error } = await supabase
        .from("encaminhamentos_repouso")
        .delete()
        .eq("id", id);

      if (!error) {
        setEncaminhamentos(encaminhamentos.filter((enc) => enc.id !== id));
      } else {
        alert("Erro ao excluir.");
      }
    }
  };

  const handleFinalizarAtendimento = async () => {
    if (!cardSelecionado || !destino) return;
    setIsSalvando(true);

    const { error } = await supabase
      .from("encaminhamentos_repouso")
      .update({
        status: "atendido",
        obs_atendimento: obsAtendimento,
        destino: destino,
        atendido_por: userName,
        hora_atendimento: new Date().toISOString(),
      })
      .eq("id", cardSelecionado.id);

    if (!error) {
      setEncaminhamentos(
        encaminhamentos.filter((e) => e.id !== cardSelecionado.id)
      );
      setModalAtenderOpen(false);
      setCardSelecionado(null);
      setObsAtendimento("");
      setDestino("");
    } else {
      alert("Erro ao finalizar atendimento.");
    }
    setIsSalvando(false);
  };

  return (
    <div className="p-6 min-h-full bg-gray-50 flex flex-col gap-6">
      {/* HEADER DA PÁGINA */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Stethoscope className="text-[#3182ce]" size={28} />
            Sala de Repouso
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciamento de encaminhamentos e atendimentos.
          </p>
        </div>
        <button
          onClick={() => setModalNovoOpen(true)}
          className="bg-[#3182ce] hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> Novo Encaminhamento
        </button>
      </div>

      {/* FILA DE AGUARDANDO (CARDS) */}
      <div>
        <h2 className="text-md font-bold text-gray-700 mb-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-orange-500" />
          Alunos Aguardando Atendimento ({encaminhamentos.length})
        </h2>

        {loadingDados ? (
          <div className="text-center py-10 text-gray-400 font-semibold animate-pulse">
            Carregando fila de atendimento...
          </div>
        ) : encaminhamentos.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-lg border border-dashed">
            Nenhum aluno aguardando na sala de repouso.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {encaminhamentos.map((enc) => (
              <div
                key={enc.id}
                onClick={() => {
                  setCardSelecionado(enc);
                  setModalAtenderOpen(true);
                }}
                className="bg-white border-l-4 border-orange-500 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 relative"
              >
                {/* TOPO DO CARD: Hora e Lixeira */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <div className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <Clock size={12} /> {enc.hora_encaminhamento}
                  </div>

                  {enc.encaminhado_por === userName && (
                    <button
                      onClick={(e) => handleExcluirEncaminhamento(enc.id, e)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                      title="Excluir encaminhamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-gray-800 text-lg pr-20">
                  {enc.aluno?.nome}
                </h3>
                <p className="text-xs text-gray-500 mb-3 font-semibold">
                  {enc.aluno?.turma}
                </p>

                <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 mb-3 border">
                  <span className="font-bold text-gray-600 block text-xs mb-1">
                    Motivo / Sintoma:
                  </span>
                  {enc.sintoma}
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <User size={12} />
                  <span>
                    Encaminhado por: <b>{enc.encaminhado_por}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL 1: NOVO ENCAMINHAMENTO
      ======================================================== */}
      {modalNovoOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#3182ce] text-white p-4 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <Plus size={18} /> Encaminhar Aluno
              </h2>
              <button
                onClick={() => setModalNovoOpen(false)}
                className="hover:bg-white/20 p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!alunoSelecionado ? (
                <>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">
                    Buscar Aluno
                  </label>
                  <div className="relative mb-4">
                    <Search
                      className="absolute left-3 top-2.5 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Digite o nome do aluno..."
                      className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182ce]"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                    {alunosFiltrados.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setAlunoSelecionado(a)}
                        className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-semibold text-sm text-gray-800">
                          {a.nome}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {a.turma}
                        </span>
                      </div>
                    ))}
                    {alunosFiltrados.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Nenhum aluno encontrado.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex justify-between items-center mb-4">
                    <div>
                      <p className="text-xs text-blue-600 font-bold uppercase">
                        Aluno Selecionado
                      </p>
                      <p className="font-bold text-gray-800">
                        {alunoSelecionado.nome} ({alunoSelecionado.turma})
                      </p>
                    </div>
                    <button
                      onClick={() => setAlunoSelecionado(null)}
                      className="text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      Trocar
                    </button>
                  </div>

                  <label className="text-sm font-bold text-gray-700 mb-1 block">
                    O que o aluno está sentindo?
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border rounded-lg p-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182ce] resize-none"
                    placeholder="Descreva detalhadamente o motivo do encaminhamento..."
                    value={sintoma}
                    onChange={(e) => setSintoma(e.target.value)}
                  ></textarea>
                </div>
              )}
            </div>

            <div className="border-t p-4 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setModalNovoOpen(false)}
                className="px-4 py-2 text-gray-600 text-sm font-bold hover:bg-gray-200 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEncaminhamento}
                disabled={!alunoSelecionado || !sintoma || isSalvando}
                className="bg-[#3182ce] text-white px-4 py-2 text-sm font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSalvando ? "Salvando..." : "Confirmar Encaminhamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ATENDIMENTO DO ALUNO
      ======================================================== */}
      {modalAtenderOpen && cardSelecionado && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-orange-500 text-white p-4 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <CheckCircle size={18} /> Realizar Atendimento
              </h2>
              <button
                onClick={() => setModalAtenderOpen(false)}
                className="hover:bg-white/20 p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {cardSelecionado.aluno?.nome}
                </h3>
                <p className="text-sm font-bold text-gray-500">
                  {cardSelecionado.aluno?.turma}
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-5">
                <p className="text-xs text-orange-600 font-bold uppercase mb-1">
                  Motivo do Encaminhamento
                </p>
                <p className="text-sm text-gray-800">
                  {cardSelecionado.sintoma}
                </p>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Encaminhado por {cardSelecionado.encaminhado_por} às{" "}
                  {cardSelecionado.hora_encaminhamento}
                </p>
              </div>

              <label className="text-sm font-bold text-gray-700 mb-1 block">
                Observações do Atendimento (Opcional)
              </label>
              <textarea
                rows={3}
                className="w-full border rounded-lg p-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-5"
                placeholder="Ex: Foi medicado com paracetamol, mediu a pressão..."
                value={obsAtendimento}
                onChange={(e) => setObsAtendimento(e.target.value)}
              ></textarea>

              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Destino do Aluno após atendimento:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDestino("sala")}
                  className={`border-2 rounded-lg p-3 text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    destino === "sala"
                      ? "border-[#3182ce] bg-blue-50 text-[#3182ce]"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}
                >
                  Liberado para Sala
                </button>
                <button
                  onClick={() => setDestino("casa")}
                  className={`border-2 rounded-lg p-3 text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    destino === "casa"
                      ? "border-green-500 bg-green-50 text-green-600"
                      : "border-gray-200 text-gray-500 hover:border-green-300"
                  }`}
                >
                  Liberado para Casa
                </button>
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setModalAtenderOpen(false)}
                className="px-4 py-2 text-gray-600 text-sm font-bold hover:bg-gray-200 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizarAtendimento}
                disabled={!destino || isSalvando}
                className="bg-orange-500 text-white px-4 py-2 text-sm font-bold rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle size={16} />{" "}
                {isSalvando ? "Processando..." : "Finalizar Atendimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
