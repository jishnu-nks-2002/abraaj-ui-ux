import p200 from "@/assets/p200.png";
import p330 from "@/assets/p330.png";
import palk from "@/assets/palk.png";
import p500 from "@/assets/p500.png";
import p1500 from "@/assets/p1500.png";
import p5gal from "@/assets/p5gal.png";
import ptissue from "@/assets/ptissue.png";

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
