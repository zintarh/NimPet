"use client";

import { useState, useEffect } from "react";
import { useFocusling } from "@/hooks/useFocusling";
import { useAuth } from "@/hooks/useAuth";
import { useIsNimiqPay, nimiqPayGetAddress, nimiqPayGetBalance } from "@/hooks/useNimiqPay";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";

// ── Launch discount ────────────────────────────────────────────────────────────
const LAUNCH_END_MS   = new Date("2026-06-26T22:00:00Z").getTime();
const DISCOUNT_FACTOR = 70n; // 70% of original = 30% off

function applyDiscount(price: bigint): bigint {
  return (price * DISCOUNT_FACTOR) / 100n;
}
function fmtUsdc(raw: bigint): string {
  return `$${(Number(raw) / 1e6).toFixed(2)}`;
}
function getCountdown(now: number): { days: number; hours: number } {
  const ms = Math.max(0, LAUNCH_END_MS - now);
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}
// ──────────────────────────────────────────────────────────────────────────────

type Category = "consumables" | "boosts" | "cosmetics";

interface ShopItem {
  id: string;
  name: string;
  image?: string;
  usdcPrice: bigint;        // full original price — used for approval
  displayPrice: bigint;     // what user actually pays (discounted when active)
  usdcDisplay: string;      // formatted display price
  originalDisplay?: string; // crossed-out original, shown during discount
  tag: string;
  action: () => void;
  disabled: boolean;
  disabledLabel?: string;
  owned?: boolean;
  equipped?: boolean;
  nimPriceLuna: number;     // flat NIM price (no launch discount applied)
  nimAction: () => void;
}

