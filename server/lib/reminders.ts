import { defineMachine } from "@agent-native/core/state-machine";

/**
 * Reminder lifecycle. The agent may only draft; approving is a UI-only action
 * the shop owner performs, and sending happens from the owner's own WhatsApp.
 */
export const reminderMachine = defineMachine({
  id: "reminder",
  states: ["draft", "approved", "sent", "dismissed"],
  initial: "draft",
  terminal: ["sent", "dismissed"],
  transitions: {
    approve: { from: ["draft"], to: "approved" },
    send: { from: ["approved"], to: "sent" },
    dismiss: { from: ["draft", "approved"], to: "dismissed" },
    edit: { from: ["draft"], to: "draft" },
  },
});

export type ReminderStatus = (typeof reminderMachine.states)[number];

/**
 * Normalize a phone number to international digits for wa.me.
 * Nigerian local numbers (0803…) become 234803…; returns null when the
 * number cannot be a real phone number.
 */
export function normalizePhone(raw: string | null | undefined, defaultCountryCode = "234"): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (digits.length <= 10) {
    digits = defaultCountryCode + digits;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** A wa.me link that opens WhatsApp with the reminder text ready to send. */
export function whatsappLink(phone: string | null | undefined, message: string): string {
  const number = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
