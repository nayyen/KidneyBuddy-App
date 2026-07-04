"use client";

/**
 * EducationList.tsx — fetch + therapy-method filter + loading/empty/error +
 * card list for /edukasi (EDU-01).
 *
 * Filtering is server-side: changing the active therapy-method pill refetches
 * GET /api/education?metodeTerapi=... rather than filtering a client-held
 * array. Default filter ("Semua") fetches all content (no metodeTerapi param).
 *
 * GET /api/education already returns each row's full `isi` body (see
 * educationContent.repository.ts's findAll — no isi-omitting projection), so
 * opening an article's detail reuses the already-fetched item directly; no
 * follow-up GET /api/education/:id round-trip is needed.
 */
import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { authFetch } from "@/lib/api";
import EducationCard, { type EducationItem } from "@/components/edukasi/EducationCard";
import EducationDetail from "@/components/edukasi/EducationDetail";

interface EducationListProps {
  accessToken: string;
}

type TherapyFilter = "Semua" | "CAPD" | "HD" | "Transplantasi" | "Umum";

const FILTERS: TherapyFilter[] = ["Semua", "CAPD", "HD", "Transplantasi", "Umum"];

export default function EducationList({ accessToken }: EducationListProps) {
  const [items, setItems] = useState<EducationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TherapyFilter>("Semua");
  const [selected, setSelected] = useState<EducationItem | null>(null);

  const fetchItems = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const query = activeFilter !== "Semua" ? `?metodeTerapi=${activeFilter}` : "";
      const res = await authFetch<{ content: EducationItem[] }>(
        `/api/education${query}`,
        accessToken,
      );
      setItems(res.content ?? []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, activeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-3">
      {/* Therapy-method filter chip row — server-side refetch on change */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
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
            onClick={fetchItems}
            className="mt-2 font-sans font-medium"
            style={{ fontSize: 13, color: "#2a9d8f", textDecoration: "underline" }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !hasError && items.length === 0 && (
        <div className="flex flex-col items-center text-center py-16">
          <BookOpen size={48} style={{ color: "#cfe8e4" }} className="mb-3" />
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Konten Tidak Ditemukan
          </p>
          <p
            className="font-sans mt-1"
            style={{ fontSize: 12, color: "#7a8c8a", maxWidth: 280 }}
          >
            Coba pilih kategori atau metode terapi lain.
          </p>
        </div>
      )}

      {!isLoading && !hasError && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <EducationCard key={item.id} item={item} onClick={setSelected} />
          ))}
        </div>
      )}

      <EducationDetail item={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
