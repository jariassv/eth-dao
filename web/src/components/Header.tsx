"use client";

import { useWallet } from "../hooks/useWallet";
import { ConnectWallet } from "./ConnectWallet";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";

export function Header() {
  const { address } = useWallet();
  const [userBalance, setUserBalance] = useState<string>("-");
  const [daoBalance, setDaoBalance] = useState<string>("-");

  useEffect(() => {
    if (!DAO_ADDRESS) {
      setUserBalance("-");
      setDaoBalance("-");
      return;
    }

    const refreshBalances = async () => {
      try {
        const ethereum = getEthereum();
        if (!ethereum) return;
        const provider = new ethers.BrowserProvider(ethereum as any);
        const contract = new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider);
        
        // Balance total del DAO (siempre se muestra)
        const totalBalance = await contract.totalDaoBalance();
        setDaoBalance(ethers.formatEther(totalBalance));
        
        // Balance del usuario (solo si hay dirección)
        if (address) {
          const userBal = await contract.getUserBalance(address);
          setUserBalance(ethers.formatEther(userBal));
        } else {
          setUserBalance("-");
        }
      } catch (e) {
        console.error("Error al obtener balances:", e);
        setUserBalance("0");
        setDaoBalance("0");
      }
    };

    // Refrescar balances al montar y cuando cambia la dirección
    refreshBalances();

    // Escuchar eventos para refrescar balances automáticamente
    const handleProposalExecuted = () => {
      console.log('[Header] Propuesta ejecutada, refrescando balances...');
      // Refrescar inmediatamente
      void refreshBalances();
      // Y también después de un delay para asegurar actualización
      setTimeout(() => {
        void refreshBalances();
      }, 1000);
      setTimeout(() => {
        void refreshBalances();
      }, 3000);
    };

    const handleFunded = () => {
      console.log('[Header] Fondeo detectado, refrescando balances...');
      // Refrescar inmediatamente
      void refreshBalances();
      // Y también después de un delay
      setTimeout(() => {
        void refreshBalances();
      }, 1000);
    };

    window.addEventListener('proposalExecuted', handleProposalExecuted);
    window.addEventListener('funded', handleFunded);

    return () => {
      window.removeEventListener('proposalExecuted', handleProposalExecuted);
      window.removeEventListener('funded', handleFunded);
    };
  }, [address]);

  return (
    <header className="border-b border-neutral-200 bg-neutral-50 sticky top-0 z-50">
      <div className="flex flex-1 justify-center">
        <div className="flex max-w-7xl w-full bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
          <div className="w-64 flex-shrink-0 py-4"></div>
          <div className="flex-1 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <h1 className="text-2xl font-bold text-white">DAO Voting Platform</h1>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <span className="text-white/90 font-medium">DAO Balance:</span>
                    <span className="text-white font-bold">{daoBalance} ETH</span>
                  </div>
                  {address && (
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                      <span className="text-white/90 font-medium">Mi Balance:</span>
                      <span className="text-white font-bold">{userBalance} ETH</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {address && (
                  <div className="text-xs font-mono text-white bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
                )}
                <ConnectWallet />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
