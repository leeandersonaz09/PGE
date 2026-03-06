"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import Papa from "papaparse";
import Swal from "sweetalert2"; // ✅ Janelas de confirmação premium
import {
  Users,
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Clock,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCog,
  Laptop,
  PlusCircle,
  Trash2,
} from "lucide-react";

export default function AdminPage() {
  const { coligadaAtual, loadingColigadas } = useColigada();
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
  const [ultimaImportacao, setUltimaImportacao] = useState(
    "Selecione uma sede...",
  );

  // Estados de Edição de Usuário
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoUser, setEditandoUser] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

  // Estados de Gestão de Equipamentos
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [novoEquipNome, setNovoEquipNome] = useState("");
  const [novoEquipQtd, setNovoEquipQtd] = useState(1);

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
    "mala_direta",
  ];

  useEffect(() => {
    carregarDadosIniciais();
    if (coligadaAtual) setSedeImportacao(String(coligadaAtual.id));
  }, [coligadaAtual]);

  useEffect(() => {
    if (sedeImportacao) {
      buscarUltimaSincronizacaoPorSede(sedeImportacao);
      carregarEquipamentosPorSede(Number(sedeImportacao));
    } else {
      setUltimaImportacao("Selecione uma sede...");
      setEquipamentos([]);
    }
  }, [sedeImportacao]);

  async function carregarDadosIniciais() {
    setLoading(true);
    const { data: usersData } = await supabase
      .from("vw_gestao_usuarios")
      .select("*")
      .order("nome");
    const { data: sedesData } = await supabase
      .from("sedes")
      .select("*")
      .order("nome");
    if (usersData) setUsuarios(usersData);
    if (sedesData) setSedes(sedesData);
    setLoading(false);
  }

  async function carregarEquipamentosPorSede(idSede: number) {
    const { data } = await supabase
      .from("equipamentos")
      .select("*")
      .eq("sede_id", idSede)
      .order("nome");
    if (data) setEquipamentos(data);
  }

  async function buscarUltimaSincronizacaoPorSede(idSede: string) {
    setUltimaImportacao("Buscando...");
    const { data } = await supabase
      .from("alunos")
      .select("importado_em")
      .eq("sede_id", idSede)
      .order("importado_em", { ascending: false })
      .limit(1);
    if (data?.[0]?.importado_em) {
      setUltimaImportacao(
        new Date(data[0].importado_em).toLocaleString("pt-BR"),
      );
    } else {
      setUltimaImportacao("Nenhum registro encontrado");
    }
  }

  const handleProcessarPlanilha = () => {
    if (!arquivo || !sedeImportacao) return;
    setStatusImport({
      tipo: "processando",
      msg: "Sincronizando dados com o servidor...",
    });
    Papa.parse(arquivo, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      complete: async (results) => {
        const rows = results.data;
        const codigosVistos = new Set();
        const listaFinal: any[] = [];
        rows.forEach((row: any) => {
          const cod = row["Código"];
          if (cod && !codigosVistos.has(cod)) {
            codigosVistos.add(cod);
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
              financeiro_nome: row["Nome r. financeiro"],
              financeiro_fixo: row["Telefone residencial r. financeiro"],
              financeiro_celular: row["Telefone celular r. financeiro"],
              financeiro_email: row["Email r. financeiro"],
              pai: row["Nome Pai"],
              fixo_pai: row["Telefone residencial Pai"],
              celular_pai: row["Telefone celular Pai"],
              email_pai: row["Email Pai"],
              mae: row["Nome Mãe"],
              fixo_mae: row["Telefone residencial Mãe"],
              celular_mae: row["Telefone celular Mãe"],
              email_mae: row["Email Mãe"],
              foto_url: row["ds_link_foto"] || "",
              sede_id: Number(sedeImportacao),
              importado_em: new Date().toISOString(),
            });
          }
        });
        const { error } = await supabase
          .from("alunos")
          .upsert(listaFinal, { onConflict: "id" });
        if (error) {
          setStatusImport({ tipo: "erro", msg: "Erro: " + error.message });
          Swal.fire("Erro!", error.message, "error");
        } else {
          setStatusImport({
            tipo: "sucesso",
            msg: `${listaFinal.length} alunos importados com sucesso!`,
          });
          Swal.fire(
            "Sucesso!",
            `${listaFinal.length} alunos sincronizados.`,
            "success",
          );
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
    const { error } = await supabase.from("permissoes_usuarios").upsert(
      {
        user_id: editandoUser.user_id,
        is_admin: editandoUser.is_admin,
        sedes_permitidas: editandoUser.sedes_permitidas,
        modulos_permitidos: editandoUser.modulos_permitidos,
      },
      { onConflict: "user_id" },
    );

    if (error) Swal.fire("Erro", error.message, "error");
    else {
      setModalAberto(false);
      carregarDadosIniciais();
      Swal.fire("Salvo!", "Acessos atualizados.", "success");
    }
    setSalvando(false);
  };

  const adicionarEquipamento = async () => {
    if (!novoEquipNome || !sedeImportacao) {
      return Swal.fire(
        "Atenção",
        "Selecione uma sede antes de cadastrar.",
        "warning",
      );
    }
    const { error } = await supabase.from("equipamentos").insert([
      {
        nome: novoEquipNome,
        quantidade_total: novoEquipQtd,
        sede_id: Number(sedeImportacao),
      },
    ]);
    if (!error) {
      setNovoEquipNome("");
      carregarEquipamentosPorSede(Number(sedeImportacao));
      Swal.fire({
        title: "Salvo!",
        icon: "success",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const deletarEquipamento = async (id: string) => {
    const result = await Swal.fire({
      title: "Apagar Dispositivo?",
      text: "O item será removido desta sede.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, remover!",
    });
    if (result.isConfirmed) {
      await supabase.from("equipamentos").delete().eq("id", id);
      carregarEquipamentosPorSede(Number(sedeImportacao));
      Swal.fire("Removido!", "Item excluído.", "success");
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center text-blue-600 font-bold animate-pulse italic">
        CPD Sincronizando...
      </div>
    );

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-full flex flex-col gap-6 text-slate-900 font-sans overflow-x-hidden">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-slate-800">
          <ShieldCheck className="text-red-600 shrink-0" size={28} />
          <span className="truncate">Painel Administrativo</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LISTA DE USUÁRIOS */}
        <div className="xl:col-span-2 bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-2 border-b font-bold text-[10px] uppercase flex items-center gap-2">
            <Users size={14} /> Contas Habilitadas
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] min-w-[500px]">
              <thead className="bg-slate-100 border-b text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3">Módulos</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-900">
                {usuarios.map((u) => (
                  <tr
                    key={u.user_id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{u.nome}</div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {u.email}
                      </div>
                    </td>
                    <td className="p-3 text-center font-black text-slate-900">
                      {u.is_admin ? "ADMIN" : "USER"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.modulos_permitidos?.map((m: any) => (
                          <span
                            key={m}
                            className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => abrirEdicao(u)}
                        className="bg-slate-900 text-white px-3 py-1.5 rounded text-[10px] hover:bg-blue-600 uppercase font-black"
                      >
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SINCRONIZAÇÃO CSV (AQUI VOLTOU AS INFORMAÇÕES) */}
        <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 font-bold text-[10px] uppercase flex items-center gap-2">
            <UploadCloud size={14} /> Sincronizar Base
          </div>
          <div className="p-4 space-y-4">
            <select
              value={sedeImportacao}
              onChange={(e) => setSedeImportacao(e.target.value)}
              className="w-full border-2 rounded p-2 text-sm font-black bg-white text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="">Selecione a sede...</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
            <div className="relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center bg-slate-50 hover:bg-blue-50 transition-all cursor-pointer group text-center text-slate-900 font-bold">
              <input
                type="file"
                accept=".csv"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              />
              <FileSpreadsheet
                size={40}
                className={arquivo ? "text-emerald-600" : "text-slate-400"}
              />
              <p className="text-[10px] mt-2 uppercase">
                {arquivo ? arquivo.name : "Subir CSV"}
              </p>
            </div>

            {/* ✅ BLOCO RESTAURADO: Última Importação e Status */}
            <div className="p-3 rounded flex items-center gap-3 border bg-slate-50 border-slate-200">
              <Clock className="text-slate-400 shrink-0" size={18} />
              <div className="leading-tight overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Última Sincronização
                </p>
                <p className="text-xs font-black text-slate-900 truncate">
                  {ultimaImportacao}
                </p>
              </div>
            </div>

            {statusImport.tipo && (
              <div
                className={`p-3 rounded text-[11px] font-bold border flex gap-2 items-start animate-in fade-in slide-in-from-top-1 ${statusImport.tipo === "sucesso" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}`}
              >
                {statusImport.tipo === "sucesso" ? (
                  <CheckCircle2 size={14} className="shrink-0" />
                ) : (
                  <AlertCircle size={14} className="shrink-0" />
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded text-xs uppercase shadow-lg disabled:bg-slate-300 transition-all"
            >
              {statusImport.tipo === "processando"
                ? "Sincronizando..."
                : "Sincronizar Dados"}
            </button>
          </div>
        </div>
      </div>

      {/* GESTÃO EQUIPAMENTOS */}
      <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="bg-indigo-600 text-white px-4 py-2 border-b font-bold text-[10px] uppercase flex items-center gap-2">
          <Laptop size={14} /> Dispositivos (
          {sedeImportacao
            ? sedes.find((s) => s.id === Number(sedeImportacao))?.sigla
            : "Escolha a Unidade"}
          )
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 p-4 border rounded h-fit">
            <h3 className="text-xs font-black text-slate-700 uppercase mb-3 text-center">
              Cadastrar Item
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ex: Projetor 01"
                value={novoEquipNome}
                onChange={(e) => setNovoEquipNome(e.target.value)}
                className="w-full border p-2 text-sm rounded bg-white text-slate-900 outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                min="1"
                value={novoEquipQtd}
                onChange={(e) => setNovoEquipQtd(Number(e.target.value))}
                className="w-full border p-2 text-sm rounded bg-white text-slate-900"
              />
              <button
                onClick={adicionarEquipamento}
                className="bg-indigo-600 text-white font-black text-xs uppercase px-4 py-2 rounded w-full hover:bg-indigo-700 transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
          <div className="md:col-span-2 overflow-x-auto border rounded">
            <table className="w-full text-left text-[11px] min-w-[300px]">
              <thead className="bg-slate-100 border-b text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3 border-r">Equipamento</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-900 bg-white">
                {equipamentos.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="p-3 border-r font-bold text-slate-900">
                      {eq.nome}
                    </td>
                    <td className="p-3 text-center font-black text-indigo-600">
                      {eq.quantidade_total}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => deletarEquipamento(eq.id)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-all"
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
                      className="p-4 text-center text-slate-400 italic font-bold"
                    >
                      Selecione uma sede acima para ver os itens.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE PERMISSÕES RESPONSIVO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex justify-center sm:justify-end z-[999] animate-in fade-in backdrop-blur-sm p-0">
          <div className="w-full sm:max-w-md bg-white h-full p-4 sm:p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div className="flex items-center gap-2">
                <UserCog size={24} className="text-blue-600" />
                <h2 className="text-lg font-black uppercase text-slate-900">
                  Acessos do Usuário
                </h2>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="hover:bg-red-500 hover:text-white p-2 rounded-full text-slate-500"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6">
              <div className="p-4 bg-slate-900 rounded-lg text-white">
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  Colaborador
                </p>
                <p className="text-base sm:text-lg font-black">
                  {editandoUser.nome}
                </p>
                <p className="text-xs text-blue-400 font-mono italic truncate">
                  {editandoUser.email}
                </p>
              </div>
              <div className="flex items-center justify-between p-4 border-2 border-red-100 bg-red-50 rounded-lg">
                <span className="text-xs font-black text-red-900 uppercase">
                  Administrador do Sistema
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
                  className="w-7 h-7 accent-red-600"
                />
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase border-b pb-1">
                  Módulos Disponíveis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modulosDisponiveis.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-3 p-3 border-2 rounded hover:border-blue-500 cursor-pointer bg-white text-slate-900 font-bold text-[10px] uppercase transition-all has-[:checked]:bg-blue-50"
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
                        className="w-5 h-5"
                      />{" "}
                      {m.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3 pb-20">
                <h3 className="text-[10px] font-black text-slate-500 uppercase border-b pb-1">
                  Unidades Permitidas
                </h3>
                <div className="space-y-2">
                  {sedes.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-3 border-2 rounded hover:border-green-500 cursor-pointer bg-white text-slate-900 font-bold text-xs has-[:checked]:bg-green-50"
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
                        className="w-5 h-5"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs">{s.nome}</span>
                        <span className="text-[9px] text-slate-400 font-black uppercase">
                          {s.sigla}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t mt-auto bg-white">
              <button
                onClick={salvarAlteracoes}
                disabled={salvando}
                className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-sm uppercase shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-400"
              >
                {salvando ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}{" "}
                Confirmar Acessos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
