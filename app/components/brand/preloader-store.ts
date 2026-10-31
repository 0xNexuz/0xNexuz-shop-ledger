import { useEffect, useSyncExternalStore } from "react";

/**
 * Who is keeping the opening screen up. One overlay (StartupSplash) serves the
 * whole app so screens never hand over between separate loaders and blink.
 *
 * - "open" holds raise the overlay even when it is not showing (the sample
 *   shop being set up after "Try the demo").
 * - "extend" holds only keep an overlay that is already showing (the shop's
 *   first data load), so ordinary navigation still uses skeletons.
 */
let opens = 0;
let extendsCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return `${opens}:${extendsCount}`;
}

export function usePreloaderHold(active: boolean, mode: "open" | "extend" = "extend") {
  useEffect(() => {
    if (!active) return;
    if (mode === "open") opens += 1;
    else extendsCount += 1;
    emit();
    return () => {
      if (mode === "open") opens -= 1;
      else extendsCount -= 1;
      emit();
    };
  }, [active, mode]);
}

export function usePreloaderHolds() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "0:0");
  const [open, extend] = value.split(":").map(Number);
  return { opens: open ?? 0, extends: extend ?? 0 };
}
