"use client";

import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2"; // ✅ Importação do SweetAlert2 adicionada
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

const disciplinasIniciais = [
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
  { nome: "Língua Estrangeira Moderna Inglês", tipo: "diversificada" },
  { nome: "Redação ", tipo: "diversificada" },
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
  const { coligadaAtual } = useColigada();
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
    pai: "",
    mae: "",
  });

  const [notas, setNotas] = useState<any[]>([]);
  const [cargaHoraria, setCargaHoraria] = useState<string[]>(
    Array(12).fill("0"),
  );

  const handlePrint = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: `Historico_CSP_${dadosPessoais.nome || "Aluno"}`,
  });

  const buscarAlunos = async (termo: string) => {
    if (termo.length < 3) return;
    setLoadingBusca(true);
    try {
      let query = supabase
        .from("alunos")
        .select("id, nome, pai, mae, nascimento, sede_id")
        .ilike("nome", `%${termo}%`);
      if (coligadaAtual) query = query.eq("sede_id", coligadaAtual.id);
      const { data, error } = await query.limit(8);
      if (error) throw error;
      setAlunos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBusca(false);
    }
  };

  const selecionarAluno = async (aluno: any) => {
    setAlunoSelecionado(aluno);
    setBusca(aluno.nome);
    setAlunos([]);
    const { data: salvo, error } = await supabase
      .from("relatorio_historico_frente")
      .select("*")
      .eq("aluno_id", aluno.id)
      .maybeSingle();

    if (salvo && !error) {
      setDadosPessoais(salvo.dados_pessoais);
      setNotas(salvo.dados_academicos);
      setCargaHoraria(
        salvo.carga_horaria && salvo.carga_horaria.length === 12
          ? salvo.carga_horaria
          : Array(12).fill("0"),
      );

      // ✅ Alerta silencioso de sucesso ao carregar
      Swal.fire({
        title: "Carregado!",
        text: `Dados de ${aluno.nome} recuperados.`,
        icon: "info",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      setDadosPessoais({
        nome: aluno.nome,
        nascimento: aluno.nascimento || "",
        naturalidade: "SALVADOR-BA",
        nacionalidade: "BRASILEIRA",
        pai: aluno.pai || "",
        mae: aluno.mae || "",
      });
      const baseNotas = disciplinasIniciais.map((d) => ({
        disciplina: d.nome,
        tipo: d.tipo,
        ...Object.fromEntries(
          Array.from({ length: 24 }, (_, i) => [`c${i + 1}`, ""]),
        ),
      }));
      setNotas(baseNotas);
      setCargaHoraria(Array(12).fill("0"));
    }
  };

  const atualizarCélula = (index: number, campo: string, valor: string) => {
    const novas = [...notas];
    novas[index][campo] = valor;
    setNotas(novas);
  };

  const atualizarCargaTotal = (index: number, valor: string) => {
    const novas = [...cargaHoraria];
    novas[index] = valor;
    setCargaHoraria(novas);
  };

  const adicionarLinha = (tipo: "comum" | "diversificada") => {
    const nova: any = { disciplina: "", tipo };
    for (let i = 1; i <= 24; i++) nova[`c${i}`] = "";
    setNotas([...notas, nova]);
  };

  const removerLinha = (index: number) => {
    setNotas(notas.filter((_, i) => i !== index));
  };

  const salvarNoBanco = async () => {
    // ✅ Alerta bonito caso esqueça de buscar aluno
    if (!alunoSelecionado) {
      return Swal.fire({
        title: "Atenção",
        text: "Busque e selecione um aluno antes de salvar!",
        icon: "warning",
        confirmButtonColor: "#3085d6",
      });
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from("relatorio_historico_frente")
        .upsert(
          {
            aluno_id: alunoSelecionado.id,
            dados_pessoais: dadosPessoais,
            dados_academicos: notas,
            carga_horaria: cargaHoraria,
            salvo_por: user?.id,
            sede_id: coligadaAtual?.id,
            updated_at: new Date(),
          },
          { onConflict: "aluno_id" },
        );
      if (error) throw error;

      // ✅ Alerta bonito de sucesso
      Swal.fire({
        title: "Salvo com sucesso!",
        text: "A frente do histórico foi atualizada.",
        icon: "success",
        confirmButtonColor: "#16a34a", // Cor verde Tailwind
      });
    } catch (error: any) {
      // ✅ Alerta bonito de erro
      Swal.fire({
        title: "Erro ao salvar",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-slate-200 dark:bg-slate-900 min-h-screen flex flex-col font-sans overflow-auto no-scrollbar">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4; margin: 10mm !important; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; height: auto !important; min-height: auto !important; }
        }
      `,
        }}
      />

      <div className="no-print bg-white dark:bg-slate-800 p-4 sticky top-0 z-50 border-b border-slate-300 dark:border-slate-700 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/dashboard/relatorios"
            className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="relative w-full max-w-sm">
            <div className="flex items-center border border-slate-400 dark:border-slate-600 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                placeholder={`BUSCAR EM ${coligadaAtual?.sigla || "UNIDADE"}...`}
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  buscarAlunos(e.target.value);
                }}
                className="w-full p-2 bg-transparent outline-none text-xs font-bold text-slate-900 dark:text-slate-200"
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
                    className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-700 border-b dark:border-slate-700 text-[11px] font-bold uppercase text-slate-800 dark:text-slate-200 transition-colors font-sans"
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
            onClick={() => adicionarLinha("comum")}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            <PlusCircle size={14} className="text-blue-600" /> + COMUM
          </button>
          <button
            onClick={() => adicionarLinha("diversificada")}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            <PlusCircle size={14} className="text-orange-600" /> + DIVERSIF.
          </button>
          <button
            onClick={() => setMostrarDiversificada(!mostrarDiversificada)}
            className={`px-3 py-2 rounded text-[10px] font-bold border shadow-sm transition-all ${mostrarDiversificada ? "bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800/50 text-orange-700 dark:text-orange-300" : "bg-white dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-slate-500 dark:text-slate-400"}`}
          >
            {mostrarDiversificada ? "OCULTAR DIVERSIF." : "MOSTRAR DIVERSIF."}
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

      <div className="flex justify-center p-8 print:p-0">
        <div
          ref={relatorioRef}
          className="print-container bg-white w-[210mm] min-h-[297mm] p-[10mm_15mm] text-black shadow-2xl print:shadow-none print:m-0"
          style={{
            fontFamily: '"Arial Narrow", Arial, sans-serif',
            boxSizing: "border-box",
          }}
        >
          {/* CABEÇALHO: Borda Slate-300 para ficar mais clara */}
          <div className="border border-slate-300 p-[8px_12px_6px_12px] mb-[10px]">
            <div className="flex flex-col items-center -mb-[40px]">
              <img
                src="/assets/csp_logo.bmp"
                alt="Logo"
                className="w-[400px]"
              />
            </div>
            <div className="grid grid-cols-[1fr_2fr_1fr] items-end mt-[0px]">
              <div className="text-[5.5pt] leading-[1.0] text-left pl-[60px] uppercase text-slate-700">
                RUA LUIZ PORTELA DA SILVA, 628 - ITAIGARA
                <br />
                TEL: (71) 2107-4600
                <br />
                SALVADOR - BAHIA - BRASIL
              </div>
              <div className="text-[5.5pt] text-left leading-[1.1] pl-[120px] uppercase text-slate-700">
                ENSINO FUNDAMENTAL E MÉDIO
                <br />
                INSPIRA MUDANÇA PARTICIPAÇÕES S.A. FILIAL COLÉGIO SÃO PAULO
                <br />
                RECONHECIDO RES. C.E.E. 064/90, PARECER 195/90, D.O. 18/11/1990
                <br />
                CREDENCIADO RESOLUÇÃO CEE 037/2001
                <br />
                DO CEE Nº 42/2009 D.O.E 18/04/2009
              </div>
              <img
                src="/assets/gov_logo.bmp"
                alt="Brasão"
                className="w-[50px] justify-self-end mb-[20px] opacity-70"
              />
            </div>
          </div>

          {/* DADOS PESSOAIS: Bordas Slate-300 */}
          <table className="w-full border-collapse mb-[10px] text-black text-[8.5pt] border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="p-[4px_6px] w-[65%] border-r-0">
                  <span className="font-bold uppercase">ALUNO :</span>{" "}
                  {dadosPessoais.nome}
                </td>
                <td className="p-[4px_6px] w-[35%] border-l-0 text-left">
                  <span className="font-bold uppercase">NACIONALIDADE :</span>{" "}
                  <input
                    type="text"
                    value={dadosPessoais.nacionalidade}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nacionalidade: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none ml-1 w-28"
                  />
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-[4px_6px] border-r-0">
                  <span className="font-bold uppercase">NATURALIDADE :</span>{" "}
                  <input
                    type="text"
                    value={dadosPessoais.naturalidade}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        naturalidade: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none ml-1 w-48"
                  />
                </td>
                <td className="p-[4px_6px] border-l-0 text-left">
                  <span className="font-bold uppercase">NASCIMENTO :</span>{" "}
                  <input
                    type="text"
                    value={dadosPessoais.nascimento}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nascimento: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none ml-1 w-28"
                  />
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td colSpan={2} className="p-[4px_6px]">
                  <span className="font-bold uppercase">PAI :</span>{" "}
                  <input
                    type="text"
                    value={dadosPessoais.pai}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        pai: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none ml-1 w-[90%]"
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-[4px_6px]">
                  <span className="font-bold uppercase">MÃE :</span>{" "}
                  <input
                    type="text"
                    value={dadosPessoais.mae}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        mae: e.target.value,
                      })
                    }
                    className="bg-transparent outline-none ml-1 w-[90%]"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABELA DE COMPONENTES: Todas as bordas Slate-300 */}
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
              <tr className="font-bold text-[10pt] text-center border border-slate-300">
                <th rowSpan={4} className="border border-slate-300">
                  Componentes
                  <br />
                  Curriculares
                </th>
                <th
                  colSpan={18}
                  className="border border-slate-300 py-0.5 text-slate-700"
                >
                  Ensino Fundamental
                </th>
                <th
                  colSpan={6}
                  className="border border-slate-300 py-0.5 text-slate-700"
                >
                  Ensino Médio
                </th>
              </tr>
              <tr className="text-[6.5pt] text-center font-bold border border-slate-300 text-slate-1000">
                {[
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
                ].map((ano) => (
                  <th key={ano} colSpan={2} className="border border-slate-300">
                    {ano}
                  </th>
                ))}
              </tr>
              <tr className="text-[5.5pt] text-center border border-slate-300 font-bold text-slate-1000">
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
                  <th key={i} colSpan={2} className="border border-slate-300">
                    {sub}
                  </th>
                ))}
              </tr>
              <tr className="text-[6pt] text-center font-bold border border-slate-300 text-slate-1000">
                {Array.from({ length: 12 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <th className="border border-slate-300">N</th>
                    <th className="border border-slate-300">CH</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="text-[6.5pt] border border-slate-300">
              <tr className="font-bold h-4">
                <td className="border border-slate-300 pl-1 text-slate-1000">
                  Base Comum
                </td>
                {Array.from({ length: 24 }).map((_, i) => (
                  <td key={i} className="border border-slate-300"></td>
                ))}
              </tr>
              {notas
                .filter((n) => n.tipo === "comum")
                .map((n) => {
                  const globalIdx = notas.indexOf(n);
                  return (
                    <tr key={globalIdx} className="group h-4">
                      <td className="border border-slate-300 pl-1 text-[7pt] text-left">
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
                            className="w-full bg-transparent outline-none font-sans text-slate-800"
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
                        <td key={i} className="border border-slate-300 p-0">
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
                  <tr className="font-bold h-4 border-t border-slate-300">
                    <td className="border border-slate-300 pl-1 text-slate-1000">
                      Base Diversificada
                    </td>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <td key={i} className="border border-slate-300"></td>
                    ))}
                  </tr>
                  {notas
                    .filter((n) => n.tipo === "diversificada")
                    .map((n) => {
                      const globalIdx = notas.indexOf(n);
                      return (
                        <tr key={globalIdx} className="group h-4">
                          <td className="border border-slate-300 pl-1 text-left">
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
                                className="w-full bg-transparent outline-none font-sans text-slate-800"
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
                            <td key={i} className="border border-slate-300 p-0">
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
              <tr className="font-bold text-[7.5pt] h-5 border-t border-slate-300">
                <td className="border border-slate-300 pl-1 text-slate-1000">
                  Carga Horária Total
                </td>
                {cargaHoraria.map((valor, i) => (
                  <React.Fragment key={i}>
                    <td
                      colSpan={2}
                      className="border border-slate-300 text-center font-bold"
                    >
                      <input
                        type="text"
                        value={valor}
                        onChange={(e) => atualizarCargaTotal(i, e.target.value)}
                        className="w-full text-center bg-transparent outline-none font-bold text-slate-1000"
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
