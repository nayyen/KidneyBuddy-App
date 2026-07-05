import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

/**
 * Backend origin as a next/image remotePattern (quick-260705-9n4 task 9, C1
 * bugfix). next/image REFUSES to load any src whose origin isn't explicitly
 * allow-listed here — without this, MedicationLogItem's/ReminderDetailOverlay's
 * <Image src={`${API_BASE}${fotoObat}`}> silently failed for every uploaded
 * medication photo, since the backend (port 4000) and frontend (port 3000)
 * are different origins. Derived from NEXT_PUBLIC_API_URL so it tracks
 * whatever backend origin the deployment actually uses.
 */
function backendImageRemotePattern(): {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
} | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const url = new URL(apiUrl);
    return {
      protocol: url.protocol.replace(":", "") === "https" ? "https" : "http",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/uploads/**",
    };
  } catch {
    return null;
  }
}

const backendPattern = backendImageRemotePattern();

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      ...(backendPattern ? [backendPattern] : []),
      // Always allow localhost:4000 for local dev even if NEXT_PUBLIC_API_URL
      // is unset in a particular dev setup.
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
    ],
  },
};

export default withSerwist(nextConfig);
