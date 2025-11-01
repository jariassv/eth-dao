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

  // Limpiar estado cuando cambia la dirección o proposalId
  useEffect(() => {
    setHasVoted(false);
    setUserVote(null);
    setCanVote(false);
    setError(null);
  }, [address, proposalId]);

  // Verificar si puede votar y si ya votó
  useEffect(() => {
    if (!contract || !address || !proposalId) {
      setCanVote(false);
      setHasVoted(false);
      setUserVote(null);
      return;
    }

    const checkVoteStatus = async () => {
      // Capturar la dirección actual para evitar condiciones de carrera
      const currentAddress = address;
      
      try {
        const provider = contract.provider;
        const readContract = new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider);
        
        // Verificar si tiene balance (puede votar) - usar la dirección capturada
        const balance = await readContract.getUserBalance(currentAddress);
        const hasBalance = balance > 0n;
        
        // Verificar si la propuesta aún está activa
        const now = Math.floor(Date.now() / 1000);
        const isActive = proposalDeadline ? Number(proposalDeadline) > now : true;
        
        // Intentar verificar si ya votó (solo si el contrato tiene estas funciones)
        let voted = false;
        let voteType = null;
        try {
          voted = await readContract.hasVotedForProposal(proposalId, currentAddress);
          if (voted) {
            voteType = Number(await readContract.getUserVote(proposalId, currentAddress));
          }
          console.log(`[VoteButtons] Verificando voto para ${currentAddress} en propuesta ${proposalId}: voted=${voted}, voteType=${voteType}`);
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
        
        // Solo actualizar si la dirección no ha cambiado mientras se ejecutaba
        if (currentAddress === address) {
          setCanVote(hasBalance && isActive && !voted);
          setHasVoted(voted);
          setUserVote(voteType);
        }
      } catch (e) {
        console.error(`[VoteButtons] Error al verificar estado de votación para ${currentAddress}:`, e);
        // Solo actualizar si la dirección no ha cambiado mientras se ejecutaba
        if (currentAddress === address) {
          setCanVote(false);
          setHasVoted(false);
          setUserVote(null);
        }
      }
    };

    checkVoteStatus();
  }, [contract, address, proposalId, proposalDeadline]);

  async function sendGasless(voteType: number, useRelayer: boolean) {
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

    if (!useRelayer) {
      // El usuario paga gas: llama execute() directamente en el forwarder
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
      // Usa relayer backend (relayer paga el gas)
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
      const result = await res.json();
      
      // El relayer devuelve { hash: "0x..." }
      // No esperamos aquí la confirmación, solo retornamos el hash
      // La confirmación se verá en la verificación posterior del estado
      const txHash = result.txHash || result.hash;
      if (txHash) {
        console.log(`[VoteButtons] Transacción enviada por relayer: ${txHash}`);
        // Retornar el hash para que se pueda verificar después
        return { hash: txHash, confirmed: false };
      }
      
      return result;
    }
  }

  const sendVote = async (voteType: number) => {
    setError(null);
    if (!address) return setError("Conecta tu wallet primero");
    if (!contract) return setError("Contrato no configurado");
    try {
      setSending(true);
      
      // Lógica de votación:
      // - Si NO hay forwarder: voto directo al contrato (usuario paga gas)
      // - Si hay forwarder Y checkbox marcado (selfPayGasless = true): usuario paga gas vía forwarder
      // - Si hay forwarder Y checkbox NO marcado (selfPayGasless = false): relayer paga gas (gasless)
      
      if (!FORWARDER_ADDRESS) {
        // No hay forwarder configurado: votar directamente al contrato
        const c = await contract.get();
        const tx = await c.vote(proposalId, voteType);
        await tx.wait();
      } else if (selfPayGasless) {
        // Checkbox marcado: usuario paga gas vía forwarder
        await sendGasless(voteType, false);
      } else {
        // Checkbox NO marcado: relayer paga gas (gasless)
        await sendGasless(voteType, true);
      }
      // Para transacciones normales, ya están confirmadas (tx.wait())
      // Para relayer, solo esperamos un poco y luego verificamos el estado
      // Esperar un poco para que la transacción se propague
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refrescar estado desde el contrato después de votar
      // Hacer varios intentos ya que la transacción puede tardar en confirmarse
      const provider = contract.provider;
      const readContract = new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider);
      
      let attempts = 0;
      const maxAttempts = 10; // Aumentar a 10 intentos
      let confirmed = false;
      
      while (attempts < maxAttempts) {
        try {
          const voted = await readContract.hasVotedForProposal(proposalId, address);
          if (voted) {
            const voteTypeFromContract = Number(await readContract.getUserVote(proposalId, address));
            setHasVoted(true);
            setUserVote(voteTypeFromContract);
            setCanVote(false);
            confirmed = true;
            console.log(`[VoteButtons] ✅ Voto confirmado después de ${attempts + 1} intentos`);
            
            // Disparar evento personalizado para que ProposalList se actualice
            window.dispatchEvent(new CustomEvent('voteSubmitted', { detail: { proposalId: proposalId.toString() } }));
            break;
          }
        } catch (e: any) {
          // Si el contrato no tiene estas funciones, asumir que el voto fue exitoso
          if (e?.code === "CALL_EXCEPTION" || e?.code === "BAD_DATA") {
            console.log(`[VoteButtons] Contrato antiguo detectado, usando fallback`);
            setHasVoted(true);
            setUserVote(voteType);
            setCanVote(false);
            confirmed = true;
            window.dispatchEvent(new CustomEvent('voteSubmitted', { detail: { proposalId: proposalId.toString() } }));
            break;
          }
          console.log(`[VoteButtons] Intento ${attempts + 1}/${maxAttempts} falló, reintentando...`, e?.message || e);
        }
        
        attempts++;
        if (attempts < maxAttempts && !confirmed) {
          // Esperar progresivamente más tiempo: 2s, 3s, 4s...
          const delay = Math.min(2000 + (attempts * 500), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Si después de todos los intentos no se confirmó, usar valores locales como fallback
      if (!confirmed && attempts === maxAttempts) {
        console.warn(`[VoteButtons] ⚠️ No se pudo confirmar el voto después de ${maxAttempts} intentos, usando valores locales (el voto debería estar procesándose)`);
        setHasVoted(true);
        setUserVote(voteType);
        setCanVote(false);
        // Disparar evento de todas formas para que la UI se actualice
        window.dispatchEvent(new CustomEvent('voteSubmitted', { detail: { proposalId: proposalId.toString() } }));
      }
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


