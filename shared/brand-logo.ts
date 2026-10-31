/**
 * The Shop Ledger logo: the shop owner beside a heavy stacked wordmark, plus
 * a square mark (her head and gele on a navy tile) for icons, the sidebar and
 * the preloader. Original artwork; static SVG strings so the React app, the
 * server-rendered sign-in page and the icon files share one source.
 *
 * Colours come from CSS (LOGO_CSS) so one drawing works on light and navy.
 * The standalone icon files set them inline instead (see brandIconSvg).
 */

import { ownerFigure } from "./brand-art.js";
import { WORD_LEDGER, WORD_SHOP, WORD_TAGLINE } from "./brand-wordmark.js";

/** Faux-bold stroke on the letters, in font units, for the chunky look. */
const WORD_WEIGHT = 36;

function word(
  glyphs: { d: string; cap: number },
  x: number,
  top: number,
  capHeight: number,
  weight: number,
): string {
  const scale = (capHeight / glyphs.cap).toFixed(5);
  const stroke = weight
    ? ` stroke-width="${weight}" stroke-linejoin="round"`
    : ' stroke="none"';
  return `<g transform="translate(${x} ${top}) scale(${scale})"><path d="${glyphs.d}"${stroke}/></g>`;
}

/**
 * Full lockup, 1028 × 440: tagline, SHOP / LEDGER, and the owner whose
 * shoulder sits over the L. Add `sl-logo--on-dark` on navy and
 * `sl-logo--intro` to play the entrance once.
 */
export function logoLockupSvg(className = ""): string {
  return `<svg class="sl-logo ${className}" viewBox="0 0 1028 440" role="img" aria-label="Shop Ledger">
  <g class="sl-logo-tag">${word(WORD_TAGLINE, 314, 104, 22, 0)}</g>
  <g class="sl-logo-word sl-logo-row1">${word(WORD_SHOP, 310, 144, 140, WORD_WEIGHT)}</g>
  <g class="sl-logo-word sl-logo-row2">${word(WORD_LEDGER, 262, 298, 140, WORD_WEIGHT)}</g>
  <g class="sl-logo-art"><g transform="translate(-56 0) scale(1.1)">${ownerFigure(9)}</g></g>
</svg>`;
}

/** The tile, 256 square, with the FutureUni corner (small, small, big top right). */
const TILE =
  "M0 32 Q0 0 32 0 L160 0 Q256 0 256 96 L256 224 Q256 256 224 256 L32 256 Q0 256 0 224 Z";

/** Head, gele and shoulders framed in the tile. */
function markArt(weight: number): string {
  return `<g transform="translate(-27 12) scale(0.8)">${ownerFigure(weight)}</g>`;
}

/**
 * Square mark. `clipId` must be unique on the page (the tile clips the art).
 * Add `sl-mark--loading` for the preloader wave.
 */
export function logoMarkSvg(clipId: string, className = ""): string {
  return `<svg class="sl-mark ${className}" viewBox="0 0 256 256" role="img" aria-label="Shop Ledger">
  <defs><clipPath id="${clipId}"><path d="${TILE}"/></clipPath></defs>
  <path class="sl-mark-tile" d="${TILE}"/>
  <g clip-path="url(#${clipId})">${markArt(9)}</g>
</svg>`;
}

/**
 * Standalone icon files (favicon, home-screen icons): colours inline, no CSS.
 * `fullBleed` fills the square for platforms that round the corners
 * themselves; the favicon keeps the shaped tile.
 */
