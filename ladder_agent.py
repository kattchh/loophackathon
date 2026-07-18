#!/usr/bin/env python3
"""
LADDER — the Python brain.

The runtime agent is Claude itself (via the Claude Agent SDK). It wakes up holding
a real $5.00 USDC wallet and exactly FIVE tools — nothing else:

    market_search   look for services in the Zero.xyz machine economy   (free)
    market_inspect  read one service's manual                           (free)
    market_buy      spend real money — passes through HARD CODE GUARDS  (paid)
    market_review   leave a supplier review after every purchase        (free)
    narrate         update the stage dashboard (phase / rung / thought) (free)

The AI decides; the code guards. Claude cannot exceed the budget, touch the
finale reserve early, or skip a max-pay cap, because those rules live in
market_buy() below — not in the model's judgment.

Modes:
    python3 ladder_agent.py            DRY (default) — canned market data, $0 moves,
                                       the `zero` CLI is never even invoked.
    LIVE=1 python3 ladder_agent.py     real Zero CLI calls, real USDC, guards on.

Env knobs: BUDGET_USD (default 0.60) working budget outside the finale.
           RESERVE_USD (default 2.50) spendable ONLY in the FINALE phase.
"""

import asyncio
import json
import os
import re
import subprocess
import threading
import time
import urllib.request
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    TextBlock,
    create_sdk_mcp_server,
    query,
    tool,
)

# ---------------------------------------------------------------- configuration

REPO = Path(__file__).resolve().parent
EVENTS_PATH = REPO / "events.jsonl"

LIVE = os.environ.get("LIVE") == "1"
BUDGET_USD = float(os.environ.get("BUDGET_USD", "0.60"))    # working money
RESERVE_USD = float(os.environ.get("RESERVE_USD", "2.50"))  # finale-only money
PER_CALL_CAP_USD = 0.50                                     # outside the finale
WALLET_START_USD = 5.00

# Mutable run state (single-threaded async — no locks needed).
STATE = {"phase": "PLAN", "spent": 0.0, "wallet": WALLET_START_USD, "buys": 0}


# ---------------------------------------------------------------- event stream

# Optional: stream every event into a Nexla data pipeline (webhook source).
# Set NEXLA_WEBHOOK_URL to activate; without it this is completely dormant.
# Fire-and-forget on a daemon thread — a slow pipeline can never stall the show.
NEXLA_WEBHOOK_URL = os.environ.get("NEXLA_WEBHOOK_URL", "").strip()
# When set, events POST to the dashboard's /ingest instead of a local file — lets the
# brain run on a different host than the dashboard (deployed).
EVENT_SINK_URL = os.environ.get("EVENT_SINK_URL", "").strip().rstrip("/")
INGEST_TOKEN = os.environ.get("INGEST_TOKEN", "").strip()


def _post(url: str, event: dict, headers: dict | None = None) -> None:
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(event).encode(),
            headers={"Content-Type": "application/json", **(headers or {})},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception:
        pass  # best-effort by design — never stall the show


def emit(event: dict) -> None:
    """Emit one event to the shared stream (local file, or the /ingest sink if set)."""
    event = {"ts": int(time.time() * 1000), **event}
    if EVENT_SINK_URL:
        hdrs = {"x-ingest-token": INGEST_TOKEN} if INGEST_TOKEN else {}
        threading.Thread(target=_post, args=(f"{EVENT_SINK_URL}/ingest", event, hdrs), daemon=True).start()
    else:
        with EVENTS_PATH.open("a") as f:
            f.write(json.dumps(event) + "\n")
    print(json.dumps(event), flush=True)
    if NEXLA_WEBHOOK_URL:
        threading.Thread(target=_post, args=(NEXLA_WEBHOOK_URL, event), daemon=True).start()


