import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useColigada } from '@/context/ColigadaContext';

interface SegmentoData {
  name: string;
  value: number;
}

export function useSegmentosData(coligadaId: number | null) {
  const [data, setData] = useState<SegmentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadingColigadas } = useColigada();

  useEffect(() => {
    if (!coligadaId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadSegmentosData = async () => {
      try {
        const { data: alunos } = await supabase
          .from("alunos")
          .select("serie, turma, Curso")
          .eq("sede_id", coligadaId);

        if (alunos && alunos.length > 0) {
          let f1 = 0,
            f2 = 0,
            em = 0;

          alunos.forEach((a) => {
            const cursoStr = String(a.Curso || "")
              .trim()
              .toUpperCase();

            if (cursoStr === "EM") {
              em++;
            } else if (cursoStr === "EFI") {
              f1++;
            } else if (cursoStr === "EFII") {
              f2++;
            }
          });

          const segmentosExistentes = [
            { name: "Ensino Fundamental I", value: f1 },
            { name: "Ensino Fundamental II", value: f2 },
            { name: "Ensino Médio", value: em },
          ].filter((s) => s.value > 0);

          setData(segmentosExistentes);
        }
      } catch (e) {
        console.error("Erro ao carregar dados de segmentos:", e);
      } finally {
        setLoading(false);
      }
    };

    loadSegmentosData();
  }, [coligadaId]);

  return { data, loading };
}