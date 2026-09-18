"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  History,
  Trophy,
  ShoppingBag,
  Home,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useAudio } from "@/hooks/useAudio";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const NimiqPayAccountModal = dynamic(
  () => import("./NimiqPayAccountModal").then((m) => m.NimiqPayAccountModal),
  { ssr: false },
);

interface NavbarProps {
  onOpenProfile?: () => void;
  minimal?: boolean;
}

const TABS = [
  { label: "Home", href: "/app", icon: Home },
  { label: "Shop", href: "/app/shop", icon: ShoppingBag },
  { label: "Board", href: "/app/leaderboard", icon: Trophy },
  { label: "Activity", href: "/app/activities", icon: History },
  { label: "Guide", href: "/app/guide", icon: HelpCircle },
] as const;

function AccountPill({ address, onClick }: { address?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.06] backdrop-blur-md border border-white/10 text-white rounded-full font-mono text-xs hover:bg-white/[0.1] transition-colors"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      {address ? `${address.slice(0, 6)}…${address.slice(-3)}` : "Account"}
    </button>
  );
}

/**
 * App shell chrome: a slim top header (logo left, account pill right) and a
 * fixed bottom tab bar for primary navigation — the mobile-app pattern,
 * since this runs inside Nimiq Pay's mobile WebView rather than a desktop
 * browser tab.
 */
export function Navbar({ onOpenProfile, minimal }: NavbarProps) {
  const { address } = useAuth();
  const { playSound } = useAudio();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const topBar = (
    <header className="fixed top-0 left-0 right-0 z-50 pt-safe bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center gap-1">
          <Image
            src="/focus-egg-v2.png"
            width={26}
            height={26}
            alt=""
            className="rounded-full"
          />
          <span className="font-display text-sm font-bold tracking-wide text-white">
            NimPet
          </span>
        </div>
        <AccountPill
          address={address}
          onClick={() => { setIsModalOpen(true); playSound("click"); }}
        />
      </div>
    </header>
  );

  if (minimal) {
    return (
      <>
        <div className="h-[60px]" aria-hidden="true" />
        {topBar}
        <NimiqPayAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="h-[60px]" aria-hidden="true" />
      {topBar}

      {/* Bottom tab bar — primary navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="mx-3 mb-3 sm:mx-auto sm:mb-4 sm:max-w-md flex items-stretch justify-between bg-[#141218]/90 backdrop-blur-xl border border-white/10 rounded-[28px] px-1.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => playSound("click")}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-[22px] transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute inset-0 bg-[#2E7D32]/15 rounded-[22px]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  size={18}
                  className={`relative transition-colors ${isActive ? "text-[#66BB6A]" : "text-neutral-500"}`}
                />
                <span
                  className={`relative text-[9px] font-semibold uppercase tracking-wide transition-colors ${isActive ? "text-[#66BB6A]" : "text-neutral-600"}`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <NimiqPayAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOpenProfile={onOpenProfile}
      />
    </>
  );
}
