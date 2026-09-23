import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

/**
 * Single-row, continuously auto-sliding carousel.
 *
 * - Seamless loop WITHOUT cloning products: the track is a rotating window over
 *   the list. When the leading card has fully left the screen it is moved to the
 *   tail (and vice-versa when dragging backwards), so every product exists once.
 * - Motion is a velocity that eases toward a target speed: full speed normally,
 *   slowed on mouse hover, stopped while touching / dragging / keyboard-focused.
 *   Easing gives smooth slow-downs and a natural fling after a swipe.
 * - Touch + mouse drag via pointer events (`touch-action: pan-y` keeps vertical
 *   page scroll working). A drag never triggers the card's click.
 * - Respects prefers-reduced-motion (no autoplay, drag still works), pauses when
 *   off-screen, and falls back to a plain swipeable row if there are too few
 *   products to loop without a visible seam.
 */
const AUTO_SPEED = 30; // px / second
const HOVER_FACTOR = 0.2; // fraction of AUTO_SPEED while hovered
const EASE = 4; // higher = snappier speed changes
const RESUME_DELAY = 1200; // ms after touch release before auto-slide resumes
const DRAG_THRESHOLD = 6; // px before a press becomes a drag

export function PopularCarousel<T extends { id: string }>({
  items,
  renderItem,
  label = "Popular products",
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  label?: string;
}) {
  const n = items.length;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [start, setStart] = useState(0);
  const [loopable, setLoopable] = useState(true);

  // Mutable animation state (kept out of React state: it changes every frame).
  const s = useRef({
    offset: 0,
    vel: AUTO_SPEED,
    hover: false,
    holding: false,
    focused: false,
    visible: true,
    reduced: false,
    resumeAt: 0,
    pitch: 0,
    gutter: 0,
    dragging: false,
    moved: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    startX: 0,
    startY: 0,
    pointerId: -1,
    suppressClick: false,
  });

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!wrap || !track || !first) return;
    const cs = getComputedStyle(track);
    const gap = parseFloat(cs.columnGap) || 0;
    s.current.pitch = first.offsetWidth + gap;
    s.current.gutter = parseFloat(cs.paddingLeft) || 0;
    // Need enough cards to keep the right edge filled while one card is being recycled.
    setLoopable(n * s.current.pitch >= wrap.clientWidth + s.current.pitch * 2);
  }, [n]);

  const apply = useCallback(() => {
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${-s.current.offset}px,0,0)`;
  }, []);

  // Keeps offset inside [gutter, gutter + pitch) by recycling cards front<->back.
  const normalise = useCallback(() => {
    const st = s.current;
    if (!st.pitch || n < 2) return;
    let shift = 0;
    let o = st.offset;
    while (o >= st.gutter + st.pitch) {
      o -= st.pitch;
      shift += 1;
    }
    while (o < st.gutter) {
      o += st.pitch;
      shift -= 1;
    }
    if (shift !== 0) {
      st.offset = o;
      // Commit the reorder synchronously so the new DOM order and the new
      // transform land in the same frame (no one-frame jump).
      flushSync(() => setStart((prev) => (((prev + shift) % n) + n) % n));
    }
  }, [n]);

  useLayoutEffect(() => {
    measure();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      measure();
      normalise();
      apply();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure, normalise, apply]);

  useEffect(() => {
    const st = s.current;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => (st.reduced = mq.matches);
    onMq();
    mq.addEventListener("change", onMq);

    const wrap = wrapRef.current;
    const io = new IntersectionObserver(([e]) => (st.visible = !!e?.isIntersecting), {
      threshold: 0,
    });
    if (wrap) io.observe(wrap);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.064);
      last = now;
      if (loopable && st.visible && !st.dragging) {
        const held = st.holding || st.focused || now < st.resumeAt;
        const target = st.reduced || held ? 0 : st.hover ? AUTO_SPEED * HOVER_FACTOR : AUTO_SPEED;
        st.vel += (target - st.vel) * (1 - Math.exp(-EASE * dt));
        if (Math.abs(st.vel) > 0.01) {
          st.offset += st.vel * dt;
          normalise();
          apply();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onMq);
      io.disconnect();
    };
  }, [loopable, normalise, apply]);

  /* ---------------------------- pointer / swipe --------------------------- */
  function onPointerDown(e: React.PointerEvent) {
    if (!loopable || (e.pointerType === "mouse" && e.button !== 0)) return;
    const st = s.current;
    st.holding = true;
    st.moved = false;
    st.suppressClick = false;
    st.startX = st.lastX = e.clientX;
    st.startY = st.lastY = e.clientY;
    st.lastT = performance.now();
    st.pointerId = e.pointerId;
    st.vel = 0;
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = s.current;
    if (e.pointerType === "mouse") st.hover = true;
    if (!st.holding || e.pointerId !== st.pointerId) return;
    if (!st.dragging) {
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      st.dragging = true;
      st.suppressClick = true;
      wrapRef.current?.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    const dx = e.clientX - st.lastX;
    const dt = Math.max((now - st.lastT) / 1000, 0.001);
    // Content follows the finger: dragging left (dx < 0) advances the offset.
    st.offset -= dx;
    st.vel = 0.6 * st.vel + 0.4 * (-dx / dt); // smoothed release velocity
    st.lastX = e.clientX;
    st.lastT = now;
    normalise();
    apply();
  }

  function endPointer(e: React.PointerEvent) {
    const st = s.current;
    if (!st.holding || e.pointerId !== st.pointerId) return;
    st.holding = false;
    if (st.dragging) {
      st.dragging = false;
      // Clamp the fling so a hard flick can't whip the row around.
      st.vel = Math.max(-1600, Math.min(1600, st.vel));
      try {
        wrapRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    } else {
      st.vel = 0;
    }
    if (e.pointerType !== "mouse") st.resumeAt = performance.now() + RESUME_DELAY;
    // The click that follows a drag must not open a product.
    if (st.suppressClick) setTimeout(() => (st.suppressClick = false), 0);
  }

  const rotated = Array.from({ length: n }, (_, i) => items[(start + i) % n]!);

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={`mx-screen-neg mt-3 pb-2 select-none ${
        loopable ? "overflow-x-clip [touch-action:pan-y]" : "no-scrollbar overflow-x-auto"
      }`}
      style={
        loopable
          ? {
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0, #000 var(--gutter), #000 calc(100% - var(--gutter)), transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0, #000 var(--gutter), #000 calc(100% - var(--gutter)), transparent 100%)",
            }
          : undefined
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") s.current.hover = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") s.current.hover = false;
      }}
      onFocusCapture={() => (s.current.focused = true)}
      onBlurCapture={() => (s.current.focused = false)}
      onClickCapture={(e) => {
        if (s.current.suppressClick) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragStart={(e) => e.preventDefault()}
      // Focusing an off-screen card must not scroll the clipped wrapper.
      onScroll={(e) => {
        if (loopable) e.currentTarget.scrollLeft = 0;
      }}
    >
      <div
        ref={trackRef}
        className="px-screen flex w-max gap-2.5 will-change-transform xs:gap-3"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        {(loopable ? rotated : items).map((item) => (
          <div key={item.id} className="w-[42vw] max-w-[10.5rem] shrink-0">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
