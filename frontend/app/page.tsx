import { redirect } from "next/navigation";

// Root route has no content of its own — auth state lives client-side
// (in-memory access token + httpOnly refresh cookie), so the server can't
// route by session here; /login handles the rest.
export default function RootPage() {
  redirect("/login");
}
