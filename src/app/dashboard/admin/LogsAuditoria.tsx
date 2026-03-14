"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Clock, Loader2 } from "lucide-react";

export default function LogsAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarLogs();
  }, []);

  async function carregarLogs() {
    setLoading(true);
    // Trazemos os últimos 50 logs para não sobrecarregar
    const { data } = await supabase
      .from("logs_auditoria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setLogs(data);
    setLoading(false);
  }

  if (loading)
    return (
      <div className="text-center p-10 font-bold text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" /> Carregando auditoria...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-4">
        <ClipboardList className="text-amber-500" />
        <h2 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200">
          Registro de Auditoria do Sistema
        </h2>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-4 rounded-xl text-[10px] sm:text-xs text-amber-800 dark:text-amber-400 font-bold flex items-center gap-3">
        <span className="bg-amber-500 text-white px-2 py-1 rounded uppercase tracking-widest text-[9px]">
          Segurança
        </span>
        Mostrando os últimos 50 eventos críticos registrados pelo banco de
        dados.
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900">
        <div className="max-h-[500px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold italic text-sm">
              Nenhum evento registrado recentemente.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800/50">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="p-4 hover:bg-white dark:hover:bg-slate-800/50 transition-colors flex gap-4 items-start"
                >
                  <div className="mt-1 bg-slate-200 dark:bg-slate-800 p-2 rounded-full shrink-0 text-slate-500">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        {log.usuario_nome}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tight mb-1">
                      {log.acao}
                    </div>
                    {log.detalhes && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 border-l-2 border-slate-300 dark:border-slate-700 pl-2 mt-2">
                        {log.detalhes}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
