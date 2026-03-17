"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useImageSearch } from "@/hooks/useImageSearch";
import { validateImageUrl, fileToBase64 } from "@/lib/images";

type Tab = "search" | "url" | "upload";

interface ImageSearchModalProps {
  defaultTab?: Tab;
  onSelect: (url: string, attribution?: string, source?: "search" | "url" | "upload") => void;
  onClose: () => void;
}

export default function ImageSearchModal({
  defaultTab = "search",
  onSelect,
  onClose,
}: ImageSearchModalProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-3xl max-h-[80vh] flex flex-col border-2 border-black"
        >
          {/* Tab bar */}
          <div className="flex border-b-2 border-black shrink-0">
            {([
              { id: "search" as Tab, label: "Search" },
              { id: "url" as Tab, label: "Paste URL" },
              { id: "upload" as Tab, label: "Upload" },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${
                  tab === t.id
                    ? "bg-black text-white"
                    : "bg-white text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={onClose}
              className="px-4 text-neutral-400 hover:text-black text-lg"
            >
              ✕
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === "search" && <SearchTab onSelect={onSelect} />}
            {tab === "url" && <PasteUrlTab onSelect={onSelect} />}
            {tab === "upload" && <UploadTab onSelect={onSelect} />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Search Tab ──────────────────────────────────────────

function SearchTab({ onSelect }: { onSelect: ImageSearchModalProps["onSelect"] }) {
  const { results, loading, search, loadMore, provider } = useImageSearch();
  const [input, setInput] = useState("");

  const handleSearch = () => {
    if (input.trim()) search(input.trim());
  };

  if (!provider) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-neutral-600 mb-4">No image search API configured.</p>
        <p className="text-xs text-neutral-400">
          Add a key to <code className="bg-neutral-100 px-1">.env.local</code>:
        </p>
        <div className="mt-3 text-left bg-neutral-50 border border-neutral-200 p-4 text-xs font-mono">
          <p># Unsplash (recommended)</p>
          <p>NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_key</p>
          <br />
          <p># Or Pexels</p>
          <p>NEXT_PUBLIC_PEXELS_API_KEY=your_key</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={`Search ${provider} for images...`}
          className="flex-1 border-2 border-black px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {loading && results.length === 0 && (
        <div className="text-center py-8 text-neutral-400 text-sm">Searching...</div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {results.map((result) => (
          <button
            key={result.id}
            onClick={() => onSelect(result.url, result.photographer, "search")}
            className="relative overflow-hidden border border-transparent hover:border-black aspect-video"
          >
            <img
              src={result.thumbUrl}
              alt={result.alt}
              className="w-full h-full object-cover"
            />
            {result.photographer && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">
                {result.photographer}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Load More */}
      {results.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black disabled:text-neutral-200 border-2 border-neutral-300 hover:border-black px-6 py-2 transition-colors"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Paste URL Tab ───────────────────────────────────────

function PasteUrlTab({ onSelect }: { onSelect: ImageSearchModalProps["onSelect"] }) {
  const [url, setUrl] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!url.trim()) {
      setValid(null);
      return;
    }
    setChecking(true);
    const timeout = setTimeout(() => {
      validateImageUrl(url).then((ok) => {
        setValid(ok);
        setChecking(false);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [url]);

  return (
    <div>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste an image URL..."
        className="w-full border-2 border-black px-3 py-2 text-sm outline-none mb-4"
      />

      {/* Live preview */}
      {url && (
        <div className="mb-4">
          {checking && (
            <div className="text-xs text-neutral-400">Checking...</div>
          )}
          {valid === true && (
            <div className="border-2 border-black">
              <img
                src={url}
                alt="Preview"
                className="max-h-64 w-full object-contain bg-neutral-50"
              />
            </div>
          )}
          {valid === false && !checking && (
            <div className="border-2 border-red-400 bg-red-50 p-4 text-center text-sm text-red-600">
              Couldn&apos;t load image
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onSelect(url, undefined, "url")}
        disabled={!valid}
        className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Use this image
      </button>
    </div>
  );
}

// ─── Upload Tab ──────────────────────────────────────────

function UploadTab({ onSelect }: { onSelect: ImageSearchModalProps["onSelect"] }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await fileToBase64(file);
      setPreview(result.dataUri);
      setWarning(result.warning ?? null);
    } catch (err) {
      setWarning(err instanceof Error ? err.message : "Failed to read file");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed p-12 text-center cursor-pointer mb-4 ${
          dragOver ? "border-black bg-neutral-100" : "border-neutral-300 hover:border-neutral-500"
        }`}
      >
        <p className="text-sm text-neutral-500">
          Drop image here or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Warning */}
      {warning && (
        <p className="text-xs text-amber-600 mb-3">{warning}</p>
      )}

      {/* Preview */}
      {preview && (
        <div className="mb-4 border-2 border-black">
          <img
            src={preview}
            alt="Upload preview"
            className="max-h-64 w-full object-contain bg-neutral-50"
          />
        </div>
      )}

      <button
        onClick={() => preview && onSelect(preview, undefined, "upload")}
        disabled={!preview}
        className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Use this image
      </button>
    </div>
  );
}
