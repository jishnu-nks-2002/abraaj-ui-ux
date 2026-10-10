import {
  Award,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Droplets,
  FlaskConical,
  HeartHandshake,
  Landmark,
  MessageCircle,
  Repeat,
  ShieldCheck,
  Truck,
} from "lucide-react";
import aboutVideo from "@/assets/side-video-1.mp4";
import aboutPoster from "@/assets/video/video-1-poster.jpg";
import logo from "@/assets/logo-2.png";
import { APP_VERSION, products } from "@/lib/abraaj-data";
import { CyclingImage } from "@/components/abraaj/ProductImages";

const range = [
  { category: "Bottles", title: "Bottles", text: "200 ml to 1.5 L, for desks, cars and dinner tables." },
  { category: "Gallons", title: "5 Gallon", text: "Dispenser bottles for homes, offices and mosques." },
  { category: "Alkaline", title: "Alkaline", text: "Balanced pH 8+ for everyday hydration." },
  { category: "Essentials", title: "Essentials", text: "Tissues and add-ons that ride along with your water." },
] as const;

const journey = [
  { Icon: Droplets, title: "Sourced & filtered", text: "Multi-stage filtration before a single bottle is filled." },
  { Icon: ShieldCheck, title: "Sealed at source", text: "Capped on the line, untouched until you open it." },
  { Icon: Truck, title: "Delivered same day", text: "Our own fleet drops it at your door across Dubai." },
  { Icon: Repeat, title: "Refilled on schedule", text: "Subscriptions keep you stocked — skip or pause any time." },
];

/**
 * Certifications shown in the "Certified quality" section.
 * EDIT THIS LIST: keep only the certificates Abraaj actually holds, and fix the names /
 * issuing bodies to match the real certificates. Each entry becomes one card.
 */
const certifications = [
  {
    Icon: ShieldCheck,
    name: "ISO 22000",
    body: "Food safety management",
    text: "Controls at every step from source to sealed bottle.",
  },
  {
    Icon: Award,
    name: "ISO 9001",
    body: "Quality management",
    text: "Consistent quality, checked and improved continuously.",
  },
  {
    Icon: FlaskConical,
    name: "HACCP",
    body: "Hazard analysis",
    text: "Critical points monitored through filling and packing.",
  },
  {
    Icon: Landmark,
    name: "Dubai Municipality",
    body: "Approved supplier",
    text: "Meets local drinking-water regulations.",
  },
] as const;

export function AboutScreen({
  onBack,
  onShop,
  onMosque,
  onHelp,
}: {
  onBack: () => void;
  onShop: () => void;
  onMosque: () => void;
  onHelp: () => void;
}) {
  return (
    <section className="animate-rise">
      <button
        onClick={onBack}
        className="mt-1 -ml-1 inline-flex items-center gap-1 rounded-full py-1 pr-2 text-f-xs font-semibold text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* Full-bleed video hero, same treatment as the home/showcase banners. */}
      <div className="mx-screen-neg relative mt-2 h-[clamp(13rem,56vw,16rem)] overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={aboutVideo}
          poster={aboutPoster}
          preload="metadata"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand/90 via-brand/35 to-brand/10" />
        <div className="px-screen absolute inset-x-0 bottom-0 pb-5">
          <img src={logo} alt="Abraaj Water" className="h-[clamp(2rem,9vw,2.5rem)] w-auto brightness-0 invert" />
          <h1 className="mt-3 max-w-[90%] text-f-xl font-extrabold tracking-tight text-balance text-white">
            Pure water, delivered by people who care where it goes.
          </h1>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-f-base font-bold text-foreground">Our story</h2>
        <p className="mt-2 text-f-sm text-muted-foreground">
          Abraaj started with a simple promise: clean, great-tasting water that shows up when you need it.
          Today we bottle, seal and deliver it ourselves, so every pack that reaches your home, office or
          local mosque has been in our hands from source to doorstep.
        </p>
      </div>

      <div className="mt-7">
        <h2 className="text-f-base font-bold text-foreground">From source to your door</h2>
        <ol className="mt-3 space-y-2.5">
          {journey.map(({ Icon, title, text }, i) => (
            <li key={title} className="card-soft flex items-start gap-3 rounded-2xl p-3.5">
              <div className="bg-aqua-soft relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand">
                <Icon className="h-[18px] w-[18px]" />
                <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-f-sm font-bold text-foreground">{title}</p>
                <p className="text-f-xs text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Certifications — edit the `certifications` list above to match your real certificates. */}
      <div className="mt-7">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 shrink-0 text-aqua" />
          <h2 className="text-f-base font-bold text-foreground">Certified quality</h2>
        </div>
        <p className="mt-1 text-f-xs text-muted-foreground">
          Our water, plant and deliveries follow recognised food-safety and quality standards.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2.5 xs:gap-3">
          {certifications.map(({ Icon, name, body, text }) => (
            <li key={name} className="card-soft flex min-w-0 flex-col items-center rounded-2xl p-3.5 text-center">
              <div className="bg-aqua-soft grid h-12 w-12 shrink-0 place-items-center rounded-full text-brand ring-2 ring-brand/15 ring-offset-2 ring-offset-background">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-f-sm font-extrabold text-foreground">{name}</p>
              <p className="text-f-2xs font-semibold text-aqua">{body}</p>
              <p className="mt-1 text-f-2xs text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 flex items-center justify-between gap-2">
        <h2 className="text-f-base font-bold text-foreground">What we deliver</h2>
        <button onClick={onShop} className="shrink-0 text-f-xs font-semibold text-brand">
          Shop all
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5 xs:gap-3">
        {range.map((r) => {
          const prod = products.find((p) => p.category === r.category);
          return (
            <div key={r.title} className="card-soft flex min-w-0 flex-col rounded-2xl p-3">
              <div className="flex h-20 items-center justify-center overflow-hidden">
                {prod && <CyclingImage product={prod} className="h-full w-full" />}
              </div>
              <p className="mt-2 text-f-sm font-bold text-foreground">{r.title}</p>
              <p className="text-f-2xs text-muted-foreground">{r.text}</p>
            </div>
          );
        })}
      </div>

      {/* Community — ties About into the new Mosque page. */}
      <div className="mt-7 overflow-hidden rounded-3xl bg-brand p-4 text-primary-foreground">
        <HeartHandshake className="h-6 w-6 text-aqua" />
        <p className="mt-2 text-f-base font-bold">Water for your community</p>
        <p className="mt-1 text-f-xs text-primary-foreground/80">
          Keep a mosque, iftar tent or work site supplied every week. Pick the place, choose the products,
          and we handle the deliveries.
        </p>
        <button
          onClick={onMosque}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-background px-3.5 py-2 text-f-2xs font-semibold text-brand"
        >
          Supply a mosque <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <button
        onClick={onHelp}
        className="card-soft mt-4 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left"
      >
        <div className="bg-aqua-soft grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand">
          <MessageCircle className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-f-sm font-bold text-foreground">Questions?</p>
          <p className="truncate text-f-xs text-muted-foreground">Priority support on WhatsApp for subscribers</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <p className="mt-6 text-center text-f-2xs text-muted-foreground">Abraaj Water · Version {APP_VERSION}</p>
    </section>
  );
}