"use client";

type TabId = "fund" | "create" | "proposals";

export function Sidebar({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  const tabs = [
    { id: "fund" as TabId, label: "Financiar DAO", icon: "" },
    { id: "create" as TabId, label: "Crear Propuesta", icon: "" },
    { id: "proposals" as TabId, label: "Propuestas", icon: "" },
  ];

  return (
    <aside className="w-64 border-r border-neutral-200 bg-white min-h-[calc(100vh-73px)] flex-shrink-0 shadow-sm">
      <nav className="p-4">
        <ul className="space-y-2">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md transform scale-[1.02]"
                    : "text-neutral-700 hover:bg-blue-50 hover:text-blue-700 font-medium"
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}


