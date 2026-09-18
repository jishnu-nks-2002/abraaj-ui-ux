import { TONES } from "@/components/abraaj/CategoryShowcase";
import { moments } from "@/lib/abraaj-data";
import { useEffect, useRef } from "react";

const INTERVAL = 2500; // ms between auto-scroll steps — raise for slower

export function Moments({ onOpen }: { onOpen?: (id: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  // Duplicate the list so the track can scroll past the end and loop seamlessly.
  const loopItems = [...moments, ...moments];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const id = setInterval(() => {
      if (isPaused.current) return;

      const card = track.firstElementChild as HTMLElement | null;
      if (!card) return;

      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = card.offsetWidth + gap;
      const half = track.scrollWidth / 2;

      track.scrollBy({ left: step, behavior: "smooth" });

      if (track.scrollLeft + step >= half - 1) {
        setTimeout(() => {
          track.scrollLeft -= half;
        }, 700);
      }
    }, INTERVAL);

    return () => clearInterval(id);
  }, []);

  const handleCardClick = (el: HTMLElement, id: string) => {
    const track = trackRef.current;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const cardRect = el.getBoundingClientRect();
      const offset =
        cardRect.left - trackRect.left - trackRect.width / 2 + cardRect.width / 2;
      track.scrollBy({ left: offset, behavior: "smooth" });
    }
    onOpen?.(id);
  };

  return (
    <section className="mt-8 xs:mt-9">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <h3 className="text-f-base font-extrabold whitespace-nowrap text-foreground">Abraaj moments</h3>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div
        ref={trackRef}
        onMouseEnter={() => (isPaused.current = true)}
        onMouseLeave={() => (isPaused.current = false)}
        onTouchStart={() => (isPaused.current = true)}
        onTouchEnd={() => (isPaused.current = false)}
        className="no-scrollbar mx-screen-neg px-screen mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 xs:gap-3"
      >
        {loopItems.map((m, i) => {
          const tone = TONES[m.tone];
          return (
            <button
              key={`${m.id}-${i}`}
              onClick={(e) => handleCardClick(e.currentTarget, m.id)}
              className="relative h-[clamp(12rem,56vw,16rem)] w-[clamp(8.5rem,38vw,11rem)] shrink-0 snap-start overflow-hidden rounded-3xl text-left"
            >
              {m.video ? (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  src={m.video}
                  poster={m.poster}
                  preload="metadata"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  className="absolute inset-0 h-full w-full object-cover"
                  src={m.image}
                  alt={m.title}
                  loading="lazy"
                />
              )}

              <div className={`absolute inset-0 bg-gradient-to-br ${tone.grad} opacity-40`} />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2.5 xs:p-3">
                <p className="truncate text-f-xs font-extrabold text-white">{m.title}</p>
                <p className="truncate text-f-2xs text-white/75">{m.caption}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}