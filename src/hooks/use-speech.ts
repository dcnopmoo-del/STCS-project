import { useCallback, useEffect, useRef, useState } from "react";

// Minimal types for the Web Speech API (not in lib.dom by default)
type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const getRecognitionCtor = (): SRConstructor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const isSpeechRecognitionSupported = () => getRecognitionCtor() !== null;
export const isSpeechSynthesisSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const useSpeechRecognition = (onTranscript: (text: string) => void) => {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return false;
    if (recRef.current) recRef.current.stop();
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      if (text.trim()) cbRef.current(text.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, []);

  useEffect(() => () => recRef.current?.stop(), []);

  return { listening, start, stop, supported: isSpeechRecognitionSupported() };
};

// Strip markdown / learning-marker noise before reading aloud
const cleanForSpeech = (text: string) => {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#>~]+/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

export const useSpeechSynthesis = () => {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: string, text: string) => {
    if (!isSpeechSynthesisSupported()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
    utter.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
    utterRef.current = utter;
    setSpeakingId(id);
    window.speechSynthesis.speak(utter);
  }, []);

  useEffect(() => () => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
  }, []);

  return { speak, stop, speakingId, supported: isSpeechSynthesisSupported() };
};
