"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Coins,
  ArrowRight,
  Heart,
  ShoppingBag,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CampaignBanner } from "@/components/CampaignBanner";

const sections = [
  {
    id: "core",
    nav: "The core loop",
    title: "Focus. Earn. Evolve.",
    description:
      "NimPet turns your deep work into a living creature. Complete focus sessions to hatch your egg, earn XP, and evolve your pet from a baby all the way to an Elder.",
    stats: [
      { icon: Zap, label: "10 min minimum to earn XP" },
      { icon: Coins, label: "Earn rewards for every session" },
      { icon: ArrowRight, label: "5 evolution stages to unlock" },
    ],
  },
  {
    id: "consistent",
    nav: "Stay consistent",
    title: "Your Pet Can Die",
    description:
      "Health decays every day you don't focus. Hit 0% and your pet dies — you'll need to buy items to revive it. Stay consistent or keep it fed to stay alive.",
    stats: [
      { icon: Heart, label: "Health drops daily without sessions" },
      { icon: ShoppingBag, label: "Buy Food from the Shop to heal" },
      { icon: ShieldCheck, label: "Shields block decay for 24h" },
    ],
  },
  {
    id: "boosts",
    nav: "Max your gains",
    title: "Boosts & Streaks",
    description:
      "Keep a daily streak going for bonus XP, and grab an Energy Drink from the Shop for a 24-hour 2x XP boost. Streak Shields protect your streak if you miss a day.",
    stats: [
      { icon: Zap, label: "Up to 2.0x XP with an active boost" },
      { icon: ArrowRight, label: "+5% XP per streak day, up to 20%" },
      { icon: ShieldCheck, label: "Shields cover one missed day" },
    ],
  },
  {
    id: "compete",
    nav: "Compete globally",
    title: "Climb the Leaderboard",
    description:
      "Every session earns XP that pushes you up the global leaderboard. Compete with Focusers worldwide — your rank, streak, and pet stage are all visible to everyone.",
    stats: [
      { icon: Trophy, label: "Live rankings updated in real-time" },
      { icon: Zap, label: "Streaks shown on your public profile" },
      { icon: Heart, label: "One pet per wallet, growing forever" },
    ],
  },
];

export default function GuidePage() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const section = sections[active];

  return (
    <div className="min-h-screen bg-black">
      <Navbar onOpenProfile={() => router.push("/app?openProfile=true")} />

      <main className="px-5 sm:px-8 py-4 pb-32 max-w-lg mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl uppercase mb-6">
          Guide
        </h1>

        <CampaignBanner onJoin={() => router.push("/app")} />

        <div className="flex flex-col gap-6">
          {/* Horizontal scrolling tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 ${
                  active === i
                    ? "bg-[#2E7D32] text-white"
                    : "bg-[#1a1a1a] text-neutral-400"
                }`}
              >
                {s.nav}
              </button>
            ))}
          </div>

          {/* Content card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-8"
            >
              <div>
                <h2 className="text-white text-xl font-semibold mb-3 leading-tight">
                  {section.title}
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {section.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {section.stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-[#2E7D32]/15 flex items-center justify-center">
                        <Icon size={18} className="text-[#66BB6A]" />
                      </div>
                      <p className="text-neutral-400 text-[11px] text-center leading-snug">
                        {stat.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
