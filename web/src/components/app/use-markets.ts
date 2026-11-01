"use client";

import { useEffect, useState } from "react";
import type { MarketRow } from "@/lib/markets";

export type Markets = { rows: MarketRow[]; live: boolean; minOrderUsd: number };

/** Market rows from /api/markets, refreshed every 60 seconds. */
export function useMarkets() {
  const [data, setData] = useState<Markets | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/markets", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: Markets) => alive && setData(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return data;
}

export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
