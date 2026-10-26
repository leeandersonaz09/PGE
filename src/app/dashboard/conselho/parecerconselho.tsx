import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Check,
  AlertTriangle,
  FileText,
  StickyNote,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface Props {
  cd_aluno: string;
  nm_pessoa: string;
  turma: string;
  sedeId?: number | null;
  onSalvo?: (parecerJson: string) => void;
}

type Decisao = "Aprovado" | "Retido" | "Recuperação" | "Observação";

const opcoes: { label: string; value: Decisao; icon: any; cor: string }[] = [
  {
    label: "Aprovado pelo conselho",
    value: "Aprovado",
    icon: Check,
    cor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    label: "Retido / Exame final",
    value: "Retido",
    icon: AlertTriangle,
    cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    label: "Encaminhado para recuperação",
    value: "Recuperação",
    icon: FileText,
    cor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    label: "Apenas observação",
    value: "Observação",
    icon: StickyNote,
    cor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
];

export default function ParecerConselho({
  cd_aluno,
  nm_pessoa,
  turma,
  sedeId,
  onSalvo,
}: Props) {
  const [decisao, setDecisao] = useState<Decisao>("Observação");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvoMsg, setSalvoMsg] = useState(false);

  useEffect(() => {
    carregarParecer();
  }, [cd_aluno]);

  const carregarParecer = async () => {
    setCarregando(true);
    setSalvoMsg(false);
    // Reseta os campos ao trocar de aluno para não herdar dados do aluno anterior
    setDecisao("Observação");
    setObservacao("");

    try {
      const { data, error } = await supabase
        .from("conselho_notas")
        .select("parecer")
        .eq("cd_aluno", cd_aluno)
        .maybeSingle();

      const rawParecer =
        !error && data?.parecer
          ? data.parecer
          : typeof window !== "undefined"
          ? localStorage.getItem(`conselho_parecer_${cd_aluno}`)
          : null;

      if (rawParecer) {
        try {
          const parsed = JSON.parse(rawParecer);
          if (parsed.decisao) setDecisao(parsed.decisao);
          if (parsed.observacao !== undefined) setObservacao(parsed.observacao);
        } catch {
          setObservacao(String(rawParecer));
        }
      }
    } catch {
      // Fallback silencioso
    }
    setCarregando(false);
  };

  const salvar = async () => {
    setSalvando(true);
    setSalvoMsg(false);
    const payload = JSON.stringify({ decisao, observacao });

    // Salva em localStorage também como garantia imediata
    if (typeof window !== "undefined") {
      localStorage.setItem(`conselho_parecer_${cd_aluno}`, payload);
    }

    try {
      await supabase
        .from("conselho_notas")
        .update({ parecer: payload })
        .eq("cd_aluno", cd_aluno);

      await supabase.from("conselho_historico").insert({
        nm_pessoa,
        cd_aluno,
        turma,
        decisao,
        observacao,
        sede_id: sedeId ?? null,
      });
    } catch {
      // Mantém salvo localmente caso a migration SQL ainda não tenha sido rodada
    }

    setSalvando(false);
    setSalvoMsg(true);
    onSalvo?.(payload);
    setTimeout(() => setSalvoMsg(false), 3000);
  };

  if (carregando) {
    return (
      <div className="py-3 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Carregando parecer...
      </div>
    );
  }

  return (
    <div className="pt-2 pb-1">
      <div className="flex flex-wrap gap-2 mb-2">
        {opcoes.map((op) => {
          const Icon = op.icon;
          const ativo = decisao === op.value;
          return (
            <button
              type="button"
              key={op.value}
              onClick={() => setDecisao(op.value)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all border ${
                ativo
                  ? op.cor + " border-current shadow-sm"
                  : "bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              <Icon size={13} />
              {op.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 items-end">
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações pedagógicas do conselho para este aluno (opcional)..."
          rows={2}
          className="flex-1 text-xs border dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-2 outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />

        <div className="flex flex-col items-end gap-1 shrink-0">
          {salvoMsg && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
              <CheckCircle2 size={13} /> Salvo!
            </span>
          )}
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0d9488] hover:bg-teal-700 text-white text-xs font-bold rounded-md transition-colors disabled:opacity-50"
          >
            {salvando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {salvando ? "Salvando..." : "Salvar Parecer"}
          </button>
        </div>
      </div>
    </div>
  );
}