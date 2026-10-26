import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, AlertTriangle, FileText, StickyNote, Save, Loader2 } from "lucide-react";

interface Props {
  cd_aluno: string;
  nm_pessoa: string;
  turma: string;
  sedeId?: number | null;
  onSalvo?: () => void;
}

type Decisao = "Aprovado" | "Retido" | "Exame" | "Recuperação" | "Observação";

const opcoes: { label: string; value: Decisao; icon: any; cor: string }[] = [
  { label: "Aprovado pelo conselho", value: "Aprovado", icon: Check, cor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { label: "Retido / Exame final", value: "Retido", icon: AlertTriangle, cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { label: "Encaminhado para recuperação", value: "Recuperação", icon: FileText, cor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { label: "Apenas observação", value: "Observação", icon: StickyNote, cor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
];

export default function ParecerConselho({ cd_aluno, nm_pessoa, turma, sedeId, onSalvo }: Props) {
  const [decisao, setDecisao] = useState<Decisao>("Observação");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarParecer();
  }, [cd_aluno]);

  const carregarParecer = async () => {
    setCarregando(true);
    const { data } = await supabase
      .from("conselho_notas")
      .select("parecer")
      .eq("cd_aluno", cd_aluno)
      .maybeSingle();

    if (data?.parecer) {
      try {
        const parsed = JSON.parse(data.parecer);
        if (parsed.decisao) setDecisao(parsed.decisao);
        if (parsed.observacao) setObservacao(parsed.observacao);
      } catch {}
    }
    setCarregando(false);
  };

  const salvar = async () => {
    setSalvando(true);
    const payload = JSON.stringify({ decisao, observacao });

    await supabase
      .from("conselho_notas")
      .update({ parecer: payload })
      .eq("cd_aluno", cd_aluno);

    // Salva também no histórico
    await supabase.from("conselho_historico").insert({
      nm_pessoa,
      cd_aluno,
      turma,
      decisao,
      observacao,
      sede_id: sedeId,
    });

    setSalvando(false);
    onSalvo?.();
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Carregando parecer...
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/60 rounded-lg border border-gray-200 dark:border-slate-700">
      <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">
        Parecer do Conselho
      </h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {opcoes.map((op) => {
          const Icon = op.icon;
          const ativo = decisao === op.value;
          return (
            <button
              key={op.value}
              onClick={() => setDecisao(op.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
                ativo
                  ? op.cor + " border-current"
                  : "bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              <Icon size={14} />
              {op.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="Observações do conselho (opcional)..."
        rows={2}
        className="w-full text-xs border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-2 outline-none focus:ring-2 focus:ring-teal-500 resize-none"
      />

      <div className="flex justify-end mt-2">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d9488] hover:bg-teal-700 text-white text-xs font-bold rounded-md transition-colors disabled:opacity-50"
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {salvando ? "Salvando..." : " Salvar Parecer"}
        </button>
      </div>
    </div>
  );
}