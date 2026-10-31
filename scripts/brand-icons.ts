/**
 * Writes the static brand files in public/ from shared/brand-logo.ts, so the
 * favicon, home-screen icons and logo files always match the in-app logo.
 *
 *   pnpm exec tsx scripts/brand-icons.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { brandIconSvg, brandLockupFileSvg } from "../shared/brand-logo.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const files: Record<string, string> = {
  "favicon.svg": brandIconSvg(32, false),
  "icon-180.svg": brandIconSvg(180, true),
  "icon-192.svg": brandIconSvg(192, true),
  "icon-512.svg": brandIconSvg(512, true),
  "brand/shop-ledger-logo.svg": brandLockupFileSvg(false),
  "brand/shop-ledger-logo-on-navy.svg": brandLockupFileSvg(true),
};

for (const [name, svg] of Object.entries(files)) {
  const path = join(publicDir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, svg);
  console.log(`wrote public/${name} (${svg.length} bytes)`);
}
