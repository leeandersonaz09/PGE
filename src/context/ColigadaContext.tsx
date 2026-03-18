"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

export type Coligada = {
  id: number;
  nome: string;
  sigla: string;
  cor_hex?: string;
  logo_url?: string;
};

type ColigadaContextType = {
  coligadaAtual: Coligada | null;
  coligadasPermitidas: Coligada[];
  modulosPermitidos: string[];
  trocarColigada: (coligadaId: number) => void;
  loadingColigadas: boolean;
};

const ColigadaContext = createContext<ColigadaContextType | undefined>(
  undefined,
);

export function ColigadaProvider({ children }: { children: ReactNode }) {
  const [coligadaAtual, setColigadaAtual] = useState<Coligada | null>(null);
  const [coligadasPermitidas, setColigadasPermitidas] = useState<Coligada[]>(
    [],
  );
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([]);
  const [loadingColigadas, setLoadingColigadas] = useState(true);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setLoadingColigadas(true);

      // 1. Obtém o usuário logado
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.warn("ColigadaContext: Usuário não autenticado.");
        setLoadingColigadas(false);
        return;
      }

      // 2. Busca as permissões do usuário
      const { data: permissoes, error: errPerm } = await supabase
        .from("permissoes_usuarios")
        .select("sedes_permitidas, modulos_permitidos")
        .eq("user_id", user.id)
        .maybeSingle();

      if (errPerm) {
        console.error("Erro técnico RLS/Postgres:", errPerm.message);
        setLoadingColigadas(false);
        return;
      }

      if (!permissoes) {
        console.warn(
          "Aviso: Nenhuma linha de permissão encontrada para o ID:",
          user.id,
        );
        setLoadingColigadas(false);
        return;
      }

      // Definimos os módulos permitidos (já vem como array text[] do banco)
      setModulosPermitidos(permissoes.modulos_permitidos || []);

      const idsSedes = permissoes.sedes_permitidas || [];

      // 3. Busca os detalhes das sedes se houver IDs permitidos
      if (idsSedes.length > 0) {
        const { data: coligadasData, error: errSedes } = await supabase
          .from("sedes")
          .select("*")
          .in("id", idsSedes)
          .order("id");

        if (!errSedes && coligadasData && coligadasData.length > 0) {
          setColigadasPermitidas(coligadasData);

          // Recupera a sede salva ou define a primeira como padrão
          const coligadaSalva = localStorage.getItem("@pge_coligada_atual");
          const encontrada = coligadasData.find(
            (c) => c.id === Number(coligadaSalva),
          );

          const sedeDefinida = encontrada || coligadasData[0];
          setColigadaAtual(sedeDefinida);
          localStorage.setItem(
            "@pge_coligada_atual",
            sedeDefinida.id.toString(),
          );
        }
      }
    } catch (error) {
      console.error("Erro inesperado no ColigadaProvider:", error);
    } finally {
      setLoadingColigadas(false);
    }
  };

  const trocarColigada = (coligadaId: number) => {
    const novaColigada = coligadasPermitidas.find((c) => c.id === coligadaId);
    if (novaColigada) {
      setColigadaAtual(novaColigada);
      localStorage.setItem("@pge_coligada_atual", novaColigada.id.toString());
      // Recarregamos a página para garantir que todos os filtros do Supabase sejam reiniciados
      window.location.reload();
    }
  };

  return (
    <ColigadaContext.Provider
      value={{
        coligadaAtual,
        coligadasPermitidas,
        modulosPermitidos,
        trocarColigada,
        loadingColigadas,
      }}
    >
      {children}
    </ColigadaContext.Provider>
  );
}

export function useColigada() {
  const context = useContext(ColigadaContext);
  if (context === undefined) {
    throw new Error("useColigada deve ser usado dentro de um ColigadaProvider");
  }
  return context;
}
