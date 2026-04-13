import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface SegmentoData {
  name: string;
  value: number;
}

const fetchSegmentosData = async (coligadaId: number): Promise<SegmentoData[]> => {
  const { data: alunos, error } = await supabase
    .from("alunos")
    .select("Curso")
    .eq("sede_id", coligadaId);

  if (error) throw error;
  if (!alunos || alunos.length === 0) return [];

  let f1 = 0, f2 = 0, em = 0;

  alunos.forEach((a) => {
    const cursoStr = String(a.Curso || "").trim().toUpperCase();
    if (cursoStr === "EM") em++;
    else if (cursoStr === "EFI") f1++;
    else if (cursoStr === "EFII") f2++;
  });

  return [
    { name: "Ensino Fundamental I", value: f1 },
    { name: "Ensino Fundamental II", value: f2 },
    { name: "Ensino Médio", value: em },
  ].filter((s) => s.value > 0);
};

export function useSegmentosData(coligadaId: number | null) {
  const { loadingColigadas } = useColigada();

  const { data, error, isLoading } = useSWR<SegmentoData[]>(
    coligadaId ? `segmentos-data-${coligadaId}` : null,
    () => fetchSegmentosData(coligadaId as number),
    { revalidateOnFocus: false }
  );

  return {
    data: data || [],
    loading: isLoading || loadingColigadas,
    error
  };
}