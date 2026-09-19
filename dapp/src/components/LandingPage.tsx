"use client";

import { ArrowRight, Zap, Trophy, Coins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "/app";

const STATS = [
  { value: "5", label: "Stages" },
  { value: "Base", label: "Network" },
  { value: "NIM + USDC", label: "Shop" },
];

const MILESTONES = ["5min", "1hr", "5hrs", "20hrs"];

const FEATURES = [
  {
    icon: <Zap size={18} className="text-[#66BB6A]" />,
    title: "Focus Sessions",
    desc: "Pick 5, 10, 25, or 45 minutes, or set your own. Every completed session feeds your pet, earns XP, and moves you up the board.",
  },
  {
    icon: <Coins size={18} className="text-[#66BB6A]" />,
    title: "Shop with NIM or USDC",
    desc: "Feed, boost, and dress up your pet using NIM or USDC, both paid straight from your Nimiq Pay wallet.",
  },
  {
    icon: <Trophy size={18} className="text-[#66BB6A]" />,
    title: "Compete Globally",
    desc: "Your pet's evolution is public proof of your discipline. Climb the leaderboard against focusers worldwide.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Sign in",
    desc: "Sign in with Nimiq Pay. No extra steps needed.",
  },
  {
    num: "02",
    title: "Start a session",
    desc: "Pick a task, choose your duration, and commit. No multitasking. Your pet is watching.",
  },
  {
    num: "03",
    title: "Watch it grow",
    desc: "Each session earns XP. Keep showing up and your egg hatches, evolves, and eventually becomes a legend.",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function GetStartedButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href={APP_URL}
      className={`group inline-flex items-center gap-2 pl-7 pr-2 py-2 rounded-full bg-[#2E7D32] text-white font-semibold text-sm hover:bg-[#256B29] transition-colors ${className}`}
    >
      Get Started
      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-black/25 text-white group-hover:translate-x-0.5 transition-transform">
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex justify-center items-center py-6"
      >
        <span className="text-lg font-display uppercase tracking-wide">NimPet</span>
      </motion.div>

      {/* ── Hero — centered, pet-first ─────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-5 pt-6 pb-16 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-6 w-full flex justify-center"
        >
          <div className="absolute inset-0 bg-[#2E7D32]/20 blur-[80px] rounded-full" />
          <Image
            src="/hero-pets-v2.png"
            width={800}
            height={600}
            alt=""
            priority
            className="relative w-full max-w-[280px] sm:max-w-xs h-auto"
            style={{ width: "auto", height: "auto" }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
          className="font-display text-5xl sm:text-6xl uppercase leading-[0.95] mb-4"
        >
          NimPet
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
          className="text-neutral-400 text-base sm:text-lg leading-relaxed max-w-sm mb-8"
        >
          NimPet rewards every completed session with XP. The more you focus, the more your pet evolves. All on Base, inside Nimiq Pay.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
        >
          <GetStartedButton />
        </motion.div>

        {/* Stat strip — plain, divider-separated, no chip clutter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.45 }}
          className="flex items-stretch divide-x divide-white/10 mt-12"
        >
          {STATS.map((s) => (
            <div key={s.label} className="px-6 text-center">
              <p className="font-display text-lg leading-none">{s.value}</p>
              <p className="text-neutral-500 text-[11px] uppercase tracking-widest mt-1.5">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Milestones — connected timeline, not another row of boxes ──── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={stagger}
        className="px-5 py-14 border-t border-white/10"
      >
        <motion.p
          variants={fadeUp}
          className="text-center text-neutral-500 text-xs uppercase tracking-widest mb-9"
        >
          Evolution milestones
        </motion.p>
        <div className="relative max-w-sm mx-auto px-2">
          <div className="absolute left-2 right-2 top-[5px] h-px bg-white/10" />
          <div className="relative flex justify-between">
            {MILESTONES.map((m) => (
              <motion.div key={m} variants={fadeUp} className="flex flex-col items-center gap-3">
                <span className="w-[9px] h-[9px] rounded-full bg-[#66BB6A] ring-4 ring-black" />
                <span className="font-display text-sm text-neutral-300">{m}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className="px-5 py-12 border-t border-white/10 max-w-lg mx-auto"
      >
        <div className="flex flex-col gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="flex gap-4 bg-[#0F0F0F] border border-white/10 rounded-2xl p-5"
            >
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#2E7D32]/15 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <h2 className="font-display text-base mb-1.5">{f.title}</h2>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className="px-5 py-12 border-t border-white/10 max-w-lg mx-auto"
      >
        <motion.h2
          variants={fadeUp}
          className="font-display text-2xl sm:text-3xl uppercase mb-8 text-center"
        >
          Three steps to your first XP
        </motion.h2>
        <div className="flex flex-col gap-6">
          {STEPS.map((s) => (
            <motion.div key={s.num} variants={fadeUp} className="flex items-start gap-4">
              <span className="shrink-0 w-10 h-10 rounded-full bg-[#2E7D32]/15 border border-[#2E7D32]/30 text-[#66BB6A] font-display text-sm flex items-center justify-center">
                {s.num}
              </span>
              <div>
                <p className="text-white font-semibold mb-1">{s.title}</p>
                <p className="text-neutral-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={stagger}
        className="px-5 py-16 border-t border-white/10 flex flex-col items-center text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="font-display text-3xl sm:text-4xl uppercase leading-tight mb-4 max-w-sm"
        >
          Your pet is waiting to hatch
        </motion.h2>
        <motion.p variants={fadeUp} className="text-neutral-400 text-base mb-8 max-w-sm">
          Every minute you focus, your egg is growing. What are you waiting for?
        </motion.p>
        <motion.div variants={fadeUp}>
          <GetStartedButton />
        </motion.div>
      </motion.section>

      <footer className="px-5 py-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-lg mx-auto">
        <p className="text-sm text-neutral-500">© {new Date().getFullYear()} NimPet</p>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="text-sm text-neutral-500 hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-sm text-neutral-500 hover:text-white transition-colors">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
