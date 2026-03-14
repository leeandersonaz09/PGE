"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import { useAuth } from "@/context/AuthContext"; // ✅ Adicionado
import { registrarLog } from "@/lib/audit"; // ✅ Adicionado
import Swal from "sweetalert2";
import { Laptop, PlusCircle, Trash2 } from "lucide-react";

export default function GestaoEquipamentos({ sedes }: { sedes: any[] }) {
  const { coligadaAtual } = useColigada();
  const { user } = useAuth(); // ✅ Adicionado
  const nomeUsuario =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Administrador"; // ✅ Adicionado

  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [sedeSelecionada, setSedeSelecionada] = useState("");
  const [novoEquipNome, setNovoEquipNome] = useState("");
  const [novoEquipQtd, setNovoEquipQtd] = useState(1);

  useEffect(() => {
    if (coligadaAtual) setSedeSelecionada(String(coligadaAtual.id));
  }, [coligadaAtual]);

  useEffect(() => {
    if (sedeSelecionada) carregarEquipamentosPorSede(Number(sedeSelecionada));
    else setEquipamentos([]);
  }, [sedeSelecionada]);

  async function carregarEquipamentosPorSede(idSede: number) {
    const { data } = await supabase
      .from("equipamentos")
      .select("*")
      .eq("sede_id", idSede)
      .order("nome");
    if (data) setEquipamentos(data);
  }

  const adicionarEquipamento = async () => {
    if (!novoEquipNome || !sedeSelecionada)
      return Swal.fire(
        "Atenção",
        "Preencha o nome e selecione a sede.",
        "warning",
      );

    const { error } = await supabase.from("equipamentos").insert([
      {
        nome: novoEquipNome,
        quantidade_total: novoEquipQtd,
        sede_id: Number(sedeSelecionada),
      },
    ]);

    if (!error) {
      // ✅ LOG DE AUDITORIA AQUI
      await registrarLog(
        nomeUsuario,
        "CADASTRO DE EQUIPAMENTO",
        `Adicionou ${novoEquipQtd}x '${novoEquipNome}' ao inventário da Sede ${sedeSelecionada}.`,
      );

      setNovoEquipNome("");
      carregarEquipamentosPorSede(Number(sedeSelecionada));
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

  // ✅ Modificado para receber o nome também
  const deletarEquipamento = async (id: string, nomeEquip: string) => {
    const result = await Swal.fire({
      title: "Apagar Dispositivo?",
      text: "Remover da unidade?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, remover!",
    });
    if (result.isConfirmed) {
      await supabase.from("equipamentos").delete().eq("id", id);

      // ✅ LOG DE AUDITORIA AQUI
      await registrarLog(
        nomeUsuario,
        "EXCLUSÃO DE EQUIPAMENTO",
        `Removeu o dispositivo '${nomeEquip}' da unidade.`,
      );

      carregarEquipamentosPorSede(Number(sedeSelecionada));
      Swal.fire("Removido!", "Item excluído.", "success");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b dark:border-slate-800 pb-4">
        <h2 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Laptop className="text-indigo-500" /> Dispositivos de Locação
        </h2>
        <select
          value={sedeSelecionada}
          onChange={(e) => setSedeSelecionada(e.target.value)}
          className="border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold bg-white dark:bg-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="">Selecione a sede...</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 border dark:border-slate-800 rounded-2xl h-fit space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase">
            Cadastrar Novo Item
          </h3>
          <input
            type="text"
            placeholder="Ex: Projetor Epson"
            value={novoEquipNome}
            onChange={(e) => setNovoEquipNome(e.target.value)}
            className="w-full border dark:border-slate-700 p-3 text-sm rounded-xl bg-white dark:bg-slate-900 outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200"
          />
          <input
            type="number"
            min="1"
            value={novoEquipQtd}
            onChange={(e) => setNovoEquipQtd(Number(e.target.value))}
            className="w-full border dark:border-slate-700 p-3 text-sm rounded-xl bg-white dark:bg-slate-900 outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200"
          />
          <button
            onClick={adicionarEquipamento}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-4 rounded-xl w-full transition-all flex justify-center items-center gap-2"
          >
            <PlusCircle size={16} /> Adicionar ao Inventário
          </button>
        </div>

        <div className="md:col-span-2 overflow-x-auto border dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-sm min-w-[300px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500 text-[10px] font-bold uppercase">
              <tr>
                <th className="p-4">Equipamento</th>
                <th className="p-4 text-center">Quantidade</th>
                <th className="p-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {equipamentos.map((eq) => (
                <tr
                  key={eq.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                    {eq.nome}
                  </td>
                  <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400">
                    {eq.quantidade_total}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => deletarEquipamento(eq.id, eq.nome)} // ✅ Passando o nome agora
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {equipamentos.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="p-8 text-center text-slate-400 text-xs font-bold uppercase"
                  >
                    Nenhum equipamento cadastrado nesta sede.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
