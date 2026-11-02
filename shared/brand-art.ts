/**
 * Shop Ledger's line drawings, as static SVG markup.
 *
 * Original artwork drawn for Shop Ledger in a minimal single-line style. The
 * strings are constants (never built from user input), so the React screens
 * and the server-rendered sign-in page can both inline them.
 *
 * Lines use `currentColor`; fills use `--sl-paper` (page white) and
 * `--sl-cloth` (gele pink). Wrap them in an element that sets those.
 */

const LINE =
  'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

/**
 * The gele's pleats: accordion folds fanning out from the knot at the right
 * of her head (240, 172), alternating cloth and paper so the folds read.
 */
const GELE_PLEATS = [
  "M202.4 177.3 L105.3 190.9 Q88.6 169.4 89.9 148.2 L202.5 166.1 Z",
  "M202.5 166.1 L89.9 148.2 Q73.7 117 74.6 91.3 L205.8 155.3 Z",
  "M205.8 155.3 L74.6 91.3 Q84.8 65.9 109.8 50.6 L212.2 146.1 Z",
  "M212.2 146.1 L109.8 50.6 Q121.8 22 145 7.5 L221 139.1 Z",
  "M221 139.1 L145 7.5 Q170.4 0.5 202.7 10.3 L231.5 135 Z",
  "M231.5 135 L202.7 10.3 Q226.3 0.4 251.4 8.4 L242.7 134.1 Z",
  "M242.7 134.1 L251.4 8.4 Q270.4 21.6 285.9 52.5 L253.6 136.5 Z",
  "M253.6 136.5 L285.9 52.5 Q303.6 57.9 312.6 79 L263.4 142.1 Z",
  "M263.4 142.1 L312.6 79 Q314.2 96.1 303.1 126.2 L270.7 149.7 Z",
];
const GELE_EDGE =
  "M202.4 177.3 L105.3 190.9 Q88.6 169.4 89.9 148.2 Q73.7 117 74.6 91.3 Q84.8 65.9 109.8 50.6 Q121.8 22 145 7.5 Q170.4 0.5 202.7 10.3 Q226.3 0.4 251.4 8.4 Q270.4 21.6 285.9 52.5 Q303.6 57.9 312.6 79 Q314.2 96.1 303.1 126.2 L270.7 149.7 Z";

/**
 * The shop owner, the one character used everywhere (hero, logo, preloader):
 * pleated gele, drop earrings, a buba in the gele's colour, her open exercise
 * book. `weight` is the line weight in the 360 × 400 drawing (5 for large
 * art, 9 for the logo and icons). Class names are the animation hooks.
 */
