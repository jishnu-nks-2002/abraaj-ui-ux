import logo from "@/assets/logo.jpg";

const words = ["Pure.", "Fresh.", "Delivered."];

export function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background bg-water ${
        leaving ? "animate-splash-out" : ""
      }`}
    >
      <div className="relative overflow-hidden px-6">
        <img
          src={logo}
          alt="Abraaj Water"
          className="animate-logo-reveal w-64 max-w-[70vw]"
        />
        <span className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-16 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      </div>

      <div className="absolute bottom-16 flex items-center gap-2">
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
        className="animate-word-up absolute bottom-8 text-[11px] tracking-wide text-muted-foreground"
        style={{ animationDelay: "1.7s" }}
      >
        Bottled in the UAE
      </p>
    </div>
  );
}
