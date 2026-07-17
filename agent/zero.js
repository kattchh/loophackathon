'use strict';
/*
 * LADDER zero.js — Builder A.
 * Thin wrapper around the `zero` CLI plus ALL money guards.
 *
 * DRY (default): NEVER spawns anything. Returns fixture data and logs to stderr the
 * exact argv it WOULD have run. The dry/live switch is one boolean deep (`live`),
 * and spawnZero() hard-throws if ever reached without it.
 *
 * LIVE=1: spawns `zero <args> --json` per the CLI loop in CONTRACT.md:
 *   search -> get <token z_xxx.N> -> fetch --capability <token> [--max-pay] --json
 *   (runId in envelope) -> review <runId> --success --accuracy N --value N
 *   --reliability N --content "..."
 *
 * Money guards (CONTRACT.md):
 *  - BUDGET_USD  (default 0.25): cumulative cap on everything outside FINALE.
 *  - RESERVE_USD (default 2.50): only spendable during the FINALE phase
 *    (finale cumulative cap = BUDGET_USD + RESERVE_USD).
 *  - Per-call --max-pay = min(price * 1.5, 0.50) outside the finale;
 *    finale --max-pay = price * 1.05 (small fee headroom).
 *  - A refused spend emits a `thought` event and returns { ok:false, guard:true }.
 *
 * Argv builders are exported pure functions so they are testable without spawning:
 * run `node agent/zero.js` for the built-in self-test (spawns nothing).
 */

const { spawnSync } = require('node:child_process');
const fixtures = require('./fixtures');

const DEFAULT_BUDGET_USD = 0.25;
const DEFAULT_RESERVE_USD = 2.5;
const PER_CALL_CAP_USD = 0.5;

const round4 = n => Math.round(n * 10000) / 10000;
const formatUsd = n => String(Number(Number(n || 0).toFixed(4)));

