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

/** The shop owner: gele, open exercise book, mid-sentence. */
export const SHOP_OWNER_SVG = `<svg viewBox="0 0 360 400" ${LINE} stroke-width="5" role="img" aria-label="A shop owner in a gele holding her open exercise book">
  <g class="sl-cloth">
    <path pathLength="1" d="M106 150 C 84 128, 82 92, 110 76 C 128 66, 150 70, 164 80 C 176 46, 222 18, 268 30 C 310 42, 318 96, 290 128 C 280 140, 270 146, 258 152 Z" style="fill:var(--sl-cloth)"/>
    <path pathLength="1" d="M258 152 C 282 150, 306 158, 318 176 C 300 172, 284 172, 266 174 Z" style="fill:var(--sl-cloth)"/>
    <path pathLength="1" d="M106 150 C 148 132, 214 132, 258 152 L 250 172 C 210 154, 154 154, 116 170 Z" style="fill:var(--sl-cloth)"/>
    <path pathLength="1" d="M120 130 C 126 104, 150 94, 174 100 C 190 72, 236 58, 276 76"/>
    <path pathLength="1" d="M140 140 C 152 122, 172 116, 192 122 C 214 102, 250 98, 280 112"/>
    <path pathLength="1" d="M164 80 C 170 88, 174 94, 174 100"/>
  </g>
  <g class="sl-body">
    <path pathLength="1" d="M122 168 C 114 202, 122 232, 148 250 C 164 260, 198 260, 214 250 C 238 234, 246 202, 242 170"/>
    <path pathLength="1" d="M166 256 L 164 278"/>
    <path pathLength="1" d="M200 256 L 202 278"/>
    <path pathLength="1" d="M164 278 C 118 284, 76 302, 64 346 L 60 398"/>
    <path pathLength="1" d="M202 278 C 248 284, 290 302, 302 346 L 306 398"/>
    <path pathLength="1" d="M164 278 Q 183 302 202 278"/>
  </g>
  <g class="sl-face" stroke="none" fill="currentColor">
    <circle class="sl-eye" cx="162" cy="204" r="5"/>
    <circle class="sl-eye" cx="208" cy="204" r="5"/>
    <path class="sl-mouth" d="M174 226 Q 184 240 194 226 Z" stroke="currentColor" stroke-width="4"/>
  </g>
  <g class="sl-book">
    <path d="M90 334 C 130 318, 166 320, 183 334 C 200 320, 236 318, 276 334 L 272 378 C 236 366, 202 368, 183 380 C 164 368, 130 366, 94 378 Z" fill="currentColor"/>
    <path d="M96 328 C 132 312, 166 314, 183 328 C 200 314, 234 312, 270 328 L 268 366 C 234 354, 200 356, 183 368 C 166 356, 132 354, 98 366 Z" style="fill:var(--sl-paper)"/>
    <path d="M183 328 L 183 368"/>
    <path class="sl-ink" pathLength="1" d="M114 336 C 134 330, 150 330, 166 336" stroke-width="3"/>
    <path class="sl-ink" pathLength="1" d="M114 348 C 134 342, 150 342, 166 348" stroke-width="3"/>
    <path class="sl-ink" pathLength="1" d="M200 336 C 216 330, 234 330, 252 336" stroke-width="3"/>
    <path d="M98 352 C 104 344, 114 342, 120 348 C 124 354, 116 360, 106 362" style="fill:var(--sl-paper)"/>
    <path d="M268 352 C 262 344, 252 342, 246 348 C 242 354, 250 360, 260 362" style="fill:var(--sl-paper)"/>
    <path d="M94 378 L 88 398"/>
    <path d="M272 378 L 278 398"/>
  </g>
</svg>`;

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
 * Styles for the line art and the hero scene. Plain CSS with literal FutureUni
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

@media (prefers-reduced-motion: no-preference) {
  .sl-scene .sl-cloth path, .sl-scene .sl-body path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: sl-draw 1.1s cubic-bezier(.6, .1, .3, 1) forwards;
  }
  .sl-scene .sl-cloth path { fill-opacity: 0; animation: sl-draw 1.1s cubic-bezier(.6, .1, .3, 1) forwards, sl-fill .5s ease .8s forwards; }
  .sl-scene .sl-body path { animation-delay: .2s; }
  .sl-scene .sl-face, .sl-scene .sl-book { opacity: 0; animation: sl-fade .4s ease .9s forwards; }
  .sl-scene .sl-ink { stroke-dasharray: 1; stroke-dashoffset: 1; animation: sl-draw .5s ease 3.05s forwards; }
  .sl-scene .sl-mouth { transform-box: fill-box; transform-origin: center top; animation: sl-talk .18s ease-in-out 1.35s 7 alternate; }
  .sl-scene .sl-eye { transform-box: fill-box; transform-origin: center; animation: sl-blink 5s ease 4.5s infinite; }
  .sl-bubble { opacity: 0; transform: scale(.88); transform-origin: 100% 85%; animation: sl-pop .35s cubic-bezier(.3, 1.4, .5, 1) 1.1s forwards; }
  .sl-word { opacity: 0; animation: sl-fade .18s ease forwards; animation-delay: calc(1.35s + var(--i) * 85ms); }
  .sl-receipt { opacity: 0; transform: translateY(14px); animation: sl-rise .45s cubic-bezier(.2, .9, .3, 1) 2.85s forwards; }
  .sl-receipt-badge { display: inline-block; transform: scale(.6); opacity: 0; animation: sl-pop .3s cubic-bezier(.3, 1.6, .5, 1) 3.25s forwards; }
}
@keyframes sl-draw { to { stroke-dashoffset: 0; } }
@keyframes sl-fill { to { fill-opacity: 1; } }
@keyframes sl-fade { to { opacity: 1; } }
@keyframes sl-pop { to { opacity: 1; transform: none; } }
@keyframes sl-rise { to { opacity: 1; transform: none; } }
@keyframes sl-talk { to { transform: scaleY(.45); } }
@keyframes sl-blink { 0%, 95%, 100% { transform: none; } 97.5% { transform: scaleY(.12); } }
`;
