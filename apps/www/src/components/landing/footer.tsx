import { siteConfig } from "@/config/site";
import Link from "next/link";

const footerLinks = [
  { href: "/docs", label: "ドキュメント" },
  { href: "/docs/pricing", label: "料金" },
  { href: "/docs/terms", label: "利用規約", rel: "terms-of-service" },
  { href: "/docs/privacy", label: "プライバシーポリシー", rel: "privacy-policy" },
  { href: "/docs/law", label: "特定商取引法に基づく表記" },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-sm">
            &copy; 2025 {siteConfig.name}. Built for deep work.
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                rel={link.rel}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
