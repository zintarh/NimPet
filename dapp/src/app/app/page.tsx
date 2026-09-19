"use client";
import React from "react";
import Image from "next/image";
import { FocusTimer, type FocusTimerHandle } from "@/components/FocusTimer";
import { PetView } from "@/components/PetView";
import {
  PetStage,
  PetMood,
  getPetStage,
  getNextStageInfo,
  getStageName,
  formatRemaining,
  STAGE_THRESHOLD,
} from "@/utils/pet";
import { Leaderboard } from "@/components/Leaderboard";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFocusling } from "@/hooks/useFocusling";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { CompetitionBanner } from "@/components/CompetitionBanner";

import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatEther } from "viem";
import { SocialShare } from "@/components/SocialShare";
import { BoostsSheet } from "@/components/BoostsSheet";
import dynamic from "next/dynamic";
const OnboardingModal = dynamic(
  () => import("@/components/OnboardingModal").then((m) => m.OnboardingModal),
  { ssr: false },
);
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Loader2,
  Zap,
  FastForward,
} from "lucide-react";
import toast, { Toast } from "react-hot-toast";
import { useAudio } from "@/hooks/useAudio";
import { SoundMenu } from "@/components/SoundMenu";
import { StreakFlame } from "./../../components/StreakFlame";
import { NamingModal } from "@/components/NamingModal";
import { Navbar } from "@/components/Navbar";
import { AppWelcome } from "@/components/AppWelcome";
import { InviteButton } from "@/components/InviteButton";
import { useIsNimiqPay, nimiqPayRequestDeviceIdentifier } from "@/hooks/useNimiqPay";

import { Suspense } from "react";

const TIMERS = {
  FOCUS: 25 * 60,
  SHORT: 5 * 60,
  LONG: 15 * 60,
};

