"use client";

import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useReactToPrint } from "react-to-print";
import {
  Search,
  Printer,
  ArrowLeft,
  Loader2,
  LayoutPanelTop,
  PlusCircle,
  Trash2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// LISTA DE DISCIPLINAS ATUALIZADA (EXATAMENTE COMO ENVIADO)
const disciplinasIniciais = [
  // BASE COMUM
  { nome: "Língua Portuguesa", tipo: "comum" },
  { nome: "Ciências Naturais", tipo: "comum" },
  { nome: "Matemática", tipo: "comum" },
  { nome: "Física", tipo: "comum" },
  { nome: "Educação Física", tipo: "comum" },
  { nome: "Química", tipo: "comum" },
  { nome: "Biologia", tipo: "comum" },
  { nome: "Lab. Fis/Qui", tipo: "comum" },
  { nome: "Arte", tipo: "comum" },
  { nome: "História", tipo: "comum" },
  { nome: "Fundamentos de Filosofia", tipo: "comum" },
  { nome: "História do Brasil", tipo: "comum" },
  { nome: "Sociologia", tipo: "comum" },
  { nome: "Redação", tipo: "comum" },
  { nome: "MSGL - Middle School Global Leaders", tipo: "comum" },
  { nome: "Ciências Aplicada", tipo: "comum" },
  { nome: "Sala de Leitura", tipo: "comum" },
  { nome: "Artes", tipo: "comum" },
  // BASE DIVERSIFICADA
  { nome: "Língua Estrangeira Moderna Inglês", tipo: "diversificada" },
  { nome: "Redação ", tipo: "diversificada" }, // Espaço para diferenciar da base comum se necessário
  { nome: "Ling. Estrang. Mod. Inglês", tipo: "diversificada" },
  { nome: "Meio Ambiente", tipo: "diversificada" },
  { nome: "Ética e Empreendedorismo", tipo: "diversificada" },
  { nome: "Soe", tipo: "diversificada" },
  { nome: "Língua Inglesa", tipo: "diversificada" },
  { nome: "Raciocínio Lógico e Matemática", tipo: "diversificada" },
  { nome: "Língua Estrang. Moderna- Inglês", tipo: "diversificada" },
  { nome: "Avaliação Semanal", tipo: "diversificada" },
];

export default function HistoricoCSPPage() {
  const { user } = useAuth();
  const relatorioRef = useRef<HTMLDivElement>(null);

  const [alunos, setAlunos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarDiversificada, setMostrarDiversificada] = useState(true);

  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [dadosPessoais, setDadosPessoais] = useState({
    nome: "",
    nascimento: "",
    naturalidade: "",
    nacionalidade: "",
    cpf: "",
    pai: "",
    mae: "",
  });

  const [notas, setNotas] = useState<any[]>([]);

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: `Historico_CSP_${dadosPessoais.nome || "Aluno"}`,
  });

  const buscarAlunos = async (termo: string) => {
    if (termo.length < 3) return;
    setLoadingBusca(true);
    const { data } = await supabase
      .from("alunos")
      .select("id, nome, pai, mae, nascimento")
      .ilike("nome", `%${termo}%`)
      .limit(8);
    if (data) setAlunos(data);
    setLoadingBusca(false);
  };

  const selecionarAluno = (aluno: any) => {
    setAlunoSelecionado(aluno);
    setBusca(aluno.nome);
    setAlunos([]);
    setDadosPessoais({
      nome: aluno.nome,
      nascimento: aluno.nascimento || "",
      naturalidade: "SALVADOR-BA",
      nacionalidade: "BRASILEIRA",
      cpf: "",
      pai: aluno.pai || "",
      mae: aluno.mae || "",
    });

    const baseNotas = disciplinasIniciais.map((d) => {
      const row: any = { disciplina: d.nome, tipo: d.tipo };
      for (let i = 1; i <= 24; i++) row[`c${i}`] = "";
      return row;
    });
    setNotas(baseNotas);
  };

  const atualizarCélula = (index: number, campo: string, valor: string) => {
    const novas = [...notas];
    novas[index][campo] = valor;
    setNotas(novas);
  };

  const adicionarLinha = (tipo: "comum" | "diversificada") => {
    const novaLinha: any = { disciplina: "", tipo: tipo };
    for (let i = 1; i <= 24; i++) novaLinha[`c${i}`] = "";
    setNotas([...notas, novaLinha]);
  };

  const removerLinha = (index: number) => {
    setNotas(notas.filter((_, i) => i !== index));
  };

  const salvarNoBanco = async () => {
    if (!alunoSelecionado) return alert("Selecione um aluno primeiro!");
    setSalvando(true);
    const { error } = await supabase.from("relatorio_historico_frente").insert([
      {
        aluno_id: alunoSelecionado.id,
        dados_pessoais: dadosPessoais,
        dados_academicos: notas,
        salvo_por: user?.id,
      },
    ]);
    if (error) alert("Erro ao salvar: " + error.message);
    else alert("Histórico salvo com sucesso!");
    setSalvando(false);
  };

  return (
    <div className="bg-slate-200 min-h-screen flex flex-col font-sans overflow-auto">
      {/* CSS DE IMPRESSÃO - PÁGINA ÚNICA E MARGENS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4;
            margin: 10mm !important;
          }
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
          }
        }
      `,
        }}
      />

      {/* TOOLBAR */}
      <div className="no-print bg-white p-4 sticky top-0 z-50 border-b border-slate-300 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/dashboard/relatorios"
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors text-slate-700"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="relative w-full max-w-sm">
            <div className="flex items-center border border-slate-400 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                placeholder="BUSCAR ALUNO..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  buscarAlunos(e.target.value);
                }}
                className="w-full p-2 bg-white outline-none text-xs font-bold text-slate-900"
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
                    className="w-full text-left p-3 hover:bg-blue-50 border-b text-[11px] font-bold uppercase text-slate-800"
                  >
                    {a.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => adicionarLinha("comum")}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-400 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <PlusCircle size={14} className="text-blue-600" /> + COMUM
          </button>

          <button
            onClick={() => adicionarLinha("diversificada")}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-400 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <PlusCircle size={14} className="text-orange-600" /> + DIVERSIF.
          </button>

          <button
            onClick={() => setMostrarDiversificada(!mostrarDiversificada)}
            className={`px-3 py-2 rounded text-[10px] font-bold border shadow-sm transition-all ${mostrarDiversificada ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-white border-slate-400 text-slate-500"}`}
          >
            {mostrarDiversificada ? "OCULTAR DIVERSIF." : "MOSTRAR DIVERSIF."}
          </button>

          <button
            onClick={salvarNoBanco}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 border border-green-700 text-white rounded text-xs font-bold hover:bg-green-700 shadow-md transition-all ml-2"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-700 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-md transition-all"
          >
            <Printer size={16} /> IMPRIMIR PDF
          </button>
        </div>
      </div>

      {/* ÁREA DA FOLHA A4 */}
      <div className="flex justify-center p-8 print:p-0">
        <div
          ref={relatorioRef}
          className="print-container bg-white w-[210mm] min-h-[297mm] p-[10mm_15mm] text-black shadow-2xl print:shadow-none print:m-0"
          style={{
            fontFamily: '"Arial Narrow", Arial, sans-serif',
            boxSizing: "border-box",
          }}
        >
          {/* CABEÇALHO */}
          <div className="border-[2px] border-black p-[8px_12px_6px_12px] mb-[10px]">
            <div className="flex flex-col items-center -mb-[30px]">
              <img
                src="/assets/csp_logo.bmp"
                alt="Logo CSP"
                className="w-[400px]"
              />
            </div>
            <div className="grid grid-cols-[1fr_2fr_1fr] items-end mt-[1px]">
              <div className="text-[6.5pt] leading-[1.2] text-left pl-[50px] uppercase font-bold">
                RUA LUIZ PORTELA DA SILVA, 628 - ITAIGARA
                <br />
                TEL: (71) 2107-4600
                <br />
                SALVADOR - BAHIA - BRASIL
              </div>
              <div className="text-[6pt] text-left leading-[1.1] pl-[80px] uppercase">
                <span className="font-bold text-[7.5pt]">
                  ENSINO FUNDAMENTAL E MÉDIO
                </span>{" "}
                <br />
                INSPIRA MUDANÇA PARTICIPAÇÕES S.A. FILIAL COLÉGIO SÃO PAULO
                <br />
                RECONHECIDO PELAS RES. C.E.E. 064/90, PARECER 195/90, D.O.
                18/11/1990
                <br />
                CREDENCIADO NOS TERMOS DO ARTIGO 2º DA RESOLUÇÃO CEE 037/2001
                <br />
                DO CEE Nº 42/2009 D.O.E 18/04/2009
              </div>
              <img
                src="/assets/gov_logo.bmp"
                alt="Brasão"
                className="w-[50px] justify-self-end mb-[20px]"
              />
            </div>
          </div>

          {/* DADOS PESSOAIS (REMOVEU-SE O UPPERCASE DOS INPUTS INTERNOS) */}
          <table className="w-full border-collapse mb-[10px] text-black uppercase text-[8.5pt]">
            <tbody>
              <tr>
                <td colSpan={3} className="border border-black p-[4px_6px]">
                  <span className="font-bold">ALUNO:</span> {dadosPessoais.nome}
                </td>
                <td className="border border-black p-[4px_6px] w-[25%] font-bold">
                  <span>NASC.:</span>
                  <input
                    type="text"
                    value={dadosPessoais.nascimento}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nascimento: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none w-20 font-bold"
                  />
                </td>
              </tr>
              <tr className="font-bold">
                <td className="border border-black p-[4px_6px]">
                  <span>NATURALIDADE:</span>
                  <input
                    type="text"
                    value={dadosPessoais.naturalidade}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        naturalidade: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none w-32 font-bold"
                  />
                </td>
                <td colSpan={2} className="border border-black p-[4px_6px]">
                  <span>NACIONALIDADE:</span>
                  <input
                    type="text"
                    value={dadosPessoais.nacionalidade}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nacionalidade: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none w-32 font-bold"
                  />
                </td>
                <td className="border border-black p-[4px_6px]">
                  <span>CPF:</span>
                  <input
                    type="text"
                    value={dadosPessoais.cpf}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        cpf: e.target.value,
                      })
                    }
                    placeholder="***.***.***-**"
                    className="bg-transparent outline-none w-28 font-bold"
                  />
                </td>
              </tr>
              <tr className="font-bold">
                <td colSpan={4} className="border border-black p-[4px_6px]">
                  <span>PAI:</span>{" "}
                  <input
                    type="text"
                    value={dadosPessoais.pai}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        pai: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none w-[90%] font-bold"
                  />
                </td>
              </tr>
              <tr className="font-bold">
                <td colSpan={4} className="border border-black p-[4px_6px]">
                  <span>MÃE:</span>{" "}
                  <input
                    type="text"
                    value={dadosPessoais.mae}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        mae: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none w-[90%] font-bold"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABELA DE NOTAS MILIMÉTRICA */}
          <table
            className="w-full border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: "22%" }} />
              {Array.from({ length: 24 }).map((_, i) => (
                <col key={i} style={{ width: "3.25%" }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[#ededed] font-bold text-[6.5pt] text-center border border-black uppercase">
                <th rowSpan={4} className="border border-black uppercase">
                  COMPONENTES
                  <br />
                  CURRICULARES
                </th>
                <th colSpan={18} className="border border-black py-0.5">
                  ENSINO FUNDAMENTAL
                </th>
                <th colSpan={6} className="border border-black py-0.5">
                  ENSINO MÉDIO
                </th>
              </tr>
              <tr className="text-[6.5pt] text-center font-bold uppercase border border-black">
                {[
                  "1º ANO",
                  "2º ANO",
                  "3º ANO",
                  "4º ANO",
                  "5º ANO",
                  "6º ANO",
                  "7º ANO",
                  "8º ANO",
                  "9º ANO",
                  "1ª SÉRIE",
                  "2ª SÉRIE",
                  "3ª SÉRIE",
                ].map((ano) => (
                  <th
                    key={ano}
                    colSpan={2}
                    className="border border-black uppercase"
                  >
                    {ano}
                  </th>
                ))}
              </tr>
              <tr className="text-[5.5pt] text-center uppercase border border-black font-normal">
                {[
                  "Alfabet.",
                  "1ª Série",
                  "2ª Série",
                  "3ª Série",
                  "4ª Série",
                  "5ª Série",
                  "6ª Série",
                  "7ª Série",
                  "8ª Série",
                  "-",
                  "-",
                  "-",
                ].map((sub, i) => (
                  <th
                    key={i}
                    colSpan={2}
                    className="border border-black font-normal"
                  >
                    {sub}
                  </th>
                ))}
              </tr>
              <tr className="text-[6pt] text-center font-bold border border-black">
                {Array.from({ length: 12 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <th className="border border-black font-bold">N</th>
                    <th className="border border-black font-bold">CH</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="text-[6.5pt] border border-black">
              <tr className="bg-[#ededed] font-bold h-4">
                <td className="border border-black pl-1 uppercase">
                  BASE COMUM
                </td>
                {Array.from({ length: 24 }).map((_, i) => (
                  <td key={i} className="border border-black"></td>
                ))}
              </tr>
              {notas
                .filter((n) => n.tipo === "comum")
                .map((n) => {
                  const globalIdx = notas.indexOf(n);
                  return (
                    <tr
                      key={globalIdx}
                      className="group relative hover:bg-blue-50/20"
                    >
                      <td className="border border-black pl-1 font-bold text-[7pt] text-left">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={n.disciplina}
                            onChange={(e) =>
                              atualizarCélula(
                                globalIdx,
                                "disciplina",
                                e.target.value,
                              )
                            }
                            className="w-full bg-transparent outline-none font-bold"
                          />
                          <button
                            onClick={() => removerLinha(globalIdx)}
                            className="no-print text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </td>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <td key={i} className="border border-black p-0">
                          <input
                            value={n[`c${i + 1}`]}
                            onChange={(e) =>
                              atualizarCélula(
                                globalIdx,
                                `c${i + 1}`,
                                e.target.value,
                              )
                            }
                            className="w-full text-center outline-none bg-transparent"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}

              {mostrarDiversificada && (
                <>
                  <tr className="bg-[#ededed] font-bold h-4">
                    <td className="border border-black pl-1 uppercase font-bold">
                      BASE DIVERSIFICADA
                    </td>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <td key={i} className="border border-black"></td>
                    ))}
                  </tr>
                  {notas
                    .filter((n) => n.tipo === "diversificada")
                    .map((n) => {
                      const globalIdx = notas.indexOf(n);
                      return (
                        <tr
                          key={globalIdx}
                          className="group relative hover:bg-blue-50/20"
                        >
                          <td className="border border-black pl-1 text-left">
                            <div className="flex items-center justify-between">
                              <input
                                type="text"
                                value={n.disciplina}
                                onChange={(e) =>
                                  atualizarCélula(
                                    globalIdx,
                                    "disciplina",
                                    e.target.value,
                                  )
                                }
                                className="w-full bg-transparent outline-none font-bold"
                              />
                              <button
                                onClick={() => removerLinha(globalIdx)}
                                className="no-print text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </td>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <td key={i} className="border border-black p-0">
                              <input
                                value={n[`c${i + 1}`]}
                                onChange={(e) =>
                                  atualizarCélula(
                                    globalIdx,
                                    `c${i + 1}`,
                                    e.target.value,
                                  )
                                }
                                className="w-full text-center outline-none bg-transparent"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                </>
              )}

              <tr className="bg-[#ededed] font-bold text-[7.5pt] uppercase h-5">
                <td className="border border-black pl-1 font-bold">
                  CARGA HORÁRIA TOTAL
                </td>
                {Array.from({ length: 12 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <td
                      colSpan={2}
                      className="border border-black text-center font-bold"
                    >
                      <input
                        type="text"
                        placeholder="0"
                        className="w-full text-center bg-transparent outline-none font-bold"
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
