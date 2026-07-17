#!/usr/bin/env node
/**
 * Generate the two EVM keypairs the earn loop needs, and persist them to
 * ~/.ladder-env (OUTSIDE the repo, never committed):
 *
 *   SELLER  — the shop's receiving wallet. Real USDC lands here when a sale settles.
 *   BUYER   — the autonomous customer's wallet. It signs x402 payments.
 *             (Gasless via EIP-3009 — it only ever needs to hold USDC, never ETH.)
 *
 * Idempotent: if keys already exist in ~/.ladder-env it prints the addresses and
 * exits WITHOUT regenerating — so re-running never orphans a funded wallet.
 *
 *   node scripts/gen-wallets.mjs
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const ENV_PATH = join(homedir(), '.ladder-env');

function readEnvFile() {
  if (!existsSync(ENV_PATH)) return '';
  return readFileSync(ENV_PATH, 'utf8');
}

function existingKey(text, name) {
  const m = text.match(new RegExp(`^\\s*export\\s+${name}="?(0x[0-9a-fA-F]{64})"?`, 'm'));
  return m ? m[1] : null;
}

function ensureWallet(text, keyVar, addrVar, label) {
  const existing = existingKey(text, keyVar);
  if (existing) {
    const acct = privateKeyToAccount(existing);
    console.log(`  ${label}: reusing existing wallet ${acct.address}`);
    return { address: acct.address, created: false };
  }
  const pk = generatePrivateKey();
  const acct = privateKeyToAccount(pk);
  appendFileSync(
    ENV_PATH,
    `\n# ${label} wallet (generated ${'by gen-wallets.mjs'})\n` +
      `export ${keyVar}="${pk}"\n` +
      `export ${addrVar}="${acct.address}"\n`
  );
  console.log(`  ${label}: created ${acct.address}`);
  return { address: acct.address, created: true };
}

const text = readEnvFile();
console.log(`Wallets -> ${ENV_PATH}`);
const seller = ensureWallet(text, 'SELLER_PRIVATE_KEY', 'SELLER_ADDRESS', 'SELLER');
const buyer = ensureWallet(readEnvFile(), 'BUYER_PRIVATE_KEY', 'BUYER_ADDRESS', 'BUYER');

console.log('\n────────────────────────────────────────────────────────');
console.log('  FUND THIS ADDRESS (the buyer) with test USDC:');
console.log(`  ${buyer.address}`);
console.log('  Base Sepolia faucet: https://faucet.circle.com  (pick "Base Sepolia")');
console.log('  Seller (receives sales):', seller.address);
console.log('────────────────────────────────────────────────────────');
console.log('\nKeys are in ~/.ladder-env. Never commit them. Source before running:');
console.log('  set -a; source ~/.ladder-env; set +a');
