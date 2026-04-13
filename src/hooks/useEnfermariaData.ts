import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface EnfermariaData {
  dia: string;
  total: number;
}

export function useEnfermariaData(coligadaId: number | null) {
  const [data, setData] = useState<EnfermariaData[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadingColigadas } = useColigada();

  useEffect(() => {
    if (!coligadaId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadEnfermariaData = async () => {
      try {
        const seteDias = new Date();
        seteDias.setDate(seteDias.getDate() - 6);
        const { data: atendimentos } = await supabase
          .from("encaminhamentos_repouso")
          .select("created_at")
          .eq("sede_id", coligadaId)
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
          setData(dashAtendimentos);
        }
      } catch (e) {
        console.error("Erro ao carregar dados da enfermaria:", e);
      } finally {
        setLoading(false);
      }
    };

    loadEnfermariaData();
  }, [coligadaId]);

  return { data, loading };
}