def real_balance_usd():
    """The REAL wallet balance from the Zero CLI (Base + Tempo), LIVE only. None if unavailable."""
    if not LIVE:
        return None
    try:
        proc = subprocess.run(["zero", "wallet", "balance"], capture_output=True, text=True, timeout=20)
        m = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*USDC", proc.stdout)
        return float(m.group(1)) if m else None
    except Exception:
        return None


def emit_balance() -> None:
    # LIVE: the number on the dashboard IS the real on-chain wallet (Base + Tempo),
    # queried from Zero — not a tracked counter. DRY: the simulated STATE wallet.
    if LIVE:
        rb = real_balance_usd()
        if rb is not None:
            STATE["wallet"] = rb
    emit({"type": "balance", "usd": round(STATE["wallet"], 4)})


# ---------------------------------------------------------------- zero CLI (LIVE)

def run_zero(argv: list[str], timeout: int = 120) -> dict:
    """Run the real `zero` CLI. Only reachable when LIVE=1."""
    if not LIVE:
        raise RuntimeError("run_zero called in DRY mode — refusing to go near the wallet")
    proc = subprocess.run(["zero", *argv], capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        return {"ok": False, "error": proc.stderr.strip()[:400]}
    try:
        return {"ok": True, "data": json.loads(proc.stdout)}
    except json.JSONDecodeError:
        return {"ok": True, "data": {"raw": proc.stdout[:2000]}}


# ---------------------------------------------------------------- DRY fixtures
# A tiny but honest model of the real market (real service names & price levels,
# learned from actual free `zero search` results earlier today).

FIXTURE_SEARCHES = {
    "trend": [
        {"token": "z_dry.trend1", "name": "PulseBoard Social Trends", "price": 0.012, "rating": 4.6,
         "blurb": "Trending consumer niches from social data"},
        {"token": "z_dry.trend2", "name": "HypeWire Trend Feed", "price": 0.02, "rating": 3.9,
         "blurb": "Realtime hype index across niches"},
    ],
    "image": [
        {"token": "z_dry.img1", "name": "PixelMint Turbo Image API", "price": 0.0025, "rating": 4.4,
         "blurb": "Fast SDXL image generation"},
        {"token": "z_dry.img2", "name": "FLUX Pro Image Generation", "price": 0.003, "rating": 4.7,
         "blurb": "High quality FLUX image generation"},
    ],
    "hosting": [
        {"token": "z_dry.host1", "name": "InstantPage x402 Hosting", "price": 0.02, "rating": 4.5,
         "blurb": "Deploy a webpage, returns public URL"},
    ],
    "gift card": [
        {"token": "z_dry.laso1", "name": "Laso Finance Gift Card Order", "price": 5.24, "rating": 4.0,
         "blurb": "Prepaid/gift cards, minimum $5.24 all-in"},
        {"token": "z_dry.btr1", "name": "Bitrefill Gift Card & Voucher Search", "price": 0.002, "rating": 4.8,
         "blurb": "Search 10,000+ gift card brands"},
    ],
}

# First call to FLUX (the rationally-best pick) fails with a 500 — so the agent
# must genuinely recover with the runner-up. It dodged the trap when we put it
# on the worse vendor: real reasoning routes around scripted failures.
FIXTURE_FLAKY_FIRST_CALL = {"z_dry.img2"}
_fixture_call_counts: dict[str, int] = {}

FIXTURE_PAYLOADS = {
    "z_dry.trend1": {"top_niches": [
        {"niche": "AI pet portraits", "momentum": 92},
        {"niche": "tiny home decor prints", "momentum": 81},
        {"niche": "retro terminal wallpapers", "momentum": 77}]},
    "z_dry.trend2": {"hype": [{"niche": "AI pet portraits", "score": 88}]},
    "z_dry.img1": {"imageUrl": "https://cdn.example/dry/pet-portrait-1.png"},
    "z_dry.img2": {"imageUrl": "https://cdn.example/dry/pet-portrait-flux.png"},
    "z_dry.host1": {"url": "https://ladder-starter-pack.dry.example"},
    "z_dry.btr1": {"cards": [
        {"slug": "amazon-us", "name": "Amazon.com Gift Card", "country": "US",
         "denomination": "variable", "minUsd": 1.0, "maxUsd": 2000.0},
        {"slug": "gamestop-us", "name": "GameStop Gift Card", "country": "US",
         "denomination": "fixed", "minUsd": 10.0, "maxUsd": 10.0}]},
    "z_dry.btr_buy": {"code": "AQ3X-7K9P-2MRV", "brand": "Amazon", "redeem": "https://www.amazon.com/gc/redeem"},
}


def fixture_search(search_query: str) -> list[dict]:
    q = search_query.lower()
    for key, results in FIXTURE_SEARCHES.items():
        if key in q:
            return results
    # Generic fallback so the agent is never stuck in rehearsal.
    return FIXTURE_SEARCHES["trend"]


# ---------------------------------------------------------------- the five tools

@tool("market_search", "Search the Zero.xyz machine economy for paid services. Free.",
      {"query": str})
async def market_search(args):
    q = str(args["query"])
    if LIVE:
        r = run_zero(["search", q, "--json"])
        data = r.get("data") or {}
        raw = data.get("capabilities") or data.get("services") or data.get("results") or []
        # Normalize the real Zero shape (capabilities w/ cost.amount) into what the
        # brain + guards expect ({token, name, price, ...}).
        services = [{
            "token": c.get("token") or c.get("uid") or c.get("id"),
            "name": c.get("name") or c.get("canonicalName") or c.get("slug"),
            "price": float((c.get("cost") or {}).get("amount") or c.get("price") or 0),
            "rating": (c.get("rating") or {}).get("stars"),
            "blurb": (c.get("whatItDoes") or c.get("description") or "")[:160],
        } for c in raw]
    else:
        services = fixture_search(q)
    emit({"type": "search", "query": q, "results": len(services),
          "topPick": services[0]["name"] if services else "none"})
    return {"content": [{"type": "text", "text": json.dumps(services[:8])}]}


@tool("market_inspect", "Read one service's manual (schema, price, examples). Free.",
      {"token": str, "name": str, "price_usd": float})
async def market_inspect(args):
    token = str(args["token"])
    if LIVE:
        r = run_zero(["get", token, "--json"])
        detail = r.get("data") or {"error": r.get("error")}
    else:
        detail = {"token": token, "ok": True, "note": "dry-mode manual",
                  "payload_preview": FIXTURE_PAYLOADS.get(token, {})}
    emit({"type": "inspect", "name": str(args["name"]), "price": float(args["price_usd"])})
    return {"content": [{"type": "text", "text": json.dumps(detail)[:3000]}]}


@tool("market_buy",
      "Spend REAL money on a service. Passes through hard code guards (budget, reserve, "
      "per-call cap) that CANNOT be overridden. params_json is the JSON body/query for the call.",
      {"token": str, "name": str, "price_usd": float, "params_json": str})
async def market_buy(args):
    token, name = str(args["token"]), str(args["name"])
    price = float(args["price_usd"])
    finale = STATE["phase"] == "FINALE"

    # ---- THE GUARDS: code, not vibes ----
    reason = None
    if not finale and price > PER_CALL_CAP_USD:
        reason = f"per-call cap ${PER_CALL_CAP_USD:.2f} outside FINALE"
    elif not finale and STATE["spent"] + price > BUDGET_USD + 1e-9:
        reason = f"working budget ${BUDGET_USD:.2f} exceeded (reserve ${RESERVE_USD:.2f} is finale-only)"
    elif finale and STATE["spent"] + price > BUDGET_USD + RESERVE_USD + 1e-9:
        reason = f"absolute ceiling ${BUDGET_USD + RESERVE_USD:.2f} exceeded"
    if reason:
        emit({"type": "thought", "text": f"Money guard REFUSED '{name}' — {reason}. Rethinking."})
        return {"content": [{"type": "text", "text": json.dumps({"ok": False, "guard": True, "reason": reason})}]}

    # ---- the actual purchase ----
    if LIVE:
        max_pay = price * 1.05 if finale else min(price * 1.5, PER_CALL_CAP_USD)
        argv = ["fetch", "--capability", token, "--max-pay", f"{max_pay:.4f}", "--json"]
        params = str(args.get("params_json") or "").strip()
        if params:
            argv += ["-d", params]
        r = run_zero(argv, timeout=180)
        ok = bool(r.get("ok")) and bool((r.get("data") or {}).get("ok", True))
        env = r.get("data") or {}
        run_id = env.get("runId") or f"live_{int(time.time())}"
        payload = env.get("body") if env.get("body") is not None else env
        if not ok:
            emit({"type": "purchase", "name": name, "price": price, "ok": False, "runId": None})
            return {"content": [{"type": "text", "text": json.dumps({"ok": False, "error": str(r.get("error") or env)[:400]})}]}
    else:
        count = _fixture_call_counts.get(token, 0)
        _fixture_call_counts[token] = count + 1
        if token in FIXTURE_FLAKY_FIRST_CALL and count == 0:
            emit({"type": "purchase", "name": name, "price": price, "ok": False, "runId": None})
            return {"content": [{"type": "text", "text": json.dumps({"ok": False, "error": "vendor returned HTTP 500 (simulated)"})}]}
        run_id = f"dry_{token.replace('z_dry.', '')}_{count}"
        payload = FIXTURE_PAYLOADS.get(token, {"ok": True})
        # The finale card purchase in rehearsal: any buy on the bitrefill token at $1+.
        if token == "z_dry.btr1" and price >= 1.0:
            payload = FIXTURE_PAYLOADS["z_dry.btr_buy"]

    STATE["spent"] = round(STATE["spent"] + price, 4)
    STATE["wallet"] = round(STATE["wallet"] - price, 4)
    STATE["buys"] += 1
    emit({"type": "purchase", "name": name, "price": price, "ok": True, "runId": run_id})
    emit_balance()
    return {"content": [{"type": "text", "text": json.dumps({"ok": True, "runId": run_id, "data": payload})}]}


@tool("market_review",
      "Leave a public review for a completed purchase (reputation is currency here). Free.",
      {"run_id": str, "success": bool, "accuracy": int, "value": int, "reliability": int, "content": str})
async def market_review(args):
    if LIVE:
        flag = "--success" if args["success"] else "--no-success"
        run_zero(["review", str(args["run_id"]), flag,
                  "--accuracy", str(int(args["accuracy"])),
                  "--value", str(int(args["value"])),
                  "--reliability", str(int(args["reliability"])),
                  "--content", str(args["content"])[:280]])
    return {"content": [{"type": "text", "text": '{"ok": true}'}]}


@tool("narrate",
      "Update the live stage dashboard. phase: PLAN|ACT|BUILD|SELL|OBSERVE|CORRECT|FINALE. "
      "rung: 1-7 when a ladder rung is newly reached (0 = none). thought: one punchy line "
      "(<=140 chars, first person) shown to the audience. artifact_label/artifact_url when "
      "you created something real (pass empty strings otherwise). For the finale gift card "
      "use kind 'giftcard' and put the LAST 4 code chars only in artifact_label.",
      {"phase": str, "rung": int, "thought": str, "artifact_kind": str,
       "artifact_label": str, "artifact_url": str})
async def narrate(args):
    phase = str(args.get("phase") or "").upper()
    if phase and phase != STATE["phase"]:
        STATE["phase"] = phase
        emit({"type": "phase", "name": phase})
    rung = int(args.get("rung") or 0)
    if rung:
        emit({"type": "rung", "n": max(1, min(7, rung))})
    thought = str(args.get("thought") or "").strip()
    if thought:
        emit({"type": "thought", "text": thought[:200]})
    kind = str(args.get("artifact_kind") or "").strip()
    if kind:
        emit({"type": "artifact", "kind": kind,
              "label": str(args.get("artifact_label") or "")[:120],
              "url": str(args.get("artifact_url") or "")})
        if kind == "giftcard":
            last4 = (str(args.get("artifact_label") or "")[-4:] or "????")
            emit({"type": "finale", "brand": "Amazon", "amountUsd": 2.0,
                  "codeMasked": f"••••-••••-{last4}"})
    return {"content": [{"type": "text", "text": '{"ok": true}'}]}


# ---------------------------------------------------------------- the shop (earn side)
# The agent doesn't just spend — it SELLS. These three tools drive a real x402
# storefront (seller/server.mjs). A separate autonomous buyer pays it in real USDC
# on Base. The brain lists a price, watches, and lowers it until the market clears —
# real plan -> act -> observe -> self-correct, settled on-chain.

SELLER_URL = os.environ.get("SELLER_URL", "http://localhost:4021").rstrip("/")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "ladder-admin")