export default function ShopPage() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const [now, setNow] = useState(Date.now());

  const {
    health,
    isPending,
    isConfirming,
    isSigning,
    isProcessing,
    toggleCosmetic,
    inventory,
    boostEndTime,
    shieldCount,
    equippedCosmetics,
    buyFoodWithUSDC,
    buySuperFoodWithUSDC,
    buyEnergyDrinkWithUSDC,
    buyShieldWithUSDC,
    buyCosmeticWithUSDC,
    revivePetWithUSDC,
    usdcBalanceRaw,
    buyFoodWithNIM,
    buySuperFoodWithNIM,
    buyEnergyDrinkWithNIM,
    buyShieldWithNIM,
    buyCosmeticWithNIM,
    revivePetWithNIM,
  } = useFocusling();
  const isNimiqPayEnv = useIsNimiqPay();

  // NIM is the default/leading currency; forced to USDC outside Nimiq Pay
  // since NIM payments only work through the injected Nimiq provider.
  const [payCurrency, setPayCurrency] = useState<"NIM" | "USDC">("NIM");

  useEffect(() => {
    if (isNimiqPayEnv === false) setPayCurrency("USDC");
  }, [isNimiqPayEnv]);

  // Nimiq address is revealed once via an explicit tap (listAccounts()
  // triggers a native confirmation dialog) and cached locally — the app
  // never asks for it silently on load. Balance is then a plain RPC read
  // with no further prompts, refreshed each time the NIM tab is selected.
  const [nimAddress, setNimAddress] = useState<string | null>(null);
  const [nimBalance, setNimBalance] = useState<string | null>(null);
  const [isFetchingNim, setIsFetchingNim] = useState(false);

  useEffect(() => {
    let cached: string | null = null;
    try {
      cached = localStorage.getItem("nimiq-address");
    } catch {}
    if (cached) {
      setNimAddress(cached);
      nimiqPayGetBalance(cached).then(setNimBalance);
    }
  }, []);

  const handleSelectNim = async () => {
    setPayCurrency("NIM");
    setIsFetchingNim(true);
    try {
      let address = nimAddress;
      if (!address) {
        address = await nimiqPayGetAddress();
        if (address) {
          setNimAddress(address);
          try { localStorage.setItem("nimiq-address", address); } catch {}
        }
      }
      if (address) {
        setNimBalance(await nimiqPayGetBalance(address));
      }
    } finally {
      setIsFetchingNim(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!isReady) return null;
  if (!isAuthenticated) {
    router.replace("/");
    return null;
  }

  const launchActive = now < LAUNCH_END_MS;
  const countdown    = getCountdown(now);
  const displayPrice = (orig: bigint) => launchActive ? applyDiscount(orig) : orig;

  const isBoostActive = boostEndTime * 1000 > Date.now();
  const usdcBalanceFormatted = (Number(usdcBalanceRaw) / 1e6).toFixed(2);

  // Affordability checked against what the contract will actually charge (display price)
  const canAffordUSDC = (price: bigint) => usdcBalanceRaw >= price;

  // Original prices (used for approval — must be >= discounted charge)
  const ORIG_FOOD       = BigInt(100_000);
  const ORIG_SUPER_FOOD = BigInt(250_000);
  const ORIG_ENERGY     = BigInt(200_000);
  const ORIG_SHIELD     = BigInt(500_000);
  const ORIG_SHADES     = BigInt(500_000);
  const ORIG_CROWN      = BigInt(5_000_000);
  const ORIG_REVIVE     = BigInt(250_000);

  const items: Record<Category, ShopItem[]> = {
    consumables: [
      {
        id: "apple",
        name: "Cyber Apple",
        image: "https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778748/cyber-apple_rn3ksq.png",
        usdcPrice: ORIG_FOOD,
        displayPrice: displayPrice(ORIG_FOOD),
        usdcDisplay: fmtUsdc(displayPrice(ORIG_FOOD)),
        originalDisplay: launchActive ? fmtUsdc(ORIG_FOOD) : undefined,
        tag: "+20 Health",
        action: () => buyFoodWithUSDC(),
        disabled: health >= 100,
        disabledLabel: health >= 100 ? "Health Full" : undefined,
        nimPriceLuna: 500_000, // 5 NIM
        nimAction: () => buyFoodWithNIM(),
      },
      {
        id: "golden_apple",
        name: "Golden Apple",
        image: "https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778750/golden-apple_a1ra1b.png",
        usdcPrice: ORIG_SUPER_FOOD,
        displayPrice: displayPrice(ORIG_SUPER_FOOD),
        usdcDisplay: fmtUsdc(displayPrice(ORIG_SUPER_FOOD)),
        originalDisplay: launchActive ? fmtUsdc(ORIG_SUPER_FOOD) : undefined,
        tag: "Max Health",
        action: () => buySuperFoodWithUSDC(),
        disabled: health >= 100,
        disabledLabel: health >= 100 ? "Health Full" : undefined,
        // Must match PRICE_SUPER_FOOD_NIM in useFocusling.tsx — this is
        // display-only, the actual charge comes from that constant.
        nimPriceLuna: 500_000, // 5 NIM
        nimAction: () => buySuperFoodWithNIM(),
      },
    ],
    boosts: [
      {
        id: "energy_drink",
        name: "Energy Drink",
        image: "https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778743/energy-drink_hzoqsb.png",
        usdcPrice: ORIG_ENERGY,
        displayPrice: displayPrice(ORIG_ENERGY),
        usdcDisplay: fmtUsdc(displayPrice(ORIG_ENERGY)),
        originalDisplay: launchActive ? fmtUsdc(ORIG_ENERGY) : undefined,
        tag: "2x XP (24h)",
        action: () => buyEnergyDrinkWithUSDC(),
        disabled: isBoostActive,
        disabledLabel: isBoostActive ? "Boost Active" : undefined,
        // Must match PRICE_ENERGY_DRINK_NIM in useFocusling.tsx — this is
        // display-only, the actual charge comes from that constant.
        nimPriceLuna: 500_000, // 5 NIM
        nimAction: () => buyEnergyDrinkWithNIM(),
      },
      {
        id: "shield",
        name: "Streak Shield",
        image: "https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778745/streak-shield_kepght.png",
        usdcPrice: ORIG_SHIELD,
        displayPrice: displayPrice(ORIG_SHIELD),
        usdcDisplay: fmtUsdc(displayPrice(ORIG_SHIELD)),
        originalDisplay: launchActive ? fmtUsdc(ORIG_SHIELD) : undefined,
        tag: "Streak Protection",
        action: () => buyShieldWithUSDC(),
        disabled: shieldCount > 0,
        disabledLabel: shieldCount > 0 ? "Shield Active" : undefined,
        nimPriceLuna: 2_500_000, // 25 NIM
        nimAction: () => buyShieldWithNIM(),
      },
      {
        id: "revive",
        name: "Full Revive",
        image: "https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778745/streak-shield_kepght.png",
        usdcPrice: ORIG_REVIVE,
        displayPrice: displayPrice(ORIG_REVIVE),
        usdcDisplay: fmtUsdc(displayPrice(ORIG_REVIVE)),
        originalDisplay: launchActive ? fmtUsdc(ORIG_REVIVE) : undefined,
        tag: "Brings a dead pet back to life",
        action: () => revivePetWithUSDC(),
        disabled: false,
        // TEMPORARY DEMO PRICE — deliberately steep so reviving a dead pet
        // costs something real. Revert to 1_200_000 (12 NIM) before submission.
        nimPriceLuna: 100_000_000, // 1000 NIM
        nimAction: () => revivePetWithNIM(),
      },
    ],
    cosmetics: [
      {
        id: "sunglasses",
        name: "Cool Shades",
        image: "https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778747/cool-shades_txvqei.png",
        usdcPrice: ORIG_SHADES,
        displayPrice: displayPrice(ORIG_SHADES),
        usdcDisplay: fmtUsdc(displayPrice(ORIG_SHADES)),
        originalDisplay: launchActive ? fmtUsdc(ORIG_SHADES) : undefined,
        tag: "Cosmetic",
        action: inventory?.sunglasses
          ? () => toggleCosmetic("sunglasses")
          : () => buyCosmeticWithUSDC("sunglasses", ORIG_SHADES),
        disabled: false,
        owned: inventory?.sunglasses,
        equipped: equippedCosmetics?.sunglasses,
        // TEMPORARY DEMO PRICE — was 2_500_000 (25 NIM). Revert before submission.
        nimPriceLuna: 1_000_000, // 10 NIM
        nimAction: () => buyCosmeticWithNIM("sunglasses", 1_000_000),
      },
      {
        id: "crown",
        name: "Royal Crown",
        image: "https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778752/crown_xs1nxk.png",
        usdcPrice: ORIG_CROWN,
        displayPrice: displayPrice(ORIG_CROWN),
        usdcDisplay: fmtUsdc(displayPrice(ORIG_CROWN)),
        originalDisplay: launchActive ? fmtUsdc(ORIG_CROWN) : undefined,
        tag: "Legendary",
        action: inventory?.crown
          ? () => toggleCosmetic("crown")
          : () => buyCosmeticWithUSDC("crown", ORIG_CROWN),
        disabled: false,
        owned: inventory?.crown,
        equipped: equippedCosmetics?.crown,
        // TEMPORARY DEMO PRICE — was 25_000_000 (250 NIM). Revert before submission.
        nimPriceLuna: 500_000, // 5 NIM
        nimAction: () => buyCosmeticWithNIM("crown", 500_000),
      },
    ],
  };

  const CATEGORIES: Category[] = ["consumables", "boosts", "cosmetics"];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar onOpenProfile={() => router.push("/app?openProfile=true")} />

      {/* Full-screen processing overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-5 p-4"
          >
            <div className="relative w-20 h-20 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-white"
              />
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-white"
              />
              <div className="w-14 h-14 rounded-full border border-neutral-800 bg-[#111111] flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 rounded-full border-2 border-transparent border-t-white"
                />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-white text-lg font-semibold mb-1">Processing…</h2>
              <p className="text-neutral-500 text-sm">
                {isSigning
                  ? "Getting ready…"
                  : isPending
                    ? "Confirm in your app…"
                    : isConfirming
                      ? "Saving…"
                      : "Almost there…"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 sm:px-8 py-4 pb-32 max-w-lg mx-auto">

        {/* Launch discount banner */}
        <AnimatePresence>
          {launchActive && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="mb-6 rounded-2xl overflow-hidden border border-[#FF6B4A]/20 bg-[#150C0A]"
            >
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#FF6B4A]/10 border border-[#FF6B4A]/20">
                    <span className="text-sm">🚀</span>
                  </div>
                  <div>
                    <p className="text-[#FF6B4A] font-black text-sm leading-tight">
                      30% off — Launch Week
                    </p>
                    <p className="text-neutral-500 text-xs font-medium mt-0.5">
                      Discounted prices applied automatically. Ends June 26.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[#FF6B4A] font-black text-sm tabular-nums">
                    {countdown.days}d {countdown.hours}h
                  </p>
                  <p className="text-neutral-600 text-[10px] font-medium uppercase tracking-widest">
                    remaining
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h1 className="text-3xl sm:text-[40px] font-medium tracking-tight">Pet Shop</h1>
        </div>

        {isNimiqPayEnv && (
          <div className="inline-flex bg-[#111111] border border-neutral-800 rounded-full p-1 mb-3">
            {(["NIM", "USDC"] as const).map((c) => (
              <button
                key={c}
                onClick={() => (c === "NIM" ? handleSelectNim() : setPayCurrency("USDC"))}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  payCurrency === c
                    ? "bg-[#2E7D32] text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {c === "NIM" ? "NIM" : "USDC on Base"}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm mb-8 text-neutral-500 min-h-[1.25em]">
          {payCurrency === "NIM"
            ? isFetchingNim
              ? "Checking your NIM balance…"
              : nimBalance !== null
                ? `Paying with NIM — Balance: ${nimBalance} NIM`
                : "" /* couldn't load — leave blank rather than show an error */
            : `Paying with USDC on Base — Balance: ${usdcBalanceFormatted} USDC`}
        </p>

        {/* Active effects */}
        {(isBoostActive || shieldCount > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {isBoostActive && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-neutral-800 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-medium">2x XP Boost Active</span>
              </div>
            )}
            {shieldCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-neutral-800 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="text-white text-xs font-medium">{shieldCount}x Shield Active</span>
              </div>
            )}
          </div>
        )}

        {/* Category rows — each category scrolls horizontally instead of a tab switch */}
        <div className="flex flex-col gap-8">
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-3">
                {cat}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
                {items[cat].map((item) => {
                  const affordable = canAffordUSDC(item.displayPrice);
                  const blocked = isPending || item.disabled || (!item.owned && !affordable);
                  const isCosmeticItem = cat === "cosmetics";

                  return (
                    <div
                      key={item.id}
                      className={`snap-start shrink-0 w-[220px] flex flex-col bg-[#111111] border rounded-2xl overflow-hidden transition-colors ${
                        launchActive ? "border-[#FF6B4A]/15" : "border-neutral-800"
                      } ${!blocked ? "hover:border-neutral-600" : "opacity-50"}`}
                    >
                      {/* Discount badge */}
                      {launchActive && !item.owned && (
                        <div className="flex justify-end px-3 pt-3">
                          <span className="text-[10px] font-black text-[#FF6B4A] bg-[#FF6B4A]/10 border border-[#FF6B4A]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            −30%
                          </span>
                        </div>
                      )}

                      {/* Image */}
                      <div className="relative w-full aspect-square bg-[#111111] flex items-center justify-center overflow-hidden">
                        {item.image && (
                          <div className="w-full h-full flex items-center justify-center p-6">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="max-w-full max-h-full object-contain drop-shadow-2xl"
                            />
                          </div>
                        )}
                        {item.disabledLabel && (
                          <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-1 bg-black/60 border border-neutral-700 rounded-full text-neutral-400">
                            {item.disabledLabel}
                          </span>
                        )}
                      </div>

                      {/* Name + tag */}
                      <div className="px-3.5 pt-3 pb-1">
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        <p className="text-neutral-500 text-[11px] mt-0.5">
                          {item.owned && isCosmeticItem
                            ? item.equipped ? "Equipped" : "Owned"
                            : item.tag}
                        </p>
                      </div>

                      {/* Owned cosmetic — single equip/remove toggle, no payment choice */}
                      {item.owned && isCosmeticItem ? (
                        <div className="px-3.5 pb-3.5">
                          <p className="text-neutral-600 text-xs mb-2">Owned</p>
                          <button
                            onClick={item.action}
                            disabled={blocked}
                            className={`w-full py-2 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed ${
                              item.equipped
                                ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
                                : "bg-[#2E7D32] text-white hover:bg-[#256B29]"
                            }`}
                          >
                            {item.equipped ? "Remove" : "Equip"}
                          </button>
                        </div>
                      ) : (
                        /* Single button matching the page-level currency toggle */
                        <div className="px-3.5 pb-3.5">
                          <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-1.5">
                            Pay with
                          </p>
                          {payCurrency === "NIM" && isNimiqPayEnv ? (
                            <button
                              onClick={item.nimAction}
                              disabled={isPending || isSigning || item.disabled}
                              className="w-full flex flex-col items-center py-2 rounded-xl text-xs font-semibold bg-[#2E7D32] text-white hover:bg-[#256B29] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span>{(item.nimPriceLuna / 1e5).toString()} NIM</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={item.action}
                                disabled={blocked}
                                className={`w-full flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed ${
                                  blocked
                                    ? "bg-neutral-800 text-neutral-600"
                                    : "bg-transparent border border-[#2E7D32] text-[#66BB6A] hover:bg-[#2E7D32]/10"
                                }`}
                              >
                                <span>
                                  {isPending
                                    ? "…"
                                    : !item.owned && !affordable && !item.disabled
                                      ? "Insufficient USDC"
                                      : `${item.usdcDisplay} USDC`}
                                </span>
                              </button>
                              {item.originalDisplay && (
                                <p className="text-neutral-600 text-[10px] line-through tabular-nums mt-1 text-center">
                                  {item.originalDisplay} USDC
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
