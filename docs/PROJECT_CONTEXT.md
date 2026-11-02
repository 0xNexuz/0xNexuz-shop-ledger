# Project Context

Keep this file concise and evidence-based. Update current state in place, append decision-log entries, and never store secrets.

## Project Identity

- **Project name:** Shop Ledger
- **Repository:** https://github.com/0xNexuz/0xNexuz-shop-ledger (public); Vercel project `shop-ledger` (team xreyy's projects), Git-linked, production branch `main`
- **Project description:** Agent-native bookkeeping for small shops: say what happened, the agent records sales, credit, payments and stock through shared actions; the owner approves debtor reminders and sends them from WhatsApp.
- **Current workflow stage:** DEPLOYMENT (P1) → next: AI provider, agent-flow verification, Clips demo, submission
- **Overall status:** IMPLEMENTED; core ledger, rules and screens verified locally on 2026-10-31; a live demo agent run failed on 2026-11-01. Groq tool calling passed a direct provider check on 2026-11-02; production Groq variables were saved on 2026-11-02, but a complete agent run remains unverified.
- **Last updated date:** 2026-11-02

## Git State

- **Branch:** main (PR #2 merged 2026-11-02)
- **HEAD:** see `git log -1`
- **Working tree:** not asserted; check the active checkout before editing
- **Relevant remote or PR:** https://github.com/0xNexuz/0xNexuz-shop-ledger/pull/2 merged; pushes to `main` deploy to production
- **Last verified milestone:** brand refresh + preloader verified locally (2026-10-31); first production deploy started 2026-10-31

## Hackathon Context

- **Competition:** Agent-Native Hackathon
- **Organizer:** Builder.io
- **Tracks:** single ranked pool; recognition categories (Best Overall, Productivity, Most Creative, Best Use of Agent-Native) carry no extra cash
- **Sponsors:** Builder.io
- **Deadline:** Mon 2026-11-09 23:59 PT = Tue 2026-11-10 07:59 UTC = 08:59 Lagos (live rules page, re-checked 2026-10-31 evening)
- **Eligibility:** worldwide, 18+, sanctions apply; per-entry prizes; non-US winners may face up to 30% US withholding
- **Judging:** Usefulness & Execution 40%, Creativity & Design 20%, Innovation 20%, Cleverness/Use of Agent-Native 20%
- **Submission:** builder.io/hackathon/submit; required: working Agent-Native app, project description, team + contact details, disclosure of pre-existing work/templates/libraries/third-party assets and what changed during the event, an accessible demo, a public Clips recording of the real app in use (viewable without login), rules agreement; repo and live deploy encouraged, not required; recording a clip alone is not a submission
- **Official source links:** https://www.builder.io/hackathon/rules · https://www.builder.io/hackathon · https://www.builder.io/hackathon/submit

## Strategic Decisions

- **Selected idea:** Shop Ledger (#1 of five ranked in discovery)
- **Why it was selected:** clear daily problem, distinctive vs. the framework's own templates (mail, calendar, docs, slides, analytics, clips…), uses every Agent-Native surface on one set of actions, strong 2-minute demo
- **Rejected alternatives:** Scope Guard (agency delivery cockpit), Shift Handover (clinics), Clip-to-Fix QA desk, Quote-to-Order procurement
- **Competitive advantages:** real local workflow (credit/"on account", WhatsApp), server-enforced money rules, human approval boundary enforced by `uiOnly`
- **Intended target users:** owners and attendants of small provisions/retail shops (Nigeria first, naira default)

## Architecture Decisions

- **Technology stack:** Agent-Native 0.222 (React Router, Nitro, Drizzle, Postgres/PGlite), TypeScript, Tailwind; FutureUni design tokens; Space Grotesk + Poppins
- **Core architecture:** `shops` shareable resource; child tables products, customers, entries (append-only), entry_lines, reminders; money in kobo; cached stock/balances + `reconcile-ledger`
- **Required integrations:** AI provider for the agent (Builder.io managed or BYO key); hosted Postgres for deploy
- **Security assumptions:** access via `accessFilter` on the shop; approve/mark-sent are `uiOnly` + `agentTool:false`; agent text is data, reviewed by owner before sending; sample data synthetic
- **Important technical constraints:** AGENTS.md is loaded into the in-app agent prompt and cut at 6,000 chars (now ~5.8k); scheduled automations are per-user DB rows, not code

## Development Progress

- **Approved implementation scope:** P0 build of Shop Ledger + hosting on GitHub/Vercel/Neon Postgres (approved 2026-10-31; Supabase is not used); four agent features chosen by the owner 2026-10-31: snap the notebook, talk like you talk, credit sense, evening close + nicknames
- **Completed features:** schema/migrations (v1–v3); 35 actions; ledger rules; reminders state machine; Today/Ledger/Customers/Stock screens; sale dialog with credit warning; onboarding + sample shop; agent prompt, tools, navigation state; UI-only approval; brand refresh (logo, preloader, sign-in); one-tap demo + welcome card; typed old-balance import drafts (owner applies); voice/dictation + local-language prompt; credit sense (status, limits, credit_check on sales); evening close (7 pm via Vercel cron + button + agent tool); nicknames for customers and products
- **Implemented but unverified:** the production agent (Pidgin/Yoruba/Hausa/Igbo understanding, add-nickname/close-the-day tool choice); the 7 pm Vercel cron firing in production
- **Pending features:** Clips demo; submission text; optional "Keep this shop" (demo → real account); optional Telegram entry; CSV export
- **P0 priorities:** none open
- **P1 priorities:** configure and test the live agent with Groq; record Clips demo; submit by Sun Nov 8
- **P2 priorities:** demo-account clean-up job; email verification + password reset once an email provider is added; i18n of new UI strings
- **P3 priorities:** hide the starter Home link; favicon.ico; README screenshots
- **Current milestone:** P1 direct read-only checks, manual sale fallback and removal of notebook-photo capture merged; Groq production variables configured; live agent verification pending
- **Known blockers:** A live demo "How did we do today?" run on 2026-11-01 ended with "The server reported that this run failed" and a "Save failed" toast. Root cause is unconfirmed; inspect production runtime logs and verify a complete agent run before the Clips recording. Some Nigerian networks reset connections to vercel.app.

## Verification

### Tests Actually Executed

| Date | Command or check | Environment | Result | Evidence or notes |
|---|---|---|---|---|
| 2026-10-31 | `pnpm exec vitest --run` | workspace, Node 22 | VERIFIED 18/18 | money, matching, time/DST, reminder machine, phone/wa.me |
| 2026-10-31 | `bash scripts/verify-rules.sh` | dev server + PGlite | VERIFIED 18/18 | stock, credit, overpayment, voids, counts, reminders, uiOnly, reconcile |
| 2026-10-31 | `pnpm typecheck` | workspace | VERIFIED clean | |
| 2026-10-31 | `pnpm agent-native:doctor` | workspace | VERIFIED clean | |
| 2026-10-31 | Playwright smoke (Chrome headless) | dev server | VERIFIED | sign-in → sample shop → sale → reminder approve → tabs → mobile 390px; raw HTTP approve → 403 `ui_capability_required` |
| 2026-10-31 | `pnpm exec vitest run` | workspace | VERIFIED 19/19 | adds nickname matching (real name beats someone else's nickname) |
| 2026-10-31 | `bash scripts/verify-rules.sh` | dev server + PGlite | VERIFIED 31/31 | adds credit_check, notebook draft UI-only, nicknames (unknown not guessed, taught, unique), evening close once per day |
| 2026-10-31 | `curl` sweep path with wrong / right cron bearer | dev server | VERIFIED | wrong → 401 and no close; right → 200, `[evening-close] closed 28 shop(s), 0 failed` |
| 2026-10-31 | Playwright: evening close, nicknames, welcome card | dev server | VERIFIED | Close the day → 3 reminder drafts; nickname chip add/remove; stock nicknames; Start your own shop → signup tab + account note; Sign in → login tab; demo from the note; 390px no overflow |

### Integration and Evidence Status

- **Real integrations:** WhatsApp `wa.me` deep link (VERIFIED link format)
- **Simulated functionality:** sample shop data (synthetic, labelled "Sample")
- **Verified evidence links:** none public yet
- **Unverified claims:** agent conversation quality and tool choice; scheduled automation; hosted deploy

## Decision Log

### 2026-11-02 — Text-only Groq agent and typed old-balance import
- **Decision:** Remove notebook-photo capture and all claims that the agent reads images. Keep typed old-balance imports and owner review so existing drafts are not stranded. Use Groq `openai/gpt-oss-120b` for text and tool calls; the key remains outside Git.
- **Reason:** The selected Groq model accepts text only. A direct forced tool-call check succeeded; the alternative Groq vision model failed to return the requested tool name reliably.
- **Evidence:** Direct Groq provider test with the owner's key returned the requested tool call. Local `agent-native typecheck` and `doctor` passed clean after photo capture was removed. PR #2 merged and its Vercel preview passed. Vercel API showed `GROQ_API_KEY` as a Production sensitive variable and both `AGENT_ENGINE` and `AGENT_MODEL` as Production variables. A browser smoke and complete app-level run still require verification.
- **Status:** MERGED; production agent UNVERIFIED

### 2026-11-01 — Action-driven fallback for the live agent
- **Decision:** Today quick checks call `get-shop-overview` and `reconcile-ledger` directly. The freeform entry keeps the owner's words after handoff and offers the existing manual sale form.
- **Reason:** A failed model run must not block the judge's read-only checks or erase the owner's entry. UI and agent still share the same action layer.
- **Evidence:** Local typecheck and `agent-native doctor` passed; browser sample shop showed direct summary (₦6,300 sales), reconciliation (7 products, 5 customers, balanced), retained entry text, and the manual sale dialog. Production verification pending.
- **Status:** VERIFIED locally, UNVERIFIED in production

### 2026-11-01 — Read-only daily questions and live agent failure
- **Decision:** Route daily sales questions to `get-shop-overview` and book checks to `reconcile-ledger`; reserve `close-the-day` for explicit close requests. Make both quick asks name their read-only action. Replace the starter SEO title and description.
- **Reason:** The prior prompt mapped "how did today go" to a write action. A live sample-shop run failed, so agent behavior is not yet proven on production.
- **Evidence:** Live browser demo showed the failed run and save toast; source review found the prompt mapping. The prompt and metadata edits have not been deployed or retested.
- **Status:** IMPLEMENTED in a local source snapshot; UNVERIFIED in production

### 2026-10-31 — Build Shop Ledger with FutureUni theme
- **Decision:** Build idea #1; theme with the FutureUni design system
- **Reason:** discovery ranking; company rule that FutureUni visuals and UI follow its design system
- **Alternatives considered:** Scope Guard, Shift Handover, Clip-to-Fix, Quote-to-Order
- **Evidence:** official rules/judging; Agent-Native template catalogue
- **Impact:** scope set; brand tokens in `app/global.css`
- **Status:** APPROVED

### 2026-10-31 — Owner-only approval via `uiOnly`
- **Decision:** approve-reminder and mark-reminder-sent are `uiOnly` + `agentTool:false`
- **Reason:** the agent drafts; only a signed-in human may approve or claim a send
- **Alternatives considered:** `needsApproval` (would let the agent request approval in chat), `agentTool:false` alone (still reachable over HTTP/MCP)
- **Evidence:** CLI and raw HTTP refused (verify script; Playwright 403); UI button approved
- **Impact:** trust boundary is enforced by the framework, not the prompt
- **Status:** APPROVED

### 2026-10-31 — Coding-agent rules kept short in AGENTS.md
- **Decision:** add only a 2-line pointer to this file in AGENTS.md
- **Reason:** AGENTS.md is the in-app agent's prompt and is cut at 6,000 chars
- **Alternatives considered:** full template section (would truncate the shop instructions)
- **Evidence:** framework build-an-app guide
- **Impact:** recovery rules live here
- **Status:** APPROVED

### 2026-10-31 — Hosting: public GitHub repo, Neon Postgres, Vercel
- **Decision:** public repo 0xNexuz/shop-ledger; free Neon Postgres via Vercel Marketplace; deploy to Vercel team "xreyy's projects"
- **Reason:** Supabase org already at 2 active free projects (EduCraft, Forge); public code helps judging
- **Alternatives considered:** new paid Supabase project; holding the deploy
- **Evidence:** Supabase org listing; `NITRO_PRESET=vercel` build succeeded locally with a daily `0 18 * * *` cron (Hobby-compatible)
- **Impact:** `vercel.json` added; Builder.io analytics IDs removed from the starter's netlify.toml
- **Status:** APPROVED

### 2026-10-31 — Original logo and preloader (branch `brand-refresh`)
- **Decision:** one original character (shop owner in a pleated gele, holding her ledger) used in the logo, hero scene, icons and preloader; lockup is the character beside a heavy stacked SHOP / LEDGER with the tagline "Books for small shops"
- **Reason:** owner asked for a logo in the style of a mascot-plus-heavy-wordmark reference (a coffee-shop logo); used as style inspiration only, nothing traced or copied
- **Alternatives considered:** waiting for an Olea logo video (never arrived; replaced by the image reference)
- **Evidence:** `shared/brand-logo.ts`, `shared/brand-art.ts`; icons generated by `scripts/brand-icons.ts`; browser smoke of sign-in, onboarding, sample-shop flows, preloader (light, dark, reduced motion), typecheck, 18 vitest, doctor clean, `verify-rules.sh` 18/18
- **Impact:** the preloader replaces the framework's skeleton as the server-rendered shell (`clientOnlyFallback`); Agent-Native's own logo files are untouched (still used by its "Powered by" badge)
- **Status:** IMPLEMENTED, awaiting push approval

### 2026-10-31 — One-tap demo entry and doodled preloader
- **Decision:** "Try the demo, no sign-up" button on the sign-in panel; each tap makes a private throwaway account (random `visitor-…@demo.shop-ledger.invalid`, random password never shown) through the framework's own register + login endpoints, then `/shop?demo=1` loads the sample shop. Preloader is the logo drawn line by line with the letters traced, then coloured; one shared overlay (`StartupSplash` + `preloader-store`) so screens never hand over between loaders
- **Reason:** owner wants judges and visitors in without making an account, and a preloader that can actually be seen
- **Alternatives considered:** a shared demo login (visitors would see and change each other's data); turning auth off (same problem, plus open admin)
- **Evidence:** local browser smoke: demo button → sample shop on desktop and phone; splash and overlay traced frame by frame (no blank gaps); hydration keeps the panel (splash must not be a `<div>`); typecheck, 18 vitest, doctor clean, full sample-shop smoke
- **Impact:** anyone can create demo accounts (rows in Neon, AI usage on the deployment key); no clean-up job yet
- **Status:** IMPLEMENTED

### 2026-10-31 — Four agent features: notebook, local languages, credit sense, evening close
- **Decision:** (1) a photo of the paper notebook goes to the agent, which may only *propose* an import; the owner ticks lines and applies it from Today (`apply-notebook-import` is UI-only), posting ordinary opening-balance and stock-count entries. (2) Dictation (Web Speech, en-NG) and a prompt that understands English, Pidgin, Yoruba, Hausa and Igbo shop words and answers in kind. (3) Credit sense computed from posted entries only (most paid back, lateness, owner or suggested limit); a credit sale over the line fails with `credit_check` until the owner confirms. (4) Evening close: `close-the-day` writes the day's totals and drafts (never sends) reminders for late payers, once per Lagos day; the nightly run rides on the framework's daily sweep (Vercel Cron 18:00 UTC with CRON_SECRET). Nicknames (`add-nickname`) are matched like real names; a nickname can belong to one record only
- **Reason:** owner asked to raise innovation and use the agent more; each feature keeps the agent's power behind the same server rules and owner approval
- **Alternatives considered:** letting the agent apply notebook imports directly (rejected: money enters the books unseen); an LLM credit score (rejected: not explainable); a separate cron route (rejected: Hobby allows one daily cron, the framework already owns it)
- **Evidence:** verify-rules 31/31, vitest 19/19, typecheck, doctor clean, sweep curl test, browser smokes (see Verification)
- **Impact:** migrations v2 (imports, aliases, credit limit) and v3 (daily_closes) run on deploy
- **Status:** IMPLEMENTED; live agent behaviour UNVERIFIED until tested with the production AI key

### 2026-10-31 — Welcome card: two clear ways in
- **Decision:** "Try the demo" first; "Start your own shop" second (opens the framework form on the Create account tab); "Already started a shop? Sign in" (Sign in tab). While the form shows, the panel explains accounts: books belong to the email used; no confirmation email is sent; no password reset yet
- **Reason:** owner asked how to serve both judges and real shop owners, and whether people know any email works
- **Alternatives considered:** "Keep this shop" (turn a demo into a real account): books are filed under the account email, so it means moving every record to a new email; deferred
- **Evidence:** browser smoke on desktop and 390px
- **Status:** IMPLEMENTED

## Next Action

- **Next recommended action:** test the live agent with Groq (a Pidgin sentence, a credit sale to Chinedu, "close the day", "Mama N na Mama Ngozi"); then record the Clips demo
- **Next authorized action:** pushes to `main` (owner said "push deploy whats needed")
- **Next approved milestone:** submission by Sun Nov 8 (deadline Tue Nov 10 08:59 Lagos)
- **Approval boundary:** submitting, paid resources and anything public beyond the existing deploy need explicit go-ahead
