interface KpiCardProps {
  label: string;
  value: number;
  color: string; // classe Tailwind para cor do texto
}

export function KpiCard({ label, value, color }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-4xl font-black ${color} dark:text-white`}>
        {value}
      </p>
    </div>
  );
}