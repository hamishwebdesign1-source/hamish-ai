"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Real-improvement pass — same gap as loading.tsx's own comment: Studio
// had no error boundary anywhere, so a thrown query/render error showed
// Next's raw crash overlay instead of a real "something went wrong, try
// again" page. Mirrors portal/(authed)/error.tsx exactly — same shape,
// same copy pattern, just Studio's own wording.
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Studio error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
      <Card className="max-w-sm p-2">
        <CardContent className="flex flex-col items-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page hit an error loading your data. It&apos;s been logged — try again, or come back in a moment.
          </p>
          <Button className="mt-5" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
