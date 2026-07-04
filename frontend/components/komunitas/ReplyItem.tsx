"use client";

/**
 * ReplyItem.tsx — a single reply with an optimistic "Tandai Membantu" toggle
 * (COMMUNITY-02, D-08/D-09).
 *
 * Any authenticated user may mark ANY reply as "membantu" — the toggle is
 * NOT gated on reply authorship (D-08, deliberate open-access model). On
 * click, markedByMe flips and helpfulCount adjusts by +/-1 optimistically,
 * then POST /api/community/replies/:replyId/helpful confirms server-side;
 * on failure the optimistic change reverts (mirrors AlertHistoryList.tsx's
 * handleCardClick revert-on-failure pattern).
 */
import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { authFetch } from "@/lib/api";

export interface ReplyItemData {
  id: string;
  isi: string;
  createdAt: string;
  authorName?: string | null;
  helpfulCount: number;
  markedByMe: boolean;
}

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

interface ReplyItemProps {
  reply: ReplyItemData;
  accessToken: string;
}

export default function ReplyItem({ reply, accessToken }: ReplyItemProps) {
  const [markedByMe, setMarkedByMe] = useState(reply.markedByMe);
  const [helpfulCount, setHelpfulCount] = useState(reply.helpfulCount);
  const [isToggling, setIsToggling] = useState(false);

  const authorName = reply.authorName ?? "Anggota Komunitas";

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);

    // Optimistic flip — any user, any reply (D-08), no ownership gate.
    const previousMarked = markedByMe;
    const previousCount = helpfulCount;
    const nextMarked = !previousMarked;
    setMarkedByMe(nextMarked);
    setHelpfulCount(previousCount + (nextMarked ? 1 : -1));

    try {
      await authFetch(`/api/community/replies/${reply.id}/helpful`, accessToken, {
        method: "POST",
      });
    } catch {
      // Revert on failure — server + unique constraint remain authoritative.
      setMarkedByMe(previousMarked);
      setHelpfulCount(previousCount);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-sans font-bold" style={{ fontSize: 12, color: "#1a2e2c" }}>
          {authorName}
        </span>
        <span className="font-sans" style={{ fontSize: 12, color: "#7a8c8a" }}>
          &middot; {formatRelativeTime(reply.createdAt)}
        </span>
      </div>

      {/* Reply body — plain JSX text child, no raw-HTML injection API */}
      <p
        className="font-sans whitespace-pre-wrap"
        style={{ fontSize: 13, color: "#1a2e2c", lineHeight: 1.5 }}
      >
        {reply.isi}
      </p>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isToggling}
        className="mt-2 font-sans font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
        style={{
          fontSize: 12,
          color: markedByMe ? "#2a9d8f" : "#7a8c8a",
          background: "none",
          border: "none",
          cursor: isToggling ? "not-allowed" : "pointer",
          padding: 0,
        }}
      >
        <ThumbsUp size={14} fill={markedByMe ? "#2a9d8f" : "none"} />
        {markedByMe ? "Membantu ✓" : "Tandai Membantu"} ({helpfulCount})
      </button>
    </div>
  );
}
