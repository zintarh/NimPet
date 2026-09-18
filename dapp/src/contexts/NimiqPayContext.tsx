"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const NimiqPayContext = createContext<boolean | null>(null);

export function NimiqPayProvider({ children }: { children: ReactNode }) {
  const [isNimiqPay, setIsNimiqPay] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    // init() only resolves once Nimiq Pay injects its providers into the
    // WebView — outside Nimiq Pay it never resolves, so race it against a
    // short timeout instead of awaiting it unconditionally.
    import("@nimiq/mini-app-sdk")
      .then(({ init }) => init())
      .then(() => {
        if (!cancelled) setIsNimiqPay(true);
      })
      .catch(() => {
        if (!cancelled) setIsNimiqPay(false);
      });

    const timeout = setTimeout(() => {
      if (!cancelled) setIsNimiqPay((prev) => (prev === null ? false : prev));
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <NimiqPayContext.Provider value={isNimiqPay}>
      {children}
    </NimiqPayContext.Provider>
  );
}

export function useNimiqPayContext(): boolean | null {
  return useContext(NimiqPayContext);
}
