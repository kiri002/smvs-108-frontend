"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";

import { api } from "@/lib/api";

/** Photos need the auth header, so they are fetched as blobs instead of a plain <img src>. */
export function AuthImage({ attachmentId, alt, className }: { attachmentId: number; alt: string; className?: string }) {
  const q = useQuery({
    queryKey: ["attachment", attachmentId],
    queryFn: async () => {
      const r = await api.get(`/attachments/${attachmentId}`, { responseType: "blob" });
      return URL.createObjectURL(r.data as Blob);
    },
    staleTime: Infinity,
    gcTime: 10 * 60_000,
  });
  if (q.error) return <ImageOff className="text-muted-foreground size-6" aria-label="Photo unavailable" />;
  if (!q.data) return <div className={`bg-muted animate-pulse ${className ?? "size-24"}`} />;
  return (
    <a href={q.data} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={q.data} alt={alt} className={className ?? "size-24 rounded-md object-cover"} />
    </a>
  );
}
