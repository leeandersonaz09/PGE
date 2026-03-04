"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import {
  Search,
  Printer,
  ArrowLeft,
  Loader2,
  PlusCircle,
  Trash2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";

// Inicia com apenas UMA linha, como solicitado
const registrosBase = [
  {
    serie: "1º Ano EF",
    ano: "2024",
    escola: "COLÉGIO SÃO PAULO",
    cidade: "SALVADOR/BA",
  },
];

const obsPadrao = `A partir do ano letivo de 1987 a média mínima para aprovação passou a ser 6.0 (seis) da 1ª à 4ª série do ensino fundamental e, a partir de 1998 até a 8ª série, conforme alterações do regimento deste colégio.

A média mínima para aprovação da 1ª à 3ª série do ensino médio é 5.0 (cinco).

Arte, Música, Educação Física e Informática são conteúdos cuja avaliação não tem finalidade de verificação de aprendizagem, para fins de promoção da 1ª à 4ª série do ensino fundamental.

Conforme nova alteração no regimento deste Colégio a partir do ano de 2008 a nota mínima para aprovação passou a ser 6.0 (seis) da 1ª série do ensino fundamental à 3ª série do ensino médio.

A partir do ano letivo de 2010, em cumprimento a Lei 11.274/2006, foi implantado no Colégio São Paulo o ensino fundamental de 9(nove) anos, alterando a nomenclatura do ensino fundamental, anteriormente de 1ª à 8ª série, para do 1° ao 9° ano.

A partir do ano letivo de 2015, a disciplina Arte passou a ter finalidade de verificação de aprendizagem, para fins de promoção do 1º ao 5º Ano do Ensino Fundamental.

Inglês do 1º ao 5º ano do Ensino Fundamental não tem finalidade de verificação de aprendizagem, para fins de promoção.

Do Centro Educacional Vitória - Régia:

* A disciplina Ética/Empreendedorismo não é avaliada para efeito de promoção.
* Educação Religiosa, estão inseridas nas disciplinas Filosofia, Artes e História.
* Os conteúdos referentes à História e Cultura Afro-Brasileira estão sendo ministrados no âmbito de todo o currículo escolar, em especial nas áreas de Arte, História, Geografia e Língua Portuguesa cumprindo o que determina a lei 10.639/2003.
* A disciplina Redação é trabalhada junto à Língua Portuguesa porém com um professor específico.
* Os conteúdos referentes a Educação Financeira e Educação Alimentar estão inseridas nas disciplinas de Matemática e Ciências, com o material didático próprio.`;