export function ownerFigure(weight: number): string {
  const thin = Math.round(weight * 0.7 * 10) / 10;
  const eye = Math.max(5, Math.round(weight * 0.78 * 10) / 10);
  const pleats = GELE_PLEATS.map(
    (d, i) =>
      `<path pathLength="1" style="--i:${i};--sl-pleat:var(${i % 2 ? "--sl-paper" : "--sl-cloth"});fill:var(--sl-pleat)" stroke-width="${thin}" d="${d}"/>`,
  ).join("");
  return `<g class="sl-figure" ${LINE} stroke-width="${weight}">
  <g class="sl-body">
    <path pathLength="1" d="M160 262 L158 284 C108 292 70 312 62 352 L58 398 L310 398 L306 352 C298 312 260 292 210 284 L208 262 Z" style="fill:var(--sl-cloth)"/>
    <path pathLength="1" d="M158 284 C 168 306, 200 306, 210 284" style="fill:var(--sl-paper)"/>
  </g>
  <g class="sl-cloth sl-fan">${pleats}<path pathLength="1" d="${GELE_EDGE}" fill="none"/></g>
  <g class="sl-body"><path pathLength="1" d="M124 170 C 118 214, 132 250, 160 266 C 174 274, 194 274, 208 266 C 236 250, 250 214, 244 170 C 206 156, 162 156, 124 170 Z" style="fill:var(--sl-paper)"/></g>
  <g class="sl-cloth sl-wrap">
    <path pathLength="1" d="M118 184 C 112 150, 140 128, 184 126 C 228 128, 258 150, 252 184 C 232 168, 208 160, 186 168 C 162 160, 138 168, 118 184 Z" style="fill:var(--sl-cloth)"/>
    <path pathLength="1" d="M134 158 C 150 146, 170 142, 186 146" stroke-width="${thin}"/>
    <path pathLength="1" d="M200 140 C 220 140, 238 150, 246 162" stroke-width="${thin}"/>
    <path pathLength="1" d="M236 156 C 252 140, 274 146, 270 166 C 266 182, 246 184, 236 172 Z" style="fill:var(--sl-cloth)"/>
    <path pathLength="1" d="M244 176 C 258 184, 266 200, 262 214 C 250 204, 244 194, 240 180 Z" style="fill:var(--sl-cloth)"/>
  </g>
  <g class="sl-face" stroke-width="${thin}">
    <circle pathLength="1" class="sl-eye" cx="162" cy="210" r="${eye}" fill="currentColor" stroke="none"/>
    <circle pathLength="1" class="sl-eye" cx="208" cy="210" r="${eye}" fill="currentColor" stroke="none"/>
    <path pathLength="1" d="M150 194 C 156 189, 164 189, 170 192"/>
    <path pathLength="1" d="M200 192 C 206 189, 214 189, 220 194"/>
    <path pathLength="1" d="M186 214 C 184 224, 182 230, 190 232"/>
    <path pathLength="1" class="sl-mouth" d="M168 242 C 178 256, 194 256, 204 242 Z" fill="currentColor"/>
    <path pathLength="1" d="M122 214 L 122 228"/><circle pathLength="1" cx="122" cy="236" r="8" style="fill:var(--sl-paper)"/>
    <path pathLength="1" d="M246 214 L 246 228"/><circle pathLength="1" cx="246" cy="236" r="8" style="fill:var(--sl-paper)"/>
  </g>
  <g class="sl-book">
    <path pathLength="1" d="M86 334 C 128 318, 166 320, 184 334 C 202 320, 240 318, 282 334 L 278 386 C 240 374, 204 376, 184 388 C 164 376, 128 374, 90 386 Z" fill="currentColor"/>
    <path pathLength="1" d="M92 326 C 130 310, 166 312, 184 326 C 202 312, 238 310, 276 326 L 274 372 C 238 360, 202 362, 184 374 C 166 362, 130 360, 94 372 Z" style="fill:var(--sl-paper)"/>
    <path pathLength="1" d="M184 326 L 184 374"/>
    <path class="sl-ink" pathLength="1" d="M114 340 C 132 334, 150 334, 166 340" stroke-width="${thin}"/>
    <path class="sl-ink" pathLength="1" d="M114 354 C 132 348, 150 348, 166 354" stroke-width="${thin}"/>
    <path class="sl-ink" pathLength="1" d="M202 340 C 220 334, 238 334, 256 340" stroke-width="${thin}"/>
  </g>
</g>`;
}

/** The shop owner: gele, open exercise book, mid-sentence. */
export const SHOP_OWNER_SVG = `<svg viewBox="0 -4 360 404" role="img" aria-label="A shop owner in a pleated gele holding her open exercise book">${ownerFigure(5)}</svg>`;

/** Empty ledger: an open exercise book with a pencil across it. */
export const SPOT_BOOK_SVG = `<svg viewBox="0 0 160 120" ${LINE} stroke-width="4" aria-hidden="true">
  <path d="M18 46 C 48 34, 70 36, 80 46 C 90 36, 112 34, 142 46 L 140 102 C 112 92, 90 94, 80 104 C 70 94, 48 92, 20 102 Z" fill="currentColor"/>
  <path d="M22 40 C 50 28, 72 30, 80 40 C 88 30, 110 28, 138 40 L 136 94 C 110 84, 88 86, 80 96 C 72 86, 50 84, 24 94 Z" style="fill:var(--sl-paper)"/>
  <path d="M80 40 L 80 96"/>
  <path d="M34 52 C 46 47, 58 47, 68 52" stroke-width="3"/>
  <path d="M34 64 C 46 59, 58 59, 68 64" stroke-width="3"/>
  <path d="M34 76 C 42 72, 50 72, 56 75" stroke-width="3"/>
  <path d="M98 80 L 134 52" stroke-width="9"/>
  <path d="M98 80 L 134 52" style="stroke:var(--sl-cloth)" stroke-width="3"/>
  <path d="M96 82 L 90 88" stroke-width="4"/>
</svg>`;

