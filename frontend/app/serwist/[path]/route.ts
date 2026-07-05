import { createSerwistRoute } from "@serwist/turbopack";
import path from "path";

// Route Handler that builds and serves the Serwist service worker.
// The SW source lives at app/sw.ts and is compiled on-demand by esbuild.
// The compiled SW is served at /serwist/sw.js, which is the swUrl used
// by SerwistProvider in the root layout.
//
// useNativeEsbuild: true — uses the installed native `esbuild` package
// instead of `esbuild-wasm` (wasm version is a heavy optional dep not installed).
//
// esbuildOptions.define (quick-260705-9n4 task 4): app/sw.ts runs in the
// ServiceWorkerGlobalScope, which has no `process.env` at runtime. Unlike
// regular pages/client components (which Next.js's own bundler inlines
// NEXT_PUBLIC_* into), this file is compiled by esbuild directly via this
// Route Handler, so Next.js's normal env-var inlining never touches it —
// the previous hardcoded `const API_BASE = "http://localhost:4000"` in
// sw.ts was the result. `__SW_API_BASE__` is substituted here, at the
// server/build environment where `process.env.NEXT_PUBLIC_API_URL` IS
// available (this route handler runs in Node, not the browser).
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: path.join(process.cwd(), "app/sw.ts"),
    useNativeEsbuild: true,
    esbuildOptions: {
      define: {
        __SW_API_BASE__: JSON.stringify(
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
        ),
      },
    },
  });
