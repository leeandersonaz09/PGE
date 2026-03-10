"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
import "react-quill-new/dist/quill.snow.css";
import {
  ArrowLeft,
  UploadCloud,
  Database,
  ChevronRight,
  Send,
  Users,
  Tag,
  Paperclip,
  Download,
  X,
} from "lucide-react";

import { useColigada } from "@/context/ColigadaContext";
import SelecaoSistema from "./SelecaoSistema";

// CSS GLOBAL DE BLINDAGEM E CORREÇÃO DE TRANSBORDAMENTO
const quillStyle = `
  .ql-container {
    background-color: white !important;
    color: #1e293b !important;
    font-size: 16px !important;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }
  .dark .ql-container {
    background-color: #1e293b !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
  }
  .ql-editor {
    min-height: 250px !important;
    color: #1e293b !important;
    word-break: break-word !important;
  }
  .dark .ql-editor {
    color: #e2e8f0 !important;
  }
  .ql-toolbar {
    background-color: #f8fafc !important;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    border-color: #cbd5e1 !important;
  }
  .dark .ql-toolbar {
    background-color: #0f172a !important;
    border-color: #334155 !important;
  }
  .dark .ql-snow .ql-stroke {
    stroke: #94a3b8;
  }
  .dark .ql-snow .ql-picker-label {
    color: #94a3b8;
  }
  .dark .ql-snow .ql-active .ql-stroke {
    stroke: #e2e8f0;
  }
  input, select {
    background-color: white !important;
    color: #1e293b !important;
    border: 1px solid #cbd5e1 !important;
  }
  .dark input, .dark select {
    background-color: #1e293b !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
  }
  input::placeholder {
    color: #94a3b8 !important;
  }
  .preview-content {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }
`;

// Carregamento dinâmico com cast 'as any' para evitar erro de build na Ref
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-slate-50 dark:bg-slate-800 animate-pulse rounded-xl" />
  ),
}) as any;

