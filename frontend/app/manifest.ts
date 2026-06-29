import type { MetadataRoute } from "next";

// Native Next.js PWA manifest (served at /manifest.webmanifest).
// Icons are placed in frontend/public/icons/ — see user_setup in 02-03-PLAN.md.
// Required icons: icon-192.png, icon-512.png (regular), icon-512-maskable.png (maskable),
// and badge-72.png (used by the service worker for notification badges).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KidneyBuddy",
    short_name: "KidneyBuddy",
    description: "Pendamping harian pasien gagal ginjal kronis di Indonesia",
    start_url: "/beranda",
    display: "standalone",
    background_color: "#fdf9f3",
    theme_color: "#2a9d8f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
