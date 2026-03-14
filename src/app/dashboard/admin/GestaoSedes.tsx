"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext"; // ✅ Adicionado
import { registrarLog } from "@/lib/audit"; // ✅ Adicionado
import Swal from "sweetalert2";
import { Building2, PlusCircle, Trash2 } from "lucide-react";

export default function GestaoSedes({
  sedes,
  recarregar,
}: {
  sedes: any[];
  recarregar: () => void;
}) {
  const { user } = useAuth(); // ✅ Adicionado
  const nomeUsuario =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Administrador"; // ✅ Adicionado

  const [novoId, setNovoId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaSigla, setNovaSigla] = useState("");

  const adicionarSede = async () => {
    if (!novoId || !novoNome || !novaSigla) {
      return Swal.fire(
        "Atenção",
        "Preencha todos os campos da nova unidade.",
        "warning",
      );
    }

    const { error } = await supabase
      .from("sedes")
      .insert([
        { id: Number(novoId), nome: novoNome, sigla: novaSigla.toUpperCase() },
      ]);

    if (!error) {
      // ✅ LOG DE AUDITORIA AQUI
      await registrarLog(
        nomeUsuario,
        "NOVA UNIDADE (SEDE)",
        `Cadastrou a unidade '${novoNome}' com o ID ${novoId} e Sigla ${novaSigla.toUpperCase()}.`,
      );

      setNovoId("");
      setNovoNome("");
      setNovaSigla("");
      recarregar();
      Swal.fire({
        title: "Salvo!",
        icon: "success",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      Swal.fire(
        "Erro",
        "Pode já existir uma unidade com este Código ID.",
        "error",
      );
    }
  };

  // ✅ Modificado para receber o nome da sede para gravar no log
  const deletarSede = async (id: number, nomeSede: string) => {
    const result = await Swal.fire({
      title: "Apagar Unidade?",
      text: "Isso pode afetar alunos e equipamentos vinculados. Tem a certeza?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, remover!",
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from("sedes").delete().eq("id", id);
      if (error) {
        Swal.fire(
          "Erro",
          "Não é possível apagar sedes que já possuem alunos vinculados.",
          "error",
        );
      } else {
        // ✅ LOG DE AUDITORIA AQUI
        await registrarLog(
          nomeUsuario,
          "EXCLUSÃO DE UNIDADE (SEDE)",
          `Removeu permanentemente a unidade '${nomeSede}' (ID: ${id}).`,
        );

        recarregar();
        Swal.fire("Removido!", "Unidade escolar removida.", "success");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-4">
        <Building2 className="text-blue-500" />
        <h2 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200">
          Unidades do Sistema (Multi-Tenant)
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 border dark:border-slate-800 rounded-2xl h-fit space-y-4 shadow-inner">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Nova Unidade
          </h3>
          <input
            type="number"
            placeholder="ID/Código (Ex: 1219)"
            value={novoId}
            onChange={(e) => setNovoId(e.target.value)}
            className="w-full border dark:border-slate-700 p-3 text-sm rounded-xl bg-white dark:bg-slate-900 outline-none focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200"
          />
          <input
            type="text"
            placeholder="Nome Completo (Ex: Pituba)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="w-full border dark:border-slate-700 p-3 text-sm rounded-xl bg-white dark:bg-slate-900 outline-none focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200"
          />
          <input
            type="text"
            placeholder="Sigla (Ex: PTB)"
            value={novaSigla}
            onChange={(e) => setNovaSigla(e.target.value)}
            maxLength={5}
            className="w-full border dark:border-slate-700 p-3 text-sm rounded-xl bg-white dark:bg-slate-900 outline-none focus:border-blue-500 uppercase placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200"
          />
          <button
            onClick={adicionarSede}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-4 rounded-xl w-full transition-all flex justify-center gap-2"
          >
            <PlusCircle size={16} /> Cadastrar Sede
          </button>
        </div>

        <div className="xl:col-span-2 overflow-x-auto border dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-sm min-w-[400px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500 text-[10px] font-bold uppercase">
              <tr>
                <th className="p-4 text-center">Cód (ID)</th>
                <th className="p-4">Nome da Unidade</th>
                <th className="p-4 text-center">Sigla</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {sedes.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-4 text-center font-mono font-bold text-slate-500">
                    {s.id}
                  </td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                    {s.nome}
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-black px-2 py-1 rounded-md text-[10px] uppercase">
                      {s.sigla}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => deletarSede(s.id, s.nome)} // ✅ Passando o nome agora
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
