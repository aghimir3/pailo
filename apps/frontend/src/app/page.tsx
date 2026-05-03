import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleDot,
  Factory,
  Footprints,
  Gem,
  Handshake,
  LockKeyhole,
  PackageCheck,
  Palette,
  Ruler,
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

const metrics = [
  { value: "1000+", label: "Daily capacity target", suffix: "pairs" },
  { value: "6", label: "Production stages", suffix: "steps" },
  { value: "100%", label: "Batch traceability", suffix: "tracked" },
  { value: "Nepal", label: "Made locally", suffix: "origin" },
];

const processSteps = [
  { num: "01", title: "Select", desc: "Premium materials sourced and verified", icon: Gem },
  { num: "02", title: "Cut", desc: "Precision panels from certified stock", icon: Scissors },
  { num: "03", title: "Stitch", desc: "Upper assembly with controlled tension", icon: Target },
  { num: "04", title: "Bond", desc: "Sole attachment under pressure and heat", icon: Zap },
  { num: "05", title: "Inspect", desc: "Multi-point QC before clearance", icon: ShieldCheck },
  { num: "06", title: "Pack", desc: "Labelled, logged, dispatch-ready", icon: PackageCheck },
];

const bentoFeatures = [
  {
    title: "Retail shoe shops",
    desc: "Reliable styles, clear size runs, and batches that make restocking seamless.",
    icon: Handshake,
    span: "wide",
  },
  {
    title: "Supermarkets & chains",
    desc: "Display-ready packing with visible pricing and organized production records.",
    icon: PackageCheck,
    span: "normal",
  },
  {
    title: "Direct buyers",
    desc: "Durable footwear for school, work, and daily movement — made close to the people who wear them.",
    icon: Footprints,
    span: "normal",
  },
  {
    title: "Factory discipline",
    desc: "Every pair moves through planned batches, stage gates, material control, and documented handoff.",
    icon: Factory,
    span: "normal",
  },
  {
    title: "Material traceability",
    desc: "Raw materials, soles, labels, and finished pairs stay connected to the same production record.",
    icon: Boxes,
    span: "wide",
  },
  {
    title: "Practical design",
    desc: "Materials, fit, and finishing chosen for Nepal's streets, schools, shops, and working days.",
    icon: Palette,
    span: "normal",
  },
];

const marqueeItems = [
  "Factory-controlled production",
  "Batch traceability",
  "Retail-ready labels",
  "Quality inspected",
  "Nepal-made",
  "Dispatch-organized",
  "Size-run consistency",
  "Material-tracked",
];

export default function LandingPage() {
  return (
    <main className="lp">
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
          <div className="lp-hero-grain" />
        </div>

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

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <Sparkles aria-hidden="true" size={14} />
            <span>Nepal&rsquo;s precision footwear factory</span>
          </div>
          <h1 className="lp-hero-title">
            <span className="lp-title-line">Shoes built</span>
            <span className="lp-title-line lp-title-accent">with factory</span>
            <span className="lp-title-line">discipline.</span>
          </h1>
          <p className="lp-hero-sub">
            Practical, durable footwear made in Nepal for retail shops, supermarkets, and direct buyers who need
            comfort, consistency, and reliable supply at scale.
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

        <div className="lp-hero-metrics" aria-label="Factory metrics">
          {metrics.map((m) => (
            <div className="lp-metric" key={m.label}>
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Marquee ─── */}
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i}>
              <CircleDot size={10} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Process ─── */}
      <section className="lp-process" id="process" aria-label="Manufacturing process">
        <div className="lp-section-header">
          <span className="lp-eyebrow">How it&rsquo;s made</span>
          <h2>Six stages. Zero shortcuts.</h2>
          <p>Every Pailo pair moves through a controlled production line — from material selection to dispatch-ready packing.</p>
        </div>
        <div className="lp-process-grid">
          {processSteps.map((step) => (
            <article className="lp-step" key={step.num}>
              <div className="lp-step-num">{step.num}</div>
              <step.icon aria-hidden="true" size={22} className="lp-step-icon" />
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Bento Partners ─── */}
      <section className="lp-bento" id="partners" aria-label="Who we serve and how">
        <div className="lp-section-header">
          <span className="lp-eyebrow">Built for partners</span>
          <h2>From shop shelves to school corridors.</h2>
          <p>Pailo serves retailers, chains, and direct customers with the same factory discipline and batch consistency.</p>
        </div>
        <div className="lp-bento-grid">
          {bentoFeatures.map((feat) => (
            <article className={`lp-bento-card ${feat.span === "wide" ? "lp-bento-wide" : ""}`} key={feat.title}>
              <feat.icon aria-hidden="true" size={24} className="lp-bento-icon" />
              <h3>{feat.title}</h3>
              <p>{feat.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Quality / Trust ─── */}
      <section className="lp-quality" id="quality" aria-label="Quality commitment">
        <div className="lp-quality-content">
          <span className="lp-eyebrow">The Pailo standard</span>
          <h2>Every public promise needs a disciplined production floor behind it.</h2>
          <div className="lp-quality-points">
            <div className="lp-quality-point">
              <CheckCircle2 aria-hidden="true" size={20} />
              <span>Built for customers who need shoes that survive real daily movement.</span>
            </div>
            <div className="lp-quality-point">
              <CheckCircle2 aria-hidden="true" size={20} />
              <span>Made close to the market, with room for practical feedback and batch improvement.</span>
            </div>
            <div className="lp-quality-point">
              <CheckCircle2 aria-hidden="true" size={20} />
              <span>Backed by a factory system that keeps quality, labels, and dispatch organized.</span>
            </div>
          </div>
          <div className="lp-quality-cta">
            <Button asChild className="lp-cta-primary">
              <Link href="#partners">
                <Ruler aria-hidden="true" size={17} />
                Explore partnership
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </Button>
          </div>
        </div>
        <div className="lp-quality-visual" aria-hidden="true">
          <div className="lp-dispatch-card">
            <Truck aria-hidden="true" size={28} />
            <strong>Dispatch-ready</strong>
            <span>Labels, packing, and records aligned before every pair leaves the factory.</span>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="lp-footer">
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
      </footer>
    </main>
  );
}