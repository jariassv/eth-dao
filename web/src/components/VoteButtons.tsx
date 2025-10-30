"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";

export function VoteButtons({ proposalId, disabled }: { proposalId: bigint; disabled?: boolean }) {
  const { address } = useWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = useMemo(() => {
    if (!DAO_ADDRESS) return null;
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new ethers.BrowserProvider(ethereum as any);
    async function get() {
      const signer = await provider.getSigner();
      return new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, signer);
    }
    return { get };
  }, []);

  const sendVote = async (voteType: number) => {
    setError(null);
    if (!address) return setError("Conecta tu wallet primero");
    if (!contract) return setError("Contrato no configurado");
    try {
      setSending(true);
      const c = await contract.get();
      const tx = await c.vote(proposalId, voteType);
      await tx.wait();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Error al votar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => sendVote(1)}
        disabled={sending || disabled}
        className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
      >A favor</button>
      <button
        onClick={() => sendVote(0)}
        disabled={sending || disabled}
        className="px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
      >En contra</button>
      <button
        onClick={() => sendVote(2)}
        disabled={sending || disabled}
        className="px-3 py-1 rounded bg-neutral-600 text-white hover:bg-neutral-500 disabled:opacity-50"
      >Abstención</button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </div>
  );
}


