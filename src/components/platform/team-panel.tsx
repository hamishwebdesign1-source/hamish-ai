"use client";

import { useState, useTransition } from "react";
import { Users, UserPlus, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inviteTeamMemberAction, removeTeamMemberAction } from "@/app/studio/(authed)/settings/actions";
import type { TeamMember } from "@/lib/team-members";

// Team seats gap — the Agency plan has advertised "Multiple team seats"
// since platform-plans.ts was written; this is the first UI that actually
// lets an owner use it. isOwner gates invite/remove controls; a member
// sees the same list read-only, same "you can see it, only the owner
// changes it" shape as everywhere else in this app that has an
// owner/member distinction.
export function TeamPanel({
  members,
  isOwner,
  seatsUsed,
  seatLimit,
  canInvite,
  upgradeReason,
}: {
  members: TeamMember[];
  isOwner: boolean;
  seatsUsed: number;
  seatLimit: number;
  canInvite: boolean;
  upgradeReason: string | null;
}) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  // Tier 4 item #12 — same two-step inline confirm pattern as everywhere
  // else in this codebase (knowledge-panel.tsx's EntryCard delete,
  // campaigns-panel.tsx's campaign delete): this previously fired
  // immediately on one click.
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

  function invite() {
    setError(null);
    startTransition(async () => {
      const r = await inviteTeamMemberAction(email);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to invite.");
      } else {
        setEmail("");
      }
    });
  }

  function remove(memberEmail: string) {
    setError(null);
    setRemovingEmail(memberEmail);
    startTransition(async () => {
      const r = await removeTeamMemberAction(memberEmail);
      if (r && "error" in r) setError(r.error ?? "Failed to remove.");
      setRemovingEmail(null);
      setConfirmingRemove(null);
    });
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Users className="size-4" />
            </span>
            Team
          </p>
          <span className="text-xs text-muted-foreground">
            {seatsUsed} of {seatLimit} seats
          </span>
        </div>

        <ul className="mt-4 space-y-2">
          {members.map((m) => (
            <li key={m.email} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.email}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.role === "owner" ? "Owner" : "Member"} · {m.acceptedAt ? "Active" : "Invited"}
                </p>
              </div>
              {isOwner &&
                m.role !== "owner" &&
                (confirmingRemove === m.email ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="xs" variant="destructive" disabled={pending && removingEmail === m.email} onClick={() => remove(m.email)}>
                      {pending && removingEmail === m.email ? "…" : "Confirm"}
                    </Button>
                    <Button size="icon-xs" variant="ghost" aria-label="Cancel remove" onClick={() => setConfirmingRemove(null)}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    disabled={pending && removingEmail === m.email}
                    onClick={() => setConfirmingRemove(m.email)}
                    aria-label={`Remove ${m.email}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ))}
            </li>
          ))}
        </ul>

        {isOwner && (
          <div className="mt-4 border-t border-border pt-4">
            {canInvite ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@yourbusiness.com"
                  aria-label="Email address to invite to the team"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                />
                <Button size="sm" disabled={pending || !email.trim()} onClick={invite}>
                  <UserPlus className="size-3.5" /> Invite
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">{upgradeReason}</p>
                <Badge variant="secondary">Seats full</Badge>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              They&apos;ll get access the moment they sign in at hamishai.org/platform/signup with that email — no
              password to set up.
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
