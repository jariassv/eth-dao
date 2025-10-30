import Image from "next/image";
import { ConnectWallet } from "../components/ConnectWallet";
import { FundingPanel } from "../components/FundingPanel";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-6 gap-8 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-stretch gap-6 w-full">
          <ConnectWallet />
          <FundingPanel />
        </div>
      </main>
    </div>
  );
}
