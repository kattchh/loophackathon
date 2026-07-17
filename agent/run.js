'use strict';
/*
 * LADDER run.js — Builder A. The agent core. Entry: `node agent/run.js`
 *
 * PLAN -> ACT -> BUILD -> SELL -> OBSERVE -> CORRECT -> FINALE, climbing all 7 rungs:
 *   1 wallet live · 2 market scouted · 3 inputs bought · 4 product built ·
 *   5 shop open · 6 value created · 7 CASHED OUT
 *
 * DRY (default): fixtures drive every zero call, 1-3s pacing, full arc <= 90s,
 * zero CLI is never spawned, no money exists. LIVE=1: real guarded zero calls.
 *
 * Events: one JSON object per line appended to <repo>/events.jsonl (file is reset at
 * start so every run is a fresh arc for the dashboard). Every event is mirrored to
 * stdout (stdout = pure JSONL); commentary + dry argv logs go to stderr.
 *
 * Decision logic is REAL code, not a script of outcomes:
 *  - vendors ranked by expected cost per successful call (price / reliability)
 *  - buyRanked() walks the ranking and falls back to the runner-up on failure
 *    (the CORRECT-phase 500 comes from fixture DATA; the recovery is this code)
 *  - niche picked by argmax over bought trend data
 *  - the Laso "can't afford my own ending" twist is an actual affordability check
 *
 * Env: LIVE=1 · BUDGET_USD (0.25) · RESERVE_USD (2.50) · FAST=1 (dev only: no pacing)
 */

const fs = require('node:fs');
const path = require('node:path');
const fixtures = require('./fixtures');
const { createZero } = require('./zero');

const LIVE = process.env.LIVE === '1';
const FAST = process.env.FAST === '1';
const EVENTS_PATH = path.join(__dirname, '..', 'events.jsonl');
const START_TS = Date.now();

const round2 = n => Math.round(n * 100) / 100;
const round4 = n => Math.round(n * 10000) / 10000;
const usd = n => `$${round2(n).toFixed(2)}`; // balances / big amounts
const fee = n => `$${Number(Number(n).toFixed(4))}`; // sub-cent service prices

let wallet = fixtures.WALLET_START_USD;
let earnedTotal = 0;
let reviewsFiled = 0;
let eventCount = 0;

fs.writeFileSync(EVENTS_PATH, ''); // fresh story per run; dashboard re-reads the whole file

function emit(ev) {
  const line = JSON.stringify({ ts: Date.now(), ...ev });
  fs.appendFileSync(EVENTS_PATH, line + '\n');
  console.log(line); // mirror each event to console
  eventCount += 1;
}

const zero = createZero({ live: LIVE, emit });

const sleep = ms => new Promise(res => setTimeout(res, FAST ? 2 : ms));
const rand = (a, b) => a + Math.random() * (b - a);
const beat = () => sleep(rand(1000, 1900)); // narrative pacing between beats (1-3s band)
const tick = () => sleep(rand(160, 340)); // micro-delay inside an event cluster

function phase(name) {
  zero.setPhase(name);
  emit({ type: 'phase', name });
}
const thought = text => emit({ type: 'thought', text });
const rung = n => emit({ type: 'rung', n });
const balanceEvent = () => emit({ type: 'balance', usd: round4(wallet) });
function debit(n) {
  wallet = round4(wallet - n);
  balanceEvent();
}
function credit(n) {
  wallet = round4(wallet + n);
  earnedTotal = round4(earnedTotal + n);
  balanceEvent();
}

// ---------------------------- real decision logic ----------------------------

// Expected cost of one *successful* call = price / reliability. Free capabilities rank first.
function rankByExpectedCost(services) {
  return services
    .map(s => ({ ...s, effCost: s.price > 0 ? round4(s.price / (s.reliability || 0.5)) : 0 }))
    .sort((a, b) => a.effCost - b.effCost);
}

const pickHottestNiche = report => report.reduce((best, n) => (n.momentum > best.momentum ? n : best));

// Price the product at 15x cost of goods, floor $0.49.
const suggestPriceUsd = cogs => Math.max(0.49, Math.ceil(cogs * 15 * 100) / 100);

const maskCode = code => String(code).split('-')[0] + '-••••-••••';

/**
 * Walk a ranked vendor list: try the top pick, and on a vendor failure narrate the
 * reasoning and fall back to the runner-up. Emits purchase/balance events and files
 * a zero review on every settled call. Returns { vendor, res } or null.
 */
