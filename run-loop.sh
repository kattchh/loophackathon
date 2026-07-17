#!/usr/bin/env bash
# LADDER — the full autonomous show: SPEND (Zero) + EARN (x402 shop) on one screen.
#
#   dashboard (:4200)  +  x402 shop (:4021)  +  autonomous buyer  +  the brain
#
# The brain builds a product, lists it on the shop, watches, and lowers the price
# until the autonomous buyer pays it in real USDC on Base. Meanwhile it spends on
# Zero and cashes out into a gift card.
#
#   ./run-loop.sh                       # brain in DRY rehearsal + earn on TESTNET
#   LADDER_NET=mainnet ./run-loop.sh    # earn settles in REAL USDC on Base
#   LIVE=1 ./run-loop.sh                # brain spends REAL money on Zero too
#   MODE=understudy ./run-loop.sh       # deterministic spend arc instead of the brain
set -euo pipefail
cd "$(dirname "$0")"

set -a; [ -f "$HOME/.ladder-env" ] && source "$HOME/.ladder-env"; set +a
export LADDER_NET="${LADDER_NET:-testnet}"
MODE="${MODE:-brain}"

: > events.jsonl   # fresh run (dashboard resets when the log shrinks)

pids=()
cleanup() { echo; echo "[loop] shutting down…"; for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup INT TERM EXIT

echo "[loop] net=$LADDER_NET  mode=$MODE  live_spend=${LIVE:-0}"

# 1) dashboard
PORT=4200 node dashboard/server.js & pids+=($!)
# 2) shop — brain controls the price (no auto-decay in the combined show)
node seller/server.mjs & pids+=($!)
sleep 2
# 3) autonomous buyer — waits in the background for the price to meet its willingness
BUYER_TIMEOUT_MS="${BUYER_TIMEOUT_MS:-180000}" node buyer/agent.mjs & pids+=($!)

echo "[loop] dashboard: http://localhost:4200"
sleep 1

# 4) the spend brain (also drives open_shop / adjust_price / check_earnings)
if [ "$MODE" = "understudy" ]; then
  node agent/run.js || true
else
  # needs the venv + authenticated `claude` CLI (Agent SDK engine)
  PY="./.venv/bin/python"; [ -x "$PY" ] || PY="python3"
  "$PY" ladder_agent.py || true
fi

echo
echo "[loop] final earnings:"; curl -s http://localhost:4021/earnings; echo
echo "[loop] show complete — dashboard still live at http://localhost:4200. Ctrl-C to stop."
wait
