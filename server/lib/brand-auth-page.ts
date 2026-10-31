import { BRAND_CSS, heroSceneHtml } from "../../shared/brand-art.js";
import { LOGO_CSS, logoLockupSvg } from "../../shared/brand-logo.js";

/**
 * Brands the framework's sign-in page (rendered by the toolkit) for Shop
 * Ledger: a navy panel with the animated logo and the hero scene beside the
 * sign-in card, the FutureUni fonts, and a light card. The framework's markup, scripts and form
 * behaviour are left untouched; this only adds a stylesheet and one aside.
 */
export function brandAuthPage(html: string, appBasePath = ""): string {
  // The framework places this markup inside its hydration root. The style and
  // aside lead the root and hydration leaves them in place (checked in the
  // browser smoke: the panel stays and the sign-in form still works).
  const base = appBasePath.replace(/\/+$/, "");
  const fonts = [
    ["Poppins", "400", "poppins-latin-400-normal.woff2"],
    ["Poppins", "500", "poppins-latin-500-normal.woff2"],
    ["Poppins", "600", "poppins-latin-600-normal.woff2"],
    ["Space Grotesk Variable", "300 700", "space-grotesk-latin-wght-normal.woff2"],
  ]
    .map(
      ([family, weight, file]) =>
        `@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:${weight};src:url("${base}/fonts/${file}") format("woff2")}`,
    )
    .join("");

  const style = `<style data-shop-ledger-brand>${fonts}${BRAND_CSS}${LOGO_CSS}${AUTH_CSS}</style>`;
  const aside = `<aside class="sl-auth-brand" aria-label="About Shop Ledger">
  <div class="sl-auth-logo">${logoLockupSvg("sl-logo--on-dark sl-logo--intro")}</div>
  <h2 class="sl-auth-title">Your shop&rsquo;s books, <span>kept by talking.</span></h2>
  <div class="sl-auth-paper">${heroSceneHtml()}</div>
  <p class="sl-auth-note">Say what happened. The agent writes it down, keeps stock and debts straight, and drafts reminders that only you can approve.</p>
</aside>`;

  return `${style}${aside}${html}`;
}

const NAVY = "#000B39";
const MUTED = "#4B4A6B";
const LINE = "#7A6F90";
const PINK = "#FAD8FE";
const SOFT = "#FDF3FE";
const LINK = "#0050A5";

const AUTH_CSS = `
html, body { background: #fff !important; }
body {
  display: block !important;
  padding: 0 !important;
  color: ${NAVY} !important;
  font-family: "Poppins", system-ui, -apple-system, "Segoe UI", sans-serif !important;
}
.auth-root {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100vh;
  min-height: 100svh;
}
@media (min-width: 960px) {
  .auth-root { grid-template-columns: minmax(0, 1.15fr) minmax(420px, 1fr); }
}
.auth-page { min-height: auto !important; padding: 32px 16px 48px; --b-bg-page: #fff; }
@media (min-width: 960px) { .auth-page { min-height: 100vh !important; min-height: 100svh !important; } }
.auth-wave-background { display: none !important; }

.sl-auth-brand {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 28px 16px 32px;
  background: ${NAVY};
  color: #fff;
}
@media (min-width: 960px) { .sl-auth-brand { padding: 48px clamp(40px, 6vw, 96px); min-height: 100vh; } }
.sl-auth-logo { width: min(250px, 72vw); }
@media (min-width: 960px) { .sl-auth-logo { width: clamp(260px, 24vw, 360px); } }
/* The scene starts once the logo has landed. */
.sl-auth-paper { --sl-t0: 1.1s; }
.sl-auth-title {
  margin: 0;
  font-family: "Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif;
  font-weight: 700;
  font-size: clamp(30px, 4.4vw, 60px);
  line-height: 1.02;
  letter-spacing: -0.03em;
}
.sl-auth-title span { display: block; font-weight: 300; color: ${PINK}; }
.sl-auth-paper {
  width: 100%;
  max-width: 640px;
  padding: clamp(12px, 2.4vw, 28px);
  background: #fff;
  border-radius: 8px 24px 8px 8px;
}
.sl-auth-note { margin: 0; max-width: 520px; font-size: 15px; line-height: 1.55; color: rgba(255, 255, 255, 0.82); }
@media (max-width: 959px) { .sl-auth-note { display: none; } }

.card {
  background: #fff !important;
  border: 2px solid ${NAVY} !important;
  border-radius: 8px 24px 8px 8px !important;
  box-shadow: 6px 6px 0 #6C63E1 !important;
  color: ${NAVY};
}
h1 { color: ${NAVY} !important; font-family: "Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif; font-size: 1.6rem !important; letter-spacing: -0.02em; }
.subtitle, label, .local-dev-description, .legal-note, .signup-local-mode-note, .upgrade-note, .magic-link-success-copy, .google-debug { color: ${MUTED} !important; }
input {
  color: ${NAVY} !important;
  background: #fff !important;
  border: 1px solid ${LINE} !important;
  font-family: inherit;
}
input:focus { border-color: ${NAVY} !important; box-shadow: 0 0 0 2px ${PINK} !important; }
button[type="submit"], .btn-primary, .btn-google {
  background: ${NAVY} !important;
  color: #fff !important;
  font-family: inherit;
  font-weight: 600 !important;
  padding: 0.625rem !important;
}
button[type="submit"]:hover, .btn-primary:hover, .btn-google:hover { background: ${LINK} !important; }
.btn-secondary, .btn-google.magic-link-secondary {
  background: #fff !important;
  color: ${NAVY} !important;
  border: 1px solid ${LINE} !important;
}
.tabs { background: ${SOFT} !important; }
.tab { color: ${MUTED} !important; font-family: inherit; }
.tab.active { background: #fff !important; color: ${NAVY} !important; box-shadow: 0 0 0 1.5px ${NAVY} !important; }
.link-button, .local-dev-full-options, .legal-note a { color: ${LINK} !important; }
.msg.error { color: #B3261E !important; }
.msg.success, .verification-kicker { color: #106B3D !important; }
.verification-panel, .signup-local-mode-note, .upgrade-note { background: ${SOFT} !important; border-color: ${PINK} !important; }
.verification-copy strong { color: ${NAVY} !important; }
.divider::before, .divider::after { background: ${PINK} !important; }
.locale-trigger { color: ${NAVY} !important; background: #fff !important; border-radius: 999px !important; }
.locale-menu { background: #fff !important; border-color: ${PINK} !important; }
.locale-menu-item { color: ${MUTED} !important; }
.locale-menu-item:hover, .locale-menu-item:focus, .locale-menu-item[aria-checked="true"] { color: ${NAVY} !important; background: ${SOFT} !important; }
.progress-step { color: ${MUTED} !important; }
.progress-step span { background: #fff !important; border-color: ${LINE} !important; color: ${MUTED} !important; }
.progress-step.current span { background: ${NAVY} !important; border-color: ${NAVY} !important; color: #fff !important; }
.progress-step.complete span { background: ${PINK} !important; border-color: ${NAVY} !important; color: ${NAVY} !important; }
`;
