"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";
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
  const { coligadaAtual, loadingColigadas } = useColigada();

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
    null,
  );
  const [obsAtendimento, setObsAtendimento] = useState("");
  const [destino, setDestino] = useState<"sala" | "casa" | "">("");

  useEffect(() => {
    if (user && coligadaAtual) {
      carregarDados();
    }
  }, [user, coligadaAtual]);

  const carregarDados = async () => {
    if (!coligadaAtual) return;
    setLoadingDados(true);

    const { data: dadosAlunos } = await supabase
      .from("alunos")
      .select("id, nome, turma")
      .eq("sede_id", coligadaAtual.id)
      .order("nome");

    if (dadosAlunos) setAlunosDb(dadosAlunos);

    const { data: dadosEncaminhamentos } = await supabase
      .from("encaminhamentos_repouso")
      .select(`*, aluno:alunos(id, nome, turma)`)
      .eq("status", "aguardando")
      .eq("sede_id", coligadaAtual.id)
      .order("created_at", { ascending: true });

    if (dadosEncaminhamentos) {
      const formatados = dadosEncaminhamentos.map((enc: any) => ({
        ...enc,
        aluno: Array.isArray(enc.aluno) ? enc.aluno[0] : enc.aluno,
      }));
      setEncaminhamentos(formatados);
    }

    setLoadingDados(false);
  };

  const alunosFiltrados = alunosDb.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  const handleSalvarEncaminhamento = async () => {
    if (!alunoSelecionado || !sintoma || !coligadaAtual) return;
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
        sede_id: coligadaAtual.id,
      },
    ]);

    if (!error) {
      await carregarDados();
      setModalNovoOpen(false);
      setAlunoSelecionado(null);
      setSintoma("");
      setBusca("");
    }
    setIsSalvando(false);
  };

  const handleExcluirEncaminhamento = async (
    id: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja apagar este encaminhamento?")) {
      const { error } = await supabase
        .from("encaminhamentos_repouso")
        .delete()
        .eq("id", id);

      if (!error) {
        setEncaminhamentos(encaminhamentos.filter((enc) => enc.id !== id));
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
        encaminhamentos.filter((e) => e.id !== cardSelecionado.id),
      );
      setModalAtenderOpen(false);
      setCardSelecionado(null);
      setObsAtendimento("");
      setDestino("");
    }
    setIsSalvando(false);
  };

  if (loadingColigadas) {
    return (
      <div className="p-10 text-center text-blue-600 dark:text-blue-400 font-bold italic">
        Sincronizando Unidade...
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full bg-gray-50 dark:bg-slate-950 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
            <Stethoscope className="text-[#3182ce]" size={28} />
            Sala de Repouso - {coligadaAtual?.sigla || "PGE"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Unidade Atual:{" "}
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {coligadaAtual?.nome}
            </span>
          </p>
        </div>
        <button
          onClick={() => setModalNovoOpen(true)}
          className="bg-[#3182ce] hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> Novo Encaminhamento
        </button>
      </div>

      <div>
        <h2 className="text-md font-bold text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-orange-500" />
          Aguardando Atendimento ({encaminhamentos.length})
        </h2>

        {loadingDados ? (
          <div className="text-center py-10 text-gray-400 dark:text-slate-500 font-semibold animate-pulse">
            Buscando fila...
          </div>
        ) : encaminhamentos.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
            Nenhum aluno aguardando.
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
                className="bg-white dark:bg-slate-800 border-l-4 border-orange-500 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 relative"
              >
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <div className="text-xs font-bold text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/50 px-2 py-1 rounded-full flex items-center gap-1">
                    <Clock size={12} /> {enc.hora_encaminhamento}
                  </div>
                  <button
                    onClick={(e) => handleExcluirEncaminhamento(enc.id, e)}
                    className="text-red-400 hover:text-red-600 dark:hover:text-red-500 p-1.5 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg pr-20 uppercase">
                  {enc.aluno?.nome}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 font-semibold">
                  {enc.aluno?.turma}
                </p>
                <div className="bg-gray-50 dark:bg-slate-700/50 p-2 rounded text-sm text-gray-800 dark:text-slate-200 mb-3 border border-gray-200 dark:border-slate-700 font-medium">
                  {enc.sintoma}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 font-bold">
                  <User size={12} />
                  <span>Por: {enc.encaminhado_por}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: NOVO ENCAMINHAMENTO */}
      {modalNovoOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 block">
                    Buscar Aluno
                  </label>
                  <div className="relative mb-4">
                    <Search
                      className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      className="w-full border border-gray-300 dark:border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#3182ce] outline-none font-medium"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                  <div className="border dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto divide-y dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {alunosFiltrados.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setAlunoSelecionado(a)}
                        className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between text-gray-900 dark:text-slate-200"
                      >
                        <span className="font-bold text-sm">{a.nome}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded">
                          {a.turma}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 p-3 rounded-lg flex justify-between items-center mb-4">
                    <div>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black">
                        ALUNO SELECIONADO
                      </p>
                      <p className="font-bold text-gray-900 dark:text-slate-100">
                        {alunoSelecionado.nome} ({alunoSelecionado.turma})
                      </p>
                    </div>
                    <button
                      onClick={() => setAlunoSelecionado(null)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold underline"
                    >
                      Trocar
                    </button>
                  </div>
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 block">
                    Relato do Sintoma:
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-3 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#3182ce] outline-none resize-none font-medium"
                    placeholder="Descreva o que o aluno está sentindo..."
                    value={sintoma}
                    onChange={(e) => setSintoma(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="border-t dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button
                onClick={() => setModalNovoOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-slate-400 text-sm font-black"
              >
                CANCELAR
              </button>
              <button
                onClick={handleSalvarEncaminhamento}
                disabled={!alunoSelecionado || !sintoma || isSalvando}
                className="bg-[#3182ce] text-white px-6 py-2 text-sm font-black rounded-md hover:bg-blue-700 disabled:opacity-50 uppercase shadow-md"
              >
                {isSalvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ATENDIMENTO */}
      {modalAtenderOpen && cardSelecionado && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                <h3 className="text-xl font-black uppercase text-gray-900 dark:text-slate-100">
                  {cardSelecionado.aluno?.nome}
                </h3>
                <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
                  {cardSelecionado.aluno?.turma}
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 p-3 rounded-lg mb-5">
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-black uppercase mb-1">
                  Motivo do Encaminhamento
                </p>
                <p className="text-sm text-gray-900 dark:text-slate-200 font-medium">
                  {cardSelecionado.sintoma}
                </p>
              </div>

              <label className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 block">
                Observações do Atendimento:
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-3 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none resize-none mb-5 font-medium"
                placeholder="Descreva o procedimento realizado..."
                value={obsAtendimento}
                onChange={(e) => setObsAtendimento(e.target.value)}
              />

              <label className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 block">
                Destino do Aluno:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDestino("sala")}
                  className={`border-2 rounded-lg p-3 text-sm font-black flex flex-col items-center transition-all ${
                    destino === "sala"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  Liberado para Sala
                </button>
                <button
                  onClick={() => setDestino("casa")}
                  className={`border-2 rounded-lg p-3 text-sm font-black flex flex-col items-center transition-all ${
                    destino === "casa"
                      ? "border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  Liberado para Casa
                </button>
              </div>
            </div>

            <div className="border-t dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button
                onClick={() => setModalAtenderOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-slate-400 text-sm font-black uppercase"
              >
                CANCELAR
              </button>
              <button
                onClick={handleFinalizarAtendimento}
                disabled={!destino || isSalvando}
                className="bg-orange-600 text-white px-6 py-2 text-sm font-black rounded-md flex items-center gap-2 uppercase shadow-md hover:bg-orange-700"
              >
                <CheckCircle size={16} /> Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