export default function HistoricoVersoPage() {
  const { user } = useAuth();
  const { coligadaAtual } = useColigada();
  const relatorioRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);

  // Estados dos Campos Editáveis
  const [registros, setRegistros] = useState<any[]>([]);
  const [textoDispensado, setTextoDispensado] = useState(
    "Dispensados os carimbos da Secretaria de Educação do Estado da Bahia em documentos escolares, conforme a Lei 9394, de 20/12/1996, Art. 24, Inciso VII e a Resolução Nº 127/97, do Conselho Estadual de Educação do Estado da Bahia, Art. 18, Parágrafo Único.",
  );
  const [observacoes, setObservacoes] = useState(obsPadrao);
  const [codigoSeguranca, setCodigoSeguranca] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [assinatura, setAssinatura] = useState({
    nome: "Maria do Socorro Mota",
    cargo: "Diretora",
    sec: "Aut. SEC 1A118/14",
  });

  useEffect(() => {
    setMounted(true);
    setDataEmissao(
      `Salvador, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.`,
    );
  }, []);

  // Truque para o textarea de observações crescer automaticamente na tela
  const adjustTextareaHeight = (element: any) => {
    if (element) {
      element.style.height = "auto";
      element.style.height = element.scrollHeight + "px";
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: `Verso_${alunoSelecionado?.nome || "Historico"}`,
  });

  const buscarAlunos = async (termo: string) => {
    if (termo.length < 3) return;
    setLoadingBusca(true);
    try {
      let query = supabase
        .from("alunos")
        .select("id, nome, sede_id")
        .ilike("nome", `%${termo}%`);
      if (coligadaAtual) query = query.eq("sede_id", coligadaAtual.id);
      const { data } = await query.limit(8);
      setAlunos(data || []);
    } finally {
      setLoadingBusca(false);
    }
  };

  const selecionarAluno = async (aluno: any) => {
    setAlunoSelecionado(aluno);
    setBusca(aluno.nome);
    setAlunos([]);
    const { data: salvo } = await supabase
      .from("relatorio_historico_verso")
      .select("*")
      .eq("aluno_id", aluno.id)
      .maybeSingle();
    if (salvo) {
      setRegistros(salvo.registros);
      setTextoDispensado(salvo.texto_dispensado);
      setObservacoes(salvo.observacoes);
      setCodigoSeguranca(salvo.codigo_seguranca);
      setDataEmissao(salvo.data_emissao);
      setAssinatura({
        nome: salvo.assinatura_nome,
        cargo: salvo.assinatura_cargo,
        sec: salvo.assinatura_sec,
      });
      Swal.fire({
        title: "Carregado!",
        icon: "success",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      setRegistros(registrosBase);
      setObservacoes(obsPadrao);
      setCodigoSeguranca("");
    }
  };

  const salvarNoBanco = async () => {
    if (!alunoSelecionado)
      return Swal.fire("Atenção", "Selecione um aluno!", "warning");
    setSalvando(true);
    try {
      const { error } = await supabase.from("relatorio_historico_verso").upsert(
        {
          aluno_id: alunoSelecionado.id,
          registros,
          texto_dispensado: textoDispensado,
          observacoes,
          codigo_seguranca: codigoSeguranca,
          data_emissao: dataEmissao,
          assinatura_nome: assinatura.nome,
          assinatura_cargo: assinatura.cargo,
          assinatura_sec: assinatura.sec,
          sede_id: coligadaAtual?.id,
          salvo_por: user?.id,
          updated_at: new Date(),
        },
        { onConflict: "aluno_id" },
      );
      if (error) throw error;
      Swal.fire("Salvo!", "Dados salvos com sucesso.", "success");
    } catch (err: any) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setSalvando(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-slate-200 min-h-screen flex flex-col overflow-auto no-scrollbar">
      {/* ===== REGRAS DE IMPRESSÃO (FIDELIDADE AO HTML ORIGINAL) ===== */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4; margin: 15mm !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
          /* Esconde textareas e exibe divs formatadas para não gerar scrollbar na impressão */
          textarea.print-hide { display: none !important; }
          div.print-show { display: block !important; white-space: pre-wrap; text-align: justify; }
        }
        /* Comportamento na tela de edição */
        div.print-show { display: none; }
        textarea.print-hide { display: block; }
        input { background: transparent; border: none; outline: none; }
      `,
        }}
      />

      {/* TOOLBAR PADRÃO CPD */}
      <div className="no-print bg-white p-4 sticky top-0 z-50 border-b border-slate-300 shadow-md flex flex-wrap justify-between items-center gap-4 font-sans">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/dashboard/relatorios"
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </Link>
          <div className="relative w-full max-w-sm">
            <div className="flex items-center border border-slate-400 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                placeholder="BUSCAR ALUNO..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  buscarAlunos(e.target.value);
                }}
                className="w-full p-2 text-xs font-bold text-slate-900"
              />
              {loadingBusca && (
                <Loader2 size={16} className="animate-spin text-blue-500" />
              )}
            </div>
            {alunos.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border border-slate-300 shadow-2xl rounded-lg mt-1 z-50 overflow-hidden">
                {alunos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => selecionarAluno(a)}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b text-[11px] font-bold text-slate-800 uppercase"
                  >
                    RA: {a.id} - {a.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setRegistros([
                ...registros,
                { serie: "", ano: "", escola: "", cidade: "" },
              ])
            }
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-400 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <PlusCircle size={14} className="text-blue-600" /> + LINHA
          </button>
          <button
            onClick={salvarNoBanco}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 border border-green-700 text-white rounded text-xs font-bold hover:bg-green-700 shadow-md"
          >
            {salvando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}{" "}
            SALVAR
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-700 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-md"
          >
            <Printer size={16} /> IMPRIMIR
          </button>
        </div>
      </div>

      {/* ===== ÁREA DE IMPRESSÃO (FIDELIDADE AO HTML) ===== */}
      <div className="flex justify-center p-8 print:p-0">
        <div
          ref={relatorioRef}
          className="print-container bg-white w-[210mm] min-h-[267mm] p-15 text-black shadow-2xl print:shadow-none"
          style={{ boxSizing: "border-box", color: "black" }}
        >
          {/* CABEÇALHO TÍTULO */}
          <div
            className="bg-[#DCDCDC] border border-black text-center font-bold text-[18px] py-[6px] tracking-[1px]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            R E G I S T R O S &nbsp; C O M P L E M E N T A R E S
          </div>

          {/* TABELA - Sem linhas excedentes, fonte e tamanhos do HTML original */}
          <table
            className="w-full border-collapse text-[11px] mb-0"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            <thead>
              <tr className="bg-[#DCDCDC]">
                <th className="border border-black py-[5px] w-[18%] font-bold">
                  SÉRIE
                </th>
                <th className="border border-black py-[5px] w-[12%] font-bold">
                  ANO
                </th>
                <th className="border border-black py-[5px] w-[45%] font-bold">
                  ESTABELECIMENTO
                </th>
                <th className="border border-black py-[5px] w-[25%] font-bold">
                  CIDADE/ESTADO
                </th>
              </tr>
            </thead>
            <tbody>
              {registros.map((reg, idx) => (
                <tr key={idx} className="group">
                  <td className="border border-black p-[4px] text-center relative">
                    <input
                      value={reg.serie}
                      onChange={(e) => {
                        const n = [...registros];
                        n[idx].serie = e.target.value;
                        setRegistros(n);
                      }}
                      className="w-full text-center text-black"
                    />
                    {/* Botão de excluir Lixeira restaurado */}
                    <button
                      onClick={() =>
                        setRegistros(registros.filter((_, i) => i !== idx))
                      }
                      className="no-print absolute -left-6 top-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded p-1 shadow"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                  <td className="border border-black p-[4px] text-center">
                    <input
                      value={reg.ano}
                      onChange={(e) => {
                        const n = [...registros];
                        n[idx].ano = e.target.value;
                        setRegistros(n);
                      }}
                      className="w-full text-center text-black"
                    />
                  </td>
                  <td className="border border-black p-[4px] text-center">
                    <input
                      value={reg.escola}
                      onChange={(e) => {
                        const n = [...registros];
                        n[idx].escola = e.target.value;
                        setRegistros(n);
                      }}
                      className="w-full text-center uppercase text-black"
                    />
                  </td>
                  <td className="border border-black p-[4px] text-center">
                    <input
                      value={reg.cidade}
                      onChange={(e) => {
                        const n = [...registros];
                        n[idx].cidade = e.target.value;
                        setRegistros(n);
                      }}
                      className="w-full text-center uppercase text-black"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TEXTO DE DISPENSA (Borda integrada à tabela de cima) */}
          <div
            className="border border-black border-t-0 p-[8px] text-[9px] text-center"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            <textarea
              value={textoDispensado}
              onChange={(e) => setTextoDispensado(e.target.value)}
              className="print-hide w-full text-center resize-none text-black h-10 overflow-hidden"
            />
            <div className="print-show">{textoDispensado}</div>
          </div>

          {/* TÍTULO OBSERVAÇÕES (Margin top conforme HTML) */}
          <div
            className="bg-[#DCDCDC] border border-black text-center font-bold text-[19px] py-[6px] tracking-[6px] mt-[8px]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            O B S E R V A Ç Õ E S
          </div>

          {/* CÓDIGO DE SEGURANÇA (Times New Roman 13px, conectando bordas) */}
          <div
            className="border-x border-black p-[6px] text-[13px]"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <span className="font-bold">Código de Segurança :</span>
            <input
              value={codigoSeguranca}
              onChange={(e) => setCodigoSeguranca(e.target.value)}
              className="w-1/3 border-b border-dotted border-black ml-1 text-black"
            />
          </div>

          {/* CAIXA DE OBSERVAÇÕES TEXTO (Verdana 9px justificado, border fechando a caixa) */}
          <div
            className="border border-black p-[12px] text-[9px] leading-[1.3]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            <textarea
              value={observacoes}
              onChange={(e) => {
                setObservacoes(e.target.value);
                adjustTextareaHeight(e.target);
              }}
              ref={(ref) => adjustTextareaHeight(ref)}
              className="print-hide w-full bg-transparent resize-none text-black overflow-hidden"
              style={{ textAlign: "justify", minHeight: "300px" }}
            />
            <div
              className="print-show text-black"
              dangerouslySetInnerHTML={{
                __html: observacoes.replace(/\n/g, "<br/>"),
              }}
            ></div>
          </div>

          {/* RODAPÉ E ASSINATURA (Margin e fontes exatas) */}
          <div
            className="mt-[12px] text-[11px]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            <input
              value={dataEmissao}
              onChange={(e) => setDataEmissao(e.target.value)}
              className="w-full text-black"
            />
          </div>

          <div
            className="mt-[50px] flex flex-col items-center text-center text-[11px]"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            <div className="text-black mb-[2px]">
              _____________________________________
            </div>
            <input
              value={assinatura.nome}
              onChange={(e) =>
                setAssinatura({ ...assinatura, nome: e.target.value })
              }
              className="w-full text-center font-bold text-black"
            />
            <input
              value={assinatura.cargo}
              onChange={(e) =>
                setAssinatura({ ...assinatura, cargo: e.target.value })
              }
              className="w-full text-center text-black"
            />
            <input
              value={assinatura.sec}
              onChange={(e) =>
                setAssinatura({ ...assinatura, sec: e.target.value })
              }
              className="w-full text-center text-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
