import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  LabelList,
} from "recharts";

interface EnfermariaAreaChartProps {
  data: { dia: string; total: number }[];
}

export function EnfermariaAreaChart({ data }: EnfermariaAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-56 w-full flex items-center justify-center text-slate-500 dark:text-slate-400">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorEnf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#334155"
            opacity={0.1}
          />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#colorEnf)"
          >
            <LabelList
              dataKey="total"
              position="top"
              fill="#10b981"
              fontSize={12}
              fontWeight="bold"
              offset={10}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}