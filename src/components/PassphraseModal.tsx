"use client";

import { useState } from "react";

interface PassphraseModalProps {
  tripId: string;
  mode: "create" | "enter";
  onSuccess: (passphrase: string) => void;
  onCancel: () => void;
  onViewOnly?: () => void;
}

export default function PassphraseModal({
  tripId,
  mode,
  onSuccess,
  onCancel,
  onViewOnly,
}: PassphraseModalProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isCreate = mode === "create";
  const canSubmit = isCreate
    ? passphrase.length > 0 && passphrase === confirm
    : passphrase.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setError("");
    setLoading(true);

    if (isCreate) {
      onSuccess(passphrase);
      setLoading(false);
      return;
    }

    // "enter" mode — verify passphrase via API
    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/verify?passphrase=${encodeURIComponent(passphrase)}`
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.valid) {
        onSuccess(passphrase);
      } else {
        setError("Incorrect passphrase");
      }
    } catch {
      setError("Failed to verify — check your connection");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onCancel();
  };

  const inputClass = (hasError: boolean) =>
    `w-full border-2 ${
      hasError ? "border-red-500" : "border-black"
    } bg-white px-3 py-2 text-sm font-bold tracking-wide focus:outline-none focus:ring-0`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm bg-white border-2 border-black p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-lg font-bold uppercase tracking-widest text-black mb-1">
          {isCreate ? "Publish Your Trip" : "Enter Passphrase"}
        </h2>
        {isCreate ? (
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#C80815] mb-2">
              Save &amp; access your edits from any device
            </p>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Set a passphrase to publish your trip to the cloud. You&apos;ll need this passphrase to access and edit your trip again. Share the trip ID + passphrase with travel companions so they can edit too.
            </p>
          </div>
        ) : (
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-6">
            To edit this trip
          </p>
        )}

        {/* Passphrase input */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
            Passphrase
          </label>
          <div className="relative">
            <input
              autoFocus
              type={showPassword ? "text" : "password"}
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter passphrase..."
              className={inputClass(!!error)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Confirm input (create mode only) */}
        {isCreate && (
          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
              Confirm
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Confirm passphrase..."
              className={inputClass(
                isCreate && confirm.length > 0 && passphrase !== confirm
              )}
            />
            {confirm.length > 0 && passphrase !== confirm && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mt-1">
                Passphrases do not match
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-4">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={isCreate ? onCancel : (onViewOnly ?? onCancel)}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
          >
            {isCreate ? "Skip (local only)" : "View Only"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={`border-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 ${
              isCreate
                ? "border-[#C80815] bg-[#C80815] text-white hover:bg-[#a00610]"
                : "border-black bg-black text-white hover:bg-neutral-800"
            }`}
          >
            {loading ? "..." : isCreate ? "Publish" : "Enter"}
          </button>
        </div>
      </div>
    </div>
  );
}
