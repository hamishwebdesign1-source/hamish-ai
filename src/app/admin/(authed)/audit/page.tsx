import Link from "next/link";
import { ThumbsUp, ThumbsDown, ShieldCheck } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { reviewAutoSend } from "@/app/admin/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ClientRef = { business_name: string } | null;

export default async function AutoSendAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = getSupabaseAdmin();

  const { data: allRequests, error: requestsError } = supabase
    ? await supabase
        .from("requests")
        .select("id, raw_text, category, created_at, auto_send_reviewed, auto_send_accurate, clients(business_name)")
        .eq("auto_sent", true)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (requestsError) console.error("Failed to fetch auto-sent requests for audit:", requestsError);

  const requests = allRequests ?? [];
  const reviewed = requests.filter((r) => r.auto_send_reviewed);
  const accurate = reviewed.filter((r) => r.auto_send_accurate === true);
  const inaccurate = reviewed.filter((r) => r.auto_send_accurate === false);
  const unreviewed = requests.filter((r) => !r.auto_send_reviewed);
  const accuracyRate = reviewed.length > 0 ? Math.round((accurate.length / reviewed.length) * 100) : null;

  const filtered =
    filter === "unreviewed"
      ? unreviewed
      : filter === "accurate"
        ? accurate
        : filter === "inaccurate"
          ? inaccurate
          : requests;

  const revalidatePath = "/admin/audit";

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Auto-send audit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Periodic sample review of AI-auto-sent replies (Decision 1/2 in the process model) — catches drift in
        triage accuracy as request volume grows.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{requests.length}</p>
          <p className="text-xs text-muted-foreground">Total auto-sent</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{unreviewed.length}</p>
          <p className="text-xs text-muted-foreground">Awaiting review</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{reviewed.length}</p>
          <p className="text-xs text-muted-foreground">Reviewed</p>
        </Card>
        <Card className="p-4">
          <p className={`font-heading text-2xl font-semibold ${accuracyRate !== null && accuracyRate < 90 ? "text-destructive" : ""}`}>
            {accuracyRate !== null ? `${accuracyRate}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Accuracy rate</p>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/audit">
          <Badge variant={!filter ? "default" : "outline"}>All ({requests.length})</Badge>
        </Link>
        <Link href="/admin/audit?filter=unreviewed">
          <Badge variant={filter === "unreviewed" ? "default" : "outline"}>Awaiting review ({unreviewed.length})</Badge>
        </Link>
        <Link href="/admin/audit?filter=accurate">
          <Badge variant={filter === "accurate" ? "default" : "outline"}>Accurate ({accurate.length})</Badge>
        </Link>
        <Link href="/admin/audit?filter=inaccurate">
          <Badge variant={filter === "inaccurate" ? "default" : "outline"}>Inaccurate ({inaccurate.length})</Badge>
        </Link>
      </div>

      <div className="mt-6">
        {!filtered.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <ShieldCheck className="mx-auto mb-2 size-6 text-muted-foreground/60" />
            Nothing in this view.
          </Card>
        )}
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {(r.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.raw_text}</p>
                  {r.category && <p className="mt-1 text-[11px] text-muted-foreground">{r.category}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.auto_send_reviewed ? (
                    <Badge variant={r.auto_send_accurate ? "success" : "destructive"}>
                      {r.auto_send_accurate ? "Accurate" : "Inaccurate"}
                    </Badge>
                  ) : (
                    <>
                      <form action={reviewAutoSend.bind(null, r.id, true, revalidatePath)}>
                        <Button type="submit" size="xs" variant="outline" className="gap-1">
                          <ThumbsUp className="size-3" />
                          Accurate
                        </Button>
                      </form>
                      <form action={reviewAutoSend.bind(null, r.id, false, revalidatePath)}>
                        <Button type="submit" size="xs" variant="outline" className="gap-1 text-destructive">
                          <ThumbsDown className="size-3" />
                          Inaccurate
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
