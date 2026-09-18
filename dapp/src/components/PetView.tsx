"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Heart,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  ZapOff,
  Moon,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

import {
  PetStage,
  PetMood,
  getPetEmoji,
  getPetAsset,
  getStageName,
  StageInfo,
} from "@/utils/pet";

import { WeatherLayer, WeatherType } from "./WeatherLayer";

interface PetViewProps {
  stage: PetStage;
  health: number;
  xp: number;
  mood: PetMood;
  nextStageInfo?: StageInfo;
  streak?: number;
  weather?: WeatherType;
  activeCosmetic?: string;
  equippedCosmetics?: Record<string, boolean>;
  focusNote?: string;
  isNight?: boolean;
}

export function PetView({
  stage,
  health,
  xp,
  mood,
  nextStageInfo,
  streak = 0,
  weather = "clear",
  activeCosmetic = "",
  equippedCosmetics = {},
  focusNote = "",
  isNight = false,
}: PetViewProps) {
  const [thought, setThought] = React.useState<string | null>(null);
  const [isPoked, setIsPoked] = React.useState(false);
  const [popups, setPopups] = React.useState<{ id: number; value: string }[]>(
    [],
  );
  const lastXpRef = React.useRef(xp);

  // Handle XP Popups
  React.useEffect(() => {
    if (xp > lastXpRef.current) {
      const diff = xp - lastXpRef.current;
      const id = Date.now();
      setPopups((prev) => [...prev, { id, value: `+${diff} XP` }]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 2000);
    }
    lastXpRef.current = xp;
  }, [xp]);

  // Handle Poke
  const handlePoke = () => {
    if (isPoked) return;
    setIsPoked(true);

    // Random poked thought
    const pokedThoughts = [
      "Hehe! 😄",
      "That tickles! ✨",
      "Rawr! 🦖",
      "Focus time? 🧠",
      "I'm awake! ⚡",
    ];
    setThought(pokedThoughts[Math.floor(Math.random() * pokedThoughts.length)]);

    setTimeout(() => setIsPoked(false), 1000);
  };

  // Contextual messages
  React.useEffect(() => {
    const getThought = () => {
      if (mood === "sleeping") return "Zzz... 😴";
      if (health <= 0) return "Wake me up! 💊";
      if (mood === "focused") {
        if (focusNote) return `Working on "${focusNote}"... 🧠`;
        return "Directing focus... 🧠";
      }
      if (mood === "happy") {
        // Weather-based thoughts have priority when happy
        if (weather === "rainy" || weather === "stormy") {
          const gloomyThoughts = [
            "It's so gloomy... 🌧️",
            "A focus session would really cheer me up! 🥺",
            "I miss the sun... maybe 10 mins of focus? ☔",
            "Let's clear these clouds together! ✨",
          ];
          return gloomyThoughts[
            Math.floor(Math.random() * gloomyThoughts.length)
          ];
        }

        const happyThoughts = [
          "You're doing great! 🌟",
          "Let's focus together! 🦖",
          "I love this vibe! ✨",
          "XP feels so good! 💎",
        ];
        return happyThoughts[Math.floor(Math.random() * happyThoughts.length)];
      }
      if (mood === "sad") {
        const sadThoughts = [
          "Hey! Where did you go? 🥺",
          "Focus lost... I'm sad now. 💔",
          "I missed you... and my health hurts. 😿",
          "Stay with me next time? 🥺",
        ];
        return sadThoughts[Math.floor(Math.random() * sadThoughts.length)];
      }
      return null;
    };

    if (!isPoked) {
      setThought(getThought());
    }

    // Cycle thoughts occasionally if happy
    if (mood === "happy" && !isPoked) {
      const interval = setInterval(() => {
        setThought(getThought());
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [mood, health, xp, isPoked, focusNote]);

  // Determine animation based on mood
  const variants: Variants = {
    happy: {
      y: [0, -12, 0],
      transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
    },
    sad: {
      rotate: [0, -4, 4, 0],
      y: health <= 0 ? [0, 10, 0] : 0,
      transition: { repeat: Infinity, duration: 4 },
    },
    sleeping: {
      scale: [1, 1.03, 1],
      opacity: [0.7, 1, 0.7],
      transition: { repeat: Infinity, duration: 4 },
    },
    focused: {
      scale: [1, 1.05, 1],
      transition: { repeat: Infinity, duration: 2 },
    },
    poked: {
      scale: [1, 1.4, 0.9, 1.1, 1],
      rotate: [0, 15, -15, 10, 0],
      y: [0, -40, 0],
      transition: { duration: 0.6, ease: "backOut" },
    },
  };

  // Determine Emoji/SVG/Asset based on Stage
  const getPetContent = () => {
    const assetPath = getPetAsset(stage, weather);

    return (
      <div className="relative w-100 h-100 flex items-center justify-center">
        {assetPath ? (
          <Image
            src={assetPath}
            alt={getStageName(stage)}
            width={256}
            height={256}
            className={cn(
              "object-contain transition-all duration-700",
              mood === "sleeping" && "brightness-50 grayscale-50",
              health <= 0 && "grayscale brightness-50 blur-[2px]",
            )}
            priority
          />
        ) : (
          <span
            className={cn("text-8xl", health <= 0 && "grayscale opacity-50")}
          >
            {getPetEmoji(stage)}
          </span>
        )}

        {/* Death Overlay */}
        {health <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="bg-red-500/20 backdrop-blur-md p-6 rounded-full border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                <ZapOff
                  size={48}
                  className="text-red-500 drop-shadow-lg"
                  strokeWidth={3}
                />
              </div>
              {/* <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                Sync & Revive
              </span> */}
            </motion.div>
          </div>
        )}

        {/* Low Health Warning Border */}
        {health > 0 && health < 30 && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-25 animate-pulse"
            style={{
              boxShadow:
                "0 0 0 3px rgba(239,68,68,0.7), 0 0 24px 4px rgba(239,68,68,0.3)",
            }}
          />
        )}

        {/* Cosmetic Overlay Layer (Multi-Slot Wardrobe) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <AnimatePresence>
            {equippedCosmetics.sunglasses && (
              <motion.div
                key="sunglasses"
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute transform transition-all duration-500 ${
                  stage === "egg"
                    ? "translate-y-[-20px] scale-[1.5]"
                    : stage === "baby"
                      ? "translate-y-[-43px] scale-[1.8]"
                      : stage === "teen"
                        ? "translate-y-[-20px] scale-[0.85]"
                        : stage === "adult"
                          ? "translate-y-[-57px] translate-x-[-63px] scale-80"
                          : "translate-y-[-30px] scale-110"
                }`}
              >
                <Image src="https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778747/cool-shades_txvqei.png" width={64} height={64} alt="sunglasses" className="object-contain drop-shadow-lg" />
              </motion.div>
            )}
            {equippedCosmetics.crown && (
              <motion.div
                key="crown"
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute transform transition-all duration-500 ${
                  stage === "egg"
                    ? "translate-y-[-85px] scale-[1]"
                    : stage === "baby"
                      ? "translate-y-[-100px] scale-[0.9]"
                      : stage === "teen"
                        ? "translate-y-[-85px] scale-100"
                        : stage === "adult"
                          ? "translate-y-[-92px] translate-x-[-50px] scale-75"
                          : "translate-y-[-110px] scale-120"
                } ${isNight ? "brightness-[0.7] contrast-[1.1] drop-shadow-[0_0_15px_rgba(165,180,252,0.4)]" : ""}`}
              >
                <Image src="https://res.cloudinary.com/dmpulmnb9/image/upload/f_auto,q_auto/v1778778752/crown_xs1nxk.png" width={64} height={64} alt="crown" className="object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // Health Color
  const healthColor = health > 50 ? "text-pink-500" : "text-red-500";

  return (
    <div className="w-full mb-8 relative perspective-1000">
      {/* XP Popups */}
      <AnimatePresence>
        {popups.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 0, scale: 0.5, z: 100 }}
            animate={{ opacity: 1, y: -100, scale: 1.2, z: 100 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute left-1/2 -translate-x-1/2 z-100 pointer-events-none"
            style={{ translateZ: 100 }}
          >
            <span className="bg-linear-to-r from-[#FF6B4A] to-[#e0522f] text-white px-3 py-1 rounded-full text-sm font-black shadow-lg border border-white/20">
              {p.value}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Gradient border wrapper */}
      <div
        className="w-full rounded-[2rem]"
        style={{
          padding: "0.5px",
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #000000 24.09%, #000000 77.59%, #999999 100%)",
        }}
      >
        {/* Main Pet Container */}
        <div className="w-full h-80 md:h-[483px] bg-[#000000] rounded-[calc(2rem-0.5px)] flex items-center justify-center relative group transition-colors duration-500 shadow-xl cursor-pointer">
          {/* Weather Layer */}
          <WeatherLayer weather={weather} isNight={isNight} />

          {/* Weather Badge */}
          {(() => {
            const badge: Record<WeatherType, { icon: React.ReactNode; label: string } | null> = {
              sunny:   { icon: <Sun size={11} />,           label: "Sunny" },
              clear:   null,
              cloudy:  { icon: <Cloud size={11} />,         label: "Cloudy" },
              rainy:   { icon: <CloudRain size={11} />,     label: "Rainy" },
              stormy:  { icon: <CloudLightning size={11} />, label: "Stormy" },
            };
            const nightBadge = isNight ? { icon: <Moon size={11} />, label: "Night" } : null;
            const b = nightBadge ?? badge[weather];
            if (!b) return null;
            return (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 border border-neutral-800/80 rounded-full backdrop-blur-sm pointer-events-none">
                <span className="text-neutral-400">{b.icon}</span>
                <span className="text-[10px] text-neutral-400 font-medium tracking-wide">{b.label}</span>
              </div>
            );
          })()}

          {/* Thought Bubble */}
          <AnimatePresence>
            {thought && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                key={thought}
                className="absolute top-20 bg-[#1a1a1a] px-4 py-2 rounded-2xl rounded-bl-sm shadow-xl border border-neutral-800 z-20"
              >
                <p className="text-xs/[100%] font-bold text-neutral-200 whitespace-nowrap">
                  {thought}
                </p>
                {/* Pointer */}
                <div className="absolute -bottom-2 left-2 w-4 h-4 bg-[#1a1a1a] border-r border-b border-neutral-800 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Pet (Floating) */}
          <motion.div
            animate={isPoked ? "poked" : mood}
            variants={variants}
            className="relative z-10 cursor-pointer drop-shadow-2xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePoke}
          >
            {getPetContent()}
          </motion.div>
        </div>
      </div>
      {/* end gradient border wrapper */}

      {/* Low Health Warning Banner */}
      {health > 0 && health < 30 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-[90%] mx-auto mt-3 flex items-center justify-between gap-3 px-4 py-3 bg-[#110808] border border-red-900/40 rounded-2xl"
        >
          <div className="flex items-center gap-2.5">
            <Heart size={15} className="text-red-500 animate-pulse" fill="currentColor" />
            <span className="text-xs font-black text-white">
              Your pet is struggling!{" "}
              <span className="text-[#A9A9A9] font-medium">({health}% health)</span>
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#A9A9A9] uppercase tracking-widest whitespace-nowrap">
            Feed it now →
          </span>
        </motion.div>
      )}
    </div>
  );
}
