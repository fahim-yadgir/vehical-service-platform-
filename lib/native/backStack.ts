import { useEffect, useRef } from "react";

// Popups, drawers and sheets register here while they are open. The Android back button then
// closes the top-most one first, and only goes back a page when nothing is open.
const stack: Array<() => void> = [];

/** Run the most recently opened handler. Returns false when nothing is open. */
export function runTopBackHandler(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}

/** Call from any popup: `useBackHandler(open, onClose)`. A no-op handler blocks back (forced popups). */
export function useBackHandler(active: boolean, onBack: () => void) {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    const handler = () => latest.current();
    stack.push(handler);
    return () => {
      const i = stack.lastIndexOf(handler);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}