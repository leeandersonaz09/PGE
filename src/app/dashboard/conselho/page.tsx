"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import {
  Upload,
  X,
  Search,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";

export default function ConselhoNotasPage() {
  const router = useRouter();

  // Estados Globais e Banco de Dados
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<string[]>([]);
  const [disciplinesOrder, setDisciplinesOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Estados de Controle e Filtros
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTurma, setSelectedTurma] = useState("todas");
  const [mediaCorte, setMediaCorte] = useState(6.0);
  const [showStages, setShowStages] = useState(true);
  const [showExameFinal, setShowExameFinal] = useState(true);
  const [showMediaFinal, setShowMediaFinal] = useState(true);
  const [highlightStages, setHighlightStages] = useState(false);

  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [disciplineFilterOpen, setDisciplineFilterOpen] = useState(false);

  // Modal de Foto
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImgSrc, setModalImgSrc] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);

  // --- BUSCA INICIAL NO SUPABASE ---
  useEffect(() => {
    carregarDadosDoBanco();
  }, []);

  const carregarDadosDoBanco = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("conselho_notas")
      .select("*")
      .order("nm_pessoa", { ascending: true });

    if (error) {
      setErrorMsg("Erro ao carregar dados do banco.");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      reconstruirEstados(data);
    } else {
      setAllStudents([]);
    }
    setLoading(false);
  };

  const reconstruirEstados = (data: any[]) => {
    const turmasSet = new Set<string>();
    const discSet = new Set<string>();

    data.forEach((s) => {
      if (s.turma) turmasSet.add(s.turma);
      if (s.grades) {
        Object.keys(s.grades).forEach((k) => discSet.add(k));
      }
    });

    const discArray = Array.from(discSet).sort();
    setTurmas(Array.from(turmasSet).sort());
    setDisciplinesOrder(discArray);

    // Auto-selecionar disciplinas (ignorando as que você pediu no código original)
    const ignoreList = ["EDF", "PV", "SOESP", "ART.P"];
    setSelectedDisciplines(
      discArray.filter(
        (d) => !ignoreList.some((ignored) => d.includes(ignored))
      )
    );

    setAllStudents(data);
    setCurrentIndex(0);
  };

  // --- UPLOAD E PROCESSAMENTO DA PLANILHA ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        await processarESalvarNoBanco(data as any[][]);
      } catch (err) {
        console.error(err);
        setErrorMsg("Erro ao ler o arquivo Excel.");
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processarESalvarNoBanco = async (values: any[][]) => {
    if (!values || values.length < 2) {
      setErrorMsg("A planilha parece estar vazia.");
      setIsUploading(false);
      return;
    }

    const headers = values[0].map((h) => String(h).trim().toLowerCase());

    // Mapeamento de Colunas (Idêntico ao seu original)
    const COL_ALUNO_ID = headers.indexOf("cd_aluno");
    const COL_NOME = headers.indexOf("nm_pessoa");
    const COL_FOTO = headers.indexOf("ds_link_foto");
    const COL_DISCIPLINA = headers.indexOf("disciplina");
    const COL_ETAPA1 = headers.indexOf("nota_d1");
    const COL_ETAPA2 = headers.indexOf("nota_d2");
    const COL_ETAPA3 = headers.indexOf("nota_d3");
    const COL_NOTA1 = COL_ETAPA1 > -1 ? COL_ETAPA1 : headers.indexOf("nota");
    const COL_NOTA2 = COL_ETAPA2 > -1 ? COL_ETAPA2 : headers.indexOf("rec");
    const COL_NOTA3 = COL_ETAPA3;
    const COL_MEDIA = headers.indexOf("media");
    const COL_MEDIA_FINAL = headers.indexOf("mediafinal");
    const COL_EXAME_FINAL = headers.indexOf("notaexame");
    const COL_TURMA = headers.findIndex(
      (h) => h === "ds_turma" || h === "turma"
    );

    if (COL_ALUNO_ID === -1 || COL_NOME === -1) {
      setErrorMsg("Colunas obrigatórias não encontradas: cd_aluno, nm_pessoa.");
      setIsUploading(false);
      return;
    }

    const studentsMap: Record<string, any> = {};

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row[COL_ALUNO_ID]) continue;

      const studentId = String(row[COL_ALUNO_ID]).trim();

      if (!studentsMap[studentId]) {
        let thumbUrl =
          COL_FOTO > -1 && row[COL_FOTO] ? String(row[COL_FOTO]).trim() : "";
        let fullUrl = thumbUrl;
        if (thumbUrl.includes("width=")) {
          fullUrl = thumbUrl
            .replace(/&width=\d+/i, "&width=600")
            .replace(/&height=\d+/i, "&height=875");
        }

        studentsMap[studentId] = {
          cd_aluno: studentId,
          nm_pessoa: String(row[COL_NOME]).trim(),
          foto_url: thumbUrl,
          full_foto_url: fullUrl,
          turma:
            COL_TURMA > -1 ? String(row[COL_TURMA] || "Geral").trim() : "Geral",
          grades: {},
        };
      }

      let disciplina =
        COL_DISCIPLINA > -1 ? String(row[COL_DISCIPLINA] || "").trim() : "";
      disciplina = disciplina.replace(/^"|"$/g, "").toUpperCase();
      if (!disciplina || disciplina === "---") continue;

      studentsMap[studentId].grades[disciplina] = {
        etapa1: COL_NOTA1 > -1 ? row[COL_NOTA1] : "",
        etapa2: COL_NOTA2 > -1 ? row[COL_NOTA2] : "",
        etapa3: COL_NOTA3 > -1 ? row[COL_NOTA3] : "",
        mf_original:
          COL_MEDIA > -1
            ? row[COL_MEDIA]
            : COL_MEDIA_FINAL > -1
            ? row[COL_MEDIA_FINAL]
            : "",
        mf_exame: COL_EXAME_FINAL > -1 ? row[COL_EXAME_FINAL] : "",
      };
    }

    const alunosParaSalvar = Object.values(studentsMap);

    // 1. Apaga tudo que existe no banco (O Wipe que você pediu)
    await supabase
      .from("conselho_notas")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Insere os novos dados (em lotes para não sobrecarregar)
    const { error } = await supabase
      .from("conselho_notas")
      .insert(alunosParaSalvar);

    if (error) {
      setErrorMsg("Erro ao salvar no banco de dados.");
      console.error(error);
    } else {
      await carregarDadosDoBanco(); // Recarrega a tela com os dados salvos
    }

    setIsUploading(false);
  };

  // --- FUNÇÕES AUXILIARES E FILTROS ---
  const safeParseFloat = (val: any) => {
    if (typeof val === "number") return val;
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (str === "" || str === "---" || str === "-") return null;
    const num = parseFloat(str.replace(",", "."));
    return isNaN(num) ? null : num;
  };

  const filteredStudents = useMemo(() => {
    if (allStudents.length === 0) return [];
    let temp = allStudents;

    if (selectedTurma !== "todas") {
      temp = temp.filter((s) => s.turma === selectedTurma);
    }

    temp = temp.filter((student) => {
      if (!student.grades) return false;
      return selectedDisciplines.some((subject) => {
        const gradeInfo = student.grades[subject];
        if (!gradeInfo) return false;

        let rawValue = showExameFinal
          ? gradeInfo.mf_exame
          : showMediaFinal
          ? gradeInfo.mf_original
          : null;
        const num = safeParseFloat(rawValue);
        return num !== null && num < mediaCorte;
      });
    });

    return temp;
  }, [
    allStudents,
    selectedTurma,
    mediaCorte,
    selectedDisciplines,
    showExameFinal,
    showMediaFinal,
  ]);

  useMemo(() => {
    if (currentIndex >= filteredStudents.length && filteredStudents.length > 0)
      setCurrentIndex(0);
  }, [filteredStudents.length]);

  const formatGrade = (value: any, applyRedClass: boolean) => {
    const num = safeParseFloat(value);
    if (num === null)
      return {
        value: <span className="text-gray-400 italic">-</span>,
        className: "",
      };

    const displayVal = num.toFixed(1).replace(".", ",");
    let className = "font-medium ";
    if (applyRedClass && num < mediaCorte)
      className += "bg-red-100 text-red-700 px-2 py-0.5 rounded";

    return { value: displayVal, className };
  };

  const currentStudent = filteredStudents[currentIndex];
  let statusCount = 0;

  if (currentStudent) {
    selectedDisciplines.forEach((subject) => {
      const g = currentStudent.grades[subject];
      if (!g) return;
      let rawValue = showExameFinal
        ? g.mf_exame
        : showMediaFinal
        ? g.mf_original
        : null;
      const num = safeParseFloat(rawValue);
      if (num !== null && num < mediaCorte) statusCount++;
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] font-sans overflow-hidden">
      {/* BARRA SUPERIOR DE CONTROLES */}
      <div className="bg-white p-3 border-b flex flex-wrap gap-4 items-center justify-between shadow-sm z-10 shrink-0">
        {/* Upload e Turma */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 bg-[#0d9488] hover:bg-teal-700 text-white px-4 py-1.5 rounded-md cursor-pointer text-xs font-bold transition-colors">
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {isUploading ? "Processando..." : "Subir Nova Planilha"}
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700">Turma:</label>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="border rounded px-2 py-1 text-xs bg-gray-50 text-gray-800 outline-none"
            >
              <option value="todas">Todas</option>
              {turmas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros de Notas */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label className="font-bold text-gray-700">Média Corte:</label>
            <input
              type="number"
              value={mediaCorte}
              step="0.1"
              onChange={(e) => setMediaCorte(parseFloat(e.target.value))}
              className="border rounded w-16 px-2 py-1 bg-gray-50 text-gray-800 outline-none"
            />
          </div>

          <label className="flex items-center gap-1 cursor-pointer select-none text-gray-700">
            <input
              type="checkbox"
              checked={showExameFinal}
              onChange={(e) => setShowExameFinal(e.target.checked)}
            />{" "}
            Exame Final
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none text-gray-700">
            <input
              type="checkbox"
              checked={showMediaFinal}
              onChange={(e) => setShowMediaFinal(e.target.checked)}
            />{" "}
            Média Final
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none text-gray-700">
            <input
              type="checkbox"
              checked={showStages}
              onChange={(e) => setShowStages(e.target.checked)}
            />{" "}
            Etapas
          </label>
        </div>

        {/* Fechar */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
        >
          <X size={16} /> Fechar
        </button>
      </div>

      {/* ÁREA PRINCIPAL (Flex-1 e hidden para travar a tela) */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-[#0d9488] gap-2">
            <Loader2 size={32} className="animate-spin" />
            <p className="font-bold text-sm">Carregando dados do banco...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline">{errorMsg}</span>
          </div>
        ) : allStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <FileSpreadsheet size={64} className="opacity-50" />
            <h2 className="text-xl font-bold text-gray-600">
              Nenhum dado encontrado
            </h2>
            <p className="text-sm text-center max-w-md">
              Faça o upload da planilha do sistema para alimentar o banco de
              dados do Conselho de Classe.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center text-gray-500 font-medium">
            Nenhum aluno encontrado com pendências nas turmas/disciplinas
            selecionadas.
          </div>
        ) : currentStudent ? (
          /* =========================================================
             AQUI ESTÁ A CORREÇÃO PRINCIPAL (Flex, Col e Max-H)
          ========================================================= */
          <div className="w-full max-w-5xl bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full max-h-full">
            {/* Cabeçalho do Card (Shrink-0 para não amassar) */}
            <div className="bg-gradient-to-r from-[#0d9488] to-teal-800 p-6 flex gap-6 items-center text-white shrink-0">
              <div
                className="w-24 h-24 rounded-full bg-white border-4 border-teal-200 overflow-hidden cursor-pointer shadow-inner flex-shrink-0 relative group"
                onClick={() => {
                  setModalImgSrc(
                    currentStudent.full_foto_url || currentStudent.foto_url
                  );
                  setModalOpen(true);
                }}
              >
                {currentStudent.foto_url ? (
                  <img
                    src={currentStudent.foto_url}
                    alt="Foto"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center transition-all">
                  <Search size={20} />
                </div>
              </div>

              <div className="flex-1">
                <h2 className="text-3xl font-bold tracking-tight mb-1">
                  {currentStudent.nm_pessoa}
                </h2>
                <div className="flex items-center gap-3 text-sm font-medium text-teal-100">
                  <span className="bg-black/20 px-3 py-1 rounded-full">
                    RA: {currentStudent.cd_aluno}
                  </span>
                  <span className="bg-black/20 px-3 py-1 rounded-full">
                    {currentStudent.turma}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-teal-100 font-bold mb-1">
                  Status de Recuperação
                </div>
                {statusCount >= 5 ? (
                  <div className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm border border-red-400">
                    Recuperação ({statusCount})
                  </div>
                ) : (
                  <div className="bg-green-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm border border-green-400">
                    Conselho ({statusCount})
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de Notas (Flex-1 e Overflow-auto para rolar DENTRO) */}
            <div className="p-0 overflow-auto flex-1 bg-white relative">
              <table className="w-full text-left text-sm text-gray-700 border-collapse">
                {/* Thead com Sticky Top e Bg para grudar no topo */}
                <thead className="bg-gray-50 uppercase text-[10px] font-bold text-gray-500 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 border-b border-r border-gray-200 bg-gray-50">
                      Disciplina
                    </th>
                    {showStages && (
                      <th className="px-4 py-3 border-b border-r border-gray-200 bg-gray-50 text-center">
                        Etapa 1
                      </th>
                    )}
                    {showStages && (
                      <th className="px-4 py-3 border-b border-r border-gray-200 bg-gray-50 text-center">
                        Etapa 2
                      </th>
                    )}
                    {showStages && (
                      <th className="px-4 py-3 border-b border-r border-gray-200 bg-gray-50 text-center">
                        Etapa 3
                      </th>
                    )}
                    {showExameFinal && (
                      <th className="px-4 py-3 border-b border-r border-gray-200 bg-gray-50 text-center">
                        Exame Final
                      </th>
                    )}
                    {showMediaFinal && (
                      <th className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-center">
                        Média Final
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {disciplinesOrder.map((subject, idx) => {
                    const g = currentStudent.grades[subject];
                    if (!g) return null;

                    const isCalculated = selectedDisciplines.includes(subject);
                    const d1 = formatGrade(g.etapa1, highlightStages);
                    const d2 = formatGrade(g.etapa2, highlightStages);
                    const d3 = formatGrade(g.etapa3, highlightStages);
                    const mf_orig = formatGrade(g.mf_original, true);
                    const mf_exam = formatGrade(g.mf_exame, true);

                    return (
                      <tr
                        key={subject}
                        className={`border-b border-gray-100 ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        } ${
                          !isCalculated
                            ? "opacity-40 grayscale"
                            : "hover:bg-teal-50"
                        }`}
                      >
                        <td className="px-6 py-2 border-r border-gray-100 font-bold text-gray-800">
                          {subject}{" "}
                          {!isCalculated && (
                            <span className="text-[9px] font-normal text-gray-400 ml-2 border px-1 rounded">
                              Ignorada
                            </span>
                          )}
                        </td>
                        {showStages && (
                          <td
                            className={`px-4 py-2 border-r border-gray-100 text-center ${d1.className}`}
                          >
                            {d1.value}
                          </td>
                        )}
                        {showStages && (
                          <td
                            className={`px-4 py-2 border-r border-gray-100 text-center ${d2.className}`}
                          >
                            {d2.value}
                          </td>
                        )}
                        {showStages && (
                          <td
                            className={`px-4 py-2 border-r border-gray-100 text-center ${d3.className}`}
                          >
                            {d3.value}
                          </td>
                        )}
                        {showExameFinal && (
                          <td
                            className={`px-4 py-2 border-r border-gray-100 text-center ${mf_exam.className}`}
                          >
                            {mf_exam.value}
                          </td>
                        )}
                        {showMediaFinal && (
                          <td
                            className={`px-4 py-2 text-center ${mf_orig.className}`}
                          >
                            {mf_orig.value}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação (Shrink-0 para nunca sumir embaixo) */}
            <div className="bg-gray-50 p-4 border-t flex items-center justify-between shrink-0">
              <button
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={16} /> Anterior
              </button>

              <div className="text-sm font-bold text-gray-600">
                Aluno{" "}
                <span className="text-[#0d9488] text-lg">
                  {currentIndex + 1}
                </span>{" "}
                de {filteredStudents.length}
              </div>

              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                disabled={currentIndex === filteredStudents.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* MODAL DA IMAGEM ZOOM */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setModalOpen(false)}
        >
          <img
            src={modalImgSrc}
            className={`max-w-full max-h-full rounded-lg shadow-2xl transition-transform ${
              isZoomed ? "scale-125" : "scale-100"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            style={{ cursor: isZoomed ? "zoom-out" : "zoom-in" }}
            alt="Zoom do aluno"
          />
          <button
            onClick={() => setModalOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-red-500 bg-black/50 rounded-full p-2"
          >
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
}
