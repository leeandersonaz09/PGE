import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function BuscaAluno({
  value,
  onChange,
  placeholder = "Busque por nome ou RA...",
}: Props) {
  return (
    <div className="relative flex items-center">
      <Search
        size={15}
        className="absolute left-3 text-gray-400 dark:text-slate-500 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-xs border dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-red-500"
          title="Limpar busca"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}