/** No products: a shelf with a sack of rice, a milk tin and a carton. */
export const SPOT_SHELF_SVG = `<svg viewBox="0 0 160 120" ${LINE} stroke-width="4" aria-hidden="true">
  <path d="M28 96 C 18 76, 24 58, 42 52 L 62 52 C 80 58, 86 76, 76 96 Z" style="fill:var(--sl-cloth)"/>
  <path d="M44 50 C 36 44, 36 34, 44 36 C 48 30, 56 30, 60 36 C 68 34, 68 44, 60 50" style="fill:var(--sl-cloth)"/>
  <path d="M40 51 L 64 51" stroke-width="5"/>
  <path d="M42 70 L 62 70 L 62 82 L 42 82 Z" style="fill:var(--sl-paper)" stroke-width="3"/>
  <rect x="90" y="60" width="26" height="36" rx="3" style="fill:var(--sl-paper)"/>
  <path d="M90 70 L 116 70 L 116 84 L 90 84 Z" fill="currentColor"/>
  <rect x="122" y="74" width="20" height="22" rx="2" style="fill:var(--sl-paper)"/>
  <path d="M122 82 L 142 82" stroke-width="3"/>
  <path d="M12 96 L 148 96"/>
  <path d="M20 96 L 20 112"/>
  <path d="M140 96 L 140 112"/>
</svg>`;

/** No reminders waiting: a phone with a sent message and a tick. */
export const SPOT_PHONE_SVG = `<svg viewBox="0 0 160 120" ${LINE} stroke-width="4" aria-hidden="true">
  <rect x="54" y="8" width="52" height="104" rx="10" style="fill:var(--sl-paper)"/>
  <path d="M72 18 L 88 18"/>
  <path d="M64 32 L 96 32 C 99 32, 100 33, 100 36 L 100 50 C 100 53, 99 54, 96 54 L 74 54 L 66 60 L 66 54 C 63 54, 62 53, 62 50 L 62 36 C 62 33, 63 32, 64 32 Z" style="fill:var(--sl-cloth)" stroke-width="3"/>
  <path d="M68 40 L 92 40" stroke-width="3"/>
  <path d="M68 47 L 84 47" stroke-width="3"/>
  <circle cx="80" cy="84" r="13" fill="currentColor"/>
  <path d="M73 84 L 78 89 L 87 79" style="stroke:var(--sl-paper)" stroke-width="3.5"/>
  <path d="M26 46 C 32 40, 40 40, 44 46" stroke-width="3"/>
  <path d="M20 36 C 30 26, 42 26, 48 34" stroke-width="3"/>
</svg>`;

/** The example the scene acts out; the figures match the sample shop. */
const SCENE_SENTENCE = "Sold 2 bags of rice to Mama Ngozi. She paid 50k, rest on Friday.";

/**
 * The hero scene: the owner says what happened, and the agent's ledger line
 * appears. Pure markup + CSS (see BRAND_CSS); it animates once and shows the
 * final state straight away when the viewer prefers reduced motion.
 */
export function heroSceneHtml(): string {
  const words = SCENE_SENTENCE.split(" ")
    .map((word, i) => `<span class="sl-word" style="--i:${i}">${word}</span>`)
    .join(" ");
  return `<div class="sl-scene">
  <div class="sl-scene-art sl-art">${SHOP_OWNER_SVG}</div>
  <p class="sl-bubble"><span class="sl-sr">The owner says: </span>${words}</p>
  <div class="sl-receipt">
    <p class="sl-receipt-head"><span class="sl-receipt-kind">Sale</span><span class="sl-receipt-leader" aria-hidden="true"></span><span class="sl-receipt-amount">₦156,000</span></p>
    <p class="sl-receipt-line">2 × Rice (50kg) to Mama Ngozi</p>
    <p class="sl-receipt-meta"><span class="sl-receipt-badge">Agent</span><span>₦106,000 on credit · due Fri</span></p>
  </div>
</div>`;
}

/**
 * Styles for the line art and the hero scene. Plain CSS with literal Mag
 * colours, because the sign-in page is standalone HTML without the app's
 * Tailwind tokens. The app inlines the same string once.
 */
