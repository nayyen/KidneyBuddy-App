import { createSerwistRoute } from "@serwist/turbopack";
import path from "path";

// Route Handler that builds and serves the Serwist service worker.
// The SW source lives at app/sw.ts and is compiled on-demand by esbuild.
// The compiled SW is served at /serwist/sw.js, which is the swUrl used
// by SerwistProvider in the root layout.
//
// useNativeEsbuild: true — uses the installed native `esbuild` package
// instead of `esbuild-wasm` (wasm version is a heavy optional dep not installed).
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: path.join(process.cwd(), "app/sw.ts"),
    useNativeEsbuild: true,
  });
