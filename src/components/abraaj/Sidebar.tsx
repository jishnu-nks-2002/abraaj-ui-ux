import { useEffect } from "react";
import { ChevronRight, HelpCircle, Info, Star, X } from "lucide-react";
import video1 from "@/assets/video/video-1.mp4";
import video1Poster from "@/assets/video/video-1-poster.jpg";
import logo from "@/assets/logo-2.png";
import { APP_VERSION, products } from "@/lib/abraaj-data";

const items = [
  { id: "about", label: "About Abraaj", Icon: Info },
  { id: "help", label: "Help & FAQs", Icon: HelpCircle },
  { id: "rate", label: "Rate the app", Icon: Star },
] as const;

export function Sidebar({
  open,
  onClose,
  onViewAll,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onViewAll: () => void;
  onSelect?: (id: string) => void;
}) {
  // Lock the page behind the drawer so the background doesn't scroll with it,
  // and close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-foreground/45"
      />

      {/* Width scales with the viewport but never past 22rem, so the peek of the
          page behind stays proportional on a 320px phone and a 430px one alike.
          Height uses dvh so the iOS URL bar collapsing never clips the menu. */}
      <aside className="animate-drawer absolute inset-y-0 left-0 flex h-[100dvh] w-[min(87vw,22rem)] flex-col overflow-hidden bg-secondary shadow-[0_0_60px_rgba(4,20,60,0.35)]">
        {/* Video hero — the same clip as the splash, so the brand moment carries
            through into the menu. Falls back to the poster on slow connections. */}
        <div className="relative h-[clamp(14rem,40dvh,20rem)] shrink-0 overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={video1}
            poster={video1Poster}
            preload="auto"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand/85 via-brand/25 to-brand/45" />

          <Ribbon text="Return refreshed" className="text-brand" />

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-brand"
          >
            <X className="h-4 w-4" />
          </button>

          <img
            src={logo}
            alt="Abraaj Water"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-4 z-20 h-[clamp(2rem,9vw,2.75rem)] w-auto brightness-0 invert"
          />

          <img
            src={products[2]!.image}
            alt=""
            aria-hidden="true"
            className="animate-float absolute right-3 bottom-[5.5rem] z-10 h-[clamp(6rem,26vw,9.5rem)] w-auto object-contain drop-shadow-[0_14px_30px_rgba(4,20,60,0.45)]"
          />

          <button
            onClick={() => {
              onViewAll();
              onClose();
            }}
            className="absolute right-4 bottom-4 left-4 z-20 flex items-center justify-between gap-2 rounded-2xl bg-background px-4 py-3 text-f-sm font-bold text-brand shadow-[0_14px_30px_-12px_rgba(4,20,60,0.6)]"
          >
            <span className="truncate">View all products</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {items.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                onSelect?.(id);
                onClose();
              }}
              className="flex w-full items-center gap-3 border-b border-border/70 py-4 text-left"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background text-brand xs:h-11 xs:w-11">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-f-sm font-semibold text-foreground">
                {label}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}

          <p className="py-5 text-f-2xs text-muted-foreground">Version {APP_VERSION}</p>
        </nav>
      </aside>
    </div>
  );
}

/** Diagonal scrolling ribbon used on the drawer hero and the category banners. */
export function Ribbon({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 w-[180%] -translate-x-1/2 -translate-y-1/2 -rotate-[62deg] overflow-hidden bg-background/90 py-0.5 xs:py-1">
      <div className="animate-marquee flex w-max">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`px-3 text-f-2xs font-extrabold tracking-[0.2em] whitespace-nowrap uppercase xs:px-4 ${className}`}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}