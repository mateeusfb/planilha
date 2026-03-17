'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

export default function InputModal({ isOpen, onClose, onConfirm, title, placeholder, defaultValue = '', confirmLabel = 'Salvar' }: Props) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-card rounded-2xl p-5 md:p-6 w-[90%] max-w-sm shadow-xl border animate-modal-in">
        <h3 className="text-base font-bold mb-4 t-text">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder || 'Digite aqui...'}
            className="w-full px-3 py-2.5 border rounded-lg text-sm t-input focus:outline-none focus:ring-2 focus:ring-blue-100 mb-4"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border t-border rounded-lg text-sm font-semibold t-text hover:opacity-80 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={!value.trim()}
              className="px-4 py-2 t-accent-bg text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in { animation: modalIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}
