# Project Context

Keep this file concise and evidence-based. Update current state in place, append decision-log entries, and never store secrets.

## Project Identity

- **Project name:** Shop Ledger
- **Repository:** not yet pushed (local repo; GitHub repo pending owner/name from the team)
- **Project description:** Agent-native bookkeeping for small shops: say what happened, the agent records sales, credit, payments and stock through shared actions; the owner approves debtor reminders and sends them from WhatsApp.
- **Current workflow stage:** DEVELOPMENT (P0 complete) → next: hosting (P1)
- **Overall status:** IMPLEMENTED; core ledger, rules and screens VERIFIED locally; agent conversation UNVERIFIED (no AI key in the build environment)
- **Last updated date:** 2026-10-31

## Git State

- **Branch:** master
- **HEAD:** see `git log -1` (M3 commit, 2026-10-31)
- **Working tree:** clean after the M3 commit
- **Relevant remote or PR:** none yet
- **Last verified milestone:** M3: agent instructions, UI-only approval, verify script (2026-10-31)

## Hackathon Context

- **Competition:** Agent-Native Hackathon
- **Organizer:** Builder.io
- **Tracks:** single ranked pool; recognition categories (Best Overall, Productivity, Most Creative, Best Use of Agent-Native) carry no extra cash
- **Sponsors:** Builder.io
- **Deadline:** Mon 2026-11-09 23:59 PT = Tue 2026-11-10 08:59 Lagos (live rules page, checked 2026-10-31; older cached copies said Nov 2, so re-check before submitting)
- **Eligibility:** worldwide, 18+, sanctions apply; per-entry prizes; non-US winners may face up to 30% US withholding
- **Judging:** Usefulness & Execution 40%, Creativity & Design 20%, Innovation 20%, Cleverness/Use of Agent-Native 20%
- **Submission:** builder.io/hackathon/submit; required public Clips recording (viewable without login), description incl. team and pre-existing work; GitHub URL and slides optional
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

- **Approved implementation scope:** P0 build of Shop Ledger + hosting on GitHub/Vercel/Neon Postgres (approved 2026-10-31; Supabase is not used)
- **Completed features:** schema/migrations; 22 actions; rules; reminders state machine; Today/Ledger/Customers/Stock screens; sale dialog; onboarding + sample shop; agent prompt, tools, navigation state; UI-only approval; verify script; brand refresh on branch `brand-refresh` (original logo + animated lockup, sidebar mark, favicon/icons, branded sign-in, hero scene, empty-state drawings, preloader) — not merged or pushed yet
- **Implemented but unverified:** agent turning sentences into entries; evening automation button (both need an AI key)
- **Pending features:** deploy; Clips demo; optional Telegram entry via Dispatch; CSV export
- **P0 priorities:** none open
- **P1 priorities:** connect AI key and verify agent flows end to end; GitHub repo; Neon + Vercel deploy; record Clips demo; submit by Sun Nov 8
- **P2 priorities:** Telegram/Dispatch entry; CSV export; i18n of new UI strings
- **P3 priorities:** polish (formatted promise dates in summaries)
- **Current milestone:** P1 hosting
- **Known blockers:** GitHub repo `0xNexuz/shop-ledger` must be created by the owner (this session can't create repos); Neon must be added from the Vercel dashboard (terms acceptance); AI key choice

## Verification

### Tests Actually Executed

| Date | Command or check | Environment | Result | Evidence or notes |
|---|---|---|---|---|
| 2026-10-31 | `pnpm exec vitest --run` | workspace, Node 22 | VERIFIED 18/18 | money, matching, time/DST, reminder machine, phone/wa.me |
| 2026-10-31 | `bash scripts/verify-rules.sh` | dev server + PGlite | VERIFIED 18/18 | stock, credit, overpayment, voids, counts, reminders, uiOnly, reconcile |
| 2026-10-31 | `pnpm typecheck` | workspace | VERIFIED clean | |
| 2026-10-31 | `pnpm agent-native:doctor` | workspace | VERIFIED clean | |
| 2026-10-31 | Playwright smoke (Chrome headless) | dev server | VERIFIED | sign-in → sample shop → sale → reminder approve → tabs → mobile 390px; raw HTTP approve → 403 `ui_capability_required` |

### Integration and Evidence Status

- **Real integrations:** WhatsApp `wa.me` deep link (VERIFIED link format)
- **Simulated functionality:** sample shop data (synthetic, labelled "Sample")
- **Verified evidence links:** none public yet
- **Unverified claims:** agent conversation quality and tool choice; scheduled automation; hosted deploy

## Decision Log

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

## Next Action

- **Next recommended action:** owner creates the empty repo; push; import into Vercel; add Neon + secrets; deploy; connect an AI provider and run the agent flows
- **Next authorized action:** hosting setup was approved in principle; needs repo owner/name, and confirmation of any cost
- **Next approved milestone:** P1 hosting
- **Approval boundary:** pushing to a named repo, creating paid resources, deploying publicly, and submitting all need explicit go-ahead
