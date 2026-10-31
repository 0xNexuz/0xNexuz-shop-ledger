import { BRAND_CSS, heroSceneHtml } from "../../shared/brand-art.js";
import { LOGO_CSS, logoLockupSvg } from "../../shared/brand-logo.js";

/**
 * Brands the framework's sign-in page (rendered by the toolkit) for Shop
 * Ledger: a navy panel with the animated logo and the hero scene beside the
 * sign-in card, the FutureUni fonts, and a light card. The framework's
 * markup, scripts and form behaviour are left untouched; this only adds a
 * stylesheet and one aside (with the "Try the demo" button).
 */
export function brandAuthPage(html: string, appBasePath = ""): string {
  // The framework places this markup inside its hydration root. React skips
  // leading root nodes whose tag differs from the page's first element (a
  // <div>), so the <style>, <section> and <aside> stay in place after
  // hydration (checked in the browser smoke).
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
  const demo = `<div class="sl-auth-demo">
    <button type="button" class="sl-auth-demo-btn" data-sl-try-demo>Try the demo, no sign-up</button>
    <p class="sl-auth-demo-note" data-sl-try-demo-status role="status">Opens your own copy of a sample shop. Nothing to remember.</p>
  </div>
  <script>${tryDemoScript(base)}</script>`;
  // Opening screen: the logo is doodled and its letters carved on white at
  // first paint; it fades by itself (CSS only), then the panel's logo and
  // scene play. Skipped entirely when the visitor prefers reduced motion.
  // Must not be a <div>: React hydrates the root's first <div> as the sign-in
  // page, so a leading <div> would be mistaken for it and wipe the panel.
  const splash = `<section class="sl-splash" aria-hidden="true"><div class="sl-splash-inner">
    <div class="sl-splash-logo">${logoLockupSvg("sl-logo--doodle")}</div>
  </div></section>`;
  const aside = `<aside class="sl-auth-brand" aria-label="About Shop Ledger">
  <div class="sl-auth-logo">${logoLockupSvg("sl-logo--on-dark sl-logo--intro")}</div>
  <h2 class="sl-auth-title">Your shop&rsquo;s books, <span>kept by talking.</span></h2>
  ${demo}
  <div class="sl-auth-paper">${heroSceneHtml()}</div>
  <p class="sl-auth-note">Say what happened. The agent writes it down, keeps stock and debts straight, and drafts reminders that only you can approve.</p>
</aside>`;

  // Once per browser session: later visits skip straight to the page. Runs
  // before the splash is parsed, so it never flashes. Same key as the app's
  // opening screen, so the app doesn't repeat it either.
  const splashOnce = `<script>try{if(sessionStorage.getItem("shop-ledger:splash-seen"))document.documentElement.classList.add("sl-splash-seen");else sessionStorage.setItem("shop-ledger:splash-seen","1")}catch(e){}</script>`;
  return `${style}${splashOnce}${splash}${aside}${html}`;
}

/**
 * "Try the demo": one tap makes a private throwaway account through the same
 * register + login endpoints the sign-up form uses, then opens /shop?demo=1,
 * which loads the sample shop. Each visitor gets their own copy, so judges
 * never see each other's entries. The password is random and never shown;
 * the browser keeps the session cookie.
 *
 * Plain script with a delegated listener so it keeps working after the
 * framework hydrates the page. Only the app's own base path is interpolated.
 */
function tryDemoScript(base: string): string {
  const basePath = JSON.stringify(base).replace(/</g, "\\u003c");
  return `(function(){
var base=${basePath};
function hex(n){var a=new Uint8Array(n);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(b){return("0"+b.toString(16)).slice(-2)}).join("")}
function post(path,body){return fetch(base+path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})}
document.addEventListener("click",function(e){
var btn=e.target&&e.target.closest?e.target.closest("[data-sl-try-demo]"):null;
if(!btn||btn.disabled)return;
var label=btn.textContent,status=document.querySelector("[data-sl-try-demo-status]");
btn.disabled=true;btn.textContent="Opening the sample shop\u2026";
var cred={email:"visitor-"+hex(5)+"@demo.shop-ledger.invalid",password:hex(18)};
post("/_agent-native/auth/register",{email:cred.email,password:cred.password,callbackURL:base+"/shop?demo=1"})
.then(function(r){if(!r.ok)throw new Error("register "+r.status);return post("/_agent-native/auth/login",cred)})
.then(function(r){if(!r.ok)throw new Error("login "+r.status);location.assign(base+"/shop?demo=1")})
.catch(function(){btn.disabled=false;btn.textContent=label;if(status)status.textContent="Couldn\u2019t open the demo just now. Try again, or create an account."});
});
})();`;
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

.sl-splash { display: none; }
@media (prefers-reduced-motion: no-preference) {
  .sl-splash {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 16px;
    background: #fff;
    animation: sl-splash-out .4s ease 1.5s forwards;
  }
  /* The panel's own entrance waits for the splash. */
  .sl-auth-brand { --sl-logo-t0: 1.6s; }
  .sl-auth-paper { --sl-t0: 2.7s; }
  .sl-splash-seen .sl-splash { display: none; }
  .sl-splash-seen .sl-auth-brand { --sl-logo-t0: 0s; }
  .sl-splash-seen .sl-auth-paper { --sl-t0: 1.1s; }
}
.sl-splash-logo { width: min(320px, 76vw); }
@keyframes sl-splash-out { to { opacity: 0; visibility: hidden; } }
.sl-auth-demo { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.sl-auth-demo-btn {
  appearance: none;
  padding: 12px 20px;
  border: 2px solid ${PINK};
  border-radius: 8px 24px 8px 8px;
  background: ${PINK};
  color: ${NAVY};
  font: 600 16px/1.2 "Poppins", system-ui, sans-serif;
  box-shadow: 4px 4px 0 #6C63E1;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.sl-auth-demo-btn:hover { background: #fff; }
.sl-auth-demo-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #6C63E1; }
.sl-auth-demo-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.sl-auth-demo-btn:disabled { cursor: progress; opacity: 0.85; }
.sl-auth-demo-note { margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.82); }
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
