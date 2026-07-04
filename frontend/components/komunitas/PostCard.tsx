"use client";

/**
 * PostCard.tsx — community feed preview card (COMMUNITY-01).
 *
 * Rendered by CommunityFeed inside a vertical list, linking to the post
 * detail route (06-07 scope). `isi` preview is rendered as a plain JSX text
 * child only (React auto-escapes it, whitespace-pre-wrap + line-clamp-2) —
 * no raw-HTML injection API is used anywhere in this component (T-06-15).
 *
 * Category + therapy-tag badge colors and typography per 06-UI-SPEC.md.
 */
import Link from "next/link";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface PostItem {
  id: string;
  judul: string;
  isi: string;
  kategori: "pertanyaan" | "berbagi_pengalaman" | "informasi";
  metodeTerapi: "CAPD" | "HD" | "Transplantasi" | "Umum";
  createdAt: string;
  authorName?: string | null;
  replyCount?: number;
  helpfulTotal?: number;
}

const KATEGORI_LABEL: Record<PostItem["kategori"], string> = {
  pertanyaan: "Pertanyaan",
  berbagi_pengalaman: "Berbagi Pengalaman",
  informasi: "Informasi",
};

const THERAPY_BADGE: Record<
  PostItem["metodeTerapi"],
  { label: string; color: string; bg: string }
> = {
  CAPD: { label: "CAPD", color: "#2a9d8f", bg: "#f0faf9" },
  HD: { label: "Hemodialisis", color: "#ef9f27", bg: "#fdf3e3" },
  Transplantasi: { label: "Transplantasi", color: "#6b5ca5", bg: "#f1eef9" },
  Umum: { label: "Umum", color: "#7a8c8a", bg: "#f3ede5" },
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

interface PostCardProps {
  post: PostItem;
}

export default function PostCard({ post }: PostCardProps) {
  const kategoriBadge = KATEGORI_LABEL[post.kategori];
  const therapyBadge = THERAPY_BADGE[post.metodeTerapi];
  const authorName = post.authorName ?? "Anggota Komunitas";
  const replyCount = post.replyCount ?? 0;
  const helpfulTotal = post.helpfulTotal ?? 0;

  return (
    <Link
      href={`/edukasi/komunitas/${post.id}`}
      className="block bg-card transition-colors hover:bg-muted/50"
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 14,
        padding: 14,
      }}
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar size="sm">
          <AvatarFallback style={{ backgroundColor: "#f0faf9", color: "#2a9d8f" }}>
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
        <span
          className="font-sans font-bold"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          {authorName}
        </span>
        <span
          className="font-sans"
          style={{ fontSize: 12, color: "#7a8c8a" }}
        >
          &middot; {formatRelativeTime(post.createdAt)}
        </span>
      </div>

      {/* Title */}
      <h3
        className="font-heading font-bold"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        {post.judul}
      </h3>

      {/* Content preview — plain JSX text child, no raw-HTML injection API */}
      <p
        className="font-sans mt-1 whitespace-pre-wrap line-clamp-2"
        style={{ fontSize: 13, color: "#3d6b66", lineHeight: 1.5 }}
      >
        {post.isi}
      </p>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <Badge
          className="font-sans font-bold border-transparent"
          style={{ fontSize: 12, color: "#3d6b66", backgroundColor: "#f3ede5" }}
        >
          {kategoriBadge}
        </Badge>
        <Badge
          className="font-sans font-bold border-transparent"
          style={{ fontSize: 12, color: therapyBadge.color, backgroundColor: therapyBadge.bg }}
        >
          {therapyBadge.label}
        </Badge>
      </div>

      {/* Footer counts */}
      <div className="flex items-center gap-4 mt-3">
        <span
          className="font-sans font-bold inline-flex items-center gap-1"
          style={{ fontSize: 12, color: "#7a8c8a" }}
        >
          <MessageCircle size={14} />
          {replyCount}
        </span>
        <span
          className="font-sans font-bold inline-flex items-center gap-1"
          style={{ fontSize: 12, color: "#7a8c8a" }}
        >
          <ThumbsUp size={14} />
          {helpfulTotal}
        </span>
      </div>
    </Link>
  );
}
