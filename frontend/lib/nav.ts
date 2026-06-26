import { House, ClipboardPen, Bell, BookOpen, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/dashboard", icon: House },
  { label: "Catatan", href: "/catatan", icon: ClipboardPen },
  { label: "Pengingat", href: "/pengingat", icon: Bell },
  { label: "Edukasi", href: "/edukasi", icon: BookOpen },
  { label: "Profil", href: "/profil", icon: User },
];
