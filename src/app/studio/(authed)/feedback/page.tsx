import { MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitFeedback } from "./actions";

// P1 platform readiness item — a feedback channel that isn't buried in
// Help (studio/help/page.tsx's mailto link still exists for "something's
// not working"; this is the opposite direction, us actively asking, not
// just leaving a door open). Deliberately minimal: one textarea, one
// send action, straight to Hamish's inbox via sendFeedbackAlert — no
// feedback board or admin review UI, since there's no volume yet to
// justify one. Add that layer if this one ever needs it.
export default async function StudioFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <MessageSquare className="size-4.5" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-semibold md:text-3xl">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tell us what&apos;s working, what isn&apos;t, or what you wish this did.</p>
        </div>
      </div>

      {sent === "success" && (
        <p className="mt-6 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent">
          Sent — thanks. Real feedback shapes what gets built next.
        </p>
      )}
      {error && <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <form action={submitFeedback} className="mt-6 space-y-4">
        <Textarea
          name="message"
          required
          rows={6}
          placeholder="What's on your mind — a bug, something confusing, a feature you need..."
        />
        <Button type="submit">Send feedback</Button>
      </form>
    </div>
  );
}
