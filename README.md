# Shop Ledger

**A small shop's books, kept by talking.** Built by Mag for the [Builder.io Agent-Native Hackathon](https://www.builder.io/hackathon) (Oct 27 – Nov 9, 2026).

**Live app: [shop-ledger-peach.vercel.app](https://shop-ledger-peach.vercel.app)** (tap **Try the demo**: a private sample shop opens in seconds, no sign-up)

**Demo video: [Shop Ledger walkthrough on Clips](https://clips.agent-native.com/share/aMVt1nptuM2K)**

![Shop Ledger welcome screen](docs/screenshots/welcome.png)

Millions of shops in Nigeria and across Africa still keep sales, stock and "who owes what" in an exercise book. Credit ("put it on my account") is how many customers buy, and chasing it is awkward and easy to forget. Shop Ledger lets the owner say what happened, the way they would say it:

> "I sell 2 bag rice give Mama Ngozi, she pay 50k, remain go come Friday."

The agent records the sale, takes the bags out of stock, and puts the unpaid balance on Mama Ngozi's account with Friday as the promised day. The Today screen updates as it writes. Money and stock rules are enforced by the server, and nothing leaves the shop (a reminder) or enters the books from the old notebook until the owner approves it.

![Today: the ask bar, today's figures read straight from the books, the evening close and the daybook](docs/screenshots/today.png)

## What it does

| Feature | What happens |
| --- | --- |
| **Talk like you talk** | Type or speak in English, Nigerian Pidgin, Yoruba, Hausa or Igbo ("bashi", "gbese", "e don pay", "5k"). The agent records sales and payments, answers questions about the day, credit and the books, and replies in the same language. If the agent can't finish, the owner's words stay in the box with a link to enter the sale by hand. |
| **Bring in old balances** | Type old debts or stock counts from the paper notebook to the agent. It proposes entries; they wait on Today until the owner ticks them and taps **Add**. |
| **Credit sense** | Before more credit goes out, the server checks the customer's own history: what they owe, how late they are, the most they've owed and paid back. A late payer or a sale over their limit is stopped with the reason, and goes through only when the owner says so. |
| **Evening close** | At 7 pm Lagos the day closes by itself: totals, who is late, and a WhatsApp reminder **draft** for each late payer. The owner can also close the day from Today or by asking. |
| **Learns your shop** | "Mama Pikin na Mama Ngozi", "one bag is the rice". Nicknames are saved and understood by every action afterwards. A nickname can belong to one customer or product only. |
| **Reminders the owner sends** | The agent drafts; only the owner can approve, and approving opens WhatsApp with the message ready to send from their own phone. |
| **Quick checks** | **How did we do today?** and **Check my books** read the books directly (`get-shop-overview`, `reconcile-ledger`), so they answer instantly even when the AI model is slow. |
| **Everything by hand too** | New sale, payments, restock, stock counts, voids, customers and products all have screens. Each entry shows who made it: you, the agent, the nightly job or sample data. |

| Credit check before a sale | A customer's account and credit standing |
| --- | --- |
| ![Credit check in the sale dialog](docs/screenshots/credit-check.png) | ![Customer page with credit standing and a nickname](docs/screenshots/customer.png) |

## How it uses Agent-Native

| Framework piece | How Shop Ledger uses it |
| --- | --- |
| Actions as the single source of truth | 31 shop actions (`actions/*.ts`), defined once. The screens call them through the client hooks, the agent calls them as tools, and the CLI runs them (`pnpm action …`). `scripts/verify-rules.sh` proves the rules through the CLI. |
| Rules in actions, typed errors | `insufficient_stock`, `credit_needs_customer`, `overpayment`, `credit_check`, `nickname_taken`, `void_conflict`… The agent reads the error and explains it with the real figure instead of retrying with invented numbers. |
| Owner-only actions (`uiOnly`) | `approve-reminder`, `mark-reminder-sent` and `apply-notebook-import` run only for a signed-in person in the app. The agent, MCP clients, the CLI and raw HTTP get `403 ui_capability_required`. |
| Agent chat plugin | A short bookkeeping prompt (rules, credit sense, typed old balances, five languages, the evening close, nicknames) and a focused set of eight shop tools: `get-shop-overview`, `record-sale`, `record-payment`, `reconcile-ledger`, `get-credit-standing`, `close-the-day`, `propose-notebook-import`, `add-nickname`. Tool results are capped at 1,800 characters so a whole turn fits Groq's free tier (8,000 tokens a minute). |
| UI → agent hand-off (`sendToAgentChat`) | The ask bar, voice input, and "Ask the agent" links. The two Today quick checks call their read-only actions directly. |
| Live sync and context | `useDbSync` refreshes the screens while the agent writes. The shop screens publish their navigation state (`shopTab`, `customerId`) to the framework's application state. |
| SQL, migrations, access control | Drizzle schema with additive migrations (v1–v3); `ownerEmail`/`orgId` columns with the framework's `accessFilter`, so each account sees only its own shop. `agent-native doctor` is clean (no unscoped queries, no credentials from env). |
| Auth | Framework accounts. **Try the demo** uses the framework's own register and login endpoints to make a private throwaway account. |
| Jobs | The evening close rides on the framework's daily sweep (Vercel Cron at 18:00 UTC, `CRON_SECRET` checked with `readDeployCredentialEnv`). |
| Model choice | Groq `openai/gpt-oss-120b` (text and tool calls) through `AGENT_ENGINE=ai-sdk:groq` and `AGENT_MODEL`. Other providers the framework supports work the same way. |

## Rules the server enforces

These live in the actions, not in the prompt:

- Stock never goes below zero (conditional atomic update plus a database `CHECK`).
- Anything left unpaid needs a named customer; a payment can't exceed what is owed.
- Money is integer kobo; there are no floating-point naira.
- Entries are append-only. A mistake is **voided**: stock and balances are reversed and the entry stays, marked, for the audit trail. A void that would push stock or a balance below zero is refused.
- Names are matched carefully (real names, then nicknames, then whole words of a name: "Ngozi" finds Mama Ngozi, but "Ada" never finds Adaeze). An ambiguous name is reported, never guessed, and a new name that looks like an existing customer (a typo, or a fuller name) is asked about before a second account is opened.
- More credit to someone over 7 days late, or over their limit, needs the owner's explicit yes (`confirmCredit`).
- A typed old-balance import is only a draft until the owner applies it in the app.
- One open reminder per customer (partial unique index). Reminders follow a state machine: `draft → approved → sent`, or `dismissed`. The evening close drafts only for late payers who have no open reminder.
- Stock and balances are cached on rows *and* derivable from entries; `reconcile-ledger` recomputes both and lists any mismatch.

## Proof

| Check | Command | Last result |
| --- | --- | --- |
| Unit tests: money, matching and nicknames, look-alike names, open promises, time, reminder machine | `pnpm exec vitest run` | 32/32 passed (Nov 5) |
| Ledger rules against a real database | `bash scripts/verify-rules.sh` (dev server running) | 40/40 passed (Nov 5) |
| Types | `pnpm typecheck` | clean (Nov 2) |
| Framework guards (scoping, credentials, migrations…) | `pnpm agent-native:doctor` | clean (Nov 2) |
| 7 pm hook | `curl` the sweep path with a wrong and a right cron secret | wrong → 401, nothing closed; right → 200, every active shop closed (Oct 31) |
| Browser (Playwright) | welcome card, demo, sale, credit warning, typed import review, evening close, nicknames, reminders, phone width | passed locally (Oct 31); raw HTTP approval refused with 403 |
| Production agent | a sample shop asks for the day's overview on the live site | Groq called `get-shop-overview`, replied, no errors (Nov 2) |

## Real vs. not yet verified

| Part | Status |
| --- | --- |
| Ledger, stock, credit sense, voids, reconciliation, nicknames, evening close | **Real**, verified locally on PGlite (Postgres) and deployed |
| Screens and the demo entry | **Real**, verified in a headless browser; live at the link above |
| Hosting | **Real**: Vercel (functions in `cle1`) + Neon Postgres |
| WhatsApp hand-off | **Real** `wa.me` link with the text filled in; the owner sends it from WhatsApp |
| The agent on the live site | **Real** on Groq: a production overview conversation completed on Nov 2, and the [demo video](https://clips.agent-native.com/share/aMVt1nptuM2K) shows the agent in use. Answers depend on the model; other agent flows have no automated production check. |
| The 7 pm close on Vercel Cron | Configured; verified locally with the same request Vercel sends |

## Accounts

- **Try the demo** makes a private throwaway account that lives in that browser; each visitor gets their own sample shop.
- **Start your own shop** uses any email and a password. The books belong to that email, so signing in with it on another phone opens the same shop.
- No confirmation email is sent and there is no password reset yet (no email provider is configured).

## Run it

```bash
pnpm install          # if node-pty fails to build: npm_config_nodedir=$(dirname $(dirname $(which node))) pnpm install
pnpm dev              # open the printed URL and tap "Try the demo"
```

To talk to the agent, copy `.env.example` to `.env` (it selects Groq and the model) and add `GROQ_API_KEY`. The ledger, screens, rules and quick checks work without a key.

### Deploy (Vercel + Neon)

`vercel.json` builds with the Vercel preset, runs `pnpm migrate:production` on production deploys, and pins functions to `cle1` (next to the Neon database; keep them in the same region).

1. Import the GitHub repo into Vercel (framework: Other).
2. Vercel → Storage → add **Neon** and connect it; it sets `DATABASE_URL`.
3. Add environment variables: `BETTER_AUTH_SECRET` and `CRON_SECRET` (each `openssl rand -hex 32`), `AGENT_NATIVE_RELEASE_MIGRATIONS=1`, `AGENT_ENGINE=ai-sdk:groq`, `AGENT_MODEL=openai/gpt-oss-120b`, and `GROQ_API_KEY` (as a sensitive variable).
4. Deploy and open the URL.

The daily sweep (and the evening close) runs at 18:00 UTC, which Vercel's free plan allows.

## Where things are

| Path | What |
| --- | --- |
| `actions/` | Every operation, shared by screens, agent and CLI |
| `server/lib/` | Ledger, credit sense, typed old-balance imports, evening close, nicknames, matching, money and time |
| `server/plugins/` | Migrations, the agent's instructions and tools, branding |
| `server/middleware/evening-close.ts` | The 7 pm hook on the framework's sweep |
| `app/routes/shop*` and `app/components/shop/` | Today, Ledger, Customers, Stock and their parts |
| `scripts/verify-rules.sh` | The 31 rule checks |
| `docs/DEMO.md` | The demo script ([video](https://clips.agent-native.com/share/aMVt1nptuM2K)) |

## Pre-existing work and what was built during the hackathon

- **Pre-existing:** the open-source [Agent-Native](https://github.com/BuilderIO/agent-native) Chat starter (`npx @agent-native/core create --template starter`): app shell, auth, agent chat, sidebar, UI primitives, and its `navigate`, `view-screen`, `run` and `provider-api-request` actions. The brand tokens come from Mag's own design system; the fonts (Space Grotesk, Poppins) are open source. Libraries are listed in `package.json` (React Router, Nitro, Drizzle ORM, Tailwind CSS, Zod, Tabler Icons, Sonner and others). Services: Vercel, Neon Postgres, Groq.
- **Built during the event (from Oct 31, 2026):** everything under `server/db`, `server/lib`, `server/middleware/evening-close.ts`, `server/plugins/db.ts`, the 31 shop actions, `app/routes/shop*`, `app/components/shop/`, `app/components/brand/`, the logo, illustrations and sign-in page, the theme changes in `app/global.css`, the agent instructions, the sample data, the tests and `scripts/verify-rules.sh`. See the git history.

All sample people, phone numbers and figures are invented.