function AppPageContent() {
  const {
    isConnected: wagmiConnected,
    isConnecting,
    isReconnecting,
  } = useAccount();
  const { address } = useAuth();
  const isConnected = wagmiConnected;
  const { data: baseBalance, refetch: refetchBaseBalance } = useBalance({
    address,
    chainId: base.id,
  });
  const currentChainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const isWrongNetwork = isConnected && currentChainId !== base.id;
  const [isGettingGas, setIsGettingGas] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    petData,
    hasPet,
    recordSession,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    refetch,
    writeError,
    receiptError,
    isSigning,
    isProcessing,
    isLoadingPet,
    isPetLoadError,
    setNames,
    xp,
    totalTime,
    health,
    streak,
    streakBonus,
    weather,
    username,
    petName,
    lastAction,
    boostEndTime,
    shieldCount,
    activeCosmetic,
    toggleCosmetic,
    inventory,
    equippedCosmetics,
    isNight,
  } = useFocusling();

  // useIsNimiqPay uses useEffect so it reacts after Nimiq Pay injects its providers
  const isNimiqPayEnv = useIsNimiqPay();

  const { refetch: refetchLeaderboard } = useLeaderboard();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBoostsOpen, setIsBoostsOpen] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const focusTimerRef = useRef<FocusTimerHandle>(null);
  const timerSectionRef = useRef<HTMLDivElement>(null);
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  // Callback ref — wires the IntersectionObserver the moment the sentinel
  // element mounts, regardless of when conditional rendering reveals it.
  const [timerSentinel, setTimerSentinel] = useState<HTMLDivElement | null>(null);
  const [tempUsername, setTempUsername] = useState(username || "");
  const [tempPetName, setTempPetName] = useState(petName || "");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [focusNote, setFocusNote] = useState("");
  const [lastSessionDuration, setLastSessionDuration] = useState(25);
  const [isMobile, setIsMobile] = useState(false);

  const [mood, setMood] = useState<PetMood>("happy");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedHash, setSyncedHash] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [petLoadTimedOut, setPetLoadTimedOut] = useState(false);
  const [connectTimedOut, setConnectTimedOut] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fires whenever timerSentinel mounts/unmounts — correctly handles
  // conditional rendering (hasPet gates the timer section).
  useEffect(() => {
    if (!timerSentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsTimerVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(timerSentinel);
    return () => observer.disconnect();
  }, [timerSentinel]);

  useEffect(() => {
    if (username) setTempUsername(username);
    if (petName) setTempPetName(petName);
  }, [username, petName]);

  // Safety timeout: if connected but contract reads never resolve, force-proceed.
  // isLoadingPet is intentionally NOT in the deps — useReadContracts retries on
  // slow RPCs cause isLoadingPet to oscillate (false→true on each retry), which
  // would reset the timer every time and leave users stuck forever. Instead the
  // timer runs from when isConnected becomes true, regardless of loading state.
  useEffect(() => {
    if (!isConnected) {
      setPetLoadTimedOut(false);
      return;
    }
    const t = setTimeout(() => setPetLoadTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Same safety net for the wallet-connect phase itself — a stuck
  // isConnecting/isReconnecting flag from the injected provider previously
  // had no escape at all, trapping users on the loading screen forever with
  // a "Refresh" button that just reloaded into the same stuck state.
  useEffect(() => {
    if (!isConnecting && !isReconnecting) {
      setConnectTimedOut(false);
      return;
    }
    const t = setTimeout(() => setConnectTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [isConnecting, isReconnecting]);

  const showToast = useCallback(
    (
      title: string,
      message: string,
      type: "success" | "error" | "info" | "achievement" = "success",
      showShare = false,
      shareText = "",
      dismissible = false,
    ) => {
      const label = `${title} — ${message}`;

      if (dismissible) {
        toast.success(
          (t) => (
            <span className="flex items-center justify-between gap-3 w-full">
              <span>{label}</span>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 text-neutral-400 hover:text-white transition-colors leading-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </span>
          ),
          { duration: 8000 },
        );
        return;
      }

      const content = showShare
        ? (t: Toast) => (
          <span className="flex items-center gap-3">
            <span>{label}</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
                  "_blank",
                );
              }}
              className="shrink-0 px-3 py-1 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors"
            >
              Share
            </button>
          </span>
        )
        : label;

      if (type === "error") {
        toast.error(typeof content === "string" ? content : label);
      } else if (type === "info") {
        toast(typeof content === "string" ? content : label, { icon: "ℹ️" });
      } else {
        toast.success(content as any, { duration: 5000 });
      }
    },
    [],
  );

  const { playSound } = useAudio();

  // Onboarding no longer auto-opens — it added an extra forced step between
  // connecting and the "Get pet" screen. It's still reachable manually via
  // the "How does this work?" link.
  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Persisted per-address so the prompt fires at most once ever, not once
  // per mount — username comes from an on-chain read that can lag behind a
  // just-submitted setNames tx by a refetch cycle, and every navigation
  // away from /app and back remounts this component (resetting any
  // in-memory-only "already prompted" flag), which was reopening this
  // modal on every visit until the name write actually confirmed on-chain.
  const namingPromptKey = address ? `focusling-naming-prompted-${address}` : null;

  useEffect(() => {
    if (username) setTempUsername(username);
    if (petName) setTempPetName(petName);

    if (username && namingPromptKey) {
      try { localStorage.setItem(namingPromptKey, "true"); } catch {}
    }

    const alreadyPrompted =
      !!namingPromptKey &&
      (() => {
        try { return localStorage.getItem(namingPromptKey) === "true"; } catch { return false; }
      })();

    // Auto-open naming modal for new adopters (only once, ever, per address)
    if (
      hasPet &&
      !username &&
      !isLoadingPet &&
      !isProcessing &&
      !isSyncing &&
      !hasAutoOpened &&
      !alreadyPrompted
    ) {
      setIsEditModalOpen(true);
      setHasAutoOpened(true);
      if (namingPromptKey) {
        try { localStorage.setItem(namingPromptKey, "true"); } catch {}
      }
    }
  }, [
    username,
    petName,
    hasPet,
    isLoadingPet,
    isProcessing,
    isSyncing,
    hasAutoOpened,
    namingPromptKey,
  ]);

  // No redirect on logout or connection drop — /app handles its own disconnected state.
  // The "Your pet is waiting" screen is the correct destination for returning users.
  // / is only for direct navigation (marketing page for new visitors).

  // Open profile modal when redirected from another page with ?openProfile=true
  useEffect(() => {
    if (searchParams.get("openProfile") === "true") {
      setIsEditModalOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    const syncData = async () => {
      if (isConfirmed && hash && hash !== syncedHash) {
        setIsSyncing(true);
        setSyncedHash(hash);

        try {
          // Parallelize refetching for speed
          await Promise.all([
            refetch(),
            refetchLeaderboard(),
          ]);

          router.refresh();

          // Celebration logic...
          if (lastAction === "focus") {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#6366f1", "#2E7D32", "#EC4899"],
            });
            playSound("success");
            showToast(
              "Focus Recorded! 🏆",
              "Your pet is growing stronger!",
              "achievement",
              true,
              `I just focused ${focusNote ? `on "${focusNote}" ` : ""}for ${lastSessionDuration < 1 ? Math.round(lastSessionDuration * 60) + " seconds" : lastSessionDuration + " minutes"} with NimPet! 🦅 My pet is leveling up on Nimiq Pay. #NimPet #NimiqPay`,
            );
          } else if (lastAction === "shop") {
            showToast(
              "Shop Success! 🛍️",
              "Your items have been delivered and your pet is happy.",
              "success",
              true,
              `I just bought a new item for my @NimPet! 🛍️ My productivity is paying off. #NimPet #NimiqPay`,
            );
            playSound("pop");
          } else if (lastAction === "profile") {
            setIsEditModalOpen(false);
            showToast(
              "Profile Updated! 👤",
              "Your profile has been saved!",
              "info",
            );
          }
        } catch (error) {
          console.error("Sync error:", error);
        } finally {
          setIsSyncing(false);

          // The RPC transport falls back between Alchemy and the public
          // base.org node (src/app/providers.tsx) — they don't always agree
          // on the chain head, so the refetch above can occasionally land on
          // a node that hasn't caught up to the just-confirmed block yet,
          // reading stale pre-transaction data (e.g. still !hasPet right
          // after the hatch tx succeeds). A short delayed re-fetch catches
          // that case without the user needing to retry the action manually.
          setTimeout(() => { refetch(); }, 2500);
        }
      }
    };

    syncData();
  }, [
    isConfirmed,
    hash,
    syncedHash,
    lastAction,
    refetch,
    router,
  ]);

  // Parse BigInt data from contract
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pet = petData as any;
  const stage = getPetStage(pet ? Number(pet[0]) : xp);
  const nextStageInfo = getNextStageInfo(xp);

  // Level Up Ceremony Detection
  const [prevStage, setPrevStage] = useState<PetStage | null>(null);

  useEffect(() => {
    if (pet && !isLoadingPet) {
      const currentStage = getPetStage(Number(pet[0]));
      if (prevStage && prevStage !== currentStage) {
        // LEVEL UP CEREMONY!
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.3 },
          colors: ["#fbbf24", "#f59e0b", "#d97706"], // Gold colors
          shapes: ["star"],
        });
        playSound("success");
      }
      setPrevStage(currentStage);
    }
  }, [xp, isLoadingPet, pet, prevStage]);

  // Close profile modal as soon as the tx is submitted (not waiting for confirmation).
  // The full-screen processing overlay covers the wait from here.
  useEffect(() => {
    if (isPending && lastAction === "profile") {
      setIsEditModalOpen(false);
    }
  }, [isPending, lastAction]);

  const handleSessionComplete = (minutes: number) => {
    setLastSessionDuration(minutes);
    recordSession(minutes, 1.0);
    setMood("happy");
    playSound("click");
  };

  // Rendering logic moved to bottom to comply with Rules of Hooks

  // Account-Based: If they don't have a pet yet (birthTime == 0),
  // we can show a welcome screen, but technically they can just start "Focusing" to get one.
  // For better UX, let's keep the "Adopt" screen but make it a simple "Start Journey" button
  // that maybe triggers a 0-minute session or just explains they can start focusing.
  // OR, since the contract initializes on first action, we can just show the empty egg state.

  // --- Conditional Rendering Blocks ---
  if (!hasMounted) {
    return <AppLoadingScreen />;
  }

  // Don't render anything until we know whether this is Nimiq Pay — avoids a
  // one-frame flash of the connect screen before that context resolves.
  if (isNimiqPayEnv === null) return null;

  // Connecting only ever happens from a tap in AppWelcome — Nimiq Pay's own
  // pre-ship checklist forbids firing the account-access dialog on load
  // without user interaction, so there is no auto-connect to wait on here.
  if (!isConnected) {
    if ((isConnecting || isReconnecting) && !connectTimedOut) {
      return <AppLoadingScreen nimiqPay={isNimiqPayEnv === true} />;
    }
    return <AppWelcome />;
  }

  if (isLoadingPet && !petLoadTimedOut && !isPetLoadError) {
    return <AppLoadingScreen />;
  }

  if (!hasPet) {

    return (
      <div className="min-h-screen w-full bg-black flex flex-col">
        <Navbar minimal />

        <div className="flex-1 flex flex-col items-center justify-center px-5 py-16">
          {/* Egg visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative mb-12 flex items-center justify-center"
          >
            <motion.img
              src="https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778777438/egg_sunny_tqcx2g.png"
              alt="Your egg"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative w-44 h-44 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.08)]"
            />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-10 max-w-xs"
          >
            <h1 className="font-display text-3xl sm:text-4xl text-white mb-3 tracking-tight">
              A companion awaits
            </h1>
            <p className="text-neutral-500 text-base leading-relaxed">
              Start your first focus session to bring your pet to life.
            </p>
            <p className="text-[#66BB6A] text-sm font-medium mt-3">
              Just {formatRemaining(STAGE_THRESHOLD.BABY)} of focus to hatch your egg.
            </p>
          </motion.div>

          {/* Action */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="w-full max-w-sm flex flex-col gap-4"
          >
            {isWrongNetwork ? (
              // Its own dedicated tap, not folded into the flow below — most
              // wallets (MetaMask included) only honor a network-switch
              // request as a direct, uninterrupted user gesture. Burying it
              // after other awaits (device-id lookup, faucet fetch) lets the
              // wallet silently ignore the request, which is what caused the
              // raw "chain mismatch" error even after switchChain resolved.
              <button
                onClick={() => switchChain({ chainId: base.id })}
                disabled={isSwitchingChain}
                className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSwitchingChain ? "Switching to Base…" : "Switch to Base"}
              </button>
            ) : (
            <button
              onClick={async () => {
                if (!baseBalance || baseBalance.value < BigInt(1e13)) {
                  if (!address) return;
                  setIsGettingGas(true);
                  try {
                    const deviceId = await nimiqPayRequestDeviceIdentifier(
                      "Send a small amount of ETH so you can hatch your pet",
                    );
                    if (!deviceId) {
                      toast.error(
                        "Open this app inside Nimiq Pay to get free gas automatically.",
                      );
                      return;
                    }
                    const res = await fetch("/api/faucet", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ address, deviceId }),
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      // "Already has enough ETH" just means our two thresholds
                      // disagree at the margin — not a real block, so proceed.
                      if (res.status !== 400 || !/already has enough/i.test(json.error ?? "")) {
                        toast.error(json.error ?? "Could not get free gas. Try again shortly.");
                        return;
                      }
                    } else {
                      toast.success("Gas received! Hatching your pet…");
                      await refetchBaseBalance();
                    }
                  } catch {
                    toast.error("Could not get free gas. Try again shortly.");
                    return;
                  } finally {
                    setIsGettingGas(false);
                  }
                }
                playSound("hatch");
                await handleSessionComplete(0);
              }}
              disabled={isProcessing || isGettingGas}
              className="w-full py-3.5 rounded-full bg-[#2E7D32] hover:bg-[#256B29] text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGettingGas ? "Getting you set up…" : "Get pet"}
            </button>
            )}

            <button
              onClick={() => setShowOnboarding(true)}
              className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors text-center"
            >
              How does this work?
            </button>
          </motion.div>
        </div>

        {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}

        {/* Hatching overlay */}
        <AnimatePresence>
          {(isProcessing || isSyncing) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-8 p-6"
            >
              {/* Spinner */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <motion.div
                  animate={{ opacity: [0.05, 0.18, 0.05], scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-full bg-white blur-xl"
                />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/40 animate-spin" />
                <div
                  className="absolute inset-3 rounded-full border border-transparent border-b-white/20 animate-spin"
                  style={{
                    animationDuration: "2s",
                    animationDirection: "reverse",
                  }}
                />
                <motion.div
                  animate={{ opacity: [0.2, 0.7, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-white"
                />
              </div>

              <div className="text-center">
                <h2 className="text-white text-2xl font-medium mb-2">
                  Hatching…
                </h2>
                <p className="text-neutral-500 text-sm">
                  {isSigning
                    ? "Getting ready…"
                    : isPending
                      ? "Confirm in your app…"
                      : isConfirming
                        ? "Waking up your companion…"
                        : "Almost there…"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nimiq Pay required footer links */}
        {isNimiqPayEnv && (
          <div className="pb-8 pt-2 flex items-center justify-center gap-3 flex-wrap px-4">
            <a href="/privacy" className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
              Privacy Policy
            </a>
            <span className="text-neutral-800 text-[11px]">·</span>
            <a href="/terms" className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
              Terms & Conditions
            </a>
            <span className="text-neutral-800 text-[11px]">·</span>
            <a href="mailto:salaki1902@gmail.com" className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
              Support
            </a>
          </div>
        )}
      </div>
    );
  }

  const stageLevels: Record<string, number> = {
    egg: 1,
    baby: 2,
    teen: 3,
    adult: 4,
    elder: 5,
  };
  const stageLevel = stageLevels[stage] ?? 1;
  const totalHours = Math.floor(totalTime / 3600);
  const totalMins = Math.floor((totalTime % 3600) / 60);
  const totalSecs = totalTime % 60;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar onOpenProfile={() => setIsEditModalOpen(true)} />

      <main className="px-5 sm:px-8 py-4 pb-32 max-w-lg mx-auto">
        <CompetitionBanner />

        {/* ── Pet hero — centered, vertical ──────────────────────────────── */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full py-2 px-4 text-xs">
              <span className="text-neutral-400">Health</span>
              <span className="text-white tabular-nums font-semibold">{health}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full py-2 px-4 text-xs">
              <span className="text-neutral-400">XP</span>
              <span className="text-white tabular-nums font-semibold">{xp.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-full max-w-[300px] sm:max-w-[340px]">
            <PetView
              stage={stage}
              health={health}
              xp={xp}
              mood={mood}
              nextStageInfo={nextStageInfo}
              streak={streak}
              weather={weather}
              activeCosmetic={activeCosmetic}
              equippedCosmetics={equippedCosmetics}
              focusNote={focusNote}
              isNight={isNight}
            />
          </div>

          <button
            onClick={() => { setIsEditModalOpen(true); playSound("click"); }}
            className="mt-1"
          >
            <h1 className="font-display text-2xl capitalize leading-tight">
              {petName || "Pet Name"}
            </h1>
            <p className="text-neutral-500 text-sm">@{username || "focuser"}</p>
          </button>
        </div>

        {/* ── Streak + level + boosts chips ───────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-6">
          {streak > 0 && (
            <div
              className="w-full rounded-2xl flex items-center justify-center gap-2 py-3 px-5 border border-dashed border-[#7A2E1D] text-white text-sm font-medium"
              style={{
                background: "linear-gradient(90deg, #2A0E08, #B3432B, #2A0E08)",
              }}
            >
              <Image src="/streak-flame.png" width={20} height={20} alt="" />
              <span>{streak} day streak</span>
            </div>
          )}

          <div className="rounded-2xl flex text-sm items-center bg-[#0F0F0F] p-1">
            <div className="py-3 px-5 whitespace-nowrap font-medium">
              Lvl {stageLevel}
            </div>
            <div className="py-3 flex-1 px-5 rounded-2xl gap-x-2 flex items-center bg-[#161616]">
              <span className="text-neutral-400 whitespace-nowrap">{getStageName(stage)}</span>
              <div className="h-[6px] flex-1 bg-[#252525] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2E7D32] rounded-full transition-all duration-700"
                  style={{ width: `${nextStageInfo.progress}%` }}
                />
              </div>
              <span className="tabular-nums">{Math.round(nextStageInfo.progress)}%</span>
            </div>
          </div>
          <p className="text-neutral-500 text-xs px-1 -mt-1">
            {nextStageInfo.nextStage === "none"
              ? "Max evolution reached — legendary status."
              : `${formatRemaining(nextStageInfo.remaining)} of focus to unlock ${getStageName(nextStageInfo.nextStage)}`}
          </p>

        </div>

        {/* ── Focus timer — full-width, the dominant card ─────────────────── */}
        <div className="rounded-3xl overflow-hidden bg-[#0C0C0C]">
          <AnimatePresence initial={false}>
            {!isFocusing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-[#0F0F0F] border-b border-dashed border-neutral-800"
              >
                <div className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-[#A9A9A9] text-xs font-medium mb-0.5">Owner</p>
                    <p className="text-white text-sm font-semibold truncate">
                      {username || "focuser"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#A9A9A9] text-xs font-medium mb-0.5">Total time</p>
                    <p className="text-white text-sm font-mono tracking-wide">
                      {`${totalHours}H ${String(totalMins).padStart(2, "0")}M ${String(totalSecs).padStart(2, "0")}S`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={timerSectionRef} className="p-5 sm:p-8">
            <FocusTimer
              ref={focusTimerRef}
              embedded
              onComplete={(mins) => {
                setIsFocusing(false);
                handleSessionComplete(mins);
              }}
              onFail={() => {
                setIsFocusing(false);
                setMood("sad");
              }}
              onStop={() => {
                setIsFocusing(false);
                setMood("happy");
              }}
              onStart={(note) => {
                setIsFocusing(true);
                setMood("focused");
                toast.dismiss("session-retry");
                if (note) setFocusNote(note);
                if (weather === "rainy" || weather === "stormy") {
                  showToast(
                    "Coming home? ✨",
                    "The clouds are beginning to clear...",
                    "success",
                    false,
                    "",
                    true,
                  );
                }
              }}
              onPause={() => setMood("sleeping")}
              onNoteChange={setFocusNote}
              isSupercharged={false}
              streak={streak}
              isNight={isNight}
              boostEndTime={Number(boostEndTime)}
              shieldCount={shieldCount}
              streakBonus={streakBonus}
            />
            {/* Sentinel lives inside the timer div — guaranteed visible when timer is */}
            <div ref={setTimerSentinel} className="h-px" />
          </div>
        </div>

        {/* Boosts + Invite — below the timer so the timer gets top priority */}
        <div className="flex items-center gap-2 mt-4">
          {(() => {
            const boostActive =
              boostEndTime > Math.floor(Date.now() / 1000) ||
              shieldCount > 0;
            return (
              <button
                onClick={() => setIsBoostsOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium whitespace-nowrap"
                style={
                  boostActive
                    ? {
                      background:
                        "linear-gradient(90deg, #0F3D1A, #2E7D32, #0F3D1A)",
                      color: "#ffffff",
                    }
                    : { background: "#ffffff", color: "#000000" }
                }
              >
                {boostActive ? (
                  <span className="flex items-center gap-2">
                    <FastForward size={14} fill="#A5D6A7" color="#A5D6A7" />
                    Boosts
                  </span>
                ) : (
                  "Boosts"
                )}
              </button>
            );
          })()}

          <InviteButton className="flex-1 justify-center" />
        </div>

        {/* Nimiq Pay required footer links */}
        {isNimiqPayEnv && (
          <div className="pt-6 pb-10 flex items-center justify-center gap-3 flex-wrap px-4">
            <a href="/privacy" className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
              Privacy Policy
            </a>
            <span className="text-neutral-800 text-[11px]">·</span>
            <a href="/terms" className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
              Terms & Conditions
            </a>
            <span className="text-neutral-800 text-[11px]">·</span>
            <a href="mailto:salaki1902@gmail.com" className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
              Support
            </a>
          </div>
        )}
      </main>

      {/* Sticky CTA — Nimiq Pay + mobile. Scrolls user to the timer section.
          Disappears once the timer is in view or a session is running.
          Sits above the bottom tab bar (which is z-50 and also pinned to
          the bottom edge) — this was previously z-40 at bottom-0, so the
          nav bar rendered on top and hid it entirely. */}
      <AnimatePresence>
        {(isNimiqPayEnv || isMobile) && !isFocusing && !isTimerVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="fixed bottom-24 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <button
              onClick={() => {
                timerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                if (stage === "egg") {
                  toast("Focus for just 5 minutes to hatch your egg!", { icon: "🥚" });
                }
              }}
              className="px-14 py-3 rounded-full bg-[#2E7D32] text-white font-bold text-base pointer-events-auto"
              style={{ boxShadow: "0 0 28px 6px rgba(46,125,50,0.35)" }}
            >
              Start focus
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}

      <BoostsSheet
        isOpen={isBoostsOpen}
        onClose={() => setIsBoostsOpen(false)}
        boostEndTime={boostEndTime}
        shieldCount={shieldCount}
      />

      <NamingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(u, p) => setNames(u, p)}
        initialUsername={tempUsername}
        initialPetName={tempPetName}
        isPending={isPending}
      />

      {/* Full-screen processing overlay */}
      <AnimatePresence>
        {(isProcessing || isSyncing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-5 p-4"
          >
            {/* Pulsing ring */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-white"
              />
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0, 0.25] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3,
                }}
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
              <h2 className="text-white text-lg font-semibold mb-1">
                {isSyncing ? "Saving progress…" : "Processing…"}
              </h2>
              <p className="text-neutral-500 text-sm">
                {isSigning
                  ? "Getting ready…"
                  : isSyncing
                    ? "Saving…"
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
    </div>
  );
}

function AppLoadingScreen({ nimiqPay = false }: { nimiqPay?: boolean }) {
  const [slow, setSlow] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      {/* Spinner ring */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-white blur-xl opacity-10 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30 animate-spin" />
      </div>

      <div className="text-center">
        <p className="text-white text-sm font-medium">
          {nimiqPay ? "Loading…" : "Loading your pet…"}
        </p>
        {!nimiqPay && (
          <p className="text-neutral-600 text-xs mt-1">Almost ready…</p>
        )}
      </div>

      {slow && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-neutral-600 text-xs">
            {nimiqPay
              ? "Connection is slow"
              : "Taking longer than usual"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-medium text-neutral-400 hover:text-white uppercase tracking-widest transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-white/30 animate-spin" />
        </div>
      }
    >
      <AppPageContent />
    </Suspense>
  );
}
