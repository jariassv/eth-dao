"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";

export function CreateProposal() {
  const { address } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amountEth, setAmountEth] = useState("1.0");
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  const onCreate = async () => {
    setError(null);
    setInfo(null);
    if (!address) return setError("Conecta tu wallet primero");
    if (!contract) return setError("Contrato no configurado");
    try {
      setSending(true);
      const amount = ethers.parseEther(amountEth || "0");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineHours * 3600);
      const c = await contract.get();
      const tx = await c.createProposal(recipient, amount, deadline);
      await tx.wait();
      setInfo("Propuesta creada correctamente");
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Error al crear propuesta");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border rounded flex flex-col gap-3">
      <div className="text-lg font-semibold">Crear Propuesta</div>
      <div className="flex flex-col gap-2">
        <label className="text-sm">Beneficiario</label>
        <input
          className="border px-3 py-2 rounded"
          placeholder="0x..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>
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
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Deadline en</span>
        <input
          type="number"
          min={1}
          className="border px-3 py-2 rounded w-24"
          value={deadlineHours}
          onChange={(e) => setDeadlineHours(parseInt(e.target.value || "0", 10))}
        />
        <span className="text-sm">horas</span>
      </div>
      <button
        onClick={onCreate}
        disabled={sending || !address}
        className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {sending ? "Creando..." : "Crear Propuesta"}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {info && <div className="text-xs text-emerald-700">{info}</div>}
      {!DAO_ADDRESS && (
        <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
          Define NEXT_PUBLIC_DAO_ADDRESS en .env.local.
        </div>
      )}
    </div>
  );
}


