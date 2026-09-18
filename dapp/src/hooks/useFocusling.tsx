"use client";

import {
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { base } from "wagmi/chains";
import { FocuslingABI } from "@/config/abi";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { erc20Abi } from "viem";

import { CONTRACT_ADDRESS, NIM_TREASURY_ADDRESS } from "@/config/contracts";
import { useAuth } from "@/hooks/useAuth";
import { sendNimPayment, nimTxHashToBytes32 } from "@/hooks/useNimiqPay";

// Base Mainnet USDC (native, Circle-issued).
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

function copyableErrorToast(msg: string) {
  toast.error(
    (t) => (
      <span
        onClick={() => {
          navigator.clipboard?.writeText(msg).catch(() => {});
          toast.dismiss(t.id);
        }}
        style={{ cursor: "pointer", userSelect: "all", display: "block" }}
        title="Tap to copy"
      >
        {msg}
      </span>
    ),
    { duration: 30000 },
  );
}

// USDC price constants (6 decimals, matching contract)
const PRICE_FOOD_USDC       = BigInt(100_000);
const PRICE_SUPER_FOOD_USDC = BigInt(250_000);
const PRICE_ENERGY_DRINK_USDC = BigInt(200_000);
const PRICE_SHIELD_USDC     = BigInt(500_000);
const PRICE_REVIVE_USDC     = BigInt(250_000);

// NIM price constants, in Luna (1 NIM = 100,000 Luna, matching contract)
// TEMPORARY DEMO PRICING — cheap enough to actually test buying in NIM
// without spending much. Revert to the original values (commented) before
// final submission.
const PRICE_FOOD_NIM         = 500_000;    // 5 NIM (unchanged)
const PRICE_SUPER_FOOD_NIM   = 500_000;    // 5 NIM — was 1_200_000 (12 NIM)
const PRICE_ENERGY_DRINK_NIM = 500_000;    // 5 NIM — was 1_000_000 (10 NIM)
const PRICE_SHIELD_NIM       = 2_500_000;  // 25 NIM (unchanged)
const PRICE_REVIVE_NIM       = 100_000_000; // 1000 NIM — was 1_200_000 (12 NIM), deliberately steep so a dead pet is a real cost

export function useFocusling() {
  const { address } = useAuth();

  const [isSigning, setIsSigning] = useState(false);
  const [lastAction, setLastAction] = useState<
    "focus" | "shop" | "profile" | null
  >(null);
  const [hasToasted, setHasToasted] = useState(false);
  // After approve confirms, prompt user to tap again so the buy fires from a
  // direct user gesture — Nimiq Pay blocks eth_sendTransaction from useEffect.
  const [pendingUSDCApproval, setPendingUSDCApproval] = useState(false);
  const [usdcApproved, setUsdcApproved] = useState(false);
  const [pendingBuyTx, setPendingBuyTx] = useState(false);
  const [expectedBuyHash, setExpectedBuyHash] = useState<`0x${string}` | undefined>();
  const [pendingSession, setPendingSession] = useState<{
    minutes: number;
    multiplier: number;
  } | null>(null);

  const {
    writeContract: rawWriteContract,
    writeContractAsync: rawWriteContractAsync,
    data: singleHash,
    isPending: isSinglePending,
    error: writeError,
  } = useWriteContract();

  // Every write is pinned to Base (chainId: base.id below), but the injected
  // wallet itself (a general extension during testing, Nimiq Pay's wallet in
  // prod) can be sitting on a different chain — e.g. Celo, left over from
  // this app's old GoodDollar build. Rather than let that surface as a raw
  // "chain mismatch" viem error, proactively switch first and only bail with
  // a friendly toast if the wallet rejects the switch.
  //
  // wagmi's own useChainId() is NOT trusted here — some injected providers
  // (observed with Nimiq Pay's EVM wallet) resolve wallet_switchEthereumChain
  // successfully without actually changing the connected chain, which makes
  // wagmi's cached chainId say "Base" while eth_sendTransaction still fails
  // against the real chain. Every write re-checks the provider directly via
  // eth_chainId immediately before sending, and re-verifies after a switch
  // attempt instead of trusting the switch call's resolution.
  const { switchChainAsync } = useSwitchChain();

  const getActualChainId = useCallback(async (): Promise<number | null> => {
    try {
      const eth = (window as any).ethereum;
      if (!eth?.request) return null;
      const raw = await eth.request({ method: "eth_chainId" });
      // EIP-1193 says this should be a hex string like "0x2105", but not
      // every provider is strict about it — a plain number or a decimal
      // string here would silently miscompute against parseInt(x, 16),
      // permanently mismatching Base's id and forcing a switch prompt on
      // every single write even when already on the right chain.
      if (typeof raw === "number") return raw;
      if (typeof raw === "string") {
        return /^0x/i.test(raw) ? parseInt(raw, 16) : parseInt(raw, 10);
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const ensureBaseChain = useCallback(async (): Promise<boolean> => {
    const actual = await getActualChainId();
    if (actual === base.id) return true;
    try {
      await switchChainAsync({ chainId: base.id });
    } catch {
      return false;
    }
    // Re-verify against the real provider — some wallets report success
    // without actually switching.
    const confirmed = await getActualChainId();
    return confirmed === base.id || confirmed === null; // null = can't verify, proceed and let the write itself fail with a real error
  }, [getActualChainId, switchChainAsync]);

  const writeContract = useCallback(
    (args: any, options?: any) => {
      ensureBaseChain().then((ok) => {
        if (!ok) {
          toast.error(
            "Your wallet says it's on Base but hasn't actually switched — please switch networks manually in your wallet, then try again.",
          );
          return;
        }
        rawWriteContract(args, options);
      });
    },
    [ensureBaseChain, rawWriteContract],
  );

  const writeContractAsync = useCallback(
    async (args: any, options?: any) => {
      const ok = await ensureBaseChain();
      if (!ok) {
        throw new Error(
          "Your wallet says it's on Base but hasn't actually switched — please switch networks manually in your wallet, then try again.",
        );
      }
      return rawWriteContractAsync(args, options);
    },
    [ensureBaseChain, rawWriteContractAsync],
  );

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: singleHash, chainId: base.id });

  const finalIsPending = isSinglePending;
  const finalIsConfirming = isConfirming;
  const finalIsConfirmed = isConfirmed;

  // Reset toast guard on new pending transaction
  useEffect(() => {
    if (finalIsPending || isSigning) {
      setHasToasted(false);
    }
  }, [finalIsPending, isSigning]);

  useEffect(() => {
    if (writeError) {
      const err = writeError as any;
      const name: string  = err?.name ?? "";
      const code: number  = err?.code ?? err?.cause?.code ?? 0;
      const msg: string   = err?.message ?? err?.cause?.message ?? String(writeError);
      console.error("[Focusling] writeError", writeError);
      if (name === "UserRejectedRequestError" || code === 4001 || code === -32604) return;
      copyableErrorToast(`code=${code} | ${msg}`);
    }
  }, [writeError]);

  useEffect(() => {
    if (receiptError) {
      const err = receiptError as any;
      const msg: string = err?.message ?? err?.cause?.message ?? String(receiptError);
      console.error("[Focusling] receiptError", receiptError);
      copyableErrorToast(msg);
    }
  }, [receiptError]);

  const {
    data: multicallData,
    refetch: refetchAll,
    isLoading: isLoadingPet,
    isError: isPetLoadError,
  } = useReadContracts({
    contracts: [
      // [0] pets
      {
        address: CONTRACT_ADDRESS,
        abi: FocuslingABI,
        functionName: "pets",
        args: [address as `0x${string}`],
      },
      // [1] ownedCosmetics: sunglasses
      {
        address: CONTRACT_ADDRESS,
        abi: FocuslingABI,
        functionName: "ownedCosmetics",
        args: [address as `0x${string}`, "sunglasses"],
      },
      // [2] ownedCosmetics: crown
      {
        address: CONTRACT_ADDRESS,
        abi: FocuslingABI,
        functionName: "ownedCosmetics",
        args: [address as `0x${string}`, "crown"],
      },
      // [3] isCosmeticEquipped: sunglasses
      {
        address: CONTRACT_ADDRESS,
        abi: FocuslingABI,
        functionName: "isCosmeticEquipped",
        args: [address as `0x${string}`, "sunglasses"],
      },
      // [4] isCosmeticEquipped: crown
      {
        address: CONTRACT_ADDRESS,
        abi: FocuslingABI,
        functionName: "isCosmeticEquipped",
        args: [address as `0x${string}`, "crown"],
      },
      // [5] USDC balanceOf
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      },
      // [6] USDC allowance
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address as `0x${string}`, CONTRACT_ADDRESS],
      },
    ],
    query: {
      enabled: !!address,
      refetchInterval: 60000,
      retry: 2,
      retryDelay: 2000,
    },
  });

  // Extract from Multicall Array
  const petData = multicallData?.[0]?.result;
  const isSunglassesOwned = multicallData?.[1]?.result;
  const isCrownOwned = multicallData?.[2]?.result;
  const isSunglassesEquipped = multicallData?.[3]?.result;
  const isCrownEquipped = multicallData?.[4]?.result;
  const usdcBalanceRaw = multicallData?.[5]?.result ? (multicallData[5].result as bigint) : BigInt(0);
  const usdcAllowanceRaw = multicallData?.[6]?.result ? (multicallData[6].result as bigint) : BigInt(0);

  const refetch = refetchAll;

  // Handle Post-Confirmation Success Effects
  useEffect(() => {
    if (finalIsConfirmed && !hasToasted) {
      // The RPC transport falls back between Alchemy and the public
      // base.org node (src/app/providers.tsx) — they don't always agree on
      // the chain head, so the immediate refetch below can land on a node
      // that hasn't caught up to the just-confirmed block yet, reading
      // stale pre-purchase data (item still shows as not owned). This bit
      // users buying a cosmetic and immediately navigating to the
      // dashboard before a slower second read ever happened. A delayed
      // re-fetch catches that case without the user needing to manually
      // reload.
      const scheduleDefensiveRefetch = () => setTimeout(() => refetchAll(), 2500);

      if (lastAction === "focus") {
        setHasToasted(true);
        refetchAll();
        scheduleDefensiveRefetch();
      } else if (lastAction === "shop") {
        if (pendingBuyTx && singleHash && singleHash === expectedBuyHash) {
          setHasToasted(true);
          setPendingBuyTx(false);
          setExpectedBuyHash(undefined);
          toast.success("Purchase Successful!\nYour items are ready.");
          refetchAll();
          scheduleDefensiveRefetch();
        }
      } else if (lastAction === "profile") {
        setHasToasted(true);
        refetchAll();
        scheduleDefensiveRefetch();
      }
    }
  }, [finalIsConfirmed, refetchAll, lastAction, hasToasted, pendingBuyTx, singleHash, expectedBuyHash]);

  // ── USDC buy functions ──────────────────────────────────────────────────────
  const executeUSDCBuy = (
    functionName: string,
    usdcAmount: bigint,
    args: any[] = [],
  ) => {
    if (usdcBalanceRaw < usdcAmount) {
      toast.error("Insufficient USDC balance.");
      return;
    }
    setLastAction("shop");
    if (!usdcApproved && usdcAllowanceRaw < usdcAmount) {
      setPendingUSDCApproval(true);
      writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, usdcAmount],
        gas: BigInt(100_000),
        chainId: base.id,
      });
    } else {
      setUsdcApproved(false);
      setPendingBuyTx(true);
      writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: FocuslingABI,
        functionName: functionName as any,
        args: args as any,
        gas: BigInt(600_000),
        chainId: base.id,
      })
        .then((hash) => setExpectedBuyHash(hash))
        .catch(() => setPendingBuyTx(false));
    }
  };

  const buyFoodWithUSDC = (priceOverride?: bigint) =>
    executeUSDCBuy("buyFoodWithUSDC", priceOverride ?? PRICE_FOOD_USDC);
  const buySuperFoodWithUSDC = (priceOverride?: bigint) =>
    executeUSDCBuy("buySuperFoodWithUSDC", priceOverride ?? PRICE_SUPER_FOOD_USDC);
  const buyEnergyDrinkWithUSDC = (priceOverride?: bigint) =>
    executeUSDCBuy("buyEnergyDrinkWithUSDC", priceOverride ?? PRICE_ENERGY_DRINK_USDC);
  const buyShieldWithUSDC = (priceOverride?: bigint) =>
    executeUSDCBuy("buyShieldWithUSDC", priceOverride ?? PRICE_SHIELD_USDC);
  const revivePetWithUSDC = () =>
    executeUSDCBuy("revivePetWithUSDC", PRICE_REVIVE_USDC);
  const buyCosmeticWithUSDC = (cosmeticId: string, usdcPrice: bigint) =>
    executeUSDCBuy("buyCosmeticWithUSDC", usdcPrice, [cosmeticId, usdcPrice]);

  // ── NIM buy functions ────────────────────────────────────────────────────────
  // Pays NIM directly via the Nimiq provider first (native confirmation dialog),
  // then calls the matching *WithNIM contract function with the resulting tx
  // hash. No approval step — NIM isn't an ERC-20 the contract pulls from.
  const executeNimBuy = async (
    functionName: string,
    item: string,
    valueLuna: number,
    args: any[] = [],
  ) => {
    setLastAction("shop");
    setIsSigning(true);
    let nimTxHash: `0x${string}`;
    try {
      const tx = await sendNimPayment({
        recipient: NIM_TREASURY_ADDRESS,
        valueLuna,
        data: item,
      });
      nimTxHash = nimTxHashToBytes32(tx);
    } catch (e: any) {
      setIsSigning(false);
      toast.error(e?.message ?? "NIM payment failed.");
      return;
    }
    setIsSigning(false);
    setPendingBuyTx(true);
    writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: FocuslingABI,
      functionName: functionName as any,
      args: [...args, nimTxHash] as any,
      gas: BigInt(300_000),
      chainId: base.id,
    })
      .then((hash) => setExpectedBuyHash(hash))
      .catch(() => setPendingBuyTx(false));
  };

  const buyFoodWithNIM = () =>
    executeNimBuy("buyFoodWithNIM", "FOOD", PRICE_FOOD_NIM);
  const buySuperFoodWithNIM = () =>
    executeNimBuy("buySuperFoodWithNIM", "SUPER_FOOD", PRICE_SUPER_FOOD_NIM);
  const buyEnergyDrinkWithNIM = () =>
    executeNimBuy("buyEnergyDrinkWithNIM", "ENERGY_DRINK", PRICE_ENERGY_DRINK_NIM);
  const buyShieldWithNIM = () =>
    executeNimBuy("buyShieldWithNIM", "SHIELD", PRICE_SHIELD_NIM);
  const revivePetWithNIM = () =>
    executeNimBuy("revivePetWithNIM", "REVIVE", PRICE_REVIVE_NIM);
  const buyCosmeticWithNIM = (cosmeticId: string, nimAmountLuna: number) =>
    executeNimBuy("buyCosmeticWithNIM", cosmeticId, nimAmountLuna, [
      cosmeticId,
      BigInt(nimAmountLuna),
    ]);

  const toggleCosmetic = (id: string) => {
    setLastAction("shop");
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: FocuslingABI,
      functionName: "toggleCosmetic",
      args: [id],
      gas: BigInt(100_000),
      chainId: base.id,
    });
  };

  const setNames = (username: string, petName: string) => {
    if (!hasPet) {
      toast.error("Hatch your pet first before setting names!");
      return;
    }
    setLastAction("profile");
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: FocuslingABI,
      functionName: "setNames",
      args: [username, petName],
      gas: BigInt(200_000),
      chainId: base.id,
    });
  };

  const deleteUser = () => {
    setLastAction("profile");
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: FocuslingABI,
      functionName: "deleteUser",
      gas: BigInt(200_000),
      chainId: base.id,
    });
  };

  const recordSession = async (
    minutes: number,
    superchargeMultiplier: number = 1,
  ) => {
    setLastAction("focus");
    setPendingSession({ minutes, multiplier: superchargeMultiplier });
    toast.dismiss("session-retry");

    // Persist before attempting so the user can retry if the tx fails
    // (e.g. provider went stale after a long session, network blip, etc.)
    try {
      localStorage.setItem(
        "pending-focus-session",
        JSON.stringify({ minutes, multiplier: superchargeMultiplier, timestamp: Date.now() }),
      );
    } catch {}

    try {
      setIsSigning(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: FocuslingABI,
        functionName: "focusSession",
        args: [BigInt(Math.max(1, Math.round(minutes * 60)))],
        // Hard gas limit — skips eth_estimateGas. 600k covers first-time pet
        // init (_initPet writes ~13 cold storage slots ≈ 260k gas) + session logic.
        gas: BigInt(600_000),
        chainId: base.id,
      });
      // Clear the pending session on successful submission
      try { localStorage.removeItem("pending-focus-session"); } catch {}
    } catch (e) {
      console.error("Session Record Error:", e);
      const errMsg =
        (e as any)?.shortMessage ||
        (e as any)?.message ||
        String(e);
      // Surface a retry toast so the user doesn't silently lose their session.
      // The pending-focus-session key stays in localStorage — if they reload,
      // the mount effect below will offer to retry again.
      toast.error(
        () =>
          React.createElement(
            "span",
            {
              style: { cursor: "pointer" },
              onClick: () => {
                toast.dismiss("session-retry");
                recordSession(minutes, superchargeMultiplier);
              },
            },
            `Session not recorded — tap to retry. (${errMsg.slice(0, 80)})`,
          ),
        { duration: Infinity, id: "session-retry" },
      );
    } finally {
      setIsSigning(false);
    }
  };

  // On mount: if a previous session submission was interrupted (provider died,
  // network dropped, user closed mid-signing), offer to retry it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pending-focus-session");
      if (!raw) return;
      const { minutes, multiplier, timestamp } = JSON.parse(raw);
      // Only offer retry if the pending session is less than 2 hours old
      if (Date.now() - timestamp > 2 * 60 * 60 * 1000) {
        localStorage.removeItem("pending-focus-session");
        return;
      }
      // Remove immediately so this toast never loops — if retry also fails,
      // recordSession will re-save the key for the next mount.
      localStorage.removeItem("pending-focus-session");
      toast(
        () =>
          React.createElement(
            "span",
            {
              style: { cursor: "pointer" },
              onClick: () => {
                toast.dismiss("session-restore");
                recordSession(minutes, multiplier ?? 1);
              },
            },
            `⚠️ Unrecorded session (${Math.round(minutes)} min) — tap to save it.`,
          ),
        { duration: 20_000, id: "session-restore" },
      );
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After approve confirms, refetch so the fresh allowance is cached, then
  // prompt the user to tap Buy again. Nimiq Pay requires a direct user gesture
  // for eth_sendTransaction — auto-triggering from useEffect returns "Permission denied".
  useEffect(() => {
    if (isConfirmed && pendingUSDCApproval && lastAction === "shop") {
      setPendingUSDCApproval(false);
      setHasToasted(true);
      refetchAll().then(() => {
        setUsdcApproved(true);
        toast("Approved! Tap Buy again to complete your purchase.", { icon: "✅", duration: 10000 });
      });
    }
  }, [isConfirmed, pendingUSDCApproval, lastAction, refetchAll]);

  // Helper to determine if user has a pet (birthTime > 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pet = petData as any;
  const rawXp = pet ? Number(pet[0]) : 0;
  const rawHealth = pet ? Number(pet[1]) : 100;
  const lastInteraction = pet ? Number(pet[2]) : 0;
  const hasPet = pet && Number(pet[3]) > 0; // birthTime is index 3
  const username = pet ? (pet[4] as string) : "";
  const petName = pet ? (pet[5] as string) : "Unnamed Pet";
  const streak = pet && pet[6] ? Number(pet[6]) : 0;
  const lastDailySession = pet && pet[7] ? Number(pet[7]) : 0;
  const boostEndTime = pet && pet[8] ? Number(pet[8]) : 0;
  const shieldCount = pet && pet[9] ? Number(pet[9]) : 0;
  const activeCosmetic = pet && pet[10] ? (pet[10] as string) : "";
  const rawTotalTime = pet && pet[11] ? Number(pet[11]) : 0;

  // --- Virtual Health Decay (Real-time calculation) ---
  const [health, setHealth] = useState(rawHealth);
  const [xp, setXp] = useState(rawXp);
  const [totalTime, setTotalTime] = useState(rawTotalTime);

  // --- Streak Bonus Calculation ---
  const [virtualStreak, setVirtualStreak] = useState(streak);

  // --- Dynamic Weather Calculation ---
  const [weather, setWeather] = useState<
    "sunny" | "clear" | "cloudy" | "rainy" | "stormy"
  >("clear");
  const [isNight, setIsNight] = useState<boolean>(false);

  // Streak + weather + time-of-day share a single 60s interval — same cadence,
  // overlapping dependencies, no reason for three separate timers.
  useEffect(() => {
    const calculateVirtualStreak = () => {
      if (lastDailySession > 0) {
        const now = Math.floor(Date.now() / 1000);
        const lastSessionDay = Math.floor(lastDailySession / (24 * 60 * 60));
        const currentDay = Math.floor(now / (24 * 60 * 60));
        if (currentDay > lastSessionDay + 1) {
          setVirtualStreak(shieldCount > 0 ? streak : 0);
        } else {
          setVirtualStreak(streak);
        }
      } else {
        setVirtualStreak(streak);
      }
    };

    const calculateWeather = () => {
      if (!lastDailySession) { setWeather("clear"); return; }
      const now = Math.floor(Date.now() / 1000);
      const diffHrs = (now - lastDailySession) / 3600;
      const recentInteractionHrs = (now - lastInteraction) / 3600;
      if (diffHrs < 24 || recentInteractionHrs < 24) {
        setWeather(recentInteractionHrs < 1 ? "sunny" : (streak > 1 ? "sunny" : "clear"));
      } else if (diffHrs < 48) {
        setWeather("cloudy");
      } else if (diffHrs < 72) {
        setWeather("rainy");
      } else {
        setWeather("stormy");
      }
    };

    const checkTime = () => {
      const hours = new Date().getHours();
      setIsNight(hours >= 20 || hours < 6);
    };

    calculateVirtualStreak();
    calculateWeather();
    checkTime();

    const interval = setInterval(() => {
      calculateVirtualStreak();
      calculateWeather();
      checkTime();
    }, 60_000);
    return () => clearInterval(interval);
  }, [streak, lastDailySession, lastInteraction]);

  const streakBonus = Math.min(
    20,
    (virtualStreak > 1 ? virtualStreak - 1 : 0) * 5,
  ); // 5% per day, max 20%

  // Handle Focus Session Specific Confirmed Success Effects (Requires Pet Context Variables)
  useEffect(() => {
    if (
      finalIsConfirmed &&
      !hasToasted &&
      lastAction === "focus" &&
      pendingSession
    ) {
      setHasToasted(true);

      const { minutes, multiplier } = pendingSession;
      const seconds = Math.round(minutes * 60);
      const isBoostActive = boostEndTime > Math.floor(Date.now() / 1000);
      const nightMultiplier = isNight ? 1.1 : 1.0;
      const totalMultiplier =
        multiplier * (isBoostActive ? 2 : 1) * nightMultiplier;

      const baseXP = seconds + Math.floor((seconds * streakBonus) / 100);
      const finalXP = Math.floor(baseXP * totalMultiplier);

      setXp((prev) => prev + finalXP);
      setTotalTime((prev) => prev + seconds);
      setHealth((prev) => Math.min(100, prev + 5));
      setPendingSession(null);
      refetchAll();
    }
  }, [
    finalIsConfirmed,
    hasToasted,
    lastAction,
    pendingSession,
    boostEndTime,
    isNight,
    streakBonus,
    refetchAll,
  ]);

  useEffect(() => {
    setHealth(rawHealth);
    setXp(rawXp);
    setTotalTime(rawTotalTime);

    if (hasPet && lastInteraction > 0 && rawHealth > 0) {
      const calculateVirtualHealth = () => {
        const now = Math.floor(Date.now() / 1000);
        const timeDiff = now - lastInteraction;
        const daysPassed = timeDiff / (24 * 60 * 60);
        const healthLoss = Math.floor(daysPassed * 10); // DECAY_RATE_PER_DAY = 10

        if (healthLoss > 0) {
          const virtualHealth = Math.max(0, rawHealth - healthLoss);
          setHealth(virtualHealth);
        }
      };

      calculateVirtualHealth();
      // Tick every minute to update decay if needed
      const interval = setInterval(calculateVirtualHealth, 60000);
      return () => clearInterval(interval);
    }
  }, [rawHealth, rawXp, lastInteraction, hasPet]);

  return {
    petData,
    hasPet,
    isPending: finalIsPending,
    isConfirming: finalIsConfirming,
    isConfirmed: finalIsConfirmed,
    hash: singleHash,
    writeError,
    receiptError,
    refetch,
    // Actions
    recordSession,
    // USDC buy functions
    buyFoodWithUSDC,
    buySuperFoodWithUSDC,
    buyEnergyDrinkWithUSDC,
    buyShieldWithUSDC,
    revivePetWithUSDC,
    buyCosmeticWithUSDC,
    // NIM buy functions
    buyFoodWithNIM,
    buySuperFoodWithNIM,
    buyEnergyDrinkWithNIM,
    buyShieldWithNIM,
    revivePetWithNIM,
    buyCosmeticWithNIM,
    usdcBalanceRaw,
    setNames,
    deleteUser,
    // UX
    isSigning,
    isProcessing: isSigning || finalIsPending || finalIsConfirming,
    isLoadingPet,
    isPetLoadError,
    xp,
    totalTime,
    health,
    username,
    petName,
    lastAction,
    streak: virtualStreak,
    streakBonus,
    weather,
    // Boosts & Cosmetics
    boostEndTime,
    shieldCount,
    activeCosmetic,
    equippedCosmetics: {
      sunglasses: !!isSunglassesEquipped,
      crown: !!isCrownEquipped,
    },
    toggleCosmetic,
    inventory: {
      sunglasses: !!isSunglassesOwned,
      crown: !!isCrownOwned,
    },
    isNight,
  };
}