export const BRAND_CSS = `
.sl-art { --sl-paper: #fff; --sl-cloth: #FAD8FE; color: #000B39; }
.sl-art svg, .sl-spot svg { display: block; width: 100%; height: auto; overflow: visible; }
.sl-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.sl-scene {
  position: relative;
  aspect-ratio: 100 / 76;
  container-type: inline-size;
  color: #000B39;
  font-family: "Poppins", system-ui, -apple-system, "Segoe UI", sans-serif;
}
.sl-scene p { margin: 0; }
.sl-scene-art { position: absolute; top: 0; right: 0; width: 60%; }
.sl-bubble {
  position: absolute;
  left: 0;
  bottom: 52%;
  width: 49%;
  padding: 3.2cqi 3.6cqi;
  background: #fff;
  border: 2px solid #000B39;
  border-radius: 22px 22px 6px 22px;
  font-size: clamp(12px, 3.3cqi, 17px);
  line-height: 1.4;
  font-weight: 500;
}
.sl-bubble::after {
  content: "";
  position: absolute;
  right: -9px;
  bottom: 14px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-right: 2px solid #000B39;
  border-bottom: 2px solid #000B39;
  transform: rotate(-45deg) skew(12deg, 12deg);
}
.sl-receipt {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 55%;
  padding: 2.6cqi 3.2cqi 2.8cqi;
  background: #fff;
  border: 2px solid #000B39;
  border-radius: 8px 24px 8px 8px;
  box-shadow: 5px 5px 0 #6C63E1;
  font-size: clamp(11px, 2.7cqi, 14px);
  line-height: 1.35;
}
.sl-receipt-head { display: flex; align-items: baseline; gap: 6px; }
.sl-receipt-kind { font-size: 0.78em; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
.sl-receipt-leader { flex: 1 1 auto; min-width: 12px; border-bottom: 1.5px dotted #7A6F90; transform: translateY(-3px); }
.sl-receipt-amount { font-family: "Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif; font-weight: 700; font-size: 1.15em; font-variant-numeric: tabular-nums; }
.sl-receipt-line { margin-top: 2px !important; }
.sl-receipt-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-top: 6px !important; color: #9A4A00; font-weight: 500; font-size: 0.9em; }
.sl-receipt-badge { padding: 1px 6px; border: 1.5px solid #000B39; border-radius: 4px; color: #000B39; font-size: 0.78em; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; background: #FAD8FE; }

@container (max-width: 440px) {
  .sl-scene-art { width: 56%; }
  .sl-bubble { bottom: 56%; width: 56%; }
  .sl-receipt { width: 66%; }
}
@supports not (container-type: inline-size) {
  .sl-bubble { font-size: 14px; padding: 12px 14px; }
  .sl-receipt { font-size: 13px; padding: 10px 12px; }
}

.sl-spot { --sl-paper: #fff; --sl-cloth: #FAD8FE; color: #000B39; }

/* --sl-t0 shifts the whole scene later, e.g. to follow the logo's entrance. */
@media (prefers-reduced-motion: no-preference) {
  .sl-scene .sl-cloth path, .sl-scene .sl-body path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    fill-opacity: 0;
    animation: sl-draw 1.1s cubic-bezier(.6, .1, .3, 1) forwards, sl-fill .5s ease forwards;
    animation-delay: var(--sl-t0, 0s), calc(var(--sl-t0, 0s) + .8s);
  }
  .sl-scene .sl-body path { animation-delay: calc(var(--sl-t0, 0s) + .2s), calc(var(--sl-t0, 0s) + .9s); }
  .sl-scene .sl-face, .sl-scene .sl-book { opacity: 0; animation: sl-fade .4s ease calc(var(--sl-t0, 0s) + .9s) forwards; }
  .sl-scene .sl-ink { stroke-dasharray: 1; stroke-dashoffset: 1; animation: sl-draw .5s ease calc(var(--sl-t0, 0s) + 3.05s) forwards; }
  .sl-scene .sl-mouth { transform-box: fill-box; transform-origin: center top; animation: sl-talk .18s ease-in-out calc(var(--sl-t0, 0s) + 1.35s) 7 alternate; }
  .sl-scene .sl-eye { transform-box: fill-box; transform-origin: center; animation: sl-blink 5s ease calc(var(--sl-t0, 0s) + 4.5s) infinite; }
  .sl-bubble { opacity: 0; transform: scale(.88); transform-origin: 100% 85%; animation: sl-pop .35s cubic-bezier(.3, 1.4, .5, 1) calc(var(--sl-t0, 0s) + 1.1s) forwards; }
  .sl-word { opacity: 0; animation: sl-fade .18s ease forwards; animation-delay: calc(var(--sl-t0, 0s) + 1.35s + var(--i) * 85ms); }
  .sl-receipt { opacity: 0; transform: translateY(14px); animation: sl-rise .45s cubic-bezier(.2, .9, .3, 1) calc(var(--sl-t0, 0s) + 2.85s) forwards; }
  .sl-receipt-badge { display: inline-block; transform: scale(.6); opacity: 0; animation: sl-pop .3s cubic-bezier(.3, 1.6, .5, 1) calc(var(--sl-t0, 0s) + 3.25s) forwards; }
}
@keyframes sl-draw { to { stroke-dashoffset: 0; } }
@keyframes sl-fill { to { fill-opacity: 1; } }
@keyframes sl-fade { to { opacity: 1; } }
@keyframes sl-pop { to { opacity: 1; transform: none; } }
@keyframes sl-rise { to { opacity: 1; transform: none; } }
@keyframes sl-talk { to { transform: scaleY(.45); } }
@keyframes sl-blink { 0%, 95%, 100% { transform: none; } 97.5% { transform: scaleY(.12); } }
`;
