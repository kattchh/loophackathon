# LADDER — Build Contract (all builders read this first)

One agent, $5, the machine economy. Demo = agent spends real money live, climbs the
📎→🏠 ladder, finale = buys a real Amazon gift card on camera. See PLAN.md for story.

## Hard rules for ALL builders

1. **NEVER run `zero fetch` or any command that spends money.** Not for testing, not once.
   Dry-run fixtures only. `zero search` / `zero get` are free but do NOT call them either —
   use the fixtures below. The live wallet has exactly $5.00 and it is sacred.
2. **Zero npm dependencies.** Node 20 stdlib only (node:http, node:fs, node:child_process).
   Venue wifi is unreliable; nothing may fetch from a CDN at demo time. No package.json needed.
3. Plain ESM JavaScript (`.mjs` NOT required — use `.js` with `"type":"module"`-free syntax:
   just use `import` in `.mjs` files OR CommonJS `require` in `.js`. Pick CommonJS `.js`
   everywhere for zero config friction.)
4. Stay inside your assigned directory/files. Shared files: only this file's owner touches them.

## Repo layout & ownership

```
/agent/run.js        Builder A — the agent loop (entry: node agent/run.js)
/agent/zero.js       Builder A — Zero CLI wrapper + money guards
/agent/fixtures.js   Builder A — canned dry-run data (below)
/dashboard/server.js Builder B — serves dashboard + events (entry: node dashboard/server.js)
/dashboard/index.html Builder B — the demo screen
/README.md           Builder C
/DEMO_SCRIPT.md      Builder C
/DEVPOST.md          Builder C
/events.jsonl        runtime artifact (agent appends, server reads) — nobody commits content
```

## The event log — the ONLY interface between agent and dashboard

Agent appends one JSON object per line to `<repo>/events.jsonl` (create if missing).
Dashboard polls/tails it. Fields: `ts` = Date.now() ms. Types:

```jsonl
{"ts":0,"type":"phase","name":"PLAN"}                      // PLAN|ACT|BUILD|SELL|OBSERVE|CORRECT|FINALE
{"ts":0,"type":"thought","text":"Trend data says AI pet portraits are hot."}
{"ts":0,"type":"balance","usd":5.00}                        // emitted after every money movement
{"ts":0,"type":"search","query":"gift card","results":22,"topPick":"Bitrefill Gift Card Search"}
{"ts":0,"type":"inspect","name":"Bitrefill Gift Card Search","price":0.002}
{"ts":0,"type":"purchase","name":"FLUX image generation","price":0.003,"ok":true,"runId":"abc"}
{"ts":0,"type":"artifact","kind":"image|page|report|giftcard","label":"Product hero image","url":"...","path":"..."}
{"ts":0,"type":"rung","n":2}                                // ladder rung reached, 1..7
{"ts":0,"type":"finale","brand":"Amazon","amountUsd":2.0,"codeMasked":"AQ3X-••••-••••"}

// --- EARN side (additive, from seller/server.mjs + buyer/agent.mjs). Old dashboards
//     ignore unknown types; the current dashboard renders them in the EARN panel. ---
{"ts":0,"type":"listing","product":"Regal Paws Starter Pack","priceUsd":0.5,"url":"http://localhost:4021/shop","note":"repriced"}
{"ts":0,"type":"offer","willingnessUsd":0.12,"priceUsd":0.5,"decision":"skip","model":"meta-llama/Llama-3.3-70B-Instruct"}
{"ts":0,"type":"sale","product":"Regal Paws Starter Pack","amountUsd":0.11,"buyer":"0x…","network":"base-sepolia","txHash":"0x…","explorerUrl":"https://sepolia.basescan.org/tx/0x…"}
{"ts":0,"type":"earnings","totalUsd":0.11}                  // USDC actually received by the shop wallet
```

Ladder rungs (dashboard renders this rail): 1 📎 wallet live · 2 🔍 market scouted ·
3 🎨 inputs bought · 4 📦 product built · 5 🏪 shop open · 6 💰 value created · 7 🎁 CASHED OUT

## Run modes (Builder A implements, Builder B is agnostic)

- `node agent/run.js` → **DRY (default).** Fixtures simulate every Zero call; realistic
  ~1–3s pacing between events so the dashboard demos well. Spends nothing, never shells out
  to `zero` at all.
- `LIVE=1 node agent/run.js` → real `zero` CLI calls (search/get/fetch --json), gated by:
  `BUDGET_USD` (default 0.25) cumulative cap tracked in code; `RESERVE_USD` (default 2.50)
  never touched except in FINALE phase; every fetch gets `--max-pay` = min(price*1.5, 0.50)
  except finale; every paid call gets a `zero review` afterward. Refuse + emit a `thought`
  event when a guard blocks a spend. LIVE code paths must exist and be plausible but CANNOT
  be executed by builders — structure zero.js so the dry/live switch is one boolean deep,
  with the CLI arg construction unit-testable without running it (e.g. `buildFetchArgs()`
  returns the argv array; dry mode logs it instead of spawning).

## Real facts to bake into fixtures (Builder A) and docs (Builder C)

- Wallet: real, funded 5.00 USDC, team account authenticated via `zero auth login` device flow.
  (Do not put any personal email, token, or wallet key in any file in this repo — it goes public.)
- `zero search "gift card"` → 22 real x402 services. Bitrefill Gift Card & Voucher Search
  ($0.002/call, GET https://api.bitrefill.com/x402/gift-cards/search?q=&country=,
  capability slug bitrefill-gift-card-voucher-search-7856cac0) — own example mentions Amazon US.
  Reloadpi Voucher Brands Catalog ($0.001/call, GET api.reloadpi.com/api/catalog/vouchers/brands,
  slug api-reloadpi-com-472391e7) lists "Amazon, Google Play, Netflix". Laso Finance Agent
  Payments (free, agents.laso.finance) does prepaid cards + Venmo/PayPal via USDC on Base.
- Plot twist: ready-made cards found cost $5.24–$25 — the agent starts UNABLE to afford its
  ending and must shop smart / find small denominations (Bitrefill has variable-amount cards).
- Typical service prices seen: image gen ~$0.003, catalog lookups $0.001–0.002, social/web
  data cents-level. WURK service exists (agents hire real humans for microtasks).
- CLI loop (from SKILL.md): search → get (token z_xxx.N) → fetch --capability <token>
  [--max-pay] --json (runId in envelope) → review <runId> --success --accuracy N --value N
  --reliability N --content "...".

## Dashboard (Builder B) — design intent

Projector mode: dark bg, huge type, readable from the back of a room. Top: LADDER wordmark +
phase badge. Hero: balance in giant digits animating on change. Left: agent "thoughts" feed,
newest on top, typewriter feel. Right: ledger table (time, item, price, ✓). Bottom: the
7-rung rail lighting up. `finale` event → full-screen gift-card moment w/ masked code +
celebratory but tasteful effect (CSS only). Poll events.jsonl every 400ms via /events
endpoint (server returns the parsed array). No external assets whatsoever. Must render
fine at 1280×720 and 1920×1080.

## Verification (final stage)

`node dashboard/server.js` (port 4200) + `node agent/run.js` dry → events.jsonl fills,
`curl localhost:4200` serves HTML, `curl localhost:4200/events` returns JSON array,
full dry story arc completes in ≤ 90s with all 7 rungs + finale. Fix what breaks.
