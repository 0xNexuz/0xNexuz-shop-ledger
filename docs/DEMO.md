# Demo script (about 3½ minutes)

**Video: [Shop Ledger walkthrough on Clips](https://clips.agent-native.com/share/aMVt1nptuM2K)**, recorded on the live app, **https://shop-ledger-peach.vercel.app** (tap **Try the demo**).

The video shows seven Agent-Native moments:

1. **One set of actions, two hands.** The agent records a sale from a sentence; the same rule then fires when you use the New sale screen by hand.
2. **The screen updates as the agent writes.** No refresh: the daybook line appears with an Agent tag.
3. **Rules live in the server, not the prompt.** The credit check stops a late payer for the agent and for the screen alike.
4. **The agent reads the same books.** "What's Chinedu's credit like?" is answered from his own payment history through `get-credit-standing`.
5. **The agent hands work to the owner, never the reverse.** Reminders are drafts only the owner can approve.
6. **It runs without being asked.** The evening close runs on the framework's daily job at 7 pm and drafts reminders.
7. **It learns the shop.** A nickname taught once works in every action after.

| Time | On screen | Shows |
| --- | --- | --- |
| 0:00 | Welcome screen, **Try the demo** | Usefulness |
| 0:15 | `I sell 2 bag rice give Mama Ngozi, she pay 50k, remain go come Friday` → daybook line with the Agent tag | 1, 2 |
| 0:45 | `give Chinedu 2 paint garri on credit` → the agent says he is 12 days late and asks → `yes, go ahead` | 3 |
| 1:15 | **New sale** by hand for Chinedu → the same warning | 1, 3 |
| 1:30 | `what's Chinedu's credit like?` → answered from his payment history | 4 |
| 1:50 | **How did we do today?** → direct read-only figures | Usefulness |
| 2:20 | `Mama Pikin na Mama Ngozi`, then `Mama Pikin pay 20k transfer` | 7 |
| 2:40 | **Close the day now**; ask the agent to approve a reminder (it can't); **Approve** → WhatsApp opens | 5, 6 |
| 3:05 | **Check my books** → the books balance | 3 |
| 3:20 | End on Today | All |

To record again: check a production agent sale and the credit check first, and record from a fresh private window so the sample shop is clean.