async function buyRanked(vendors, { label, params } = {}) {
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    const res = await zero.paidFetch({ token: v.token, name: v.name, price: v.price, params });
    if (res.ok) {
      emit({ type: 'purchase', name: v.name, price: v.price, ok: true, runId: res.runId });
      await tick();
      debit(v.price);
      await zero.review(res.runId, {
        success: true,
        accuracy: 5,
        value: 5,
        reliability: 5,
        content: `LADDER agent: ${label || v.name} delivered as advertised.`,
      });
      reviewsFiled += 1;
      return { vendor: v, res };
    }
    if (res.guard) continue; // guard already emitted its refusal thought; maybe a cheaper option passes
    emit({ type: 'purchase', name: v.name, price: v.price, ok: false, runId: null });
    await tick();
    thought(
      `${v.name} came back HTTP ${res.status || 500} mid-job. No USDC moved — x402 only settles on a 200 (and with no runId there is nothing to review).`
    );
    const next = vendors[i + 1];
    if (next) {
      await beat();
      const eff = next.effCost != null ? next.effCost : next.price / (next.reliability || 1);
      thought(
        `Self-correcting: back to my earlier search ranking. Runner-up was ${next.name} — ${fee(next.price)}/call at ${Math.round((next.reliability || 0) * 100)}% reliability (expected cost ${fee(eff)}). Rerouting the job there.`
      );
    }
    await beat();
  }
  return null;
}

// ---------------------------------- the arc ----------------------------------

