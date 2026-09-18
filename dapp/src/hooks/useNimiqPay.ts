"use client";

import { useNimiqPayContext } from "@/contexts/NimiqPayContext";

// init() waits for window.nimiq to be injected and never resolves or rejects
// on its own if that never happens — without a timeout, any call site using
// it can hang the UI forever with no error and no way out. Every init() call
// below passes this explicitly.
const NIMIQ_INIT_TIMEOUT_MS = 8000;

// Single source of truth — reads from NimiqPayProvider in the root Providers tree.
// The provider detects once on app load and never re-runs on client-side navigation.
export function useIsNimiqPay(): boolean | null {
  return useNimiqPayContext();
}

/** Requests a per-viewer device identifier from Nimiq Pay — useful for
 *  anti-duplicate leaderboard entries. Returns null outside Nimiq Pay or if
 *  the request fails. */
export async function nimiqPayRequestDeviceIdentifier(
  reason: string,
): Promise<string | null> {
  try {
    const { requestDeviceIdentifier } = await import("@nimiq/mini-app-sdk");
    const id = await requestDeviceIdentifier({ reason });
    return id ?? null;
  } catch {
    return null;
  }
}

/**
 * Sends a NIM payment via the Nimiq provider and returns the transaction
 * hash. Throws if the provider is unavailable (not running inside Nimiq Pay)
 * or the user declines the native confirmation dialog.
 *
 * Nimiq has no general-purpose smart contracts, so there is no way to verify
 * this payment independently once it lands on Nimiq's chain — Nimiq Pay's own
 * confirmation dialog is the trust boundary, same as other Nimiq Pay mini
 * apps that accept NIM. See Focusling.sol's usedNimTx for what happens with
 * the returned hash on the Base side.
 */
export async function sendNimPayment(params: {
  recipient: string;
  valueLuna: number;
  data?: string;
}): Promise<string> {
  const { init } = await import("@nimiq/mini-app-sdk");
  const nimiq = await init({ timeout: NIMIQ_INIT_TIMEOUT_MS });
  const result = params.data
    ? await nimiq.sendBasicTransactionWithData({
        recipient: params.recipient,
        value: params.valueLuna,
        data: params.data,
      })
    : await nimiq.sendBasicTransaction({
        recipient: params.recipient,
        value: params.valueLuna,
      });

  if (typeof result !== "string" || !result) {
    throw new Error("NIM payment failed or was declined.");
  }
  return result;
}

// Community-run, rate-limited public Albatross RPC node — free, no signup.
// Override with NEXT_PUBLIC_NIMIQ_RPC_URL to point at your own node for
// anything beyond casual/hackathon-scale traffic (no uptime guarantee here).
const NIMIQ_RPC_URL =
  process.env.NEXT_PUBLIC_NIMIQ_RPC_URL || "https://rpc.nimiqwatch.com";

/**
 * Reveals the user's Nimiq address. Requires the native confirmation dialog
 * every time it's called — only call this from a direct, explicit user tap
 * (e.g. picking "NIM" in a currency toggle), never on page load or silently
 * in the background. Returns null outside Nimiq Pay or if declined.
 */
export async function nimiqPayGetAddress(): Promise<string | null> {
  try {
    const { init } = await import("@nimiq/mini-app-sdk");
    const nimiq = await init({ timeout: NIMIQ_INIT_TIMEOUT_MS });
    const accounts = await nimiq.listAccounts();
    if (!Array.isArray(accounts) || !accounts[0]) {
      console.error("[NimiqPay] listAccounts() returned no address:", accounts);
      return null;
    }
    return accounts[0];
  } catch (err) {
    console.error("[NimiqPay] nimiqPayGetAddress failed:", err);
    return null;
  }
}

/**
 * NIM balance for an already-known address, formatted to 2 decimals. This is
 * a plain RPC read (no wallet confirmation) — safe to call as often as
 * needed once nimiqPayGetAddress() has resolved once. Returns null on any
 * failure (no RPC reachable, address not yet used on-chain, etc.) — never
 * throws, since a balance display is optional chrome, not gameplay-critical.
 */
export async function nimiqPayGetBalance(address: string): Promise<string | null> {
  try {
    const { init } = await import("@nimiq/mini-app-sdk");
    const nimiq = await init({ timeout: NIMIQ_INIT_TIMEOUT_MS });
    nimiq.setRPCUrl(NIMIQ_RPC_URL);
    const res = await nimiq.request<{ data?: { balance?: number } } | null>({
      method: "getAccountByAddress",
      params: [address],
    });
    const luna = res?.data?.balance;
    if (typeof luna !== "number") {
      console.error("[NimiqPay] getAccountByAddress returned no balance:", res);
      return null;
    }
    return (luna / 100_000).toFixed(2);
  } catch (err) {
    console.error("[NimiqPay] nimiqPayGetBalance failed:", err);
    return null;
  }
}

/**
 * Normalizes a Nimiq transaction hash (format not guaranteed by the SDK's
 * types) into the 0x-prefixed bytes32 form Focusling.sol expects.
 */
export function nimTxHashToBytes32(txHash: string): `0x${string}` {
  const hex = txHash.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Unexpected NIM transaction hash format: "${txHash}"`);
  }
  return `0x${hex.toLowerCase()}` as `0x${string}`;
}
