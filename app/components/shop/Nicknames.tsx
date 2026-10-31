import { actionErrorMessage, useActionMutation } from "@agent-native/core/client/hooks";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * "Also called": the other names the owner uses for a customer or product.
 * The agent adds these when the owner says "Mama N is Mama Ngozi"; the owner
 * can add or remove them here too.
 */
export function Nicknames({
  kind,
  id,
  name,
  aliases,
  compact = false,
  className,
}: {
  kind: "customer" | "product";
  id: string;
  name: string;
  aliases: string[];
  compact?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const add = useActionMutation("add-nickname", {
    onSuccess: (result) => {
      toast.success(result.message);
      setValue("");
      setAdding(false);
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't save that nickname."),
  });
  const remove = useActionMutation("remove-nickname", {
    onSuccess: (result) => toast(result.message),
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't remove that nickname."),
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {!compact ? <span className="text-xs text-muted-foreground">Also called</span> : null}
      {aliases.map((alias) => (
        <span
          key={alias}
          className="inline-flex items-center gap-1 rounded-full border border-input bg-card px-2 py-0.5 text-xs font-medium"
        >
          {alias}
          <button
            type="button"
            aria-label={`Forget nickname ${alias}`}
            disabled={remove.isPending}
            onClick={() => remove.mutate({ kind, ref: id, nickname: alias })}
            className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconX className="size-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (value.trim()) add.mutate({ kind, ref: id, nickname: value.trim() });
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Nickname for {name}
          </label>
          <Input
            id={inputId}
            autoFocus
            value={value}
            maxLength={40}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setAdding(false);
            }}
            placeholder={kind === "customer" ? "e.g. Mama N" : "e.g. one bag"}
            className="h-7 w-32 text-xs"
          />
          <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={!value.trim() || add.isPending}>
            Save
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconPlus className="size-3" />
          {aliases.length ? "Add" : compact ? "Nickname" : "Add a nickname"}
        </button>
      )}
    </div>
  );
}
