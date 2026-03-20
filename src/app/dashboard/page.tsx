"use client";

import { useColigada } from "@/context/ColigadaContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  GraduationCap,
  Stethoscope,
  ClipboardList,
  BarChart,
  FileText,
  Loader2,
  ShieldCheck,
  Lock,
  ShieldAlert,
  Laptop,
  Archive,
  MailCheckIcon,
  TrendingUp,
  LayoutGrid,
  Trophy, // ✅ Adicionado ícone para o Sorteio
} from "lucide-react";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

// CONFIGURAÇÃO DOS MÓDULOS
const modulosConfig = [
  {
    id_modulo: "alunos",
    nome: "Alunos",
    icon: <GraduationCap size={32} />,
    rota: "/dashboard/alunos",
    cor: "bg-[#ffb74d]",
  },
  {
    id_modulo: "repouso",
    nome: "Sala de Repouso",
    icon: <Stethoscope size={32} />,
    rota: "/dashboard/repouso",
    cor: "bg-[#4db6ac]",
  },
  {
    id_modulo: "ocorrencias", // ✅ MÓDULO DE OCORRÊNCIAS ADICIONADO AQUI
    nome: "Ocorrências",
    icon: <FileText size={32} />,
    rota: "/dashboard/ocorrencias",
    cor: "bg-[#f43f5e]", // Cor rosa/vermelha para combinar com a sua aba
  },
  {
    id_modulo: "historico",
    nome: "Histórico Atendimentos",
    icon: <ClipboardList size={32} />,
    rota: "/dashboard/historico-atendimentos",
    cor: "bg-[#8b5cf6]",
  },
  {
    id_modulo: "conselho",
    nome: "Conselho de Classe",
    icon: <BarChart size={32} />,
    rota: "/dashboard/conselho",
    cor: "bg-[#0d9488]",
  },
  {
    id_modulo: "locacoes",
    nome: "Locação Multimídia",
    icon: <Laptop size={32} />,
    rota: "/dashboard/locacoes",
    cor: "bg-indigo-600",
  },
  {
    id_modulo: "historico_locacoes",
    nome: "Histórico Locações",
    icon: <Archive size={32} />,
    rota: "/dashboard/historico-locacoes",
    cor: "bg-gray-600",
  },
  {
    id_modulo: "mala_direta",
    nome: "Mala Direta & IA",
    icon: <MailCheckIcon size={32} />,
    rota: "/dashboard/mala-direta",
    cor: "bg-blue-600",
  },
  {
    id_modulo: "relatorios",
    nome: "Central Relatórios",
    icon: <FileText size={32} />,
    rota: "/dashboard/relatorios",
    cor: "bg-blue-600",
  },
  {
    id_modulo: "sorteio", // ✅ NOVO MÓDULO
    nome: "Sorteio Pro",
    icon: <Trophy size={32} />,
    rota: "/dashboard/sorteio",
    cor: "bg-orange-500",
  },
  {
    id_modulo: "admin",
    nome: "Administração",
    icon: <ShieldCheck size={32} />,
    rota: "/dashboard/admin",
    cor: "bg-gray-700",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    modulosPermitidos,
    coligadasPermitidas,
    coligadaAtual,
    loadingColigadas,
  } = useColigada();

  const [mounted, setMounted] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  const [kpis, setKpis] = useState({
    alunos: 0,
    atendimentos: 0,
    equipamentos: 0,
    locacoes: 0,
  });
  const [dadosSeries, setDadosSeries] = useState<any[]>([]);
  const [dadosSegmentos, setDadosSegmentos] = useState<any[]>([]);
  const [dadosEnfermaria, setDadosEnfermaria] = useState<any[]>([]);

  const CORES_SEGMENTOS = ["#3b82f6", "#f59e0b", "#10b981"]; // Azul (EFI), Laranja (EFII), Verde (EM)

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function carregarInteligencia() {
      if (!coligadaAtual || !mounted) return;

      setLoadingDados(true);
      setDadosSeries([]);
      setDadosSegmentos([]);
      setDadosEnfermaria([]);

      try {
        const [resAlunos, resEquip, resLocacoes, resRepouso] =
          await Promise.all([
            supabase
              .from("alunos")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaAtual.id),
            supabase
              .from("equipamentos")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaAtual.id),
            supabase
              .from("locacoes")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaAtual.id),
            supabase
              .from("encaminhamentos_repouso")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaAtual.id),
          ]);

        setKpis({
          alunos: resAlunos.count || 0,
          equipamentos: resEquip.count || 0,
          locacoes: resLocacoes.count || 0,
          atendimentos: resRepouso.count || 0,
        });

        const { data: alunos } = await supabase
          .from("alunos")
          .select("serie, turma, Curso")
          .eq("sede_id", coligadaAtual.id);

        if (alunos && alunos.length > 0) {
          const contagemSeries: Record<string, number> = {};
          let f1 = 0,
            f2 = 0,
            em = 0;

          alunos.forEach((a) => {
            const cursoStr = String(a.Curso || "")
              .trim()
              .toUpperCase();
            const numSerie = parseInt(String(a.serie).replace(/\D/g, "")) || 0;
            let label = "";

            if (cursoStr === "EM") {
              em++;
              label = numSerie ? `${numSerie}ª Série` : "Ensino Médio";
            } else if (cursoStr === "EFI") {
              f1++;
              label = `${numSerie}º Ano`;
            } else if (cursoStr === "EFII") {
              f2++;
              label = `${numSerie}º Ano`;
            }

            if (label) {
              contagemSeries[label] = (contagemSeries[label] || 0) + 1;
            }
          });

          const ordemPrioridade = [
            "1º Ano",
            "2º Ano",
            "3º Ano",
            "4º Ano",
            "5º Ano",
            "6º Ano",
            "7º Ano",
            "8º Ano",
            "9º Ano",
            "1ª Série",
            "2ª Série",
            "3ª Série",
            "Ensino Médio",
          ];

          const formatado = Object.keys(contagemSeries)
            .map((k) => ({ serie: k, qtd: contagemSeries[k] }))
            .sort(
              (a, b) =>
                ordemPrioridade.indexOf(a.serie) -
                ordemPrioridade.indexOf(b.serie),
            );

          setDadosSeries(formatado);

          const segmentosExistentes = [
            { name: "Ensino Fundamental I", value: f1 },
            { name: "Ensino Fundamental II", value: f2 },
            { name: "Ensino Médio", value: em },
          ].filter((s) => s.value > 0);

          setDadosSegmentos(segmentosExistentes);
        }

        const seteDias = new Date();
        seteDias.setDate(seteDias.getDate() - 6);
        const { data: atendimentos } = await supabase
          .from("encaminhamentos_repouso")
          .select("created_at")
          .eq("sede_id", coligadaAtual.id)
          .gte("created_at", seteDias.toISOString());

        if (atendimentos) {
          const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          const contagemDias = Array(7).fill(0);
          atendimentos.forEach(
            (at) => contagemDias[new Date(at.created_at).getDay()]++,
          );

          const dashAtendimentos = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dashAtendimentos.push({
              dia: diasSemana[d.getDay()],
              total: contagemDias[d.getDay()],
            });
          }
          setDadosEnfermaria(dashAtendimentos);
        }
      } catch (e) {
        console.error("Erro na atualização do contexto:", e);
      } finally {
        setLoadingDados(false);
      }
    }

    carregarInteligencia();
  }, [coligadaAtual, mounted]);

  if (!mounted) return null;

  if (loadingColigadas || (loadingDados && !coligadaAtual)) {
    return (
      <div className="flex items-center justify-center h-full text-blue-600 dark:text-blue-400 font-bold italic">
        <Loader2 className="animate-spin mr-2" size={24} /> Sincronizando Dados
        Reais...
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
              {k.val}
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
                {mod.icon}
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
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart
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
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
            Alunos por Segmento
          </h3>
          <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
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
          </div>
        </div>

        <div className="xl:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-6">
            Atendimentos da Enfermaria (Últimos 7 Dias)
          </h3>
          <div className="h-56 w-full">
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
          </div>
        </div>
      </div>
    </div>
  );
}
