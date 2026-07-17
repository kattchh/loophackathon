# LADDER — 3:00 Stage Script

**Presenter:** Katerina. **Run length:** the brain arc runs ~2½–3 minutes and
every run is genuinely different — the thoughts are Claude reasoning live, so
anchor each beat on what APPEARS (a rung lighting, a purchase landing), not on
the clock. The script survives ±20 seconds of drift. Talk to the ledger, never
to the spinner.

**The two money moments to milk:** (1) the balance visibly dropping on the
first purchase, (2) the full-screen gift card at the finale. Everything else
is connective tissue. When a money moment lands: stop walking, point, pause a
full beat before speaking.

## Pre-flight (do this before you're announced)

- Dashboard fullscreen at http://localhost:4200, projector-dark room if we can get it.
- Fresh `events.jsonl` (delete it) so the screen opens clean: $5.00, ladder dark.
- Tech side has `./.venv/bin/python ladder_agent.py` typed and ready — fires on
  your cue at ~0:20. (Panic fallback: `node agent/run.js` — deterministic, 90s.)
- ONLY the dashboard on screen while recording — no email, no messages, no tabs.
- Phone timer in your pocket on vibrate at 2:30.
- One rule: **never apologize to the screen.** If anything stalls, use the 15-second fallback below.

**What's true (say it with your chest):** the brain is Claude reasoning live —
nothing on the left side of the screen is scripted. The market it shops is a
replay of our real reconnaissance (real services, real prices, real $5 wallet,
sealed on purpose). Every run comes out different.

---

### 0:00 — COLD OPEN
**On screen:** Dashboard idle. Balance **$5.00** in giant digits. Ladder rail dark.
**Say:**
> "We gave an AI five dollars and told it to get rich. It can't touch a bank, a card, or a human. So it went shopping in the only economy built for machines."

> "That economy is real. It's thousands of services that sell to software —
> data, images, web hosting, gift cards, even actual humans for hire — paid
> in crypto pocket change over a protocol called x402. No checkout page. No
> CVV. Nobody in that economy has hands."

### 0:20 — PLAN · *(cue the run: nod to tech partner)*
**On screen:** Phase badge flips to PLAN. Thought feed starts typing. Rung 1 lights: *wallet live*.
**Say:**
> "This is LADDER. Left side: its actual thoughts — that's Claude reasoning
> live, right now; we genuinely don't know what it'll name its product.
> Right side: its receipts. The number at the top is a real wallet — five
> real dollars in USDC, managed by Zero dot xyz, sitting sealed on this
> laptop. Every service and every price it's about to shop is real — we
> scouted this market with this wallet this morning. The purchases replay
> that scouting, because stage wifi is where demos go to die. The mind
> doesn't replay. Watch it think."

### 0:40 — ACT, part 1: the plot twist
**On screen:** Search event: `"gift card" → 22 services`. Inspect events with prices. Rung 2: *market scouted*.
**Say:**
> "First move: it scoped its exit. It searched the machine economy for gift
> cards — because its job is to end this demo holding one — and found
> twenty-two services selling them. Then came my favorite plot twist of the
> day: the cheapest ready-made card costs five dollars and twenty-four cents."
>
> *(beat)*
>
> "It has five. Our agent cannot afford its own ending. It is twenty-four
> cents short of a happy ending, which — same. So now it has to earn."

### 1:05 — ACT, part 2: 💸 MONEY MOMENT #1
**On screen:** First purchase row hits the ledger. **The balance drops.**
**Do:** Stop. Point at the balance. Full beat of silence.
**Say:**
> "Watch the top number. There. It just bought market data for a third of a
> cent. No card on file. No checkout. No human said yes. The service said
> 'Payment Required' and the agent just… paid. That is the entire funnel.
> I've shipped a lot of checkout flows — this one hurts my feelings."

### 1:25 — BUILD → SELL
**On screen:** More thoughts + purchases (image gen ~$0.003). Artifact card appears. Rungs 3–4–5: *inputs bought → product built → shop open*.
**Say:**
> "With about a penny spent, it buys its ingredients — trend data, AI image
> generation — and assembles an actual product." *(glance at the thought feed
> and read its niche out loud, deadpan:)* "It has decided [read it — e.g. 'AI
> pet portraits are hot']. I don't question the agent's product strategy. I
> just fund it. And then — rung five — it opens its own shop: its own paywall
> on the same machine economy, selling to other agents the exact same way it
> buys."

### 1:45 — OBSERVE → CORRECT
**On screen:** Balance ticks, review events, rung 6: *value created*. Thoughts about card denominations.
**Say:**
> "Now it reads its own books. And it leaves star ratings on every service it
> paid — yes, the AI writes reviews, and yes, it's a harsh critic. Then the
> correction, and this is the part I love: it re-checks the gift-card market
> and finds cards with *flexible* amounts. It doesn't need the $5.24 card.
> It sizes the ending to whatever it's actually got. That's not a script —
> that's a shopper."

### 2:05 — FINALE: 🎁 MONEY MOMENT #2
**On screen:** Full-screen gift-card takeover. **Amazon**, amount, masked code (e.g. `AQ3X-••••-••••`). Rung 7: *CASHED OUT*.
**Do:** Step aside so the whole screen is visible. Let it breathe for two full seconds before speaking.
**Say:**
> "And there it is. The ending it couldn't afford three minutes ago. An
> Amazon gift card — bought by software, with software money, from a vending
> machine built for machines."
>
> "The code's masked out of habit — in a live-money run that's a real,
> spendable code, and this room types fast."
>
> "One more detail: this hackathon's prize… is an Amazon gift card. Our agent
> spent the afternoon learning to buy its own trophy. We'd like to make that
> a habit."

### 2:35 — CLOSE: the ladder
**On screen:** Dashboard resting state: full lit ladder 📎→🏠, final balance, complete ledger.
**Say:**
> "A guy once traded one red paperclip up to a house. Fourteen trades, a full
> year, one very patient human. Our agent ran its ladder in three minutes —
> and it doesn't sleep, doesn't get bored, and never stops trading. Today the
> top rung is a gift card. The engine doesn't know that. The engine is real —
> the ceiling isn't five dollars, and we're honestly not sure it's not a
> house. We're LADDER. Thank you."

---

## 🚨 If something hangs — the 15-second fallback

The screen freezes or an event never arrives. **Do not touch the laptop. Do
not look at the tech table. Do not apologize.** Step *toward* the screen,
point at the ledger of completed purchases, and keep talking:

> "Everything on this ledger already cleared — those are the receipts: market
> data, image generation, hosting, bought machine-to-machine for about a
> penny total. The agent's thinking. For five dollars, it's allowed to."

That line buys 15 seconds. Behind you, the tech side silently launches the
understudy — `node agent/run.js` replays the full arc in 90 seconds, faster
than explaining a spinner. If we're past 2:30 when it dies, skip straight to
the CLOSE — the ladder line works over a frozen ledger, and the ledger is real.

## Timing cheat card (tape to the podium)

| Clock | Beat            | You are pointing at            |
|-------|-----------------|--------------------------------|
| 0:00  | Cold open       | the $5.00                      |
| 0:20  | PLAN (cue run)  | thought feed                   |
| 0:40  | The plot twist  | "22 services" / $5.24          |
| 1:05  | MONEY #1        | the balance dropping           |
| 1:25  | BUILD → SELL    | artifact + rung rail           |
| 1:45  | OBSERVE→CORRECT | reviews, flexible denominations|
| 2:05  | MONEY #2        | the gift card (step aside)     |
| 2:35  | Close           | the full ladder                |
