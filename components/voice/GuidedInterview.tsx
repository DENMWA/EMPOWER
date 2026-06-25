"use client";

import { useState } from "react";
import { guidedProgressQuestions } from "@/lib/voice-accessibility";
import { Volume2 } from "lucide-react";

export function GuidedInterview({ onComplete }: { onComplete: (transcript: string) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [current, setCurrent] = useState("");

  function speakQuestion() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(guidedProgressQuestions[step]));
    }
  }

  function saveAnswer() {
    const next = [...answers, current];
    setAnswers(next);
    setCurrent("");
    if (step + 1 >= guidedProgressQuestions.length) {
      onComplete(next.join(" "));
      return;
    }
    setStep(step + 1);
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4" id="guided">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sea">Question {step + 1} of {guidedProgressQuestions.length}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{guidedProgressQuestions[step]}</h3>
        </div>
        <button type="button" onClick={speakQuestion} className="rounded-md border border-slate-300 p-3" aria-label="Read question aloud">
          <Volume2 aria-hidden="true" size={20} />
        </button>
      </div>
      <textarea
        className="mt-4 min-h-28 w-full rounded-md border border-slate-300 p-3"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        aria-label="Guided interview answer"
        placeholder="Type the answer or paste dictated text here."
      />
      <button type="button" onClick={saveAnswer} className="mt-3 inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white">
        {step + 1 >= guidedProgressQuestions.length ? "Finish Interview" : "Save and Continue"}
      </button>
    </div>
  );
}
