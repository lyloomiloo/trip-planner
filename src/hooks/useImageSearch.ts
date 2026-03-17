"use client";

import { useState, useCallback } from "react";
import { searchImages, getConfiguredProvider } from "@/lib/images";
import type { SearchResult } from "@/lib/images";

export function useImageSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const provider = getConfiguredProvider();

  const search = useCallback(async (q: string, p: number = 1) => {
    if (!q.trim()) return;
    setQuery(q);
    setPage(p);
    setLoading(true);
    try {
      const data = await searchImages(q.trim(), 12, p);
      if (p === 1) {
        setResults(data);
      } else {
        // Append to existing results
        setResults((prev) => [...prev, ...data]);
      }
    } catch {
      if (p === 1) setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!query.trim() || loading) return;
    const nextPage = page + 1;
    await search(query, nextPage);
  }, [query, page, loading, search]);

  const clear = useCallback(() => {
    setResults([]);
    setQuery("");
    setPage(1);
  }, []);

  return { results, loading, query, page, search, loadMore, clear, provider };
}
