#!/usr/bin/env node
/**
 * THE AUTONOMOUS BUYER — LADDER's customer.
 *
 * No human clicks anything. It:
 *   1. reads the shop's public listing (GET /shop),
 *   2. decides its willingness-to-pay by REASONING over the product (AkashML —
 *      OpenAI-compatible inference on Akash; falls back to a fixed cap if no key),
 *   3. polls as the seller marks the price down, and the moment price <= willingness,
 *   4. pays via x402 (signs USDC on Base, gasless EIP-3009 — holds only USDC, no ETH),
 *   5. reads the settlement tx hash and emits a `sale` event with a BaseScan link.
 *
 * When /buy returns 200, real value moved on-chain. Testnet by default; real USDC
 * when LADDER_NET=mainnet.
 *
 * Env: BUYER_PRIVATE_KEY, SHOP_URL, AKASHML_API_KEY (optional), AKASHML_MODEL,
 *      BUYER_MAX_USD (fallback willingness), BUYER_TIMEOUT_MS, LADDER_NET.
 */
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import OpenAI from 'openai';
import { CHAIN, IS_MAINNET, RPC_URL, explorerTx, netLabel } from '../lib/net.mjs';
import { emit } from '../lib/events.mjs';

const SHOP_URL = process.env.SHOP_URL || 'http://localhost:4021';
const PK = process.env.BUYER_PRIVATE_KEY;
const AKASHML_API_KEY = (process.env.AKASHML_API_KEY || '').trim();
const AKASHML_MODEL = process.env.AKASHML_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
const FALLBACK_MAX_USD = Number(process.env.BUYER_MAX_USD) || 0.12;
const TIMEOUT_MS = Number(process.env.BUYER_TIMEOUT_MS) || 120000;
const POLL_MS = Number(process.env.BUYER_POLL_MS) || 2500;
const MAX_PAY_ATOMIC = BigInt(process.env.BUYER_MAX_PAY_ATOMIC || '2000000'); // 2 USDC ceiling (6 decimals)

const usd = n => '$' + String(Number(Number(n).toFixed(6)));

if (!PK) {
  console.error('[buyer] BUYER_PRIVATE_KEY not set. Run gen-wallets.mjs and source ~/.ladder-env.');
  process.exit(1);
}

const account = privateKeyToAccount(PK);
const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });
const payFetch = wrapFetchWithPayment(fetch, wallet, MAX_PAY_ATOMIC);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getShop() {
  const r = await fetch(`${SHOP_URL}/shop`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`shop returned ${r.status}`);
  return r.json();
}

/** Reason about how much this product is worth — AkashML, or a fixed cap fallback. */
async function decideWillingness(shop) {
  if (!AKASHML_API_KEY) {
    return { maxPrice: FALLBACK_MAX_USD, reason: `fixed cap ${usd(FALLBACK_MAX_USD)} (no AkashML key)`, model: 'rule' };
  }
  try {
    const client = new OpenAI({ baseURL: 'https://api.akashml.com/v1', apiKey: AKASHML_API_KEY });
    const res = await client.chat.completions.create({
      model: AKASHML_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are an autonomous purchasing agent buying digital goods with your own USDC. ' +
            'Judge fair value and return STRICT JSON {"maxPrice": number, "reason": string}. ' +
            'maxPrice is the most USD you will pay. Be a disciplined buyer — do not overpay.',
        },
        {
          role: 'user',
          content:
            `Product: ${shop.product.name}\nNiche: ${shop.product.niche}\n` +
            `Includes: ${(shop.product.includes || []).join(', ')}\n` +
            `Current asking price: ${usd(shop.priceUsd)} USDC. Seller's input cost: ${usd(shop.cogsUsd)}.\n` +
            `What is the MOST you would pay? Return JSON only.`,
        },
      ],
    });
    const raw = res.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    let maxPrice = Number(parsed.maxPrice);
    if (!Number.isFinite(maxPrice) || maxPrice <= 0) maxPrice = FALLBACK_MAX_USD;
    maxPrice = Math.min(maxPrice, Number(MAX_PAY_ATOMIC) / 1e6); // never exceed the hard cap
    return { maxPrice: Number(maxPrice.toFixed(6)), reason: String(parsed.reason || '').slice(0, 160), model: AKASHML_MODEL };
  } catch (e) {
    return { maxPrice: FALLBACK_MAX_USD, reason: `AkashML unavailable (${String(e.message).slice(0, 80)}) — fixed cap`, model: 'rule' };
  }
}

