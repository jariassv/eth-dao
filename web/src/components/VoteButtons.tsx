"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { FORWARDER_ADDRESS, MINIMAL_FORWARDER_ABI, FORWARD_REQUEST_TYPES, buildEip712Domain } from "../lib/forwarder";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";
import { parseTransactionError } from "../lib/errorHandler";

export function VoteButtons({ proposalId, disabled }: { proposalId: bigint; disabled?: boolean }) {
  const { address } = useWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfPayGasless, setSelfPayGasless] = useState(false);

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

  async function sendGasless(voteType: number) {
    if (!DAO_ADDRESS || !FORWARDER_ADDRESS) throw new Error("Falta configuración de direcciones");
    const ethereum = getEthereum();
    if (!ethereum) throw new Error("MetaMask no encontrado");
    const provider = new ethers.BrowserProvider(ethereum as any);
    const signer = await provider.getSigner();
    const chainId = Number((await provider.getNetwork()).chainId);
    const daoInterface = new ethers.Interface(DAOVOTING_ABI as any);
    const data = daoInterface.encodeFunctionData("vote", [proposalId, voteType]);
    const forwarder = new ethers.Contract(FORWARDER_ADDRESS, MINIMAL_FORWARDER_ABI as any, provider);
    const nonce: bigint = await forwarder.getNonce(address as string);
    const req = {
      from: address as string,
      to: DAO_ADDRESS,
      value: 0n,
      gas: 200000n,
      nonce,
      data,
    };
    const domain = buildEip712Domain(chainId, FORWARDER_ADDRESS);
    const signature = await (signer as any).signTypedData(domain, FORWARD_REQUEST_TYPES, req);

    if (selfPayGasless) {
      // El usuario paga gas: llama execute() directamente
      const fwdWithSigner = new ethers.Contract(FORWARDER_ADDRESS, MINIMAL_FORWARDER_ABI as any, signer);
      const tx = await fwdWithSigner.execute(
        {
          from: req.from,
          to: req.to,
          value: req.value,
          gas: req.gas,
          nonce: req.nonce,
          data: req.data,
        },
        signature,
        { gasLimit: 1_000_000 }
      );
      return await tx.wait();
    } else {
      // Usa relayer backend
      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forwarder: FORWARDER_ADDRESS,
          request: {
            from: req.from,
            to: req.to,
            value: req.value.toString(),
            gas: req.gas.toString(),
            nonce: req.nonce.toString(),
            data: req.data,
          },
          signature,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "relay_failed");
      }
      return await res.json();
    }
  }

  const sendVote = async (voteType: number) => {
    setError(null);
    if (!address) return setError("Conecta tu wallet primero");
    if (!contract) return setError("Contrato no configurado");
    try {
      setSending(true);
      if (FORWARDER_ADDRESS) {
        await sendGasless(voteType);
      } else {
        const c = await contract.get();
        const tx = await c.vote(proposalId, voteType);
        await tx.wait();
      }
    } catch (e: any) {
      const errorMsg = parseTransactionError(e);
      setError(errorMsg);
      console.error("Error al votar:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 text-xs mr-2">
        <input type="checkbox" checked={selfPayGasless} onChange={(e) => setSelfPayGasless(e.target.checked)} />
        {selfPayGasless ? "Yo pago el gas" : "Gasless (relayer paga el gas)"}
      </label>
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


