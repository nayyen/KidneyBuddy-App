"use client";

/**
 * CommunityFeed.tsx — community feed with category + therapy filters
 * (COMMUNITY-01, D-05/D-06/D-07).
 *
 * Filtering is server-side: changing the active category/therapy pill
 * refetches GET /api/community?kategori=...&metodeTerapi=... rather than
 * filtering a client-held array. Default filters ("Semua" for both rows)
 * fetch all posts (no query params) — D-06 explicitly forbids auto-filtering
 * to the viewer's own therapy method on load. The feed is already
 * newest-first from the API (D-07) — no client-side .sort() here.
 */
import { useCallback, useEffect, useState } from "react";
import { Users, Plus } from "lucide-react";
import { authFetch } from "@/lib/api";
import PostCard, { type PostItem } from "@/components/komunitas/PostCard";
import CreatePostSheet from "@/components/komunitas/CreatePostSheet";

interface CommunityFeedProps {
  accessToken: string;
}

type KategoriFilter = "Semua" | "Pertanyaan" | "Berbagi Pengalaman" | "Informasi";
type MetodeFilter = "Semua" | "CAPD" | "HD" | "Transplantasi" | "Umum";

const KATEGORI_FILTERS: KategoriFilter[] = [
  "Semua",
  "Pertanyaan",
  "Berbagi Pengalaman",
  "Informasi",
];
const METODE_FILTERS: MetodeFilter[] = ["Semua", "CAPD", "HD", "Transplantasi", "Umum"];

const KATEGORI_TO_ENUM: Record<Exclude<KategoriFilter, "Semua">, PostItem["kategori"]> = {
  Pertanyaan: "pertanyaan",
  "Berbagi Pengalaman": "berbagi_pengalaman",
  Informasi: "informasi",
};

export default function CommunityFeed({ accessToken }: CommunityFeedProps) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeKategori, setActiveKategori] = useState<KategoriFilter>("Semua");
  const [activeMetode, setActiveMetode] = useState<MetodeFilter>("Semua");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const params = new URLSearchParams();
      if (activeKategori !== "Semua") {
        params.set("kategori", KATEGORI_TO_ENUM[activeKategori]);
      }
      if (activeMetode !== "Semua") {
        params.set("metodeTerapi", activeMetode);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await authFetch<{ posts: PostItem[] }>(
        `/api/community${query}`,
        accessToken,
      );
      setPosts(res.posts ?? []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, activeKategori, activeMetode]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreated = () => {
    setIsCreateOpen(false);
    fetchPosts();
  };

  return (
    <div className="space-y-3">
      {/* "Buat Postingan" CTA */}
      <button
        type="button"
        onClick={() => setIsCreateOpen(true)}
        className="w-full flex items-center justify-center gap-2 font-sans font-bold transition-colors"
        style={{
          height: 44,
          borderRadius: 20,
          fontSize: 14,
          backgroundColor: "#2a9d8f",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Plus size={18} />
        Buat Postingan
      </button>

      {/* Category filter chips (D-05) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {KATEGORI_FILTERS.map((filter) => {
          const isActive = activeKategori === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveKategori(filter)}
              aria-current={isActive ? "true" : undefined}
              className="shrink-0 font-sans font-bold transition-colors"
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
              {filter}
            </button>
          );
        })}
      </div>

      {/* Therapy-method filter chips (D-06 — defaults to ALL posts shown) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {METODE_FILTERS.map((filter) => {
          const isActive = activeMetode === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveMetode(filter)}
              aria-current={isActive ? "true" : undefined}
              className="shrink-0 font-sans font-bold transition-colors"
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
              {filter}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p
          className="font-sans text-center py-8"
          style={{ fontSize: 14, color: "#3d6b66" }}
        >
          Memuat...
        </p>
      )}

      {!isLoading && hasError && (
        <div className="flex flex-col items-center text-center py-8">
          <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
            Gagal memuat konten. Periksa koneksi internet Anda, lalu coba lagi.
          </p>
          <button
            type="button"
            onClick={fetchPosts}
            className="mt-2 font-sans font-medium"
            style={{ fontSize: 13, color: "#2a9d8f", textDecoration: "underline" }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !hasError && posts.length === 0 && (
        <div className="flex flex-col items-center text-center py-16">
          <Users size={48} style={{ color: "#cfe8e4" }} className="mb-3" />
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Belum Ada Diskusi
          </p>
          <p
            className="font-sans mt-1"
            style={{ fontSize: 12, color: "#7a8c8a", maxWidth: 280 }}
          >
            Jadi yang pertama berbagi cerita, bertanya, atau memberi informasi di sini.
          </p>
        </div>
      )}

      {!isLoading && !hasError && posts.length > 0 && (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <CreatePostSheet
        accessToken={accessToken}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
