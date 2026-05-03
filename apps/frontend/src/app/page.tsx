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
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pailo Shoes | Nepal-made footwear that lasts",
  description:
    "Pailo Shoes — durable, comfortable footwear made in Nepal. Built for daily life, school days, and shop shelves. Quality you can feel, supply you can count on.",
};

/* ─── Icon registry ─── */
const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Heart,
  MapPin,
  Handshake,
  PackageCheck,
  Footprints,
  Star,
  RefreshCw,
  Truck,
  CheckCircle2,
  Sparkles,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Star;
}

/* ─── Config types ─── */
interface LandingPageConfig {
  contact_phone: string;
  hero_badge: string;
  hero_title: string;
  hero_title_highlight: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  why_eyebrow: string;
  why_heading: string;
  value_props: { title: string; desc: string; icon: string }[];
  buyers_eyebrow: string;
  buyers_heading: string;
  buyer_cards: { title: string; desc: string; icon: string; highlight: string }[];
  proof_heading: string;
  proof_points: string[];
  proof_cta: string;
  dispatch_card_title: string;
  dispatch_card_text: string;
  footer_tagline: string;
}

const DEFAULTS: LandingPageConfig = {
  contact_phone: "9852030953",
  hero_badge: "Made in Nepal",
  hero_title: "Shoes that last as long as",
  hero_title_highlight: "your day does.",
  hero_subtitle:
    "Durable, comfortable footwear built for real life — from school runs to shop floors. Nepal-made quality at prices that make sense.",
  hero_cta_primary: "Why Pailo",
  hero_cta_secondary: "Stock our shoes",
  why_eyebrow: "Why Pailo",
  why_heading: "Footwear that earns its place in your day.",
  value_props: [
    { title: "Built to last", desc: "Durable construction that handles Nepal's streets, monsoons, and daily grind without falling apart.", icon: "Shield" },
    { title: "Comfortable fit", desc: "Practical materials and proven patterns designed for all-day wear — school, work, everywhere.", icon: "Heart" },
    { title: "Made in Nepal", desc: "Local production means faster restocking, competitive pricing, and shoes built for local conditions.", icon: "MapPin" },
  ],
  buyers_eyebrow: "For buyers & partners",
  buyers_heading: "Whether you stock shelves or buy direct — we make it easy.",
  buyer_cards: [
    { title: "Retail shops", desc: "Consistent size runs, clean labels, and reliable batch supply that keeps your shelves stocked.", icon: "Handshake", highlight: "Restocking made simple" },
    { title: "Supermarkets", desc: "Display-ready packaging, organized pricing, and production records for easy aisle management.", icon: "PackageCheck", highlight: "Shelf-ready from the box" },
    { title: "Direct buyers", desc: "Quality daily footwear at factory prices — for schools, offices, and families who value durability.", icon: "Footprints", highlight: "Factory price, retail quality" },
  ],
  proof_heading: "Quality you can see. Supply you can count on.",
  proof_points: [
    "Quality-inspected before every dispatch",
    "Consistent batches you can reorder with confidence",
    "Organized dispatch with full production records",
    "Growing capacity — 1,000+ pairs per day",
  ],
  proof_cta: "Start a partnership",
  dispatch_card_title: "Ready when you are",
  dispatch_card_text: "Every pair leaves with labels, records, and quality checks complete.",
  footer_tagline: "Nepal-made footwear that lasts.",
};

async function getLandingConfig(): Promise<LandingPageConfig> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
    const res = await fetch(`${baseUrl}/api/v1/settings/landing-page`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return DEFAULTS;
    return { ...DEFAULTS, ...(await res.json()) };
  } catch {
    return DEFAULTS;
  }
}

async function getCatalogCount(): Promise<number> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
    const res = await fetch(`${baseUrl}/api/v1/catalog`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    // Only count items with all fields filled
    return (data.items ?? []).filter(
      (item: { image_filename: string; caption: string; alt_text: string; price: string }) =>
        item.image_filename && item.caption && item.alt_text && item.price
    ).length;
  } catch {
    return 0;
  }
}

