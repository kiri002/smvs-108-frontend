"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { AuthImage } from "@/components/common/auth-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { errorMessage, post } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { useI18n } from "@/lib/i18n";
import { formatTime } from "@/lib/time";

type Note = { id: number; text: string; attachmentId: number | null; by?: string; at: string };

/** FR-M8-04: notes and photos on a request. */
export function NotesCard({ requestId, assignmentId, notes, canAdd }: { requestId: number; assignmentId?: number; notes: Note[]; canAdd: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [text, setText] = React.useState("");
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPhoto(await compressImage(f));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const submit = async () => {
    if (!text.trim() && !photo) return;
    setBusy(true);
    try {
      await post(`/requests/${requestId}/notes`, { text: text.trim(), photo: photo ?? undefined, assignmentId });
      setText("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      ["request", "my"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>{t("req.notes")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-4">
        {notes.length === 0 && <p className="text-muted-foreground text-sm">{t("common.noData")}</p>}
        <ul className="grid gap-3">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3">
              {n.attachmentId && <AuthImage attachmentId={n.attachmentId} alt={n.text || "Photo"} />}
              <div className="min-w-0 text-sm">
                {n.text && <p className="break-words whitespace-pre-wrap">{n.text}</p>}
                <p className="text-muted-foreground text-xs">
                  {n.by ? `${n.by} · ` : ""}
                  {formatTime(n.at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {canAdd && (
          <div className="grid gap-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("req.addNote")} aria-label={t("req.addNote")} className="min-h-16" />
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Preview" className="max-h-40 w-fit rounded-md border" />
            )}
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Camera /> {t("req.addPhoto")}
              </Button>
              <Button type="button" onClick={submit} disabled={busy || (!text.trim() && !photo)} className="ml-auto">
                {busy ? <Loader2 className="animate-spin" /> : <Send />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
