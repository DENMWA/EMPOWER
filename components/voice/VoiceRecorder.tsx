"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceRecorder({ onTranscript }: { onTranscript: (transcript: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const [manualText, setManualText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const liveTextRef = useRef("");

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(Recognition));
    return () => recognitionRef.current?.abort();
  }, []);

  function startRecording() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setSupported(false);
      setMessage("Voice capture is not available in this browser. Type or paste the dictated note below.");
      return;
    }

    const recognition = new Recognition();
    finalTranscriptRef.current = "";
    liveTextRef.current = "";
    setLiveText("");
    setMessage("Listening. Speak naturally, then stop when finished.");
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-AU";
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalTranscriptRef.current += `${result[0].transcript} `;
        } else {
          interim += result[0].transcript;
        }
      }
      const nextText = `${finalTranscriptRef.current}${interim}`.trim();
      liveTextRef.current = nextText;
      setLiveText(nextText);
    };
    recognition.onerror = () => {
      setRecording(false);
      setMessage("Voice capture stopped. You can edit or paste the transcript below.");
    };
    recognition.onend = () => {
      setRecording(false);
      const transcript = finalTranscriptRef.current.trim() || liveTextRef.current.trim();
      if (transcript) {
        setManualText(transcript);
        onTranscript(transcript);
        setMessage("Transcript captured. Review it below before improving the note.");
      }
    };
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  function useManualTranscript() {
    const transcript = manualText.trim();
    if (!transcript) {
      setMessage("Enter or paste a transcript first.");
      return;
    }
    onTranscript(transcript);
    setMessage("Transcript added to the note workflow.");
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording note" : "Record note"}
        className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-sea px-5 text-base font-semibold text-white hover:bg-teal-800"
      >
        {recording ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
        {recording ? "Stop Recording" : "Record Note"}
      </button>
      <p className="mt-3 text-sm text-slate-600">
        {recording ? "Recording live speech. Tap stop when finished." : supported ? "Uses browser speech recognition where available." : "Voice capture is not available in this browser. Use the transcript box below."}
      </p>
      {liveText ? <p className="mt-3 rounded-md bg-sky-50 p-3 text-sm leading-6 text-sky-900">{liveText}</p> : null}
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Transcript fallback
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-slate-50 p-3 leading-6"
          value={manualText}
          onChange={(event) => setManualText(event.target.value)}
          placeholder="Type, paste, or edit the voice transcript here."
        />
      </label>
      <button type="button" onClick={useManualTranscript} className="mt-3 inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
        Use transcript
      </button>
      {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
    </div>
  );
}
