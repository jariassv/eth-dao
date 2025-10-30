"use client";

import { useWallet } from "../hooks/useWallet";

export function ConnectWallet() {
  const { address, chainId, isConnecting, error, connect } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-3 p-3 rounded border border-neutral-300 bg-white/50">
        <span className="text-sm font-medium">Conectado:</span>
        <span className="text-xs font-mono">{address}</span>
        <span className="text-xs text-neutral-500">ChainId: {chainId ?? "-"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 rounded bg-black text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isConnecting ? "Conectando..." : "Conectar MetaMask"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}


