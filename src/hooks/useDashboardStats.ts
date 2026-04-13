import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface Stats {
  alunos: number;
  atendimentos: number;
  equipamentos: number;
  locacoes: number;
}

const fetchStats = async (coligadaId: number): Promise<Stats> => {
  const [resAlunos, resEquip, resLocacoes, resRepouso] = await Promise.all([
    supabase.from("alunos").select("id", { count: "exact", head: true }).eq("sede_id", coligadaId),
    supabase.from("equipamentos").select("id", { count: "exact", head: true }).eq("sede_id", coligadaId),
    supabase.from("locacoes").select("id", { count: "exact", head: true }).eq("sede_id", coligadaId),
    supabase.from("encaminhamentos_repouso").select("id", { count: "exact", head: true }).eq("sede_id", coligadaId),
  ]);

  if (resAlunos.error) throw resAlunos.error;

  return {
    alunos: resAlunos.count || 0,
    equipamentos: resEquip.count || 0,
    locacoes: resLocacoes.count || 0,
    atendimentos: resRepouso.count || 0,
  };
};

export function useDashboardStats(coligadaId: number | null) {
  const { loadingColigadas } = useColigada();

  const { data, error, isLoading } = useSWR<Stats>(
    coligadaId ? `dashboard-stats-${coligadaId}` : null,
    () => fetchStats(coligadaId as number),
    { revalidateOnFocus: false }
  );

  return {
    stats: data || { alunos: 0, atendimentos: 0, equipamentos: 0, locacoes: 0 },
    loading: isLoading || loadingColigadas,
    error
  };
}