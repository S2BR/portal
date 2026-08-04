"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { toast } from "sonner";

import { AvatarCropDialog } from "@/components/auth/avatar-crop-dialog";
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
const UNDO_MS = 5000;

type Phase = "idle" | "uploading" | "finalizing";

/**
 * Upload / replace / remove the account avatar. Picking a file opens a square crop dialog; the
 * cropped image is re-encoded in the browser (stripping EXIF, incl. GPS) and shown as an
 * optimistic preview while it streams straight to S3. Removal is deferred with an undo toast.
 */
export function AvatarSettings() {
  const t = useTranslations("avatarSettings");
  const { user, refresh } = useCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);

  const previewRef = useRef<string | null>(null);
  const cropUrlRef = useRef<string | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removePending = useRef(false);

  const [preview, setPreviewState] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPreview = (url: string | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = url;
    setPreviewState(url);
  };

  const closeCrop = () => {
    if (cropUrlRef.current) {
      URL.revokeObjectURL(cropUrlRef.current);
      cropUrlRef.current = null;
    }
    setCropSrc(null);
    setCropFile(null);
  };

  // On unmount: revoke object URLs, and flush a still-pending removal so the intent isn't lost.
  useEffect(
    () => () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
      if (cropUrlRef.current) {
        URL.revokeObjectURL(cropUrlRef.current);
      }
      if (removeTimer.current) {
        clearTimeout(removeTimer.current);
      }
      if (removePending.current) {
        void fetch("/api/uploads/avatar", {
          method: "DELETE",
          keepalive: true,
        });
      }
    },
    [],
  );

  const busy = phase !== "idle" || pending;

  if (!user) {
    return null;
  }

  /** Validate a picked file, then open the crop dialog. Shared by the picker and drag-drop. */
  function pickFile(file: File) {
    cancelRemove();
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError(t("invalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("tooLarge"));
      return;
    }
    const url = URL.createObjectURL(file);
    cropUrlRef.current = url;
    setCropSrc(url);
    setCropFile(file);
  }

  /** Upload the cropped, re-encoded file with an optimistic preview + toasts. */
  async function runUpload(prepared: File) {
    closeCrop();
    setPreview(URL.createObjectURL(prepared));
    setRemoved(false);
    setPhase("uploading");
    setProgress(0);

    const result = await uploadFile("avatar", prepared, {
      onProgress: setProgress,
      onPhase: setPhase,
    });

    setPhase("idle");
    if (result.ok) {
      await refresh();
      toast.success(t("savedToast"));
    } else {
      setPreview(null);
      toast.error(t("error"));
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after cancel/error
    if (file) {
      pickFile(file);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); // become a drop target (and stop the browser opening the file)
    if (!busy) {
      setDragging(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
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
      pickFile(file);
    }
  }

  /** Optimistically hide the avatar and defer the delete, giving the user an undo window. */
  function requestRemove() {
    setError(null);
    setPreview(null);
    setRemoved(true);
    removePending.current = true;
    if (removeTimer.current) {
      clearTimeout(removeTimer.current);
    }
    removeTimer.current = setTimeout(() => void commitRemove(), UNDO_MS);
    toast(t("removedToast"), {
      duration: UNDO_MS,
      action: { label: t("undo"), onClick: cancelRemove },
    });
  }

  function cancelRemove() {
    if (removeTimer.current) {
      clearTimeout(removeTimer.current);
      removeTimer.current = null;
    }
    removePending.current = false;
    setRemoved(false);
  }

  async function commitRemove() {
    removeTimer.current = null;
    removePending.current = false;
    setPending(true);
    try {
      const response = await fetch("/api/uploads/avatar", { method: "DELETE" });
      if (response.ok) {
        await refresh();
        setRemoved(false);
      } else {
        setRemoved(false);
        toast.error(t("error"));
      }
    } catch {
      setRemoved(false);
      toast.error(t("error"));
    } finally {
      setPending(false);
    }
  }

  const shownAvatar = removed ? null : (preview ?? user.avatar);
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
                  onClick={requestRemove}
                >
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

      <AvatarCropDialog
        src={cropSrc}
        file={cropFile}
        onCancel={closeCrop}
        onCropped={runUpload}
      />
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