export default async function LandingPage() {
  const cfg = await getLandingConfig();
  const catalogCount = await getCatalogCount();

  const proofIcons = [Star, RefreshCw, Truck, CheckCircle2];

  return (
    <main className="lp">
      {/* ─── Nav ─── */}
      <header className="lp-nav">
        <Link aria-label="Pailo Shoes home" className="lp-brand" href="/">
          <span className="lp-brand-mark">P</span>
          <span className="lp-brand-text">Pailo</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Page sections">
          <Link href="#why">{cfg.why_eyebrow}</Link>
          <Link href="#buyers">For buyers</Link>
          {catalogCount > 0 && <Link href="/catalog">Catalog</Link>}
        </nav>
        <div className="lp-nav-end">
          <a href={`tel:${cfg.contact_phone}`} className="lp-nav-phone">
            <Phone aria-hidden="true" size={14} />
            <span>{cfg.contact_phone}</span>
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
              <span>{cfg.hero_badge}</span>
            </div>
            <h1 className="lp-hero-title">
              {cfg.hero_title}
              <em> {cfg.hero_title_highlight}</em>
            </h1>
            <p className="lp-hero-sub">{cfg.hero_subtitle}</p>
            <div className="lp-hero-actions">
              <Button asChild className="lp-cta-primary">
                <Link href="#why">
                  {cfg.hero_cta_primary}
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </Button>
              <Button asChild variant="glass">
                <Link href="#buyers">
                  <Handshake aria-hidden="true" size={17} />
                  {cfg.hero_cta_secondary}
                </Link>
              </Button>
              {catalogCount > 0 && (
                <Button asChild variant="glass">
                  <Link href="/catalog">
                    <ShoppingBag aria-hidden="true" size={17} />
                    View Catalog
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why Pailo ─── */}
      <section className="lp-why" id="why" aria-label={cfg.why_eyebrow}>
        <div className="lp-container">
          <div className="lp-section-header lp-center">
            <span className="lp-eyebrow">{cfg.why_eyebrow}</span>
            <h2>{cfg.why_heading}</h2>
          </div>
          <div className="lp-value-grid">
            {cfg.value_props.map((v) => {
              const Icon = getIcon(v.icon);
              return (
                <article className="lp-value-card" key={v.title}>
                  <div className="lp-value-icon">
                    <Icon aria-hidden="true" size={22} />
                  </div>
                  <h3>{v.title}</h3>
                  <p>{v.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── For Buyers ─── */}
      <section className="lp-buyers" id="buyers" aria-label="For buyers and partners">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-eyebrow">{cfg.buyers_eyebrow}</span>
            <h2>{cfg.buyers_heading}</h2>
          </div>
          <div className="lp-buyer-grid">
            {cfg.buyer_cards.map((b) => {
              const Icon = getIcon(b.icon);
              return (
                <article className="lp-buyer-card" key={b.title}>
                  <div className="lp-buyer-icon">
                    <Icon aria-hidden="true" size={22} />
                  </div>
                  <h3>{b.title}</h3>
                  <p>{b.desc}</p>
                  <span className="lp-buyer-highlight">{b.highlight}</span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Proof ─── */}
      <section className="lp-proof" aria-label="Quality proof points">
        <div className="lp-container">
          <div className="lp-proof-inner">
            <div className="lp-proof-content">
              <h2>{cfg.proof_heading}</h2>
              <div className="lp-proof-list">
                {cfg.proof_points.map((text, i) => {
                  const Icon = proofIcons[i % proofIcons.length];
                  return (
                    <div className="lp-proof-item" key={text}>
                      <Icon aria-hidden="true" size={18} />
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>
              <div className="lp-proof-cta">
                <Button asChild className="lp-cta-primary">
                  <Link href="#buyers">
                    {cfg.proof_cta}
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="lp-proof-visual" aria-hidden="true">
              <div className="lp-dispatch-card">
                <Truck aria-hidden="true" size={24} />
                <strong>{cfg.dispatch_card_title}</strong>
                <span>{cfg.dispatch_card_text}</span>
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
              <span>{cfg.footer_tagline}</span>
            </div>
          </div>
          <nav className="lp-footer-links">
            <Link href="#why">{cfg.why_eyebrow}</Link>
            <Link href="#buyers">For buyers</Link>
            <a href={`tel:${cfg.contact_phone}`} className="lp-footer-phone">
              <Phone aria-hidden="true" size={13} />
              {cfg.contact_phone}
            </a>
          </nav>
          <Link className="lp-staff-link" href="/portal">
            <LockKeyhole aria-hidden="true" size={13} />
            Staff portal
          </Link>
        </div>
      </footer>
    </main>
  );
}
