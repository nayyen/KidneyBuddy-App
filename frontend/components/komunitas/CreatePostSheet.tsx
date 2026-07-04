"use client";

/**
 * CreatePostSheet.tsx — "Buat Postingan" composer (COMMUNITY-01).
 *
 * Sheet + react-hook-form + zod, mirroring the data-entry form convention
 * established in components/pengingat/MedicationReminderForm.tsx. Client-side
 * zod mirrors the server's createPostSchema (backend/src/services/
 * communityPost.service.ts) so validation fails fast inline (T-06-17) — the
 * server remains authoritative.
 */
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { authFetch } from "@/lib/api";

const createPostFormSchema = z.object({
  judul: z
    .string({ required_error: "Judul wajib diisi" })
    .min(1, "Judul tidak boleh kosong")
    .max(200, "Judul maksimal 200 karakter"),
  isi: z
    .string({ required_error: "Isi wajib diisi" })
    .min(1, "Isi tidak boleh kosong")
    .max(5000, "Isi maksimal 5000 karakter"),
  kategori: z.enum(["pertanyaan", "berbagi_pengalaman", "informasi"], {
    required_error: "Kategori wajib diisi",
  }),
  metodeTerapi: z.enum(["CAPD", "HD", "Transplantasi", "Umum"], {
    required_error: "Metode terapi wajib diisi",
  }),
});

type CreatePostFormData = z.infer<typeof createPostFormSchema>;

const KATEGORI_OPTIONS: { value: CreatePostFormData["kategori"]; label: string }[] = [
  { value: "pertanyaan", label: "Pertanyaan" },
  { value: "berbagi_pengalaman", label: "Berbagi Pengalaman" },
  { value: "informasi", label: "Informasi" },
];

const METODE_OPTIONS: CreatePostFormData["metodeTerapi"][] = [
  "CAPD",
  "HD",
  "Transplantasi",
  "Umum",
];

interface CreatePostSheetProps {
  accessToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreatePostSheet({
  accessToken,
  open,
  onOpenChange,
  onCreated,
}: CreatePostSheetProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostFormSchema),
    defaultValues: {
      judul: "",
      isi: "",
      kategori: undefined,
      metodeTerapi: undefined,
    },
  });

  const watchedKategori = watch("kategori");
  const watchedMetode = watch("metodeTerapi");

  const onSubmit: SubmitHandler<CreatePostFormData> = async (data) => {
    try {
      await authFetch("/api/community", accessToken, {
        method: "POST",
        body: JSON.stringify(data),
      });
      reset();
      onCreated();
    } catch {
      toast.error("Gagal mengirim. Periksa koneksi internet Anda dan coba lagi.");
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
      >
        <SheetHeader className="pb-3 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            Buat Postingan
          </SheetTitle>
        </SheetHeader>

        <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Judul */}
            <div>
              <label
                htmlFor="post-judul"
                className="block font-sans font-medium mb-1"
                style={{ fontSize: 12, color: "#1a2e2c" }}
              >
                Judul
              </label>
              <input
                {...register("judul")}
                id="post-judul"
                maxLength={200}
                placeholder="mis: Bagaimana cara mengatasi kram saat CAPD?"
                className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
                style={{
                  fontSize: 12,
                  color: "#1a2e2c",
                  border: errors.judul ? "1px solid #d4183d" : "0.5px solid #cfe8e4",
                }}
              />
              {errors.judul && (
                <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
                  {errors.judul.message}
                </p>
              )}
            </div>

            {/* Isi */}
            <div>
              <label
                htmlFor="post-isi"
                className="block font-sans font-medium mb-1"
                style={{ fontSize: 12, color: "#1a2e2c" }}
              >
                Isi
              </label>
              <textarea
                {...register("isi")}
                id="post-isi"
                maxLength={5000}
                rows={5}
                placeholder="Tuliskan pertanyaan, pengalaman, atau informasi Anda..."
                className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
                style={{
                  fontSize: 12,
                  color: "#1a2e2c",
                  border: errors.isi ? "1px solid #d4183d" : "0.5px solid #cfe8e4",
                  resize: "vertical",
                }}
              />
              {errors.isi && (
                <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
                  {errors.isi.message}
                </p>
              )}
            </div>

            {/* Kategori — pill selector, submits enum value */}
            <div>
              <label
                className="block font-sans font-medium mb-2"
                style={{ fontSize: 12, color: "#1a2e2c" }}
              >
                Kategori
              </label>
              <Controller
                name="kategori"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2 flex-wrap">
                    {KATEGORI_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className="font-sans font-bold transition-colors"
                        style={{
                          fontSize: 12,
                          height: 36,
                          borderRadius: 20,
                          paddingLeft: 16,
                          paddingRight: 16,
                          backgroundColor:
                            watchedKategori === opt.value ? "#2a9d8f" : "#f0faf9",
                          color: watchedKategori === opt.value ? "#ffffff" : "#1a2e2c",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.kategori && (
                <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
                  {errors.kategori.message}
                </p>
              )}
            </div>

            {/* Metode Terapi — pill selector, submits enum value */}
            <div>
              <label
                className="block font-sans font-medium mb-2"
                style={{ fontSize: 12, color: "#1a2e2c" }}
              >
                Metode Terapi
              </label>
              <Controller
                name="metodeTerapi"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2 flex-wrap">
                    {METODE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => field.onChange(opt)}
                        className="font-sans font-bold transition-colors"
                        style={{
                          fontSize: 12,
                          height: 36,
                          borderRadius: 20,
                          paddingLeft: 16,
                          paddingRight: 16,
                          backgroundColor: watchedMetode === opt ? "#2a9d8f" : "#f0faf9",
                          color: watchedMetode === opt ? "#ffffff" : "#1a2e2c",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.metodeTerapi && (
                <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
                  {errors.metodeTerapi.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full font-sans font-bold transition-colors disabled:opacity-50"
                style={{
                  height: 44,
                  borderRadius: 20,
                  fontSize: 14,
                  backgroundColor: "#2a9d8f",
                  color: "#ffffff",
                  border: "none",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "Mengirim..." : "Buat Postingan"}
              </button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
