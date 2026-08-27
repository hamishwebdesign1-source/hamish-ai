"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Image as ImageIcon, FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadProjectFile, deleteProjectFile } from "@/app/studio/(authed)/website-builder/actions";
import { MAX_FILE_BYTES, ALLOWED_CONTENT_TYPES, type FileKind } from "@/lib/website-project-files";

export type ProjectFile = {
  id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  kind: FileKind;
  created_at: string;
  signedUrl: string | null;
};

const KIND_LABELS: Record<FileKind, string> = { logo: "Logo", photo: "Photo", other: "Other" };

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function FileRow({ file, projectId, onDeleted }: { file: ProjectFile; projectId: string; onDeleted: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const r = await deleteProjectFile(projectId, file.id);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-3">
        {file.signedUrl ? (
          // next/image's optimizer needs a static remotePattern; Supabase
          // signed URLs carry a per-request, per-project, expiring token, so
          // allowlisting the hostname would need a wildcard just for a 40px
          // avatar thumbnail.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.signedUrl} alt={file.file_name} className="size-10 shrink-0 rounded-md border border-border object-cover" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <ImageIcon className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {KIND_LABELS[file.kind]} · {formatSize(file.size_bytes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {file.signedUrl && (
            <a
              href={file.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Download"
            >
              <Download className="size-4" />
            </a>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// AI Website Creation Guide, WB8 — real browser file uploads (plan doc
// §2). HamishAI never builds the site itself, so these files exist to
// be downloaded and handed to whichever AI coding tool the agency is
// using — a real logo, real business photos to replace the placeholder
// imagery the build phases otherwise fall back to.
//
// No local copy of the file list as source of truth — `files` comes
// straight from the server (page.tsx precomputes signed URLs, which
// only the admin client can generate). Both upload and delete just call
// router.refresh() on success so the parent Server Component re-fetches
// the real row (with its real id and signed URL) rather than faking an
// optimistic entry that would have no working Download link and would
// break Delete if clicked before the real data arrives.
export function WebsiteProjectFilesPanel({ projectId, files }: { projectId: string; files: ProjectFile[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<FileKind>("photo");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function upload() {
    setError(null);
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, or SVG images are accepted.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is too large — ${(file.size / 1024 / 1024).toFixed(1)}MB, the limit is ${MAX_FILE_BYTES / 1024 / 1024}MB.`);
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", kind);

    startTransition(async () => {
      const r = await uploadProjectFile(projectId, formData);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="size-4 text-accent" />
          <p className="font-heading text-sm font-semibold">Project files</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a real logo or business photos here so you have them ready to hand to your AI coding tool — JPEG, PNG, WebP, or SVG, up to{" "}
          {MAX_FILE_BYTES / 1024 / 1024}MB each.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={inputRef} type="file" accept={ALLOWED_CONTENT_TYPES.join(",")} disabled={pending} className="text-xs" />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as FileKind)}
            disabled={pending}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
            aria-label="File kind"
          >
            <option value="logo">Logo</option>
            <option value="photo">Photo</option>
            <option value="other">Other</option>
          </select>
          <Button size="xs" disabled={pending} onClick={upload}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}

        {files.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            <FileText className="size-3.5 shrink-0" /> No files uploaded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <FileRow key={f.id} file={f} projectId={projectId} onDeleted={() => router.refresh()} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
