import { ChevronDown, Search, X } from "lucide-react";

interface Props {
  disciplinas: string[];
  selecionadas: string[];
  onToggle: (d: string) => void;
  onToggleAll: () => void;
  onLimpar: () => void;
  busca: string;
  onBuscaChange: (v: string) => void;
}

export default function FiltroDisciplinas({
  disciplinas,
  selecionadas,
  onToggle,
  onToggleAll,
  onLimpar,
  busca,
  onBuscaChange,
}: Props) {
  const filtradas = disciplinas.filter((d) =>
    d.toLowerCase().includes(busca.toLowerCase())
  );

  const todasSelecionadas =
    filtradas.length > 0 && filtradas.every((d) => selecionadas.includes(d));

  const principais = ["PORT", "MAT", "LP", "CH", "GE", "HI", "CI", "IN", "AR", "EF", "MU", "ED", "PE"];
  const extracurriculares = ["EDF", "PV", "SOESP", "ART.P"];

  const agrupar = (lista: string[]) => {
    const grupos: Record<string, string[]> = {};
    lista.forEach((d) => {
      let grupo = "Outras";
      if (extracurriculares.some((e) => d.includes(e))) grupo = "Ignoradas";
      else if (principais.some((p) => d.startsWith(p))) grupo = "Principais";
      grupos[grupo] = (grupos[grupo] || []).concat(d);
    });
    return grupos;
  };

  const grupos = agrupar(filtradas);

  return (
    <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">
            Filtro de Disciplinas
          </h4>
          <div className="flex gap-1">
            <button
              onClick={onToggleAll}
              className="text-[10px] font-bold text-teal-600 hover:underline"
            >
              {todasSelecionadas ? "Desmarcar" : "Selecionar todas"}
            </button>
            <span className="text-gray-300 dark:text-slate-600">|</span>
            <button
              onClick={onLimpar}
              className="text-[10px] font-bold text-red-500 hover:underline"
            >
              Limpar
            </button>
          </div>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Busca por disciplina..."
            className="w-full pl-8 pr-7 py-1 text-xs border dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
          />
          {busca && (
            <button
              onClick={() => onBuscaChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-2 space-y-3">
        {Object.entries(grupos).map(([grupo, lista]) => (
          <div key={grupo}>
            <h5 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1 px-1">
              {grupo}
            </h5>
            <div className="flex flex-wrap gap-1">
              {lista.map((d) => {
                const sel = selecionadas.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => onToggle(d)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all ${
                      sel
                        ? "bg-[#0d9488] text-white border-[#0d9488]"
                        : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filtradas.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">
            Nenhuma disciplina encontrada.
          </p>
        )}
      </div>
    </div>
  );
}