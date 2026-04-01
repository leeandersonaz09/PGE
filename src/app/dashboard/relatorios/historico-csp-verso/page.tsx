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
  MinusCircle,
  Trash2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useColigada } from "@/context/ColigadaContext";

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

  // Estados dos Campos Editáveis Padrão
  const [registros, setRegistros] = useState<any[]>([]);
  const [textoDispensado, setTextoDispensado] = useState(
    "Dispensados os carimbos da Secretaria de Educação do Estado da Bahia em documentos escolares, conforme a Lei 9394, de 20/12/1996, Art. 24, Inciso VII e a Resolução Nº 127/97, do Conselho Estadual de Educação do Estado da Bahia, Art. 18, Parágrafo Único.",
  );
  const [observacoes, setObservacoes] = useState(obsPadrao);
  const [codigoSeguranca, setCodigoSeguranca] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");

  // Assinaturas Editáveis
  const [assinaturaEsq, setAssinaturaEsq] = useState({
    nome: "",
    cargo: "",
    sec: "",
  });
  const [assinaturaDir, setAssinaturaDir] = useState({
    nome: "",
    cargo: "",
    sec: "",
  });

  // Tabelas Opcionais
  const [mostrarCertificado, setMostrarCertificado] = useState(false);
  const [textoCertificado, setTextoCertificado] = useState(
    "Certificamos, para os devidos fins, que o(a) aluno(a) supra citado(a) concluiu o Ensino Médio neste Estabelecimento de Ensino.",
  );
  const [mostrarRodape, setMostrarRodape] = useState(false);
  const [textoRodape, setTextoRodape] = useState(
    "O Diretor do Colégio COLÉGIO SÃO PAULO - TEMPO DE CRIANÇA, de acordo com o inciso VII do artigo 24 da Lei Federal nº 9394/96, declara que GABRIEL SARAIVA VILLAS BOAS, concluiu o 5º Ano EF do Ano do Ensino Fundamental, no ano letivo de 2025, estando apto(a) ao prosseguimento dos estudos no 6º Ano do Ensino Fundamental.",
  );

  // Configura padrões ao iniciar e ao trocar de Sede (Coligada)
  useEffect(() => {
    setMounted(true);
    setDataEmissao(
      `Salvador, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.`,
    );

    if (!alunoSelecionado) {
      if (coligadaAtual?.id === 1245) {
        // Padrão TEMPO DE CRIANÇA
        setAssinaturaEsq({
          nome: "Larissa Machado Moreira de Souza",
          cargo: "Diretora",
          sec: "Ato Autorização NTE 26 285/2024",
        });
        setAssinaturaDir({
          nome: "Eliete Soares Bispo",
          cargo: "Secretária",
          sec: " Ato Autorização NTE 26 330/2024",
        });
      } else {
        // Padrão SÃO PAULO ITAIGARA (1219)
        setAssinaturaEsq({
          nome: "Maria do Socorro Mota",
          cargo: "Diretora",
          sec: "Aut. NTE 26 - 918/2025",
        });
        setAssinaturaDir({
          nome: "Josicleide Bião da Silva Brito",
          cargo: "Secretária",
          sec: "Aut. NTE 26 - 112/2022",
        });
      }
    }
  }, [coligadaAtual, alunoSelecionado]);

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
      setRegistros(
        salvo.registros?.length > 0 ? salvo.registros : registrosBase,
      );
      setTextoDispensado(salvo.texto_dispensado || "");
      setObservacoes(salvo.observacoes || "");
      setCodigoSeguranca(salvo.codigo_seguranca || "");
      setDataEmissao(salvo.data_emissao || "");

      // Puxando as novas colunas do banco de dados
      setMostrarCertificado(salvo.mostrar_certificado || false);
      setTextoCertificado(
        salvo.texto_certificado ||
          "Certificamos, para os devidos fins, que o(a) aluno(a) supra citado(a) concluiu o Ensino Médio neste Estabelecimento de Ensino.",
      );
      setMostrarRodape(salvo.mostrar_rodape || false);
      setTextoRodape(
        salvo.texto_rodape ||
          "Observações complementares do histórico escolar.",
      );

      setAssinaturaEsq({
        nome: salvo.assinatura_esq_nome || "",
        cargo: salvo.assinatura_esq_cargo || "",
        sec: salvo.assinatura_esq_sec || "",
      });
      setAssinaturaDir({
        nome: salvo.assinatura_dir_nome || "",
        cargo: salvo.assinatura_dir_cargo || "",
        sec: salvo.assinatura_dir_sec || "",
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
      // Se não tem registro, carrega o layout limpo e recarrega os padrões
      setRegistros(registrosBase);
      setObservacoes(obsPadrao);
      setCodigoSeguranca("");
      setMostrarCertificado(false);
      setMostrarRodape(false);
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
          registros: registros,
          texto_dispensado: textoDispensado,
          observacoes,
          codigo_seguranca: codigoSeguranca,
          data_emissao: dataEmissao,

          // Salvando nas NOVAS colunas
          assinatura_esq_nome: assinaturaEsq.nome,
          assinatura_esq_cargo: assinaturaEsq.cargo,
          assinatura_esq_sec: assinaturaEsq.sec,
          assinatura_dir_nome: assinaturaDir.nome,
          assinatura_dir_cargo: assinaturaDir.cargo,
          assinatura_dir_sec: assinaturaDir.sec,

          mostrar_certificado: mostrarCertificado,
          texto_certificado: textoCertificado,
          mostrar_rodape: mostrarRodape,
          texto_rodape: textoRodape,

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
    <div className="bg-slate-200 dark:bg-slate-900 min-h-screen flex flex-col overflow-auto no-scrollbar">
      {/* ===== REGRAS DE IMPRESSÃO (FIDELIDADE AO HTML ORIGINAL) ===== */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4; margin: 15mm !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
          textarea.print-hide { display: none !important; }
          div.print-show { display: block !important; white-space: pre-wrap; text-align: justify; }
        }
        div.print-show { display: none; }
        textarea.print-hide { display: block; }
        input { background: transparent; border: none; outline: none; }
      `,
        }}
      />

      {/* TOOLBAR PADRÃO CPD */}
      <div className="no-print bg-white dark:bg-slate-800 p-4 sticky top-0 z-50 border-b border-slate-300 dark:border-slate-700 shadow-md flex flex-wrap justify-between items-center gap-4 font-sans">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/dashboard/relatorios"
            className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <ArrowLeft
              size={20}
              className="text-slate-700 dark:text-slate-300"
            />
          </Link>
          <div className="relative w-full max-w-sm">
            <div className="flex items-center border border-slate-400 dark:border-slate-600 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                placeholder="BUSCAR ALUNO..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  buscarAlunos(e.target.value);
                }}
                className="w-full p-2 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-200"
              />
              {loadingBusca && (
                <Loader2 size={16} className="animate-spin text-blue-500" />
              )}
            </div>
            {alunos.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xl rounded-lg mt-1 z-50 overflow-hidden">
                {alunos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => selecionarAluno(a)}
                    className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-700 border-b dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase"
                  >
                    RA: {a.id} - {a.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTÕES DE AÇÃO ADICIONAIS */}
        <div className="flex gap-2 flex-wrap">
          {/* BOTÕES DAS TABELAS OPCIONAIS */}
          <button
            onClick={() => setMostrarCertificado(!mostrarCertificado)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded text-[10px] font-bold shadow-sm transition-colors ${
              mostrarCertificado
                ? "bg-amber-100 border-amber-300 text-amber-800"
                : "bg-white dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            }`}
          >
            {mostrarCertificado ? (
              <MinusCircle size={14} />
            ) : (
              <PlusCircle size={14} />
            )}
            CERTIFICADO
          </button>

          <button
            onClick={() => setMostrarRodape(!mostrarRodape)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded text-[10px] font-bold shadow-sm transition-colors ${
              mostrarRodape
                ? "bg-amber-100 border-amber-300 text-amber-800"
                : "bg-white dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            }`}
          >
            {mostrarRodape ? (
              <MinusCircle size={14} />
            ) : (
              <PlusCircle size={14} />
            )}
            DECLARAÇÃO
          </button>

          <div className="border-l border-slate-300 dark:border-slate-600 mx-1"></div>

          <button
            onClick={() =>
              setRegistros([
                ...registros,
                { serie: "", ano: "", escola: "", cidade: "" },
              ])
            }
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
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
          className="print-container bg-white w-[210mm] min-h-[267mm] p-10 text-black shadow-2xl print:shadow-none"
          style={{ boxSizing: "border-box", color: "black" }}
        >
          {/* CABEÇALHO TÍTULO */}
          <div
            className="bg-[#DCDCDC] border border-black text-center font-bold text-[18px] py-[5px] tracking-[5px]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            REGISTROS &nbsp; COMPLEMENTARES
          </div>

          {/* TABELA REGISTROS */}
          <table
            className="w-full border-collapse text-[11px] mt-[8px] mb-0"
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

          {/* TEXTO DE DISPENSA */}
          <div
            className="border border-black p-[8px] text-[9px] mt-[8px] text-center"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            <textarea
              value={textoDispensado}
              onChange={(e) => setTextoDispensado(e.target.value)}
              className="print-hide w-full text-center resize-none text-black h-10 overflow-hidden"
            />
            <div className="print-show">{textoDispensado}</div>
          </div>

          {/* ===== TABELA OPCIONAL (CERTIFICADO) COMO AS OBSERVAÇÕES ===== */}
          {mostrarCertificado && (
            <>
              <div
                className="bg-[#DCDCDC] border border-black text-center font-bold text-[16px] py-[3px] tracking-[6px] mt-[8px]"
                style={{ fontFamily: "Verdana, sans-serif" }}
              >
                CERTIFICADO
              </div>
              <div
                className="border-x border-b border-black p-[12px] text-[10px] leading-[1.3]"
                style={{ fontFamily: "Verdana, sans-serif" }}
              >
                <textarea
                  value={textoCertificado}
                  onChange={(e) => {
                    setTextoCertificado(e.target.value);
                    adjustTextareaHeight(e.target);
                  }}
                  ref={(ref) => adjustTextareaHeight(ref)}
                  className="print-hide w-full bg-transparent resize-none text-black text-center overflow-hidden"
                  style={{ minHeight: "30px" }}
                />
                <div
                  className="print-show text-black text-center"
                  dangerouslySetInnerHTML={{
                    __html: textoCertificado.replace(/\n/g, "<br/>"),
                  }}
                ></div>
              </div>
            </>
          )}

          {/* TÍTULO OBSERVAÇÕES */}
          <div
            className="bg-[#DCDCDC] border border-black text-center font-bold text-[16px] py-[3px] tracking-[6px] mt-[8px]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            OBSERVAÇÕES
          </div>

          {/* CAIXA DE OBSERVAÇÕES TEXTO */}
          <div
            className="border border-black p-[12px] text-[9px] leading-[1.3]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            {/* CÓDIGO DE SEGURANÇA (Envolvido em uma div com margem embaixo 'mb-4') */}
            <div className="mb-4">
              <span
                className="font-bold text-[10px]"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                Código de Segurança :
              </span>
              <input
                value={codigoSeguranca}
                onChange={(e) => setCodigoSeguranca(e.target.value)}
                className="w-1/3 border-b border-dotted border-black ml-1 text-black outline-none"
              />
            </div>

            <textarea
              value={observacoes}
              onChange={(e) => {
                setObservacoes(e.target.value);
                adjustTextareaHeight(e.target);
              }}
              ref={(ref) => adjustTextareaHeight(ref)}
              className="print-hide w-full bg-transparent resize-none text-black overflow-hidden"
              style={{ textAlign: "justify", minHeight: "200px" }}
            />
            <div
              className="print-show text-black"
              dangerouslySetInnerHTML={{
                __html: observacoes.replace(/\n/g, "<br/>"),
              }}
            ></div>
          </div>

          {/* ===== FAIXA OPCIONAL EM BRANCO (RODAPÉ) ===== */}
          {mostrarRodape && (
            <>
              <div
                className="bg-[#DCDCDC] border border-black text-center font-bold text-[16px] py-[3px] tracking-[6px] mt-[8px]"
                style={{ fontFamily: "Verdana, sans-serif" }}
              >
                DECLARAÇÃO
              </div>
              <div className="border-x border-b border-black p-[12px] text-[9px]">
                <textarea
                  value={textoRodape}
                  onChange={(e) => {
                    setTextoRodape(e.target.value);
                    adjustTextareaHeight(e.target);
                  }}
                  ref={(ref) => adjustTextareaHeight(ref)}
                  className="print-hide w-full bg-transparent resize-none text-black overflow-hidden"
                  style={{ minHeight: "30px" }}
                />
                <div
                  className="print-show text-black"
                  dangerouslySetInnerHTML={{
                    __html: textoRodape.replace(/\n/g, "<br/>"),
                  }}
                ></div>
              </div>
            </>
          )}

          {/* DATA DE EMISSÃO */}
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

          {/* ===== DUAS ASSINATURAS (ESQUERDA E DIREITA) ===== */}
          <div
            className="mt-[40px] flex justify-between px-10 text-center text-[11px]"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {/* Esquerda - Secretária/Diretora */}
            <div className="flex flex-col items-center w-[45%]">
              <div className="text-black mb-[2px]">
                _____________________________________
              </div>
              <input
                value={assinaturaEsq.nome}
                onChange={(e) =>
                  setAssinaturaEsq({ ...assinaturaEsq, nome: e.target.value })
                }
                className="w-full text-center font-bold text-black"
              />
              <input
                value={assinaturaEsq.cargo}
                onChange={(e) =>
                  setAssinaturaEsq({ ...assinaturaEsq, cargo: e.target.value })
                }
                className="w-full text-center text-black"
              />
              <input
                value={assinaturaEsq.sec}
                onChange={(e) =>
                  setAssinaturaEsq({ ...assinaturaEsq, sec: e.target.value })
                }
                className="w-full text-center text-black"
              />
            </div>

            {/* Direita - Secretária/Diretora */}
            <div className="flex flex-col items-center w-[45%]">
              <div className="text-black mb-[2px]">
                _____________________________________
              </div>
              <input
                value={assinaturaDir.nome}
                onChange={(e) =>
                  setAssinaturaDir({ ...assinaturaDir, nome: e.target.value })
                }
                className="w-full text-center font-bold text-black"
              />
              <input
                value={assinaturaDir.cargo}
                onChange={(e) =>
                  setAssinaturaDir({ ...assinaturaDir, cargo: e.target.value })
                }
                className="w-full text-center text-black"
              />
              <input
                value={assinaturaDir.sec}
                onChange={(e) =>
                  setAssinaturaDir({ ...assinaturaDir, sec: e.target.value })
                }
                className="w-full text-center text-black"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
