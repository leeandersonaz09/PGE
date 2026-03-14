"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useColigada } from "@/context/ColigadaContext";
import { useAuth } from "@/context/AuthContext"; // ✅ Adicionado
import { registrarLog } from "@/lib/audit"; // ✅ Adicionado
import Papa from "papaparse";
import Swal from "sweetalert2";
import {
  UploadCloud,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function SincronizacaoBase({ sedes }: { sedes: any[] }) {
  const { coligadaAtual } = useColigada();
  const { user } = useAuth(); // ✅ Adicionado
  const nomeUsuario =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Administrador"; // ✅ Adicionado

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [sedeImportacao, setSedeImportacao] = useState("");
  const [ultimaImportacao, setUltimaImportacao] = useState(
    "Selecione uma sede...",
  );
  const [statusImport, setStatusImport] = useState<{
    tipo: "sucesso" | "erro" | "processando" | null;
    msg: string;
  }>({ tipo: null, msg: "" });

  useEffect(() => {
    if (coligadaAtual) setSedeImportacao(String(coligadaAtual.id));
  }, [coligadaAtual]);

  useEffect(() => {
    if (sedeImportacao) buscarUltimaSincronizacaoPorSede(sedeImportacao);
    else setUltimaImportacao("Selecione uma sede...");
  }, [sedeImportacao]);

  async function buscarUltimaSincronizacaoPorSede(idSede: string) {
    setUltimaImportacao("Buscando...");
    const { data } = await supabase
      .from("alunos")
      .select("importado_em")
      .eq("sede_id", idSede)
      .order("importado_em", { ascending: false })
      .limit(1);
    if (data?.[0]?.importado_em)
      setUltimaImportacao(
        new Date(data[0].importado_em).toLocaleString("pt-BR"),
      );
    else setUltimaImportacao("Nenhum registro encontrado");
  }

  const handleProcessarPlanilha = () => {
    if (!arquivo || !sedeImportacao) return;
    setStatusImport({
      tipo: "processando",
      msg: "Processando e Sincronizando dados...",
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
          setStatusImport({ tipo: "erro", msg: error.message });
          Swal.fire("Erro!", error.message, "error");
        } else {
          setStatusImport({
            tipo: "sucesso",
            msg: `${listaFinal.length} alunos importados!`,
          });

          // ✅ LOG DE AUDITORIA GRAVADO AQUI
          await registrarLog(
            nomeUsuario,
            "SINCRONIZAÇÃO DE BASE (CSV)",
            `Importou ${listaFinal.length} alunos para a sede ID: ${sedeImportacao}.`,
          );

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
        <UploadCloud className="text-emerald-500" /> Sincronizar Banco de Dados
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
        Faça o upload da planilha exportada do sistema acadêmico para atualizar
        a base de alunos do PGE.
      </p>

      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase text-slate-500">
          Unidade (Sede) de Destino:
        </label>
        <select
          value={sedeImportacao}
          onChange={(e) => setSedeImportacao(e.target.value)}
          className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm font-black bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 outline-none focus:border-emerald-500"
        >
          <option value="">Selecione a sede...</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center bg-slate-50 dark:bg-slate-800/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer group">
          <input
            type="file"
            accept=".csv"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
          />
          <FileSpreadsheet
            size={48}
            className={arquivo ? "text-emerald-500" : "text-slate-400"}
          />
          <p className="font-bold text-slate-700 dark:text-slate-300 mt-4">
            {arquivo ? arquivo.name : "Clique ou arraste o arquivo CSV aqui"}
          </p>
        </div>

        <div className="p-4 rounded-xl flex items-center gap-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <Clock size={20} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest">
              Última Sincronização
            </p>
            <p className="text-sm font-black">{ultimaImportacao}</p>
          </div>
        </div>

        {statusImport.tipo && (
          <div
            className={`p-4 rounded-xl text-xs font-bold border flex gap-2 items-center animate-in fade-in ${statusImport.tipo === "sucesso" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"}`}
          >
            {statusImport.tipo === "sucesso" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {statusImport.msg}
          </div>
        )}

        <button
          onClick={handleProcessarPlanilha}
          disabled={
            !arquivo || !sedeImportacao || statusImport.tipo === "processando"
          }
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-xl text-sm uppercase shadow-xl disabled:bg-slate-300 dark:disabled:bg-slate-800 transition-all"
        >
          {statusImport.tipo === "processando"
            ? "Sincronizando..."
            : "Iniciar Sincronização"}
        </button>
      </div>
    </div>
  );
}
