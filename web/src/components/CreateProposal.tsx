"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";
import { parseTransactionError } from "../lib/errorHandler";

export function CreateProposal() {
  const { address } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amountEth, setAmountEth] = useState("1.0");
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  
  // Validar dirección en tiempo real
  const recipientValid = recipient === "" || ethers.isAddress(recipient);
  const recipientNormalized = recipient && ethers.isAddress(recipient) 
    ? ethers.getAddress(recipient) 
    : null;

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
    
    // Validar dirección del beneficiario antes de continuar
    if (!recipient || recipient.trim() === "") {
      return setError("La dirección del beneficiario es requerida");
    }
    
    // Validar que sea una dirección válida (sin intentar resolver ENS)
    if (!ethers.isAddress(recipient)) {
      return setError("La dirección del beneficiario no es válida");
    }
    
    // Normalizar la dirección (aplicar checksum) - esto no intenta resolver ENS
    let normalizedRecipient: string;
    try {
      normalizedRecipient = ethers.getAddress(recipient);
    } catch (e) {
      return setError("La dirección del beneficiario no es válida");
    }
    
    try {
      setSending(true);
      
      // Obtener el timestamp del bloque actual de Ethereum (no Date.now())
      const provider = new ethers.BrowserProvider(getEthereum() as any);
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      if (!block?.timestamp) {
        throw new Error("No se pudo obtener el timestamp del bloque");
      }
      const currentTimestamp = Number(block.timestamp);
      
      const amount = ethers.parseEther(amountEth || "0");
      if (amount === 0n) {
        throw new Error("El monto debe ser mayor a 0");
      }
      
      // Calcular deadline basado en el timestamp del bloque + horas
      const deadline = BigInt(currentTimestamp + deadlineHours * 3600);
      
      console.log(`[CreateProposal] Creando propuesta con deadline: ${deadline} (timestamp actual: ${currentTimestamp}, horas: ${deadlineHours})`);
      
      const c = await contract.get();
      // Usar la dirección normalizada (sin ENS)
      const tx = await c.createProposal(normalizedRecipient, amount, deadline, description);
      await tx.wait();
      setInfo("Propuesta creada correctamente");
      
      // Limpiar formulario
      setRecipient("");
      setAmountEth("1.0");
      setDeadlineHours(24);
      setDescription("");
      
      // Disparar evento para refrescar la lista de propuestas
      window.dispatchEvent(new Event('proposalCreated'));
    } catch (e: any) {
      // Ignorar errores relacionados con ENS
      if (e?.code === "UNSUPPORTED_OPERATION" && e?.operation === "getEnsAddress") {
        setError("La red local no soporta nombres ENS. Por favor, usa una dirección completa (0x...)");
      } else {
        const errorMsg = parseTransactionError(e);
        setError(errorMsg);
      }
      console.error("Error al crear propuesta:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-2xl font-semibold text-neutral-800">Crear Propuesta</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-700">Beneficiario</label>
          <input
            className={`border px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
              recipient && !recipientValid
                ? "border-red-300 focus:ring-red-500"
                : recipient && recipientValid
                ? "border-emerald-300 focus:ring-emerald-500"
                : "border-neutral-300 focus:ring-emerald-500"
            }`}
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          {recipient && !recipientValid && (
            <p className="text-xs text-red-600">Dirección inválida</p>
          )}
          {recipientNormalized && recipientNormalized !== recipient && (
            <p className="text-xs text-neutral-500">
              Normalizada: <span className="font-mono">{recipientNormalized}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-neutral-700">Monto (ETH)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                className="border border-neutral-300 px-4 py-2.5 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                placeholder="0.00"
              />
              <span className="text-neutral-600 font-medium">ETH</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-32">
            <label className="text-sm font-medium text-neutral-700">Deadline</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="border border-neutral-300 px-4 py-2.5 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(parseInt(e.target.value || "0", 10))}
              />
              <span className="text-sm text-neutral-600">h</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-700">Descripción</label>
          <textarea
            className="border border-neutral-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={4}
            placeholder="Describe la propuesta..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <button
        onClick={onCreate}
        disabled={sending || !address || !recipientValid || !recipient || !amountEth || parseFloat(amountEth) <= 0}
        className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
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


