import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  Legend,
  Tooltip,
} from "recharts";

interface SegmentosPieChartProps {
  data: { name: string; value: number }[];
  cores: string[];
}

export function SegmentosPieChart({ data, cores }: SegmentosPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex-1 min-h-[250px] w-full flex items-center justify-center text-slate-500 dark:text-slate-400">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={cores[i % cores.length]} />
            ))}
            <LabelList
              dataKey="value"
              position="outside"
              fill="#64748b"
              fontSize={12}
              fontWeight="bold"
            />
          </Pie>
          <Tooltip />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}