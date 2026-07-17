#!/usr/bin/env bash
# LADDER earn loop — self-contained autonomous demo.
#
#   dashboard (:4200)  +  x402 shop (Dutch-auction markdown)  +  autonomous buyer
#
# The shop lists a product high and marks it down over time; the buyer reasons
# about value (AkashML if AKASHML_API_KEY is set, else a fixed cap) and pays via
# x402 the moment the price meets its willingness. Real settlement on Base.
#
#   ./earn/demo.sh                 # testnet (Base Sepolia, free test USDC)
#   LADDER_NET=mainnet ./earn/demo.sh   # REAL USDC on Base
#
# Requires: `node scripts/gen-wallets.mjs` run once, buyer wallet funded, and
#   set -a; source ~/.ladder-env; set +a   (Nexla + wallet keys)
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; [ -f "$HOME/.ladder-env" ] && source "$HOME/.ladder-env"; set +a

export LADDER_NET="${LADDER_NET:-testnet}"
echo "[demo] network: $LADDER_NET"

# fresh event log (dashboard resets when the file shrinks)
: > events.jsonl

pids=()
cleanup() { echo; echo "[demo] shutting down…"; for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup INT TERM EXIT

# 1) dashboard
PORT=4200 node dashboard/server.js & pids+=($!)
# 2) shop with autonomous markdown (starts high so the buyer visibly self-corrects)
PRICE_USD="${PRICE_USD:-0.5}" FLOOR_USD="${FLOOR_USD:-0.03}" \
  AUTO_DECAY=1 AUTO_DECAY_STEP="${AUTO_DECAY_STEP:-0.22}" AUTO_DECAY_INTERVAL_MS="${AUTO_DECAY_INTERVAL_MS:-3500}" \
  node seller/server.mjs & pids+=($!)

sleep 2
echo "[demo] dashboard: http://localhost:4200   shop: http://localhost:4021/shop"
echo "[demo] launching autonomous buyer…"

# 3) the buyer runs to completion (buys or times out), then we hold the board up
BUYER_TIMEOUT_MS="${BUYER_TIMEOUT_MS:-90000}" node buyer/agent.mjs || true

echo
echo "[demo] earnings:"; curl -s http://localhost:4021/earnings; echo
echo "[demo] loop complete. Dashboard still live at http://localhost:4200 — Ctrl-C to stop."
wait
