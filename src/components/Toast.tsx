"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onDismiss, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (visible && duration > 0) {
      const t = setTimeout(onDismiss, duration);
      return () => clearTimeout(t);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
      <div className="bg-black text-white px-6 py-3 flex items-center gap-4 border-2 border-black shadow-lg">
        <span className="text-xs font-bold uppercase tracking-widest">
          {message}
        </span>
        <button
          onClick={onDismiss}
          className="text-white/50 hover:text-white text-xs font-bold"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