function envNum(key, fallback) {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

// ---------------- pure argv builders (unit-testable, never spawn) ----------------
function buildSearchArgs(query) {
  return ['search', String(query), '--json'];
}

function buildGetArgs(token) {
  return ['get', String(token), '--json'];
}

function buildFetchArgs({ token, maxPay, extra = [] } = {}) {
  if (!token) throw new Error('buildFetchArgs: token required');
  const argv = ['fetch', '--capability', String(token)];
  if (maxPay != null) argv.push('--max-pay', formatUsd(maxPay));
  argv.push('--json');
  return argv.concat(extra);
}

function buildReviewArgs({ runId, success = true, accuracy, value, reliability, content } = {}) {
  if (!runId) throw new Error('buildReviewArgs: runId required');
  const argv = ['review', String(runId), success ? '--success' : '--failure'];
  if (accuracy != null) argv.push('--accuracy', String(accuracy));
  if (value != null) argv.push('--value', String(value));
  if (reliability != null) argv.push('--reliability', String(reliability));
  if (content) argv.push('--content', String(content));
  return argv;
}

// ---------------- the wrapper ----------------
function createZero({ live = false, emit = () => {}, budgetUsd, reserveUsd } = {}) {
  const budget = budgetUsd != null ? budgetUsd : envNum('BUDGET_USD', DEFAULT_BUDGET_USD);
  const reserve = reserveUsd != null ? reserveUsd : envNum('RESERVE_USD', DEFAULT_RESERVE_USD);

  let phase = 'PLAN';
  let spentUsd = 0;
  const callCounts = Object.create(null); // per-token attempt counter (drives fixture outcomes)

  function dryLog(argv) {
    console.error(`[dry] would run: zero ${argv.join(' ')}`);
  }

  function spawnZero(argv) {
    if (!live) {
      // Unreachable by construction (every caller checks `live` first) — belt and braces.
      throw new Error('spawnZero called in dry mode — refusing to go near the wallet');
    }
    const res = spawnSync('zero', argv, { encoding: 'utf8', timeout: 90000 });
    if (res.error) return { ok: false, error: String(res.error) };
    if (res.status !== 0) return { ok: false, status: res.status, error: (res.stderr || '').trim() };
    try {
      return { ok: true, data: JSON.parse(res.stdout) };
    } catch (e) {
      return { ok: false, error: `unparseable zero --json output: ${e.message}`, raw: res.stdout };
    }
  }

  function maxPayFor(price) {
    if (phase === 'FINALE') return round4(price * 1.05); // fee headroom, still tight
    return Math.min(round4(price * 1.5), PER_CALL_CAP_USD);
  }

  // Returns null when the spend is allowed, else a refusal result (thought emitted).
  function guard(price, name) {
    const finale = phase === 'FINALE';
    let reason = null;
    if (!finale && price > PER_CALL_CAP_USD) {
      reason = `per-call cap: ${formatUsd(price)} > ${formatUsd(PER_CALL_CAP_USD)} outside FINALE`;
    } else if (!finale && spentUsd + price > budget + 1e-9) {
      reason = `working budget: spent ${formatUsd(spentUsd)} + ${formatUsd(price)} would exceed BUDGET_USD ${formatUsd(budget)} (reserve ${formatUsd(reserve)} is finale-only)`;
    } else if (finale && spentUsd + price > budget + reserve + 1e-9) {
      reason = `absolute ceiling: spent ${formatUsd(spentUsd)} + ${formatUsd(price)} would exceed BUDGET+RESERVE ${formatUsd(budget + reserve)}`;
    }
    if (!reason) return null;
    emit({
      type: 'thought',
      text: `Money guard REFUSED "${name}" — ${reason}. The wallet stays safe; rethinking the move instead of forcing it.`,
    });
    return { ok: false, guard: true, reason, name, price };
  }

  return {
    setPhase(name) {
      phase = name;
    },
    getPhase() {
      return phase;
    },
    getSpentUsd() {
      return spentUsd;
    },
    getBudgets() {
      return { budgetUsd: budget, reserveUsd: reserve, perCallCapUsd: PER_CALL_CAP_USD };
    },

    async searchCapabilities(query) {
      const argv = buildSearchArgs(query);
      if (!live) {
        dryLog(argv);
        return fixtures.search(query);
      }
      const r = spawnZero(argv);
      if (!r.ok) return { query, total: 0, services: [], error: r.error };
      const d = r.data || {};
      const services = d.services || d.results || [];
      return { query, total: d.total != null ? d.total : services.length, services };
    },

    async inspect(token) {
      const argv = buildGetArgs(token);
      if (!live) {
        dryLog(argv);
        return fixtures.inspect(token);
      }
      const r = spawnZero(argv);
      return r.ok ? r.data : { token, error: r.error };
    },

    // The ONLY code path that can move money. opts: { token, name, price, params, extraArgs }
    async paidFetch({ token, name, price, params, extraArgs } = {}) {
      const p = Number(price) || 0;
      const label = name || token;
      const refused = guard(p, label);
      if (refused) return refused;

      const argv = buildFetchArgs({ token, maxPay: maxPayFor(p), extra: extraArgs });
      if (!live) {
        dryLog(argv);
        const idx = (callCounts[token] = (callCounts[token] == null ? 0 : callCounts[token] + 1));
        const outcome = fixtures.outcomeFor(token, idx);
        if (outcome === 'http500') {
          return { ok: false, status: 500, token, name: label, price: p, error: 'vendor returned HTTP 500 (simulated)' };
        }
        spentUsd = round4(spentUsd + p);
        return {
          ok: true,
          runId: 'dry_' + Math.random().toString(36).slice(2, 8),
          token,
          name: label,
          price: p,
          data: fixtures.fetchPayload(token, params),
        };
      }
      const r = spawnZero(argv);
      if (!r.ok) return { ok: false, status: r.status || 500, token, name: label, price: p, error: r.error };
      spentUsd = round4(spentUsd + p);
      const env = r.data || {};
      return {
        ok: true,
        runId: env.runId || env.run_id || 'live_' + Date.now().toString(36),
        token,
        name: label,
        price: p,
        data: env.result != null ? env.result : env,
      };
    },

    async review(runId, { success = true, accuracy, value, reliability, content } = {}) {
      const argv = buildReviewArgs({ runId, success, accuracy, value, reliability, content });
      if (!live) {
        dryLog(argv);
        return { ok: true, dry: true };
      }
      const r = spawnZero(argv);
      return { ok: r.ok, error: r.error };
    },
  };
}

module.exports = {
  createZero,
  buildSearchArgs,
  buildGetArgs,
  buildFetchArgs,
  buildReviewArgs,
  DEFAULT_BUDGET_USD,
  DEFAULT_RESERVE_USD,
  PER_CALL_CAP_USD,
};

// ---------------- self-test: `node agent/zero.js` (spawns NOTHING) ----------------
if (require.main === module) {
  const assert = require('node:assert');
  assert.deepStrictEqual(buildSearchArgs('gift card'), ['search', 'gift card', '--json']);
  assert.deepStrictEqual(buildGetArgs('z_btr.1'), ['get', 'z_btr.1', '--json']);
  assert.deepStrictEqual(buildFetchArgs({ token: 'z_btr.1', maxPay: 0.003 }), [
    'fetch', '--capability', 'z_btr.1', '--max-pay', '0.003', '--json',
  ]);
  assert.deepStrictEqual(buildFetchArgs({ token: 'z_flux.1', maxPay: 0.0045 }), [
    'fetch', '--capability', 'z_flux.1', '--max-pay', '0.0045', '--json',
  ]);
  assert.deepStrictEqual(
    buildReviewArgs({ runId: 'r1', success: true, accuracy: 5, value: 5, reliability: 5, content: 'ok' }),
    ['review', 'r1', '--success', '--accuracy', '5', '--value', '5', '--reliability', '5', '--content', 'ok']
  );
  assert.deepStrictEqual(buildReviewArgs({ runId: 'r2', success: false }), ['review', 'r2', '--failure']);

  (async () => {
    // Guards: dry instance refuses an over-cap spend, emits a thought, spawns nothing.
    const events = [];
    const z = createZero({ live: false, emit: e => events.push(e) });
    const refused = await z.paidFetch({ token: 'z_test.1', name: 'too pricey', price: 9.99 });
    assert.strictEqual(refused.ok, false);
    assert.strictEqual(refused.guard, true);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, 'thought');

    // Cumulative budget cap holds outside FINALE.
    const z2 = createZero({ live: false, emit: () => {}, budgetUsd: 0.005 });
    const a = await z2.paidFetch({ token: 'z_btr.1', name: 'lookup', price: 0.004 });
    assert.strictEqual(a.ok, true);
    const b = await z2.paidFetch({ token: 'z_btr.1', name: 'lookup2', price: 0.004 });
    assert.strictEqual(b.guard, true);

    // FINALE unlocks reserve but keeps the absolute ceiling.
    const z3 = createZero({ live: false, emit: () => {}, budgetUsd: 0.25, reserveUsd: 2.5 });
    z3.setPhase('FINALE');
    const card = await z3.paidFetch({ token: 'z_btr.2', name: 'gift card', price: 2.0 });
    assert.strictEqual(card.ok, true);
    const greedy = await z3.paidFetch({ token: 'z_btr.2', name: 'second card', price: 1.0 });
    assert.strictEqual(greedy.guard, true);

    console.log('zero.js self-test OK — argv builders + guards verified, no zero CLI spawned');
  })().catch(e => {
    console.error('zero.js self-test FAILED:', e);
    process.exit(1);
  });
}
