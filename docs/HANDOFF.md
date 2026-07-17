# LADDER — Cofounder Handoff Brief

> Load this into Claude for full project context. Repo: https://github.com/kattchh/loophackathon
> Division of labor: **Melany = agent logic** (`ladder_agent.py`), **Katerina = frontend** (`dashboard/`).
> The event schema below is the contract between you — extend it additively, never break it.

## 1. What this is

LADDER is our Loop Engineering Hackathon entry (deadline **4:30 PM PT today**, Devpost:
loop-engineering-hackathon.devpost.com). One autonomous agent is handed **$5.00 USDC** and
climbs a 7-rung economic ladder: it shops the x402 "machine economy" through Zero.xyz
(services that sell to software for fractions of a cent, paid automatically over HTTP 402),
builds a product, opens a shop, and cashes out by buying a real Amazon gift card — which is
literally the prize this hackathon awards. Primary prize target: **"Best use of Zero.xyz"
($2,000)**. Judging: 20% each on autonomy, idea, technical implementation, sponsor tool use,
presentation. Hackathon rule: **≥3 sponsor tools** — we use Zero + Nexla + Akash (all wired,
verified, live).

## 2. Architecture (60 seconds)

```
ladder_agent.py  (Python, THE BRAIN — Melany's domain)
  Claude via the Claude Agent SDK, given EXACTLY five tools:
    market_search / market_inspect / market_buy / market_review / narrate
  The AI decides; hard-coded guards in market_buy() enforce money rules.
  Every action appends one JSON line to events.jsonl.

agent/run.js  (Node, the UNDERSTUDY — do not delete)
  Deterministic clockwork version of the same arc, same guards (agent/zero.js),
  same event output. 90-second guaranteed replay; our on-stage fallback.

events.jsonl  (THE CONTRACT — the only interface between logic and frontend)

dashboard/server.js + index.html  (THE FRONTEND — Katerina's domain)
  Zero-dependency Node server on :4200; index.html polls /events every 400ms.
  Env: PORT, EVENTS_PATH (serve a recorded file), REPLAY=1 (loop a recording
  on its original pacing — used by the public cloud deploy).
```

## 3. The event contract (do not break; extend additively)

One JSON object per line, `ts` = epoch ms. Types the dashboard renders:

```jsonl
{"ts":0,"type":"phase","name":"PLAN"}          // PLAN|ACT|BUILD|SELL|OBSERVE|CORRECT|FINALE
{"ts":0,"type":"thought","text":"≤200 chars, first person — shown live on stage"}
{"ts":0,"type":"balance","usd":5.0}            // emit after every money movement
{"ts":0,"type":"search","query":"gift card","results":22,"topPick":"Bitrefill"}
{"ts":0,"type":"inspect","name":"Bitrefill","price":0.002}
{"ts":0,"type":"purchase","name":"FLUX image gen","price":0.003,"ok":true,"runId":"x"}  // ok:false = failed (renders red)
{"ts":0,"type":"artifact","kind":"image|page|report|url|giftcard","label":"...","url":"..."}
{"ts":0,"type":"rung","n":3}                   // 1..7; duplicates are safe (dashboard keeps max)
{"ts":0,"type":"finale","brand":"Amazon","amountUsd":2.0,"codeMasked":"••••-••••-2MRV"}
```

Frontend behaviors logic can rely on: unknown event types are ignored gracefully; a
SHRINKING events array triggers a full dashboard reset (this powers replay looping);
`finale` fires a full-screen takeover that auto-dismisses; ledger totals accumulate from
`purchase` events; the giant balance animates toward the latest `balance.usd`.

## 4. Money rules (non-negotiable, enforced in code)

- **DRY mode is the default everywhere.** It never invokes the `zero` binary. LIVE mode
  requires env `LIVE=1` and only works on Katerina's laptop (the Zero session + wallet
  live there). **Never flip LIVE=1 without Katerina's explicit go — the real-money
  decision is hers and is still pending.**
- Guards in `market_buy()` (Python) and `agent/zero.js` (Node): `BUDGET_USD` (working cap,
  default 0.60 py / 0.25 js), `RESERVE_USD` (2.50, spendable ONLY in FINALE phase),
  per-call cap $0.50 with `--max-pay` on every fetch. A refused spend emits a visible
  guard thought — never fails silently.
- **Never fake revenue.** In LIVE mode the agent must not simulate sales (already
  patched: SELL/OBSERVE credit simulation is dry-only). Honesty is a feature we sell.
