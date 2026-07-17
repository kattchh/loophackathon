'use strict';
/*
 * LADDER fixtures.js — Builder A.
 * Canned dry-run data mirroring REAL zero directory facts (CONTRACT.md "Real facts"):
 * real service names, slugs, endpoints and price points. Dry mode never touches the
 * network — these objects stand in for `zero search` / `zero get` / `zero fetch`.
 *
 * Story-critical data baked in:
 *  - Laso Finance: cheapest prepaid card is $5.24 all-in -> the agent starts UNABLE
 *    to afford its own ending (plot twist), and must pivot to...
 *  - Bitrefill: variable-amount Amazon US gift card, $1-$2000 denomination.
 *  - PixelMint (top-ranked image vendor) 500s on its SECOND call -> forces the
 *    CORRECT-phase fallback to the runner-up (FLUX). The failure lives HERE as data;
 *    the recovery logic in run.js is real code reacting to it.
 */

const WALLET_START_USD = 5.0;

// ---------------------------------------------------------------------------
// Service directory. price = USD per paid fetch. reliability = 0..1 (normalized
// directory review score). caps/detail are what `zero get <token>` reveals.
// ---------------------------------------------------------------------------
const SERVICES = [
  // ---- gift cards / cash-out ----
  {
    token: 'z_laso.1',
    slug: 'laso-finance-agent-payments',
    name: 'Laso Finance Agent Payments',
    price: 0, // free capability call — the CARDS cost money (see detail.products)
    reliability: 0.92,
    method: 'POST',
    url: 'https://agents.laso.finance',
    blurb: 'Agent payments: prepaid cards + Venmo/PayPal payouts via USDC on Base.',
    query: 'gift card',
    caps: { sellsCards: true, variableAmount: false, catalogOnly: false },
    detail: {
      products: [
        { name: 'Prepaid Visa card ($5.00 min load + $0.24 fee)', minTotalUsd: 5.24 },
        { name: 'Venmo payout', minTotalUsd: 10.0 },
        { name: 'PayPal payout', minTotalUsd: 10.0 },
      ],
      note: 'Capability call is free; cheapest card is $5.24 all-in.',
    },
  },
  {
    token: 'z_rlp.1',
    slug: 'api-reloadpi-com-472391e7',
    name: 'Reloadpi Voucher Brands Catalog',
    price: 0.001,
    reliability: 0.94,
    method: 'GET',
    url: 'https://api.reloadpi.com/api/catalog/vouchers/brands',
    blurb: 'Voucher brand catalog lookup (Amazon, Google Play, Netflix, ...).',
    query: 'gift card',
    caps: { sellsCards: false, variableAmount: false, catalogOnly: true },
    detail: {
      brands: ['Amazon', 'Google Play', 'Netflix', 'Steam', 'Uber Eats', 'Spotify'],
      note: 'Catalog only — lists brands, sells nothing.',
    },
  },
  {
    token: 'z_btr.1',
    slug: 'bitrefill-gift-card-voucher-search-7856cac0',
    name: 'Bitrefill Gift Card & Voucher Search',
    price: 0.002,
    reliability: 0.96,
    method: 'GET',
    url: 'https://api.bitrefill.com/x402/gift-cards/search?q=&country=',
    blurb: 'Search 5k+ gift cards; own docs example is q=amazon&country=US.',
    query: 'gift card',
    caps: { sellsCards: true, variableAmount: true, searchable: true },
    detail: {
      variable: { minUsd: 1, maxUsd: 2000 },
      purchaseToken: 'z_btr.2',
      note: 'Variable-amount cards incl. Amazon US. Companion purchase capability: z_btr.2.',
    },
  },
  {
    token: 'z_btr.2',
    slug: 'bitrefill-gift-card-purchase-9a41d022',
    name: 'Bitrefill Gift Card Purchase',
    price: null, // price = the chosen card amount
    reliability: 0.96,
    method: 'POST',
    url: 'https://api.bitrefill.com/x402/gift-cards/purchase',
    blurb: 'Buy a card by slug + amount; code delivered in the response.',
    query: null, // companion capability — revealed by inspect, not by search
    caps: { sellsCards: true, variableAmount: true },
    detail: { note: 'Settles for exactly the card amount in USDC on Base.' },
  },

  // ---- trend / market data ----
  {
    token: 'z_pulse.1',
    slug: 'pulseboard-social-trends-1f77aa02',
    name: 'PulseBoard Social Trends',
    price: 0.01,
    reliability: 0.95,
    method: 'GET',
    url: 'https://api.pulseboard.x402/trends/daily',
    blurb: 'Cross-platform trend momentum, 24h window.',
    query: 'trend data',
    caps: {},
    detail: { window: '24h', metrics: ['momentum', 'searches'] },
  },
  {
    token: 'z_tspot.1',
    slug: 'trendspotter-web-signals-88c1d3b9',
    name: 'TrendSpotter Web Signals',
    price: 0.012,
    reliability: 0.9,
    method: 'GET',
    url: 'https://trendspotter.x402/api/signals',
    blurb: 'Web search + shopping signal aggregates.',
    query: 'trend data',
    caps: {},
    detail: { window: '7d' },
  },
  {
    token: 'z_xsoc.1',
    slug: 'x-social-firehose-lite-3dd910fe',
    name: 'X Social Firehose (lite)',
    price: 0.02,
    reliability: 0.88,
    method: 'GET',
    url: 'https://xdata.x402/firehose/lite',
    blurb: 'Sampled social posts stream, keyword filtered.',
    query: 'trend data',
    caps: {},
    detail: { sample: '1%' },
  },

  // ---- image generation ----
  {
    token: 'z_pxm.1',
    slug: 'pixelmint-turbo-image-5b21c9d4',
    name: 'PixelMint Turbo Image API',
    price: 0.0025,
    reliability: 0.9,
    method: 'POST',
    url: 'https://api.pixelmint.x402/generate',
    blurb: 'Fast SDXL-class images, 1024px.',
    query: 'image generation',
    caps: {},
    detail: { sizes: ['1024x1024'] },
  },
  {
    token: 'z_flux.1',
    slug: 'flux-pro-image-generation-c07741aa',
    name: 'FLUX Pro Image Generation',
    price: 0.003,
    reliability: 0.96,
    method: 'POST',
    url: 'https://img.flux.x402/generate',
    blurb: 'FLUX-quality renders (~$0.003/image).',
    query: 'image generation',
    caps: {},
    detail: { sizes: ['1024x1024', '2048x2048'] },
  },
  {
    token: 'z_dream.1',
    slug: 'dreamcanvas-xl-e19f2ab7',
    name: 'DreamCanvas XL',
    price: 0.008,
    reliability: 0.97,
    method: 'POST',
    url: 'https://dreamcanvas.x402/render',
    blurb: 'Premium XL renders, slower, pristine.',
    query: 'image generation',
    caps: {},
    detail: { sizes: ['2048x2048'] },
  },

  // ---- page hosting ----
  {
    token: 'z_page.1',
    slug: 'instantpage-x402-hosting-77aa03c8',
    name: 'InstantPage x402 Hosting',
    price: 0.02,
    reliability: 0.93,
    method: 'POST',
    url: 'https://pages.instant402.app/deploy',
    blurb: 'Deploy a static page; returns a public URL.',
    query: 'page hosting',
    caps: {},
    detail: { ttl: '30d' },
  },
  {
    token: 'z_ship.1',
    slug: 'staticship-page-host-40d1e6b2',
    name: 'StaticShip Page Host',
    price: 0.05,
    reliability: 0.97,
    method: 'POST',
    url: 'https://staticship.x402/deploy',
    blurb: 'Static hosting with custom domains.',
    query: 'page hosting',
    caps: {},
    detail: { ttl: '90d' },
  },

  // ---- humans for hire ----
  {
    token: 'z_wurk.1',
    slug: 'wurk-human-microtasks-9c3f01aa',
    name: 'WURK Human Microtasks',
    price: 0.15,
    reliability: 0.89,
    method: 'POST',
    url: 'https://wurk.x402/tasks',
    blurb: 'Agents hire real humans for microtasks (QA, ranking, captions).',
    query: 'human microtask',
    caps: { humansForHire: true },
    detail: { turnaround: '~10min' },
  },
];