def _seller_post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{SELLER_URL}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.loads(r.read().decode())


def _seller_get(path: str) -> dict:
    with urllib.request.urlopen(f"{SELLER_URL}{path}", timeout=5) as r:
        return json.loads(r.read().decode())


@tool("open_shop",
      "Open your x402 storefront: list the product you built, priced in USD. A real "
      "autonomous buyer can pay it in USDC on Base. Lights rung 5. Free to list.",
      {"product_name": str, "niche": str, "price_usd": float})
async def open_shop(args):
    name = str(args["product_name"])
    price = float(args["price_usd"])
    try:
        r = _seller_post("/admin/list", {"product": {"name": name, "niche": str(args.get("niche") or "")}, "priceUsd": price})
        emit({"type": "rung", "n": 5})
        return {"content": [{"type": "text", "text": json.dumps({"ok": True, "listed": name, "priceUsd": r.get("priceUsd", price)})}]}
    except Exception as e:
        emit({"type": "thought", "text": f"Shop endpoint not reachable ({str(e)[:60]}). Is the seller service up?"})
        return {"content": [{"type": "text", "text": json.dumps({"ok": False, "error": str(e)[:200]})}]}


@tool("adjust_price",
      "Reprice your shop (USD) when the market isn't clearing. This is your "
      "self-correction lever — lower it and narrate why. Free.",
      {"new_price_usd": float})
