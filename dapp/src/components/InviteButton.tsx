"use client";

import { UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAudio } from "@/hooks/useAudio";
import toast from "react-hot-toast";

interface InviteButtonProps {
  variant?: "pill" | "gold";
  className?: string;
}

export function InviteButton({ variant = "pill", className = "" }: InviteButtonProps) {
  const { address } = useAuth();
  const { playSound } = useAudio();

  function handleInvite() {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    const link = window.location.origin;
    navigator.clipboard.writeText(link).then(() => {
      toast.success("Invite link copied!");
      playSound("click");
    }).catch(() => {
      toast.error("Could not copy link.");
    });
  }

  if (variant === "gold") {
    return (
      <button
        onClick={handleInvite}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95 ${className}`}
        style={{ background: "linear-gradient(135deg, #2E7D32 0%, #FF6B4A 100%)", color: "#fff" }}
      >
        <UserPlus size={14} />
        Invite a Friend
      </button>
    );
  }

  return (
    <button
      onClick={handleInvite}
      className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap bg-[#2E7D32] text-white hover:bg-[#256B29] transition-colors active:scale-95 ${className}`}
    >
      <UserPlus size={14} />
      Invite a Friend
    </button>
  );
}
