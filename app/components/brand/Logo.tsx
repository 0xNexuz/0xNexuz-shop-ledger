import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

import { usePreloaderHolds } from "./preloader-store";

import { LOGO_CSS, logoLockupSvg, logoMarkSvg } from "../../../shared/brand-logo";

/** Logo colours and animation, inlined once per document (React dedupes by href). */
export function LogoStyles() {
  return (
    <style href="shop-ledger-logo" precedence="default">
      {LOGO_CSS}
    </style>
  );
}

function useClipId() {
  // The tile clips the drawing, so each mark on the page needs its own id.
  return `sl-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * The square mark: the shop owner's head and gele on a navy tile.
 * `loading` runs the pleat wave used by the preloader. Static markup from
 * shared/brand-logo.ts (constants, never user input).
 */
export function LogoMark({
  className,
  loading = false,
  decorative = false,
}: {
  className?: string;
  loading?: boolean;
  /** Hide from assistive tech when a visible label sits beside it. */
  decorative?: boolean;
}) {
  const clipId = useClipId();
  const svg = logoMarkSvg(clipId, loading ? "sl-mark--loading" : "");
  return (
    <>
      <LogoStyles />
      <span
        className={cn("block", className)}
        aria-hidden={decorative || undefined}
        dangerouslySetInnerHTML={{
          __html: decorative ? svg.replace(' role="img" aria-label="Shop Ledger"', "") : svg,
        }}
      />
    </>
  );
}

/** The full lockup: the owner beside SHOP / LEDGER. */
export function LogoLockup({
  className,
  onDark = false,
  intro = false,
  doodle = false,
}: {
  className?: string;
  onDark?: boolean;
  intro?: boolean;
  /** Loop the draw-on (preloader). */
  doodle?: boolean;
}) {
  const modifiers = [onDark && "sl-logo--on-dark", intro && "sl-logo--intro", doodle && "sl-logo--doodle"]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <LogoStyles />
      <span className={cn("block", className)} dangerouslySetInnerHTML={{ __html: logoLockupSvg(modifiers) }} />
    </>
  );
}

/**
 * Shown while the app opens (server-rendered, so it paints before any script
 * runs): the logo is doodled line by line, its letters traced as if carved,
 * then coloured in, on a loop. Without `instant` the content fades in after a
 * beat, so a very fast load shows only the page colour.
 */
export function Preloader({ instant = false, leaving = false }: { instant?: boolean; leaving?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sl-preloader fixed inset-0 z-50 flex items-center justify-center bg-background px-4 text-foreground",
        instant && "sl-preloader--instant",
        leaving && "sl-preloader--leaving",
      )}
    >
      <div className="sl-preloader-inner flex flex-col items-center gap-4 text-center">
        <LogoLockup doodle className="w-[min(300px,72vw)]" />
        <p className="text-sm text-muted-foreground">Opening your books…</p>
      </div>
    </div>
  );
}

const SPLASH_SEEN_KEY = "shop-ledger:splash-seen";
/** How long the opening screen stays up, counted from when the page started loading. */
const SPLASH_MIN_MS = 1500;

function splashAlreadySeen(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The app's one loading overlay. On the first app load of a browser session it
 * takes over from the server-rendered preloader (same picture, so no jump) and
 * stays long enough for the logo to be drawn; it also stays up while a screen
 * holds it (see preloader-store), then fades. Reloads in the same session and
 * reduced-motion visitors skip the minimum time.
 */
export function StartupSplash() {
  const holds = usePreloaderHolds();
  const [shown, setShown] = useState(() => !splashAlreadySeen());
  const [minDone, setMinDone] = useState(() => splashAlreadySeen());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (minDone) return;
    try {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // Private mode without storage: the splash simply shows again next load.
    }
    const timer = window.setTimeout(() => setMinDone(true), Math.max(0, SPLASH_MIN_MS - performance.now()));
    return () => window.clearTimeout(timer);
  }, [minDone]);

  const wanted = holds.opens > 0 || (shown && (!minDone || holds.extends > 0));
  useEffect(() => {
    if (wanted) {
      setShown(true);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setShown(false);
      setLeaving(false);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [wanted, shown]);

  if (!shown) return null;
  return <Preloader instant leaving={leaving} />;
}
