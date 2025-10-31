"use client";

import { useWallet } from "../hooks/useWallet";

export function ConnectWallet() {
  const { address, chainId, isConnecting, error, connect } = useWallet();

  if (address) {
    return null; // No mostrar nada si está conectado (el header mostrará la info)
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="px-5 py-2.5 rounded-lg bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 text-sm font-semibold transition-colors shadow-sm"
    >
      {isConnecting ? "Conectando..." : "Conectar"}
    </button>
  );
}


