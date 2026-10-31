import { useId } from "react";

import { cn } from "@/lib/utils";

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
}: {
  className?: string;
  onDark?: boolean;
  intro?: boolean;
}) {
  const modifiers = [onDark ? "sl-logo--on-dark" : "", intro ? "sl-logo--intro" : ""].join(" ");
  return (
    <>
      <LogoStyles />
      <span className={cn("block", className)} dangerouslySetInnerHTML={{ __html: logoLockupSvg(modifiers) }} />
    </>
  );
}

/**
 * Shown while the app opens (server-rendered, so it paints before any script
 * runs). The content fades in after a beat, so a fast load shows nothing but
 * the page colour; a slow connection sees the gele pleats light up in turn.
 */
export function Preloader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sl-preloader fixed inset-0 z-50 flex items-center justify-center bg-background px-4 text-foreground"
    >
      <div className="sl-preloader-inner flex flex-col items-center gap-5 text-center">
        <LogoMark className="w-24" loading decorative />
        <div className="space-y-1">
          <p className="font-display text-2xl font-bold tracking-tight">Shop Ledger</p>
          <p className="text-sm text-muted-foreground">Opening your books…</p>
        </div>
        <span className="sl-preloader-line" aria-hidden="true">
          <span />
        </span>
      </div>
    </div>
  );
}
