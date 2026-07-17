/**
 * Network config shared by the seller and buyer.
 *
 * LADDER_NET = "testnet" (default) | "mainnet"
 *   testnet  -> Base Sepolia, keyless x402.org facilitator, FREE test USDC.
 *   mainnet  -> Base, Coinbase CDP facilitator (needs CDP_API_KEY_ID/SECRET), REAL USDC.
 *
 * The seller/buyer code is identical on both; only the values here change.
 */
import { base, baseSepolia } from 'viem/chains';

const NET = (process.env.LADDER_NET || 'testnet').toLowerCase();
export const IS_MAINNET = NET === 'mainnet';

// x402's route config takes the network as a plain string ("base" | "base-sepolia").
export const X402_NETWORK = IS_MAINNET ? 'base' : 'base-sepolia';
export const CHAIN = IS_MAINNET ? base : baseSepolia;
export const EXPLORER = IS_MAINNET ? 'https://basescan.org' : 'https://sepolia.basescan.org';

// Pin a reliable RPC (the chain's baked-in default can rate-limit / drop). Override
// with BASE_RPC_URL / BASE_SEPOLIA_RPC_URL if you have a private endpoint.
export const RPC_URL = IS_MAINNET
  ? (process.env.BASE_RPC_URL || 'https://base-rpc.publicnode.com')
  : (process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com');

/**
 * Facilitator: mainnet needs the CDP facilitator object (reads CDP_API_KEY_ID/SECRET
 * from env). Testnet returns undefined so x402 uses its built-in keyless default.
 * Imported lazily so testnet never requires @coinbase/x402 CDP creds to be present.
 */
export async function getFacilitator() {
  if (!IS_MAINNET) return undefined;
  const { facilitator } = await import('@coinbase/x402');
  return facilitator;
}

export function explorerTx(hash) {
  return `${EXPLORER}/tx/${hash}`;
}

export function netLabel() {
  return IS_MAINNET ? 'Base MAINNET (real USDC)' : 'Base Sepolia TESTNET (free test USDC)';
}
