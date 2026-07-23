import { useEffect } from 'react';

// On-brand replacement for window.confirm() - same overlay/card convention
// as GameListModal, so a delete confirmation doesn't look like the browser
// chrome dropped in uninvited.
export default function ConfirmDialog({ message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
