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
    return Response.json({ error: e?.message ?? "relay_failed" }, { status: 500 });
  }
}