export function brandIconSvg(size: number, fullBleed: boolean): string {
  const tile = fullBleed ? `<rect width="256" height="256" fill="#000B39"/>` : `<path d="${TILE}" fill="#000B39"/>`;
  const clip = fullBleed ? `<rect width="256" height="256"/>` : `<path d="${TILE}"/>`;
  // Heavier line for the small favicon so it survives at 16 px.
  const weight = size <= 64 ? 12 : 9;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
<defs><clipPath id="t">${clip}</clipPath></defs>
${tile}
<g clip-path="url(#t)">${markArt(weight).replace(/var\(--sl-paper\)/g, "#fff").replace(/var\(--sl-cloth\)/g, "#FAD8FE").replace(/currentColor/g, "#000B39")}</g>
</svg>
`;
}

/** Standalone lockup file (README, email, social), colours inline. */
export function brandLockupFileSvg(onDark: boolean): string {
  const wordColor = onDark ? "#fff" : "#000B39";
  const tagColor = onDark ? "#FAD8FE" : "#000B39";
  const bg = onDark ? `<rect x="-40" y="-40" width="1108" height="520" fill="#000B39"/>` : "";
  const inner = logoLockupSvg()
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace('<g class="sl-logo-tag">', `<g fill="${tagColor}">`)
    .replace(/<g class="sl-logo-word sl-logo-row\d">/g, `<g fill="${wordColor}" stroke="${wordColor}">`)
    .replace(/var\(--sl-paper\)/g, "#fff")
    .replace(/var\(--sl-cloth\)/g, "#FAD8FE")
    .replace(/currentColor/g, "#000B39");
  const box = onDark ? `viewBox="-40 -40 1108 520" width="1108" height="520"` : `viewBox="0 0 1028 440" width="1028" height="440"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${box} role="img" aria-label="Shop Ledger">${bg}${inner}</svg>\n`;
}

/**
 * Logo colours and animation. Plain CSS with literal FutureUni colours so it
 * also works on the standalone sign-in page. Every animation sits behind
 * prefers-reduced-motion, so the still logo is always the default.
 */
export const LOGO_CSS = `
.sl-logo, .sl-mark { --sl-paper: #fff; --sl-cloth: #FAD8FE; color: #000B39; display: block; width: 100%; height: auto; overflow: visible; }
.sl-logo { --sl-word: #000B39; --sl-tag: #000B39; }
.sl-logo--on-dark { --sl-word: #fff; --sl-tag: #FAD8FE; }
.sl-logo-word { fill: var(--sl-word); stroke: var(--sl-word); }
.sl-logo-tag { fill: var(--sl-tag); }
.sl-mark-tile { fill: #000B39; }

@media (prefers-reduced-motion: no-preference) {
  .sl-logo--intro .sl-fan path, .sl-mark--intro .sl-fan path {
    transform-box: view-box;
    transform-origin: 240px 172px;
    opacity: 0;
    transform: rotate(56deg) scale(.35);
    animation: sl-logo-unfold .6s cubic-bezier(.2, .9, .25, 1.12) forwards;
    animation-delay: calc(.3s + var(--i, 10) * 50ms);
  }
  .sl-logo--intro .sl-logo-art { opacity: 0; transform: translateY(26px); animation: sl-logo-in .5s cubic-bezier(.2, .9, .3, 1) forwards; }
  .sl-logo--intro .sl-logo-row1 { opacity: 0; transform: translateX(-28px); animation: sl-logo-in .45s cubic-bezier(.2, .9, .3, 1) .6s forwards; }
  .sl-logo--intro .sl-logo-row2 { opacity: 0; transform: translateX(-28px); animation: sl-logo-in .45s cubic-bezier(.2, .9, .3, 1) .72s forwards; }
  .sl-logo--intro .sl-logo-tag { opacity: 0; animation: sl-logo-in .4s ease 1.05s forwards; }
  .sl-logo--intro .sl-mouth { transform-box: fill-box; transform-origin: center top; animation: sl-logo-talk .16s ease-in-out 1.1s 4 alternate; }
  .sl-logo--intro .sl-eye, .sl-mark--loading .sl-eye {
    transform-box: fill-box;
    transform-origin: center;
    animation: sl-logo-blink 5s ease 2.2s infinite;
  }
  /* A wave of violet runs through the pleats: once on hover, looping while loading. */
  .sl-mark-hover:hover .sl-fan path[style], .sl-mark-hover:focus-visible .sl-fan path[style] {
    animation: sl-logo-wave .9s linear calc(var(--i) * 40ms) both;
  }
  .sl-mark--loading .sl-fan path[style] {
    animation: sl-logo-wave 1.6s linear calc(var(--i) * 90ms) infinite;
  }
}
@keyframes sl-logo-unfold { to { opacity: 1; transform: none; } }
@keyframes sl-logo-in { to { opacity: 1; transform: none; } }
@keyframes sl-logo-talk { to { transform: scaleY(.4); } }
@keyframes sl-logo-blink { 0%, 95%, 100% { transform: none; } 97.5% { transform: scaleY(.12); } }
@keyframes sl-logo-wave { 0%, 18%, 100% { fill: var(--sl-pleat); } 9% { fill: #6C63E1; } }
`;
