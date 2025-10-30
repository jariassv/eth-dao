"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";

export function FundingPanel() {
  const { address } = useWallet();
  const [amountEth, setAmountEth] = useState("0.1");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("-");
  const [daoBalance, setDaoBalance] = useState<string>("-");

  const contract = useMemo(() => {
    if (!DAO_ADDRESS) return null;
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new ethers.BrowserProvider(ethereum as any);
    const signer = provider.getSigner();
    return {
      provider,
      signer,
      instance: new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider),
      withSigner: new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, signer),
    } as const;
  }, []);

  async function refreshBalances() {
    try {
      if (!contract?.instance) return;
      const [ub, tb] = await Promise.all([
        address ? contract.instance.getUserBalance(address) : Promise.resolve(0n),
        contract.instance.totalDaoBalance(),
      ]);
      setUserBalance(ethers.formatEther(ub));
      setDaoBalance(ethers.formatEther(tb));
    } catch (e: any) {
      setError(e?.message ?? "Error al leer balances");
    }
  }

  useEffect(() => {
    void refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, contract?.instance]);

  const onFund = async () => {
    setError(null);
    if (!address) return setError("Conecta tu wallet primero");
    if (!contract?.withSigner) return setError("Contrato no configurado");
    try {
      setSending(true);
      const value = ethers.parseEther(amountEth || "0");
      const tx = await contract.withSigner.fundDAO({ value });
      await tx.wait();
      await refreshBalances();
    } catch (e: any) {
      setError(e?.message ?? "Error al fondear");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border rounded flex flex-col gap-3">
      <div className="text-lg font-semibold">Financiar DAO</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          className="border px-3 py-2 rounded w-40"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
        />
        <span>ETH</span>
        <button
          onClick={onFund}
          disabled={sending || !address}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {sending ? "Enviando..." : "Depositar"}
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="text-sm text-neutral-700">
        <div>Tu balance en el DAO: <b>{userBalance}</b> ETH</div>
        <div>Balance total del DAO: <b>{daoBalance}</b> ETH</div>
      </div>
      {!DAO_ADDRESS && (
        <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
          Define NEXT_PUBLIC_DAO_ADDRESS en .env.local para habilitar depósitos.
        </div>
      )}
    </div>
  );
}


