import video1 from "@/assets/video/video-1.mp4";
import video1Poster from "@/assets/video/video-1-poster.jpg";

const words = ["Pure.", "Fresh.", "Delivered."];

export function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-background ${
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

      <div className="absolute z-10 bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {words.map((w, i) => (
          <span
            key={w}
            className="animate-word-up text-sm font-semibold tracking-[0.18em] text-brand uppercase"
            style={{ animationDelay: `${1.1 + i * 0.18}s` }}
          >
            {w}
          </span>
        ))}
      </div>
      <p
        className="animate-word-up absolute z-10 bottom-8 left-1/2 -translate-x-1/2 text-[11px] tracking-wide text-muted-foreground"
        style={{ animationDelay: "1.7s" }}
      >
        Bottled in the UAE
      </p>
    </div>
  );
}