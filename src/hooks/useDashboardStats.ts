import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface Stats {
  alunos: number;
  atendimentos: number;
  equipamentos: number;
  locacoes: number;
}

export function useDashboardStats(coligadaId: number | null) {
  const [stats, setStats] = useState<Stats>({
    alunos: 0,
    atendimentos: 0,
    equipamentos: 0,
    locacoes: 0,
  });
  const [loading, setLoading] = useState(true);
  const { loadingColigadas } = useColigada();

  useEffect(() => {
    if (!coligadaId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadStats = async () => {
      try {
        const [resAlunos, resEquip, resLocacoes, resRepouso] =
          await Promise.all([
            supabase
              .from("alunos")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaId),
            supabase
              .from("equipamentos")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaId),
            supabase
              .from("locacoes")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaId),
            supabase
              .from("encaminhamentos_repouso")
              .select("id", { count: "exact", head: true })
              .eq("sede_id", coligadaId),
          ]);

        setStats({
          alunos: resAlunos.count || 0,
          equipamentos: resEquip.count || 0,
          locacoes: resLocacoes.count || 0,
          atendimentos: resRepouso.count || 0,
        });
      } catch (e) {
        console.error("Erro ao carregar estatísticas do dashboard:", e);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [coligadaId]);

  return { stats, loading };
}