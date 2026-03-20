"use client";

import { useState, useRef, useEffect } from "react";

interface EditableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function EditableTextarea({
  value,
  onChange,
  className = "",
  placeholder = "",
}: EditableTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize(textareaRef.current);
    }
  }, [editing]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) {
      onChange(draft.trim());
    }
  };

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          autoResize(e.target);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`editable-input w-full resize-none ${className}`}
        placeholder={placeholder}
        rows={3}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`editable-hint cursor-pointer ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-neutral-400">{placeholder}</span>}
    </div>
  );
}
