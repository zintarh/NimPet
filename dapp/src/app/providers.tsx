"use client";

import * as React from "react";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  http,
  createConfig,
  fallback,
  useAccount,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { base } from "wagmi/chains";
import { AudioProvider } from "@/hooks/useAudio";
import { NimiqPayProvider } from "@/contexts/NimiqPayContext";

if (typeof BigInt !== "undefined" && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

export const nimiqPayConnector = injected({
  target() {
    return {
      id: "injected",
      name: "NimiqPay",
      provider: typeof window !== "undefined" ? (window.ethereum as any) : undefined,
    };
  },
});

// Outside Nimiq Pay (desktop testing, or a browser with multiple wallet
// extensions installed), pinning to window.ethereum is ambiguous — whichever
// extension last claimed that global wins, regardless of which one the user
// actually wants. This plain injected() has no custom target, so combined
// with multiInjectedProviderDiscovery (default true) below, wagmi surfaces
// every EIP-6963-announced wallet (MetaMask, Rainbow, etc.) as its own
// connector via useConnectors() — used to build a real wallet picker.
export const genericInjectedConnector = injected();

const transport = fallback([
  http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL!),
  http("https://mainnet.base.org"),
]);

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [nimiqPayConnector, genericInjectedConnector],
  transports: { [base.id]: transport },
});

const toastOptions = {
  duration: 4000,
  style: {
    background: "#111111", color: "#ffffff", border: "1px solid #262626",
    borderRadius: "999px", padding: "12px 20px", fontSize: "13px",
    fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxWidth: "420px",
  },
  success: { iconTheme: { primary: "#ffffff", secondary: "#111111" } },
  error:   { iconTheme: { primary: "#ef4444", secondary: "#111111" } },
};

// The injected provider (a general-purpose extension wallet during testing,
// or Nimiq Pay's own wallet in production) may be sitting on a different
// chain from a previous session — e.g. Celo, left over from this app's old
// GoodDollar build. Every contract call already pins chainId: base.id, so
// funds can't move on the wrong chain, but this proactively flips the
// wallet's active network so reads/UI don't sit in a mismatched state.
function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  React.useEffect(() => {
    if (isConnected && chainId !== base.id) {
      switchChain({ chainId: base.id });
    }
  }, [isConnected, chainId, switchChain]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () => new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
      },
    }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NimiqPayProvider>
          <AudioProvider>
            <NetworkGuard />
            {children}
          </AudioProvider>
        </NimiqPayProvider>
        <Toaster
          position="bottom-center"
          containerStyle={{ bottom: 170 }}
          toastOptions={toastOptions}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
