import p200 from "@/assets/p200.png";
import p330 from "@/assets/p330.png";
import palk from "@/assets/palk.png";
import p500 from "@/assets/p500.png";
import p1500 from "@/assets/p1500.png";
import p5gal from "@/assets/p5gal.png";
import ptissue from "@/assets/ptissue.png";
import video1 from "@/assets/video/video-1.mp4";
import video1Poster from "@/assets/video/video-1-poster.jpg";
import banner1 from "@/assets/banner-1.png";
import Banner2 from "@/assets/banner-2.png";
import videop1 from "@/assets/p1-video-white.mp4";
import sidevideo1 from "@/assets/side-video-1.mp4";
import sidevideo2 from "@/assets/side-video-2.mp4";
import moment1 from "@/assets/p-1-video.mp4";
import moment2 from "@/assets/p-2-video.mp4";
import moment3 from "@/assets/p1-video-white.mp4";

export type Product = {
  id: string;
  name: string;
  size: string;
  pack: string;
  price: number;
  category: "Bottles" | "Gallons" | "Alkaline" | "Essentials";
  image: string;
  blurb: string;
};

export const products: Product[] = [
  {
    id: "gal5",
    name: "Abraaj 5 Gallon",
    size: "18.9 L",
    pack: "Single bottle",
    price: 12,
    category: "Gallons",
    image: p5gal,
    blurb: "Home and office dispenser bottle, sealed and delivered fresh.",
  },
  {
    id: "ml500",
    name: "Abraaj 500 ml",
    size: "500 ml",
    pack: "Pack of 24",
    price: 9,
    category: "Bottles",
    image: p500,
    blurb: "The everyday bottle for desks, cars and gym bags.",
  },
  {
    id: "l15",
    name: "Abraaj 1.5 Litre",
    size: "1.5 L",
    pack: "Pack of 6",
    price: 11,
    category: "Bottles",
    image: p1500,
    blurb: "Family size bottle for the dinner table and long days out.",
  },
  {
    id: "alk330",
    name: "Abraaj Alkaline 330 ml",
    size: "330 ml",
    pack: "Pack of 24",
    price: 18,
    category: "Alkaline",
    image: palk,
    blurb: "Balanced pH 8+ alkaline water in a compact bottle.",
  },
  {
    id: "ml330",
    name: "Abraaj 330 ml",
    size: "330 ml",
    pack: "Pack of 24",
    price: 8,
    category: "Bottles",
    image: p330,
    blurb: "Small, light and perfect for meetings and events.",
  },
  {
    id: "ml200",
    name: "Abraaj 200 ml",
    size: "200 ml",
    pack: "Pack of 48",
    price: 14,
    category: "Bottles",
    image: p200,
    blurb: "Mini bottles for kids, cafes and hospitality trays.",
  },
  {
    id: "tissue",
    name: "Abraaj Facial Tissue",
    size: "150 x 2 ply",
    pack: "Box of 5",
    price: 16,
    category: "Essentials",
    image: ptissue,
    blurb: "Soft everyday tissues to add to your water delivery.",
  },
];

export const categories = ["All", "Bottles", "Gallons", "Alkaline", "Essentials"] as const;

export type Plan = {
  id: string;
  name: string;
  every: string;
  discount: string;
  note: string;
};

export const plans: Plan[] = [
  { id: "weekly", name: "Weekly", every: "Every 7 days", discount: "Save 15%", note: "Best for families" },
  { id: "biweekly", name: "Bi-weekly", every: "Every 14 days", discount: "Save 10%", note: "Most popular" },
  { id: "monthly", name: "Monthly", every: "Every 30 days", discount: "Save 5%", note: "Light usage" },
];

/* ------------------------------------------------------------------ */
/* Deal pricing                                                        */
/* ------------------------------------------------------------------ */

/** Percentage knocked off the list price for the one-time deal price. */
export const DEAL_OFF = 10;
/** Percentage knocked off the list price when the customer subscribes. */
export const SUB_OFF = 15;

