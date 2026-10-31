# Shop Ledger

**A small shop's books, kept by talking.** Built for the [Builder.io Agent-Native Hackathon](https://www.builder.io/hackathon) (Oct 27 – Nov 9, 2026) by FUTUREUNI.

Millions of shops still keep sales, stock and "who owes what" in an exercise book. Shop Ledger lets the owner say what happened, in plain words or by voice:

> "Sold 2 bags of rice to Mama Ngozi, she paid 50k, rest next Friday."

The agent records the sale, takes the bags out of stock, puts ₦106,000 on Mama Ngozi's account with the promised date, and the Today screen updates live. The owner can see and correct everything by hand. When customers fall behind, the agent drafts polite WhatsApp reminders, and **only the owner can approve one**. Approving opens WhatsApp with the message ready to send from their own phone.

## How people and the agent work together

| The agent does | The person does |
| --- | --- |
| Turns sentences into sales, payments, restocks and stock counts | Sees every entry, who made it (agent / you), and voids mistakes |
| Answers "how did we do today?", "who owes?", "what's running low?" | Records sales and payments by hand when that's quicker |
| Drafts reminders for overdue customers | Edits, approves and sends reminders from their own WhatsApp |
| Checks the books balance (`reconcile-ledger`) | Decides what to restock and who to chase |

Both sides call **the same 22 actions** (`actions/*.ts`), so a rule enforced once holds for the screens, the agent, the CLI and any MCP client.

## Rules the server enforces

These live in the actions, not in the prompt, so neither the agent nor a buggy screen can break them:

- Stock never goes below zero (conditional atomic update, plus a database `CHECK`).
- Anything left unpaid needs a named customer; a payment can't exceed what is owed.
- Money is integer kobo; there are no floating-point naira.
- Entries are append-only. A mistake is **voided**: stock and balances are reversed and the entry stays, marked, for the audit trail. A void that would push stock or a balance below zero is refused.
- Product and customer names are matched carefully. An ambiguous name is reported, never guessed.
- One open reminder per customer (partial unique index). Reminders follow a state machine: `draft → approved → sent`, or `dismissed`.
- **Approving and marking sent are `uiOnly` actions.** They run only for a signed-in person in the app UI, never for the agent, an MCP client, raw HTTP or the CLI.
- Stock and balances are cached on rows *and* derivable from entries; `reconcile-ledger` recomputes both and lists any mismatch.

## Proof

| Check | Command | Last result |
| --- | --- | --- |
| Unit tests: money, matching, time, reminder machine | `pnpm exec vitest --run` | 18/18 passed |
| Ledger rules against a real database | `bash scripts/verify-rules.sh` (dev server running) | 18/18 passed |
| Types | `pnpm typecheck` | clean |
| Framework guards (scoping, credentials, migrations…) | `pnpm agent-native:doctor` | clean |
| Browser: sign-in, sample shop, sale, reminder approval, all tabs, mobile | Playwright smoke | passed; raw HTTP approval refused with 403 |

## Real vs. not yet verified

| Part | Status |
| --- | --- |
| Ledger, stock, credit, voids, reconciliation | **Real**, verified locally on PGlite (Postgres) |
| Screens (Today, Ledger, Customers, Stock, sale dialog, reminder approval) | **Real**, verified in a headless browser |
| WhatsApp hand-off | **Real** `wa.me` deep link with the text prefilled; sending is done by the owner in WhatsApp |
| Agent turning sentences into entries | Implemented through the framework's agent and the actions above; **unverified until an AI key is connected** (Settings → "Use Builder.io" or a personal key) |
| Evening reminder drafts | The button asks the agent to create a scheduled automation; **unverified** for the same reason |
| Hosted deploy (Vercel + Supabase Postgres) | **Not yet done** |

## Run it

```bash
pnpm install          # if node-pty fails to build: npm_config_nodedir=$(dirname $(dirname $(which node))) pnpm install
pnpm dev              # open the printed URL, sign in, choose "Open the sample shop"
```

Connect an AI provider in the app's settings ("Use Builder.io" or a personal Anthropic/OpenAI/OpenRouter key) to talk to the agent. The ledger, screens and rules work without one.

### Deploy (Vercel + Neon)

`vercel.json` makes a Git-connected Vercel project build with the Vercel preset and run `pnpm migrate:production` on production deploys.

1. Import the GitHub repo into Vercel (framework: Other; the settings in `vercel.json` apply).
2. Vercel → Storage → add **Neon** (free) and connect it to the project; it sets `DATABASE_URL`.
3. Add environment variables: `BETTER_AUTH_SECRET` and `CRON_SECRET` (each `openssl rand -hex 32`), and `AGENT_NATIVE_RELEASE_MIGRATIONS=1`.
4. Deploy, open the URL, create the first account, then connect an AI provider in Settings.

The scheduler sweep runs once a day at 18:00 UTC (7pm Lagos), which Vercel's free plan allows. On Pro, set `AGENT_NATIVE_VERCEL_CRON_SCHEDULE="* * * * *"` for minute-level automations.

## Pre-existing work and what was built during the hackathon

- **Pre-existing:** the open-source [Agent-Native](https://github.com/BuilderIO/agent-native) Chat starter (`npx @agent-native/core create --template starter`): app shell, auth, agent chat, sidebar, UI primitives. The FUTUREUNI brand tokens and fonts (Space Grotesk, Poppins) are FUTUREUNI's own design system.
- **Built during the event (from Oct 31, 2026):** everything under `server/db`, `server/lib`, `server/plugins/db.ts`, the 22 shop actions in `actions/`, `app/routes/shop*`, `app/components/shop/`, the theme changes in `app/global.css`, shop navigation and sidebar wiring, the agent instructions, the sample data, the tests and `scripts/verify-rules.sh`. See the git history.

All sample people, phone numbers and figures are invented.
