import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface SerieData {
  serie: string;
  qtd: number;
}

export function useSeriesData(coligadaId: number | null) {
  const [data, setData] = useState<SerieData[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadingColigadas } = useColigada();

  useEffect(() => {
    if (!coligadaId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadSeriesData = async () => {
      try {
        const { data: alunos } = await supabase
          .from("alunos")
          .select("serie, turma, Curso")
          .eq("sede_id", coligadaId);

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

          setData(formatado);
        }
      } catch (e) {
        console.error("Erro ao carregar dados de séries:", e);
      } finally {
        setLoading(false);
      }
    };

    loadSeriesData();
  }, [coligadaId]);

  return { data, loading };
}