# LADDER

**Tagline:** We gave an autonomous agent $5.00 in USDC and one instruction —
get rich. No bank, no card, no human. It shops the x402 machine economy
through Zero.xyz, builds a product, and cashes out into a real Amazon gift
card: the same prize this hackathon awards.

## Inspiration

Two things collided. First, the red-paperclip story — a person once bartered
a paperclip up to a house, one trade at a time. Second, a very 2026 fact:
AI agents still can't hold a credit card, but they no longer need one. The
x402 protocol ("HTTP 402 Payment Required," finally used as intended) plus
Zero.xyz's search-and-pay layer means software can discover a service, read
its price, pay in USDC, and get the goods — with no human in the loop.

So: hand an agent five dollars and a ladder. Every profitable cycle is a
rung, 📎 at the bottom, 🏠 at the top. And because this hackathon's prize is
an Amazon gift card, we made the agent's final rung *buying an Amazon gift
card on camera*. The demo ends with the machine purchasing the trophy.

## What it does

LADDER is one agent running a seven-phase loop — PLAN, ACT, BUILD, SELL,
OBSERVE, CORRECT, FINALE — against real machine-economy services:

- **PLAN:** assess net worth, pick a niche, scope the exit (gift cards).
- **ACT:** discover and buy inputs via Zero — market/trend data, image
  generation — at fractions of a cent per call.
- **BUILD:** assemble a digital product from those inputs.
- **SELL:** open its own **real x402 storefront** (USDC on Base) and list the
  pack for sale — the same protocol it buys through, now on the receiving end.
- **OBSERVE:** an **autonomous buyer** — a separate agent whose reasoning brain
  runs on **AkashML** — sizes up the price and decides what it's worth. The
  agent watches for the sale, and leaves `zero review` ratings on every service
  it paid.
- **CORRECT:** re-plan from what it observed — including **marking the shop
  price down until a real buyer pays.** Neither agent is told the clearing
  price; the two of them discover it. (This is also where the plot twist
  resolves — see below.)
- **FINALE:** cash out into a real Amazon gift card.

Everything streams to a projector-grade dashboard: giant live balance, the
agent's thought feed, a purchase ledger, a seven-rung ladder rail, and a
full-screen gift-card takeover at the end.

## Sponsor tools used: Zero.xyz + Nexla + Akash (Console **and** AkashML)

LADDER is a **two-sided** machine-economy participant: it **spends** through
Zero and **earns** through its own x402 storefront, with real USDC settling on
Base in both directions.