async function buy(shop) {
  emit({ type: 'thought', text: `Deal. ${usd(shop.priceUsd)} for the ${shop.product.niche} pack is worth it — paying now.` });
  const res = await payFetch(`${SHOP_URL}/buy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`buy failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const goods = await res.json();
  const header = res.headers.get('x-payment-response');
  let txHash = null;
  try {
    if (header) txHash = decodeXPaymentResponse(header)?.transaction || null;
  } catch { /* header decode is best-effort */ }

  const sale = {
    type: 'sale',
    product: shop.product.name,
    amountUsd: shop.priceUsd,
    buyer: account.address,
    network: IS_MAINNET ? 'base' : 'base-sepolia',
    txHash,
    explorerUrl: txHash ? explorerTx(txHash) : null,
  };
  emit(sale);
  emit({ type: 'earnings', totalUsd: shop.priceUsd });
  emit({ type: 'rung', n: 6 });
  emit({
    type: 'thought',
    text: txHash
      ? `SOLD. Real USDC settled on ${IS_MAINNET ? 'Base' : 'Base Sepolia'} — tx ${txHash.slice(0, 10)}…. My agent just got paid.`
      : `SOLD. Payment went through and the goods shipped.`,
  });
  return { goods, txHash };
}

async function main() {
  console.log(`[buyer] ${account.address} shopping ${SHOP_URL}  (${netLabel()})`);
  const start = Date.now();
  let willingness = null;
  let lastSkipPrice = null;

  while (Date.now() - start < TIMEOUT_MS) {
    let shop;
    try {
      shop = await getShop();
    } catch (e) {
      await sleep(POLL_MS);
      continue;
    }

    // Decide willingness once (stable per product) so the seller's markdown can cross it.
    if (willingness == null) {
      const d = await decideWillingness(shop);
      willingness = d.maxPrice;
      emit({ type: 'thought', text: `Sizing up "${shop.product.name}". I'll pay up to ${usd(willingness)} — ${d.reason}` });
      emit({ type: 'offer', willingnessUsd: willingness, priceUsd: shop.priceUsd, model: d.model });
    }

    if (shop.priceUsd <= willingness + 1e-9) {
      try {
        const { txHash } = await buy(shop);
        console.log(`[buyer] bought at ${usd(shop.priceUsd)} tx=${txHash || 'n/a'}`);
        return 0;
      } catch (e) {
        emit({ type: 'thought', text: `Payment problem: ${String(e.message).slice(0, 140)}` });
        console.error('[buyer]', e);
        return 1;
      }
    }

    // Too expensive — wait for the seller to come down. Narrate once per price level.
    if (lastSkipPrice !== shop.priceUsd) {
      lastSkipPrice = shop.priceUsd;
      emit({ type: 'offer', willingnessUsd: willingness, priceUsd: shop.priceUsd, decision: 'skip' });
      emit({ type: 'thought', text: `${usd(shop.priceUsd)}? Too rich. It's worth ${usd(willingness)} to me — I'll wait.` });
    }
    await sleep(POLL_MS);
  }

  emit({ type: 'thought', text: `Walked away — the price never reached my ${usd(willingness)} limit in time.` });
  return 0;
}

main().then(code => process.exit(code)).catch(e => { console.error(e); process.exit(1); });
