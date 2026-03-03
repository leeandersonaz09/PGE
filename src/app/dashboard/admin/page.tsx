"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import Papa from "papaparse";
import {
  Users,
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Clock,
  Save,
  X,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCog,
  Laptop,
  PlusCircle,
  Trash2,
} from "lucide-react";

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Importação
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [sedeImportacao, setSedeImportacao] = useState("");
  const [statusImport, setStatusImport] = useState<{
    tipo: "sucesso" | "erro" | "processando" | null;
    msg: string;
  }>({ tipo: null, msg: "" });

  // Estado para a data dinâmica por sede
  const [ultimaImportacao, setUltimaImportacao] = useState(
    "Selecione uma sede...",
  );

  // Estados de Edição de Usuário (Funcionários)
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoUser, setEditandoUser] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

  // Estados de Gestão de Equipamentos (Novo)
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [novoEquipNome, setNovoEquipNome] = useState("");
  const [novoEquipQtd, setNovoEquipQtd] = useState(1);

  // Adicionado o módulo "locacoes" na lista
  const modulosDisponiveis = [
    "alunos",
    "repouso",
    "historico",
    "ocorrencias",
    "conselho",
    "locacoes",
    "historico_locacoes",
    "admin",
    "relatorios",
  ];

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // EFEITO: Monitora a mudança de sede para atualizar a data da última sincronização
  useEffect(() => {
    if (sedeImportacao) {
      buscarUltimaSincronizacaoPorSede(sedeImportacao);
    } else {
      setUltimaImportacao("Selecione uma sede...");
    }
  }, [sedeImportacao]);

  async function carregarDadosIniciais() {
    setLoading(true);
    // Busca funcionários através da View segura
    const { data: usersData } = await supabase
      .from("vw_gestao_usuarios")
      .select("*")
      .order("nome");

    // Busca todas as sedes cadastradas
    const { data: sedesData } = await supabase
      .from("sedes")
      .select("*")
      .order("nome");

    // Busca equipamentos
    const { data: equipData } = await supabase
      .from("equipamentos")
      .select("*")
      .order("nome");

    if (usersData) setUsuarios(usersData);
    if (sedesData) setSedes(sedesData);
    if (equipData) setEquipamentos(equipData);
    setLoading(false);
  }

  // Função para buscar a data da última importação filtrada pela SEDE selecionada
  async function buscarUltimaSincronizacaoPorSede(idSede: string) {
    setUltimaImportacao("Buscando...");
    const { data } = await supabase
      .from("alunos")
      .select("importado_em")
      .eq("sede_id", idSede)
      .order("importado_em", { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].importado_em) {
      setUltimaImportacao(
        new Date(data[0].importado_em).toLocaleString("pt-BR"),
      );
    } else {
      setUltimaImportacao("Nenhum registro encontrado nesta sede");
    }
  }

  const handleProcessarPlanilha = () => {
    if (!arquivo || !sedeImportacao) return;
    setStatusImport({
      tipo: "processando",
      msg: "Validando dados e removendo duplicados...",
    });

    Papa.parse(arquivo, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const codigosVistos = new Set();
        const listaFinal: any[] = [];

        rows.forEach((row: any) => {
          const cod = row["Código"];

          // 1. DEDUPLICAÇÃO
          if (cod && !codigosVistos.has(cod)) {
            codigosVistos.add(cod);

            // 2. MAPEAMENTO RÍGIDO
            listaFinal.push({
              id: Number(cod),
              nome: row["Nome"] || "NOME NÃO INFORMADO",
              Anosemestre: row["Anosemestre"],
              Curso: row["Curso"],
              "Nome curso": row["Nome curso"],
              c_turma: row["Turma"],
              turma: row["Descrição turma"],
              serie: row["Série"],
              Turno: row["Turno"],
              status: row["Situação matrícula"],
              nascimento: row["Data nascimento"],
              email: row["Email"],
              financeiro_nome:
                row["financeiro_nome"] || row["Nome Responsável Financeiro"],
              financeiro_fixo: row["financeiro_fixo"],
              financeiro_celular: row["financeiro_celular"],
              financeiro_email: row["financeiro_email"],
              pai: row["Nome Pai"],
              fixo_pai: row["Telefone residencial Pai"],
              celular_pai: row["Telefone celular Pai"],
              email_pai: row["Email Pai"],
              mae: row["Nome Mãe"],
              fixo_mae: row["Telefone residencial Mãe"],
              celular_mae: row["Telefone celular Mãe"],
              email_mae: row["Email Mãe"],
              sede_id: Number(sedeImportacao),
              importado_em: new Date().toISOString(),
            });
          }
        });

        // 3. UPSERT
        const { error } = await supabase
          .from("alunos")
          .upsert(listaFinal, { onConflict: "id" });

        if (error) {
          setStatusImport({
            tipo: "erro",
            msg: "Erro na sincronização: " + error.message,
          });
        } else {
          setStatusImport({
            tipo: "sucesso",
            msg: `${listaFinal.length} alunos sincronizados com sucesso!`,
          });
          buscarUltimaSincronizacaoPorSede(sedeImportacao);
        }
      },
    });
  };

  const abrirEdicao = (user: any) => {
    setEditandoUser({ ...user });
    setModalAberto(true);
  };

  const salvarAlteracoes = async () => {
    if (!editandoUser) return;
    setSalvando(true);

    const sedesFormatadas = Array.from(
      new Set(
        editandoUser.sedes_permitidas?.map((id: any) => Number(id)) || [],
      ),
    );
    const modulosFormatados = Array.from(
      new Set(editandoUser.modulos_permitidos || []),
    );

    const { data, error, status } = await supabase
      .from("permissoes_usuarios")
      .upsert(
        {
          user_id: editandoUser.user_id,
          is_admin: editandoUser.is_admin,
          sedes_permitidas: sedesFormatadas,
          modulos_permitidos: modulosFormatados,
        },
        { onConflict: "user_id" },
      )
      .select();

    if (error) {
      alert(`Erro técnico: ${error.message} (Código: ${error.code})`);
    } else if (data && data.length > 0) {
      setModalAberto(false);
      await carregarDadosIniciais();
      alert("Permissões atualizadas com sucesso!");
    } else {
      alert(
        "Atenção: Você não tem permissão de Administrador no banco de dados para realizar esta alteração.",
      );
    }
    setSalvando(false);
  };

  // Funções de Gestão de Equipamentos
  const adicionarEquipamento = async () => {
    if (!novoEquipNome || novoEquipQtd < 1) return;
    const { error } = await supabase
      .from("equipamentos")
      .insert([{ nome: novoEquipNome, quantidade_total: novoEquipQtd }]);
    if (!error) {
      setNovoEquipNome("");
      setNovoEquipQtd(1);
      carregarDadosIniciais();
    } else {
      alert("Erro ao adicionar equipamento: " + error.message);
    }
  };

  const deletarEquipamento = async (id: string) => {
    if (
      window.confirm(
        "Apagar este equipamento? Isso apagará o histórico de locações dele também.",
      )
    ) {
      await supabase.from("equipamentos").delete().eq("id", id);
      carregarDadosIniciais();
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center text-blue-600 font-bold animate-pulse italic text-gray-900 bg-white">
        Carregando CPD...
      </div>
    );

  return (
    <div className="p-8 bg-gray-50 min-h-full flex flex-col gap-6 text-gray-900 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-black flex items-center gap-2 text-gray-800">
          <ShieldCheck className="text-red-600" size={32} /> Painel
          Administrativo
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LADO ESQUERDO: GESTÃO DE ACESSOS */}
        <div className="xl:col-span-2 bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
          <div className="bg-gray-800 text-white px-4 py-2 border-b font-bold text-[10px] uppercase flex items-center gap-2">
            <Users size={14} /> Contas de Funcionários Habilitadas
          </div>
          <table className="w-full text-left text-[11px]">
            <thead className="bg-gray-100 border-b text-gray-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Colaborador / Email</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3">Módulos</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-900">
              {usuarios.map((u) => (
                <tr
                  key={u.user_id}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td className="p-3">
                    <div className="font-bold text-gray-900">{u.nome}</div>
                    <div className="text-gray-500 font-mono text-[10px]">
                      {u.email}
                    </div>
                  </td>
                  <td className="p-3 text-center font-black">
                    {u.is_admin ? (
                      <span className="text-red-600">ADMIN</span>
                    ) : (
                      <span className="text-blue-600">USER</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.modulos_permitidos?.map((m: any) => (
                        <span
                          key={m}
                          className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => abrirEdicao(u)}
                      className="bg-gray-900 text-white px-3 py-1.5 rounded border transition-all font-black uppercase text-[10px] hover:bg-blue-600"
                    >
                      Configurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LADO DIREITO: IMPORTAÇÃO DE ALUNOS */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-2 font-bold text-[10px] uppercase flex items-center gap-2">
              <UploadCloud size={14} /> Atualizar Base de Alunos (CSV)
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                  1. Unidade de Destino
                </label>
                <select
                  value={sedeImportacao}
                  onChange={(e) => setSedeImportacao(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded p-2 text-sm text-black font-black bg-white focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Selecione a sede...</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept=".csv"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                />
                <FileSpreadsheet
                  size={40}
                  className={
                    arquivo
                      ? "text-green-600"
                      : "text-gray-400 group-hover:text-blue-500"
                  }
                />
                <p className="text-[10px] font-black text-gray-500 mt-2 uppercase text-center">
                  {arquivo ? arquivo.name : "Clique para subir o Relatório 4"}
                </p>
              </div>

              {/* STATUS DINÂMICO DA SEDE */}
              <div
                className={`p-3 rounded flex items-center gap-3 border transition-all ${sedeImportacao ? "bg-blue-50 border-blue-100 shadow-inner" : "bg-gray-50 border-gray-200"}`}
              >
                <Clock
                  className={sedeImportacao ? "text-blue-600" : "text-gray-400"}
                  size={18}
                />
                <div className="leading-tight">
                  <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">
                    Última Sincronização na Unidade
                  </p>
                  <p
                    className={`text-xs font-black ${sedeImportacao ? "text-blue-900" : "text-gray-400 italic"}`}
                  >
                    {ultimaImportacao}
                  </p>
                </div>
              </div>

              {statusImport.tipo && (
                <div
                  className={`p-3 rounded text-[11px] font-bold border flex gap-2 items-start ${statusImport.tipo === "sucesso" ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}`}
                >
                  {statusImport.tipo === "sucesso" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  {statusImport.msg}
                </div>
              )}

              <button
                onClick={handleProcessarPlanilha}
                disabled={
                  !arquivo ||
                  !sedeImportacao ||
                  statusImport.tipo === "processando"
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded text-xs uppercase shadow-lg disabled:bg-gray-300 transition-all"
              >
                {statusImport.tipo === "processando"
                  ? "Sincronizando..."
                  : "Sincronizar Dados"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GESTÃO DE EQUIPAMENTOS MULTIMÍDIA */}
      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden mt-6">
        <div className="bg-indigo-600 text-white px-4 py-2 border-b font-bold text-[10px] uppercase flex items-center gap-2">
          <Laptop size={14} /> Gestão de Equipamentos Multimídia (Locação)
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 border rounded">
            <h3 className="text-xs font-black text-gray-700 uppercase mb-3">
              Cadastrar Novo
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ex: Chromebook 01"
                value={novoEquipNome}
                onChange={(e) => setNovoEquipNome(e.target.value)}
                className="w-full border p-2 text-sm rounded bg-white outline-none focus:border-indigo-600 font-medium"
              />
              <div className="flex gap-2 items-center">
                <label className="text-xs font-bold text-gray-600">
                  Quantidade Total:
                </label>
                <input
                  type="number"
                  min="1"
                  value={novoEquipQtd}
                  onChange={(e) => setNovoEquipQtd(Number(e.target.value))}
                  className="w-20 border p-2 text-sm rounded bg-white outline-none focus:border-indigo-600 font-bold"
                />
              </div>
              <button
                onClick={adicionarEquipamento}
                className="bg-indigo-600 text-white font-bold text-xs uppercase px-4 py-2 rounded flex items-center gap-2 w-full justify-center hover:bg-indigo-700 transition-colors"
              >
                <PlusCircle size={14} /> Salvar Equipamento
              </button>
            </div>
          </div>
          <div className="md:col-span-2">
            <table className="w-full text-left text-[11px] border">
              <thead className="bg-gray-100 border-b text-gray-700 font-bold uppercase">
                <tr>
                  <th className="p-3 border-r">Equipamento</th>
                  <th className="p-3 border-r text-center w-24">Qtd Total</th>
                  <th className="p-3 text-center w-20">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-900">
                {equipamentos.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="p-3 border-r font-bold text-gray-800">
                      {eq.nome}
                    </td>
                    <td className="p-3 border-r text-center font-black text-indigo-600">
                      {eq.quantidade_total}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => deletarEquipamento(eq.id)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Deletar Equipamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {equipamentos.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-6 text-center text-gray-400 font-medium"
                    >
                      Nenhum equipamento cadastrado ainda. Adicione ao lado!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL LATERAL DE CONFIGURAÇÃO DE ACESSO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-[999] animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b pb-4 mb-6 text-gray-900">
              <div className="flex items-center gap-2">
                <UserCog size={24} />
                <h2 className="text-xl font-black uppercase">
                  Perfil e Acessos
                </h2>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="hover:bg-red-500 hover:text-white p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              <div className="p-4 bg-gray-900 rounded-lg text-white shadow-xl">
                <p className="text-[9px] font-bold text-gray-400 uppercase">
                  Colaborador
                </p>
                <p className="text-lg font-black">{editandoUser.nome}</p>
                <p className="text-xs text-blue-400 font-mono italic">
                  {editandoUser.email}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border-2 border-red-100 bg-red-50 rounded-lg">
                <span className="text-sm font-black text-red-900 uppercase">
                  Acesso Administrador
                </span>
                <input
                  type="checkbox"
                  checked={editandoUser.is_admin}
                  onChange={(e) =>
                    setEditandoUser({
                      ...editandoUser,
                      is_admin: e.target.checked,
                    })
                  }
                  className="w-6 h-6 accent-red-600 cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-500 uppercase border-b pb-1">
                  Módulos Autorizados
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {modulosDisponiveis.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 p-3 border-2 rounded hover:border-blue-500 cursor-pointer bg-white text-gray-900 font-bold text-[10px] transition-all has-[:checked]:bg-blue-50 has-[:checked]:border-blue-600 uppercase"
                    >
                      <input
                        type="checkbox"
                        checked={editandoUser.modulos_permitidos?.includes(m)}
                        onChange={(e) => {
                          const lista = editandoUser.modulos_permitidos || [];
                          const nova = e.target.checked
                            ? [...lista, m]
                            : lista.filter((i: any) => i !== m);
                          setEditandoUser({
                            ...editandoUser,
                            modulos_permitidos: nova,
                          });
                        }}
                        className="w-4 h-4"
                      />{" "}
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pb-10">
                <h3 className="text-xs font-black text-gray-500 uppercase border-b pb-1">
                  Sedes Autorizadas
                </h3>
                <div className="space-y-2">
                  {sedes.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-3 border-2 rounded hover:border-green-500 cursor-pointer bg-white text-gray-900 font-bold text-xs transition-all has-[:checked]:bg-green-50 has-[:checked]:border-green-600"
                    >
                      <input
                        type="checkbox"
                        checked={editandoUser.sedes_permitidas?.includes(s.id)}
                        onChange={(e) => {
                          const lista = editandoUser.sedes_permitidas || [];
                          const nova = e.target.checked
                            ? [...lista, s.id]
                            : lista.filter((i: any) => i !== s.id);
                          setEditandoUser({
                            ...editandoUser,
                            sedes_permitidas: nova,
                          });
                        }}
                        className="w-4 h-4"
                      />{" "}
                      {s.sigla} - {s.nome}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={salvarAlteracoes}
              disabled={salvando}
              className="w-full bg-gray-900 hover:bg-green-600 text-white font-black py-4 rounded-xl text-sm uppercase shadow-2xl transition-all flex items-center justify-center gap-3 disabled:bg-gray-400"
            >
              {salvando ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={20} />
              )}{" "}
              Confirmar Alterações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
