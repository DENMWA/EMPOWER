"use client";

import { useState } from "react";
import { Volume2, Pause } from "lucide-react";

export function ReadBackControls({ text }: { text: string }) {
  const [message, setMessage] = useState("Ready to read back.");

  function readAloud() {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(`${text}. Would you like to approve, edit, add more details, or save as draft?`);
      window.speechSynthesis.speak(utterance);
      setMessage("Reading note aloud...");
      return;
    }
    setMessage("Text-to-speech is not available in this browser.");
  }

  function stop() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setMessage("Read-back stopped.");
  }

  return (
    <div className="rounded-md border border-slate-200 bg-skySoft p-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={readAloud} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white">
          <Volume2 aria-hidden="true" size={18} /> Read note aloud
        </button>
        <button type="button" onClick={stop} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink">
          <Pause aria-hidden="true" size={18} /> Stop
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-700">{message}</p>
    </div>
  );
}
