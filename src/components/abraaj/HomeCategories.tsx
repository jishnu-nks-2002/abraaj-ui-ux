import type { ReactNode } from "react";

/**
 * Home "Categories" grid — six tiles, each a card-soft surface with a consistent
 * outline icon in an aqua icon chip. The parent decides what a tile does;
 * this component only renders and reports the tile id.
 */
export type HomeCategoryId = "offers" | "bottles" | "mosque" | "gallons" | "subscription" | "tissue-ice";

const tiles: { id: HomeCategoryId; label: string; Icon: () => ReactNode }[] = [
  { id: "offers", label: "Offers", Icon: OffersIcon },
  { id: "bottles", label: "Bottles", Icon: BottleIcon },
  { id: "mosque", label: "Mosque", Icon: CatMosqueIcon },
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
      <div className="mt-4 grid grid-cols-3 gap-3 @lg:grid-cols-6 @lg:gap-3.5 @3xl:gap-5">
        {tiles.map(({ id, label, Icon }) => {
          const badge = badges[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-label={badge > 0 ? `${label}, ${badge} in subscription` : label}
              className="card-soft group relative flex min-w-0 flex-col items-center gap-2.5 rounded-2xl px-2 pt-4 pb-3.5 text-center transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_14px_28px_-16px_color-mix(in_oklab,var(--brand)_70%,transparent)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.97] @lg:pt-5 @lg:pb-4 @3xl:gap-3 @3xl:pt-6 @3xl:pb-5"
            >
              {/* Icon chip: aqua tint at rest, fills to brand on hover/focus. */}
              <span className="bg-aqua-soft grid h-[clamp(3.25rem,15vw,3.75rem)] w-[clamp(3.25rem,15vw,3.75rem)] place-items-center rounded-2xl text-aqua transition-colors duration-300 group-hover:bg-brand group-hover:text-white group-focus-visible:bg-brand group-focus-visible:text-white @3xl:h-[4.5rem] @3xl:w-[4.5rem]">
                <span className="h-[54%] w-[54%] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
                  <Icon />
                </span>
              </span>
              <span className="w-full text-f-sm leading-tight font-semibold tracking-tight text-foreground">
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
/* Category icon set — one family: 24×24 grid, 1.75 rounded outline    */
/* ------------------------------------------------------------------ */

function CatSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function OffersIcon() {
  return (
    <CatSvg>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx={7.5} cy={7.5} r={1} />
      <path d="M10 14l4-4" />
      <circle cx={10.2} cy={10.2} r={0.6} />
      <circle cx={13.8} cy={13.8} r={0.6} />
    </CatSvg>
  );
}

function BottleIcon() {
  return (
    <CatSvg>
      <path d="M10 2h4v3h-4z" />
      <path d="M10 5L8.5 8v12.5A1.5 1.5 0 0 0 10 22h4a1.5 1.5 0 0 0 1.5-1.5V8L14 5" />
      <path d="M8.5 12h7M8.5 17h7" />
    </CatSvg>
  );
}

function GallonIcon() {
  return (
    <CatSvg>
      <path d="M8.5 2h5v3h-5z" />
      <path d="M8.5 5L6 7.5v12.5a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V7.5L13.5 5" />
      <path d="M6 12h11M17 8.5h1.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="M11.5 14.5c-1 1.2-1.6 2-1.6 2.7a1.6 1.6 0 0 0 3.2 0c0-.7-.6-1.5-1.6-2.7z" />
    </CatSvg>
  );
}

function CatMosqueIcon() {
  return (
    <CatSvg>
      <path d="M12 2v2" />
      <path d="M6.5 12c0-3.5 2.5-6 5.5-7.5 3 1.5 5.5 4 5.5 7.5" />
      <path d="M5 12h14v9H5z" />
      <path d="M10 21v-3a2 2 0 0 1 4 0v3" />
      <path d="M2 21h20M2.5 21v-8M21.5 21v-8" />
    </CatSvg>
  );
}

function SubscriptionIcon() {
  return (
    <CatSvg>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      <path d="M12 8.8c-1.3 1.6-2 2.6-2 3.4a2 2 0 0 0 4 0c0-.8-.7-1.8-2-3.4z" />
    </CatSvg>
  );
}

function TissueIceIcon() {
  return (
    <CatSvg>
      <path d="M3 13h13v8H3z" />
      <path d="M6.5 17h6" />
      <path d="M7 13c0-2.5.8-4.2 1.8-6 1.2 1.8 1.4 3.2 3.2 6" />
      <path d="M19 3v7M16 4.7l6 3.6M16 8.3l6-3.6" />
    </CatSvg>
  );
}

/* Brand line illustration — still used by MosqueScreen. */
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

