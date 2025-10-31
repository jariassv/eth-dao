"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { FORWARDER_ADDRESS, MINIMAL_FORWARDER_ABI, FORWARD_REQUEST_TYPES, buildEip712Domain } from "../lib/forwarder";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";
import { parseTransactionError } from "../lib/errorHandler";

export function VoteButtons({ proposalId, disabled, proposalDeadline }: { proposalId: bigint; disabled?: boolean; proposalDeadline?: bigint }) {
  const { address } = useWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfPayGasless, setSelfPayGasless] = useState(false);
  const [canVote, setCanVote] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);

  const contract = useMemo(() => {
    if (!DAO_ADDRESS) return null;
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new ethers.BrowserProvider(ethereum as any);
    async function get() {
      const signer = await provider.getSigner();
      return new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, signer);
    }
    return { get, provider };
  }, []);

  // Verificar si puede votar y si ya votó
  useEffect(() => {
    if (!contract || !address || !proposalId) {
      setCanVote(false);
      setHasVoted(false);
      return;
    }

    const checkVoteStatus = async () => {
      try {
        const provider = contract.provider;
        const readContract = new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider);
        
        // Verificar si tiene balance (puede votar)
        const balance = await readContract.getUserBalance(address);
        const hasBalance = balance > 0n;
        
        // Verificar si la propuesta aún está activa
        const now = Math.floor(Date.now() / 1000);
        const isActive = proposalDeadline ? Number(proposalDeadline) > now : true;
        
        // Intentar verificar si ya votó (solo si el contrato tiene estas funciones)
        let voted = false;
        let voteType = null;
        try {
          voted = await readContract.hasVotedForProposal(proposalId, address);
          if (voted) {
            voteType = Number(await readContract.getUserVote(proposalId, address));
          }
        } catch (voteCheckError: any) {
          // Si el contrato no tiene estas funciones (versión antigua), ignorar el error
          // En ese caso, asumimos que no podemos verificar si ya votó, así que siempre mostramos los botones
          if (voteCheckError?.code === "CALL_EXCEPTION" || voteCheckError?.code === "BAD_DATA") {
            console.log("Contrato antiguo detectado: no se puede verificar estado de voto");
            // No hacer nada, seguir con voted = false
          } else {
            throw voteCheckError; // Re-lanzar otros errores
          }
        }
        
        setCanVote(hasBalance && isActive && !voted);
        setHasVoted(voted);
        setUserVote(voteType);
      } catch (e) {
        console.error("Error al verificar estado de votación:", e);
        // En caso de error, no mostrar los botones por seguridad
        setCanVote(false);
        setHasVoted(false);
      }
    };

    checkVoteStatus();
  }, [contract, address, proposalId, proposalDeadline]);

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
      // Refrescar estado después de votar
      setHasVoted(true);
      setUserVote(voteType);
      setCanVote(false);
    } catch (e: any) {
      const errorMsg = parseTransactionError(e);
      setError(errorMsg);
      console.error("Error al votar:", e);
    } finally {
      setSending(false);
    }
  };

  const getVoteLabel = (voteType: number) => {
    if (voteType === 0) return "En contra";
    if (voteType === 1) return "A favor";
    if (voteType === 2) return "Abstención";
    return "Desconocido";
  };

  // Si ya votó, mostrar mensaje
  if (hasVoted && userVote !== null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-emerald-700 font-medium">
          ✅ Voted: {getVoteLabel(userVote)}
        </span>
      </div>
    );
  }

  // Si no puede votar, no mostrar nada
  if (!canVote) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 text-xs mr-2">
        <input type="checkbox" checked={selfPayGasless} onChange={(e) => setSelfPayGasless(e.target.checked)} />
        {selfPayGasless ? "Yo pago el gas" : "Gasless (relayer paga el gas)"}
      </label>
      <button
        onClick={() => sendVote(1)}
        disabled={sending || disabled || !canVote}
        className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
      >A favor</button>
      <button
        onClick={() => sendVote(0)}
        disabled={sending || disabled || !canVote}
        className="px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
      >En contra</button>
      <button
        onClick={() => sendVote(2)}
        disabled={sending || disabled || !canVote}
        className="px-3 py-1 rounded bg-neutral-600 text-white hover:bg-neutral-500 disabled:opacity-50"
      >Abstención</button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </div>
  );
}


