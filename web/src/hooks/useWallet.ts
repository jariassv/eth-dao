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
      let chainIdHex: string = await ethereum.request({ method: "eth_chainId" });
      let chainId = parseInt(chainIdHex, 16);
      
      if (chainId !== targetChainId) {
        await switchToChain(toChainIdHex(targetChainId));
        // Esperar un poco y verificar el chainId actualizado
        await new Promise(resolve => setTimeout(resolve, 500));
        chainIdHex = await ethereum.request({ method: "eth_chainId" });
        chainId = parseInt(chainIdHex, 16);
      }
      
      setState({ address: accounts[0] ?? null, chainId, isConnecting: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, isConnecting: false, error: e?.message ?? "Error al conectar" }));
    }
  }, [targetChainId]);

  // Verificar cuenta conectada al montar y escuchar eventos
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum?.on) return;

    // Verificar si hay cuenta conectada
    const checkInitialAccount = async () => {
      try {
        const accounts: string[] = await ethereum.request({ method: "eth_accounts" });
        const chainIdHex: string = await ethereum.request({ method: "eth_chainId" });
        const chainId = parseInt(chainIdHex, 16);
        if (accounts.length > 0) {
          setState((s) => ({ ...s, address: accounts[0] ?? null, chainId }));
        }
      } catch (e) {
        console.error("Error al verificar cuenta inicial:", e);
      }
    };

    checkInitialAccount();

    // Escuchar cambios de cuenta
    const onAccountsChanged = (accs: string[]) => {
      setState((s) => ({ ...s, address: accs[0] ?? null }));
    };

    // Escuchar cambios de red (necesita recargar página según MetaMask docs)
    const onChainChanged = () => {
      window.location.reload();
    };

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


