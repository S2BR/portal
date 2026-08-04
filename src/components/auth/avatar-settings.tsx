"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";

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
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after an error
    if (!file) {
      return;
    }
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

  const busy = uploading || pending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={user.name}
            src={user.avatar}
            className="size-20"
            fallbackClassName="text-xl"
          />
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
