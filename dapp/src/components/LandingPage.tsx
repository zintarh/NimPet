import { ArrowRight, Zap, Trophy, Coins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "/app";

const STATS = [
  { value: "5", label: "Evolution Stages" },
  { value: "Base", label: "Network" },
  { value: "NIM + USDC", label: "Shop Currency" },
  { value: "Nimiq Pay", label: "Mini App" },
];

const FEATURES = [
  {
    icon: <Zap size={18} className="text-[#66BB6A]" />,
    title: "Focus Sessions",
    desc: "Pick 5, 10, 25, or 45 minutes — or set your own. Every completed session feeds your pet, earns XP, and moves you up the board.",
  },
  {
    icon: <Coins size={18} className="text-[#66BB6A]" />,
    title: "Shop with NIM or USDC",
    desc: "Feed, boost, and dress up your pet using NIM or USDC — both pay straight from your Nimiq Pay wallet, your choice.",
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
    desc: "Sign in with Nimiq Pay — no extra steps needed.",
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
      <div className="flex justify-center items-center py-6">
        <span className="text-lg font-display uppercase tracking-wide">NimPet</span>
      </div>

      {/* ── Hero — centered, pet-first ─────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-5 pt-6 pb-12 max-w-lg mx-auto">
        <div className="relative mb-6 w-full flex justify-center">
          <div className="absolute inset-0 bg-[#2E7D32]/20 blur-[80px] rounded-full" />
          <Image
            src="/hero-pets-v2.png"
            width={800}
            height={600}
            alt=""
            className="relative w-full max-w-[280px] sm:max-w-xs h-auto"
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <h1 className="font-display text-5xl sm:text-6xl uppercase leading-[0.95] mb-4">
          NimPet
        </h1>
        <p className="text-neutral-400 text-base sm:text-lg leading-relaxed max-w-sm mb-8">
          NimPet rewards every completed session with XP. The more you focus, the more your pet evolves — all on Base, inside Nimiq Pay.
        </p>

        <GetStartedButton />

        {/* Stat chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full py-2 px-4"
            >
              <span className="font-display text-sm">{s.value}</span>
              <span className="text-neutral-500 text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Milestones ───────────────────────────────────────────────────── */}
      <section className="px-5 py-12 border-t border-white/10">
        <p className="text-center text-neutral-500 text-xs uppercase tracking-widest mb-6">
          Evolution milestones
        </p>
        <div className="flex justify-center gap-3 sm:gap-6 flex-wrap max-w-lg mx-auto">
          {["5min", "1hr", "5hrs", "20hrs"].map((m) => (
            <div
              key={m}
              className="flex-1 min-w-[70px] text-center bg-white/[0.04] border border-white/10 rounded-2xl py-4"
            >
              <span className="font-display text-lg">{m}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-12 border-t border-white/10 max-w-lg mx-auto">
        <div className="flex flex-col gap-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex gap-4 bg-[#0F0F0F] border border-white/10 rounded-2xl p-5"
            >
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#2E7D32]/15 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <h2 className="font-display text-base mb-1.5">{f.title}</h2>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-5 py-12 border-t border-white/10 max-w-lg mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl uppercase mb-8 text-center">
          Three steps to your first XP
        </h2>
        <div className="flex flex-col gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="flex items-start gap-4">
              <span className="shrink-0 w-10 h-10 rounded-full bg-[#2E7D32]/15 border border-[#2E7D32]/30 text-[#66BB6A] font-display text-sm flex items-center justify-center">
                {s.num}
              </span>
              <div>
                <p className="text-white font-semibold mb-1">{s.title}</p>
                <p className="text-neutral-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 border-t border-white/10 flex flex-col items-center text-center">
        <h2 className="font-display text-3xl sm:text-4xl uppercase leading-tight mb-4 max-w-sm">
          Your pet is waiting to hatch
        </h2>
        <p className="text-neutral-400 text-base mb-8 max-w-sm">
          Every minute you focus, your egg is growing. What are you waiting for?
        </p>
        <GetStartedButton />
      </section>

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
