"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useDisconnect,
} from "wagmi";
import { base } from "wagmi/chains";
import { X, LogOut, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useFocusling } from "@/hooks/useFocusling";
import { useIsNimiqPay, nimiqPayGetAddress, nimiqPayGetBalance } from "@/hooks/useNimiqPay";

interface NimiqPayAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export function NimiqPayAccountModal({ isOpen, onClose, onOpenProfile }: NimiqPayAccountModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const isWrongNetwork = !!address && chainId !== base.id;
  const isNimiqPayEnv = useIsNimiqPay();

  // Same proven multicall-backed value the shop uses, instead of a second,
  // independent useBalance query that was apparently not resolving here.
  const { usdcBalanceRaw } = useFocusling();
  const usdcFormatted = (Number(usdcBalanceRaw) / 1e6).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const [displayCurrency, setDisplayCurrency] = useState<"NIM" | "USDC">("NIM");
  const [nimAddress, setNimAddress] = useState<string | null>(null);
  const [nimBalance, setNimBalance] = useState<string | null>(null);
  const [isFetchingNim, setIsFetchingNim] = useState(false);

  useEffect(() => {
    if (isNimiqPayEnv === false) setDisplayCurrency("USDC");
  }, [isNimiqPayEnv]);

  // Shares the same cached address key as the shop page — one confirmation
  // dialog covers both, not one each.
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
    setDisplayCurrency("NIM");
    setIsFetchingNim(true);
    try {
      let addr = nimAddress;
      if (!addr) {
        addr = await nimiqPayGetAddress();
        if (addr) {
          setNimAddress(addr);
          try { localStorage.setItem("nimiq-address", addr); } catch {}
        }
      }
      if (addr) setNimBalance(await nimiqPayGetBalance(addr));
    } finally {
      setIsFetchingNim(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#111111] border-t border-neutral-800 rounded-t-[32px] shadow-2xl overflow-hidden pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <Image
                  src="/focus-egg-v2.png"
                  width={28}
                  height={28}
                  alt="NimPet"
                  className="rounded-full border border-neutral-800"
                />
                <span className="font-bold text-white">My Wallet</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-neutral-800 transition-colors"
              >
                <X size={18} className="text-neutral-400" />
              </button>
            </div>

            <div className="px-6 pb-10 space-y-3">
              {/* Wallet address — display only, no copy */}
              <div className="w-full flex items-center p-3 rounded-2xl border border-neutral-800 bg-[#1a1a1a]">
                <div>
                  <div className="text-xs text-neutral-500 uppercase tracking-widest mb-0.5">
                    Wallet Address
                  </div>
                  <div className="font-medium text-white font-mono text-sm">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}
                  </div>
                </div>
              </div>

              {/* Wrong-network fallback — NetworkGuard auto-switches on connect,
                  this covers wallets that reject a silent switch request. */}
              {isWrongNetwork && (
                <button
                  onClick={() => switchChain({ chainId: base.id })}
                  disabled={isSwitching}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-left disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-amber-400">
                    Wrong network — tap to switch to Base
                  </span>
                  <span className="text-xs text-amber-500 font-semibold">
                    {isSwitching ? "Switching…" : "Switch"}
                  </span>
                </button>
              )}

              {/* Balance card — toggle between NIM and USDC on Base */}
              <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-800/30">
                {isNimiqPayEnv && (
                  <div className="inline-flex bg-[#111111] border border-neutral-800 rounded-full p-1 mb-3">
                    {(["NIM", "USDC"] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => (c === "NIM" ? handleSelectNim() : setDisplayCurrency("USDC"))}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                          displayCurrency === c
                            ? "bg-[#2E7D32] text-white"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        {c === "NIM" ? "NIM" : "USDC on Base"}
                      </button>
                    ))}
                  </div>
                )}
                {!isNimiqPayEnv && (
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    USDC on Base
                  </span>
                )}
                <div className="font-bold text-2xl text-white mt-2">
                  {displayCurrency === "NIM"
                    ? isFetchingNim
                      ? "…"
                      : nimBalance !== null
                        ? `${nimBalance} NIM`
                        : "— NIM"
                    : `${usdcFormatted} USDC`}
                </div>
              </div>

              {onOpenProfile && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors text-sm font-medium"
                >
                  <UserRound size={15} />
                  Edit Profile
                </button>
              )}

              <button
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors text-sm font-medium"
              >
                <LogOut size={15} />
                Disconnect Wallet
              </button>

              <p className="text-center text-[10px] font-bold text-neutral-700 uppercase tracking-widest pt-1">
                Powered by Nimiq Pay · Base
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
