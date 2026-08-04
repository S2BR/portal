"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

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
import { normalizeImage } from "@/lib/uploads/image";
import { uploadFile } from "@/lib/uploads/upload";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

type Phase = "idle" | "uploading" | "finalizing";

/**
 * Upload / replace / remove the account avatar. The picked image is downscaled and re-encoded
 * in the browser (which strips EXIF, including GPS location) and shown immediately as an
 * optimistic preview while it streams straight to S3 with a progress bar. On success the
 * current-user context refreshes so the header menu updates too.
 */
export function AvatarSettings() {
  const t = useTranslations("avatarSettings");
  const { user, refresh } = useCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [preview, setPreviewState] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke the previous object URL whenever the preview changes or the component unmounts.
  const setPreview = (url: string | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = url;
    setPreviewState(url);
  };
  useEffect(
    () => () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    },
    [],
  );

  const busy = phase !== "idle" || pending;

  if (!user) {
    return null;
  }

  /** Validate → normalize → optimistic preview → direct-to-S3 upload. Shared by picker + drop. */
  async function handleFile(original: File) {
    setError(null);
    if (!ACCEPTED.includes(original.type)) {
      setError(t("invalidType"));
      return;
    }
    if (original.size > MAX_BYTES) {
      setError(t("tooLarge"));
      return;
    }

    const prepared = await normalizeImage(original);
    setPreview(URL.createObjectURL(prepared));
    setPhase("uploading");
    setProgress(0);

    const result = await uploadFile("avatar", prepared, {
      onProgress: setProgress,
      onPhase: setPhase,
    });

    setPhase("idle");
    if (result.ok) {
      await refresh();
      // Keep the local preview shown — it's the same image, so there's no reload flash.
    } else {
      setPreview(null);
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
    event.preventDefault(); // become a drop target (and stop the browser opening the file)
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
        setPreview(null);
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

  const shownAvatar = preview ?? user.avatar;
  const maxLabel = `${Math.round(MAX_BYTES / 1024 / 1024)} MB`;

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
            src={shownAvatar}
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
                {phase !== "idle" ? <Spinner /> : null}
                {shownAvatar ? t("replace") : t("upload")}
              </Button>
              {shownAvatar ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={remove}
                >
                  {pending ? <Spinner /> : null}
                  {t("remove")}
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("dropHint")} · {t("constraints", { max: maxLabel })}
            </p>
          </div>
        </div>

        <div role="status" aria-live="polite">
          {phase === "uploading" ? (
            <div className="space-y-1.5">
              <Progress value={progress} />
              <p className="text-muted-foreground text-xs">
                {t("uploading", { percent: progress })}
              </p>
            </div>
          ) : null}
          {phase === "finalizing" ? (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Spinner />
              {t("saving")}
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Small inline spinner matching the app's loading affordance. */
function Spinner() {
  return (
    <span
      aria-hidden
      className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
    />
  );
}
