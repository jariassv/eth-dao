import { NextRequest } from "next/server";
import { ethers } from "ethers";
import { MINIMAL_FORWARDER_ABI } from "../../../lib/forwarder";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { forwarder, request, signature } = body as {
      forwarder: string;
      request: {
        from: string;
        to: string;
        value: string;
        gas: string;
        nonce: string;
        data: string;
      };
      signature: string;
    };

    if (!forwarder || !request || !signature) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const rpcUrl = process.env.RPC_URL;
    let relayerPk = process.env.RELAYER_PRIVATE_KEY;
    if (!rpcUrl || !relayerPk) {
      return Response.json({ error: "server_misconfigured" }, { status: 500 });
    }

    // Normaliza y valida la private key
    relayerPk = relayerPk.trim();
    if (!relayerPk.startsWith("0x")) relayerPk = `0x${relayerPk}`;
    if (relayerPk.length !== 66) {
      return Response.json({ error: "invalid_relayer_private_key_format" }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    let wallet: ethers.Wallet;
    try {
      wallet = new ethers.Wallet(relayerPk, provider);
    } catch {
      return Response.json({ error: "invalid_relayer_private_key" }, { status: 400 });
    }
    const fwd = new ethers.Contract(forwarder, MINIMAL_FORWARDER_ABI as any, wallet);

    // Basic verify before sending
    const ok: boolean = await fwd.verify(
      {
        from: request.from,
        to: request.to,
        value: BigInt(request.value),
        gas: BigInt(request.gas),
        nonce: BigInt(request.nonce),
        data: request.data,
      },
      signature
    );
    if (!ok) {
      return Response.json({ error: "invalid_signature" }, { status: 400 });
    }

    const tx = await fwd.execute(
      {
        from: request.from,
        to: request.to,
        value: BigInt(request.value),
        gas: BigInt(request.gas),
        nonce: BigInt(request.nonce),
        data: request.data,
      },
      signature,
      { gasLimit: 1_000_000 }
    );
    const receipt = await tx.wait();
    return Response.json({ hash: receipt?.hash ?? tx.hash }, { status: 200 });
  } catch (e: any) {
    const code = e?.code;
    const message = e?.message || "";
    let errorMessage = "relay_failed";
    let statusCode = 500;

    // Insufficient funds del relayer
    if (code === "INSUFFICIENT_FUNDS" || message.includes("insufficient funds")) {
      errorMessage = "El relayer no tiene fondos suficientes para pagar el gas. Contacta al administrador.";
      statusCode = 503; // Service Unavailable
    }
    // Invalid signature o verificación fallida
    else if (code === "INVALID_ARGUMENT" || message.includes("invalid signature") || message.includes("signature")) {
      errorMessage = "Firma inválida. Por favor, intenta votar nuevamente.";
      statusCode = 400;
    }
    // Nonce ya usado
    else if (message.includes("nonce") || message.includes("already used")) {
      errorMessage = "Esta transacción ya fue procesada. Por favor, intenta votar nuevamente.";
      statusCode = 409; // Conflict
    }
    // Error de red o transacción revertida
    else if (code === "NETWORK_ERROR" || message.includes("network")) {
      errorMessage = "Error de red. Por favor, intenta más tarde.";
      statusCode = 503;
    }
    else {
      errorMessage = message || "Error desconocido en el relayer.";
    }

    console.error("Error en relayer:", e);
    return Response.json({ error: errorMessage }, { status: statusCode });
  }
}


