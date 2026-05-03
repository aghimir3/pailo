import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Factory,
  Gauge,
  LockKeyhole,
  PackageCheck,
  Radar,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pailo Shoes | Future-ready footwear factory",
  description: "A public home for Pailo Shoes with the employee factory portal hosted at app.pailoshoes.com.",
};

const portalUrl = "https://app.pailoshoes.com";

const heroSignals = [
  { label: "Scaling target", value: "1000", detail: "pairs/day operating path" },
  { label: "Factory OS", value: "12", detail: "connected workflow modules" },
  { label: "Launch portal", value: "app", detail: "private employee access" },
];

const capabilities = [
  {
    title: "Production command",
    detail: "Work orders, stages, task boards, blockers, and manager review stay visible from the floor to the office.",
    icon: Factory,
  },
  {
    title: "Inventory truth",
    detail: "Raw material risk, stock movements, supplier context, and finished-goods receipt stay tied to the factory ledger.",
    icon: Boxes,
  },
  {
    title: "Quality gates",
    detail: "QC signals, rework, photo-ready inspections, and dispatch gates protect every production batch before it leaves.",
    icon: ShieldCheck,
  },
  {
    title: "Label control",
    detail: "Pailo style codes, approved template versions, print history, and QR-ready public verification are built into the system.",
    icon: PackageCheck,
  },
];

const operatingLoop = ["Plan batch", "Assign tasks", "Move stock", "Check QC", "Print labels", "Report output"];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero" aria-label="Pailo Shoes public landing page">
        <div className="landing-hero-media" aria-hidden="true">
          <Image
            alt="Futuristic Pailo factory control room with shoe production lines and dashboard panels"
            className="landing-hero-image"
            fill
            priority
            sizes="100vw"
            src="/landing/pailo-factory-vision.png"
          />
        </div>

        <header className="landing-nav" aria-label="Landing navigation">
          <Link aria-label="Pailo Shoes home" className="landing-brand" href="/">
            <span className="landing-brand-mark">P</span>
            <span>
              <strong>Pailo Shoes</strong>
              <small>Nepal factory systems</small>
            </span>
          </Link>
          <div className="landing-nav-actions">
            <ThemeToggle />
            <Button asChild variant="glass">
              <a href={portalUrl}>
                <LockKeyhole aria-hidden="true" size={17} />
                Employee Portal
              </a>
            </Button>
          </div>
        </header>

        <div className="landing-hero-content">
          <div className="landing-copy">
            <p className="landing-kicker">
              <Sparkles aria-hidden="true" size={17} />
              Factory intelligence for the next production leap
            </p>
            <h1>Pailo Shoes</h1>
            <p className="landing-standfirst">
              A future-ready footwear factory in Nepal, building the operating backbone for production planning,
              inventory accuracy, quality control, labels, and daily team execution.
            </p>
            <div className="landing-cta-row">
              <Button asChild className="landing-primary-cta">
                <a href={portalUrl}>
                  <LockKeyhole aria-hidden="true" size={18} />
                  Employee Portal Login
                  <ArrowRight aria-hidden="true" size={18} />
                </a>
              </Button>
              <Button asChild variant="glass">
                <Link href="/portal">
                  <Radar aria-hidden="true" size={18} />
                  Preview Factory Cockpit
                </Link>
              </Button>
            </div>
          </div>

          <div className="landing-signal-grid" aria-label="Pailo operating signals">
            {heroSignals.map((signal) => (
              <div className="landing-signal" key={signal.label}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <small>{signal.detail}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-capability-band" aria-label="Pailo factory capabilities">
        <div className="landing-section-heading">
          <p className="landing-kicker compact">
            <Gauge aria-hidden="true" size={16} />
            Built around real factory motion
          </p>
          <h2>One control loop from raw material to dispatched pair.</h2>
        </div>
        <div className="landing-loop" aria-label="Factory operating loop">
          {operatingLoop.map((step, index) => (
            <div className="landing-loop-step" key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-capabilities" aria-label="Factory operating modules">
        {capabilities.map((capability) => (
          <article className="landing-capability-card" key={capability.title}>
            <capability.icon aria-hidden="true" size={24} />
            <h3>{capability.title}</h3>
            <p>{capability.detail}</p>
          </article>
        ))}
      </section>

      <section className="landing-trust-strip" aria-label="Private factory portal status">
        <div>
          <p className="landing-kicker compact">
            <BadgeCheck aria-hidden="true" size={16} />
            Private launch path
          </p>
          <h2>Public brand at pailoshoes.com, internal operations at app.pailoshoes.com.</h2>
        </div>
        <div className="landing-trust-actions">
          <Button asChild>
            <a href={portalUrl}>
              <ScanLine aria-hidden="true" size={18} />
              Open Employee Portal
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}