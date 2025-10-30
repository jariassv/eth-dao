export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<any>;
  on?: (event: string, cb: (...args: any[]) => void) => void;
  removeListener?: (event: string, cb: (...args: any[]) => void) => void;
};

export function getEthereum(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

export async function switchToChain(targetChainIdHex: string) {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error("MetaMask no encontrado");
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetChainIdHex }] });
  } catch (err: any) {
    if (err?.code === 4902) {
      throw new Error("La red no está agregada en MetaMask");
    }
    throw err;
  }
}

export function toChainIdHex(chainId: number) {
  return "0x" + chainId.toString(16);
}