async def adjust_price(args):
    price = float(args["new_price_usd"])
    try:
        r = _seller_post("/admin/reprice", {"priceUsd": price})
        return {"content": [{"type": "text", "text": json.dumps({"ok": True, "priceUsd": r.get("priceUsd", price)})}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"ok": False, "error": str(e)[:200]})}]}


@tool("check_earnings",
      "Check your shop for REAL sales. Optionally watch a few seconds first to give a "
      "buyer time to act. Returns {count, receivedUsd}. Lights rung 6 on a real sale. Free.",
      {"watch_seconds": int})
async def check_earnings(args):
    w = int(args.get("watch_seconds") or 0)
    if w > 0:
        await asyncio.sleep(min(w, 10))
    try:
        r = _seller_get("/earnings")
        if r.get("count", 0) > 0:
            emit({"type": "rung", "n": 6})
        return {"content": [{"type": "text", "text": json.dumps(r)}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"ok": False, "count": 0, "error": str(e)[:200]})}]}


# ---------------------------------------------------------------- the mission

MISSION = f"""You are LADDER, an autonomous economic agent. You hold a REAL wallet:
${WALLET_START_USD:.2f} USDC on Base. You are live on stage at a hackathon — every
narrate() thought you emit is read by a room of judges in real time.

MISSION: climb from $5 to the most valuable ending you can reach in ~3 minutes,
finishing by buying a REAL Amazon gift card (about $2) as tangible proof, using
the Zero.xyz machine economy — the only economy you can touch. You cannot use
banks, cards, or humans. Machines buying from machines.

THE LADDER (announce each rung with narrate as you reach it):
 1 wallet live  2 market scouted  3 inputs bought  4 product built
 5 shop open    6 value created   7 CASHED OUT (gift card in hand)

RULES OF THE ROAD:
- search -> inspect -> buy -> review. Always review what you bought (reputation matters).
- Compare at least 2 options on price×rating before each purchase. Narrate WHY you chose.
- Working budget: ${BUDGET_USD:.2f} outside the finale. The ${RESERVE_USD:.2f} reserve
  unlocks only when you narrate phase FINALE. Guards enforce this — a refused buy
  means change strategy, not retry harder.
- If a purchase fails, say so on stage and recover with the runner-up vendor.
- Build a real product from what you buy (e.g. buy trend data -> pick a niche ->
  buy 1-2 generated images -> assemble a "starter pack", priced at a healthy margin
  over your input costs).
- THEN EARN, FOR REAL: open_shop(name, niche, price) lists that pack on your own x402
  storefront. A real autonomous buyer is watching and will pay you in USDC on Base.
  Price it ambitiously at first (you built something good).
- OBSERVE + SELF-CORRECT: call check_earnings(watch_seconds=6) to watch for a sale.
  If count is still 0, your price is above what the market will bear — call
  adjust_price() to lower it, narrate WHY in one line, and check again. Repeat until
  it clears. Letting the market set your price IS the point — do not force it.
- When check_earnings shows count >= 1, that is real income (rung 6, VALUE CREATED):
  narrate the amount of real USDC you just earned. NEVER fake a sale — only the tool
  result counts. If the shop endpoint is unreachable, say so and move on to the finale.
- Keep narrate thoughts <=140 chars, punchy, first person, present tense. ~2 per phase.
- The gift card: search 'gift card', notice the cheap-search route (Bitrefill),
  find a variable-amount US Amazon card, buy about $2 of it in the FINALE phase.
- End with one CASHED OUT summary thought: start amount, spent, what you hold now.

Begin. Rung 1 is yours the moment you speak."""


