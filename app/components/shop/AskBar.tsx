import { IconMicrophone, IconSend2 } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { askAgent } from "./format";

const EXAMPLES = [
  "Sold 2 bags of rice to Mama Ngozi, she paid 50k, rest next Friday",
  "Iya Bisi paid 10k by transfer",
  "5 cartons of Indomie came in at 9,200 each",
];

const QUICK_ASKS = [
  { label: "How did we do today?", prompt: "How did the shop do today? Give me sales, cash in, credit given and anything I should act on." },
  {
    label: "Draft overdue reminders",
    prompt:
      "Draft friendly WhatsApp reminders for customers whose promised date has passed. Mention the exact balance and keep each message short and respectful.",
  },
  { label: "What's running low?", prompt: "Which products are running low, and how many of each should I restock based on this week's sales?" },
  { label: "Check my books", prompt: "Check that my books balance: stock and every customer's balance against the entries." },
];

/** The shop's front door: say what happened in plain words and the agent records it. */
export function AskBar() {
  const [text, setText] = useState("");
  const [example] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)] ?? EXAMPLES[0]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    askAgent(message);
    setText("");
  }

  return (
    <section aria-labelledby="ask-heading" className="space-y-3">
      <form
        onSubmit={submit}
        className="brand-corner flex items-center gap-2 rounded-lg border-2 border-foreground bg-card p-1.5 pl-4 shadow-[4px_4px_0_0_hsl(var(--brand-violet))] focus-within:shadow-[6px_6px_0_0_hsl(var(--brand-violet))] transition-shadow"
      >
        <label id="ask-heading" htmlFor="ask-input" className="sr-only">
          Tell the shop agent what happened
        </label>
        <input
          id="ask-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`e.g. "${example}"`}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" disabled={!text.trim()} className="gap-1.5 rounded-md">
          <IconSend2 className="size-4" />
          <span className="hidden sm:inline">Record</span>
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_ASKS.map((ask) => (
          <button
            key={ask.label}
            type="button"
            onClick={() => askAgent(ask.prompt)}
            className="rounded-full border border-input px-3 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ask.label}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex">
          <IconMicrophone className="size-3.5" /> Prefer talking? Use the mic in the agent panel.
        </span>
      </div>
    </section>
  );
}
