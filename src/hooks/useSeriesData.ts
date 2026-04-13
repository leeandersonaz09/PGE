import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface SerieData {
  serie: string;
  qtd: number;
}

const fetchSeriesData = async (coligadaId: number): Promise<SerieData[]> => {
  const { data: alunos, error } = await supabase
    .from("alunos")
    .select("serie, turma, Curso")
    .eq("sede_id", coligadaId);

  if (error) throw error;
  if (!alunos || alunos.length === 0) return [];

  const contagemSeries: Record<string, number> = {};

  alunos.forEach((a) => {
    const cursoStr = String(a.Curso || "").trim().toUpperCase();
    const numSerie = parseInt(String(a.serie).replace(/\D/g, "")) || 0;
    let label = "";

    if (cursoStr === "EM") {
      label = numSerie ? `${numSerie}ª Série` : "Ensino Médio";
    } else if (cursoStr === "EFI" || cursoStr === "EFII") {
      label = `${numSerie}º Ano`;
    }

    if (label) {
      contagemSeries[label] = (contagemSeries[label] || 0) + 1;
    }
  });

  const ordemPrioridade = [
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano",
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1ª Série", "2ª Série", "3ª Série", "Ensino Médio",
  ];

  return Object.keys(contagemSeries)
    .map((k) => ({ serie: k, qtd: contagemSeries[k] }))
    .sort((a, b) => ordemPrioridade.indexOf(a.serie) - ordemPrioridade.indexOf(b.serie));
};

export function useSeriesData(coligadaId: number | null) {
  const { loadingColigadas } = useColigada();

  const { data, error, isLoading } = useSWR<SerieData[]>(
    coligadaId ? `series-data-${coligadaId}` : null,
    () => fetchSeriesData(coligadaId as number),
    { revalidateOnFocus: false }
  );

  return {
    data: data || [],
    loading: isLoading || loadingColigadas,
    error
  };
}