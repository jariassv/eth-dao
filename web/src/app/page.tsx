"use client";

import { useState } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { FundingPanel } from "../components/FundingPanel";
import { CreateProposal } from "../components/CreateProposal";
import { ProposalList } from "../components/ProposalList";
import { useDaemon } from "../hooks/useDaemon";

type TabId = "fund" | "create" | "proposals";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("proposals");
  
  // Ejecutar daemon cada 30 segundos para ejecutar propuestas automáticamente
  useDaemon(30000, true);

  const renderContent = () => {
    switch (activeTab) {
      case "fund":
        return <FundingPanel />;
      case "create":
        return <CreateProposal />;
      case "proposals":
        return <ProposalList />;
      default:
        return <ProposalList />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      <div className="flex flex-1 justify-center">
        <div className="flex max-w-7xl w-full">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
