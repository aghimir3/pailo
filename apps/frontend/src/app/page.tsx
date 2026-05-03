import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Footprints,
  Handshake,
  Heart,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pailo Shoes | Nepal-made footwear that lasts",
  description:
    "Pailo Shoes — durable, comfortable footwear made in Nepal. Built for daily life, school days, and shop shelves. Quality you can feel, supply you can count on.",
};

const staffPortalUrl = "/portal";
const DEFAULT_CONTACT_PHONE = "9852030953";

async function getContactPhone(): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
    const res = await fetch(`${baseUrl}/api/v1/settings/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_CONTACT_PHONE;
    const settings: { key: string; value: string }[] = await res.json();
    const phone = settings.find((s) => s.key === "contact_phone");
    return phone?.value ?? DEFAULT_CONTACT_PHONE;
  } catch {
    return DEFAULT_CONTACT_PHONE;
  }
}

const valueProps = [
  {
    title: "Built to last",
    desc: "Durable construction that handles Nepal's streets, monsoons, and daily grind without falling apart.",
    icon: Shield,
  },
  {
    title: "Comfortable fit",
    desc: "Practical materials and proven patterns designed for all-day wear — school, work, everywhere.",
    icon: Heart,
  },
  {
    title: "Made in Nepal",
    desc: "Local production means faster restocking, competitive pricing, and shoes built for local conditions.",
    icon: MapPin,
  },
];

const buyerBenefits = [
  {
    title: "Retail shops",
    desc: "Consistent size runs, clean labels, and reliable batch supply that keeps your shelves stocked.",
    icon: Handshake,
    highlight: "Restocking made simple",
  },
  {
    title: "Supermarkets",
    desc: "Display-ready packaging, organized pricing, and production records for easy aisle management.",
    icon: PackageCheck,
    highlight: "Shelf-ready from the box",
  },
  {
    title: "Direct buyers",
    desc: "Quality daily footwear at factory prices — for schools, offices, and families who value durability.",
    icon: Footprints,
    highlight: "Factory price, retail quality",
  },
];

const proofPoints = [
  { icon: Star, text: "Quality-inspected before every dispatch" },
  { icon: RefreshCw, text: "Consistent batches you can reorder with confidence" },
  { icon: Truck, text: "Organized dispatch with full production records" },
  { icon: CheckCircle2, text: "Growing capacity — 1,000+ pairs per day" },
];

export default async function LandingPage() {
  const contactPhone = await getContactPhone();

  return (
    <main className="lp">
      {/* ─── Nav ─── */}
      <header className="lp-nav">
        <Link aria-label="Pailo Shoes home" className="lp-brand" href="/">
          <span className="lp-brand-mark">P</span>
          <span className="lp-brand-text">Pailo</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Page sections">
          <Link href="#why">Why Pailo</Link>
          <Link href="#buyers">For buyers</Link>
        </nav>
        <div className="lp-nav-end">
          <a href={`tel:${contactPhone}`} className="lp-nav-phone">
            <Phone aria-hidden="true" size={14} />
            <span>{contactPhone}</span>
          </a>
          <Button asChild variant="glass" className="lp-nav-cta">
            <Link href="#buyers">
              Partner with us
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </Button>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="lp-hero" aria-label="Pailo Shoes">
        <div className="lp-hero-bg" aria-hidden="true">
          <Image
            alt=""
            className="lp-hero-img"
            fill
            priority
            sizes="100vw"
            src="/landing/pailo-factory-vision.png"
          />
          <div className="lp-hero-overlay" />
        </div>

        <div className="lp-hero-inner">
          <div className="lp-hero-content">
            <div className="lp-hero-badge">
              <Sparkles aria-hidden="true" size={14} />
              <span>Made in Nepal</span>
            </div>
            <h1 className="lp-hero-title">
              Shoes that last as long as
              <em> your day does.</em>
            </h1>
            <p className="lp-hero-sub">
              Durable, comfortable footwear built for real life — from school runs 
              to shop floors. Nepal-made quality at prices that make sense.
            </p>
            <div className="lp-hero-actions">
              <Button asChild className="lp-cta-primary">
                <Link href="#why">
                  Why Pailo
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </Button>
              <Button asChild variant="glass">
                <Link href="#buyers">
                  <Handshake aria-hidden="true" size={17} />
                  Stock our shoes
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why Pailo ─── */}
      <section className="lp-why" id="why" aria-label="Why Pailo">
        <div className="lp-container">
          <div className="lp-section-header lp-center">
            <span className="lp-eyebrow">Why Pailo</span>
            <h2>Footwear that earns its place in your day.</h2>
          </div>
          <div className="lp-value-grid">
            {valueProps.map((v) => (
              <article className="lp-value-card" key={v.title}>
                <div className="lp-value-icon">
                  <v.icon aria-hidden="true" size={22} />
                </div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── For Buyers ─── */}
      <section className="lp-buyers" id="buyers" aria-label="For buyers and partners">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-eyebrow">For buyers &amp; partners</span>
            <h2>Whether you stock shelves or buy direct — we make it easy.</h2>
          </div>
          <div className="lp-buyer-grid">
            {buyerBenefits.map((b) => (
              <article className="lp-buyer-card" key={b.title}>
                <div className="lp-buyer-icon">
                  <b.icon aria-hidden="true" size={22} />
                </div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
                <span className="lp-buyer-highlight">{b.highlight}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Proof ─── */}
      <section className="lp-proof" aria-label="Quality proof points">
        <div className="lp-container">
          <div className="lp-proof-inner">
            <div className="lp-proof-content">
              <h2>Quality you can see. Supply you can count on.</h2>
              <div className="lp-proof-list">
                {proofPoints.map((p) => (
                  <div className="lp-proof-item" key={p.text}>
                    <p.icon aria-hidden="true" size={18} />
                    <span>{p.text}</span>
                  </div>
                ))}
              </div>
              <div className="lp-proof-cta">
                <Button asChild className="lp-cta-primary">
                  <Link href="#buyers">
                    Start a partnership
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="lp-proof-visual" aria-hidden="true">
              <div className="lp-dispatch-card">
                <Truck aria-hidden="true" size={24} />
                <strong>Ready when you are</strong>
                <span>Every pair leaves with labels, records, and quality checks complete.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-brand-mark">P</span>
            <div>
              <strong>Pailo Shoes</strong>
              <span>Nepal-made footwear that lasts.</span>
            </div>
          </div>
          <nav className="lp-footer-links">
            <Link href="#why">Why Pailo</Link>
            <Link href="#buyers">For buyers</Link>
            <a href={`tel:${contactPhone}`} className="lp-footer-phone">
              <Phone aria-hidden="true" size={13} />
              {contactPhone}
            </a>
          </nav>
          <Link className="lp-staff-link" href={staffPortalUrl}>
            <LockKeyhole aria-hidden="true" size={13} />
            Staff portal
          </Link>
        </div>
      </footer>
    </main>
  );
}