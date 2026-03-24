"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  User,
} from "lucide-react";
// Importa o cliente do Supabase do seu PGE
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("Colega");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Busca o usuário logado no Supabase para personalizar a saudação
  useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let nome = "Colega";

      if (user) {
        // Tenta pegar o nome do metadata ou extrai o início do e-mail
        const rawName =
          user.user_metadata?.full_name ||
          user.user_metadata?.nome ||
          user.email?.split("@") ||
          "Colega";
        // Deixa a primeira letra maiúscula
        nome = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      }

      setNomeUsuario(nome);

      // Define a mensagem inicial com o nome da pessoa!
      setMessages([
        {
          id: "initial",
          role: "assistant",
          content: `Olá, **${nome}**! 👋 \n\nSou o **CPD-Bot**, assistente especialista do Portal PGE. Como posso te ajudar hoje? Posso te explicar onde achar menus ou pra que serve cada botão!`,
        },
      ]);
    }
    carregarUsuario();
  }, []);

  // 2. Rola o chat para baixo automaticamente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "assistant",
          content:
            "Ops, tive um erro técnico 🤯. Pode tentar me perguntar de novo em alguns instantes?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "Onde eu lanço uma ocorrência?",
    "Como usar a IA no Sorteio?",
    "Pra que serve o Financeiro?",
    "Onde pesquiso um aluno?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end no-print">
      {/* Balão do Chat com animação suave de Zoom e Fade */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 w-[380px] h-[520px] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-6 zoom-in-95 duration-300">
          {/* Header Elegante (Gradiente PGE) */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex justify-between items-center text-white shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm border border-white/30">
                <Bot size={22} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-1.5">
                  CPD-Bot
                </h3>
                <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Online e Pronto
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Avatar do usuário vs Robô ao lado das mensagens */}
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot size={14} className="text-orange-600" />
                  </div>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-slate-800 text-white rounded-br-sm shadow-md"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: m.content.replace(
                      /\*\*(.*?)\*\*/g,
                      "<strong>$1</strong>",
                    ),
                  }}
                />
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                    <User
                      size={14}
                      className="text-slate-600 dark:text-slate-300"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Animação de Carregando (Digitando...) */}
            {isLoading && (
              <div className="flex justify-start items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-orange-600" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  ></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input & Menus Rápidos */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
            {/* Menus Rápidos (Ocultos se houver conversa rolando) */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border dark:border-slate-700 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <Sparkles size={12} className="text-orange-400" /> {q}
                  </button>
                ))}
              </div>
            )}

            {/* Barra de Digitação */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte ao CPD-Bot..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-2 ring-orange-500 placeholder:text-slate-400 border border-transparent focus:border-orange-200 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-orange-500 text-white rounded-2xl p-3 hover:bg-orange-600 transition-all shadow-md disabled:opacity-50 disabled:scale-100 active:scale-95"
              >
                <SendHorizontal size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Botão Flutuante (Animação estilo Resolve TI) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90 group relative ${
          isOpen
            ? "bg-slate-200 dark:bg-slate-800 text-slate-500 rotate-90"
            : "bg-gradient-to-tr from-orange-500 to-orange-600 text-white hover:shadow-orange-500/40 hover:-translate-y-1"
        }`}
      >
        {isOpen ? (
          <X size={26} />
        ) : (
          <MessageCircle size={26} className="group-hover:animate-pulse" />
        )}

        {/* Bolinha Pulsante de "Online" */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white dark:border-slate-950"></span>
          </span>
        )}
      </button>
    </div>
  );
}
