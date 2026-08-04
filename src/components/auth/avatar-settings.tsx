"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { useCurrentUser } from "@/components/auth/current-user";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uploadFile } from "@/lib/uploads/upload";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Upload / replace / remove the account avatar. The file goes straight to S3 (presigned)
 * with a live progress bar; on success the current-user context is refreshed so the new
 * avatar shows here and in the header menu at once.
 */
export function AvatarSettings() {
  const t = useTranslations("avatarSettings");
  const { user, refresh } = useCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = uploading || pending;

  if (!user) {
    return null;
  }

  /** Validate then upload a file — shared by the file picker and drag-and-drop. */
  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError(t("invalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("tooLarge"));
      return;
    }

    setUploading(true);
    setProgress(0);
    const result = await uploadFile("avatar", file, {
      onProgress: setProgress,
    });
    setUploading(false);
    if (result.ok) {
      await refresh();
    } else {
      setError(t("error"));
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after an error
    if (file) {
      void handleFile(file);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); // let this element be a drop target (and stop the browser opening the file)
    if (!busy) {
      setDragging(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    // Ignore leaves onto children — only clear when the pointer truly exits the zone.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) {
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/uploads/avatar", { method: "DELETE" });
      if (response.ok) {
        await refresh();
      } else {
        setError(t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex items-center gap-4 rounded-lg border border-dashed p-4 transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-input",
          )}
        >
          <UserAvatar
            name={user.name}
            src={user.avatar}
            className="size-20"
            fallbackClassName="text-xl"
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={onFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {user.avatar ? t("replace") : t("upload")}
              </Button>
              {user.avatar ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={remove}
                >
                  {t("remove")}
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">{t("dropHint")}</p>
          </div>
        </div>

        {uploading ? (
          <div className="space-y-1.5">
            <Progress value={progress} />
            <p className="text-muted-foreground text-xs">
              {t("uploading", { percent: progress })}
            </p>
          </div>
        ) : null}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
