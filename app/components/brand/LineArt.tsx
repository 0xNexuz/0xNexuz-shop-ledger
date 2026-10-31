import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  BRAND_CSS,
  heroSceneHtml,
  SPOT_BOOK_SVG,
  SPOT_PHONE_SVG,
  SPOT_SHELF_SVG,
} from "../../../shared/brand-art";

// Static markup from shared/brand-art.ts (constants, never user input).
const SCENE_HTML = heroSceneHtml();
const SPOTS = { book: SPOT_BOOK_SVG, shelf: SPOT_SHELF_SVG, phone: SPOT_PHONE_SVG } as const;
export type SpotName = keyof typeof SPOTS;

/** The line-art and scene styles, inlined once per document (React dedupes by href). */
export function BrandStyles() {
  return (
    <style href="shop-ledger-brand-art" precedence="default">
      {BRAND_CSS}
    </style>
  );
}

/** The owner says what happened; the agent's ledger line appears. */
export function HeroScene({ className }: { className?: string }) {
  return (
    <>
      <BrandStyles />
      <div className={className} dangerouslySetInnerHTML={{ __html: SCENE_HTML }} />
    </>
  );
}

export function Spot({ name, className }: { name: SpotName; className?: string }) {
  return (
    <>
      <BrandStyles />
      <div className={cn("sl-spot", className)} dangerouslySetInnerHTML={{ __html: SPOTS[name] }} />
    </>
  );
}

/** An empty state: a small drawing, one line of explanation, and the next step if there is one. */
export function EmptyState({
  art,
  children,
  action,
  className,
}: {
  art: SpotName;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-7 text-center",
        className,
      )}
    >
      <Spot name={art} className="w-28" />
      <p className="max-w-xs text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}