// Directory totals per query (the search event reports the REAL result counts —
// e.g. `zero search "gift card"` genuinely returns 22 x402 services).
const CATALOGS = [
  { key: 'gift card', aliases: ['giftcard', 'gift', 'voucher', 'cash out'], total: 22 },
  { key: 'trend data', aliases: ['trend', 'trends', 'market data'], total: 9 },
  { key: 'image generation', aliases: ['image', 'image gen', 'art generation'], total: 31 },
  { key: 'page hosting', aliases: ['hosting', 'host a webpage', 'page'], total: 6 },
  { key: 'human microtask', aliases: ['human', 'wurk', 'microtask'], total: 3 },
];

// Simulated wire outcomes per token, consumed by zero.js per call index.
// Unlisted => 'ok'. PixelMint: call #1 succeeds, later calls hit a vendor-side 500.
const DRY_OUTCOMES = {
  'z_pxm.1': ['ok', 'http500', 'http500'],
};

function outcomeFor(token, callIndex) {
  const list = DRY_OUTCOMES[token];
  return (list && list[callIndex]) || 'ok';
}

function summarize(svc) {
  const { token, slug, name, price, reliability, method, url, blurb } = svc;
  return { token, slug, name, price, reliability, method, url, blurb };
}

function search(query) {
  const q = String(query || '').toLowerCase().trim();
  const cat = CATALOGS.find(
    c => c.key.includes(q) || q.includes(c.key) || c.aliases.some(a => q.includes(a) || a.includes(q))
  );
  if (!cat) return { query, total: 0, services: [] };
  const services = SERVICES.filter(s => s.query === cat.key).map(summarize);
  return { query, total: cat.total, services };
}