- **Zero.xyz — the agent's hands (spend side).** Verified CLI install (`zero
  init` onto the coding agent), verified $5 wallet claim (5.00 USDC via
  device-flow login), and the full verb loop `search → get → fetch --capability
  --max-pay → review` as the agent's only way to buy in the economy.
- **Nexla — the agent's books.** `ladder_agent.py` (and the earn-side services)
  stream every thought, purchase, listing, and **sale** event into a Nexla
  webhook source created through the Nexla agent CLI (with `--dry-run`
  validation first): source `125742` → flow `634457` → nexset `435614`. Skill
  installed on the build agent via `nexla-cli skill install`.
- **Akash — used two ways.** **(1) Console:** the dashboard runs as a
  `node:20-alpine` container on Akash's decentralized cloud (SDL in
  `deploy/akash-deploy.yaml`; provider digital frontier, eu-se-1, $1.73/mo,
  DSEQ 1784322581604) — **live:**
  http://ohorsvu8c59r19u6irvos216mg.ingress.h6i-dedicated.eu-se-1.digitalfrontier.so
  **(2) AkashML:** the **autonomous buyer's reasoning brain** runs on AkashML's
  OpenAI-compatible inference (`meta-llama/Llama-3.3-70B-Instruct`) — it judges
  each listing's fair value and decides what to pay. An SDL to deploy the shop
  itself on Akash ships in `deploy/akash-seller.yaml`.

**The earn rail — x402 on Base.** The shop (`seller/server.mjs`, `x402-express`)
gates `POST /buy` behind a USDC price; the buyer (`buyer/agent.mjs`,
`x402-fetch`) auto-pays via signed EIP-3009 (gasless), and the facilitator
settles on Base. Every real sale carries an on-chain **transaction hash** —
a clickable BaseScan link on the dashboard's EARN panel. Testnet (Base Sepolia)
by default; one config flip (`LADDER_NET=mainnet`) settles real USDC on Base.

## How we built it (deep Zero.xyz usage — this is a Zero showcase)

**The brain is Claude itself.** `ladder_agent.py` runs the Claude Agent SDK
and hands the model exactly five tools — `market_search`, `market_inspect`,
`market_buy`, `market_review`, `narrate` — and nothing else. Every decision,
every vendor comparison, and every thought on the dashboard is live LLM
reasoning, not a script (in one rehearsal it invented a "Royal Pets" portrait
pack and priced it at $6.99 — we take no credit). The money rules live in
`market_buy()` as Python code the model cannot override: **the AI decides,
the code guards.** A deterministic Node.js understudy (`agent/run.js`, same
guards, same event feed) stands by as the stage fallback.

The agent's entire economic life runs through the Zero CLI verb loop:

1. `zero auth login` — device-flow auth to a managed wallet we funded with
   exactly 5.00 USDC. There is no card or bank anywhere in the system.
2. `zero search` — live discovery of x402 services (our recon:
   `zero search "gift card"` returned **22 real services**).
3. `zero get` — inspect a service and mint a capability token (`z_xxx.N`).
4. `zero fetch --capability <token> --max-pay <cap> --json` — the actual
   paid call; the envelope returns a `runId`.
5. `zero review <runId> --success --accuracy N --value N --reliability N
   --content "..."` — the agent rates **every service it pays**, feeding
   trust back into the machine economy.

Around that loop we wrote our own money guards in `agent/zero.js`:
a cumulative `BUDGET_USD` cap (default $0.25 for the whole run), an untouchable
`RESERVE_USD` ($2.50) that only the finale may spend, and a per-call
`--max-pay` of `min(listed_price × 1.5, $0.50)`. A blocked spend isn't a
silent failure — it becomes a visible "thought" on the dashboard.

## The earn side — real x402 income (two agents that negotiate)

Zero is buy-side only, so we built the earn side ourselves: a real x402 seller
endpoint and a real autonomous buyer that settle USDC on Base.

- **The shop** (`seller/server.mjs`, `x402-express`) lists the pack and gates
  `POST /buy` behind a price. It reprices on command — the brain's
  self-correction lever (`open_shop` / `adjust_price` / `check_earnings` tools).
- **The buyer** (`buyer/agent.mjs`, `x402-fetch`) is its own autonomous agent.
  It reads the listing, **reasons about fair value on AkashML** ("input cost is
  low; a fair digital-goods markup is ~10× → I'll pay up to $0.20"), and holds
  off while the price is too high. When it clears its willingness, it signs an
  EIP-3009 payment (gasless — it holds only USDC) and pays; the facilitator
  settles on Base and returns a **real transaction hash**.

The result is a genuine negotiation between two thinking agents: the seller
marks down, the buyer waits, and they **converge on a clearing price neither
was told** — the whole exchange narrated live on the dashboard, then settled
on-chain. The books (`/earnings`) and every sale flow into Nexla too.

The pieces are independently deployable (env-driven public URLs + a central
event sink at the dashboard's `/ingest`), so the shop can run publicly on Akash
while the buyer runs anywhere and both report to one live board.

Engineering constraints we chose on purpose: **zero npm dependencies**, Node
20 stdlib only, plain CommonJS. The agent and dashboard communicate through
one append-only `events.jsonl` file; the dashboard tails it via a `/events`
endpoint every 400ms. The whole thing survives venue wifi because nothing
fetches from a CDN, and the dry/live switch is one boolean deep — the CLI
argv construction (`buildFetchArgs()`) is unit-testable without spending.

## The real numbers (from live reconnaissance)

- `zero search "gift card"` → **22 x402 services**.
- **Bitrefill Gift Card & Voucher Search** — $0.002/call,
  `GET api.bitrefill.com/x402/gift-cards/search`, capability slug
  `bitrefill-gift-card-voucher-search-7856cac0`; its own example queries
  Amazon US, and it carries variable-amount cards.
- **Reloadpi Voucher Brands Catalog** — $0.001/call, lists Amazon, Google
  Play, Netflix.
- **Laso Finance Agent Payments** — free to query; prepaid cards and
  Venmo/PayPal payouts via USDC on Base.
- Image generation ~$0.003/call; catalog lookups $0.001–$0.002; web/social
  data in the low cents. There's even WURK, where agents hire real humans.
- **The plot twist:** ready-made gift cards cost **$5.24–$25**. Our agent
  holds $5.00. It begins the run literally unable to afford its own ending,
  and has to shop its way to a flexible-denomination card that fits the
  balance it actually has. We didn't write that arc; the market handed it
  to us, and it became the spine of the demo.

## Challenges we ran into

- **Our hero couldn't afford the finale.** The cheapest ready-made card beat
  our entire net worth by 24 cents. We turned the bug into the plot.
- **Protecting $5 from our own agent.** An autonomous spender with a real
  wallet is a small horror movie, so we built the guard rails first: budget
  cap, finale reserve, per-call `--max-pay`, and a hard rule that development
  and rehearsal never execute a paid call — dry mode replays fixtures
  captured from real recon and never even spawns the `zero` binary.
- **Demo-day wifi.** Solved architecturally: no dependencies, no CDNs, a
  file-based event bus, and a dry mode whose story is made of real data.
- **Zero agents can only spend.** So we built the earn side ourselves — a real
  x402 seller on Base plus an autonomous, AkashML-reasoning buyer — closing the
  loop with genuine on-chain income instead of a simulated sale.

## Accomplishments that we're proud of

- A real, funded, card-free agent wallet and a real map of the gift-card
  corner of the machine economy — 22 services, priced and inspected.
- A spend-safety design we'd actually ship: caps, reserves, and reviews on
  every paid call.
- A demo architecture that is honest by construction: one event log, a
  clearly labeled dry/live switch, and a story where every number on screen
  traces back to a real service and a real price.
- A three-minute narrative arc with a twist we didn't have to invent.

## What we learned

- The machine economy is not a metaphor. It has search, price tags, receipts,
  reviews, and gift-card shops — and it's absurdly cheap. Useful work costs
  thousandths of a dollar.
- HTTP 402 is a better checkout than most checkouts. Discovery-to-payment is
  one CLI verb chain with no forms and no humans.
- Reviews are the trust layer of an agent economy: when your buyer is
  software, reputation is an API too.
- Constraints write good stories. A $5 ceiling and a $5.24 obstacle did more
  for our demo than any feature we could have added.

## What's next for LADDER

- Run the loop LIVE end-to-end more, letting the agent compound over hours
  instead of minutes.
- **Shipped during the hackathon:** the real x402 seller endpoint (USDC on
  Base) — the SELL rung is now genuine on-chain income, not narrative. Next:
  flip it to mainnet by default and let the public shop take real orders from
  third-party agents.
- Use WURK to put real humans inside the loop — the agent hiring people to
  rank its product ideas.
- More rungs. The engine — plan, spend, build, sell, observe, correct — is
  real today. The ceiling isn't $5, and we're genuinely curious how far up
  the ladder it goes. The paperclip guy got a house.

## Honesty footnote

The demo runs in rehearsal mode — by choice. The wallet is real and funded
(5.00 USDC, verifiable, sealed for the whole hackathon); the market data is
a replay of real Zero reconnaissance; **the thinking is live** — Claude
reasons through every run fresh, and no two runs come out the same. LIVE mode
exists behind a one-boolean switch and executes the real `zero` verb loop
under the same guards, with the gift-card purchase as the finale. Every
service, price, slug, and the 22-service search result cited here is real
observed data, not invention. We think an honest demo with a sealed wallet
beats burning the budget for theater — the engineering is the flex.

**The earn side is not rehearsal — it's real settlement.** The shop, the
AkashML-reasoning buyer, and the on-chain payment are live: `POST /buy` only
returns goods when USDC actually moves on Base, and every sale shows a real
transaction hash. We prove the full loop on Base Sepolia (free test USDC, so
we can show it end-to-end without theater), and it flips to real USDC on Base
mainnet with a single config value. Both wallets are ours, disclosed — this
demonstrates real two-way settlement; the shop is a real public endpoint a
third party can pay too.

**Built with:** Python 3.12 + Claude Agent SDK (the spend brain), Node.js 20
(dashboard + understudy), Zero.xyz CLI (search / get / fetch / review),
`x402-express` + `x402-fetch` + viem (the earn side), Coinbase x402 facilitator,
AkashML (the buyer's reasoning brain), Nexla (the books), Akash (Console +
AkashML), USDC on Base.
