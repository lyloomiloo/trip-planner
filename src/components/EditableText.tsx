"use client";

import { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export default function EditableText({
  value,
  onChange,
  className = "",
  inputClassName = "",
  placeholder = "",
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) {
      onChange(draft.trim());
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`editable-input ${inputClassName} ${className}`}
        placeholder={placeholder}
        style={{ width: `${Math.max(draft.length, placeholder.length, 6)}ch` }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`editable-hint ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-neutral-400">{placeholder}</span>}
    </span>
  );
}
