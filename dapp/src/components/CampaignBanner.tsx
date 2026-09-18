"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

interface CampaignBannerProps {
  onJoin: () => void;
}

// ~30,000 NIM (rounded up from ~29,000) = $10 at $0.0003439/NIM (CoinGecko,
// 2026-09-18). NIM's price moves — recompute this if it drifts far from
// that reference so the figure doesn't go stale.
const REWARD_NIM = "30,000";

/**
 * Static announcement banner — no contract change, no tracked leaderboard.
 * "Join" just scrolls to the timer section, same as the floating Start
 * Focus CTA. Slim single-row layout, matching CompetitionBanner's footprint
 * rather than a tall stacked card.
 */
export function CampaignBanner({ onJoin }: CampaignBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-6 rounded-3xl overflow-hidden relative"
    >
      <div className="absolute inset-0 rounded-3xl bg-[#2E7D32]/25 p-px">
        <div className="absolute inset-[1px] rounded-3xl bg-[#0c0c0c]" />
      </div>

      <div className="relative bg-[#0c0c0c] rounded-3xl px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles size={11} className="text-[#66BB6A] shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#66BB6A]">
              Evolution Challenge
            </span>
          </div>
          <p className="text-white text-sm font-bold leading-tight truncate">
            Reach Elder first — share <span className="text-[#66BB6A]">{REWARD_NIM} NIM</span>
          </p>
        </div>
        <button
          onClick={onJoin}
          className="shrink-0 flex items-center gap-1 bg-gradient-to-r from-[#2E7D32] to-[#FF6B4A] text-white px-4 py-2 rounded-full font-black text-xs active:scale-95 transition-transform"
        >
          Join
          <ArrowRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}
