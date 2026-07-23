import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// Imperative on-brand replacement for window.confirm() - `await confirm(msg)`
// resolves true/false exactly like the browser built-in, but renders
// ConfirmDialog instead. Returns [confirm, dialog] - render `dialog`
// anywhere in the calling component's JSX (it's null until confirm() is
// actually called).
export function useConfirm() {
  const [pending, setPending] = useState(null); // { message, resolve } | null

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setPending({ message, resolve });
    });
  }, []);

  function resolve(result) {
    pending?.resolve(result);
    setPending(null);
  }

  const dialog = pending ? (
    <ConfirmDialog message={pending.message} onConfirm={() => resolve(true)} onCancel={() => resolve(false)} />
  ) : null;

  return [confirm, dialog];
}
