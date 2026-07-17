#!/usr/bin/env node
/**
 * THE SHOP — LADDER's earn side. A real x402 seller endpoint.
 *
 * A buyer who wants the product hits POST /buy, gets HTTP 402 with payment terms,
 * pays USDC on Base, and the facilitator settles on-chain. Real money lands in the
 * SELLER wallet. Nothing here is simulated: if /buy returns 200, a real transfer
 * happened (testnet USDC on Base Sepolia by default; real USDC when LADDER_NET=mainnet).
 *
 * Endpoints:
 *   GET  /health        -> liveness + network
 *   GET  /shop          -> public listing (product, price, preview) — free, for the buyer to read
 *   POST /buy           -> x402-gated; returns the product payload once paid
 *   POST /admin/reprice -> brain lowers/raises the price (x-admin-secret)   [self-correction]
 *   POST /admin/list    -> brain lists / relists a product (x-admin-secret)
 *   GET  /earnings       -> { count, receivedUsd, sales[] } — the brain polls this
 *
 * Env: SELLER_ADDRESS (payTo), PRICE_USD, FLOOR_USD, ADMIN_SECRET, SELLER_PORT,
 *      LADDER_NET, and optional AUTO_DECAY(=1) / AUTO_DECAY_STEP / AUTO_DECAY_INTERVAL_MS.
 */
import express from 'express';
import { paymentMiddleware } from 'x402-express';
import { X402_NETWORK, netLabel, getFacilitator } from '../lib/net.mjs';
import { emit } from '../lib/events.mjs';

