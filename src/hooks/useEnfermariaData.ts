import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface EnfermariaData {
  dia: string;
  total: number;
}

const fetchEnfermariaData = async (coligadaId: number): Promise<EnfermariaData[]> => {
  const seteDias = new Date();
  seteDias.setDate(seteDias.getDate() - 6);
  
  const { data: atendimentos, error } = await supabase
    .from("encaminhamentos_repouso")
    .select("created_at")
    .eq("sede_id", coligadaId)
    .gte("created_at", seteDias.toISOString());

  if (error) throw error;
  if (!atendimentos) return [];

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const contagemDias = Array(7).fill(0);
  
  atendimentos.forEach((at) => contagemDias[new Date(at.created_at).getDay()]++);

  const dashAtendimentos = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dashAtendimentos.push({
      dia: diasSemana[d.getDay()],
      total: contagemDias[d.getDay()],
    });
  }
  return dashAtendimentos;
};

export function useEnfermariaData(coligadaId: number | null) {
  const { loadingColigadas } = useColigada();

  const { data, error, isLoading } = useSWR<EnfermariaData[]>(
    coligadaId ? `enfermaria-data-${coligadaId}` : null,
    () => fetchEnfermariaData(coligadaId as number),
    { revalidateOnFocus: false }
  );

  return {
    data: data || [],
    loading: isLoading || loadingColigadas,
    error
  };
}