"use client";

import { useState, useCallback } from "react";
import { searchImages, getConfiguredProvider } from "@/lib/images";
import type { SearchResult } from "@/lib/images";

export function useImageSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const provider = getConfiguredProvider();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    try {
      const data = await searchImages(q.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setQuery("");
  }, []);

  return { results, loading, query, search, clear, provider };
}
