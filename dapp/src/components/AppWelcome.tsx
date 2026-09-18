"use client";

import { useState } from "react";
import { useConnect, useConnectors, type Connector } from "wagmi";
import { nimiqPayConnector } from "@/app/providers";
import { useIsNimiqPay } from "@/hooks/useNimiqPay";
import toast from "react-hot-toast";

/**
 * Shown whenever there's no connected wallet. Nimiq Pay's own pre-ship
 * checklist requires that account-access dialogs never fire on page load
 * without user interaction — connecting only ever happens from a tap here.
 *
 * Inside Nimiq Pay there is exactly one provider, so a single tap connects
 * directly. Outside it (desktop testing, or any browser with more than one
 * wallet extension installed), window.ethereum is ambiguous — whichever
 * extension last claimed that global wins, which is why a MetaMask user can
 * end up connected to Rainbow. So instead we list every wallet actually
 * announced via EIP-6963 and let the user pick.
 */
export function AppWelcome() {
  const { connect } = useConnect();
  const isNimiqPayEnv = useIsNimiqPay();
  const connectors = useConnectors();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleNimiqConnect = () => {
    setIsConnecting(true);
    connect(
      { connector: nimiqPayConnector },
      {
        onError: () => {
          setIsConnecting(false);
          toast.error("Couldn't connect. Open this app inside Nimiq Pay to continue.");
        },
        onSettled: () => setIsConnecting(false),
      },
    );
  };

  const handleConnectWith = (connector: Connector) => {
    setConnectingId(connector.uid);
    connect(
      { connector },
      {
        onError: () => {
          setConnectingId(null);
          toast.error(`Couldn't connect to ${connector.name}.`);
        },
        onSettled: () => setConnectingId(null),
      },
    );
  };

  if (isNimiqPayEnv) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 px-6">
        <div className="text-center max-w-xs">
          <h1 className="text-3xl font-medium text-white mb-3 tracking-tight">
            NimPet
          </h1>
          <p className="text-neutral-500 text-sm leading-relaxed">
            Connect your wallet to hatch your pet and start focusing.
          </p>
        </div>

        <button
          onClick={handleNimiqConnect}
          disabled={isConnecting}
          className="w-full max-w-xs py-3.5 rounded-full bg-[#2E7D32] hover:bg-[#256B29] text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
      </div>
    );
  }

  // Outside Nimiq Pay — real wallet picker. Exclude the Nimiq-specific
  // legacy connector (name "NimiqPay") since it's only meaningful inside
  // the Nimiq Pay WebView and would just be a confusing duplicate here.
  const wallets = connectors.filter((c) => c.name !== "NimiqPay");

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 px-6">
      <div className="text-center max-w-xs">
        <h1 className="text-3xl font-medium text-white mb-3 tracking-tight">
          NimPet
        </h1>
        <p className="text-neutral-500 text-sm leading-relaxed">
          Choose a wallet to hatch your pet and start focusing.
        </p>
      </div>

      {wallets.length === 0 ? (
        <p className="text-neutral-600 text-sm text-center max-w-xs">
          No wallet extension detected. Install MetaMask, Rainbow, or another
          EVM wallet, then reload this page.
        </p>
      ) : (
        <div className="w-full max-w-xs flex flex-col gap-2">
          {wallets.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => handleConnectWith(connector)}
              disabled={connectingId !== null}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-2xl border border-neutral-800 bg-[#111111] hover:border-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connector.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={connector.icon} alt="" className="w-6 h-6 rounded-md shrink-0" />
              )}
              <span className="text-white font-medium text-sm">
                {connectingId === connector.uid ? "Connecting…" : connector.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