function inspect(tokenOrSlug) {
  const svc = SERVICES.find(s => s.token === tokenOrSlug || s.slug === tokenOrSlug);
  return svc ? JSON.parse(JSON.stringify(svc)) : null;
}

// ---------------------------------------------------------------------------
// Paid-fetch payloads (what a successful `zero fetch` returns, per capability)
// ---------------------------------------------------------------------------
const TREND_REPORT = [
  { niche: 'AI pet portraits', momentum: 38, note: '+38% WoW searches; gifting spike' },
  { niche: 'Minecraft server icons', momentum: 21, note: '+21% WoW' },
  { niche: 'LinkedIn headshot packs', momentum: 17, note: '+17% WoW' },
  { niche: 'Vintage travel posters', momentum: 12, note: '+12% WoW' },
  { niche: 'Crypto meme stickers', momentum: 9, note: '+9% WoW' },
];

const GIFT_CARD_RESULTS = [
  { name: 'Amazon.com Gift Card', country: 'US', denomination: 'variable', minUsd: 1, maxUsd: 2000, slug: 'amazon-com-usa' },
  { name: 'Amazon.de Gutschein', country: 'DE', denomination: 'variable', minUsd: 5.42, maxUsd: 540, slug: 'amazon-de' },
  { name: 'Amazon Prime Video (US)', country: 'US', denomination: 'fixed', amountsUsd: [25, 50], slug: 'amazon-prime-video-usa' },
];

const GIFT_CODE = 'AQ3X-9K2M-8DWP'; // full code only lives in the fixture; events carry the masked form

function fetchPayload(token, params = {}) {
  switch (token) {
    case 'z_pulse.1':
      return { source: 'PulseBoard 24h momentum', report: TREND_REPORT };
    case 'z_tspot.1':
      return { source: 'TrendSpotter 7d signals', report: TREND_REPORT };
    case 'z_xsoc.1':
      return { source: 'X firehose sample', report: TREND_REPORT };
    case 'z_pxm.1':
      return { imageUrl: 'https://cdn.pixelmint.x402/out/styles-4up-1024.png', prompt: params.prompt || '', size: '1024x1024' };
    case 'z_flux.1':
      return { imageUrl: 'https://img.flux.x402/gen/premium-poster-2048.png', prompt: params.prompt || '', size: '2048x2048' };
    case 'z_dream.1':
      return { imageUrl: 'https://dreamcanvas.x402/render/xl-0091.png', prompt: params.prompt || '', size: '2048x2048' };
    case 'z_page.1':
      return { url: `https://pages.instant402.app/${params.site || 'ladder-shop'}`, deployId: 'dpl_7f3a2c' };
    case 'z_ship.1':
      return { url: `https://staticship.x402/sites/${params.site || 'ladder-shop'}`, deployId: 'ss_1190ce' };
    case 'z_btr.1':
      return { query: params.q || 'amazon', country: params.country || 'US', cards: GIFT_CARD_RESULTS };
    case 'z_btr.2':
      return {
        brand: 'Amazon',
        country: 'US',
        amountUsd: params.amountUsd != null ? params.amountUsd : 2,
        code: GIFT_CODE,
        orderId: 'btr_ord_88f2c1',
        delivery: 'instant',
      };
    case 'z_wurk.1':
      return { taskId: 'wurk_314', status: 'queued', etaMin: 10 };
    default:
      return { note: 'fixture: generic ok payload', token };
  }
}

module.exports = {
  WALLET_START_USD,
  SERVICES,
  CATALOGS,
  DRY_OUTCOMES,
  TREND_REPORT,
  GIFT_CARD_RESULTS,
  GIFT_CODE,
  search,
  inspect,
  fetchPayload,
  outcomeFor,
};
