import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import {
  IconMicrophone,
  IconPlayerStopFilled,
  IconSend2,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { askAgent, money } from "./format";
import { SnapNotebookButton } from "./NotebookImport";

/** Say it the way you'd say it: English, Pidgin, Yoruba, Hausa or Igbo. */
const EXAMPLES = [
  "Sold 2 bags of rice to Mama Ngozi, she paid 50k, rest next Friday",
  "I sell 2 bag rice give Mama Ngozi, she pay 50k, remain go Friday",
  "Mo ta paali Indomie meji fun Iya Bisi, o san 10k",
  "Na sayar da buhun shinkafa daya ga Chinedu, bashi ne",
  "Mama Ngozi kwụrụ ụgwọ 20k taa",
  "5 cartons of Indomie came in at 9,200 each",
];

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Talk instead of typing: the phone's own speech recognition (Nigerian
 * English, which copes with Pidgin) fills the box, and the owner checks it
 * before pressing Record. Hidden where the browser has no speech support.
 */
function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => setSupported(!!speechRecognition()), []);

  function start() {
    const Ctor = speechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-NG";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalText += text;
        else interim += text;
      }
      onText(`${finalText}${interim}`.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setListening(true);
    rec.start();
  }

  function stop() {
    recognition.current?.stop();
    setListening(false);
  }

  return { supported, listening, start, stop };
}

/** The shop's front door: say what happened in plain words and the agent records it. */
export function AskBar({
  currency,
  onManualSale,
}: {
  currency: string;
  onManualSale: () => void;
}) {
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [view, setView] = useState<"summary" | "books" | null>(null);
  const summary = useActionQuery(
    "get-shop-overview",
    {},
    { enabled: view === "summary" },
  );
  const books = useActionQuery(
    "reconcile-ledger",
    {},
    { enabled: view === "books" },
  );
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = EXAMPLES[exampleIndex] ?? EXAMPLES[0];
  const dictation = useDictation(setText);
  // Rotate the hint so owners see they can write in their own language.
  useEffect(() => {
    const timer = window.setInterval(
      () => setExampleIndex((i) => (i + 1) % EXAMPLES.length),
      4000,
    );
    return () => window.clearInterval(timer);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    askAgent(message);
    setSubmittedText(message);
  }

  return (
    <section aria-labelledby="ask-heading" className="space-y-2.5">
      <form
        onSubmit={submit}
        className="brand-corner flex items-center gap-2 rounded-lg border-2 border-foreground bg-card p-1.5 pl-4 shadow-[4px_4px_0_0_hsl(var(--brand-violet))] focus-within:shadow-[6px_6px_0_0_hsl(var(--brand-violet))] transition-shadow"
      >
        <label id="ask-heading" htmlFor="ask-input" className="sr-only">
          Tell the shop agent what happened, in English, Pidgin, Yoruba, Hausa
          or Igbo
        </label>
        <input
          id="ask-input"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setSubmittedText("");
          }}
          placeholder={
            dictation.listening
              ? "Listening… say what happened"
              : `e.g. "${example}"`
          }
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        {dictation.supported ? (
          <Button
            type="button"
            variant={dictation.listening ? "destructive" : "ghost"}
            size="icon"
            aria-label={
              dictation.listening
                ? "Stop listening"
                : "Say it instead of typing"
            }
            aria-pressed={dictation.listening}
            onClick={() =>
              dictation.listening ? dictation.stop() : dictation.start()
            }
            className="shrink-0 rounded-md"
          >
            {dictation.listening ? (
              <IconPlayerStopFilled className="size-4" />
            ) : (
              <IconMicrophone className="size-4" />
            )}
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={!text.trim() || text.trim() === submittedText}
          className="gap-1.5 rounded-md"
        >
          <IconSend2 className="size-4" />
          <span className="hidden sm:inline">Record</span>
        </Button>
      </form>
      {submittedText ? (
        <div
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          <span>Your words stay here if the agent cannot finish.</span>
          <button
            type="button"
            onClick={onManualSale}
            className="font-medium text-brand-blue underline underline-offset-2"
          >
            Enter sale manually
          </button>
        </div>
      ) : null}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <SnapNotebookButton className="shrink-0 whitespace-nowrap" />
        <button
          type="button"
          onClick={() => setView("summary")}
          className="shrink-0 whitespace-nowrap rounded-full border border-input px-3 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          How did we do today?
        </button>
        <button
          type="button"
          onClick={() => setView("books")}
          className="shrink-0 whitespace-nowrap rounded-full border border-input px-3 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Check my books
        </button>
      </div>
      {view ? (
        <section
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-3 text-sm"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display font-semibold">
              {view === "summary" ? "Today at a glance" : "Books check"}
            </h2>
            <button
              type="button"
              onClick={() => setView(null)}
              aria-label="Close result"
              className="rounded p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconX className="size-4" />
            </button>
          </div>
          {view === "summary" ? (
            summary.isPending ? (
              <p>Checking today's figures…</p>
            ) : summary.error ? (
              <p role="alert">
                {actionErrorMessage(summary.error) ??
                  "Couldn't load today's figures."}
              </p>
            ) : summary.data ? (
              <div className="space-y-1">
                <p>
                  {money(summary.data.sales.total, currency)} in sales from{" "}
                  {summary.data.sales.count}{" "}
                  {summary.data.sales.count === 1 ? "sale" : "sales"}.
                </p>
                <p>
                  Cash in {money(summary.data.cashIn, currency)} · Credit given{" "}
                  {money(summary.data.sales.creditGiven, currency)} · Debts paid{" "}
                  {money(summary.data.paymentsReceived, currency)}.
                </p>
                <p>
                  {money(summary.data.outstanding.total, currency)} owed by{" "}
                  {summary.data.outstanding.debtors}{" "}
                  {summary.data.outstanding.debtors === 1
                    ? "customer"
                    : "customers"}
                  {summary.data.lowStock.length
                    ? ` · ${summary.data.lowStock.length} product${summary.data.lowStock.length === 1 ? "" : "s"} running low`
                    : ""}
                  .
                </p>
              </div>
            ) : null
          ) : books.isPending ? (
            <p>Checking stock and balances…</p>
          ) : books.error ? (
            <p role="alert">
              {actionErrorMessage(books.error) ?? "Couldn't check the books."}
            </p>
          ) : books.data ? (
            books.data.ok ? (
              <p>
                Books balance. Checked {books.data.productsChecked} products and{" "}
                {books.data.customersChecked} customers against the entries.
              </p>
            ) : (
              <div>
                <p className="font-medium text-destructive">
                  {books.data.mismatches.length}{" "}
                  {books.data.mismatches.length === 1
                    ? "mismatch"
                    : "mismatches"}{" "}
                  found.
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {books.data.mismatches.map((item) => (
                    <li key={`${item.kind}:${item.id}`}>
                      {item.name}: saved {item.cached}, entries{" "}
                      {item.fromEntries}
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
