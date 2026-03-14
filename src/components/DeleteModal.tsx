'use client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message?: string;
}

export default function DeleteModal({ isOpen, onClose, onConfirm, message }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-card rounded-2xl p-7 w-full max-w-md shadow-xl border">
        <h3 className="text-base font-bold mb-3">Confirmar exclusao</h3>
        <p className="text-sm text-slate-500 mb-5">
          {message || 'Tem certeza que deseja excluir este lancamento? Esta acao nao pode ser desfeita.'}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer">Excluir</button>
        </div>
      </div>
    </div>
  );
}
