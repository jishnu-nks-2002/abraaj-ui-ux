import video1 from "@/assets/video/video-1.mp4";
import video1Poster from "@/assets/video/video-1-poster.jpg";

const words = ["Pure.", "Fresh.", "Delivered."];

export function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-background ${
        leaving ? "animate-splash-out" : ""
      }`}
    >
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
      <div className="absolute inset-0 bg-background/40" />

      {/* Words wrap instead of overflowing on 320px screens, and sit above the home
          indicator on gesture-nav phones. */}
      <div className="absolute inset-x-0 bottom-[max(3.5rem,calc(env(safe-area-inset-bottom)+3rem))] z-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-6">
        {words.map((w, i) => (
          <span
            key={w}
            className="animate-word-up text-f-sm font-semibold tracking-[0.18em] text-brand uppercase"
            style={{ animationDelay: `${1.1 + i * 0.18}s` }}
          >
            {w}
          </span>
        ))}
      </div>
      <p
        className="animate-word-up absolute inset-x-0 bottom-[max(1.75rem,calc(env(safe-area-inset-bottom)+1.25rem))] z-10 text-center text-f-2xs tracking-wide text-muted-foreground"
        style={{ animationDelay: "1.7s" }}
      >
        Bottled in the UAE
      </p>
    </div>
  );
}