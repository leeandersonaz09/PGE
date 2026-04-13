import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  LabelList,
} from "recharts";

interface SerieBarChartProps {
  data: { serie: string; qtd: number }[];
}

export function SerieBarChart({ data }: SerieBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#334155"
            opacity={0.1}
          />
          <XAxis
            dataKey="serie"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#1e293b",
              color: "#fff",
            }}
          />
          <Bar
            dataKey="qtd"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={35}
          >
            <LabelList
              dataKey="qtd"
              position="top"
              fill="#64748b"
              fontSize={11}
              fontWeight="bold"
              offset={8}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}