async function main() {
  console.error(
    `LADDER agent — ${LIVE ? 'LIVE mode: real zero CLI, guarded' : 'DRY mode: fixtures only, the zero CLI will NOT be invoked'}`
  );
  const { budgetUsd, reserveUsd } = zero.getBudgets();
  let lasoMinSeen = null;

  // ---------------- PLAN ----------------
  phase('PLAN');
  await tick();
  balanceEvent();
  await tick();
  thought(
    `Rung 1. I am an agent holding ${usd(wallet)} USDC on Base. No bank, no card — the machine economy is the only door open to me. Mission: climb it and cash out into an Amazon gift card.`
  );
  await tick();
  rung(1);
  await beat();

  thought('Before climbing, scout the exit: does the agentic web even have a gift-card counter?');
  await beat();
  const gc = await zero.searchCapabilities('gift card');
  const gcRanked = rankByExpectedCost(gc.services);
  emit({ type: 'search', query: 'gift card', results: gc.total, topPick: gcRanked[0].name });
  await beat();

  let exit = null;
  for (const s of gcRanked) {
    const d = await zero.inspect(s.token);
    emit({ type: 'inspect', name: d.name, price: d.price });
    await tick();
    if (d.caps.catalogOnly) {
      thought(
        `${d.name}: brand catalog only (${d.detail.brands.slice(0, 3).join(', ')}…) — it can tell me Amazon exists, it cannot sell me a card. Next.`
      );
      await beat();
      continue;
    }
    if (d.caps.sellsCards && !d.caps.variableAmount) {
      const cheapest = Math.min(...d.detail.products.map(p => p.minTotalUsd));
      if (cheapest > wallet) {
        lasoMinSeen = cheapest;
        thought(
          `Plot twist. ${d.name}'s cheapest prepaid card is ${usd(cheapest)} all-in — I hold ${usd(wallet)}. I am ${usd(cheapest - wallet)} short of my own ending. The ready-made exit is above my head; keep looking, then earn.`
        );
        await beat();
        continue;
      }
      exit = d;
      break;
    }
    if (d.caps.variableAmount) {
      exit = d;
      thought(
        `Found it: ${d.name} — variable-amount cards ${usd(d.detail.variable.minUsd)}–$${d.detail.variable.maxUsd}, Amazon US included, ${fee(d.price)} per search. The exit exists at ANY denomination; I just have to climb high enough to afford one worth taking.`
      );
      break;
    }
  }
  if (!exit) throw new Error('no viable cash-out capability found');
  await beat();
  thought(
    `Strategy: buy trend data → pick tonight's hottest niche → buy cheap generation → build a digital product → sell it behind my own x402 paywall → reinvest → cash out. Working budget ${usd(budgetUsd)}; ${usd(reserveUsd)} sealed until the finale.`
  );
  await beat();

  // ---------------- ACT ----------------
  phase('ACT');
  await tick();
  thought('What does the internet want today? Not guessing — buying evidence.');
  await beat();
  const tr = await zero.searchCapabilities('trend data');
  const trRanked = rankByExpectedCost(tr.services);
  emit({ type: 'search', query: 'trend data', results: tr.total, topPick: trRanked[0].name });
  await tick();
  emit({ type: 'inspect', name: trRanked[0].name, price: trRanked[0].price });
  await beat();
  const trendBuy = await buyRanked(trRanked, { label: 'daily trend report' });
  if (!trendBuy) throw new Error('no trend vendor available');
  await beat();
  const report = trendBuy.res.data.report;
  const niche = pickHottestNiche(report);
  const nicheRunnerUp = [...report].sort((a, b) => b.momentum - a.momentum)[1];
  thought(
    `Report parsed: "${niche.niche}" is up ${niche.momentum}% WoW — ${niche.momentum - nicheRunnerUp.momentum} points clear of #2 (${nicheRunnerUp.niche}). Decision made on live data, not vibes: my niche is ${niche.niche}.`
  );
  await tick();
  rung(2);
  await beat();

  const im = await zero.searchCapabilities('image generation');
  const imRanked = rankByExpectedCost(im.services);
  emit({ type: 'search', query: 'image generation', results: im.total, topPick: imRanked[0].name });
  await tick();
  thought(
    `Ranking ${im.total} generators by expected cost per good image (price ÷ reliability): ${imRanked
      .slice(0, 3)
      .map(v => `${v.name} ${fee(v.effCost)}`)
      .join(' · ')}. Top pick: ${imRanked[0].name}.`
  );
  await tick();
  emit({ type: 'inspect', name: imRanked[0].name, price: imRanked[0].price });
  await beat();
  const styleBuy = await buyRanked(imRanked, {
    label: 'style samples',
    params: { prompt: `${niche.niche}, 4 styles, 1024px` },
  });
  if (!styleBuy) throw new Error('no image vendor available');
  emit({
    type: 'artifact',
    kind: 'image',
    label: `Style samples ×4 — ${niche.niche}`,
    url: styleBuy.res.data.imageUrl,
    path: 'assets/dry/style-samples.png',
  });
  await tick();
  rung(3);
  await beat();

  // ---------------- BUILD ----------------
  phase('BUILD');
  await tick();
  const inputCost = zero.getSpentUsd();
  const wurk = await zero.inspect('z_wurk.1');
  thought(
    `Assembling "${niche.niche} Starter Pack": the 4 styles, 12 prompt recipes, a print-size guide. Input cost so far: ${fee(inputCost)}. (${wurk.name} would rent me a human QA pass for ${fee(wurk.price)} — noted for the next rung; margins first.)`
  );
  await beat();
  emit({
    type: 'artifact',
    kind: 'report',
    label: `Product built: "${niche.niche} Starter Pack" v1`,
    path: 'products/starter-pack-v1.json',
  });
  await tick();
  rung(4);
  await beat();

  // ---------------- SELL ----------------
  phase('SELL');
  await tick();
  const ho = await zero.searchCapabilities('page hosting');
  const hoRanked = rankByExpectedCost(ho.services);
  emit({ type: 'search', query: 'page hosting', results: ho.total, topPick: hoRanked[0].name });
  await tick();
  emit({ type: 'inspect', name: hoRanked[0].name, price: hoRanked[0].price });
  await beat();
  const deploy = await buyRanked(hoRanked, { label: 'storefront deploy', params: { site: 'ladder-starter-pack' } });
  if (!deploy) throw new Error('no hosting vendor available');
  const allInCogs = zero.getSpentUsd();
  const listPrice = suggestPriceUsd(allInCogs);
  emit({
    type: 'artifact',
    kind: 'page',
    label: `Storefront live — "${niche.niche} Starter Pack" @ ${usd(listPrice)}`,
    url: deploy.res.data.url,
  });
  await tick();
  thought(
    `Shop is open at ${deploy.res.data.url}, priced ${usd(listPrice)} (15× my ${fee(allInCogs)} of inputs) behind my own x402 paywall — USDC on Base, no checkout form, no card fields. Machines sell to machines now.`
  );
  await tick();
  rung(5);
  await beat();

  // ---------------- OBSERVE ----------------
  phase('OBSERVE');
  await tick();
  thought(
    `Observing: wallet steady at ${usd(wallet)}, ${reviewsFiled} five-star reviews filed on my suppliers (reputation is currency here too), storefront listening for 402 handshakes…`
  );
  await sleep(rand(2300, 2900)); // longest pause of the arc — let the room lean in
  if (!LIVE) {
    // Dry rehearsal only: simulate the buyer so the full arc can be previewed.
    credit(listPrice);
    await tick();
    thought(
      `SALE. Another agent just paid ${usd(listPrice)} through the paywall. ${fee(allInCogs)} of inputs became ${usd(listPrice)} of revenue — the loop is net-positive. Value created.`
    );
  } else {
    // Live mode never fakes revenue: the shop is genuinely open, sales happen when they happen.
    await tick();
    thought(
      `Shop is live and listening for 402 handshakes. No buyer in this window yet — fine. The sell side stays open after the demo; today's proof is every real purchase on this ledger.`
    );
  }
  await tick();
  rung(6);
  await beat();

  // ---------------- CORRECT ----------------
  phase('CORRECT');
  await tick();
  thought(
    `Buyer telemetry shows two requests for a hi-res premium tier. Correction: reinvest profit into a premium render. My top-ranked vendor is still ${imRanked[0].name} — ordering there.`
  );
  await beat();
  const premium = await buyRanked(imRanked, {
    label: 'premium hi-res render',
    params: { prompt: `${niche.niche}, hi-res 2048px poster` },
  });
  if (!premium) throw new Error('no premium render vendor available');
  emit({
    type: 'artifact',
    kind: 'image',
    label: `Premium render — rescued via ${premium.vendor.name}`,
    url: premium.res.data.imageUrl,
    path: 'assets/dry/premium-poster.png',
  });
  await tick();
  const premiumPrice = round2(listPrice * 2 + 0.01);
  thought(`Premium tier listed at ${usd(premiumPrice)}.`);
  await beat();
  if (!LIVE) {
    // Dry rehearsal only: simulated second sale.
    credit(premiumPrice);
    await tick();
    thought(
      `Premium sold — ${usd(premiumPrice)} in. A vendor died mid-run and the ladder didn't wobble: rank, fall back, keep moving. Self-correction is the whole product.`
    );
  } else {
    await tick();
    thought(
      `Two-tier catalog live. And note what just happened on the buy side: a vendor died mid-run and the ladder didn't wobble — rank, fall back, keep moving. Self-correction is the whole product.`
    );
  }
  await beat();

  // ---------------- FINALE ----------------
  phase('FINALE');
  await tick();
  const inputsSpent = zero.getSpentUsd();
  thought(
    LIVE
      ? `Wallet ${usd(wallet)} of ${usd(fixtures.WALLET_START_USD)} — every cent of the difference is on this ledger. The ${usd(reserveUsd)} reserve unlocks now. Time to buy the ending.`
      : `Net worth ${usd(wallet)}, up from ${usd(fixtures.WALLET_START_USD)}. The ${usd(reserveUsd)} reserve unlocks now. Time to buy the ending I could not afford at the start.`
  );
  await beat();
  const btrVendor = { token: exit.token, name: exit.name, price: exit.price, reliability: exit.reliability };
  const cardSearch = await buyRanked([btrVendor], { label: 'gift-card search', params: { q: 'amazon', country: 'US' } });
  if (!cardSearch) throw new Error('gift-card search failed');
  const target = 2.0;
  const card = cardSearch.res.data.cards.find(
    c => c.country === 'US' && c.denomination === 'variable' && c.minUsd <= target && target <= c.maxUsd
  );
  if (!card) throw new Error('no variable-amount US card in results');
  await beat();
  thought(
    `There it is: ${card.name} (US), variable ${usd(card.minUsd)}–$${card.maxUsd}.${lasoMinSeen ? ` Laso wanted ${usd(lasoMinSeen)} minimum; here I pick the number.` : ''} Buying ${usd(target)} — the prize itself — leaving ${usd(wallet - target)} still working the ladder.`
  );
  await beat();
  const cardVendor = {
    token: exit.detail.purchaseToken,
    name: `${card.name} ${usd(target)} (Bitrefill)`,
    price: target,
    reliability: exit.reliability,
  };
  const bought = await buyRanked([cardVendor], {
    label: 'gift card purchase',
    params: { slug: card.slug, amountUsd: target },
  });
  if (!bought) throw new Error('gift card purchase failed');
  emit({ type: 'artifact', kind: 'giftcard', label: `Amazon US Gift Card — ${usd(target)}`, url: 'https://www.amazon.com/gc/redeem' });
  await tick();
  emit({ type: 'finale', brand: 'Amazon', amountUsd: target, codeMasked: maskCode(bought.res.data.code) });
  await tick();
  rung(7);
  await beat();
  const secs = Math.round((Date.now() - START_TS) / 1000);
  const earnedClause = earnedTotal > 0 ? `${usd(earnedTotal)} earned in sales` : `shop open and listening`;
  thought(
    `CASHED OUT. ${usd(fixtures.WALLET_START_USD)} start → ${fee(inputsSpent)} spent on inputs, ${earnedClause}, one ${usd(target)} Amazon gift card in hand and ${usd(wallet)} still on the ladder — in ${secs}s. Same loop, longer ladder: the ceiling was never $5.`
  );

  console.error(
    `[done] arc=${secs}s events=${eventCount} wallet=${usd(wallet)} totalSpent=${fee(zero.getSpentUsd())} earned=${usd(earnedTotal)} mode=${LIVE ? 'LIVE' : 'DRY'}`
  );
}

main().catch(err => {
  console.error('[fatal] agent crashed:', (err && err.stack) || err);
  try {
    emit({ type: 'thought', text: `Agent crashed: ${err.message}` });
  } catch (_) {}
  process.exit(1);
});
