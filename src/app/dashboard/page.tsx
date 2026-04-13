"use client";

import { useColigada } from "@/context/ColigadaContext";
import { useAuth } from "@/context/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useSeriesData } from "@/hooks/useSeriesData";
import { useSegmentosData } from "@/hooks/useSegmentosData";
import { useEnfermariaData } from "@/hooks/useEnfermariaData";
import { modulosConfig } from "@/lib/modulosConfig";
import Link from "next/link";
import { Loader2, TrendingUp, Lock, ShieldAlert, Users, Stethoscope, AlertTriangle, History, GraduationCap, MonitorPlay, ClipboardList, Mail, Printer, Dices, Settings } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LabelList, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { useState, useEffect } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ModuleLink } from "@/components/dashboard/ModuleLink";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { PanelStatus } from "@/components/dashboard/PanelStatus";
import { SerieBarChart } from "@/components/dashboard/SerieBarChart";
import { SegmentosPieChart } from "@/components/dashboard/SegmentosPieChart";
import { EnfermariaAreaChart } from "@/components/dashboard/EnfermariaAreaChart";

const getIcon = (id: string) => {
  const size = 32;
  switch (id) {
    case "alunos": return <Users size={size} />;
    case "repouso": return <Stethoscope size={size} />;
    case "ocorrencias": return <AlertTriangle size={size} />;
    case "historico": return <History size={size} />;
    case "conselho": return <GraduationCap size={size} />;
    case "locacoes": return <MonitorPlay size={size} />;
    case "historico_locacoes": return <ClipboardList size={size} />;
    case "mala_direta": return <Mail size={size} />;
    case "relatorios": return <Printer size={size} />;
    case "sorteio": return <Dices size={size} />;
    case "admin": return <Settings size={size} />;
    default: return <Settings size={size} />;
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    modulosPermitidos,
    coligadasPermitidas,
    coligadaAtual,
    loadingColigadas,
  } = useColigada();

  const { stats: kpis, loading: statsLoading } = useDashboardStats(
    coligadaAtual?.id ?? null
  );
  const { data: dadosSeries, loading: seriesLoading } = useSeriesData(
    coligadaAtual?.id ?? null
  );
  const { data: dadosSegmentos, loading: segmentosLoading } = useSegmentosData(
    coligadaAtual?.id ?? null
  );
  const { data: dadosEnfermaria, loading: enfermariaLoading } = useEnfermariaData(
    coligadaAtual?.id ?? null
  );

  const [mounted, setMounted] = useState(false);

  const CORES_SEGMENTOS = ["#3b82f6", "#f59e0b", "#10b981"]; // Azul (EFI), Laranja (EFII), Verde (EM)

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (loadingColigadas) {
    return (
      <div className="flex items-center justify-center h-full text-blue-600 dark:text-blue-400 font-bold italic">
        <Loader2 className="animate-spin mr-2" size={24} /> Carregando seu
        perfil...
      </div>
    );
  }

  if (!coligadasPermitidas || coligadasPermitidas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 p-10 text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Acesso Restrito
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
          Seu perfil ainda não possui permissões vinculadas a nenhuma unidade
          educacional.
        </p>
        <div className="mt-8 p-4 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-md text-sm text-blue-800 dark:text-blue-300 flex items-center gap-3">
          <ShieldAlert className="text-blue-500 dark:text-blue-400" size={20} />
          <span className="text-left">
            Entre em contato com o <b>CPD</b> para liberar seu acesso às sedes e
            módulos.
          </span>
        </div>
      </div>
    );
  }

  const modulosVisiveis = modulosConfig.filter((m) =>
    modulosPermitidos.includes(m.id_modulo),
  );

  const nomeUser = user?.user_metadata?.full_name?.split(" ")[0] || "Usuário";
  const fotoUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="p-6 sm:p-10 min-h-full bg-white dark:bg-slate-900 space-y-10 animate-in fade-in duration-500 overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt="Avatar"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white dark:border-slate-800 shadow-md object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-2xl border-4 border-white dark:border-slate-800 shadow-md">
              {nomeUser.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">
              Olá, {nomeUser} 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Status operacional da unidade{" "}
              <strong className="text-blue-600">{coligadaAtual?.nome}</strong>.
            </p>
          </div>
        </div>
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Total Alunos", val: kpis.alunos, c: "text-blue-600" },
          {
            label: "Atendimentos Mês",
            val: kpis.atendimentos,
            c: "text-emerald-600",
          },
          {
            label: "Equipamentos",
            val: kpis.equipamentos,
            c: "text-amber-600",
          },
          { label: "Locações", val: kpis.locacoes, c: "text-indigo-600" },
        ].map((k, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              {k.label}
            </p>
            <p className={`text-4xl font-black ${k.c} dark:text-white`}>
              {statsLoading ? <Skeleton width={60} /> : k.val}
            </p>
          </div>
        ))}
      </div>

      {/* MÓDULOS */}
      <div className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-x-4 gap-y-12">
          {modulosVisiveis.map((mod) => (
            <Link
              key={mod.id_modulo}
              href={mod.rota}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`${mod.cor} text-white w-20 h-20 flex items-center justify-center rounded-full shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200 border-[3px] border-white dark:border-slate-800`}
              >
                {getIcon(mod.id_modulo)}
              </div>
              <span className="mt-3 text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight max-w-[95px] h-8 flex items-start justify-center">
                {mod.nome}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-10 border-t border-slate-200 dark:border-slate-800">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-6">
            Distribuição por Séries
          </h3>
          <div className="h-72 w-full">
            {seriesLoading ? (
              <Skeleton height="100%" borderRadius="8px" />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosSeries}
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
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
            Alunos por Segmento
          </h3>
          <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
            {segmentosLoading ? (
              <Skeleton circle className="w-40 h-40" />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosSegmentos}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {dadosSegmentos.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CORES_SEGMENTOS[i % CORES_SEGMENTOS.length]}
                    />
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
            )}
          </div>
        </div>

        <div className="xl:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-6">
            Atendimentos da Enfermaria (Últimos 7 Dias)
          </h3>
          <div className="h-56 w-full">
            {enfermariaLoading ? (
               <Skeleton height="100%" borderRadius="8px" />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dadosEnfermaria}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
