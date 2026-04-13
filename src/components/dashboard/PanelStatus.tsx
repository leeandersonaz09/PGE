import { TrendingUp } from "lucide-react";

export function PanelStatus() {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl flex items-center gap-3">
      <TrendingUp className="text-emerald-500" size={24} />
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Painel
        </span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Atualizado
        </span>
      </div>
    </div>
  );
}