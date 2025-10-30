"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getEthereum, toChainIdHex, switchToChain } from "../lib/ethereum";

type WalletState = {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({ address: null, chainId: null, isConnecting: false, error: null });
  const targetChainId = useMemo(() => Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337), []);

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return setState((s) => ({ ...s, error: "MetaMask no encontrado" }));
    try {
      setState((s) => ({ ...s, isConnecting: true, error: null }));
      const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
      const chainIdHex: string = await ethereum.request({ method: "eth_chainId" });
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== targetChainId) {
        await switchToChain(toChainIdHex(targetChainId));
      }
      setState({ address: accounts[0] ?? null, chainId: targetChainId, isConnecting: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, isConnecting: false, error: e?.message ?? "Error al conectar" }));
    }
  }, [targetChainId]);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum?.on) return;
    const onAccountsChanged = (accs: string[]) => setState((s) => ({ ...s, address: accs[0] ?? null }));
    const onChainChanged = (hex: string) => setState((s) => ({ ...s, chainId: parseInt(hex, 16) }));
    ethereum.on("accountsChanged", onAccountsChanged);
    ethereum.on("chainChanged", onChainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  return {
    ...state,
    connect,
  };
}


