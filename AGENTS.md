# Chat — Agent Guide

Chat is the minimal chat-first agent-native app. `/` redirects to shared sign-in, then `/home`, the editable Get started page. Chat lives at `/chat`; new chats start there. Actions carry capabilities; screens exist only for durable workflows.

## Skills

Search with `rg --hidden --follow`; read the exact linked guide before deeper work. `.agents/skills/build-an-app/SKILL.md` — start here for vague requests to create a domain app. `.agents/skills/adding-a-feature/SKILL.md` — cross-area feature checklist. Data/integrations: `.agents/skills/actions/SKILL.md`, `.agents/skills/storing-data/SKILL.md`, `.agents/skills/security/SKILL.md`, `.agents/skills/secrets/SKILL.md`, `.agents/skills/sharing/SKILL.md`. UI: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/shadcn-ui/SKILL.md`, `.agents/skills/client-side-routing/SKILL.md`. Agent context/workflows: `.agents/skills/context-awareness/SKILL.md`, `.agents/skills/real-time-sync/SKILL.md`, `.agents/skills/reliable-mutations/SKILL.md`, `.agents/skills/performance/SKILL.md`, `.agents/skills/delegate-to-agent/SKILL.md`. Framework: `.agents/skills/agent-native-docs/SKILL.md`, `.agents/skills/agent-native-toolkit/SKILL.md`, `.agents/skills/customizing-agent-native/SKILL.md`.

Use local docs only (no web research): `pnpm action docs-search --query "<topic>"`, `pnpm action docs-search --slug "<slug>"`, `pnpm action docs-search --list`, `pnpm action source-search --query "<pattern>"`, `pnpm action source-search --path <path>`, or `pnpm action source-search --list`. For external-agent integrations, read `pnpm action docs-search --slug "external-agents"`.

## Core rules

- UI feedback: target 100 ms, never exceed 400 ms; acknowledge before network work.
- Normal app data must flow through actions. Keep actions deterministic and focused; use agent chat/AgentSidebar for AI work and follow-ups in the same thread. Keep structured state in SQL and large files in configured storage; persist references only.
- For external integrations, inspect the workspace/provider connection catalog first; reuse its scoped resolver. Never hardcode credentials, webhook URLs, or private/customer data.
- Never fabricate. Report failures and recover; verify writes by reading the row or screen. Navigation is in `<current-screen>`; use `view-screen` for fresh visible-record details.

For custom branding, keep `server/plugins/agent-native-email-branding.ts` aligned: `app.name` appears in transactional email and optional `app.logoUrl` must be an absolute HTTPS URL.

## Application state

- `navigation` describes the view and selected ids. Chat is `chat` at `/chat` and `/chat/<threadId>`; the Get started page is `home` at `/home`; `/` opens shared sign-in/signup.
- Use `navigate` when supported and `view-screen` for a fresh read of visible details; basic navigation is already in `<current-screen>`.

## Building a domain app

Choose the primary workflow and route before editing. Add a domain route under `app/routes/` and set `app.homePath` in `server/plugins/agent-native-email-branding.ts` with `defineAppConfig`. The default Get started page lives at `/home`, and Chat stays at `/chat`; edit `app/routes/home.tsx` when replacing that page with a domain-specific home. Add a static link in `app/components/layout/Sidebar.tsx` before `ChatThreadsSection`; `Header.tsx` uses `APP_TITLE` elsewhere. Shared sidebar and AgentInspector remain.

Use `adding-a-feature` for functional parity and `frontend-design` for a user-facing screen. Keep feature guidance here; do not rewrite `README.md` or `DESIGN.md`. After all edits, run one typecheck, one doctor check, and one browser smoke of the primary workflow, including overlap rejection, cancellation freeing the slot, and authenticated landing. Skip production build and extra test suites.

Before building common workspace or agent UI, read `agent-native-toolkit`; for supported customization, read `customizing-agent-native`.

- Guarded verification: run `pnpm agent-native:doctor`; fix findings before done.

## Shop Ledger

Bookkeeper for a small shop. `/shop` Today, `/shop/ledger?day=`, `/shop/customers/:id`, `/shop/stock`. Amounts are naira ("20k" = 20000); days are YYYY-MM-DD in the shop's timezone (Africa/Lagos).

- Record with the actions; the server enforces the rules. Report a rejection with the real figure, never retry with invented numbers: `insufficient_stock`, `credit_needs_customer`, `overpayment`, `void_conflict`. On `unknown_product`/`ambiguous_*`, ask which one.
- Entries are never edited: fix mistakes with `void-entry`. Stock changes only through sales, restocks and `record-stock-count`.
- A credit sale to a new name creates the customer. Ask for `dueDate` when the owner says when they'll pay.
- Reminders: `draft-reminders` only. Approving and sending are owner-only (UI); never claim a reminder was sent.
- `navigation` adds `shopTab` (today/ledger/customers/stock) and `customerId`.

| Action | Purpose |
|-|-|
| get-shop-overview | Day totals, debtors, low stock, recent entries |
| record-sale | Items sold, paid now, rest on credit |
| record-payment | Customer pays towards balance |
| record-restock | Stock arrived |
| record-stock-count | Set stock to a physical count |
| void-entry | Reverse a mistaken entry |
| list-entries / list-customers / get-customer / list-products | Read the books |
| draft-reminders / list-reminders / update-reminder | Debtor reminders (drafts only) |
| create-product / update-product / create-customer / update-customer | Catalogue |
| reconcile-ledger | Prove stock and balances match the entries |
| propose-notebook-import | Draft customers/stock read from a notebook photo (owner applies in UI) |
| get-credit-standing | Repayment history, limit and good/watch/hold status |
| close-the-day / get-latest-close | Evening close: day totals + reminder drafts (also runs at 7 pm Lagos) |
| add-nickname / remove-nickname | Teach or forget another name for a customer or product |

## For coding agents

Read `docs/PROJECT_CONTEXT.md` first: verified status, decisions and the next approved step. Never report a check you did not run; `bash scripts/verify-rules.sh` proves the ledger rules.
