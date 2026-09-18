import { useEffect, useRef, useState } from "react";
import { ChevronRight, HelpCircle, Info, Star, X } from "lucide-react";
import video1 from "@/assets/side-video-1.mp4";
import video1Poster from "@/assets/video/video-1-poster.jpg";
import video2 from "@/assets/p1-video-white.mp4";
import logo from "@/assets/logo-2.png";
import { APP_VERSION } from "@/lib/abraaj-data";

const items = [
  { id: "about", label: "About Abraaj", Icon: Info },
  { id: "help", label: "Help & FAQs", Icon: HelpCircle },
  { id: "rate", label: "Rate the app", Icon: Star },
] as const;

// Video banner carousel — add more clips here (e.g. video2 / video2Poster)
// and they'll play in sequence, looping back to the first when done.
const heroVideos = [
  { src: video1, },
  { src: video2, },
];

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
  const [videoIndex, setVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Reset to the first clip each time the drawer opens.
  useEffect(() => {
    if (open) setVideoIndex(0);
  }, [open]);

  // When a clip ends, advance to the next one (looping back to the start).
  const handleVideoEnded = () => {
    setVideoIndex((prev) => (prev + 1) % heroVideos.length);
  };

  if (!open) return null;

  const currentVideo = heroVideos[videoIndex]!;

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
        {/* Video banner carousel — cycles through heroVideos, auto-advancing
            when each clip ends. Falls back to the poster on slow connections. */}
        <div className="relative h-[clamp(14rem,40dvh,20rem)] shrink-0 overflow-hidden">
          <video
            key={currentVideo.src}
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={currentVideo.src}
            poster={currentVideo.poster}
            preload="auto"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand/85 via-brand/25 to-brand/45" />

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

          {/* Progress dots showing which clip is playing — only shown with more than one */}
          {heroVideos.length > 1 && (
            <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
              {heroVideos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === videoIndex ? "w-4 bg-background" : "w-1.5 bg-background/50"
                  }`}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => {
              onViewAll();
              onClose();
            }}
            className="absolute right-4 bottom-14 left-4 z-20 flex items-center justify-between gap-2 rounded-2xl bg-background px-4 py-3 text-f-sm font-bold text-brand shadow-[0_14px_30px_-12px_rgba(4,20,60,0.6)]"
          >
            <span className="truncate">View all products</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>

          {/* Marquee pinned flush to the very bottom edge of the video banner */}
          <div className="absolute right-0 bottom-0 left-0 z-20">
            <Ribbon text="Return refreshed" className="text-brand" diagonal={false} />
          </div>
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

/** Scrolling ribbon used on the drawer hero and the category banners.
 *  Pass `diagonal={false}` for a flat horizontal strip that sits in normal
 *  document flow (e.g. pinned to the bottom of the video banner) instead of
 *  the rotated overlay version. */
export function Ribbon({
  text,
  className = "",
  diagonal = true,
}: {
  text: string;
  className?: string;
  diagonal?: boolean;
}) {
  const content = (
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
  );

  if (!diagonal) {
    return (
      <div className="pointer-events-none w-full overflow-hidden bg-background/90 py-1.5">
        {content}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 w-[180%] -translate-x-1/2 -translate-y-1/2 -rotate-[62deg] overflow-hidden bg-background/90 py-0.5 xs:py-1">
      {content}
    </div>
  );
}