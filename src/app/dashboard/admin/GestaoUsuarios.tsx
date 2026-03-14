"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { registrarLog } from "@/lib/audit"; // ✅ Adicionado
import Swal from "sweetalert2";
import { Users, UserCog, X, Save, Loader2, Trash2 } from "lucide-react";

export default function GestaoUsuarios({ sedes }: { sedes: any[] }) {
  const { user: usuarioLogado } = useAuth();
  const nomeAdmin =
    usuarioLogado?.user_metadata?.full_name ||
    usuarioLogado?.user_metadata?.name ||
    "Administrador"; // ✅ Adicionado

  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoUser, setEditandoUser] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

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
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setLoading(true);
    const { data } = await supabase
      .from("vw_gestao_usuarios")
      .select("*")
      .order("nome");
    if (data) setUsuarios(data);
    setLoading(false);
  }

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

    if (error) {
      Swal.fire("Erro", error.message, "error");
    } else {
      // ✅ LOG DE AUDITORIA (ATUALIZAÇÃO DE ACESSOS)
      const modulosTexto =
        editandoUser.modulos_permitidos?.length > 0
          ? editandoUser.modulos_permitidos.join(", ")
          : "Nenhum";

      const sedesTexto =
        editandoUser.sedes_permitidas?.length > 0
          ? editandoUser.sedes_permitidas.join(", ")
          : "Nenhuma";

      const detalhesDoLog = `Modificou acessos de '${editandoUser.nome}'. Admin: ${editandoUser.is_admin ? "SIM" : "NÃO"} | Módulos: [${modulosTexto}] | IDs das Sedes: [${sedesTexto}]`;

      await registrarLog(nomeAdmin, "ATUALIZAÇÃO DE PERMISSÕES", detalhesDoLog);

      setModalAberto(false);
      carregarUsuarios();
      Swal.fire("Salvo!", "Acessos atualizados.", "success");
    }
    setSalvando(false);
  };

  const excluirUsuario = async (id: string, nome: string) => {
    if (id === usuarioLogado?.id) {
      return Swal.fire(
        "Atenção",
        "Você não pode excluir a sua própria conta.",
        "warning",
      );
    }

    const { isConfirmed } = await Swal.fire({
      title: "Exclusão Permanente",
      text: `Tem certeza que deseja apagar o usuário ${nome}? Todo o acesso dele será revogado e a conta será deletada do Bando de Dados.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, Excluir!",
      cancelButtonText: "Cancelar",
    });

    if (isConfirmed) {
      Swal.fire({
        title: "Apagando...",
        text: "Processando a exclusão no servidor.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const response = await fetch("/api/usuarios", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIdParaDeletar: id,
            adminId: usuarioLogado?.id,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // ✅ LOG DE AUDITORIA (EXCLUSÃO DE CONTA)
          await registrarLog(
            nomeAdmin,
            "EXCLUSÃO DE USUÁRIO",
            `Removeu permanentemente o usuário '${nome}' (ID: ${id}) do sistema.`,
          );

          Swal.fire(
            "Excluído!",
            "O usuário foi removido permanentemente.",
            "success",
          );
          carregarUsuarios();
        } else {
          throw new Error(data.error);
        }
      } catch (err: any) {
        Swal.fire("Erro na Exclusão", err.message, "error");
      }
    }
  };

  if (loading)
    return (
      <div className="text-center p-10 font-bold text-slate-400 animate-pulse">
        Carregando usuários...
      </div>
    );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
        <Users className="text-blue-500" /> Contas Habilitadas
      </h2>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-[11px] min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500 font-bold uppercase">
            <tr>
              <th className="p-4">Colaborador</th>
              <th className="p-4 text-center">Tipo</th>
              <th className="p-4">Módulos</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800 text-slate-900 dark:text-slate-300">
            {usuarios.map((u) => (
              <tr
                key={u.user_id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="p-4">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {u.nome}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                    {u.email}
                  </div>
                </td>
                <td className="p-4 text-center font-black text-slate-900 dark:text-slate-100">
                  {u.is_admin ? "ADMIN" : "USER"}
                </td>

                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {u.modulos_permitidos?.map((m: any) => (
                      <span
                        key={m}
                        className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-blue-200 dark:border-blue-800/50"
                      >
                        {m.replace("_", " ")}
                      </span>
                    ))}
                    {(!u.modulos_permitidos ||
                      u.modulos_permitidos.length === 0) && (
                      <span className="text-[9px] font-bold text-slate-400 italic">
                        Nenhum acesso
                      </span>
                    )}
                  </div>
                </td>

                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditandoUser({ ...u });
                        setModalAberto(true);
                      }}
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-lg text-[10px] hover:bg-blue-600 hover:text-white uppercase font-black transition-all"
                    >
                      Configurar
                    </button>
                    <button
                      onClick={() => excluirUsuario(u.user_id, u.nome)}
                      title="Excluir Usuário"
                      className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex justify-center sm:justify-end z-[999] animate-in fade-in backdrop-blur-sm p-0">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 h-full p-4 sm:p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b dark:border-slate-700 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <UserCog
                  size={24}
                  className="text-blue-600 dark:text-blue-500"
                />
                <h2 className="text-lg font-black uppercase text-slate-900 dark:text-slate-200">
                  Acessos do Usuário
                </h2>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="hover:bg-red-500 hover:text-white p-2 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Colaborador
                </p>
                <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                  {editandoUser.nome}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400 font-mono italic truncate">
                  {editandoUser.email}
                </p>
              </div>
              <div className="flex items-center justify-between p-4 border-2 border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-xs font-black text-red-900 dark:text-red-300 uppercase">
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
                  className="w-7 h-7 accent-red-600 cursor-pointer"
                />
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700 pb-1">
                  Módulos Permitidos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modulosDisponiveis.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-3 p-3 border-2 dark:border-slate-800 rounded hover:border-blue-500 cursor-pointer bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 font-bold text-[10px] uppercase transition-all has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/30"
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
                        className="w-5 h-5 dark:accent-blue-500 cursor-pointer"
                      />{" "}
                      {m.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3 pb-20">
                <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700 pb-1">
                  Unidades Permitidas
                </h3>
                <div className="space-y-2">
                  {sedes.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-3 border-2 dark:border-slate-800 rounded hover:border-green-500 cursor-pointer bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 font-bold text-xs has-[:checked]:bg-green-50 dark:has-[:checked]:bg-green-900/20 transition-all"
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
                        className="w-5 h-5 dark:accent-green-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs">{s.nome}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t dark:border-slate-700 mt-auto bg-white dark:bg-slate-900">
              <button
                onClick={salvarAlteracoes}
                disabled={salvando}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-sm uppercase shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800"
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
