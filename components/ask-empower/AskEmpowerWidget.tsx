"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi, I am Ask Empower. I can help with EmpowerNotes features, FAQs, plans, billing, setup and workflows."
};

export function AskEmpowerWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busy) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: cleanQuestion };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setBusy(true);

    const token = getStoredAccessToken();
    try {
      const response = await fetch("/api/ask-empower", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: cleanQuestion, path: window.location.pathname }),
        cache: "no-store"
      });
      const result = await response.json() as { answer?: string; error?: string };
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.answer || result.error || "Ask Empower could not answer that just now."
      }]);
    } catch {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Ask Empower is temporarily unavailable. Try again shortly."
      }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open ? (
        <section className="mb-3 flex h-[34rem] max-h-[calc(100vh-7rem)] w-[min(calc(100vw-2rem),25rem)] flex-col overflow-hidden rounded-lg border border-teal-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]" aria-label="Ask Empower assistant">
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-900 via-slate-900 to-sky-900 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-white/12 ring-1 ring-white/20">
                <Bot size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold">Ask Empower</h2>
                <p className="text-xs text-teal-50">Features, plans and billing</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-md text-white hover:bg-white/10" aria-label="Close Ask Empower">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="premium-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("max-w-[88%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm", message.role === "user" ? "ml-auto bg-teal-800 text-white" : "border border-slate-200 bg-white text-slate-700")}>
                {message.content}
              </div>
            ))}
            {busy ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                Thinking
              </div>
            ) : null}
          </div>
          <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3">
            <label className="sr-only" htmlFor="ask-empower-question">Ask Empower a question</label>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                id="ask-empower-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Ask about plans, billing, notes, rosters..."
                className="min-h-12 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              <button type="submit" disabled={busy || !question.trim()} className="grid h-12 w-12 place-items-center rounded-md bg-teal-800 text-white shadow-sm hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send question to Ask Empower">
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-teal-900 px-4 text-sm font-bold text-white shadow-[0_18px_45px_rgba(15,118,110,0.35)] ring-1 ring-white/70 hover:bg-slate-950"
        aria-expanded={open}
        aria-controls="ask-empower-question"
      >
        <Sparkles size={18} aria-hidden="true" />
        Ask Empower
      </button>
    </div>
  );
}
