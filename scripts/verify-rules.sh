#!/usr/bin/env bash
# Proves Shop Ledger's server-side rules against a real database.
# Run with the dev server up (pnpm dev), from the repo root:  bash scripts/verify-rules.sh
# Each run uses a fresh throwaway identity, so it never touches your own shop.
set -uo pipefail

export AGENT_USER_EMAIL="verify-$(date +%s)-$RANDOM@shop-ledger.test"
pass=0
fail=0

act() { pnpm -s action "$@" 2>&1; }

expect() { # expect <description> <regex> <command...>
  local desc="$1" pattern="$2"
  shift 2
  local out
  out="$(act "$@")"
  if grep -qE -- "$pattern" <<<"$out"; then
    echo "PASS  $desc"
    pass=$((pass + 1))
  else
    echo "FAIL  $desc"
    echo "      expected /$pattern/ in:"
    sed 's/^/      | /' <<<"$out" | head -8
    fail=$((fail + 1))
  fi
}

id_of() { grep -m1 -oE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"; }

echo "Identity: $AGENT_USER_EMAIL"
expect "sample shop loads" "products: 7" load-demo-data
expect "books balance after sample data" "ok: true" reconcile-ledger

expect "credit sale posts and updates the balance" "now owes ₦192,000" \
  record-sale --lines '[{"product":"rice","qty":2}]' --customer "Mama Ngozi" --paid 50000 --dueDate 2026-11-07
expect "selling more than in stock is refused" "insufficient|Only 8 cartons" \
  record-sale --lines '[{"product":"indomie","qty":50}]'
expect "…and refused again with nothing written" "Only 8 cartons" \
  record-sale --lines '[{"product":"indomie","qty":50}]'
expect "credit without a named customer is refused" "Say which customer owes it" \
  record-sale --lines '[{"product":"sugar","qty":2}]' --paid 1000
expect "an unknown product is reported with suggestions" "Did you mean" \
  record-sale --lines '[{"product":"oil OR milk","qty":1}]'
expect "more credit to a late payer needs the owner's OK" "Credit check: Chinedu already owes ₦28,000 and is 12 days past" \
  record-sale --lines '[{"product":"garri","qty":2}]' --customer chinedu --paid 0
expect "…and nothing was written" "now owes ₦28,000|balance: 28000" get-credit-standing --customer chinedu
expect "…and it goes through once the owner agrees" "now owes ₦33,000" \
  record-sale --lines '[{"product":"garri","qty":2}]' --customer chinedu --paid 0 --confirmCredit true
expect "credit sense remembers she cleared ₦160,000 before" "repaidUpTo: 160000" get-credit-standing --customer "mama ngozi"

expect "paying more than owed is refused" "only owes ₦33,000" \
  record-payment --customer chinedu --amount 50000
expect "a valid payment clears the balance" "now owes ₦0" \
  record-payment --customer chinedu --amount 33000 --method transfer

mama="$(act list-customers | grep -B3 -A3 'Mama Ngozi' | id_of)"
sale="$(act list-entries --kind sale --customerId "$mama" --limit 1 | id_of)"
expect "voiding restores stock and balance" "now owes ₦86,000" void-entry --id "$sale" --reason "entered twice"
expect "voiding twice is refused" "already voided" void-entry --id "$sale" --reason again

restock="$(act list-entries --kind restock --limit 1 | id_of)"
act record-sale --lines '[{"product":"indomie","qty":7}]' >/dev/null
expect "voiding a restock whose stock was sold is refused" "would go below zero stock" \
  void-entry --id "$restock" --reason test

expect "a stock count posts the difference" "Garri \(paint\) -2" \
  record-stock-count --product garri --countedQty 16 --reason "2 spoilt by rain"
expect "an unchanged count is refused" "already 16" \
  record-stock-count --product garri --countedQty 16 --reason same

import="$(act propose-notebook-import --customers '[{"name":"Baba Sule","owes":8500}]' --products '[]' | id_of)"
expect "a notebook page waits for the owner's review" "draft" list-imports
expect "…and only the app UI can add it to the books" "only be called from the signed-in app UI" \
  apply-notebook-import --id "$import" --customers '[0]'

expect "reminders skip customers who owe nothing" "doesn't owe anything" \
  draft-reminders --drafts '[{"customer":"chinedu","message":"Hello Chinedu, just checking in about your balance."}]'
reminder="$(act draft-reminders --drafts '[{"customer":"mr tunde","message":"Good afternoon Mr Tunde, a gentle reminder that your balance is ₦26,000. Thank you!"}]' | id_of)"
expect "only the signed-in app UI can approve a reminder" "only be called from the signed-in app UI" \
  approve-reminder --id "$reminder"
expect "…or mark it sent" "only be called from the signed-in app UI" mark-reminder-sent --id "$reminder"

expect "an unknown nickname is not guessed" "No customer|not found|Did you mean|unknown" \
  record-payment --customer "mama pikin" --amount 1000
expect "the owner can teach a nickname" "\"Mama Pikin\" means Mama Ngozi" \
  add-nickname --kind customer --ref "mama ngozi" --nickname "Mama Pikin"
expect "…and the books understand it after" "Mama Ngozi now owes ₦85,000" \
  record-payment --customer "mama pikin" --amount 1000
expect "a nickname can mean only one customer" "already means Mama Ngozi" \
  add-nickname --kind customer --ref chinedu --nickname "mama pikin"
expect "products learn nicknames too" "\"one bag\" means Rice" \
  add-nickname --kind product --ref rice --nickname "one bag"

expect "the evening close writes the day's totals" "in sales from [0-9]+ sale" close-the-day
expect "…once per day: asking again returns the same close" "in sales from [0-9]+ sale" get-latest-close

expect "books still balance after every rejection and void" "ok: true" reconcile-ledger

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