export default function MalaDiretaPage() {
  const { coligadaAtual } = useColigada();
  const [etapa, setEtapa] = useState(1);
  const [origem, setOrigem] = useState<"banco" | "planilha" | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [anexo, setAnexo] = useState<{ nome: string; conteudo: string } | null>(
    null,
  );
  const anexoRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<any>(null); // Ref para o editor Quill

  const [contatos, setContatos] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const modulosQuill = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["clean"],
    ],
  };

  // FUNÇÃO: Inserir tag na posição exata do cursor
  const inserirTagNoCursor = (tag: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const textoTag = `{{${tag}}}`;
      if (range) {
        quill.insertText(range.index, textoTag);
        quill.setSelection(range.index + textoTag.length);
      } else {
        const length = quill.getLength();
        quill.insertText(length - 1, textoTag);
      }
    }
  };

  const processarArquivo = (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        if (json.length === 0)
          return Swal.fire("Erro", "A planilha está vazia.", "error");
        setContatos(json);
        setTags(Object.keys(json[0] as object));
        setEtapa(2);
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0)
            return Swal.fire("Erro", "A planilha está vazia.", "error");
          setContatos(results.data);
          setTags(results.meta.fields || []);
          setEtapa(2);
        },
      });
    }
  };

  const handleSelecionarAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      setAnexo({ nome: file.name, conteudo: base64String });
    };
  };

  const handleDispararEmails = async () => {
    if (contatos.length === 0) return;
    const result = await Swal.fire({
      title: "Confirmar Disparo?",
      text: `Você enviará e-mails para ${contatos.length} destinatários.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      confirmButtonText: "Sim, disparar!",
    });
    if (!result.isConfirmed) return;
    setDisparando(true);
    try {
      const response = await fetch("/api/mala-direta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contatos, assunto, mensagem, tags, anexo }),
      });
      const data = await response.json();
      if (data.success) {
        Swal.fire(
          "Concluído!",
          `${data.enviados} e-mails enviados.`,
          "success",
        );
        setEtapa(1);
        setContatos([]);
        setAssunto("");
        setMensagem("");
        setAnexo(null);
        setOrigem(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      Swal.fire("Erro", error.message, "error");
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col font-sans">
      <style>{quillStyle}</style>

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-tight">
            <Send className="text-blue-600 dark:text-blue-500" /> Mala Direta
          </h1>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Unidade:{" "}
            <span className="text-blue-600 dark:text-blue-400">
              {coligadaAtual?.nome}
            </span>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full flex-1 p-6 mt-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 min-h-[500px]">
          {/* ETAPA 1 */}
          {etapa === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!origem ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-10">
                  <button
                    onClick={() => setOrigem("banco")}
                    className="p-12 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex flex-col items-center gap-4 group"
                  >
                    <div className="p-5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Database size={40} />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase">
                      Alunos do Sistema
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold text-center">
                      Filtre por série e turma direto do banco
                    </p>
                  </button>
                  <button
                    onClick={() => setOrigem("planilha")}
                    className="p-12 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex flex-col items-center gap-4 group"
                  >
                    <div className="p-5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <UploadCloud size={40} />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase">
                      Subir Planilha
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold text-center">
                      Use um arquivo Excel ou CSV externo
                    </p>
                  </button>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <button
                    onClick={() => setOrigem(null)}
                    className="mb-6 flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-widest transition-colors"
                  >
                    <X size={14} /> Voltar para Origem
                  </button>
                  {origem === "banco" ? (
                    <SelecaoSistema
                      onConfirm={(lista, tagsG) => {
                        setContatos(lista);
                        setTags(tagsG);
                        setEtapa(2);
                      }}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            (window.location.href =
                              "/modelo_mala_direta_PGE.xlsx")
                          }
                          className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl font-black border border-blue-200 dark:border-blue-800/50 uppercase tracking-widest"
                        >
                          <Download size={14} /> Baixar Modelo .XLSX
                        </button>
                      </div>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          processarArquivo(e.dataTransfer.files[0]);
                        }}
                        className={`p-20 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center text-center gap-4 cursor-pointer ${isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105" : "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"}`}
                        onClick={() => arquivoRef.current?.click()}
                      >
                        <UploadCloud
                          size={40}
                          className="text-slate-300 dark:text-slate-600"
                        />
                        <h3 className="font-bold text-slate-800 dark:text-slate-300 uppercase">
                          Arraste seu arquivo aqui
                        </h3>
                        <input
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          className="hidden"
                          ref={arquivoRef}
                          onChange={(e) =>
                            e.target.files &&
                            processarArquivo(e.target.files[0])
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2 */}
          {etapa === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 uppercase">
                  Compor Mensagem
                </h2>
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-xs uppercase tracking-tight flex items-center gap-2">
                  <Users size={14} /> {contatos.length} Destinatários
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1 mr-2">
                    <Tag size={12} /> Inserir Tag:
                  </span>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => inserirTagNoCursor(tag)}
                      className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-300 text-[10px] font-black uppercase rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 flex-1 flex flex-col">
                <input
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Assunto do E-mail"
                  className="w-full p-4 border border-slate-400 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 shadow-sm"
                />
                <div className="flex-1 flex flex-col mb-12 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={mensagem}
                    onChange={setMensagem}
                    modules={modulosQuill}
                  />
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setEtapa(1)}
                    className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    Voltar
                  </button>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      ref={anexoRef}
                      onChange={handleSelecionarAnexo}
                      className="hidden"
                    />
                    {!anexo ? (
                      <button
                        onClick={() => anexoRef.current?.click()}
                        className="flex items-center gap-2 px-5 py-3 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                      >
                        <Paperclip size={16} /> Anexar Arquivo
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-in zoom-in-95">
                        <Paperclip size={14} />{" "}
                        <span className="max-w-[120px] truncate">
                          {anexo.nome}
                        </span>
                        <button
                          onClick={() => setAnexo(null)}
                          className="ml-2 p-1 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (!assunto || !mensagem || mensagem === "<p><br></p>")
                          return Swal.fire(
                            "Campos Vazios",
                            "Preencha tudo.",
                            "warning",
                          );
                        setEtapa(3);
                      }}
                      className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200 dark:shadow-blue-900/50"
                    >
                      Revisar Envio <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: REVISÃO FINAL (AJUSTADA CONTRA TRANSBORDAMENTO) */}
          {etapa === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col h-full max-w-full">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 uppercase mb-6">
                Revisão Final
              </h2>
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 mb-6 shadow-inner max-w-full overflow-hidden">
                <div className="mb-4 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-3 uppercase text-[10px] tracking-widest break-all">
                  Para:{" "}
                  <span className="text-slate-900 dark:text-slate-200">
                    {contatos[0]?.email || contatos[0]?.Email}
                  </span>
                </div>
                <div className="mb-6 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-3 uppercase text-[10px] tracking-widest break-words">
                  Assunto:{" "}
                  <span className="text-slate-900 dark:text-slate-200">
                    {tags.reduce(
                      (txt, tag) =>
                        txt.replace(
                          new RegExp(`{{${tag}}}`, "g"),
                          contatos[0]?.[tag] || "",
                        ),
                      assunto,
                    )}
                  </span>
                </div>
                <div
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 rounded-2xl text-slate-800 dark:text-slate-200 min-h-[200px] shadow-sm leading-relaxed max-w-full overflow-x-auto break-words ql-editor preview-content"
                  dangerouslySetInnerHTML={{
                    __html: tags.reduce(
                      (txt, tag) =>
                        txt.replace(
                          new RegExp(`{{${tag}}}`, "g"),
                          `<strong class="text-blue-700 dark:text-blue-400">${contatos[0]?.[tag] || ""}</strong>`,
                        ),
                      mensagem,
                    ),
                  }}
                />
              </div>
              <div className="mt-auto flex justify-between items-center pt-4">
                <button
                  onClick={() => setEtapa(2)}
                  className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-300"
                >
                  Voltar e Editar
                </button>
                <button
                  onClick={handleDispararEmails}
                  disabled={disparando}
                  className="px-12 py-5 bg-green-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-green-700 active:scale-95 shadow-xl shadow-green-100 dark:shadow-green-900/50 disabled:opacity-50"
                >
                  {disparando
                    ? "DISPARANDO..."
                    : `Disparar para ${contatos.length} destinatários`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