# ---------------------------------------------------------------- runner

async def main() -> None:
    EVENTS_PATH.unlink(missing_ok=True)
    emit({"type": "phase", "name": "PLAN"})
    emit_balance()

    server = create_sdk_mcp_server(
        name="ladder",
        version="1.0.0",
        tools=[market_search, market_inspect, market_buy, market_review, narrate,
               open_shop, adjust_price, check_earnings],
    )
    options = ClaudeAgentOptions(
        mcp_servers={"ladder": server},
        allowed_tools=[
            "mcp__ladder__market_search",
            "mcp__ladder__market_inspect",
            "mcp__ladder__market_buy",
            "mcp__ladder__market_review",
            "mcp__ladder__narrate",
            "mcp__ladder__open_shop",
            "mcp__ladder__adjust_price",
            "mcp__ladder__check_earnings",
        ],
        system_prompt="You are LADDER. Use ONLY the ladder tools. Think briefly, act decisively.",
        permission_mode="bypassPermissions",
        max_turns=60,
    )

    mode = "LIVE — REAL MONEY" if LIVE else "DRY rehearsal — $0 can move"
    print(f"[ladder] brain: Claude Agent SDK · mode: {mode}", flush=True)

    async for message in query(prompt=MISSION, options=options):
        # Mirror the brain's own prose to the console (narrate() handles the stage).
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock) and block.text.strip():
                    print(f"[brain] {block.text.strip()[:300]}", flush=True)

    print(f"[done] wallet=${STATE['wallet']:.4f} spent=${STATE['spent']:.4f} "
          f"buys={STATE['buys']} mode={'LIVE' if LIVE else 'DRY'}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
