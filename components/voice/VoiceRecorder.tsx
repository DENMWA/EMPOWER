"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, X } from "lucide-react";
import { getStoredAccessToken } from "@/lib/supabase-rest";

type RecorderState = "idle" | "requesting" | "recording" | "transcribing";
const MAX_RECORDING_MS = 5 * 60 * 1000;

export function VoiceRecorder({ onTranscript, compact = false }: { onTranscript: (transcript: string) => void; compact?: boolean }) {
  const [state, setState] = useState<RecorderState>("idle");
  const [supported, setSupported] = useState(true);
  const [manualText, setManualText] = useState("");
  const [message, setMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    setSupported(typeof navigator.mediaDevices?.getUserMedia === "function" && "MediaRecorder" in window);
    return stopMedia;
  }, []);

  function stopMedia() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    timerRef.current = null;
    elapsedRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (typeof navigator.mediaDevices?.getUserMedia !== "function" || !("MediaRecorder" in window)) {
      setSupported(false);
      setMessage("Voice recording is not supported by this browser. Type or paste the note below.");
      return;
    }

    setState("requesting");
    setMessage("Waiting for microphone permission...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mimeType = selectRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        stopMedia();
        setState("idle");
        setMessage("Recording failed. Your typed note is unchanged; try again or use the transcript box.");
      };
      recorder.onstop = () => cancelledRef.current ? void setState("idle") : void transcribeRecording(recorder.mimeType || mimeType || "audio/webm");
      recorder.start(1000);
      setState("recording");
      setElapsedSeconds(0);
      elapsedRef.current = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
      setMessage("Recording. Tap stop when finished.");
      timerRef.current = setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_RECORDING_MS);
    } catch (error) {
      stopMedia();
      setState("idle");
      const name = error instanceof DOMException ? error.name : "";
      setMessage(name === "NotAllowedError" || name === "SecurityError"
        ? "Microphone access was denied. Allow microphone access in browser settings or type the note below."
        : name === "NotFoundError"
          ? "No microphone was found on this device. Type or paste the note below."
          : "The microphone could not start. Check the device microphone and try again.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    stopMedia();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    chunksRef.current = [];
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    stopMedia();
    setState("idle");
    setMessage("Recording cancelled. Your note is unchanged.");
  }

  async function transcribeRecording(mimeType: string) {
    stopMedia();
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    if (!blob.size) {
      setState("idle");
      setMessage("No audio was captured. Check the microphone and try again.");
      return;
    }

    setState("transcribing");
    setMessage("Creating transcript...");
    try {
      const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.append("audio", blob, `progress-note.${extension}`);
      const response = await fetch("/api/ai/transcribe-note", {
        method: "POST",
        headers: { Authorization: `Bearer ${getStoredAccessToken()}` },
        body: form
      });
      const result = await response.json() as { transcript?: string; message?: string };
      if (!response.ok || !result.transcript?.trim()) throw new Error(result.message || "No transcript was returned.");
      const transcript = result.transcript.trim();
      setManualText(transcript);
      onTranscript(transcript);
      setMessage("Transcript captured. Review it before submitting the note.");
    } catch (error) {
      setMessage(error instanceof Error ? `${error.message} The recording was not saved; try again or type the note below.` : "Transcription failed. Try again or type the note below.");
    } finally {
      setState("idle");
    }
  }

  function useManualTranscript() {
    const transcript = manualText.trim();
    if (!transcript) return setMessage("Enter or paste a transcript first.");
    onTranscript(transcript);
    setMessage("Transcript added to the note.");
  }

  const busy = state === "requesting" || state === "transcribing";
  return (
    <div className={compact ? "min-w-0" : "rounded-md border border-slate-200 bg-white p-4"}>
      {state === "recording" ? <p role="status" aria-live="polite" className="mb-2 text-center text-sm font-semibold text-red-700">Recording · {formatElapsed(elapsedSeconds)}</p> : null}
      <div className="flex gap-2">
      <button type="button" disabled={busy || !supported} onClick={state === "recording" ? stopRecording : startRecording} aria-pressed={state === "recording"} aria-label={state === "recording" ? "Stop recording" : "Record progress note"} className={`${compact ? "min-h-11 flex-1 px-4 text-sm" : "min-h-14 w-full px-5 text-base"} inline-flex items-center justify-center gap-2 rounded-md bg-sea font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400`}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : state === "recording" ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
        {state === "requesting" ? "Allow microphone" : state === "transcribing" ? "Transcribing" : state === "recording" ? "Finish" : "Record"}
      </button>
      {state === "recording" ? <button type="button" onClick={cancelRecording} aria-label="Cancel recording" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700"><X size={17} aria-hidden="true" />Cancel</button> : null}
      </div>
      {!compact ? <><p className="mt-3 text-sm text-slate-600">Audio is transcribed securely after you stop recording. The recording itself is not retained.</p>
      <label className="mt-4 block text-sm font-semibold text-slate-700">Transcript<textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-slate-50 p-3 leading-6 text-ink" value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder="Type, paste, or edit the voice transcript here." /></label>
      <button type="button" onClick={useManualTranscript} className="mt-3 inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">Use transcript</button></> : null}
      {message ? <p role="status" className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{message}</p> : null}
    </div>
  );
}

function formatElapsed(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function selectRecordingMimeType() {
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}
