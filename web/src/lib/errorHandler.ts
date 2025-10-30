export function parseTransactionError(error: any): string {
  const code = error?.code;
  const message = error?.message || error?.shortMessage || "";
  const reason = error?.reason || "";

  // Insufficient funds
  if (code === "INSUFFICIENT_FUNDS" || message.includes("insufficient funds") || message.includes("insufficient balance")) {
    return "Fondos insuficientes. Asegúrate de tener suficiente ETH en tu cuenta para pagar el gas de la transacción.";
  }

  // User rejected
  if (code === "ACTION_REJECTED" || code === 4001 || message.includes("user rejected") || message.includes("User rejected")) {
    return "Transacción rechazada. Por favor, confirma la transacción en MetaMask.";
  }

  // Network error
  if (code === "NETWORK_ERROR" || message.includes("network") || message.includes("network error")) {
    return "Error de red. Verifica tu conexión y que estés conectado a la red correcta.";
  }

  // Gas estimation failed
  if (message.includes("gas") && (message.includes("estimate") || message.includes("required exceeds"))) {
    return "Error al calcular el gas. La transacción puede fallar. Verifica los parámetros.";
  }

  // Contract revert with reason
  if (reason) {
    return `Error del contrato: ${reason}`;
  }

  // Call exception
  if (code === "CALL_EXCEPTION") {
    if (message.includes("execution reverted")) {
      const revertReason = extractRevertReason(message);
      if (revertReason) {
        return `Transacción revertida: ${revertReason}`;
      }
      return "La transacción fue revertida por el contrato. Verifica que cumples todos los requisitos.";
    }
  }

  // Relay errors
  if (message.includes("relay") || code === "relay_failed") {
    return "Error del servicio relayer. Si estás usando votación gasless, intenta con el checkbox 'Gasless (yo pago gas)' marcado, o verifica que el relayer esté funcionando.";
  }

  // Generic error
  return message || reason || "Error desconocido. Por favor, intenta nuevamente.";
}

function extractRevertReason(message: string): string | null {
  const patterns = [
    /execution reverted: (.+?)(?:\n|$)/i,
    /reverted: (.+?)(?:\n|$)/i,
    /reason="(.+?)"/,
    /revert (.+?)$/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

