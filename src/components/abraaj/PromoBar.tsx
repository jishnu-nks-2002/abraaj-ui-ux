import { useEffect, useState } from "react";
import { GlassWater, Percent, Star, Truck } from "lucide-react";

const messages = [
  { Icon: Percent, text: "Smart savings start here", cta: "Subscribe", go: "plan" },
  { Icon: GlassWater, text: "Stay cool, stay hydrated", cta: "Order now", go: "shop" },
  { Icon: Truck, text: "Free delivery over KWD 4", cta: "Shop deals", go: "deals" },
] as const;

export function PromoBar({
  onCta,
  points,
  onPoints,
}: {
  onCta: (go: string) => void;
  /** Customer's points balance, shown on the right of the bar (moved here from the header). */
  points: number;
  onPoints: () => void;
}) {
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
      {/* Points balance (replaces the old slide dots). Opens the Points page. */}
      <button
        onClick={onPoints}
        aria-label={`Your points: ${points}`}
        className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-background px-2.5 text-brand shadow-[0_4px_12px_-8px_rgba(13,42,110,0.6)]"
      >
        <Star className="h-3 w-3 shrink-0 fill-current" />
        <span className="text-f-2xs font-bold whitespace-nowrap tabular-nums">{points.toLocaleString("en-US")}</span>
      </button>
    </div>
  );
}
