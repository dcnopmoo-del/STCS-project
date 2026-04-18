import { useEffect, useState } from "react";

export type LanguagePref = "auto" | "en" | "ar";

const KEY = "tutor-language-pref";

export function useLanguage() {
  const [language, setLanguage] = useState<LanguagePref>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = localStorage.getItem(KEY) as LanguagePref | null;
    return stored ?? "auto";
  });

  useEffect(() => {
    localStorage.setItem(KEY, language);
  }, [language]);

  return { language, setLanguage };
}
