# LADDER — the EARN side (real x402 income on Base)

LADDER doesn't only spend. It **earns** — its agent gets paid, autonomously, in real
USDC settled on-chain. This is the other half of a two-sided machine-economy participant:

- **SPEND** (existing): the brain buys inputs and a gift card through Zero.xyz. Money out.
- **EARN** (this): the brain productizes what it built, opens its own **x402 storefront**,
  and an **autonomous buyer** pays it in USDC on Base. Money in, with a BaseScan tx hash.

Zero is buy-side only (you cannot receive through it), so the earn side is our own
x402 endpoint — complementary to Zero, not a Zero feature.

## The loop (plan → act → observe → self-correct, with real settlement)

```
brain builds "Regal Paws" pet-portrait pack from inputs bought on Zero
      │
      ├─ open_shop(name, price)  ── lists it on the x402 shop (seller/server.mjs)
      │
autonomous buyer (buyer/agent.mjs)
      ├─ reads GET /shop, REASONS about fair value (AkashML), sets a willingness
      ├─ price too high → holds off  ◄── the brain calls adjust_price() to mark it down
      └─ price ≤ willingness → pays POST /buy via x402
                 │  USDC signed off-chain (EIP-3009, gasless), facilitator settles on Base
                 ▼
      real USDC lands in the SELLER wallet · sale event carries the settlement txHash
```

The price is not scripted — the brain lists high and lowers until the market clears.
Nobody decides the clearing price; the two agents do.

## Components

| File | Role |
|---|---|
| `seller/server.mjs` | The shop. Express + `x402-express`. `POST /buy` is x402-gated; `/shop` is the public listing; `/admin/reprice` + `/admin/list` are the brain's levers; `/earnings` is the books. |
| `buyer/agent.mjs` | The autonomous customer. Reasons about value via **AkashML** (OpenAI-compatible), auto-pays via `x402-fetch`, reads the settlement tx hash. |
| `ladder_agent.py` | The brain gains `open_shop` / `adjust_price` / `check_earnings` tools. |
| `lib/net.mjs` | testnet ⇄ mainnet config (network, chain, facilitator, RPC, explorer). |
| `lib/events.mjs` | earn events → the shared `events.jsonl` + Nexla webhook. |
| dashboard | new **SHOP · x402 EARN** panel with clickable BaseScan links. |

## Sponsor tools used on the earn side
- **AkashML** — the buyer's brain (buy/skip + willingness reasoning). With the Console
  deploy of the dashboard, this satisfies "Akash Console **AND** AkashML".
- **Nexla** — every `listing` / `offer` / `sale` / `earnings` event streams to the pipeline.
- **x402 / Base** — the payment rail itself (Coinbase's open protocol).

## Testnet (default) vs mainnet — same code, 3 config values
`lib/net.mjs` switches on `LADDER_NET`:

| | network | facilitator | USDC |
|---|---|---|---|
| **testnet** (default) | `base-sepolia` | keyless `x402.org` | free (faucet.circle.com) |
| **mainnet** (`LADDER_NET=mainnet`) | `base` | Coinbase CDP (needs `CDP_API_KEY_ID`/`SECRET`) | real |

## Run it

```bash
node scripts/gen-wallets.mjs            # once — makes SELLER + BUYER wallets in ~/.ladder-env
# fund the printed BUYER address (testnet: faucet.circle.com → Base Sepolia)
set -a; source ~/.ladder-env; set +a

./earn/demo.sh                          # self-contained earn loop (shop marks down → buyer pays)
# or the full show (spend + earn):
./run-loop.sh                           # brain + shop + buyer + dashboard  (LADDER_NET=mainnet for real $)
```

Proof of a real sale: the `sale` event's `explorerUrl` (a BaseScan link) resolves to a
real USDC transfer from the buyer wallet to the seller wallet.

## Honesty notes
- A real sale is **only** recorded from a settled x402 payment — never simulated. The
  brain is told: only the tool result counts, never fake a sale.
- You own both wallets, disclosed: this demonstrates real end-to-end settlement. The shop
  is a real public endpoint — a genuine third party can pay it too.