- No secrets in the repo, ever. Zero session: `~/.zero/config.json`. Nexla token:
  `~/.nexla-token`. Nexla webhook URL (contains a key): `~/.ladder-env`. All on
  Katerina's machine, all outside the repo. Ask her 1:1 if you need a value.

## 5. Sponsor wiring — done, with verifiable IDs

- **Zero.xyz** (the agent's hands): CLI installed + `zero init`; wallet claimed, 5.00 USDC
  confirmed, account authenticated via device flow. Verb loop: `search → get <z_xxx.N
  token> → fetch --capability <token> --max-pay <cap> --json (runId in envelope) →
  review <runId> --success --accuracy N --value N --reliability N --content "..."`.
  Judge checklist: install ✅ · $5 claim ✅ · **paid runs with deducted money — PENDING
  Katerina's go** (their third requirement; rehearsal runs don't count).
- **Nexla** (the agent's books): `ladder_agent.py` fire-and-forgets every event to a
  webhook source when `NEXLA_WEBHOOK_URL` is set (dormant otherwise). Built via
  `nexla-cli` (installed at `~/Library/Python/3.12/bin/nexla-cli` on Katerina's machine;
  auth: `NEXLA_API_URL=https://dev-api-express-code.nexla.com/` + token). Live objects
  in Katerina's account: source **125742** → flow **634457** → nexset **435614**.
- **Akash** (the agent's public mission control): dashboard deployed as a
  `node:20-alpine` Docker container, DSEQ **1784322581604**, provider digital frontier
  (eu-se-1), $1.73/month, boots by pulling files from this repo's `main` (SDL:
  `deploy/akash-deploy.yaml`). **Live:**
  http://ohorsvu8c59r19u6irvos216mg.ingress.h6i-dedicated.eu-se-1.digitalfrontier.so
  ⚠️ It pulls from `main` at container start — code changes need a container restart
  (Console → deployment → Update/Redeploy) to appear on the public URL.

## 6. Run commands

```bash
node dashboard/server.js                     # frontend on :4200
./.venv/bin/python ladder_agent.py           # brain, DRY (rehearsal) — needs the venv +
                                             #   `claude` CLI (both set up on Katerina's laptop;
                                             #   elsewhere: python3 -m venv .venv && ./.venv/bin/pip
                                             #   install claude-agent-sdk && npm i -g @anthropic-ai/claude-code)
node agent/run.js                            # understudy, deterministic 90s arc
FAST=1 node agent/run.js                     # understudy at test speed
EVENTS_PATH=docs/sample-run.events.jsonl REPLAY=1 node dashboard/server.js  # replay theater
```

`docs/sample-run.events.jsonl` is a REAL recorded brain run (62 events) — perfect frontend
fixture; the frontend can be developed entirely against it, no brain needed.

## 7. State of play + what's left

DONE: repo public & current · brain tested end-to-end twice (it invented "Royal Pets"
pet-portrait packs, priced at $6.99, recovered from an injected vendor failure) · dashboard
verified · Akash live · Nexla flowing · docs (README, DEVPOST.md paste-ready, DEMO_SCRIPT.md
timed stage script) · security scrubbed (no keys/PII in repo).

LEFT, in order: (1) Katerina's real-money decision → if yes, one LIVE run (~$2.15 total:
pennies of inputs + $2 gift card) satisfies Zero's third judging requirement; (2) record the
3-min demo (script in DEMO_SCRIPT.md; every brain run is unique — bad takes are re-rollable);
(3) Devpost form (copy from DEVPOST.md, attach video + Akash URL), submit **before 4:30 PM PT**.

## 8. Gotchas we already paid for (don't re-pay)

- `zero auth agent register` mints an ownerless account — with a human present it's always
  `zero auth login` (device flow). Session persists in `~/.zero/config.json`.
- Bitrefill/Reloadpi/Laso real response shapes are UNKNOWN until first paid call (we've
  only seen free-tier schemas) — the LIVE finale parsing must stay adaptive; budget one
  ~$0.01 probe call before the on-camera run.
- The npm `nexla-cli` package's macOS binary 404s — use `pip3 install nexla-cli` (or uv).
- Akash Console funnels new accounts to /onboarding; the custom-container path is the
  "Deploy image" card at the bottom (SDL editor is hidden in that flow — command override
  UI: Commands = `sh` + `-c` one-per-line, Arguments = the one-line script).
- LinkedIn blocks anonymous fetches (999); Chrome-with-session works.
- Dashboard drift: click by element ref, not coordinates — the config page scrolls itself.
- Claude CLI wasn't on this Mac (desktop app ≠ CLI) — it is NOW installed globally and
  authenticated; the Agent SDK rides that session.
```
