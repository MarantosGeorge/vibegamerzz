/**
 * The two views of the app. Library holds the games you own; Wishlist holds the
 * titles you do not (docs/adr/0005) — two different kinds of thing, which is
 * why they are two tabs rather than one list with a filter on it.
 *
 * The counts live in the header, per tab, never side by side. See docs/adr/0001
 * for why this app refuses to put two independent totals on one line.
 */
export const TABS = ["library", "wishlist"] as const;
export type Tab = (typeof TABS)[number];

export const TAB_LABELS: Record<Tab, string> = {
  library: "Library",
  wishlist: "Wishlist",
};

interface TabsProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Library or wishlist">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`tab-${tab}`}
          aria-selected={active === tab}
          aria-controls={`panel-${tab}`}
          className={active === tab ? "tab on" : "tab"}
          onClick={() => onChange(tab)}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
