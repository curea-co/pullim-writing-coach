"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API types — not yet in TypeScript 5.9 lib.dom (only sub-types like SpeechRecognitionResult exist)
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type Ctor = new () => SpeechRecognition;
function getCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognition {
  // null = 아직 판정 전(첫 렌더). SSR/CSR 첫 렌더 일치 + '미지원' 깜빡임 방지 — 호스트는 null이면 중립 표시.
  supported: boolean | null; listening: boolean; interim: string; error: string | null;
  start: () => void; stop: () => void;
}

export function useSpeechRecognition(opts: { lang?: string; onResult: (finalText: string) => void }): UseSpeechRecognition {
  const { lang = "ko-KR", onResult } = opts;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const listeningRef = useRef(false);
  onResultRef.current = onResult;

  const stop = useCallback(() => { recRef.current?.stop(); }, []);

  const start = useCallback(() => {
    const C = getCtor();
    if (!C) { setError("unsupported"); return; }
    if (listeningRef.current) return;
    setError(null);
    const rec = new C();
    rec.lang = lang; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let it = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) { const t = r[0].transcript.trim(); if (t) onResultRef.current(t); }
        else it += r[0].transcript;
      }
      setInterim(it);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setError(e.error);
      setListening(false);
      setInterim("");
      listeningRef.current = false;
    };
    rec.onend = () => { setListening(false); setInterim(""); listeningRef.current = false; };
    try {
      rec.start();
      recRef.current = rec;
      listeningRef.current = true;
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.name : "start-failed");
      setListening(false);
      listeningRef.current = false;
      recRef.current = null;
    }
  }, [lang]);

  useEffect(() => () => { recRef.current?.stop(); }, []);
  useEffect(() => { setSupported(getCtor() !== null); }, []);

  return { supported, listening, interim, error, start, stop };
}
