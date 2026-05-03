import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Factory,
  Footprints,
  Gem,
  Handshake,
  LockKeyhole,
  PackageCheck,
  Palette,
  Scissors,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pailo Shoes | Nepal's precision footwear factory",
  description:
    "Pailo Shoes — Nepal-built footwear with factory discipline, material traceability, and retail-ready production for shops, supermarkets, and direct buyers.",
};

const staffPortalUrl = "/portal";

const stats = [
  { value: "1,000+", label: "Pairs / day capacity" },
  { value: "6", label: "Stage production line" },
  { value: "100%", label: "Batch traceability" },
];

const processSteps = [
  { num: "01", title: "Select materials", desc: "Premium stock sourced, inspected, and verified before entering the line.", icon: Gem },
  { num: "02", title: "Cut panels", desc: "Precision-cut upper panels from certified material rolls.", icon: Scissors },
  { num: "03", title: "Stitch uppers", desc: "Multi-needle assembly with controlled tension and pattern alignment.", icon: Target },
  { num: "04", title: "Bond soles", desc: "Heat-press bonding under controlled pressure for lasting adhesion.", icon: Zap },
  { num: "05", title: "Quality check", desc: "Multi-point inspection before any pair gets clearance to pack.", icon: ShieldCheck },
  { num: "06", title: "Pack & label", desc: "Labelled, logged, and dispatch-ready with full production records.", icon: PackageCheck },
];

const partners = [
  {
    title: "Retail shoe shops",
    desc: "Reliable styles, clear size runs, retail-friendly labels, and batches that make restocking seamless.",
    icon: Handshake,
  },
  {
    title: "Supermarkets & chains",
    desc: "Display-ready packing with visible pricing, organized production records, and aisle-friendly packaging.",
    icon: PackageCheck,
  },
  {
    title: "Direct buyers",
    desc: "Durable footwear for school, work, and daily movement — made close to the people who wear them.",
    icon: Footprints,
  },
];

const capabilities = [
  {
    title: "Factory discipline",
    desc: "Every pair moves through planned batches, stage gates, material control, and documented handoff.",
    icon: Factory,
  },
  {
    title: "Material traceability",
    desc: "Raw materials, soles, labels, and finished pairs stay connected to the same production record.",
    icon: Boxes,
  },
  {
    title: "Practical design",
    desc: "Materials, fit, and finishing chosen for Nepal's streets, schools, shops, and working days.",
    icon: Palette,
  },
];

export default function LandingPage() {
  return (
    <main className="lp">
      {/* ─── Nav ─── */}
      <header className="lp-nav">
        <Link aria-label="Pailo Shoes home" className="lp-brand" href="/">
          <span className="lp-brand-mark">P</span>
          <span className="lp-brand-text">Pailo</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Page sections">
          <Link href="#process">Process</Link>
          <Link href="#partners">Partners</Link>
          <Link href="#quality">Quality</Link>
        </nav>
        <div className="lp-nav-end">
          <Button asChild variant="glass" className="lp-nav-cta">
            <Link href="#partners">
              Get in touch
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </Button>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="lp-hero" aria-label="Pailo Shoes hero">
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
              <span>Nepal&rsquo;s precision footwear factory</span>
            </div>
            <h1 className="lp-hero-title">
              Shoes built with
              <em> factory discipline.</em>
            </h1>
            <p className="lp-hero-sub">
              Practical, durable footwear for retail shops, supermarkets, and direct buyers — 
              made in Nepal with material traceability, batch consistency, and reliable supply.
            </p>
            <div className="lp-hero-actions">
              <Button asChild className="lp-cta-primary">
                <Link href="#process">
                  See how we build
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </Button>
              <Button asChild variant="glass">
                <Link href="#partners">
                  <Handshake aria-hidden="true" size={17} />
                  Partner with us
                </Link>
              </Button>
            </div>
          </div>

          <div className="lp-hero-stats" aria-label="Factory stats">
            {stats.map((s) => (
              <div className="lp-stat" key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Process ─── */}
      <section className="lp-process" id="process" aria-label="Manufacturing process">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-eyebrow">Production line</span>
            <h2>Six stages. Zero shortcuts.</h2>
            <p>Every pair moves through a controlled line — from raw material to dispatch-ready packing.</p>
          </div>
          <div className="lp-timeline">
            {processSteps.map((step, i) => (
              <article className="lp-timeline-item" key={step.num}>
                <div className="lp-timeline-marker">
                  <span className="lp-timeline-num">{step.num}</span>
                  {i < processSteps.length - 1 && <div className="lp-timeline-line" />}
                </div>
                <div className="lp-timeline-content">
                  <div className="lp-timeline-icon-wrap">
                    <step.icon aria-hidden="true" size={20} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Partners ─── */}
      <section className="lp-partners" id="partners" aria-label="Who we serve">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-eyebrow">Built for partners</span>
            <h2>From shop shelves to school corridors.</h2>
            <p>We serve retailers, chains, and direct customers with the same factory discipline and batch consistency.</p>
          </div>
          <div className="lp-partner-grid">
            {partners.map((p) => (
              <article className="lp-partner-card" key={p.title}>
                <div className="lp-partner-icon">
                  <p.icon aria-hidden="true" size={24} />
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </article>
            ))}
          </div>

          <div className="lp-capabilities">
            {capabilities.map((c) => (
              <div className="lp-capability" key={c.title}>
                <c.icon aria-hidden="true" size={20} />
                <div>
                  <strong>{c.title}</strong>
                  <span>{c.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quality ─── */}
      <section className="lp-quality" id="quality" aria-label="Quality commitment">
        <div className="lp-container">
          <div className="lp-quality-split">
            <div className="lp-quality-content">
              <span className="lp-eyebrow">The Pailo standard</span>
              <h2>Every promise needs a disciplined factory behind it.</h2>
              <div className="lp-quality-points">
                <div className="lp-quality-point">
                  <CheckCircle2 aria-hidden="true" size={20} />
                  <span>Built for customers who need shoes that survive real daily movement.</span>
                </div>
                <div className="lp-quality-point">
                  <CheckCircle2 aria-hidden="true" size={20} />
                  <span>Made close to the market, with room for feedback and batch improvement.</span>
                </div>
                <div className="lp-quality-point">
                  <CheckCircle2 aria-hidden="true" size={20} />
                  <span>Backed by a factory system that keeps quality, labels, and dispatch organized.</span>
                </div>
              </div>
              <div className="lp-quality-cta">
                <Button asChild className="lp-cta-primary">
                  <Link href="#partners">
                    Explore partnership
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="lp-quality-card" aria-hidden="true">
              <div className="lp-dispatch-card">
                <Truck aria-hidden="true" size={26} />
                <strong>Dispatch-ready pairs</strong>
                <span>Labels, packing, and production records aligned before every pair leaves the factory floor.</span>
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
              <span>Nepal footwear factory &amp; production partner.</span>
            </div>
          </div>
          <nav className="lp-footer-links">
            <Link href="#process">Process</Link>
            <Link href="#partners">Partners</Link>
            <Link href="#quality">Quality</Link>
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