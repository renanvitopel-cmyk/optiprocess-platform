interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

/** Barra de abas simples (fichas densas como a do ativo) - so estado local, sem
 * sincronizar com a URL, pra manter simples. */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="mb-6 overflow-x-auto border-b border-gray-200">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-navy-700 text-navy-900"
                : "border-transparent text-graphite-500 hover:border-gray-300 hover:text-graphite-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
