import type { ReactNode } from "react";

/**
 * Home "Categories" grid — six tiles, each a card-soft surface with the brand
 * line illustration in an aqua icon chip. The parent decides what a tile does;
 * this component only renders and reports the tile id.
 */
export type HomeCategoryId = "offers" | "bottles" | "mosque" | "gallons" | "subscription" | "tissue-ice";

const tiles: { id: HomeCategoryId; label: string; Icon: () => ReactNode }[] = [
  { id: "offers", label: "Offers", Icon: OffersIcon },
  { id: "bottles", label: "Bottles", Icon: BottleIcon },
  { id: "mosque", label: "Mosque", Icon: MosqueIcon },
  { id: "gallons", label: "Gallons", Icon: GallonIcon },
  { id: "subscription", label: "Subscription", Icon: SubscriptionIcon },
  { id: "tissue-ice", label: "Tissue & Ice", Icon: TissueIceIcon },
];

export function HomeCategories({
  onSelect,
  badges = {},
}: {
  onSelect: (id: HomeCategoryId) => void;
  /** Optional count bubble per tile (e.g. items in the subscription cart). */
  badges?: Partial<Record<HomeCategoryId, number>>;
}) {
  return (
    /* `@container` makes the grid respond to the width of the column it lives in
       (not the viewport), so it stays correct if the app shell is ever widened:
       3 × 2 on phones, one 6-up row from ~32rem (tablet), roomier from ~48rem. */
    <section className="@container mt-7" aria-labelledby="home-categories-title">
      <h3 id="home-categories-title" className="text-f-base font-bold text-foreground">
        Categories
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 xs:gap-2.5 @lg:grid-cols-6 @lg:gap-3 @3xl:gap-4">
        {tiles.map(({ id, label, Icon }) => {
          const badge = badges[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-label={badge > 0 ? `${label}, ${badge} in subscription` : label}
              className="card-soft group relative flex min-w-0 flex-col items-center gap-2 rounded-2xl px-1.5 pt-3.5 pb-3 text-center transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_14px_28px_-16px_color-mix(in_oklab,var(--brand)_70%,transparent)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.97] @lg:pt-4 @lg:pb-3.5 @3xl:gap-2.5 @3xl:pt-5 @3xl:pb-4"
            >
              {/* Icon chip: aqua tint at rest, fills to brand on hover/focus. */}
              <span className="bg-aqua-soft grid h-[clamp(2.75rem,12.5vw,3.25rem)] w-[clamp(2.75rem,12.5vw,3.25rem)] place-items-center rounded-2xl text-aqua transition-colors duration-300 group-hover:bg-brand group-hover:text-white group-focus-visible:bg-brand group-focus-visible:text-white @3xl:h-16 @3xl:w-16">
                <span className="h-[72%] w-[72%] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
                  <Icon />
                </span>
              </span>
              <span className="w-full truncate text-f-xs font-bold text-foreground @3xl:text-f-sm">
                {label}
              </span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Line illustrations (64×64, stroke = currentColor)                   */
/* ------------------------------------------------------------------ */

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Small fan mark used on bottle labels. */
function Mark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={1.2}>
      <path d="M0 4 L-4 -0.5 M0 4 L-2.3 -3 M0 4 L0 -4 M0 4 L2.3 -3 M0 4 L4 -0.5" />
    </g>
  );
}

function OffersIcon() {
  return (
    <Svg>
      {/* two bottles */}
      <path d="M15 12h6v3l3 3v12H12V18l3-3z" />
      <path d="M31 12h6v3l3 3v12H28V18l3-3z" />
      <path d="M14.5 10h7M30.5 10h7" />
      <Mark x={18} y={24} />
      <Mark x={34} y={24} />
      {/* crate */}
      <path d="M9 30h34v24H9z" />
      <path d="M9 38h4v8H9M43 38h-4v8h4" />
      {/* percent */}
      <path d="M22 47l8-8" />
      <circle cx={22.5} cy={40} r={1.6} />
      <circle cx={29.5} cy={46} r={1.6} />
      {/* tag */}
      <path d="M41 22l7-3 8 8-3 7-8-8z" />
      <circle cx={46.5} cy={22.5} r={1} />
    </Svg>
  );
}

function BottleIcon() {
  return (
    <Svg>
      <path d="M27 6h10v5H27z" />
      <path d="M27 11l-5 7v38a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V18l-5-7" />
      <path d="M22 24h20M22 40h20" />
      <path d="M22 46c3 1 5-1 7 0s4 1 6 0 5-1 7 0" />
      <Mark x={32} y={32} s={1.2} />
    </Svg>
  );
}

export function MosqueIcon() {
  return (
    <Svg>
      {/* crescent */}
      <path d="M34.5 4.5a4 4 0 1 1-4.5 4.5 3.2 3.2 0 0 0 4.5-4.5z" />
      <path d="M32 13v4" />
      {/* dome */}
      <path d="M20 30c0-7 5.5-11 12-13 6.5 2 12 6 12 13z" />
      <path d="M19 30h26v4H19z" />
      {/* base */}
      <path d="M10 34h44v24H10z" />
      <path d="M6 58h52" />
      {/* arches */}
      <path d="M27 58V47a5 5 0 0 1 10 0v11" />
      <path d="M15 58v-8h6v8M43 58v-8h6v8" />
    </Svg>
  );
}

function GallonIcon() {
  return (
    <Svg>
      <path d="M27 5h10v5H27z" />
      <path d="M28 10v4c-8 1-14 5-14 10v31a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V24c0-5-6-9-14-10v-4" />
      <path d="M14 30h36M14 48h36" />
      <Mark x={32} y={40} s={1.2} />
    </Svg>
  );
}

function SubscriptionIcon() {
  return (
    <Svg>
      {/* circular arrows */}
      <path d="M14 36V22a10 10 0 0 1 10-10h32" />
      <path d="M52 8l4 4-4 4" />
      <path d="M50 28v14a10 10 0 0 1-10 10H8" />
      <path d="M12 48l-4 4 4 4" />
      {/* document */}
      <path d="M22 18h20v26H22z" />
      <path d="M26 34h9M26 38h6" />
      <Mark x={32} y={26} s={1.1} />
      {/* bell */}
      <path d="M38 42c0-4 1.5-6 4-6s4 2 4 6l1.5 2h-11z" />
      <path d="M41 46a1.2 1.2 0 0 0 2 0" />
    </Svg>
  );
}

function TissueIceIcon() {
  return (
    <Svg>
      {/* ice cubes */}
      <path d="M20 7l7 1-1 7-7-1z" />
      <path d="M6 22l6-3 3 6-6 3z" />
      <path d="M49 21l7 1-1 7-7-1z" />
      <path d="M28 20l9-2 3 11-9 2z" />
      {/* tissue */}
      <path d="M25 36c1-4 3-8 3-12M38 36c1-3 3-6 5-9" />
      {/* box */}
      <path d="M10 36h44v18H10z" />
      <Mark x={32} y={45} s={1.2} />
    </Svg>
  );
}
