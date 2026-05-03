import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalog | Pailo Shoes",
  description: "Browse our collection of Nepal-made shoes — durable, comfortable, and built for daily life.",
};

interface CatalogItem {
  id: string;
  image_filename: string;
  caption: string;
  alt_text: string;
  price: string;
}

async function getCatalogItems(): Promise<CatalogItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
    const res = await fetch(`${baseUrl}/api/v1/catalog`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Only show items that have all required fields filled
    return (data.items ?? []).filter(
      (item: CatalogItem) => item.image_filename && item.caption && item.alt_text && item.price
    );
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const items = await getCatalogItems();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

  return (
    <main className="catalog-page">
      {/* ─── Nav ─── */}
      <header className="catalog-nav">
        <Link aria-label="Back to home" className="catalog-back" href="/">
          <ArrowLeft size={16} />
          <span className="catalog-brand-mark">P</span>
          <span className="catalog-brand-text">Pailo</span>
        </Link>
        <div className="catalog-nav-end">
          <a href="tel:9852030953" className="catalog-phone">
            <Phone aria-hidden="true" size={14} />
            <span>9852030953</span>
          </a>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="catalog-hero">
        <h1>Our Collection</h1>
        <p>Durable, comfortable footwear made in Nepal — built for daily life.</p>
      </section>

      {/* ─── Grid ─── */}
      {items.length === 0 ? (
        <section className="catalog-empty">
          <p>No catalog items available yet. Check back soon!</p>
          <Button asChild variant="glass">
            <Link href="/">
              <ArrowLeft size={15} />
              Back to home
            </Link>
          </Button>
        </section>
      ) : (
        <section className="catalog-grid-section">
          <div className="catalog-grid">
            {items.map((item) => (
              <article className="catalog-card" key={item.id}>
                <div className="catalog-card-image">
                  <Image
                    src={`${baseUrl}/api/v1/catalog/images/${item.image_filename}`}
                    alt={item.alt_text}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="catalog-card-info">
                  <h3>{item.caption}</h3>
                  <span className="catalog-card-price">{item.price}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ─── Footer ─── */}
      <footer className="catalog-footer">
        <div className="catalog-footer-inner">
          <Link href="/" className="catalog-footer-brand">
            <span className="catalog-brand-mark">P</span>
            <strong>Pailo Shoes</strong>
          </Link>
          <Link className="catalog-staff-link" href="/portal">
            Staff portal
          </Link>
        </div>
      </footer>
    </main>
  );
}
