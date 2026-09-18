import { useEffect, useState } from "react";
import { GlassWater, Percent, Truck } from "lucide-react";

const messages = [
  { Icon: Percent, text: "Smart savings start here", cta: "Subscribe", go: "plan" },
  { Icon: GlassWater, text: "Stay cool, stay hydrated", cta: "Order now", go: "shop" },
  { Icon: Truck, text: "Free delivery over AED 50", cta: "Shop deals", go: "deals" },
] as const;

export function PromoBar({ onCta }: { onCta: (go: string) => void }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % messages.length), 4500);
    return () => clearInterval(id);
  }, []);

  const m = messages[i]!;

  return (
    <div className="bg-aqua-soft px-screen flex h-12 items-center gap-2 rounded-t-3xl xs:gap-3">
      <m.Icon className="h-4 w-4 shrink-0 text-brand" />
      {/* min-w-0 lets the message truncate instead of pushing the CTA off-screen
          on narrow phones. */}
      <p key={i} className="animate-fade min-w-0 flex-1 truncate text-f-xs font-semibold text-foreground">
        {m.text}
      </p>
      <button
        onClick={() => onCta(m.go)}
        className="shrink-0 text-f-xs font-extrabold whitespace-nowrap text-brand"
      >
        {m.cta}
      </button>
      {/* Dots are decoration; they're the first thing to go when space is tight. */}
      <span className="hidden shrink-0 items-center gap-1 xs:flex">
        {messages.map((_, n) => (
          <span key={n} className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-brand" : "bg-brand/25"}`} />
        ))}
      </span>
    </div>
  );
}