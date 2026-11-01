"use client";

import { useEffect, useState } from "react";

/**
 * Debounced POST for live quotes. Pass `null` to skip quoting (e.g. invalid input).
 * State only changes inside the async callback, never synchronously in the effect.
 */
export function useQuote<T>(url: string, body: Record<string, unknown> | null) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null; loading: boolean }>({
    key: "",
    data: null,
    error: null,
    loading: false,
  });
  const key = body ? JSON.stringify(body) : "";

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, key, loading: true }));
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: key }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (!alive) return;
      setState(
        res?.ok
          ? { key, data: json as T, error: null, loading: false }
          : { key, data: null, error: json.error ?? "Couldn't get a quote. Try again.", loading: false },
      );
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [url, key]);

  // Only report results for the current input.
  const current = key !== "" && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: key !== "" && (!current || state.loading),
  };
}
