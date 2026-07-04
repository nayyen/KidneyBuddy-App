"use client";

/**
 * /edukasi/komunitas/[id] — bookmarkable community post detail route (D-03).
 *
 * Reuses the exact auth-guard boilerplate from /edukasi/komunitas, reading
 * the post id via useParams() and delegating the full detail/reply/archive
 * experience to <PostDetail>.
 */
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import PostDetail from "@/components/komunitas/PostDetail";

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { accessToken, isLoading, isAuthenticated } = useAuth();

  // Auth redirect guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground font-sans text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) return null;

  return (
    <div className="space-y-4">
      <PostDetail postId={postId} accessToken={accessToken} />
    </div>
  );
}