const PORT = Number(process.env.SELLER_PORT) || 4021;
const PAY_TO = process.env.SELLER_ADDRESS;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ladder-admin';
// The externally reachable URL of this shop (Akash ingress in prod). localhost is
// only the dev fallback — set SHOP_PUBLIC_URL when deployed.
const PUBLIC_URL = (process.env.SHOP_PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

if (!PAY_TO) {
  console.error('[shop] SELLER_ADDRESS not set. Run `node scripts/gen-wallets.mjs` and source ~/.ladder-env.');
  process.exit(1);
}

const usd = n => '$' + String(Number(Number(n).toFixed(6)));

// ---- default product: what LADDER built from the inputs it bought on Zero ----
const state = {
  product: {
    name: 'Regal Paws — AI Pet Portrait Starter Pack',
    niche: 'AI pet portraits',
    includes: ['3 print-ready portraits', 'social captions', 'a shop-ready listing'],
    cogsUsd: 0.02, // real input cost the agent paid on Zero (trend data + image gen)
    preview: 'https://cdn.example/regal-paws/preview.png',
  },
  priceUsd: Number(process.env.PRICE_USD) || 0.5,
  floorUsd: Number(process.env.FLOOR_USD) || 0.05,
  sales: [],
  receivedUsd: 0,
};

const app = express();
app.use(express.json());

// ---- dynamic x402 paywall: rebuilt whenever the price changes ----
let payMw = null;
async function rebuildPaywall() {
  const facilitator = await getFacilitator(); // undefined on testnet (keyless)
  const routes = {
    'POST /buy': {
      price: usd(state.priceUsd),
      network: X402_NETWORK,
      config: { description: state.product.name, mimeType: 'application/json' },
    },
  };
  payMw = facilitator
    ? paymentMiddleware(PAY_TO, routes, facilitator)
    : paymentMiddleware(PAY_TO, routes);
}
// Delegate to the latest middleware so repricing takes effect without restart.
app.use((req, res, next) => (payMw ? payMw(req, res, next) : next()));

// ---- free, ungated: liveness + the public listing the buyer reads ----
app.get('/health', (_req, res) => res.json({ ok: true, net: netLabel(), payTo: PAY_TO }));

app.get('/shop', (_req, res) => {
  res.json({
    product: {
      name: state.product.name,
      niche: state.product.niche,
      includes: state.product.includes,
      preview: state.product.preview,
    },
    priceUsd: state.priceUsd,
    currency: 'USDC',
    network: X402_NETWORK,
    payTo: PAY_TO,
    cogsUsd: state.product.cogsUsd,
    marginUsd: Number((state.priceUsd - state.product.cogsUsd).toFixed(6)),
  });
});

// ---- the paid endpoint: only reached AFTER x402 verified the payment ----
app.post('/buy', (_req, res) => {
  const sale = {
    product: state.product.name,
    amountUsd: state.priceUsd,
    at: Date.now(),
  };
  state.sales.push(sale);
  state.receivedUsd = Number((state.receivedUsd + state.priceUsd).toFixed(6));
  // The buyer emits the `sale` event (it holds the settlement tx hash). We just
  // deliver the goods and keep the books for /earnings.
  res.json({
    ok: true,
    product: state.product.name,
    fulfillment: {
      portraits: [
        'https://cdn.example/regal-paws/1.png',
        'https://cdn.example/regal-paws/2.png',
        'https://cdn.example/regal-paws/3.png',
      ],
      captions: ['Meet the goodest boy 👑', 'Royalty has four paws'],
      license: 'single-commercial',
    },
  });
});

// ---- brain controls: reprice (self-correction) + relist ----
function authed(req, res) {
  if ((req.get('x-admin-secret') || '') !== ADMIN_SECRET) {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return false;
  }
  return true;
}

app.post('/admin/reprice', async (req, res) => {
  if (!authed(req, res)) return;
  const next = Number(req.body?.priceUsd);
  if (!Number.isFinite(next) || next <= 0) return res.status(400).json({ ok: false, error: 'bad priceUsd' });
  const prev = state.priceUsd;
  state.priceUsd = Number(next.toFixed(6));
  await rebuildPaywall();
  emit({ type: 'listing', product: state.product.name, priceUsd: state.priceUsd, url: `${PUBLIC_URL}/shop`, note: 'repriced' });
  emit({ type: 'thought', text: `No takers at ${usd(prev)} — dropping the price to ${usd(state.priceUsd)} to move the pack.` });
  res.json({ ok: true, priceUsd: state.priceUsd });
});

app.post('/admin/list', async (req, res) => {
  if (!authed(req, res)) return;
  if (req.body?.product) state.product = { ...state.product, ...req.body.product };
  if (Number.isFinite(Number(req.body?.priceUsd))) state.priceUsd = Number(Number(req.body.priceUsd).toFixed(6));
  await rebuildPaywall();
  emit({ type: 'listing', product: state.product.name, priceUsd: state.priceUsd, url: `${PUBLIC_URL}/shop` });
  res.json({ ok: true, product: state.product.name, priceUsd: state.priceUsd });
});

app.get('/earnings', (_req, res) => {
  res.json({ count: state.sales.length, receivedUsd: state.receivedUsd, sales: state.sales });
});

// ---- optional autonomous Dutch-auction decay (deterministic demo mode) ----
function maybeStartAutoDecay() {
  if (process.env.AUTO_DECAY !== '1') return;
  const step = Number(process.env.AUTO_DECAY_STEP) || 0.15;
  const interval = Number(process.env.AUTO_DECAY_INTERVAL_MS) || 4000;
  const timer = setInterval(async () => {
    if (state.sales.length > 0) return clearInterval(timer); // sold — stop decaying
    if (state.priceUsd <= state.floorUsd) return; // hit the floor — hold
    const prev = state.priceUsd;
    state.priceUsd = Number(Math.max(state.floorUsd, prev * (1 - step)).toFixed(6));
    await rebuildPaywall();
    emit({ type: 'listing', product: state.product.name, priceUsd: state.priceUsd, url: `${PUBLIC_URL}/shop`, note: 'auto-decay' });
    emit({ type: 'thought', text: `Still no buyer at ${usd(prev)}. Marking it down to ${usd(state.priceUsd)} — the market sets the price, not me.` });
  }, interval);
  timer.unref?.();
}

await rebuildPaywall();
app.listen(PORT, () => {
  console.log(`[shop] LADDER shop live on http://localhost:${PORT}  (${netLabel()})`);
  console.log(`[shop] receiving wallet: ${PAY_TO}`);
  console.log(`[shop] listing "${state.product.name}" @ ${usd(state.priceUsd)}`);
  emit({ type: 'listing', product: state.product.name, priceUsd: state.priceUsd, url: `${PUBLIC_URL}/shop` });
  maybeStartAutoDecay();
});
