import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isAddress, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

/**
 * One-time gas drip so a Nimiq-native user (who holds NIM, not ETH) can pay
 * for their first Base transactions. Funded from a small, dedicated wallet —
 * deliberately NOT the contract owner/deployer key, so a problem here can
 * only cost the faucet's own small balance, never contract control.
 *
 * Layered anti-sybil checks, in order: rate limit by IP, one drip per Nimiq
 * Pay device identifier, one drip per address, skip addresses that already
 * have enough ETH, and a global spend ceiling as a circuit breaker.
 *
 * The "already dripped" tracking is in-memory (per-process) — fine for a
 * short testing window, but resets on redeploy/cold start. Swap in a real
 * KV store (e.g. Upstash Redis) before relying on this long-term.
 */

const DRIP_AMOUNT = parseEther("0.00002"); // ~$0.06 at current ETH prices — several sessions' worth of gas
const MIN_BALANCE_TO_SKIP = parseEther("0.00001"); // don't drip to addresses that already have enough
const MAX_TOTAL_DISPENSED = parseEther("0.00018"); // circuit breaker — leaves a buffer in the faucet's funding
const DEVICE_ID_RE = /^[0-9a-f]{64}$/i;

const drippedDevices = new Set<string>();
const drippedAddresses = new Set<string>();
let totalDispensed = 0n;

const transportUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://mainnet.base.org";

function getFaucetAccount() {
  const pk = process.env.FAUCET_PRIVATE_KEY;
  if (!pk) throw new Error("FAUCET_PRIVATE_KEY not configured");
  return privateKeyToAccount(pk as `0x${string}`);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`faucet:${ip}`, 5, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  let body: { address?: string; deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { address, deviceId } = body;

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }
  if (!deviceId || !DEVICE_ID_RE.test(deviceId)) {
    return NextResponse.json(
      { error: "A Nimiq Pay device identifier is required." },
      { status: 400 },
    );
  }

  const normalizedAddress = address.toLowerCase();
  const normalizedDevice = deviceId.toLowerCase();

  if (drippedDevices.has(normalizedDevice) || drippedAddresses.has(normalizedAddress)) {
    return NextResponse.json(
      { error: "This device or address has already received gas." },
      { status: 429 },
    );
  }

  if (totalDispensed + DRIP_AMOUNT > MAX_TOTAL_DISPENSED) {
    return NextResponse.json(
      { error: "The gas faucet is out of funds for now." },
      { status: 503 },
    );
  }

  const publicClient = createPublicClient({ chain: base, transport: http(transportUrl) });

  let currentBalance: bigint;
  try {
    currentBalance = await publicClient.getBalance({ address });
  } catch {
    return NextResponse.json({ error: "Could not check balance." }, { status: 502 });
  }

  if (currentBalance >= MIN_BALANCE_TO_SKIP) {
    return NextResponse.json(
      { error: "This address already has enough ETH." },
      { status: 400 },
    );
  }

  let account;
  try {
    account = getFaucetAccount();
  } catch {
    return NextResponse.json({ error: "Faucet not configured." }, { status: 500 });
  }

  const walletClient = createWalletClient({ account, chain: base, transport: http(transportUrl) });

  try {
    const hash = await walletClient.sendTransaction({
      to: address,
      value: DRIP_AMOUNT,
    });

    // Reserve immediately after broadcast (not after confirmation) so a slow
    // request can't slip a second drip through before this one lands.
    drippedDevices.add(normalizedDevice);
    drippedAddresses.add(normalizedAddress);
    totalDispensed += DRIP_AMOUNT;

    return NextResponse.json({ hash });
  } catch (err) {
    console.error("[faucet] send failed", err);
    return NextResponse.json(
      { error: "Failed to send gas. Try again shortly." },
      { status: 502 },
    );
  }
}
