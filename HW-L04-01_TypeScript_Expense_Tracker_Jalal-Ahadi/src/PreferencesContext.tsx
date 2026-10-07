import { createContext, useContext, useMemo, useState } from "react";

type Preferences = {
  currency: "تومان" | "ریال";
  setCurrency: (value: "تومان" | "ریال") => void;
};

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<"تومان" | "ریال">("تومان");
  const value = useMemo(() => ({ currency, setCurrency }), [currency]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}
