import Link from "next/link";
import { AureaLogo } from "@/components/aurea-logo";
import { LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from "@/lib/site";

export function SupportEmail() {
  return SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : <span>the support address on this page (coming soon)</span>;
}

/** Shared layout for the public Privacy Policy and Terms pages. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="legal-page">
    <header className="legal-header">
      <Link className="brand" href="/today" aria-label="Aurea home"><AureaLogo size={30} />Aurea</Link>
      <nav className="legal-nav"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
    </header>
    <article className="legal-body">
      <h1>{title}</h1>
      <p className="legal-meta">Effective {LEGAL_EFFECTIVE_DATE}</p>
      {children}
    </article>
  </div>;
}

/** Small "Privacy · Terms" links for Settings and sign-in screens. */
export function LegalLinks() {
  return <p className="legal-links"><Link href="/privacy">Privacy Policy</Link><span aria-hidden="true">·</span><Link href="/terms">Terms of Service</Link></p>;
}