export function money(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function dealPrices(price: number) {
  return {
    was: price,
    oneTime: price * (1 - DEAL_OFF / 100),
    sub: price * (1 - SUB_OFF / 100),
  };
}

export function byId(id: string) {
  return products.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Hero banner (home carousel) — content-managed, each slide points     */
/* somewhere via `link` instead of a hardcoded onClick.                */
/* ------------------------------------------------------------------ */

/**
 * Where a hero slide's CTA button sends the customer:
 * - "product"  -> opens the product sheet for that exact product id
 * - "category" -> jumps to Shop, pre-filtered to that category
 * - "tab"      -> switches straight to a named app tab (e.g. "plan")
 * Keep the "tab" union in sync with the app's Tab type.
 */
export type HeroLink =
  | { type: "product"; productId: string }
  | { type: "category"; category: (typeof categories)[number] }
  | { type: "tab"; tab: "home" | "shop" | "deals" | "plan" | "cart" | "account" };

export type HeroSlide = {
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  image: string;
  imageAlt: string;
  /** Optional: when provided, the video plays full-bleed instead of the image. */
  video?: string;
  poster?: string;
  link: HeroLink;
};

export const heroSlides: HeroSlide[] = [
  {
    badge: "Subscribe & save",
    title: "Up to 15% off every delivery",
    subtitle: "Pause or skip any time.",
    ctaLabel: "Start a plan",
    // Dummy video slide — swap for a real hero clip whenever one's ready.
    video: videop1,
    poster: video1Poster,
    image: products[0]!.image,
    imageAlt: "Abraaj 5 gallon bottle",
    link: { type: "tab", tab: "plan" },
  },
  {
    badge: "Free delivery",
    title: "Free delivery over AED 50",
    subtitle: "Same-day drop-off across Dubai.",
    ctaLabel: "Shop now",
    image: banner1,
    imageAlt: "Abraaj water bottles",
    link: { type: "category", category: "Bottles" },
  },
  {
    badge: "New",
    title: "Try Abraaj Alkaline",
    subtitle: "Balanced pH 8+ for everyday hydration.",
    ctaLabel: "Explore",
    image: Banner2,
    imageAlt: "Abraaj Alkaline bottle",
    link: {
      type: "product",
      productId: products.find((p) => p.category === "Alkaline")?.id ?? products[0]!.id,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Category showcases (video / photo banner + two deal cards)          */
/* ------------------------------------------------------------------ */

export type Tone = "blue" | "red" | "green" | "sand";

export type Showcase = {
  id: string;
  /** Small label printed between the two hairlines above the banner. */
  label: string;
  headline: string;
  headlineAccent: string;
  /** Text inside the round "starburst" badge on the banner. */
  badge: string;
  /** Repeating text that runs along the diagonal ribbon. */
  ribbon: string;
  tone: Tone;
  /** Optional looping background video for the banner. */
  video?: string;
  poster?: string;
  productIds: string[];
  /** Category the "see all" link filters the shop by. */
  filter: (typeof categories)[number];
};

export const showcases: Showcase[] = [
  {
    id: "pure",
    label: "Pure",
    headline: "Hydrate their day,",
    headlineAccent: "the Abraaj way",
    badge: "Compact to carry",
    ribbon: "Return refreshed",
    tone: "blue",
    video: sidevideo1,
    poster: video1Poster,
    productIds: ["ml330", "ml500"],
    filter: "Bottles",
  },
  {
    id: "alkaline",
    label: "Alkaline",
    headline: "Balance every sip,",
    headlineAccent: "pH 8+ all day",
    badge: "Balanced pH 8+",
    ribbon: "Stay balanced",
    tone: "green",
     video: sidevideo2,
    productIds: ["alk330", "l15"],
    filter: "Alkaline",
  },
  {
    id: "gallons",
    label: "Gallons",
    headline: "Refills at home,",
    headlineAccent: "never run dry",
    badge: "Sealed at source",
    ribbon: "Return refreshed",
    tone: "red",
    video: sidevideo1,
    productIds: ["gal5", "ml200"],
    filter: "Gallons",
  },
  {
    id: "essentials",
    label: "Essentials",
    headline: "Little messes,",
    headlineAccent: "Abraaj has it covered",
    badge: "Gentle on skin",
    ribbon: "Everyday care",
    tone: "sand",
    video: sidevideo2,
    productIds: ["tissue", "ml200"],
    filter: "Essentials",
  },
];

/* ------------------------------------------------------------------ */
/* Moments (tall, swipeable lifestyle cards)                           */
/* ------------------------------------------------------------------ */

export type Moment = {
  id: string;
  title: string;
  caption: string;
  tone: Tone;
  /** Product / lifestyle image sitting on the card. Swap for a photo when you have one. */
  image: string;
  /** Optional looping video used as the card background. */
  video?: string;
  poster?: string;
};

export const moments: Moment[] = [
  {
    id: "m1",
    title: "Bold impression",
    caption: "Alkaline on the move",
    tone: "green",
    image: palk,
    video: moment1,
    poster: video1Poster,
  },
  {
    id: "m2",
    title: "Road trip ready",
    caption: "1.5 L for the long drive",
    tone: "blue",
    image: p1500,
    video: moment2,
    
  },
  {
    id: "m3",
    title: "Desk companion",
    caption: "500 ml, always in reach",
    tone: "red",
    image: p500,
    video: moment3,
    
  },
  {
    id: "m4",
    title: "Kitchen refill",
    caption: "5 gallon, delivered",
    tone: "sand",
    image: p5gal,
    video: sidevideo2,
   
  },
];

/* ------------------------------------------------------------------ */
/* Sidebar menu                                                        */
/* ------------------------------------------------------------------ */

export const APP_VERSION = "1.0.0 (1)";