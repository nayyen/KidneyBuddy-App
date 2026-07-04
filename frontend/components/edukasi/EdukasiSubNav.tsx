"use client";

/**
 * EdukasiSubNav.tsx — two-pill sub-navigation for the combined Edukasi tab
 * (D-01/D-02/D-03).
 *
 * Unlike /catatan's local-useState pill tabs, this phase uses SEPARATE
 * ROUTES (/edukasi and /edukasi/komunitas) so the community section is
 * bookmarkable/shareable — usePathname() drives the active-pill state
 * instead of a local activeTab variable. Visual styling copied verbatim
 * from catatan/page.tsx's TABS pill block (12px/700, 36px height, 20px
 * radius, active #2a9d8f bg / inactive #f0faf9 bg).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubNavPill {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

const PILLS: SubNavPill[] = [
  {
    href: "/edukasi",
    label: "Edukasi",
    isActive: (pathname) => pathname === "/edukasi",
  },
  {
    href: "/edukasi/komunitas",
    label: "Komunitas",
    isActive: (pathname) => pathname.startsWith("/edukasi/komunitas"),
  },
];

export default function EdukasiSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {PILLS.map((pill) => {
        const isActive = pill.isActive(pathname);
        return (
          <Link
            key={pill.href}
            href={pill.href}
            aria-current={isActive ? "page" : undefined}
            className="shrink-0 font-sans font-bold transition-colors inline-flex items-center justify-center"
            style={{
              fontSize: 12,
              borderRadius: 20,
              paddingLeft: 16,
              paddingRight: 16,
              height: 36,
              backgroundColor: isActive ? "#2a9d8f" : "#f0faf9",
              color: isActive ? "#ffffff" : "#1a2e2c",
            }}
          >
            {pill.label}
          </Link>
        );
      })}
    </div>
  );
}
