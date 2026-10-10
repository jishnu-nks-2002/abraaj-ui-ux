import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { coinsToAed, money } from "@/lib/abraaj-data";

const FLIP_MS = 2800;

/**
 * Navbar coin pill. The coin icon stays put while the label loops between the
 * coin count and its AED value with a smooth vertical slide + fade. Both labels
 * share one grid cell, so the pill is always as wide as the longer one and the
 * header never shifts. Pauses while the tab is hidden; reduced-motion users get
 * a plain crossfade.
 */
export function CoinBalance({ coins, onClick }: { coins: number; onClick: () => void }) {
  const [showValue, setShowValue] = useState(false);
  const value = `AED ${money(coinsToAed(coins))}`;

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setShowValue((v) => !v);
    }, FLIP_MS);
    return () => clearInterval(id);
  }, []);

  const base =
    "col-start-1 row-start-1 flex items-center justify-center whitespace-nowrap transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity";

  return (
    <button
      onClick={onClick}
      aria-label={`Your coins: ${coins} coins, worth ${value}`}
      className="flex h-9 min-w-[6.25rem] shrink-0 items-center gap-1.5 rounded-full bg-secondary pr-3.5 pl-1.5 text-brand xs:h-10 xs:min-w-[6.75rem]"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-aqua text-primary-foreground xs:h-7 xs:w-7">
        <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="grid flex-1 overflow-hidden text-center text-f-xs leading-none font-extrabold" aria-hidden="true">
        <span
          className={`${base} ${showValue ? "-translate-y-full opacity-0 motion-reduce:translate-y-0" : "translate-y-0 opacity-100"}`}
        >
          {coins.toLocaleString("en-US")}
        </span>
        <span
          className={`${base} ${showValue ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 motion-reduce:translate-y-0"}`}
        >
          {value}
        </span>
      </span>
    </button>
  );
}
