"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, X, MessageSquare, SendHorizontal, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "assistant",
      content:
        "Olá! Sou o **CPD-Bot**, assistente especialista do Portal PGE 🏫. Como posso te ajudar a usar o sistema hoje? Posso te explicar onde achar menus ou pra que serve cada botão!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        // userId: "id-do-usuario-logado" -> Pegar do contexto de auth no layout se necessário
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
            "Ops, tive um erro técnico 🤯. Tenta me perguntar de novo em alguns instantes, por favor.",
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
    "O que significa 'Inadimplente' aqui?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end no-print">
      {/* Balão do Chat */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 w-96 h-[500px] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <img
                src="/assets/bot-icon.png"
                alt="CPD Bot"
                className="h-9 w-9 object-contain bg-white rounded-full p-1"
              />
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
                  CPD-Bot
                </h3>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></div>{" "}
                  Especialista Portal PGE
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed ${m.role === "user" ? "bg-slate-900 text-white rounded-br-none" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border rounded-bl-none shadow-sm"}`}
                  dangerouslySetInnerHTML={{
                    __html: m.content.replace(
                      /\*\*(.*?)\*\*/g,
                      "<strong>$1</strong>",
                    ),
                  }}
                ></div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 border rounded-bl-none shadow-sm flex items-center gap-2">
                  <Bot size={14} className="animate-bounce" /> Analisando o
                  PGE...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
            {/* Perguntas Sugeridas (Ocultas se houver mensagens) */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border dark:border-slate-700 shadow-sm hover:border-orange-500 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tire sua dúvida sobre o PGE..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2.5 text-xs outline-none focus:ring-2 ring-orange-500 placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-slate-900 text-white rounded-full p-2.5 hover:bg-black transition-all shadow-md disabled:opacity-50"
              >
                <SendHorizontal size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Botão Flutuante (O Botão de Ouro) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-slate-900 text-white p-4 rounded-full shadow-2xl transition-all duration-300 group flex items-center gap-3 ${isOpen ? "rotate-90 scale-75 opacity-50" : "hover:bg-black hover:scale-110"}`}
      >
        <MessageSquare size={26} className="group-hover:animate-pulse" />
        <span className="text-xs font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-500">
          Ajuda PGE
        </span>
      </button>
    </div>
  );
}
